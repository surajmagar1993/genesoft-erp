"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

/* ── Types ── */
export type InvoiceStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"

export interface InvoiceLineItemDB {
  id: string
  invoice_id: string
  product_name: string
  description: string
  qty: number
  unit_price: number
  tax_percent: number  // legacy — kept for backwards-compat
  hsn_sac: string
  cgst_percent: number
  sgst_percent: number
  igst_percent: number
  cgst_amount: number
  sgst_amount: number
  igst_amount: number
  tenant_id: string
}

export interface InvoiceDB {
  id: string
  invoice_number: string
  customer_name: string
  customer_email: string
  invoice_date: string
  valid_until: string | null
  reference: string
  status: InvoiceStatus
  discount: number
  discount_type: "PERCENT" | "FIXED"
  notes: string
  terms_and_conditions: string
  // GST fields
  supplier_gstin: string
  customer_gstin: string
  supplier_state: string
  place_of_supply: string
  supply_type: "intra" | "inter"
  tenant_id: string
  created_at: string
  updated_at: string
  invoice_line_items?: InvoiceLineItemDB[]
}

/* ── Read All ── */
export async function getInvoices(): Promise<InvoiceDB[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_line_items(*)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getInvoices error:", error.message)
    return []
  }
  return data ?? []
}

/* ── Read One ── */
export async function getInvoiceById(id: string): Promise<InvoiceDB | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_line_items(*)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) {
    console.error("getInvoiceById error:", error.message)
    return null
  }
  return data
}

/* ── Create ── */
export interface CreateInvoicePayload {
  invoice_number: string
  customer_name: string
  customer_email: string
  invoice_date: string
  valid_until: string
  reference: string
  status: InvoiceStatus
  discount: number
  discount_type: "PERCENT" | "FIXED"
  notes: string
  terms_and_conditions: string
  // GST header fields
  supplier_gstin: string
  customer_gstin: string
  supplier_state: string
  place_of_supply: string
  supply_type: "intra" | "inter"
  line_items: Array<{
    product_name: string
    description: string
    qty: number
    unit_price: number
    tax_percent: number  // legacy — equals gst_rate
    hsn_sac: string
    cgst_percent: number
    sgst_percent: number
    igst_percent: number
    cgst_amount: number
    sgst_amount: number
    igst_amount: number
  }>
}

export async function createInvoice(
  payload: CreateInvoicePayload
): Promise<{ id: string | null; error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { line_items, ...headerFields } = payload

  // Insert header
  const { data: invoice, error: headerError } = await supabase
    .from("invoices")
    .insert({
      ...headerFields,
      valid_until: headerFields.valid_until || null,
      tenant_id: tenantId,
    })
    .select("id")
    .single()

  if (headerError || !invoice) {
    console.error("createInvoice header error:", headerError?.message)
    return { id: null, error: headerError?.message ?? "Failed to create invoice" }
  }

  // Insert line items
  if (line_items.length > 0) {
    const { error: itemsError } = await supabase.from("invoice_line_items").insert(
      line_items.map((li) => ({
        ...li,
        invoice_id: invoice.id,
        tenant_id: tenantId,
      }))
    )
    if (itemsError) {
      console.error("createInvoice items error:", itemsError.message)
      return { id: null, error: itemsError.message }
    }
  }

  revalidatePath("/sales/invoices")
  return { id: invoice.id, error: null }
}

/* ── Update ── */
export interface UpdateInvoicePayload extends CreateInvoicePayload {
  id: string
}

export async function updateInvoice(
  payload: UpdateInvoicePayload
): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { id, line_items, ...headerFields } = payload

  // Update header
  const { error: headerError } = await supabase
    .from("invoices")
    .update({
      ...headerFields,
      valid_until: headerFields.valid_until || null,
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (headerError) {
    console.error("updateInvoice header error:", headerError.message)
    return { error: headerError.message }
  }

  // Replace all line items: delete old → insert new
  const { error: deleteError } = await supabase
    .from("invoice_line_items")
    .delete()
    .eq("invoice_id", id)

  if (deleteError) {
    console.error("updateInvoice delete items error:", deleteError.message)
    return { error: deleteError.message }
  }

  if (line_items.length > 0) {
    const { error: insertError } = await supabase.from("invoice_line_items").insert(
      line_items.map((li) => ({
        ...li,
        invoice_id: id,
        tenant_id: tenantId,
      }))
    )
    if (insertError) {
      console.error("updateInvoice insert items error:", insertError.message)
      return { error: insertError.message }
    }
  }

  revalidatePath("/sales/invoices")
  revalidatePath(`/sales/invoices/${id}/edit`)
  return { error: null }
}

/* ── Delete ── */
export async function deleteInvoice(id: string): Promise<{ error: string | null }> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId)

  if (error) {
    console.error("deleteInvoice error:", error.message)
    return { error: error.message }
  }

  revalidatePath("/sales/invoices")
  return { error: null }
}
