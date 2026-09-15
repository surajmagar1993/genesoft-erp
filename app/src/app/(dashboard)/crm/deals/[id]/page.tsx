import { getDealWithRelations } from "@/app/actions/crm/deals"
import { getTasks } from "@/app/actions/crm/tasks"
import { getCommunicationLogs } from "@/app/actions/crm/communications"
import DealDetailClient from "./DealDetailClient"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function DealDetailPage({ params }: { params: Promise<{ id: string }> | { id: string } }) {
  const resolvedParams = await params
  const [dealData, tasks, logs] = await Promise.all([
    getDealWithRelations(resolvedParams.id),
    getTasks(1, 50, { deal_id: resolvedParams.id }),
    getCommunicationLogs(1, 50, { deal_id: resolvedParams.id })
  ])

  if (!dealData.deal) notFound()

  return (
    <DealDetailClient
      deal={dealData.deal}
      contact={dealData.contact}
      company={dealData.company}
      initialTasks={tasks.data}
      initialLogs={logs.data}
    />
  )
}
