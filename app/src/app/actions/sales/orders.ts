"use server"

import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { fromRow, toRow, toRows } from "@/lib/pg-row"
import { documentTotals } from "@/lib/document-totals"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { isUuid } from "@/lib/utils"
import type { Prisma } from "@prisma/client"
import { nextSequence } from "@/lib/sequence"
import { buildInvoiceLines, contactPlaceOfSupply } from "@/lib/invoice-lines"
import { nextInvoiceNumber } from "@/lib/invoice-number"

/** Documents are always in the business's own currency (never a browser-sent or "INR" default). */
async function tenantCurrency(tenantId: string): Promise<string> {
  const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } })
  return t?.currencyCode || "INR"
}
import { prisma } from "@/lib/prisma"

/* ── Types ── */
export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"

export interface SalesOrderLineItemDB {
  id: string
  order_id: string
  product_name: string
  description: string | null
  qty: number
  unit_price: number
  tax_percent: number
  line_total: number
}

export interface SalesOrderDB {
  id: string
  order_number: string
  customer_name: string
  customer_email: string
  order_date: string
  expected_date: string | null
  reference: string | null
  status: SalesOrderStatus
  subtotal: number
  tax_amount: number
  discount: number
  discount_type: "PERCENT" | "FIXED"
  total: number
  notes: string | null
  terms_and_conditions: string | null
  tenant_id: string
  contact_id: string | null
  quote_id: string | null
  currency_code: string
  created_at: string
  updated_at: string
  sales_order_items?: SalesOrderLineItemDB[]
}

/* ── Read All ── */
export async function getOrders(
    page: number = 1, 
    limit: number = 10,
    filters?: { status?: SalesOrderStatus; search?: string }
): Promise<{ data: SalesOrderDB[]; total: number }> {
  try {
    const tenantId = await getTenantId()
    const q = filters?.search?.trim()
    const where: Prisma.SalesOrderWhereInput = {
      tenantId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(q ? { OR: [{ orderNumber: { contains: q, mode: "insensitive" } }, { customerName: { contains: q, mode: "insensitive" } }] } : {}),
    }
    const [rows, total] = await Promise.all([
      prisma.salesOrder.findMany({ where, include: { items: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * limit, take: limit }),
      prisma.salesOrder.count({ where }),
    ])
    return { data: rows.map(orderRow), total }
  } catch (err) {
    console.error("getOrders error:", err)
    return { data: [], total: 0 }
  }
}

function orderRow(r: Prisma.SalesOrderGetPayload<{ include: { items: true } }>): SalesOrderDB {
  return { ...toRow<SalesOrderDB>("SalesOrder", r), sales_order_items: toRows<SalesOrderLineItemDB>("SalesOrderItem", r.items) }
}

/* ── Read One ── */
export async function getOrderById(id: string): Promise<SalesOrderDB | null> {
  if (!isUuid(id)) return null
  const tenantId = await getTenantId()
  const row = await prisma.salesOrder.findFirst({ where: { id, tenantId }, include: { items: true } })
  return row ? orderRow(row) : null
}

/* ── Create ── */
export interface CreateOrderPayload {
  order_number: string
  customer_name: string
  customer_email: string
  order_date: string
  expected_date?: string
  reference?: string
  status: SalesOrderStatus
  discount: number
  discount_type: "PERCENT" | "FIXED"
  notes?: string
  terms_and_conditions?: string
  contact_id?: string | null
  quote_id?: string | null
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
async function orderData(tenantId: string, payload: Omit<CreateOrderPayload, "currency_code"> & { currency_code?: string }) {
  const { line_items, ...headerFields } = payload
  const { items, subtotal, taxAmount, total } = documentTotals(line_items, headerFields.discount, headerFields.discount_type)
  const header = fromRow("SalesOrder", {
    ...headerFields,
    subtotal,
    tax_amount: taxAmount,
    total,
    currency_code: await tenantCurrency(tenantId),
    expected_date: headerFields.expected_date || null,
  }) as Omit<Prisma.SalesOrderUncheckedCreateInput, "tenantId">
  await assertTenantRefs(tenantId, { contact: header.contactId, quote: header.quoteId })
  return { header, items: items.map((li) => fromRow("SalesOrderItem", li) as Omit<Prisma.SalesOrderItemCreateManyInput, "orderId">) }
}

export async function createOrder(
  payload: CreateOrderPayload
): Promise<{ id: string | null; error: string | null }> {
  try {
    const tenantId = await getTenantWriterId()
    const { header, items } = await orderData(tenantId, payload)
    const order = await prisma.salesOrder.create({ data: { ...header, tenantId, items: { create: items } }, select: { id: true } })
    revalidatePath("/sales/orders")
    return { id: order.id, error: null }
  } catch (err) {
    console.error("createOrder error:", err)
    return { id: null, error: err instanceof Error ? err.message : "Failed to create order" }
  }
}

/* ── Update ── */
export interface UpdateOrderPayload extends CreateOrderPayload {
  id: string
}

export async function updateOrder(
  payload: UpdateOrderPayload
): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantWriterId()
    const { id, ...fields } = payload
    const { header, items } = await orderData(tenantId, fields)

    // Header and lines together; nothing changes unless the order is this business's
    await prisma.$transaction(async (tx) => {
      const { count } = await tx.salesOrder.updateMany({ where: { id, tenantId }, data: header })
      if (count === 0) throw new Error("Order not found")
      await tx.salesOrderItem.deleteMany({ where: { orderId: id } })
      if (items.length > 0) await tx.salesOrderItem.createMany({ data: items.map((li) => ({ ...li, orderId: id })) })
    })

    revalidatePath("/sales/orders")
    revalidatePath(`/sales/orders/${id}/edit`)
    return { error: null }
  } catch (err) {
    console.error("updateOrder error:", err)
    return { error: err instanceof Error ? err.message : "Failed to update order" }
  }
}

