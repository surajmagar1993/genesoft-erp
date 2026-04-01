"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

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
    status?: TaskStatus 
  }
): Promise<{ data: Task[]; total: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  let query = supabase
    .from("tasks")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)

  if (filters?.contact_id) query = query.eq("contact_id", filters.contact_id)
  if (filters?.lead_id) query = query.eq("lead_id", filters.lead_id)
  if (filters?.deal_id) query = query.eq("deal_id", filters.deal_id)
  if (filters?.status) query = query.eq("status", filters.status)

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("Error fetching tasks:", error.message)
    return { data: [], total: 0 }
  }
  return { data: data ?? [], total: count || 0 }
}

export async function getTaskById(id: string): Promise<Task | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) return null
  return data
}

export async function createTask(
  formData: Omit<Task, "id" | "created_at" | "updated_at" | "tenant_id">
): Promise<{ error: string | null, data?: Task }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("tasks")
    .insert([{ ...formData, tenant_id: tenantId }])
    .select()
    .single()

  if (error) return { error: error.message }
  
  revalidatePath("/crm/tasks")
  if (formData.contact_id) revalidatePath(`/crm/contacts/${formData.contact_id}`)
  if (formData.lead_id) revalidatePath(`/crm/leads/${formData.lead_id}`)
  if (formData.deal_id) revalidatePath(`/crm/deals/${formData.deal_id}`)
  
  return { error: null, data }
}

export async function updateTask(
  id: string,
  formData: Partial<Omit<Task, "id" | "created_at" | "updated_at" | "tenant_id">>
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("tasks")
    .update(formData)
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  
  revalidatePath("/crm/tasks")
  
  return { error: null }
}

export async function deleteTask(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  
  revalidatePath("/crm/tasks")
  return { error: null }
}
