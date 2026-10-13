"use server"

import { stripe } from "@/lib/stripe"
import { getTenantAdminId } from "@/lib/get-tenant-id"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { stripePriceIds, type PaidPlan } from "@/lib/stripe-plans"

/**
 * Generate a Stripe Checkout Session for a new subscription
 */
export async function createCheckoutSession(plan: PaidPlan | "STARTER"): Promise<{ url: string | null }> {
  const tenantId = await getTenantAdminId()
  // "STARTER" is the old name for BASIC (the Plan enum has no STARTER)
  const paidPlan: PaidPlan = plan === "STARTER" ? "BASIC" : plan
  const priceId = stripePriceIds()[paidPlan]
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&success=true`
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&canceled=true`

  if (!stripe) {
    throw new Error("Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.")
  }
  if (!priceId) {
    throw new Error(`No Stripe price is configured for the ${paidPlan} plan (STRIPE_PRICE_${paidPlan}).`)
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { email: true, stripeCustomerId: true }
  })

  // Create or retrieve Stripe Customer
  let customerId = tenant?.stripeCustomerId
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: tenant?.email || undefined,
      metadata: { tenantId }
    })
    customerId = customer.id
    // Save customer ID
    await prisma.tenant.update({
      where: { id: tenantId },
      data: { stripeCustomerId: customerId }
    })
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId, plan: paidPlan },
    subscription_data: { metadata: { tenantId, plan: paidPlan } }
  })

  return { url: session.url }
}

/**
 * Generate a Stripe Billing Portal link for an existing customer
 */
export async function createPortalSession(): Promise<{ url: string | null }> {
  const tenantId = await getTenantAdminId()
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`

  if (!stripe) {
    throw new Error("Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.")
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { stripeCustomerId: true }
  })

  if (!tenant?.stripeCustomerId) {
    throw new Error("No Stripe customer found")
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: tenant.stripeCustomerId,
    return_url: returnUrl,
  })

  return { url: session.url }
}
