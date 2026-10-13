import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { openSecret } from "@/lib/secret-box"
import { parseMetaWebhookEvent, verifyMetaWebhookChallenge } from "@/lib/whatsapp-engine"

export const dynamic = "force-dynamic"

/**
 * Meta signs every POST with the app secret: X-Hub-Signature-256: sha256=<hex HMAC of raw body>.
 */
function isValidMetaSignature(rawBody: string, header: string | null, appSecret?: string): boolean {
    if (!header || !appSecret || !header.startsWith("sha256=")) return false
    const expected = crypto.createHmac("sha256", appSecret).update(rawBody).digest("hex")
    const a = Buffer.from(expected)
    const b = Buffer.from(header.slice("sha256=".length))
    return a.length === b.length && crypto.timingSafeEqual(a, b)
}

/**
 * GET: Meta Webhook Verification Handshake
 * Meta sends a GET request to verify the webhook endpoint URL and verify token.
 */
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    // The old hardcoded default was public, so tenants still holding it must save a new one
    if (!token || token === "genesoft_wa_verify_token") {
        return new NextResponse("Forbidden: Verification token mismatch", { status: 403 })
    }

    // Accept the platform token, or the per-tenant token shown in WhatsApp Gateway Settings
    let expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || ""
    if (token !== expectedToken) {
        const tenant = await prisma.tenant.findFirst({
            where: { settings: { path: ["whatsapp", "verifyToken"], equals: token } },
            select: { id: true },
        })
        if (tenant) expectedToken = token
    }

    const verification = verifyMetaWebhookChallenge({
        mode,
        token,
        challenge,
        expectedToken,
    })

    if (verification.verified) {
        return new NextResponse(verification.challenge, {
            status: 200,
            headers: { "Content-Type": "text/plain" },
        })
    }

    return new NextResponse("Forbidden: Verification token mismatch", { status: 403 })
}

/**
 * POST: Meta Webhook Event Notification
 * Meta sends POST notifications for message delivery receipts and incoming customer replies.
 */
export async function POST(req: NextRequest) {
    try {
        const rawBody = await req.text()
        const body = JSON.parse(rawBody)
        const signature = req.headers.get("x-hub-signature-256")

        // One delivery can carry changes for several business phone numbers, so each
        // number is verified and processed under its own tenant.
        const changesByPhone = new Map<string, unknown[]>()
        for (const entry of body?.entry ?? []) {
            for (const change of entry?.changes ?? []) {
                const phoneNumberId: string | undefined = change?.value?.metadata?.phone_number_id
                if (phoneNumberId) changesByPhone.set(phoneNumberId, [...(changesByPhone.get(phoneNumberId) ?? []), change])
            }
        }
        if (changesByPhone.size === 0) {
            return NextResponse.json({ status: "acknowledged", eventCount: 0 })
        }

        let verified = 0
        let processedStatuses = 0
        let processedMessages = 0

        for (const [phoneNumberId, changes] of changesByPhone) {
            const owners = await prisma.tenant.findMany({
                where: { settings: { path: ["whatsapp", "phoneNumberId"], equals: phoneNumberId } },
                select: { id: true, settings: true },
                take: 2,
            })
            // Unknown, or claimed by more than one tenant: we can't tell whose secret to trust
            if (owners.length !== 1) continue

            const ownerAppSecret = openSecret((owners[0].settings as { whatsapp?: { appSecret?: string } } | null)?.whatsapp?.appSecret)
            if (!isValidMetaSignature(rawBody, signature, ownerAppSecret)) continue

            verified++
            const { statuses, messages } = parseMetaWebhookEvent({ object: body.object, entry: [{ changes }] })
            await processEvents(owners[0].id, statuses, messages)
            processedStatuses += statuses.length
            processedMessages += messages.length
        }

        if (verified === 0) {
            return NextResponse.json({ status: "error", error: "Invalid signature" }, { status: 401 })
        }

        return NextResponse.json({ status: "success", processedStatuses, processedMessages })
    } catch (err: any) {
        console.error("Meta WhatsApp Webhook error:", err)
        return NextResponse.json({ status: "error", error: "Webhook processing failed" }, { status: 500 })
    }
}

