import { getPlanSettings, getPricingPlans } from "@/app/actions/saas/admin"
import { PricingClient } from "./PricingClient"

export const dynamic = "force-dynamic"

export default async function PricingPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const [{ tab }, regions, planConfig] = await Promise.all([searchParams, getPricingPlans(), getPlanSettings()])
    return <PricingClient regions={regions} planConfig={planConfig} tab={tab} />
}
