import { getWorkflowsOverview } from "@/app/actions/settings/workflows"
import { WorkflowsClient } from "./workflows-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Workflow Automation | Genesoft ERP",
    description: "Design automated trigger-condition-action business workflows across Sales, CRM, Finance, Inventory, Support, and HR.",
}

export default async function WorkflowsPage() {
    const overview = await getWorkflowsOverview()

    return (
        <WorkflowsClient
            initialRules={overview.rules}
            initialExecutions={overview.executions}
            initialStats={overview.stats}
        />
    )
}
