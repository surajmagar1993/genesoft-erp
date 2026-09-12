import { prisma } from "@/lib/prisma"
import { NextResponse } from "next/server"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
    try {
        const body = await req.json()
        const eventType = body?.event_type

        // We handle capture completion
        if (eventType === "PAYMENT.CAPTURE.COMPLETED") {
            const capture = body.resource
            const customId = capture.custom_id // Contains invoice ID or number
            const amount = parseFloat(capture.amount?.value || "0")
            const currency = (capture.amount?.currency_code || "USD").toUpperCase()
            const captureId = capture.id

            if (customId) {
                // Find invoice by ID or invoice_number
                const invoice = await prisma.invoice.findFirst({
                    where: {
                        OR: [{ id: customId }, { invoiceNumber: customId }],
                    },
                    include: { contact: true },
                })

                if (invoice) {
                    // Avoid duplicate recording
                    const existing = await prisma.payment.findFirst({
                        where: {
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
                            data: { status: isPaid ? "PAID" : "PARTIAL" },
                        })
                    }
                }
            }
        }

        return NextResponse.json({ status: "success", received: true }, { status: 200 })
    } catch (err: any) {
        console.error("PayPal Webhook Error:", err.message)
        return NextResponse.json({ status: "error", message: err.message }, { status: 400 })
    }
}
