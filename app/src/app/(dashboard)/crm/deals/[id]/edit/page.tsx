import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { toRow, type PgRow } from "@/lib/pg-row"
import { isUuid } from "@/lib/utils"
import { DealForm, defaultDealForm } from "@/components/crm/deal-form"
import { notFound } from "next/navigation"

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    const tenantId = await getTenantId()
    const record = await prisma.deal.findFirst({ where: { id, tenantId } })
    if (!record) notFound()
    const data = toRow<PgRow>("Deal", record)

    const initialData = {
        ...defaultDealForm,
        id: data.id,
        title: data.title ?? "",
        contactName: data.contact_name ?? "",
        company: data.company ?? "",
        value: data.value ?? 0,
        stage: data.stage ?? "PROSPECTING",
        probability: data.probability ?? 20,
        expectedClose: data.expected_close ?? "",
        assignedTo: data.assigned_to ?? "",
        notes: data.notes ?? "",
    }

    return <DealForm mode="edit" initialData={initialData} />
}
