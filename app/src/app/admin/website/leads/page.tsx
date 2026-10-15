import { listLeads } from "@/app/actions/website"
import { LeadsClient } from "./LeadsClient"

export const dynamic = "force-dynamic"

export default async function WebsiteLeadsPage({ searchParams }: { searchParams: Promise<{ status?: string; kind?: string }> }) {
    const { status, kind } = await searchParams
    return <LeadsClient data={await listLeads({ status, kind })} status={status ?? ""} kind={kind ?? ""} />
}
