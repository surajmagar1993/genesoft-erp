"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { stamped } from "@/lib/db-row"
import { prisma } from "@/lib/prisma"
import { getTenantTaxContext, productTaxRate } from "@/lib/tenant-tax"

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


/*
 * The live products table names its price column "unitPrice" (camelCase),
 * while the screens use unit_price. Translate only here, at the database edge.
 */
const WRITABLE_COLUMNS = [
  "type", "name", "category", "brand", "model_no", "serial_no", "sku", "hsn_sac_code", "description",
  "currency", "unit", "stock_qty", "is_active", "custom_attributes", "tax_group_id",
] as const

function toDbRow(input: Record<string, unknown>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  for (const key of WRITABLE_COLUMNS) if (input[key] !== undefined) row[key] = input[key]
  if (input.unit_price !== undefined) {
    const price = Number(input.unit_price)
    if (!Number.isFinite(price) || price < 0) throw new Error("Unit price must be zero or more")
    row.unitPrice = price
  }
  if (row.type !== undefined && row.type !== "PRODUCT" && row.type !== "SERVICE") throw new Error("Type must be PRODUCT or SERVICE")
  if (row.name !== undefined && !String(row.name).trim()) throw new Error("Product name is required")
  return row
}

function fromDbRow<T extends Record<string, unknown>>(row: T): ProductDB {
  const { unitPrice, ...rest } = row as T & { unitPrice?: unknown }
  return { ...(rest as unknown as ProductDB), unit_price: Number(unitPrice ?? (row as { unit_price?: unknown }).unit_price ?? 0) }
}

/* ── Read All ── */
export async function getProducts(
  page: number = 1, 
  limit: number = 10
): Promise<{ data: ProductDB[]; total: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, count, error } = await supabase
    .from("products")
    .select("*", { count: "exact" })
    .eq("tenant_id", tenantId)
    .range((page - 1) * limit, page * limit - 1)
    .order("name", { ascending: true })

  if (error) {
    console.error("getProducts error:", error.message)
    return { data: [], total: 0 }
  }
  return { data: (data ?? []).map(fromDbRow), total: count || 0 }
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
  return data ? fromDbRow(data) : null
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
  tax_group_id?: string | null
}

export async function createProduct(
  payload: CreateProductPayload
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantWriterId()

  let row: Record<string, unknown>
  try {
    row = toDbRow(payload as unknown as Record<string, unknown>)
  } catch (err) {
    return { id: null, error: err instanceof Error ? err.message : "Invalid product" }
  }
  const { data, error } = await supabase
    .from("products")
    .insert(stamped({
      ...row,
      tenant_id: tenantId,
    }))
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
  const tenantId = await getTenantWriterId()

  const { id, ...fields } = payload
  let row: Record<string, unknown>
  try {
    row = toDbRow(fields as unknown as Record<string, unknown>)
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid product" }
  }

  const { error } = await supabase
    .from("products")
    .update({
      ...row,
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
  const tenantId = await getTenantManagerId()

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
export async function exportProducts(limit: number = 1000): Promise<ProductDB[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .eq("tenant_id", tenantId)
    .limit(limit)
    .order("name", { ascending: true })

  if (error) {
    console.error("exportProducts error:", error.message)
    return []
  }
  return (data ?? []).map(fromDbRow)
}

export async function importProducts(
  products: any[]
): Promise<{ error: string | null; count: number }> {
  const supabase = await createClient()
  const tenantId = await getTenantWriterId()

  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } })
  let insertData: Record<string, unknown>[]
  try {
    if (!Array.isArray(products) || products.length === 0) throw new Error("The file has no products")
    if (products.length > 5000) throw new Error("Import up to 5,000 products at a time")
    insertData = products.map((p, i) => {
      try {
        // Only real product columns are imported; anything else in the file is ignored
        return {
          ...toDbRow({
            ...p,
            name: p.name || "Unknown Product",
            type: String(p.type || "PRODUCT").toUpperCase(),
            unit_price: p.unit_price ?? p.unitPrice ?? 0,
            currency: p.currency || tenant?.currencyCode || "INR",
            unit: p.unit || "Nos",
            stock_qty: p.stock_qty !== undefined && p.stock_qty !== "" ? parseFloat(p.stock_qty) || 0 : 0,
            is_active: p.is_active === undefined || p.is_active === "" ? true : p.is_active === true || p.is_active === "true",
          }),
          tenant_id: tenantId,
        }
      } catch (err) {
        throw new Error(`Row ${i + 1}: ${err instanceof Error ? err.message : "invalid"}`)
      }
    })
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Invalid file", count: 0 }
  }

  const { data, error } = await supabase
    .from("products")
    .insert(insertData.map(stamped))
    .select("id")

  if (error) {
    console.error("importProducts error:", error.message)
    return { error: error.message, count: 0 }
  }

  revalidatePath("/sales/products")
  return { error: null, count: data?.length || 0 }
}

/* ── For document forms (invoice line picker) ── */
export interface DocumentProduct {
  id: string
  name: string
  type: ProductType
  unitPrice: number
  hsnSacCode: string
  /** Tax rate from the product's tax group, else the business's standard rate */
  taxRate: number
  unit: string
  stockQty: number
}

export async function getProductsForDocuments(): Promise<DocumentProduct[]> {
  const tenantId = await getTenantId()
  const defaultRate = (await getTenantTaxContext(tenantId)).regime.defaultRate
  const rows = await prisma.product.findMany({
    where: { tenantId, isActive: true },
    select: { id: true, name: true, type: true, unitPrice: true, hsnSacCode: true, unit: true, stockQty: true, taxGroup: { select: { taxRates: { select: { name: true, rate: true, isActive: true } } } } },
    orderBy: { name: "asc" },
    take: 1000,
  })
  return rows.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    unitPrice: Number(p.unitPrice || 0),
    hsnSacCode: p.hsnSacCode || "",
    taxRate: productTaxRate(p.taxGroup as never, defaultRate),
    unit: p.unit || "",
    stockQty: Number(p.stockQty || 0),
  }))
}
