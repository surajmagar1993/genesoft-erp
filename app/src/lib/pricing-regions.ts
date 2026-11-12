/**
 * The regions plans are sold in: the pricing page tabs and the rows of
 * Admin → Pricing & Plans. Each region has one currency. Every region pays
 * through Razorpay (international cards must be switched on in the Razorpay
 * account for the non-INR regions).
 */
export const PRICING_REGIONS = [
    { code: "IN", label: "India", currency: "INR", gateway: "RAZORPAY" },
    { code: "AE", label: "UAE", currency: "AED", gateway: "RAZORPAY" },
    { code: "SA", label: "Saudi Arabia", currency: "SAR", gateway: "RAZORPAY" },
    { code: "UK", label: "UK", currency: "GBP", gateway: "RAZORPAY" },
    { code: "US", label: "US", currency: "USD", gateway: "RAZORPAY" },
    { code: "AU", label: "Australia", currency: "AUD", gateway: "RAZORPAY" },
] as const

export type PricingRegion = (typeof PRICING_REGIONS)[number]
export type PricingRegionCode = PricingRegion["code"]

export function pricingRegion(code: string | null | undefined): PricingRegion | undefined {
    const upper = (code || "").toUpperCase()
    return PRICING_REGIONS.find((r) => r.code === (upper === "GB" ? "UK" : upper))
}
