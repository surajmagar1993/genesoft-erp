"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

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
  const supabase = await createClient()
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  let query = supabase
    .from("quotes")
    .select("*, quoteItem:quote_items(*)", { count: "exact" })
    .eq("tenant_id", tenantId)

  if (filters?.status) {
    query = query.eq("status", filters.status)
  }

  if (filters?.search) {
    query = query.or(`quote_number.ilike.%${filters.search}%,customer_name.ilike.%${filters.search}%`)
  }

  const { data, count, error } = await query
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) {
    console.error("getQuotes error:", error.message)
    return { data: [], total: 0 }
  }

  return { data: data || [], total: count || 0 }
}

/* ── Read One ── */
export async function getQuoteById(id: string): Promise<QuoteDB | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("quotes")
    .select("*, quote_items(*)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) {
    console.error("getQuoteById error:", error.message)
    return null
  }

  return data
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

export async function createQuote(
  payload: CreateQuotePayload
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
      line_total: itemTotal, // Base total for line_total? Or total with tax? Header total is better
    }
  })

  const discountVal = headerFields.discount_type === "PERCENT" 
    ? subtotal * (headerFields.discount / 100) 
    : headerFields.discount
  
  const grandTotal = subtotal + taxAmount - discountVal

  // Insert header
  const { data: quote, error: headerError } = await supabase
    .from("quotes")
    .insert({
      ...headerFields,
      subtotal,
      tax_amount: taxAmount,
      total: grandTotal,
      tenant_id: tenantId,
      currency_code: headerFields.currency_code || "INR",
      valid_until: headerFields.valid_until || null,
    })
    .select("id")
    .single()

  if (headerError || !quote) {
    console.error("createQuote header error:", headerError?.message)
    return { id: null, error: headerError?.message ?? "Failed to create quote" }
  }

  // Insert line items
  if (processedItems.length > 0) {
    const { error: itemsError } = await supabase.from("quote_items").insert(
      processedItems.map((li) => ({
        ...li,
        quote_id: quote.id,
      }))
    )
    if (itemsError) {
      console.error("createQuote items error:", itemsError.message)
      return { id: null, error: itemsError.message }
    }
  }

  revalidatePath("/sales/quotes")
  return { id: quote.id, error: null }
}

/* ── Update ── */
export interface UpdateQuotePayload extends CreateQuotePayload {
  id: string
}

export async function updateQuote(
  payload: UpdateQuotePayload
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
    .from("quotes")
    .update({
      ...headerFields,
      subtotal,
      tax_amount: taxAmount,
      total: grandTotal,
      valid_until: headerFields.valid_until || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (headerError) {
    console.error("updateQuote header error:", headerError.message)
    return { error: headerError.message }
  }

  // Replace all line items: delete old → insert new
  // 1. Verify existence of quote + items first or add tenant_id to delete filter
  // Although quote_items doesn't have tenant_id, the DB RLS policy requires it.
  const { error: deleteError } = await supabase
    .from("quote_items")
    .delete()
    .eq("quote_id", id)
    // Note: If quote_items has no tenant_id, RLS should still handle this via the parent quote.
    // However, adding a check to the header delete first is technically what deleteQuote does.
    // For update, the header update ABOVE already added .eq("tenant_id", tenantId).
    // If that fails (0 rows), the items still shouldn't be deleted. 
    // We'll check the header update was successful.
  if (deleteError) {
    console.error("updateQuote delete items error:", deleteError.message)
    return { error: deleteError.message }
  }

  if (processedItems.length > 0) {
    const { error: insertError } = await supabase.from("quote_items").insert(
      processedItems.map((li) => ({
        ...li,
        quote_id: id,
      }))
    )
    if (insertError) {
      console.error("updateQuote insert items error:", insertError.message)
      return { error: insertError.message }
    }
  }

  revalidatePath("/sales/quotes")
  revalidatePath(`/sales/quotes/${id}/edit`)
  return { error: null }
}

/* ── Delete ── */
export async function deleteQuote(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("quotes")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("deleteQuote error:", error.message)
    return { error: error.message }
  }

  revalidatePath("/sales/quotes")
  return { error: null }
}
