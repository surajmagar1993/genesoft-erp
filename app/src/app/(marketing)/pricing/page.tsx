import Link from "next/link"
import { headers } from "next/headers"
import { getEffectivePricing } from "@/lib/plan-pricing"
import { PLAN_TIERS, type PlanTier } from "@/lib/saas-subscription-engine"
import { PlanCards, type PricedPlan } from "./plan-cards"
import { localeForCurrency } from "@/lib/utils"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Pricing | Genesoft ERP",
    description: "Simple plans for Genesoft ERP. 15-day free trial, no card needed, and a 7-day money-back guarantee on your first payment.",
}

const REGIONS = [
    { code: "IN", label: "India", currency: "INR" },
    { code: "AE", label: "UAE", currency: "AED" },
    { code: "SA", label: "Saudi Arabia", currency: "SAR" },
    { code: "UK", label: "UK", currency: "GBP" },
    { code: "US", label: "US", currency: "USD" },
    { code: "AU", label: "Australia", currency: "AUD" },
]

function regionFor(code: string | undefined) {
    const upper = (code || "").toUpperCase()
    const normalized = upper === "GB" ? "UK" : upper
    return REGIONS.find((r) => r.code === normalized) || REGIONS.find((r) => r.code === "US")!
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
    const params = await searchParams
    const headerList = await headers()
    const geo = headerList.get("x-vercel-ip-country") || undefined
    const region = regionFor(params.region || geo)

    // Live prices: Admin → Pricing, with the built-in catalog as fallback
    const pricing = await getEffectivePricing(region.currency)
    const tiers: PlanTier[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"]
    const plans: PricedPlan[] = tiers.map((tier) => ({
        tier,
        name: PLAN_TIERS[tier].name,
        tagline: PLAN_TIERS[tier].tagline,
        features: PLAN_TIERS[tier].features,
        monthly: pricing.monthly[tier],
        annual: pricing.annual[tier],
    }))

    return (
        <>
            <section className="border-b border-slate-100 bg-gradient-to-b from-blue-50/60 to-white">
                <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
                    <h1 className="text-balance text-4xl font-bold tracking-tight text-slate-900 md:text-5xl">Simple pricing that grows with you</h1>
                    <p className="mt-4 text-lg text-slate-600">
                        Start with a 15-day free trial. No card needed. Pay monthly, or yearly and save 20%.
                    </p>
                    <nav className="mt-8 inline-flex flex-wrap justify-center gap-1 rounded-lg border border-slate-200 bg-white p-1" aria-label="Prices for region">
                        {REGIONS.map((r) => (
                            <Link
                                key={r.code}
                                href={`/pricing?region=${r.code}`}
                                aria-current={r.code === region.code ? "page" : undefined}
                                className={
                                    r.code === region.code
                                        ? "rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white"
                                        : "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
                                }
                            >
                                {r.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </section>

            <section className="py-16">
                <div className="mx-auto max-w-6xl px-4 md:px-6">
                    <PlanCards plans={plans} currency={pricing.currency} locale={localeForCurrency(pricing.currency)} />
                    <p className="mt-8 text-center text-sm text-slate-500">
                        Prices are per workspace and include applicable taxes. Cancel anytime.
                        Not happy with your first paid month or year? Ask within 7 days for a full refund.{" "}
                        <Link href="/refund-policy" className="font-medium text-blue-700 hover:underline">Refund policy</Link>
                    </p>
                </div>
            </section>

            <section className="border-t border-slate-100 bg-slate-50 py-16">
                <div className="mx-auto grid max-w-5xl gap-8 px-4 md:grid-cols-3 md:px-6">
                    {[
                        { q: "What happens after the trial?", a: "Choose a paid plan to keep your full features, or carry on with the free plan. Your data stays put either way." },
                        { q: "Can I change plans later?", a: "Yes. Upgrade anytime and pay only the difference for the rest of your billing period. Downgrades take effect at your next renewal." },
                        { q: "How do I pay?", a: "By card, UPI or net banking through Razorpay in India, and by card through Stripe in other countries." },
                    ].map((item) => (
                        <div key={item.q}>
                            <h3 className="font-semibold text-slate-900">{item.q}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-slate-600">{item.a}</p>
                        </div>
                    ))}
                </div>
            </section>
        </>
    )
}
