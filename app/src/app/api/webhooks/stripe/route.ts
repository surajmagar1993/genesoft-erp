import { stripe } from "@/lib/stripe"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"

export const dynamic = "force-dynamic"

export async function POST(req: Request) {
  const body = await req.text()
  const signature = (await headers()).get("Stripe-Signature") as string

  let event: Stripe.Event

  if (!stripe) {
    return new NextResponse("Stripe is not configured", { status: 500 })
  }

  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err: any) {
    return new NextResponse(`Webhook Error: ${err.message}`, { status: 400 })
  }

  // 0. Idempotency Check
  const alreadyProcessed = await prisma.processedStripeEvent.findUnique({
    where: { eventId: event.id }
  })

  if (alreadyProcessed) {
    return new NextResponse("Event already processed", { status: 200 })
  }

  const session = event.data.object as Stripe.Checkout.Session

  // 1. Handle Checkout Completion
  if (event.type === "checkout.session.completed") {
    // A. Check if this is a Customer Invoice Payment
    if (session.metadata?.type === "INVOICE_PAYMENT" || session.metadata?.invoiceId) {
      const invoiceId = session.metadata.invoiceId
      const amount = session.amount_total ? session.amount_total / 100 : 0
      const currency = (session.currency || "USD").toUpperCase()

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { contact: true },
      })

      if (invoice) {
        await prisma.payment.create({
          data: {
            tenantId: invoice.tenantId,
            invoiceId: invoice.id,
            contactId: invoice.contactId,
            amount: amount,
            paymentDate: new Date(),
            paymentMethod: "CREDIT_CARD",
            type: "INBOUND",
            reference: `STRIPE:${session.payment_intent || session.id}`,
            notes: `Stripe online checkout completed (${session.id})`,
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

      await prisma.processedStripeEvent.create({
        data: { eventId: event.id },
      })
      return new NextResponse("Invoice payment processed", { status: 200 })
    }

    // B. SaaS Subscription Checkout
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(
        session.subscription as string
      )

      if (!session?.metadata?.tenantId) {
        return new NextResponse("Tenant ID missing in metadata", { status: 400 })
      }

      await prisma.tenant.update({
        where: { id: session.metadata.tenantId },
        data: {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
          plan: "PRO",
          isTrial: false,
        },
      })
    }
  }

  // 2. Handle Subscription Updates (Renewals, Upgrades)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription
    const tenant = await prisma.tenant.findUnique({
      where: { stripeCustomerId: subscription.customer as string }
    })

    if (tenant) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          plan: subscription.status === "active" ? "PRO" : "FREE",
          isActive: subscription.status === "active",
        },
      })
    }
  }

  // 3. Handle Deletions (Cancellations)
  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription
    const tenant = await prisma.tenant.findUnique({
      where: { stripeCustomerId: subscription.customer as string }
    })

    if (tenant) {
      await prisma.tenant.update({
        where: { id: tenant.id },
        data: {
          plan: "FREE",
          stripeSubscriptionId: null,
          isActive: true, // They can still use the free tier
        },
      })
    }
  }

  // Record as processed
  await prisma.processedStripeEvent.create({
    data: { eventId: event.id }
  })

  return new NextResponse(null, { status: 200 })
}
