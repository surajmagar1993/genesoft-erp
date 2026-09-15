import { getRecruitmentOverview } from "@/app/actions/recruitment"
import { RecruitmentClient } from "./recruitment-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Recruitment & ATS | Genesoft ERP",
    description: "Manage job requisitions, candidate pipeline stages, interview scheduling, scoring, and 1-click hire conversion into the Employee Directory.",
}

export default async function RecruitmentPage() {
    const data = await getRecruitmentOverview()

    return <RecruitmentClient initialData={data} />
}
