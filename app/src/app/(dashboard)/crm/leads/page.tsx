import { getLeads } from "@/app/actions/crm/leads"
import LeadsClient from "./LeadsClient"

export const dynamic = "force-dynamic"

export default async function LeadsPage() {
    const leads = await getLeads()
    return <LeadsClient initialLeads={leads} />
}