/* ── Delete ── */
export async function deleteOrder(id: string): Promise<{ error: string | null }> {
  try {
    const tenantId = await getTenantManagerId()
    const { count } = await prisma.salesOrder.deleteMany({ where: { id, tenantId } })
    if (count === 0) return { error: "Order not found" }
  } catch (err) {
    console.error("deleteOrder error:", err)
    if ((err as { code?: string })?.code === "P2003") return { error: "This order has been invoiced or delivered, so it can't be deleted. Cancel it instead." }
    return { error: err instanceof Error ? err.message : "Failed to delete order" }
  }

  revalidatePath("/sales/orders")
  return { error: null }
}

/* ── Convert Quote to Order ── */
export async function convertQuoteToOrder(quoteId: string): Promise<{ orderId: string | null; error: string | null }> {
  const tenantId = await getTenantWriterId()

  // 1. Fetch the quote
  const quote = isUuid(quoteId) ? await prisma.quote.findFirst({ where: { id: quoteId, tenantId }, include: { items: true } }) : null
  if (!quote) return { orderId: null, error: "Quote not found" }

  // 2. Map payload
  const payload: CreateOrderPayload = {
    order_number: await nextSequence(prisma, "salesOrder", tenantId, `SO-${new Date().getFullYear()}-`),
    customer_name: quote.customerName,
    customer_email: quote.customerEmail,
    order_date: new Date().toISOString().split("T")[0],
    reference: quote.quoteNumber, // Use quote number as reference
    status: "DRAFT",
    discount: Number(quote.discount),
    discount_type: quote.discountType,
    notes: quote.notes ?? undefined,
    terms_and_conditions: quote.termsAndConditions ?? undefined,
    contact_id: quote.contactId,
    quote_id: quote.id,
    currency_code: quote.currencyCode || (await tenantCurrency(tenantId)),
    line_items: quote.items.map((item) => ({
      product_name: item.productName,
      description: item.description ?? undefined,
      qty: Number(item.qty),
      unit_price: Number(item.unitPrice),
      tax_percent: Number(item.taxPercent),
    })),
  }

  // 3. Create the order
  const result = await createOrder(payload)

  // 4. Update the quote status to ACCEPTED
  if (result.id && !result.error) {
    await prisma.quote.updateMany({ where: { id: quoteId, tenantId }, data: { status: "ACCEPTED" } })
    revalidatePath("/sales/quotes")
  }

  return { orderId: result.id, error: result.error }
}

