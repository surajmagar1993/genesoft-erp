"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export interface Company {
  id: string
  name: string
  industry?: string
  website?: string
  phone?: string
  email?: string
  address?: string
  city?: string
  country?: string
  country_code?: string
  gstin?: string
  employee_count?: number
  annual_revenue?: number
  is_active: boolean
  tenant_id: string
  created_at: string
}

export async function getCompanies(page: number = 1, limit: number = 10): Promise<{ data: Company[]; total: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  const { data, count, error } = await supabase
    .from("companies")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching companies:", error.message)
    return { data: [], total: 0 }
  }
  return { data: data ?? [], total: count || 0 }
}

export async function getCompanyById(id: string): Promise<Company | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) return null
  return data
}

export async function createCompany(
  formData: Omit<Company, "id" | "created_at" | "tenant_id">
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("companies")
    .insert([{ ...formData, tenant_id: tenantId }])

  if (error) return { error: error.message }
  revalidatePath("/crm/companies")
  return { error: null }
}

export async function updateCompany(
  id: string,
  formData: Partial<Omit<Company, "id" | "created_at" | "tenant_id">>
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("companies")
    .update(formData)
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/crm/companies")
  return { error: null }
}

export async function deleteCompany(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("companies")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) return { error: error.message }
  revalidatePath("/crm/companies")
  return { error: null }
}
