import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { toRow, type PgRow } from "@/lib/pg-row"
import { isUuid } from "@/lib/utils"
import { CompanyForm } from "@/components/crm/company-form"
import { notFound } from "next/navigation"

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    const tenantId = await getTenantId("crm")
    const record = await prisma.company.findFirst({ where: { id, tenantId } })
    if (!record) notFound()
    const data = toRow<PgRow>("Company", record)

    const initialData = {
        id: data.id,
        name: data.name ?? "",
        industry: data.industry ?? "",
        website: data.website ?? "",
        phone: data.phone ?? "",
        email: data.email ?? "",
        address: data.address ?? "",
        city: data.city ?? "",
        state: data.state ?? "",
        country: data.country ?? "",
        countryCode: data.country_code ?? "",
        gstin: data.gstin ?? "",
        employeeCount: data.employee_count ?? "",
        annualRevenue: data.annual_revenue ?? "",
    }

    return <CompanyForm mode="edit" initialData={initialData} />
}
