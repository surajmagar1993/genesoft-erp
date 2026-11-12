import { prisma } from "@/lib/prisma"
import { annualFromMonthly } from "@/lib/plan-pricing-math"
import { getRegionalPricing, type PlanTier, type RegionalPricing } from "@/lib/saas-subscription-engine"

export type BillingGateway = "RAZORPAY"

export interface EffectivePricing extends RegionalPricing {
    gateway: BillingGateway
    /** Paid plans switched off in Admin → Pricing: not shown and can't be bought */
    hidden: PlanTier[]
}

const PAID_TIERS: Exclude<PlanTier, "FREE">[] = ["BASIC", "PRO", "ENTERPRISE"]
export { annualFromMonthly }

/**
 * Plan prices for a currency. Admin → Pricing (pricing_plans) is the source
 * of truth: its monthly prices override the built-in catalog, and the annual
 * price is derived from them. A paid plan switched off there is hidden (not
 * offered or sold). Tiers or currencies with no row keep the catalog price.
 * Every currency is paid through Razorpay.
 */
export async function getEffectivePricing(currencyCode?: string | null): Promise<EffectivePricing> {
    const catalog = getRegionalPricing(currencyCode)
    const currency = catalog.currency
    const monthly = { ...catalog.monthly }
    const annual = { ...catalog.annual }
    const gateway: BillingGateway = "RAZORPAY"
    const hidden: PlanTier[] = []

    try {
        const rows: { tier: PlanTier; amount: unknown; isActive: boolean }[] = await prisma.pricingPlan.findMany({
            where: { currency },
            select: { tier: true, amount: true, isActive: true },
        })
        for (const row of rows) {
            if (!PAID_TIERS.includes(row.tier as Exclude<PlanTier, "FREE">)) continue
            // A hidden plan keeps its price for workspaces already on it (renewals, MRR)
            if (!row.isActive) hidden.push(row.tier)
            const price = Number(row.amount)
            if (!(price > 0)) continue
            monthly[row.tier] = price
            annual[row.tier] = annualFromMonthly(price)
        }
    } catch (err) {
        console.error("getEffectivePricing: falling back to the built-in catalog", err)
    }

    return { ...catalog, monthly, annual, gateway, hidden }
}
