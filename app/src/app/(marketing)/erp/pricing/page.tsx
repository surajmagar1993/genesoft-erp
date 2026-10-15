import { SITE_CONTAINER } from "@/components/marketing/container"
import Link from "next/link"
import { headers } from "next/headers"
import { getEffectivePricing } from "@/lib/plan-pricing"
import { getPlanConfig } from "@/lib/plan-config"
import { PLAN_TIERS, type PlanTier } from "@/lib/saas-subscription-engine"
import { PlanCards, type PricedPlan } from "./plan-cards"
import { localeForCurrency } from "@/lib/utils"
import { PRICING_REGIONS, pricingRegion } from "@/lib/pricing-regions"
import { pageMeta } from "@/lib/seo"

export const dynamic = "force-dynamic"

export const metadata = pageMeta({
    title: "Pricing | Genesoft ERP",
    description: "Simple plans for Genesoft ERP. 15-day free trial, no card needed, and a 7-day money-back guarantee on your first payment.",
    path: "/erp/pricing",
})

function regionFor(code: string | undefined) {
    return pricingRegion(code) || pricingRegion("US")!
}

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ region?: string }> }) {
    const params = await searchParams
    const headerList = await headers()
    const geo = headerList.get("x-vercel-ip-country") || undefined
    const region = regionFor(params.region || geo)

    // Live prices: Admin → Pricing, with the built-in catalog as fallback
    const [pricing, planConfig] = await Promise.all([getEffectivePricing(region.currency), getPlanConfig()])
    // Plans switched off in Admin → Pricing aren't offered
    const tiers = (["FREE", "BASIC", "PRO", "ENTERPRISE"] as PlanTier[]).filter((t) => !pricing.hidden.includes(t))
    const plans: PricedPlan[] = tiers.map((tier) => ({
        tier,
        name: PLAN_TIERS[tier].name,
        tagline: PLAN_TIERS[tier].tagline,
        features: planConfig[tier].features,
        monthly: pricing.monthly[tier],
        annual: pricing.annual[tier],
    }))

    return (
        <>
            <section className="border-b border-s-border bg-gradient-to-b from-s-orange-tint/50 to-s-bg">
                <div className="mx-auto max-w-3xl px-4 py-16 text-center md:px-6">
                    <h1 className="text-balance text-4xl font-bold tracking-tight text-s-ink md:text-5xl xl:text-6xl">Simple pricing that grows with you</h1>
                    <p className="mt-4 text-lg text-s-text">
                        Start with a 15-day free trial. No card needed. Pay monthly, or yearly and save 20%.
                    </p>
                    <nav className="mt-8 inline-flex flex-wrap justify-center gap-1 rounded-lg border border-s-border bg-s-card p-1" aria-label="Prices for region">
                        {PRICING_REGIONS.map((r) => (
                            <Link
                                key={r.code}
                                href={`/erp/pricing?region=${r.code}`}
                                aria-current={r.code === region.code ? "page" : undefined}
                                className={
                                    r.code === region.code
                                        ? "rounded-md bg-s-orange px-3 py-1.5 text-sm font-medium text-s-on-orange"
                                        : "rounded-md px-3 py-1.5 text-sm font-medium text-s-text hover:bg-s-band"
                                }
                            >
                                {r.label}
                            </Link>
                        ))}
                    </nav>
                </div>
            </section>

            <section className="py-16">
                <div className={SITE_CONTAINER}>
                    <PlanCards plans={plans} currency={pricing.currency} locale={localeForCurrency(pricing.currency)} />
                    <p className="mt-8 text-center text-sm text-s-muted">
                        Prices are per workspace and include applicable taxes. Cancel anytime.
                        Not happy with your first paid month or year? Ask within 7 days for a full refund.{" "}
                        <Link href="/refund-policy" className="font-medium text-s-orange-text hover:underline">Refund policy</Link>
                    </p>
                </div>
            </section>

            <section className="border-t border-s-border bg-s-band py-16">
                <div className={`${SITE_CONTAINER} grid gap-8 md:grid-cols-3 xl:gap-12`}>
                    {[
                        { q: "What happens after the trial?", a: "Choose a paid plan to keep your full features, or carry on with the free plan. Your data stays put either way." },
                        { q: "Can I change plans later?", a: "Yes. Upgrade anytime and pay only the difference for the rest of your billing period. Downgrades take effect at your next renewal." },
                        { q: "How do I pay?", a: "By card, UPI or net banking through Razorpay in India, and by card through Stripe in other countries." },
                    ].map((item) => (
                        <div key={item.q}>
                            <h3 className="font-semibold text-s-ink">{item.q}</h3>
                            <p className="mt-2 text-sm leading-relaxed text-s-text">{item.a}</p>
                        </div>
                    ))}
                </div>
            </section>
        </>
    )
}
