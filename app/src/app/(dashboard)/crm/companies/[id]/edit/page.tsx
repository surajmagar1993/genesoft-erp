import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { toRow, type PgRow } from "@/lib/pg-row"
import { isUuid } from "@/lib/utils"
import { CompanyForm, defaultCompanyForm } from "@/components/crm/company-form"
import { notFound } from "next/navigation"

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    const tenantId = await getTenantId()
    const record = await prisma.company.findFirst({ where: { id, tenantId } })
    if (!record) notFound()
    const data = toRow<PgRow>("Company", record)

    const initialData = {
        ...defaultCompanyForm,
        id: data.id,
        name: data.name ?? "",
        industry: data.industry ?? "",
        website: data.website ?? "",
        phone: data.phone ?? "",
        city: data.city ?? "",
        gstin: data.gstin ?? "",
        countryCode: data.country_code ?? "IN",
    }

    return <CompanyForm mode="edit" initialData={initialData} />
}
