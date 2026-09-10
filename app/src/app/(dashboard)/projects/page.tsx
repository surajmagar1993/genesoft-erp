import { getProjectsOverview } from "@/app/actions/projects"
import { ProjectsClient } from "./projects-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Projects & Task Delivery | Genesoft ERP",
    description: "Agile Kanban sprint boards, deliverable milestones, resource allocation, and billable time tracking.",
}

export default async function ProjectsPage() {
    const overviewData = await getProjectsOverview()

    return <ProjectsClient initialData={overviewData} />
}
