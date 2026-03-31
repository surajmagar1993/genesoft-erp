"use server"

import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf"
import { COMPANY } from "@/lib/constants/company"
import { computeInvoiceGstSummary } from "@/lib/gst-engine"

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

export interface TenantDB {
  id: string
  name: string
  subdomain: string | null
  // Prisma mapped fields
  logo_url: string | null
  address: any
  phone: string | null
  email: string | null
  website: string | null
  fiscal_year_start: number
  settings: any
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
  pdf_url?: string | null
  tenant_id: string
  created_at: string
  updated_at: string
  invoice_line_items?: InvoiceLineItemDB[]
  tenants?: TenantDB
}

/* ── Read All ── */
export async function getInvoices(): Promise<InvoiceDB[]> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_line_items(*), tenants(*)")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("getInvoices error:", error.message)
    return []
  }
  return data ?? []
}

/* ── Read One ── */
export async function getInvoiceById(id: string): Promise<(InvoiceDB & { tenants?: any }) | null> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { data, error } = await supabase
    .from("invoices")
    .select("*, invoice_line_items(*), tenants(*)")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single()

  if (error) {
    console.error("getInvoiceById error:", error.message)
    return null
  }

  return data
}

/* ── Get Next Invoice Number ── */
export async function getNextInvoiceNumber(): Promise<string> {
  const supabase = await createClient()
  const tenantId = await getTenantId()

  // 1. Fetch tenant fiscal year start
  const { data: tenant } = await supabase
    .from("tenants")
    .select("fiscal_year_start")
    .eq("id", tenantId)
    .single()
    
  const fiscalMonthStart = tenant?.fiscal_year_start || 4 // defaults to 4 (April)

  // 2. Compute current financial year part
  const now = new Date()
  let startYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1..12

  if (currentMonth < fiscalMonthStart) {
    startYear -= 1
  }
  const endYear = startYear + 1
  const fyPrefix = `${startYear}-${endYear.toString().slice(-2)}`

  // 3. Find the latest sequence number in this financial year
  const { data: latestInvoice } = await supabase
    .from("invoices")
    .select("invoice_number")
    .eq("tenant_id", tenantId)
    .ilike("invoice_number", `INV-${fyPrefix}-%`)
    // Normally we'd order by sequence or split by '-', but just getting the highest lexicographical string works if it's 0-padded well
    .order("invoice_number", { ascending: false })
    .limit(1)

  let nextSeq = 1
  if (latestInvoice && latestInvoice.length > 0) {
    const lastNum = latestInvoice[0].invoice_number
    const parts = lastNum.split("-")
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1
    }
  }

  return `INV-${fyPrefix}-${nextSeq.toString().padStart(4, "0")}`
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

/* ── Email ─────────────────────────────────────────────────────────────────── */

export async function sendInvoiceEmail(
  id: string
): Promise<{ error: string | null }> {
  const invoice = await getInvoiceById(id)
  if (!invoice) return { error: "Invoice not found" }

  const recipientEmail = invoice.customer_email
  if (!recipientEmail) return { error: "Customer has no email address" }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: "RESEND_API_KEY is not configured" }

  // Generate PDF
  let pdfBuffer: Buffer
  try {
    pdfBuffer = await renderInvoicePdf(invoice)
  } catch (err) {
    console.error("PDF render error:", err)
    return { error: "Failed to generate PDF" }
  }

  // Compute grand total from line items
  const items = (invoice.invoice_line_items ?? []).map((li) => ({
    qty: li.qty,
    unitPrice: li.unit_price,
    gstRate: li.tax_percent,
  }))
  const summary = computeInvoiceGstSummary(
    items,
    invoice.supply_type ?? "intra",
    invoice.discount ?? 0,
    invoice.discount_type ?? "PERCENT"
  )
  const grandTotal = summary.grandTotal

  const resend = new Resend(apiKey)
  
  const supplierName = invoice.tenants?.name || COMPANY.name

  const { error: emailError } = await resend.emails.send({
    from: `${supplierName} <invoices@${process.env.RESEND_DOMAIN ?? "yourdomain.com"}>`,
    to: [recipientEmail],
    subject: `Invoice ${invoice.invoice_number} from ${supplierName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #0f172a;">
        <h2 style="color: #1e40af;">Invoice ${invoice.invoice_number}</h2>
        <p>Dear ${invoice.customer_name},</p>
        <p>Please find your tax invoice attached to this email.</p>
        <table style="width:100%; border-collapse:collapse; margin: 20px 0; font-size:14px;">
          <tr>
            <td style="padding:8px; border:1px solid #e2e8f0; color:#64748b;">Invoice Number</td>
            <td style="padding:8px; border:1px solid #e2e8f0; font-weight:600;">${invoice.invoice_number}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e2e8f0; color:#64748b;">Invoice Date</td>
            <td style="padding:8px; border:1px solid #e2e8f0;">${invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString("en-IN") : "—"}</td>
          </tr>
          <tr>
            <td style="padding:8px; border:1px solid #e2e8f0; color:#64748b;">Grand Total</td>
            <td style="padding:8px; border:1px solid #e2e8f0; font-weight:700; color:#1e40af;">₹${grandTotal.toFixed(2)}</td>
          </tr>
        </table>
        <p style="color:#64748b; font-size:13px;">If you have any questions, please reply to this email.</p>
        <p>Regards,<br/><strong>${supplierName}</strong></p>
      </div>`,
    attachments: [
      {
        filename: `Invoice-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (emailError) {
    console.error("Resend error:", emailError)
    return { error: emailError.message }
  }

  // Mark invoice as SENT & Upload to Storage
  const supabase = await createClient()
  const tenantId = await getTenantId()

  const { error: uploadError } = await supabase.storage
    .from("invoices")
    .upload(`${tenantId}/${id}.pdf`, pdfBuffer, {
      contentType: "application/pdf",
      upsert: true,
    })

  let pdfUrl = null
  if (!uploadError) {
    const { data: { publicUrl } } = supabase.storage
      .from("invoices")
      .getPublicUrl(`${tenantId}/${id}.pdf`)
    pdfUrl = publicUrl
  }

  await supabase
    .from("invoices")
    .update({ 
      status: "SENT",
      pdf_url: pdfUrl
    })
    .eq("id", id)
    .eq("tenant_id", tenantId)

  revalidatePath("/sales/invoices")
  revalidatePath(`/sales/invoices/${id}`)
  return { error: null }
}
