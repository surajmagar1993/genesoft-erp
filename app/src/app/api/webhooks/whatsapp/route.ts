import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { parseMetaWebhookEvent, verifyMetaWebhookChallenge } from "@/lib/whatsapp-engine"

/**
 * GET: Meta Webhook Verification Handshake
 * Meta sends a GET request to verify the webhook endpoint URL and verify token.
 */
export async function GET(req: NextRequest) {
    const searchParams = req.nextUrl.searchParams
    const mode = searchParams.get("hub.mode")
    const token = searchParams.get("hub.verify_token")
    const challenge = searchParams.get("hub.challenge")

    const expectedToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || "genesoft_wa_verify_token"
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
        const body = await req.json()
        const { statuses, messages } = parseMetaWebhookEvent(body)

        // If no relevant events, acknowledge immediately
        if (statuses.length === 0 && messages.length === 0) {
            return NextResponse.json({ status: "acknowledged", eventCount: 0 })
        }

        // Process status receipts (sent, delivered, read, failed)
        // Find matching tenants by looking at recent messages
        // Since webhooks don't include tenantId explicitly, we locate the message by wamid
        for (const statusEvent of statuses) {
            try {
                // Look for tenant whose settings.whatsapp.messages contains this wamid
                const tenants = await prisma.tenant.findMany({
                    where: {
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
                        phone: { contains: msgEvent.from.slice(-10) },
                    },
                    select: { id: true, tenantId: true, name: true },
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
                            contactName: contact.name,
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
                                loggedBy: contact.name,
                            },
                        })
                    }
                }
            } catch (inboundErr) {
                console.warn("Failed to process inbound WhatsApp msg:", inboundErr)
            }
        }

        return NextResponse.json({
            status: "success",
            processedStatuses: statuses.length,
            processedMessages: messages.length,
        })
    } catch (err: any) {
        console.error("Meta WhatsApp Webhook error:", err)
        return NextResponse.json({ status: "error", error: err.message }, { status: 500 })
    }
}
