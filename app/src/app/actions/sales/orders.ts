"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

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
  created_at: string
  updated_at: string
  sales_order_items?: SalesOrderLineItemDB[]
}

/* ── Read All ── */
export async function getOrders(): Promise<SalesOrderDB[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("sales_orders")
    .select("*, sales_order_items(*)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getOrders error:", error.message)
    return []
  }
  return data ?? []
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
  const tenantId = await getTenantId()

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
    .insert({
      ...headerFields,
      subtotal,
      tax_amount: taxAmount,
      total: grandTotal,
      tenant_id: tenantId,
      expected_date: headerFields.expected_date || null,
      quote_id: headerFields.quote_id || null,
    })
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
  const tenantId = await getTenantId()

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
  const tenantId = await getTenantId()

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
  const tenantId = await getTenantId()

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
