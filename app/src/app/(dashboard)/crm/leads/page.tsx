import { getLeads, type LeadStatus } from "@/app/actions/crm/leads"
import LeadsClient from "./LeadsClient"

export const dynamic = "force-dynamic"

export default async function LeadsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const status = params.status as LeadStatus | undefined
    const search = params.search as string | undefined
    const page = params.page ? parseInt(params.page as string) : 1
    const limit = params.limit ? parseInt(params.limit as string) : 10

    const { data: leads, total } = await getLeads(page, limit, { status, search })
    return <LeadsClient initialLeads={leads} total={total} />
}
