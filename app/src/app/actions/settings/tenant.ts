"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantAdminId, getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export interface TenantAddress {
  street?: string
  city?: string
  state?: string
  country?: string
  postalCode?: string
}

export interface TenantSettings {
  id: string
  name: string
  email: string | null
  phone: string | null
  website: string | null
  address: TenantAddress | any | null
  logo_url: string | null
  currency_code: string
  country_code: string
  gstin?: string
  trn?: string
  settings: any
}

export async function getTenantSettings(): Promise<TenantSettings | null> {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantId()

    if (!tenantId) return null

    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .eq("id", tenantId)
      .single()

    if (error) {
      console.error("Error fetching tenant settings:", error.message)
      return null
    }

    return data as TenantSettings
  } catch (err) {
    console.error("Exception fetching tenant settings:", err)
    return null
  }
}

export async function updateTenantSettings(data: Partial<TenantSettings>): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    const tenantId = await getTenantAdminId()

    if (!tenantId) {
      return { success: false, error: "Authentication required or tenant not identified." }
    }

    const payload: Record<string, any> = {}
    if (data.name !== undefined) payload.name = data.name.trim()
    if (data.email !== undefined) payload.email = data.email?.trim() || null
    if (data.phone !== undefined) payload.phone = data.phone?.trim() || null
    if (data.website !== undefined) payload.website = data.website?.trim() || null
    if (data.logo_url !== undefined) payload.logo_url = data.logo_url || null
    if (data.currency_code !== undefined) payload.currency_code = data.currency_code
    if (data.country_code !== undefined) payload.country_code = data.country_code
    if (data.gstin !== undefined) payload.gstin = data.gstin?.trim() || null
    if (data.address !== undefined) payload.address = data.address
    if (data.settings !== undefined) payload.settings = data.settings

    const { error } = await supabase
      .from("tenants")
      .update(payload)
      .eq("id", tenantId)

    if (error) {
      console.error("Error updating tenant settings:", error.message)
      return { success: false, error: error.message }
    }

    revalidatePath("/settings")
    revalidatePath("/reports")
    revalidatePath("/crm")
    revalidatePath("/sales/invoices")

    return { success: true }
  } catch (err: any) {
    console.error("Exception updating tenant settings:", err)
    return { success: false, error: err.message || "Failed to update settings" }
  }
}
