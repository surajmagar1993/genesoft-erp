"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export type CommunicationType = "NOTE" | "CALL" | "EMAIL" | "MEETING" | "SMS" | "OTHER"

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

export async function getCommunicationLogs(filters?: {
  contact_id?: string
  lead_id?: string
  deal_id?: string
  type?: CommunicationType
}): Promise<CommunicationLog[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  let query = supabase
    .from("communication_logs")
    .select("*")
    .eq("tenant_id", tenantId)

  if (filters?.contact_id) query = query.eq("contact_id", filters.contact_id)
  if (filters?.lead_id) query = query.eq("lead_id", filters.lead_id)
  if (filters?.deal_id) query = query.eq("deal_id", filters.deal_id)
  if (filters?.type) query = query.eq("type", filters.type)

  const { data, error } = await query.order("logged_at", { ascending: false })

  if (error) {
    console.error("Error fetching communication logs:", error.message)
    return []
  }
  return data ?? []
}

export async function createCommunicationLog(
  formData: Omit<CommunicationLog, "id" | "created_at" | "updated_at" | "tenant_id">
): Promise<{ error: string | null; data?: CommunicationLog }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("communication_logs")
    .insert([{ ...formData, tenant_id: tenantId }])
    .select()
    .single()

  if (error) return { error: error.message }

  // Revalidate relevant paths
  if (formData.contact_id) revalidatePath(`/crm/contacts/${formData.contact_id}`)
  if (formData.lead_id) revalidatePath(`/crm/leads/${formData.lead_id}`)
  if (formData.deal_id) revalidatePath(`/crm/deals/${formData.deal_id}`)

  return { error: null, data }
}

export async function deleteCommunicationLog(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("communication_logs")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }

  return { error: null }
}
