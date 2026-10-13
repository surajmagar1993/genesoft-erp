"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
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
  state?: string
  country?: string
  country_code?: string
  gstin?: string
  employee_count?: number
  annual_revenue?: number
  is_active: boolean
  tenant_id: string
  created_at: string
}

export async function getCompanies(
  page: number = 1,
  limit: number = 10,
  search?: string
): Promise<{ data: Company[]; total: number }> {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantId()
    const offset = (page - 1) * limit

    let query = supabase
      .from("companies")
      .select("*", { count: "exact" })
      .eq("tenant_id", tenantId)

    if (search) {
      query = query.or(`name.ilike.%${search}%,industry.ilike.%${search}%,email.ilike.%${search}%`)
    }

    const { data, count, error } = await query
      .range(offset, offset + limit - 1)
      .order("created_at", { ascending: false })

    if (error) {
      console.error("Error fetching companies:", error.message)
      return { data: [], total: 0 }
    }
    return { data: (data as Company[]) ?? [], total: count || 0 }
  } catch (err: any) {
    console.error("Exception fetching companies:", err)
    return { data: [], total: 0 }
  }
}

export async function getCompanyById(id: string): Promise<Company | null> {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantId()

    const { data, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single()

    if (error) return null
    return data as Company
  } catch {
    return null
  }
}

export async function createCompany(
  formData: Omit<Company, "id" | "created_at" | "tenant_id">
): Promise<{ error: string | null; data?: Company }> {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantWriterId()

    if (!tenantId) {
      return { error: "Authentication required or tenant not identified." }
    }

    if (!formData.name?.trim()) {
      return { error: "Company name is required." }
    }

    const payload = {
      name: formData.name.trim(),
      industry: formData.industry || null,
      website: formData.website || null,
      phone: formData.phone || null,
      email: formData.email || null,
      address: formData.address || null,
      city: formData.city || null,
      state: formData.state || null,
      country: formData.country || null,
      country_code: formData.country_code || "IN",
      gstin: formData.gstin || null,
      employee_count: formData.employee_count ? Number(formData.employee_count) : null,
      annual_revenue: formData.annual_revenue ? Number(formData.annual_revenue) : null,
      is_active: formData.is_active ?? true,
      tenant_id: tenantId,
    }

    const { data, error } = await supabase
      .from("companies")
      .insert([payload])
      .select()
      .single()

    if (error) {
      console.error("Error creating company:", error)
      return { error: error.message }
    }

    revalidatePath("/crm/companies")
    return { error: null, data: data as Company }
  } catch (err: any) {
    console.error("Exception in createCompany:", err)
    return { error: err.message || "Failed to create company" }
  }
}

export async function updateCompany(
  id: string,
  formData: Partial<Omit<Company, "id" | "created_at" | "tenant_id">>
): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantWriterId()

    if (!tenantId) {
      return { error: "Authentication required or tenant not identified." }
    }

    const payload: Record<string, any> = { ...formData }
    if (payload.name) payload.name = payload.name.trim()
    if (payload.employee_count !== undefined) {
      payload.employee_count = payload.employee_count ? Number(payload.employee_count) : null
    }
    if (payload.annual_revenue !== undefined) {
      payload.annual_revenue = payload.annual_revenue ? Number(payload.annual_revenue) : null
    }

    const { error } = await supabase
      .from("companies")
      .update(payload)
      .eq("id", id)
      .eq("tenant_id", tenantId)

    if (error) {
      console.error("Error updating company:", error)
      return { error: error.message }
    }

    revalidatePath("/crm/companies")
    return { error: null }
  } catch (err: any) {
    console.error("Exception in updateCompany:", err)
    return { error: err.message || "Failed to update company" }
  }
}

export async function deleteCompany(id: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantManagerId()

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId)

    if (error) return { error: error.message }
    revalidatePath("/crm/companies")
    return { error: null }
  } catch (err: any) {
    return { error: err.message || "Failed to delete company" }
  }
}

export interface CompanyRelationsData {
  company: Company | null
  contacts: any[]
  deals: any[]
  metrics: {
    totalContacts: number
    totalDeals: number
    activePipelineValue: number
    closedWonRevenue: number
  }
}

export async function getCompanyWithRelations(id: string): Promise<CompanyRelationsData> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data: company, error } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error || !company) {
    return {
      company: null,
      contacts: [],
      deals: [],
      metrics: { totalContacts: 0, totalDeals: 0, activePipelineValue: 0, closedWonRevenue: 0 }
    }
  }

  const [contactsRes, dealsRes] = await Promise.all([
    supabase
      .from("contacts")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("company_name", company.name)
      .order("created_at", { ascending: false }),
    supabase
      .from("deals")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("company", company.name)
      .order("created_at", { ascending: false })
  ])

  const contacts = contactsRes.data ?? []
  const deals = dealsRes.data ?? []

  const activePipelineValue = deals
    .filter((d: any) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage))
    .reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0)

  const closedWonRevenue = deals
    .filter((d: any) => d.stage === "CLOSED_WON")
    .reduce((sum: number, d: any) => sum + (Number(d.value) || 0), 0)

  return {
    company,
    contacts,
    deals,
    metrics: {
      totalContacts: contacts.length,
      totalDeals: deals.length,
      activePipelineValue,
      closedWonRevenue
    }
  }
}
