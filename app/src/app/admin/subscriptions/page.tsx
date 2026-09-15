import { getPlatformSubscriptions } from "@/app/actions/saas/admin"
import { SubscriptionsClient } from "./SubscriptionsClient"

export const dynamic = "force-dynamic"

export default async function AdminSubscriptionsPage() {
    const data = await getPlatformSubscriptions()

    return <SubscriptionsClient data={data} />
}
