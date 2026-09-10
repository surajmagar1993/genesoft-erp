import { getSecurityOverview } from "@/app/actions/saas/admin"
import { SecurityDashboardClient } from "./SecurityDashboardClient"

export const dynamic = "force-dynamic"

export default async function AdminSecurityPage() {
    const data = await getSecurityOverview()

    return <SecurityDashboardClient data={data} />
}
