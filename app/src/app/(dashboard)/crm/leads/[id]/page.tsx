import { isUuid } from "@/lib/utils"
import { getLeadById } from "@/app/actions/crm/leads"
import { getTasks } from "@/app/actions/crm/tasks"
import { getCommunicationLogs } from "@/app/actions/crm/communications"
import LeadDetailClient from "./LeadDetailClient"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    const [lead, tasks, logs] = await Promise.all([
        getLeadById(id),
        getTasks(1, 50, { lead_id: id }),
        getCommunicationLogs(1, 50, { lead_id: id })
    ])

    if (!lead) {
        notFound()
    }

    return <LeadDetailClient lead={lead} initialTasks={tasks.data} initialLogs={logs.data} />
}
