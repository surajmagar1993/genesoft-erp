import { prisma } from "@/lib/prisma"
import { openSecret } from "@/lib/secret-box"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

type PayPalGatewaySettings = {
    paypalClientId?: string
    paypalClientSecret?: string
    paypalWebhookId?: string
    paypalMode?: "sandbox" | "live" | "simulation"
}

/**
 * Confirms the event really came from PayPal using the tenant's own app credentials
 * (POST /v1/notifications/verify-webhook-signature). Fails closed when not configured.
 */
async function verifyPayPalSignature(req: Request, event: unknown, gw: PayPalGatewaySettings): Promise<boolean> {
    const clientSecret = openSecret(gw.paypalClientSecret)
    if (!gw.paypalClientId || !clientSecret || !gw.paypalWebhookId) return false
    if (gw.paypalMode !== "live" && gw.paypalMode !== "sandbox") return false

    const base = gw.paypalMode === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com"

    const tokenRes = await fetch(`${base}/v1/oauth2/token`, {
        method: "POST",
        headers: {
            Authorization: `Basic ${Buffer.from(`${gw.paypalClientId}:${clientSecret}`).toString("base64")}`,
            "Content-Type": "application/x-www-form-urlencoded",
        },
        body: "grant_type=client_credentials",
    })
    if (!tokenRes.ok) return false
    const { access_token } = await tokenRes.json()

    const verifyRes = await fetch(`${base}/v1/notifications/verify-webhook-signature`, {
        method: "POST",
        headers: { Authorization: `Bearer ${access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
            auth_algo: req.headers.get("paypal-auth-algo"),
            cert_url: req.headers.get("paypal-cert-url"),
            transmission_id: req.headers.get("paypal-transmission-id"),
            transmission_sig: req.headers.get("paypal-transmission-sig"),
            transmission_time: req.headers.get("paypal-transmission-time"),
            webhook_id: gw.paypalWebhookId,
            webhook_event: event,
        }),
    })
    if (!verifyRes.ok) return false
    const result = await verifyRes.json()
    return result.verification_status === "SUCCESS"
}

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const eventType = body?.event_type

        // We handle capture completion
        if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
            const capture = body.resource
            const customId = capture.custom_id // Invoice ID set when the PayPal order was created
            const amount = parseFloat(capture.amount?.value || "0")
            const currency = (capture.amount?.currency_code || "USD").toUpperCase()
            const captureId = capture.id

            if (customId) {
                const invoice = await prisma.invoice.findUnique({
                    where: { id: customId },
                    include: { contact: true, tenant: { select: { settings: true } } },
                })

                if (invoice) {
                    const gw = (invoice.tenant?.settings as { paymentGateways?: PayPalGatewaySettings } | null)?.paymentGateways || {}
                    if (!(await verifyPayPalSignature(req, body, gw))) {
                        return NextResponse.json({ status: "error", message: "Invalid webhook signature" }, { status: 401 })
                    }

                    if (currency !== (invoice.currencyCode || "").toUpperCase()) {
                        // The money is already captured; acknowledge so PayPal stops retrying,
                        // and leave a record for someone to reconcile by hand.
                        await prisma.systemLog.create({
                            data: {
                                tenantId: invoice.tenantId,
                                level: "ERROR",
                                message: `PayPal capture ${captureId} for invoice ${invoice.invoiceNumber} is ${amount} ${currency}, but the invoice is in ${invoice.currencyCode || "no currency"}. Not recorded; reconcile manually.`,
                                path: "/api/webhooks/paypal",
                            },
                        })
                        return NextResponse.json({ status: "ignored", message: "Currency mismatch logged" }, { status: 200 })
                    }

                    // Avoid duplicate recording
                    const existing = await prisma.payment.findFirst({
                        where: {
                            tenantId: invoice.tenantId,
                            reference: `PAYPAL:${captureId}`,
                        },
                    })

                    if (!existing) {
                        await prisma.payment.create({
                            data: {
                                tenantId: invoice.tenantId,
                                invoiceId: invoice.id,
                                contactId: invoice.contactId,
                                amount: amount,
                                paymentDate: new Date(),
                                paymentMethod: "WALLET",
                                type: "INBOUND",
                                reference: `PAYPAL:${captureId}`,
                                notes: `PayPal online checkout completed (${captureId})`,
                                currencyCode: currency,
                            },
                        })

                        const allPayments = await prisma.payment.findMany({
                            where: { invoiceId: invoice.id },
                        })
                        const totalPaid = allPayments.reduce((s: number, p: any) => s + Number(p.amount), 0)
                        const isPaid = totalPaid >= Number(invoice.total)

                        await prisma.invoice.update({
                            where: { id: invoice.id },
                            data: { status: isPaid ? "PAID" : "PARTIALLY_PAID" },
                        })
                    }
                }
            }
        }

        return NextResponse.json({ status: "success", received: true }, { status: 200 })
    } catch (err: any) {
        console.error("PayPal Webhook Error:", err.message)
        return NextResponse.json({ status: "error", message: "Webhook processing failed" }, { status: 400 })
    }
}
