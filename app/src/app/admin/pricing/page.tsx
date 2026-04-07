import { getPricingPlans } from "@/app/actions/saas/admin"
import { Separator } from "@/components/ui/separator"
import { Globe } from "lucide-react"
import { PricingCard } from "@/components/admin/pricing-card"

export const dynamic = "force-dynamic"

export default async function PricingPage() {
    const plans = await getPricingPlans()

    // Grouping by region for better organization
    const regions = Array.from(new Set<string>(plans.map((p: any) => p.regionCode as string)))

    return (
        <div className="space-y-8 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">Global Pricing Engine</h1>
                <p className="text-muted-foreground text-lg max-w-3xl">
                    Configure regional subscription rates and currency tokens for Genesoft SaaS tiers.
                </p>
            </div>

            <div className="grid gap-12">
                {regions.map((region: string) => (
                    <div key={region} className="space-y-4">
                        <div className="flex items-center gap-3">
                            <Globe className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-bold text-foreground">Region: {region}</h2>
                            <Separator className="flex-1" />
                        </div>

                        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                            {plans.filter((p: any) => p.regionCode === region).map((plan: any) => (
                                <PricingCard key={plan.id} plan={plan} />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
