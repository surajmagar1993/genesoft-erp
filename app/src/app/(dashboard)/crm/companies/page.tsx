import { getCompanies } from "@/app/actions/crm/companies"
import CompaniesClient from "./CompaniesClient"

export const dynamic = "force-dynamic"

export default async function CompaniesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const search = params.search as string | undefined
    const page = params.page ? parseInt(params.page as string) : 1
    const limit = params.limit ? parseInt(params.limit as string) : 10

    // Load first, render after: React can't catch rendering errors with try/catch
    let result: Awaited<ReturnType<typeof getCompanies>> | null = null
    try {
        result = await getCompanies(page, limit, search)
    } catch (error) {
        console.error("getCompanies failed:", error)
    }
    if (!result) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <p className="text-red-500">Failed to load companies</p>
            </div>
        )
    }
    const { data: companies, total } = result
    return <CompaniesClient initialCompanies={companies} total={total} />
}
