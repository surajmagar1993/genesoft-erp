import { getPerformanceOverview } from "@/app/actions/hr/performance"
import { PerformanceClient } from "./performance-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Performance & Training | Genesoft ERP",
    description: "Appraisal cycles, 360 review scorecards, employee OKRs/goals tracking, training course catalog, and employee certifications.",
}

export default async function PerformancePage() {
    const data = await getPerformanceOverview()

    return <PerformanceClient initialData={data} />
}
