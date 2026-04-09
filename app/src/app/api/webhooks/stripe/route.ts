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

  // 1. Handle Checkout Completion (First time sub)
  if (event.type === "checkout.session.completed") {
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
        plan: "PRO", // Defaulting to PRO or mapping from metadata.plan
        isTrial: false,
      },
    })
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
