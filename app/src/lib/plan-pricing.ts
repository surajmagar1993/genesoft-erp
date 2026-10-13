import { prisma } from "@/lib/prisma"
import { getRegionalPricing, type PlanTier, type RegionalPricing } from "@/lib/saas-subscription-engine"

export type BillingGateway = "RAZORPAY" | "STRIPE"

export interface EffectivePricing extends RegionalPricing {
    gateway: BillingGateway
}

const PAID_TIERS: Exclude<PlanTier, "FREE">[] = ["BASIC", "PRO", "ENTERPRISE"]
const ANNUAL_DISCOUNT = 0.8 // annual = 12 months less 20%, same rule as the built-in catalog

export function annualFromMonthly(monthly: number): number {
    return Math.round(monthly * 12 * ANNUAL_DISCOUNT)
}

/**
 * Plan prices for a currency. Admin → Pricing (pricing_plans) is the source
 * of truth: its active monthly prices override the built-in catalog, and the
 * annual price is derived from them. Tiers or currencies with no row keep the
 * catalog price. The gateway comes from the rows (INR defaults to Razorpay,
 * everything else to Stripe).
 */
export async function getEffectivePricing(currencyCode?: string | null): Promise<EffectivePricing> {
    const catalog = getRegionalPricing(currencyCode)
    const currency = catalog.currency
    const monthly = { ...catalog.monthly }
    const annual = { ...catalog.annual }
    let gateway: BillingGateway = currency === "INR" ? "RAZORPAY" : "STRIPE"

    try {
        const rows: { tier: PlanTier; amount: unknown; gateway: string }[] = await prisma.pricingPlan.findMany({
            where: { currency, isActive: true },
            select: { tier: true, amount: true, gateway: true },
        })
        for (const row of rows) {
            if (!PAID_TIERS.includes(row.tier as Exclude<PlanTier, "FREE">)) continue
            const price = Number(row.amount)
            if (!(price > 0)) continue
            monthly[row.tier] = price
            annual[row.tier] = annualFromMonthly(price)
        }
        const rowGateway = rows.find((r) => r.gateway === "RAZORPAY" || r.gateway === "STRIPE")?.gateway
        if (rowGateway) gateway = rowGateway as BillingGateway
    } catch (err) {
        console.error("getEffectivePricing: falling back to the built-in catalog", err)
    }

    return { ...catalog, monthly, annual, gateway }
}
