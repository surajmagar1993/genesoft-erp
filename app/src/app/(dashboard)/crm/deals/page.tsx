import { getDeals, type DealStage } from "@/app/actions/crm/deals"
import DealsClient from "./DealsClient"

export const dynamic = "force-dynamic"

export default async function DealsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const stage = params.stage as DealStage | undefined
    const search = params.search as string | undefined
    const page = params.page ? parseInt(params.page as string) : 1
    const limit = params.limit ? parseInt(params.limit as string) : 50 // Show more deals for Kanban view

    const { data: deals, total } = await getDeals(page, limit, { stage, search })
    
    return <DealsClient initialDeals={deals} total={total} />
}
