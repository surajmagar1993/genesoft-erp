import { getQuotes, type QuoteStatus } from "@/app/actions/sales/quotes"
import QuotesClient from "./QuotesClient"

export const dynamic = "force-dynamic"

export default async function QuotesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const status = params.status as QuoteStatus | undefined
    const search = params.search as string | undefined
    const page = params.page ? parseInt(params.page as string) : 1
    const limit = params.limit ? parseInt(params.limit as string) : 10

    const { data: quotes, total } = await getQuotes(page, limit, { status, search })
    
    return <QuotesClient initialQuotes={quotes} total={total} />
}
