"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export type DealStage =
  | "PROSPECTING"
  | "QUALIFICATION"
  | "PROPOSAL"
  | "NEGOTIATION"
  | "CLOSED_WON"
  | "CLOSED_LOST"

export interface Deal {
  id: string
  title: string
  contact_name: string
  company: string
  value: number
  stage: DealStage
  probability: number
  expected_close: string | null
  assigned_to: string
  notes: string
  tenant_id: string
  created_at: string
}

export async function getDeals(
    page: number = 1, 
    limit: number = 10,
    filters?: { stage?: DealStage; search?: string }
): Promise<{ data: Deal[]; total: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  let query = supabase
    .from("deals")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)

  if (filters?.stage) {
    query = query.eq("stage", filters.stage)
  }

  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,company.ilike.%${filters.search}%,contact_name.ilike.%${filters.search}%`)
  }

  const { data, count, error } = await query
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching deals:", error.message)
    return { data: [], total: 0 }
  }
  return { data: data ?? [], total: count || 0 }
}

export async function getDealById(id: string): Promise<Deal | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("deals")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) return null
  return data
}

export async function createDeal(
  formData: Omit<Deal, "id" | "created_at" | "tenant_id">
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("deals")
    .insert([{ ...formData, tenant_id: tenantId }])

  if (error) return { error: error.message }
  revalidatePath("/crm/deals")
  return { error: null }
}

export async function updateDeal(
  id: string,
  formData: Partial<Omit<Deal, "id" | "created_at" | "tenant_id">>
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("deals")
    .update(formData)
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/crm/deals")
  return { error: null }
}

export async function deleteDeal(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("deals")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/crm/deals")
  return { error: null }
}
