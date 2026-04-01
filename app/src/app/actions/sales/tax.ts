"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export interface TaxRate {
  id: string
  tax_group_id: string
  name: string
  rate: number
  is_active: boolean
}

export interface TaxGroup {
  id: string
  tenant_id: string
  name: string
  country_code: string
  is_default: boolean
  is_active: boolean
  tax_rates?: TaxRate[]
}

export async function getTaxGroups() {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("tax_groups")
    .select("*, tax_rates(*)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching tax groups:", error)
    return []
  }

  return data as TaxGroup[]
}

export async function createTaxGroup(data: {
  name: string
  country_code: string
  is_default: boolean
  rates: { name: string; rate: number }[]
}) {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // 1. Create the Group
  const { data: group, error: groupError } = await supabase
    .from("tax_groups")
    .insert({
      name: data.name,
      country_code: data.country_code,
      is_default: data.is_default,
      tenant_id: tenantId,
    })
    .select()
    .single()

  if (groupError) throw new Error(groupError.message)

  // 2. Create the Rates
  if (data.rates.length > 0) {
    const { error: ratesError } = await supabase
      .from("tax_rates")
      .insert(
        data.rates.map((r) => ({
          tax_group_id: group.id,
          name: r.name,
          rate: r.rate,
        }))
      )

    if (ratesError) throw new Error(ratesError.message)
  }

  revalidatePath("/settings")
  return group
}

export async function deleteTaxGroup(id: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from("tax_groups")
    .delete()
    .eq("id", id)

  if (error) throw new Error(error.message)
  revalidatePath("/settings")
}
