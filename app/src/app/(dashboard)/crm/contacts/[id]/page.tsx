import { getContactById } from "@/app/actions/crm/contacts"
import { getCustomerLedger } from "@/app/actions/crm/ledger"
import { getTasks } from "@/app/actions/crm/tasks"
import { getCommunicationLogs } from "@/app/actions/crm/communications"
import ContactDetailClient from "./ContactDetailClient"
import { notFound } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function ContactDetailPage({ params }: { params: { id: string } }) {
  const [contact, ledger, tasks, logs] = await Promise.all([
    getContactById(params.id),
    getCustomerLedger(params.id),
    getTasks(1, 50, { contact_id: params.id }),
    getCommunicationLogs(1, 50, { contact_id: params.id }),
  ])

  if (!contact) notFound()

  return (
    <ContactDetailClient
      contact={contact}
      ledger={ledger}
      initialTasks={tasks.data}
      initialLogs={logs.data}
    />
  )
}
