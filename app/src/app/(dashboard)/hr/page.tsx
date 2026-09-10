import { getHROverview } from "@/app/actions/hr"
import { HRClient } from "./hr-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "HR & Workforce Management | Genesoft ERP",
    description: "Employee directory, organizational departments, job designations, attendance rosters, and leave approvals.",
}

export default async function HRPage() {
    const overviewData = await getHROverview()

    return <HRClient initialData={overviewData} />
}
