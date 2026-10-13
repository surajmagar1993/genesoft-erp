import type Stripe from "stripe"

export type PaidPlan = "BASIC" | "PRO" | "ENTERPRISE"

/**
 * Stripe price ids per plan, from STRIPE_PRICE_BASIC / STRIPE_PRICE_PRO /
 * STRIPE_PRICE_ENTERPRISE. Unset prices simply aren't offered.
 */
export function stripePriceIds(): Partial<Record<PaidPlan, string>> {
    const ids: Partial<Record<PaidPlan, string>> = {}
    if (process.env.STRIPE_PRICE_BASIC) ids.BASIC = process.env.STRIPE_PRICE_BASIC
    if (process.env.STRIPE_PRICE_PRO) ids.PRO = process.env.STRIPE_PRICE_PRO
    if (process.env.STRIPE_PRICE_ENTERPRISE) ids.ENTERPRISE = process.env.STRIPE_PRICE_ENTERPRISE
    return ids
}

const PAID_PLANS: PaidPlan[] = ["BASIC", "PRO", "ENTERPRISE"]

/** The plan a subscription is for: its price id first, then the plan we put in its metadata. */
export function planForSubscription(subscription: Stripe.Subscription): PaidPlan | null {
    const priceId = subscription.items?.data?.[0]?.price?.id
    const byPrice = (Object.entries(stripePriceIds()) as [PaidPlan, string][]).find(([, id]) => id === priceId)
    if (byPrice) return byPrice[0]
    const fromMetadata = subscription.metadata?.plan as PaidPlan | undefined
    return fromMetadata && PAID_PLANS.includes(fromMetadata) ? fromMetadata : null
}

/**
 * What a subscription status means for the tenant's plan:
 * - "paid": active or trialing, give them the subscribed plan
 * - "grace": a payment failed (past_due/unpaid/incomplete), keep the current plan while Stripe retries
 * - "ended": cancelled or expired, drop to FREE
 */
export function subscriptionStanding(status: Stripe.Subscription.Status): "paid" | "grace" | "ended" {
    if (status === "active" || status === "trialing") return "paid"
    if (status === "canceled" || status === "incomplete_expired") return "ended"
    return "grace"
}
