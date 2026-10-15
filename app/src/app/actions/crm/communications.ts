"use server"

import { getTenantId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { fromRow, toRow, toRows } from "@/lib/pg-row"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { isUuid } from "@/lib/utils"
import type { Prisma } from "@prisma/client"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "crm" as const

/** The database enum: NOTE, EMAIL, CALL, MEETING, TASK */
export type CommunicationType = "NOTE" | "CALL" | "EMAIL" | "MEETING" | "TASK"

export interface CommunicationLog {
  id: string
  tenant_id: string
  type: CommunicationType
  subject?: string
  content: string
  logged_at: string
  logged_by?: string
  contact_id?: string
  lead_id?: string
  deal_id?: string
  created_at: string
  updated_at: string
}

export async function getCommunicationLogs(
  page: number = 1,
  limit: number = 20,
  filters?: {
    contact_id?: string
    lead_id?: string
    deal_id?: string
    type?: CommunicationType
    search?: string
  }
): Promise<{ data: CommunicationLog[]; total: number }> {
  try {
    const tenantId = await getTenantId(MODULE)
    for (const id of [filters?.contact_id, filters?.lead_id, filters?.deal_id]) if (id && !isUuid(id)) return { data: [], total: 0 }
    const q = filters?.search?.trim()
    const where: Prisma.CommunicationLogWhereInput = {
      tenantId,
      ...(q ? { OR: [{ subject: { contains: q, mode: "insensitive" } }, { content: { contains: q, mode: "insensitive" } }] } : {}),
      ...(filters?.contact_id ? { contactId: filters.contact_id } : {}),
      ...(filters?.lead_id ? { leadId: filters.lead_id } : {}),
      ...(filters?.deal_id ? { dealId: filters.deal_id } : {}),
      ...(filters?.type ? { type: filters.type } : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.communicationLog.findMany({ where, orderBy: { loggedAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.communicationLog.count({ where }),
    ])
    return { data: toRows<CommunicationLog>("CommunicationLog", rows), total }
  } catch (err) {
    console.error("Error fetching communication logs:", err)
    return { data: [], total: 0 }
  }
}

export async function createCommunicationLog(
  formData: Omit<CommunicationLog, "id" | "created_at" | "updated_at" | "tenant_id">
): Promise<{ error: string | null; data?: CommunicationLog }> {
  try {
    const tenantId = await getTenantWriterId(MODULE)
    const data = fromRow("CommunicationLog", formData) as Omit<Prisma.CommunicationLogUncheckedCreateInput, "tenantId">
    await assertTenantRefs(tenantId, { contact: data.contactId, lead: data.leadId, deal: data.dealId })
    const row = await prisma.communicationLog.create({ data: { ...data, tenantId } })

    // Revalidate relevant paths
    if (formData.contact_id) revalidatePath(`/crm/contacts/${formData.contact_id}`)
    if (formData.lead_id) revalidatePath(`/crm/leads/${formData.lead_id}`)
    if (formData.deal_id) revalidatePath(`/crm/deals/${formData.deal_id}`)

    return { error: null, data: toRow<CommunicationLog>("CommunicationLog", row) }
  } catch (err: any) {
    return { error: err.message || "Failed to save the log entry" }
  }
}

export async function deleteCommunicationLog(id: string): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantWriterId(MODULE)
    const { count } = await prisma.communicationLog.deleteMany({ where: { id, tenantId } })
    if (count === 0) return { error: "Log entry not found" }
    return { error: null }
  } catch (err: any) {
    return { error: err.message || "Failed to delete the log entry" }
  }
}
