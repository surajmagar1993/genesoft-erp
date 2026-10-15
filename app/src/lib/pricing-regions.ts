/**
 * The regions plans are sold in: the pricing page tabs and the rows of
 * Admin → Pricing & Plans. Each region has one currency and one gateway.
 */
export const PRICING_REGIONS = [
    { code: "IN", label: "India", currency: "INR", gateway: "RAZORPAY" },
    { code: "AE", label: "UAE", currency: "AED", gateway: "STRIPE" },
    { code: "SA", label: "Saudi Arabia", currency: "SAR", gateway: "STRIPE" },
    { code: "UK", label: "UK", currency: "GBP", gateway: "STRIPE" },
    { code: "US", label: "US", currency: "USD", gateway: "STRIPE" },
    { code: "AU", label: "Australia", currency: "AUD", gateway: "STRIPE" },
] as const

export type PricingRegion = (typeof PRICING_REGIONS)[number]
export type PricingRegionCode = PricingRegion["code"]

export function pricingRegion(code: string | null | undefined): PricingRegion | undefined {
    const upper = (code || "").toUpperCase()
    return PRICING_REGIONS.find((r) => r.code === (upper === "GB" ? "UK" : upper))
}
