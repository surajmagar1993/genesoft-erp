import { getLeadById } from "@/app/actions/crm/leads"
import { getTasks } from "@/app/actions/crm/tasks"
import { getCommunicationLogs } from "@/app/actions/crm/communications"
import LeadDetailClient from "./LeadDetailClient"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LeadDetailPage({ params }: { params: { id: string } }) {
    const [lead, tasks, logs] = await Promise.all([
        getLeadById(params.id),
        getTasks({ lead_id: params.id }),
        getCommunicationLogs({ lead_id: params.id })
    ])

    if (!lead) {
        notFound()
    }

    return <LeadDetailClient lead={lead} initialTasks={tasks} initialLogs={logs} />
}
