"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { stamped } from "@/lib/db-row"
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
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  let query = supabase
    .from("sales_orders")
    .select("*, sales_order_items(*)", { count: "exact" })
    .eq("tenant_id", tenantId)

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  if (filters?.search) {
    query = query.or(`order_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`)
  }

  const { data, count, error } = await query
    .range(offset, offset + limit - 1)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getOrders error:", error.message)
    return { data: [], total: 0 }
  }
  return { data: data ?? [], total: count || 0 }
}

/* ── Read One ── */
export async function getOrderById(id: string): Promise<SalesOrderDB | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("sales_orders")
    .select("*, sales_order_items(*)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) {
    console.error("getOrderById error:", error.message)
    return null
  }

  return data
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

export async function createOrder(
  payload: CreateOrderPayload
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantWriterId()

  const { line_items, ...headerFields } = payload

  // Calculate Totals
  let subtotal = 0
  let taxAmount = 0
  const processedItems = line_items.map((item) => {
    const itemTotal = item.qty * item.unit_price
    const itemTax = itemTotal * (item.tax_percent / 100)
    subtotal += itemTotal
    taxAmount += itemTax
    return {
      ...item,
      line_total: itemTotal,
    }
  })

  const discountVal = headerFields.discount_type === "PERCENT" 
    ? subtotal * (headerFields.discount / 100) 
    : headerFields.discount
  
  const grandTotal = subtotal + taxAmount - discountVal

  // Insert header
  const { data: order, error: headerError } = await supabase
    .from("sales_orders")
    .insert(stamped({
      ...headerFields,
      subtotal,
      tax_amount: taxAmount,
      total: grandTotal,
      tenant_id: tenantId,
      currency_code: await tenantCurrency(tenantId),
      expected_date: headerFields.expected_date || null,
      quote_id: headerFields.quote_id || null,
    }))
    .select("id")
    .single()

  if (headerError || !order) {
    console.error("createOrder header error:", headerError?.message)
    return { id: null, error: headerError?.message ?? "Failed to create order" }
  }

  // Insert line items
  if (processedItems.length > 0) {
    const { error: itemsError } = await supabase.from("sales_order_items").insert(
      processedItems.map((li) => ({
        ...li,
        order_id: order.id,
      }))
    )
    if (itemsError) {
      console.error("createOrder items error:", itemsError.message)
      return { id: null, error: itemsError.message }
    }
  }

  revalidatePath("/sales/orders")
  return { id: order.id, error: null }
}

/* ── Update ── */
export interface UpdateOrderPayload extends CreateOrderPayload {
  id: string
}

export async function updateOrder(
  payload: UpdateOrderPayload
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantWriterId()

  const { id, line_items, ...headerFields } = payload

  // Recalculate totals
  let subtotal = 0
  let taxAmount = 0
  const processedItems = line_items.map((item) => {
    const itemTotal = item.qty * item.unit_price
    const itemTax = itemTotal * (item.tax_percent / 100)
    subtotal += itemTotal
    taxAmount += itemTax
    return {
        product_name: item.product_name,
        description: item.description,
        qty: item.qty,
        unit_price: item.unit_price,
        tax_percent: item.tax_percent,
        line_total: itemTotal,
    }
  })

  const discountVal = headerFields.discount_type === "PERCENT" 
    ? subtotal * (headerFields.discount / 100) 
    : headerFields.discount
  
  const grandTotal = subtotal + taxAmount - discountVal

  // Update header
  const { error: headerError } = await supabase
    .from("sales_orders")
    .update({
      ...headerFields,
      currency_code: await tenantCurrency(tenantId),
      subtotal,
      tax_amount: taxAmount,
      total: grandTotal,
      expected_date: headerFields.expected_date || null,
      quote_id: headerFields.quote_id || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (headerError) {
    console.error("updateOrder header error:", headerError.message)
    return { error: headerError.message }
  }

  // Replace all line items: delete old → insert new
  const { error: deleteError } = await supabase
    .from("sales_order_items")
    .delete()
    .eq("order_id", id)

  if (deleteError) {
    console.error("updateOrder delete items error:", deleteError.message)
    return { error: deleteError.message }
  }

  if (processedItems.length > 0) {
    const { error: insertError } = await supabase.from("sales_order_items").insert(
      processedItems.map((li) => ({
        ...li,
        order_id: id,
      }))
    )
    if (insertError) {
      console.error("updateOrder insert items error:", insertError.message)
      return { error: insertError.message }
    }
  }

  revalidatePath("/sales/orders")
  revalidatePath(`/sales/orders/${id}/edit`)
  revalidatePath(`/sales/orders/${id}`)
  return { error: null }
}

/* ── Delete ── */
export async function deleteOrder(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantManagerId()

  const { error } = await supabase
    .from("sales_orders")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("deleteOrder error:", error.message)
    return { error: error.message }
  }

  revalidatePath("/sales/orders")
  return { error: null }
}

/* ── Convert Quote to Order ── */
export async function convertQuoteToOrder(quoteId: string): Promise<{ orderId: string | null; error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantWriterId()

  // 1. Fetch the quote
  const { data: quote, error: quoteError } = await supabase
    .from("quotes")
    .select("*, quote_items(*)")
    .eq("id", quoteId)
    .eq("tenant_id", tenantId)
    .single()

  if (quoteError || !quote) {
    return { orderId: null, error: quoteError?.message || "Quote not found" }
  }

  // 2. Map payload
  const line_items = quote.quote_items.map((item: any) => ({
    product_name: item.product_name,
    description: item.description,
    qty: item.qty,
    unit_price: item.unit_price,
    tax_percent: item.tax_percent,
  }))

  const payload: CreateOrderPayload = {
    order_number: `ORD-${Date.now()}`, // Temporary sequential ID - would ideally be sequence-based
    customer_name: quote.customer_name,
    customer_email: quote.customer_email,
    order_date: new Date().toISOString().split("T")[0],
    reference: quote.quote_number, // Use quote number as reference
    status: "DRAFT",
    discount: quote.discount,
    discount_type: quote.discount_type,
    notes: quote.notes,
    terms_and_conditions: quote.terms_and_conditions,
    contact_id: quote.contact_id,
    quote_id: quote.id,
    currency_code: quote.currency_code || (await tenantCurrency(tenantId)),
    line_items,
  }

  // 3. Create the order
  const result = await createOrder(payload)
  
  // 4. Update the quote status to ACCEPTED
  if (result.id && !result.error) {
    await supabase
      .from("quotes")
      .update({ status: "ACCEPTED", updated_at: new Date().toISOString() })
      .eq("id", quoteId)
      .eq("tenant_id", tenantId)
    
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
        contactId: order.contactId,
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
