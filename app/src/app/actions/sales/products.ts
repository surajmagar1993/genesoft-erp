"use server"

import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { fromRow, toRow } from "@/lib/pg-row"
import { isUuid } from "@/lib/utils"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getTenantTaxContext, productTaxRate } from "@/lib/tenant-tax"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "sales" as const

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

/** Form fields → Prisma data; the tax group must be this business's own. */
async function productData(tenantId: string, input: Record<string, unknown>): Promise<Prisma.ProductUncheckedUpdateManyInput> {
  const data = fromRow("Product", toDbRow(input)) as Prisma.ProductUncheckedUpdateManyInput
  if (typeof data.taxGroupId === "string" && !(await prisma.taxGroup.findFirst({ where: { id: data.taxGroupId, tenantId }, select: { id: true } }))) {
    throw new Error("Tax group not found")
  }
  return data
}

/* ── Read All ── */
export async function getProducts(
  page: number = 1, 
  limit: number = 10
): Promise<{ data: ProductDB[]; total: number }> {
  try {
    const tenantId = await getTenantId(MODULE)
    const [rows, total] = await Promise.all([
      prisma.product.findMany({ where: { tenantId }, orderBy: { name: "asc" }, skip: (page - 1) * limit, take: limit }),
      prisma.product.count({ where: { tenantId } }),
    ])
    return { data: rows.map((r) => fromDbRow(toRow("Product", r))), total }
  } catch (err) {
    console.error("getProducts error:", err)
    return { data: [], total: 0 }
  }
}

/* ── Read One ── */
export async function getProductById(id: string): Promise<ProductDB | null> {
  if (!isUuid(id)) return null
  const tenantId = await getTenantId(MODULE)
  const row = await prisma.product.findFirst({ where: { id, tenantId } })
  return row ? fromDbRow(toRow("Product", row)) : null
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
  const tenantId = await getTenantWriterId(MODULE)

  try {
    const data = await productData(tenantId, payload as unknown as Record<string, unknown>)
    const row = await prisma.product.create({ data: { ...(data as Omit<Prisma.ProductUncheckedCreateInput, "tenantId">), tenantId }, select: { id: true } })
    revalidatePath("/sales/products")
    return { id: row.id, error: null }
  } catch (err) {
    console.error("createProduct error:", err)
    return { id: null, error: err instanceof Error ? err.message : "Invalid product" }
  }
}

/* ── Update ── */
export interface UpdateProductPayload extends CreateProductPayload {
  id: string
}

export async function updateProduct(
  payload: UpdateProductPayload
): Promise<{ error: string | null }> {
  const tenantId = await getTenantWriterId(MODULE)
  const { id, ...fields } = payload

  try {
    const data = await productData(tenantId, fields as unknown as Record<string, unknown>)
    const { count } = await prisma.product.updateMany({ where: { id, tenantId }, data })
    if (count === 0) return { error: "Product not found" }
  } catch (err) {
    console.error("updateProduct error:", err)
    return { error: err instanceof Error ? err.message : "Invalid product" }
  }

  revalidatePath("/sales/products")
  revalidatePath(`/sales/products/${id}/edit`)
  return { error: null }
}

/* ── Delete ── */
export async function deleteProduct(id: string): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantManagerId(MODULE)
    const { count } = await prisma.product.deleteMany({ where: { id, tenantId } })
    if (count === 0) return { error: "Product not found" }
  } catch (err) {
    console.error("deleteProduct error:", err)
    if ((err as { code?: string })?.code === "P2003") return { error: "This product is used on invoices, orders or stock records, so it can't be deleted. Mark it inactive instead." }
    return { error: err instanceof Error ? err.message : "Failed to delete product" }
  }

  revalidatePath("/sales/products")
  return { error: null }
}

/* ── Import / Export ── */
export async function exportProducts(limit: number = 1000): Promise<ProductDB[]> {
  const tenantId = await getTenantId(MODULE)
  const rows = await prisma.product.findMany({ where: { tenantId }, orderBy: { name: "asc" }, take: limit })
  return rows.map((r) => fromDbRow(toRow("Product", r)))
}

export async function importProducts(
  products: any[]
): Promise<{ error: string | null; count: number }> {
  const tenantId = await getTenantWriterId(MODULE)

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

  let created: { count: number }
  try {
    created = await prisma.product.createMany({ data: insertData.map((r) => ({ ...(fromRow("Product", r) as Omit<Prisma.ProductCreateManyInput, "tenantId">), tenantId })) })
  } catch (err) {
    console.error("importProducts error:", err)
    return { error: err instanceof Error ? err.message : "Failed to import products", count: 0 }
  }

  revalidatePath("/sales/products")
  return { error: null, count: created.count }
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
  const tenantId = await getTenantId(MODULE)
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
