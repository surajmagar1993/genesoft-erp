import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { toRow, type PgRow } from "@/lib/pg-row"
import { isUuid } from "@/lib/utils"
import { LeadForm, defaultLeadForm, type LeadFormData } from "@/components/crm/lead-form"
import { notFound } from "next/navigation"

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    const tenantId = await getTenantId()
    const record = await prisma.lead.findFirst({ where: { id, tenantId } })
    if (!record) notFound()
    const data = toRow<PgRow>("Lead", record)

    const initialData: LeadFormData = {
        ...defaultLeadForm,
        id: data.id,
        title: data.title ?? "",
        contactName: data.contact_name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        source: data.source ?? "",
        status: data.status ?? "NEW",
        score: data.score ?? 50,
        assignedTo: data.assigned_to ?? "",
        notes: data.notes ?? "",
    }

    return <LeadForm mode="edit" initialData={initialData} />
}
