"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

/* ── Types ── */
export type ProductType = "PRODUCT" | "SERVICE"

export interface ProductDB {
  id: string
  tenant_id: string
  type: ProductType
  name: string
  category: string | null
  brand: string | null
  model_no: string | null
  serial_no: string | null
  sku: string | null
  hsn_sac_code: string | null
  description: string | null
  custom_attributes: any
  unit_price: number
  currency: string
  unit: string
  tax_group_id: string | null
  stock_qty: number
  image_url: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

/* ── Read All ── */
export async function getProducts(): Promise<ProductDB[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true })

  if (error) {
    console.error("getProducts error:", error.message)
    return []
  }
  return data ?? []
}

/* ── Read One ── */
export async function getProductById(id: string): Promise<ProductDB | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) {
    console.error("getProductById error:", error.message)
    return null
  }
  return data
}

/* ── Create ── */
export interface CreateProductPayload {
  type: ProductType
  name: string
  category?: string
  brand?: string
  model_no?: string
  serial_no?: string
  sku?: string
  hsn_sac_code?: string
  description?: string
  unit_price: number
  currency?: string
  unit?: string
  stock_qty?: number
  is_active?: boolean
  custom_attributes?: any
}

export async function createProduct(
  payload: CreateProductPayload
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("products")
    .insert({
      ...payload,
      tenant_id: tenantId,
    })
    .select("id")
    .single()

  if (error) {
    console.error("createProduct error:", error.message)
    return { id: null, error: error.message }
  }

  revalidatePath("/sales/products")
  return { id: data.id, error: null }
}

/* ── Update ── */
export interface UpdateProductPayload extends CreateProductPayload {
  id: string
}

export async function updateProduct(
  payload: UpdateProductPayload
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { id, ...fields } = payload

  const { error } = await supabase
    .from("products")
    .update({
      ...fields,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("updateProduct error:", error.message)
    return { error: error.message }
  }

  revalidatePath("/sales/products")
  revalidatePath(`/sales/products/${id}/edit`)
  return { error: null }
}

/* ── Delete ── */
export async function deleteProduct(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("deleteProduct error:", error.message)
    return { error: error.message }
  }

  revalidatePath("/sales/products")
  return { error: null }
}

/* ── Import / Export ── */
export async function exportProducts(): Promise<ProductDB[]> {
  return getProducts()
}

export async function importProducts(
  products: any[]
): Promise<{ error: string | null; count: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const insertData = products.map(p => ({
    name: p.name || "Unknown Product",
    type: p.type || "PRODUCT",
    unit_price: p.unit_price ? parseFloat(p.unit_price) : 0,
    currency: p.currency || "INR",
    unit: p.unit || "Nos",
    stock_qty: p.stock_qty ? parseFloat(p.stock_qty) : 0,
    is_active: p.is_active !== undefined ? p.is_active : true,
    category: p.category || null,
    brand: p.brand || null,
    sku: p.sku || null,
    hsn_sac_code: p.hsn_sac_code || null,
    description: p.description || null,
    ...p, // override
    tenant_id: tenantId,
  }))

  const { data, error } = await supabase
    .from("products")
    .insert(insertData)
    .select("id")

  if (error) {
    console.error("importProducts error:", error.message)
    return { error: error.message, count: 0 }
  }

  revalidatePath("/sales/products")
  return { error: null, count: data?.length || 0 }
}
