import { getPricingPlans } from "@/app/actions/saas/admin"
import { PricingClient } from "./PricingClient"

export const dynamic = "force-dynamic"

export default async function PricingPage() {
    return <PricingClient regions={await getPricingPlans()} />
}
