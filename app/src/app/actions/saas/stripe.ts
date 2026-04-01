"use server"

import { stripe } from "@/lib/stripe"
import { getTenantId } from "@/lib/get-tenant-id"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Stripe Plans Mapping (Mock IDs for Phase 1 MVP)
 * In production, these would be in .env or fetched from a 'pricing_plans' table
 */
const STRIPE_PLANS: Record<string, string> = {
  STARTER: "price_starter_id",
  PRO: "price_pro_id",
  ENTERPRISE: "price_enterprise_id",
}

/**
 * Generate a Stripe Checkout Session for a new subscription
 */
export async function createCheckoutSession(plan: "STARTER" | "PRO" | "ENTERPRISE"): Promise<{ url: string | null }> {
  const tenantId = await getTenantId()
  const successUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&success=true`
  const cancelUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing&canceled=true`

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
        price: STRIPE_PLANS[plan],
        quantity: 1,
      },
    ],
    mode: "subscription",
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { tenantId }
  })

  return { url: session.url }
}

/**
 * Generate a Stripe Billing Portal link for an existing customer
 */
export async function createPortalSession(): Promise<{ url: string | null }> {
  const tenantId = await getTenantId()
  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/settings?tab=billing`

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
