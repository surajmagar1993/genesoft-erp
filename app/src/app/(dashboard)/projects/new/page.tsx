import { getProjectsOverview } from "@/app/actions/projects"
import { ProjectForm } from "@/components/projects/project-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "New project | Genesoft ERP" }

export default async function NewProjectPage() {
    const { availableClients, availableEmployees } = await getProjectsOverview()
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <ProjectForm clients={availableClients} employees={availableEmployees} />
        </div>
    )
}
