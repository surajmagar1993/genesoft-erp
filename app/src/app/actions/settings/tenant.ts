"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export interface TenantSettings {
  id: string
  name: string
  email: string | null
  phone: string | null
  website: string | null
  address: any | null
  logo_url: string | null
  currency_code: string
  country_code: string
  gstin?: string
  trn?: string
  settings: any
}

export async function getTenantSettings() {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("tenants")
    .select("*")
    .eq("id", tenantId)
    .single()

  if (error) {
    console.error("Error fetching tenant settings:", error)
    return null
  }

  return data as TenantSettings
}

export async function updateTenantSettings(data: Partial<TenantSettings>) {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("tenants")
    .update(data)
    .eq("id", tenantId)

  if (error) throw new Error(error.message)

  revalidatePath("/settings")
  revalidatePath("/reports") // Stats might depend on currency
}
