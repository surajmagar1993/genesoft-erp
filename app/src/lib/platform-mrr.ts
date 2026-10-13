import { getExchangeRate } from "@/lib/exchange-rates"
import { getEffectivePricing, type EffectivePricing } from "@/lib/plan-pricing"
import type { PlanTier } from "@/lib/saas-subscription-engine"

export const MRR_REPORTING_CURRENCY = "INR"

type TenantForMrr = {
    plan: string | null
    isActive: boolean
    isTrial: boolean
    currencyCode: string | null
    settings: unknown
}

/**
 * Monthly recurring revenue across tenants, in INR. Counts only active,
 * non-trial tenants on a paid plan, at the live price for their currency
 * (Admin → Pricing) and billing cycle (annual plans count 1/12 per month).
 */
export async function calculatePlatformMrr(tenants: TenantForMrr[]): Promise<{
    mrr: number
    currency: string
    payingTenants: number
    byCurrency: Record<string, number>
}> {
    const pricingCache = new Map<string, EffectivePricing>()
    const rateCache = new Map<string, number>()
    const byCurrency: Record<string, number> = {}
    let payingTenants = 0

    for (const t of tenants) {
        const plan = (t.plan || "FREE") as PlanTier
        if (!t.isActive || t.isTrial || plan === "FREE") continue

        const currency = (t.currencyCode || "INR").toUpperCase()
        let pricing = pricingCache.get(currency)
        if (!pricing) {
            pricing = await getEffectivePricing(currency)
            pricingCache.set(currency, pricing)
        }
        const cycle = (t.settings as { subscription?: { billingCycle?: string } } | null)?.subscription?.billingCycle
        const monthly = cycle === "ANNUAL" ? pricing.annual[plan] / 12 : pricing.monthly[plan]
        if (!(monthly > 0)) continue

        byCurrency[pricing.currency] = (byCurrency[pricing.currency] || 0) + monthly
        payingTenants++
    }

    let mrr = 0
    for (const [currency, amount] of Object.entries(byCurrency)) {
        let rate = rateCache.get(currency)
        if (rate === undefined) {
            rate = currency === MRR_REPORTING_CURRENCY ? 1 : await getExchangeRate(currency, MRR_REPORTING_CURRENCY).catch(() => 0)
            rateCache.set(currency, rate)
        }
        mrr += amount * rate
    }

    return { mrr: Math.round(mrr), currency: MRR_REPORTING_CURRENCY, payingTenants, byCurrency }
}