type MetaEvents = ReturnType<typeof parseMetaWebhookEvent>

async function processEvents(ownerId: string, statuses: MetaEvents["statuses"], messages: MetaEvents["messages"]) {
    // Process status receipts (sent, delivered, read, failed)
    // Find matching tenants by looking at recent messages
    // Since webhooks don't include tenantId explicitly, we locate the message by wamid
    for (const statusEvent of statuses) {
        try {
            // Look for tenant whose settings.whatsapp.messages contains this wamid
            const tenants = await prisma.tenant.findMany({
                where: {
                    id: ownerId,
                    settings: {
                        path: ["whatsapp", "messages"],
                        array_contains: [{ wamid: statusEvent.wamid }],
                    },
                },
                select: { id: true, settings: true },
                take: 1,
            })

            if (tenants.length > 0) {
                const tenant = tenants[0]
                const settings = (tenant.settings as any) || {}
                const msgs = (settings.whatsapp?.messages || []) as any[]

                const updatedMsgs = msgs.map((m) => {
                    if (m.wamid === statusEvent.wamid) {
                        return {
                            ...m,
                            status: statusEvent.status.toUpperCase(),
                            statusTimestamp: statusEvent.timestamp,
                            errorMessage: statusEvent.error || m.errorMessage,
                        }
                    }
                    return m
                })

                await prisma.tenant.update({
                    where: { id: tenant.id },
                    data: {
                        settings: {
                            ...settings,
                            whatsapp: {
                                ...(settings.whatsapp || {}),
                                messages: updatedMsgs,
                            },
                        },
                    },
                })
            }
        } catch (statusErr) {
            console.warn("Failed to update status for wamid:", statusEvent.wamid, statusErr)
        }
    }

    // Process incoming messages
    for (const msgEvent of messages) {
        try {
            // Find matching contact by phone number
            const contact = await prisma.contact.findFirst({
                where: {
                    tenantId: ownerId,
                    phone: { contains: msgEvent.from.slice(-10) },
                },
                select: { id: true, tenantId: true, displayName: true },
            })

            if (contact) {
                const tenant = await prisma.tenant.findUnique({
                    where: { id: contact.tenantId },
                    select: { settings: true },
                })

                if (tenant) {
                    const settings = (tenant.settings as any) || {}
                    const msgs = (settings.whatsapp?.messages || []) as any[]

                    const inboundMsg = {
                        id: `wa_in_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                        contactId: contact.id,
                        contactName: contact.displayName,
                        recipientPhone: msgEvent.from,
                        direction: "INBOUND",
                        content: msgEvent.text,
                        status: "DELIVERED",
                        timestamp: msgEvent.timestamp,
                        wamid: msgEvent.wamid,
                    }

                    await prisma.tenant.update({
                        where: { id: contact.tenantId },
                        data: {
                            settings: {
                                ...settings,
                                whatsapp: {
                                    ...(settings.whatsapp || {}),
                                    messages: [inboundMsg, ...msgs].slice(0, 100),
                                },
                            },
                        },
                    })

                    // Log to CommunicationLog
                    await prisma.communicationLog.create({
                        data: {
                            tenantId: contact.tenantId,
                            contactId: contact.id,
                            type: "NOTE",
                            subject: "WhatsApp Inbound Reply",
                            content: `[WhatsApp Inbound from +${msgEvent.from}]\n${msgEvent.text}`,
                            loggedBy: contact.displayName,
                        },
                    })
                }
            }
        } catch (inboundErr) {
            console.warn("Failed to process inbound WhatsApp msg:", inboundErr)
        }
    }
}
