import { getMarketingOverview } from "@/app/actions/saas/marketing"
import { MarketingClient } from "./marketing-client"

export const dynamic = "force-dynamic"
// Sending goes out in batches of 100 inside the server action
export const maxDuration = 300

export default async function AdminMarketingPage() {
    const overview = await getMarketingOverview()
    return <MarketingClient initial={overview} />
}
