"use server"

import { stripe } from "@/lib/stripe"
import { getTenantAdminId } from "@/lib/get-tenant-id"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { ensureStripePrice, type PaidPlan } from "@/lib/stripe-plans"
import { getEffectivePricing } from "@/lib/plan-pricing"
import { appUrl } from "@/lib/app-url"
import type { BillingCycle } from "@/lib/saas-subscription-engine"

/**
 * Stripe Checkout for a plan subscription, at the live price (Admin → Pricing)
 * for the tenant's currency. The Stripe price is created or refreshed under
 * its lookup key first, so checkout always matches what the admin set.
 * A tenant that already has a Stripe subscription changes plan in the
 * billing portal instead (Stripe prorates it there).
 */
export async function createCheckoutSession(
  plan: PaidPlan | "STARTER",
  cycle: BillingCycle = "MONTHLY"
): Promise<{ url: string | null }> {
  const tenantId = await getTenantAdminId()
  // "STARTER" is the old name for BASIC (the Plan enum has no STARTER)
  const paidPlan: PaidPlan = plan === "STARTER" ? "BASIC" : plan
  const successUrl = `${appUrl()}/settings?tab=billing&success=true`
  const cancelUrl = `${appUrl()}/settings?tab=billing&canceled=true`

  if (!stripe) {
    throw new Error("Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.")
  }

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { email: true, stripeCustomerId: true, stripeSubscriptionId: true, currencyCode: true }
  })

  if (tenant?.stripeSubscriptionId && tenant.stripeCustomerId) {
    return createPortalSession()
  }

  const pricing = await getEffectivePricing(tenant?.currencyCode)
  const amount = cycle === "ANNUAL" ? pricing.annual[paidPlan] : pricing.monthly[paidPlan]
  if (!(amount > 0)) throw new Error(`The ${paidPlan} plan isn't available in ${pricing.currency}.`)
  const priceId = await ensureStripePrice(stripe, { plan: paidPlan, cycle, currency: pricing.currency, amount })

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
    metadata: { tenantId, plan: paidPlan, cycle },
    subscription_data: { metadata: { tenantId, plan: paidPlan, cycle } }
  })

  return { url: session.url }
}

/**
 * Generate a Stripe Billing Portal link for an existing customer
 */
export async function createPortalSession(): Promise<{ url: string | null }> {
  const tenantId = await getTenantAdminId()
  const returnUrl = `${appUrl()}/settings?tab=billing`

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
