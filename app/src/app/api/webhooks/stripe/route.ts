import { stripe } from "@/lib/stripe"
import { postToLedger } from "@/lib/ledger"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { NextResponse } from "next/server"
import Stripe from "stripe"
import { fromSmallestCurrencyUnit } from "@/lib/payment-gateway-engine"
import { planForSubscription, subscriptionStanding, type PaidPlan } from "@/lib/stripe-plans"
import { applyPlanChange } from "@/lib/plan-change"
import { BILLING_SYSTEM, logTenantAudit } from "@/lib/tenant-audit"

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
      const currency = (session.currency || "USD").toUpperCase()
      const amount = session.amount_total ? fromSmallestCurrencyUnit(session.amount_total, currency) : 0
      const reference = `STRIPE:${session.payment_intent || session.id}`

      const invoice = await prisma.invoice.findUnique({
        where: { id: invoiceId },
        include: { contact: true },
      })

      // A retry after a partial failure must not record the payment twice
      const alreadyRecorded = invoice
        ? await prisma.payment.findFirst({ where: { tenantId: invoice.tenantId, reference } })
        : null

      if (invoice && !alreadyRecorded) {
        const payment = await prisma.payment.create({
          data: {
            tenantId: invoice.tenantId,
            invoiceId: invoice.id,
            contactId: invoice.contactId,
            amount: amount,
            paymentDate: new Date(),
            paymentMethod: "STRIPE",
            type: "INBOUND",
            reference,
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
          data: { status: isPaid ? "PAID" : "PARTIALLY_PAID" },
        })
        await postToLedger(invoice.tenantId, { kind: "payment", id: payment.id })
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

      const tenantId = session.metadata.tenantId
      const plan = planForSubscription(subscription) ?? (session.metadata.plan as PaidPlan | undefined)
      await prisma.tenant.update({
        where: { id: tenantId },
        data: {
          stripeSubscriptionId: subscription.id,
          stripeCustomerId: subscription.customer as string,
        },
      })
      if (plan) {
        // Same bookkeeping as Razorpay: cycle, renewal date and a receipt (idempotent per session)
        await applyPlanChange(tenantId, {
          targetPlan: plan,
          billingCycle: session.metadata.cycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
          paymentRef: session.id,
          amountPaid:
            session.amount_total != null
              ? fromSmallestCurrencyUnit(session.amount_total, session.currency || "usd")
              : undefined,
          paymentMethod: "Stripe",
        })
      }
    }
  }

  // 2. Handle Subscription Updates (Renewals, Upgrades)
  if (event.type === "customer.subscription.updated") {
    const subscription = event.data.object as Stripe.Subscription
    const tenant = await prisma.tenant.findUnique({
      where: { stripeCustomerId: subscription.customer as string }
    })

    if (tenant) {
      // A failed renewal (past_due) keeps the plan while Stripe retries; only
      // a cancelled/expired subscription drops to FREE. Suspending a workspace
      // (isActive) is an admin decision, never a billing side effect.
      const standing = subscriptionStanding(subscription.status)
      const plan = standing === "paid" ? planForSubscription(subscription) : standing === "ended" ? "FREE" : null
      if (plan && plan !== tenant.plan) {
        await prisma.tenant.update({
          where: { id: tenant.id },
          data: { plan },
        })
        await logTenantAudit(tenant.id, plan === "FREE" ? "TENANT_SUBSCRIPTION_CANCELLED" : "TENANT_PLAN_CHANGED_BY_STRIPE", {
          target: { type: "TENANT_SUBSCRIPTION", id: tenant.id },
          actor: BILLING_SYSTEM,
          metadata: { fromPlan: tenant.plan, toPlan: plan, stripeStatus: subscription.status, stripeEvent: event.id },
        })
      }
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
      if (tenant.plan !== "FREE") {
        await logTenantAudit(tenant.id, "TENANT_SUBSCRIPTION_CANCELLED", {
          target: { type: "TENANT_SUBSCRIPTION", id: tenant.id },
          actor: BILLING_SYSTEM,
          metadata: { fromPlan: tenant.plan, toPlan: "FREE", stripeEvent: event.id },
        })
      }
    }
  }

  // Record as processed
  await prisma.processedStripeEvent.create({
    data: { eventId: event.id }
  })

  return new NextResponse(null, { status: 200 })
}
