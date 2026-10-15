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

export type TaskStatus = "TODO" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED"
export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT"

export interface Task {
  id: string
  tenant_id: string
  title: string
  description?: string
  status: TaskStatus
  priority: TaskPriority
  due_date?: string
  assigned_to?: string
  contact_id?: string
  lead_id?: string
  deal_id?: string
  created_at: string
  updated_at: string
}

export async function getTasks(
  page: number = 1,
  limit: number = 10,
  filters?: { 
    contact_id?: string, 
    lead_id?: string, 
    deal_id?: string,
    status?: TaskStatus,
    search?: string 
  }
): Promise<{ data: Task[]; total: number }> {
  try {
    const tenantId = await getTenantId(MODULE)
    for (const id of [filters?.contact_id, filters?.lead_id, filters?.deal_id]) if (id && !isUuid(id)) return { data: [], total: 0 }
    const q = filters?.search?.trim()
    const where: Prisma.TaskWhereInput = {
      tenantId,
      ...(q ? { OR: [{ title: { contains: q, mode: "insensitive" } }, { description: { contains: q, mode: "insensitive" } }] } : {}),
      ...(filters?.contact_id ? { contactId: filters.contact_id } : {}),
      ...(filters?.lead_id ? { leadId: filters.lead_id } : {}),
      ...(filters?.deal_id ? { dealId: filters.deal_id } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.task.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.task.count({ where }),
    ])
    return { data: toRows<Task>("Task", rows), total }
  } catch (err) {
    console.error("Error fetching tasks:", err)
    return { data: [], total: 0 }
  }
}

export async function getTaskById(id: string): Promise<Task | null> {
  if (!isUuid(id)) return null
  const tenantId = await getTenantId(MODULE)
  const row = await prisma.task.findFirst({ where: { id, tenantId } })
  return row ? toRow<Task>("Task", row) : null
}

export async function createTask(
  formData: Omit<Task, "id" | "created_at" | "updated_at" | "tenant_id">
): Promise<{ error: string | null, data?: Task }> {
  try {
    const tenantId = await getTenantWriterId(MODULE)
    const data = fromRow("Task", formData) as Omit<Prisma.TaskUncheckedCreateInput, "tenantId">
    await assertTenantRefs(tenantId, { contact: data.contactId, lead: data.leadId, deal: data.dealId })
    const row = await prisma.task.create({ data: { ...data, tenantId } })

    revalidatePath("/crm/tasks")
    if (formData.contact_id) revalidatePath(`/crm/contacts/${formData.contact_id}`)
    if (formData.lead_id) revalidatePath(`/crm/leads/${formData.lead_id}`)
    if (formData.deal_id) revalidatePath(`/crm/deals/${formData.deal_id}`)

    return { error: null, data: toRow<Task>("Task", row) }
  } catch (err: any) {
    return { error: err.message || "Failed to create task" }
  }
}

export async function updateTask(
  id: string,
  formData: Partial<Omit<Task, "id" | "created_at" | "updated_at" | "tenant_id">>
): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantWriterId(MODULE)
    const data = fromRow("Task", formData) as Prisma.TaskUncheckedUpdateManyInput
    await assertTenantRefs(tenantId, { contact: data.contactId as string | null, lead: data.leadId as string | null, deal: data.dealId as string | null })
    const { count } = await prisma.task.updateMany({ where: { id, tenantId }, data })
    if (count === 0) return { error: "Task not found" }

    revalidatePath("/crm/tasks")
    return { error: null }
  } catch (err: any) {
    return { error: err.message || "Failed to update task" }
  }
}

export async function deleteTask(id: string): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantWriterId(MODULE)
    const { count } = await prisma.task.deleteMany({ where: { id, tenantId } })
    if (count === 0) return { error: "Task not found" }

    revalidatePath("/crm/tasks")
    return { error: null }
  } catch (err: any) {
    return { error: err.message || "Failed to delete task" }
  }
}
