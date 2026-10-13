import type Stripe from "stripe"
import { toSmallestCurrencyUnit } from "@/lib/payment-gateway-engine"
import type { BillingCycle } from "@/lib/saas-subscription-engine"

export type PaidPlan = "BASIC" | "PRO" | "ENTERPRISE"

const PAID_PLANS: PaidPlan[] = ["BASIC", "PRO", "ENTERPRISE"]

/**
 * Every Stripe price the app sells is found by a lookup key such as
 * "genesoft_pro_monthly_inr". Stripe prices can't change, so a new price
 * takes over the key (transfer_lookup_key) and the old one is archived;
 * checkout always uses whatever currently holds the key.
 */
export function stripeLookupKey(plan: PaidPlan, cycle: BillingCycle, currency: string): string {
    return `genesoft_${plan}_${cycle}_${currency}`.toLowerCase()
}

/** Stable Stripe product id per plan, so prices group under one product. */
function stripeProductId(plan: PaidPlan): string {
    return `genesoft_${plan.toLowerCase()}`
}

async function ensureProduct(stripe: Stripe, plan: PaidPlan): Promise<string> {
    const id = stripeProductId(plan)
    try {
        const product = await stripe.products.retrieve(id)
        if (!product.active) await stripe.products.update(id, { active: true })
        return id
    } catch (err) {
        if ((err as { code?: string }).code !== "resource_missing") throw err
        await stripe.products.create({ id, name: `Genesoft ERP ${plan.charAt(0)}${plan.slice(1).toLowerCase()}`, metadata: { plan } })
        return id
    }
}

/**
 * Makes sure the Stripe price under this plan's lookup key matches `amount`
 * (in major units). Creates a new price and archives the old one when the
 * amount changed. Returns the active price id.
 */
export async function ensureStripePrice(
    stripe: Stripe,
    params: { plan: PaidPlan; cycle: BillingCycle; currency: string; amount: number }
): Promise<string> {
    const currency = params.currency.toLowerCase()
    const lookupKey = stripeLookupKey(params.plan, params.cycle, currency)
    const unitAmount = toSmallestCurrencyUnit(params.amount, currency)
    const interval = params.cycle === "ANNUAL" ? "year" : "month"

    const existing = (await stripe.prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 })).data[0]
    if (
        existing &&
        existing.unit_amount === unitAmount &&
        existing.currency === currency &&
        existing.recurring?.interval === interval
    ) {
        return existing.id
    }

    const product = await ensureProduct(stripe, params.plan)
    const price = await stripe.prices.create({
        product,
        currency,
        unit_amount: unitAmount,
        recurring: { interval },
        lookup_key: lookupKey,
        transfer_lookup_key: true,
        metadata: { plan: params.plan, cycle: params.cycle },
    })
    if (existing) await stripe.prices.update(existing.id, { active: false })
    return price.id
}

/** The plan a subscription is for: from its price (lookup key / metadata), then the subscription metadata. */
export function planForSubscription(subscription: Stripe.Subscription): PaidPlan | null {
    const price = subscription.items?.data?.[0]?.price
    const candidates = [
        price?.metadata?.plan,
        price?.lookup_key?.match(/^genesoft_([a-z]+)_/)?.[1]?.toUpperCase(),
        subscription.metadata?.plan,
    ]
    for (const candidate of candidates) {
        if (candidate && PAID_PLANS.includes(candidate as PaidPlan)) return candidate as PaidPlan
    }
    return null
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