/**
 * Turns a sales order into a DRAFT invoice (tax from the business's rules,
 * the normal invoice number) for review; it reaches the ledger and stock
 * when it is sent. An order can be invoiced once.
 */
export async function convertOrderToInvoice(orderId: string): Promise<{ invoiceId: string | null; error: string | null }> {
  const tenantId = await getTenantWriterId()
  try {
    const order = await prisma.salesOrder.findFirst({
      where: { id: orderId, tenantId },
      include: { items: true, contact: { select: { displayName: true, email: true, gstin: true, billingAddress: true } } },
    })
    if (!order) return { invoiceId: null, error: "Sales order not found" }
    if (order.status === "CANCELLED") return { invoiceId: null, error: "This order is cancelled" }
    if (!order.contactId) return { invoiceId: null, error: "Choose a customer on the order first" }
    const contactId = order.contactId
    const already = await prisma.invoice.findFirst({ where: { tenantId, billTo: { path: ["salesOrderId"], equals: order.id } }, select: { invoiceNumber: true } })
    if (already) return { invoiceId: null, error: `Already invoiced as ${already.invoiceNumber}` }

    const built = await buildInvoiceLines(
      tenantId,
      (order.items as { productName: string; description: string | null; qty: unknown; unitPrice: unknown; taxPercent: unknown }[]).map((li) => ({
        description: li.description?.trim() ? `${li.productName} — ${li.description}` : li.productName,
        quantity: Number(li.qty),
        unitPrice: Number(li.unitPrice),
        taxRate: Number(li.taxPercent ?? 0),
      })),
      contactPlaceOfSupply(order.contact)
    )
    const discount = order.discountType === "PERCENT" ? Math.round(built.subtotal * Number(order.discount || 0)) / 100 : Number(order.discount || 0)
    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        contactId,
        invoiceNumber: await nextInvoiceNumber(tenantId),
        type: "TAX_INVOICE",
        status: "DRAFT",
        invoiceDate: new Date(),
        billTo: {
          name: order.contact?.displayName || order.customerName,
          email: order.contact?.email || order.customerEmail || "",
          gstin: order.contact?.gstin || null,
          address: order.contact?.billingAddress || null,
          reference: order.orderNumber,
          salesOrderId: order.id,
        },
        placeOfSupply: contactPlaceOfSupply(order.contact),
        subtotal: built.subtotal,
        taxAmount: built.taxAmount,
        discount,
        total: Math.round((built.total - discount) * 100) / 100,
        currencyCode: built.currencyCode,
        notes: order.notes || `From sales order ${order.orderNumber}`,
        terms: order.termsAndConditions || null,
        items: { create: built.items },
      },
      select: { id: true },
    })
    revalidatePath("/sales/invoices")
    revalidatePath("/sales/orders")
    return { invoiceId: invoice.id, error: null }
  } catch (err) {
    return { invoiceId: null, error: err instanceof Error ? err.message : "Couldn't create the invoice" }
  }
}

/** The next sales order number (SO-2026-0001…) for the new-order form. */
export async function getNextOrderNumber(): Promise<string> {
  const tenantId = await getTenantId()
  return nextSequence(prisma, "salesOrder", tenantId, `SO-${new Date().getFullYear()}-`)
}
