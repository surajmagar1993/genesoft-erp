"use server"

import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { fromRow, toRow, toRows } from "@/lib/pg-row"
import { documentTotals } from "@/lib/document-totals"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { isUuid } from "@/lib/utils"
import type { Prisma } from "@prisma/client"
import { nextSequence } from "@/lib/sequence"

/** Documents are always in the business's own currency (never a browser-sent or "INR" default). */
async function tenantCurrency(tenantId: string): Promise<string> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } })
  return t?.currencyCode || "INR"
}
import { prisma } from "@/lib/prisma"

/* ── Types ── */
export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"

export interface QuoteLineItemDB {
  id: string
  quote_id: string
  product_name: string
  description: string | null
  qty: number
  unit_price: number
  tax_percent: number
  line_total: number
}

export interface QuoteDB {
  id: string
  quote_number: string
  customer_name: string
  customer_email: string
  quote_date: string
  valid_until: string | null
  reference: string | null
  status: QuoteStatus
  subtotal: number
  tax_amount: number
  discount: number
  discount_type: "PERCENT" | "FIXED"
  total: number
  notes: string | null
  terms_and_conditions: string | null
  tenant_id: string
  contact_id: string | null
  currency_code: string
  created_at: string
  updated_at: string
  quote_items?: QuoteLineItemDB[]
}

/* ── Read All ── */
export async function getQuotes(
    page: number = 1, 
    limit: number = 10,
    filters?: { status?: QuoteStatus; search?: string }
) {
  try {
    const tenantId = await getTenantId()
    const q = filters?.search?.trim()
    const where: Prisma.QuoteWhereInput = {
      tenantId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(q ? { OR: [{ quoteNumber: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }] } : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.quote.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.quote.count({ where }),
    ])
    return { data: rows.map((r) => ({ ...toRow<QuoteDB>("Quote", r), quoteItem: toRows<QuoteLineItemDB>("QuoteItem", r.items) })), total }
  } catch (err) {
    console.error("getQuotes error:", err)
    return { data: [], total: 0 }
  }
}

/* ── Read One ── */
export async function getQuoteById(id: string): Promise<QuoteDB | null> {
  if (!isUuid(id)) return null
  const tenantId = await getTenantId()
  const row = await prisma.quote.findFirst({ where: { id, tenantId }, include: { items: true } })
  return row ? { ...toRow<QuoteDB>("Quote", row), quote_items: toRows<QuoteLineItemDB>("QuoteItem", row.items) } : null
}

/* ── Create ── */
export interface CreateQuotePayload {
  quote_number: string
  customer_name: string
  customer_email: string
  quote_date: string
  valid_until?: string
  reference?: string
  status: QuoteStatus
  discount: number
  discount_type: "PERCENT" | "FIXED"
  notes?: string
  terms_and_conditions?: string
  contact_id?: string | null
  currency_code: string
  line_items: Array<{
    product_name: string
    description?: string
    qty: number
    unit_price: number
    tax_percent: number
  }>
}

/** Header fields and line items, with totals worked out on the server. */
async function quoteData(tenantId: string, payload: Omit<CreateQuotePayload, "currency_code"> & { currency_code?: string }) {
  const { line_items, ...headerFields } = payload
  const { items, subtotal, taxAmount, total } = documentTotals(line_items, headerFields.discount, headerFields.discount_type)
  const header = fromRow("Quote", {
    ...headerFields,
    subtotal,
    tax_amount: taxAmount,
    total,
    currency_code: await tenantCurrency(tenantId),
    valid_until: headerFields.valid_until || null,
  }) as Omit<Prisma.QuoteUncheckedCreateInput, "tenantId">
  await assertTenantRefs(tenantId, { contact: header.contactId })
  return { header, items: items.map((li) => fromRow("QuoteItem", li) as Omit<Prisma.QuoteItemCreateManyInput, "quoteId">) }
}

export async function createQuote(
  payload: CreateQuotePayload
): Promise<{ id: string | null; error: string | null }> {
  try {
    const tenantId = await getTenantWriterId()
    const { header, items } = await quoteData(tenantId, payload)
    const quote = await prisma.quote.create({ data: { ...header, tenantId, items: { create: items } }, select: { id: true } })
    revalidatePath("/sales/quotes")
    return { id: quote.id, error: null }
  } catch (err) {
    console.error("createQuote error:", err)
    return { id: null, error: err instanceof Error ? err.message : "Failed to create quote" }
  }
}

/* ── Update ── */
export interface UpdateQuotePayload extends CreateQuotePayload {
  id: string
}

export async function updateQuote(
  payload: UpdateQuotePayload
): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantWriterId()
    const { id, ...fields } = payload
    const { header, items } = await quoteData(tenantId, fields)

    // Header and lines together; nothing changes unless the quote is this business's
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.quote.updateMany({ where: { id, tenantId }, data: header })
      if (count === 0) throw new Error("Quote not found")
      await tx.quoteItem.deleteMany({ where: { quoteId: id } })
      if (items.length > 0) await tx.quoteItem.createMany({ data: items.map((li) => ({ ...li, quoteId: id })) })
    })

    revalidatePath("/sales/quotes")
    revalidatePath(`/sales/quotes/${id}/edit`)
    return { error: null }
  } catch (err) {
    console.error("updateQuote error:", err)
    return { error: err instanceof Error ? err.message : "Failed to update quote" }
  }
}

/* ── Delete ── */
export async function deleteQuote(id: string): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantManagerId()
    const { count } = await prisma.quote.deleteMany({ where: { id, tenantId } })
    if (count === 0) return { error: "Quote not found" }
  } catch (err) {
    console.error("deleteQuote error:", err)
    if ((err as { code?: string })?.code === "P2003") return { error: "This quote has been turned into a sales order, so it can't be deleted." }
    return { error: err instanceof Error ? err.message : "Failed to delete quote" }
  }

  revalidatePath("/sales/quotes")
  return { error: null }
}

/** The next quote number (QT-2026-0001…) for the new-quote form. */
export async function getNextQuoteNumber(): Promise<string> {
  const tenantId = await getTenantId()
  return nextSequence(prisma, "quote", tenantId, `QT-${new Date().getFullYear()}-`)
}
