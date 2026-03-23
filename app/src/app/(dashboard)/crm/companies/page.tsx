import { getCompanies } from "@/app/actions/crm/companies"
import CompaniesClient from "./CompaniesClient"

export default async function CompaniesPage() {
    try {
        const companies = await getCompanies()
        return <CompaniesClient initialCompanies={companies} />
    } catch (error) {
        return (
            <div className="flex h-[400px] items-center justify-center">
                <p className="text-red-500">Failed to load companies</p>
            </div>
        )
    }
}
