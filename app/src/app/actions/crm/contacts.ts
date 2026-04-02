"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export interface Contact {
  id: string
  display_name: string
  type: "INDIVIDUAL" | "COMPANY"
  email: string
  phone: string
  gstin?: string
  pan: string
  customer_group: string
  country_code?: string
  currency_code: string
  balance: number
  is_active: boolean
  tenant_id: string
  created_at: string
}

export async function getContacts(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<{ data: Contact[]; total: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  let query = supabase
    .from("contacts")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)

  if (search) {
    query = query.or(`display_name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`)
  }

  const { data, count, error } = await query
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching contacts:", error.message)
    return { data: [], total: 0 }
  }
  return { data: data ?? [], total: count || 0 }
}

export async function getContactById(id: string): Promise<Contact | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) return null
  return data
}

export async function createContact(
  formData: Omit<Contact, "id" | "created_at" | "tenant_id">
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("contacts")
    .insert([{ ...formData, tenant_id: tenantId }])

  if (error) return { error: error.message }
  revalidatePath("/crm/contacts")
  return { error: null }
}

export async function updateContact(
  id: string,
  formData: Partial<Omit<Contact, "id" | "created_at" | "tenant_id">>
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("contacts")
    .update(formData)
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/crm/contacts")
  return { error: null }
}

export async function deleteContact(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("contacts")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/crm/contacts")
  return { error: null }
}

export async function exportContacts(limit: number = 1000): Promise<Contact[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("tenant_id", tenantId)
    .limit(limit)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("exportContacts error:", error.message)
    return []
  }
  return data ?? []
}

export async function importContacts(
  contacts: any[]
): Promise<{ error: string | null; count: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // Ensure default structure
  const insertData = contacts.map(c => ({
    display_name: c.display_name || "Unknown",
    type: c.type || "INDIVIDUAL",
    email: c.email || null,
    phone: c.phone || null,
    customer_group: c.customer_group || "retail",
    currency_code: c.currency_code || "INR",
    balance: parseFloat(c.balance) || 0,
    is_active: c.is_active !== undefined ? c.is_active : true,
    ...c, // Override with everything passed
    tenant_id: tenantId,
  }))

  const { data, error } = await supabase
    .from("contacts")
    .insert(insertData)
    .select("id")

  if (error) {
    console.error("importContacts error:", error.message)
    return { error: error.message, count: 0 }
  }

  revalidatePath("/crm/contacts")
  return { error: null, count: data?.length || 0 }
}
