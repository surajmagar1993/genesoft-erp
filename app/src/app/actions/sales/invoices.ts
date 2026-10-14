"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { getTenantAdminId, getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { fireWorkflowEvent } from "@/lib/workflow-engine"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf"
import { COMPANY } from "@/lib/constants/company"
import { computeInvoiceGstSummary } from "@/lib/gst-engine"
import { cleanTaxRate, getTenantTaxContext, invoiceItemTaxColumns, supplyTypeFor } from "@/lib/tenant-tax"
import { recordTransaction } from "@/app/actions/crm/ledger"
import { mapPrismaInvoiceToDB } from "@/lib/invoice-mapper"
import { postToLedger } from "@/lib/ledger"
import { postInvoiceStock } from "@/lib/stock"
import { nextInvoiceNumber } from "@/lib/invoice-number"

/* ── Types ── */
export type InvoiceStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED"
export type InvoiceTypeEnum = "TAX_INVOICE" | "PROFORMA" | "CREDIT_NOTE" | "DEBIT_NOTE"
export type InvoiceTemplateId = "MODERN" | "CLASSIC" | "MINIMALIST" | "COMPACT" | "CREATIVE"

export interface InvoiceLineItemDB {
  id: string
  invoice_id: string
  product_id?: string | null
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
  vat_percent?: number
  vat_amount?: number
  is_exempt?: boolean
  tenant_id: string
}

export interface TenantDB {
  id: string
  name: string
  subdomain: string | null
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
  type: InvoiceTypeEnum
  customer_name: string
  customer_email: string
  customer_gstin?: string
  invoice_date: string
  valid_until: string | null
  reference: string
  status: InvoiceStatus
  discount: number
  discount_type: "PERCENT" | "FIXED"
  notes: string
  terms_and_conditions: string
  declaration?: string
  signatory_name?: string
  signatory_designation?: string
  signature_url?: string | null
  // GST fields
  supplier_gstin: string
  supplier_state: string
  place_of_supply: string
  supply_type: "intra" | "inter" | "single"
  pdf_url?: string | null
  tenant_id: string
  contact_id: string
  currency_code: string
  template_id?: InvoiceTemplateId
  // Tax Exemption
  is_tax_exempt?: boolean
  tax_exemption_reason?: string | null
  tax_exemption_certificate?: string | null
  created_at: string
  updated_at: string
  invoice_line_items?: InvoiceLineItemDB[]
  tenants?: TenantDB
  // Country tax setup (from the business's country and Settings)
  tax_mode?: "IN_GST" | "SINGLE"
  tax_label?: string
  tax_id_label?: string
  invoice_title?: string
  locale?: string
  /** KSA ZATCA phase 1 QR payload (TLV, base64) */
  zatca_tlv?: string | null
}

/* ── Read All ── */
export async function getInvoices(
  page: number = 1,
  limit: number = 10,
  filters?: { status?: string; type?: InvoiceTypeEnum; search?: string }
) {
  const tenantId = await getTenantId()
  const offset = (page - 1) * limit

  const whereClause: any = { tenantId }

  if (filters?.status) {
    whereClause.status = filters.status
  }
  if (filters?.type) {
    whereClause.type = filters.type
  }
  if (filters?.search) {
    whereClause.OR = [
      { invoiceNumber: { contains: filters.search, mode: "insensitive" } },
      { contact: { displayName: { contains: filters.search, mode: "insensitive" } } },
    ]
  }

  try {
    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where: whereClause,
        include: {
          items: true,
          contact: true,
          tenant: true,
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.invoice.count({ where: whereClause }),
    ])

    return {
      data: invoices.map(mapPrismaInvoiceToDB),
      total,
    }
  } catch (error: any) {
    console.error("getInvoices error:", error.message)
    return { data: [], total: 0 }
  }
}

/* ── Read One ── */
export async function getInvoiceById(id: string): Promise<(InvoiceDB & { tenants?: any }) | null> {
  const tenantId = await getTenantId()

  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id, tenantId },
      include: {
        items: true,
        contact: true,
        tenant: true,
      },
    })

    if (!invoice) return null
    return mapPrismaInvoiceToDB(invoice)
  } catch (error: any) {
    console.error("getInvoiceById error:", error.message)
    return null
  }
}

/* ── Get Next Invoice Number (Supports TAX_INVOICE and PROFORMA) ── */
export async function getNextInvoiceNumber(type: "TAX_INVOICE" | "PROFORMA" = "TAX_INVOICE"): Promise<string> {
  const tenantId = await getTenantId()
  return nextInvoiceNumber(tenantId, type)
}

/* ── Create ── */
export interface CreateInvoicePayload {
  invoice_number: string
  type?: "TAX_INVOICE" | "PROFORMA"
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
  declaration?: string
  signatory_name?: string
  signatory_designation?: string
  signature_url?: string
  // GST header fields
  supplier_gstin: string
  customer_gstin: string
  supplier_state: string
  place_of_supply: string
  supply_type: "intra" | "inter" | "single"
  contact_id: string
  is_tax_exempt?: boolean
  tax_exemption_reason?: string
  tax_exemption_certificate?: string
  line_items: Array<{
    /** Catalog product (goods leave stock when the invoice is issued) */
    product_id?: string | null
    product_name: string
    description: string
    qty: number
    unit_price: number
    tax_percent: number
    hsn_sac: string
    cgst_percent: number
    sgst_percent: number
    igst_percent: number
    cgst_amount: number
    sgst_amount: number
    igst_amount: number
  }>
}



const LIVE_FOR_CREDIT = ["SENT", "VIEWED", "PARTIALLY_PAID", "PAID", "OVERDUE"]

/**
 * Customer credit limit: an issued invoice may not take the customer's
 * outstanding balance above their limit (no limit = no check). Drafts and
 * proformas aren't checked. `increase` is what this save adds to the balance.
 */
async function assertCreditLimit(tenantId: string, contactId: string | null | undefined, increase: number) {
  if (!contactId || !(increase > 0)) return
  const c = await prisma.contact.findFirst({ where: { id: contactId, tenantId }, select: { creditLimit: true, balance: true, displayName: true, currencyCode: true } })
  const limit = Number(c?.creditLimit || 0)
  if (!c || !(limit > 0)) return
  const after = Number(c.balance || 0) + increase
  if (after > limit + 0.005) {
    throw new Error(`This would take ${c.displayName}'s balance to ${after.toFixed(2)}, over their credit limit of ${limit.toFixed(2)}. Record a payment or raise the limit first.`)
  }
}

/** An invoice line keeps one text field: "Product — details" (the mapper splits it back). */
function lineDescription(li: { product_name?: string; description?: string }): string {
  const name = (li.product_name || "").trim()
  const details = (li.description || "").trim()
  if (name && details && details !== name) return `${name} — ${details}`
  return name || details || "Item"
}

/** Every catalog product on the lines must belong to this business. */
async function assertLineProducts(tenantId: string, lines: { product_id?: string | null }[]) {
  const ids = [...new Set(lines.map((l) => l.product_id).filter(Boolean))] as string[]
  if (ids.length && (await prisma.product.count({ where: { tenantId, id: { in: ids } } })) !== ids.length) {
    throw new Error("Product not found")
  }
}

export async function createInvoice(
  payload: CreateInvoicePayload
): Promise<{ id: string | null; error: string | null }> {
  const tenantId = await getTenantWriterId()

  try {
    if (payload.contact_id && !(await prisma.contact.count({ where: { id: payload.contact_id, tenantId } }))) {
      return { id: null, error: "Customer not found" }
    }
    await assertLineProducts(tenantId, payload.line_items)

    const isProforma = payload.type === "PROFORMA"
    const finalType: InvoiceTypeEnum = isProforma ? "PROFORMA" : "TAX_INVOICE"

    // Auto-detect tax exemption from contact if not explicitly provided
    let isTaxExempt = Boolean(payload.is_tax_exempt)
    let taxExemptionReason = payload.tax_exemption_reason
    let taxExemptionCertificate = payload.tax_exemption_certificate

    if (payload.contact_id && !isTaxExempt) {
      try {
        const contact = await prisma.contact.findUnique({
          where: { id: payload.contact_id },
          select: { isTaxExempt: true, taxExemptionReason: true, taxExemptionCertificate: true }
        })
        if (contact?.isTaxExempt) {
          isTaxExempt = true
          taxExemptionReason = taxExemptionReason || contact.taxExemptionReason || undefined
          taxExemptionCertificate = taxExemptionCertificate || contact.taxExemptionCertificate || undefined
        }
      } catch (e) {
        // Ignore contact lookup failure during build/offline
      }
    }

    // Compute GST summaries
    // Tax is decided on the server from the business's country and Settings
    const taxCtx = await getTenantTaxContext(tenantId)
    const supplyType = supplyTypeFor(taxCtx, payload.supplier_state, payload.place_of_supply)
    const items = payload.line_items.map((li) => ({
      qty: li.qty,
      unitPrice: li.unit_price,
      gstRate: isTaxExempt ? 0 : cleanTaxRate(li.tax_percent),
      isExempt: isTaxExempt,
    }))
    const summary = computeInvoiceGstSummary(
      items,
      supplyType,
      payload.discount || 0,
      payload.discount_type || "PERCENT",
      {
        isTaxExempt,
        taxExemptionReason,
        taxExemptionCertificate,
      }
    )

    const billToPayload = {
      name: payload.customer_name,
      email: payload.customer_email,
      gstin: payload.customer_gstin,
      reference: payload.reference,
      declaration: payload.declaration || "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct.",
      signatoryName: payload.signatory_name || "Authorized Representative",
      signatoryDesignation: payload.signatory_designation || "Authorized Signatory",
      supplierGstin: payload.supplier_gstin,
      supplierState: payload.supplier_state,
    }

    // Insert Invoice and Line Items atomically
    if (!isProforma && LIVE_FOR_CREDIT.includes(payload.status)) {
      await assertCreditLimit(tenantId, payload.contact_id, summary.grandTotal)
    }

    const invoice = await prisma.invoice.create({
      data: {
        tenantId,
        contactId: payload.contact_id,
        invoiceNumber: payload.invoice_number,
        type: finalType as any,
        status: (payload.status as any) || "DRAFT",
        invoiceDate: new Date(payload.invoice_date || Date.now()),
        dueDate: payload.valid_until ? new Date(payload.valid_until) : null,
        billTo: billToPayload,
        placeOfSupply: payload.place_of_supply || null,
        subtotal: summary.subtotal,
        taxAmount: summary.totalTax,
        discount: summary.discountAmount,
        total: summary.grandTotal,
        currencyCode: taxCtx.currency,
        taxSummary: summary as any,
        isTaxExempt,
        taxExemptionReason: taxExemptionReason || null,
        taxExemptionCertificate: taxExemptionCertificate || null,
        paymentTerms: "Due on receipt",
        notes: payload.notes || null,
        terms: payload.terms_and_conditions || null,
        signatureUrl: payload.signature_url || null,
        items: {
          create: payload.line_items.map((li) => {
            return {
              productId: li.product_id || null,
              description: lineDescription(li),
              hsnSacCode: li.hsn_sac || null,
              quantity: li.qty,
              unitPrice: li.unit_price,
              ...invoiceItemTaxColumns(li.qty, li.unit_price, isTaxExempt ? 0 : cleanTaxRate(li.tax_percent), supplyType),
            }
          }),
        },
      },
    })

    // ─── LEDGER INTEGRATION ───
    // If invoice is created as non-draft and is an official Tax Invoice (not proforma)
    if (!isProforma && payload.status !== "DRAFT" && payload.contact_id) {
      try {
        await recordTransaction({
          contactId: payload.contact_id,
          type: "INVOICE",
          amount: summary.grandTotal,
          referenceId: invoice.id,
          description: `Invoice ${payload.invoice_number} created`,
          date: new Date(payload.invoice_date),
        })
      } catch (ledgerError) {
        console.error("Ledger recording failed:", ledgerError)
      }
    }

    fireWorkflowEvent(tenantId, "INVOICE_CREATED", {
      total: summary.grandTotal,
      customerName: payload.customer_name,
      status: invoice.status,
      invoiceNumber: invoice.invoiceNumber,
    }, invoice.id)

    await postToLedger(tenantId, { kind: "invoice", id: invoice.id })
    await postInvoiceStock(tenantId, { invoiceId: invoice.id })

    revalidatePath("/sales/invoices")
    return { id: invoice.id, error: null }
  } catch (error: any) {
    console.error("createInvoice error:", error.message)
    return { id: null, error: error.message || "Failed to create invoice" }
  }
}

/* ── Update ── */
export interface UpdateInvoicePayload extends CreateInvoicePayload {
  id: string
}

export async function updateInvoice(
  payload: UpdateInvoicePayload
): Promise<{ error: string | null }> {
  const tenantId = await getTenantWriterId()

  try {
    await assertLineProducts(tenantId, payload.line_items)
    const isProforma = payload.type === "PROFORMA"
    const finalType: InvoiceTypeEnum = isProforma ? "PROFORMA" : "TAX_INVOICE"

    const isTaxExempt = Boolean(payload.is_tax_exempt)
    const taxExemptionReason = payload.tax_exemption_reason
    const taxExemptionCertificate = payload.tax_exemption_certificate

    // Tax is decided on the server from the business's country and Settings
    const taxCtx = await getTenantTaxContext(tenantId)
    const supplyType = supplyTypeFor(taxCtx, payload.supplier_state, payload.place_of_supply)
    const items = payload.line_items.map((li) => ({
      qty: li.qty,
      unitPrice: li.unit_price,
      gstRate: isTaxExempt ? 0 : cleanTaxRate(li.tax_percent),
      isExempt: isTaxExempt,
    }))
    const summary = computeInvoiceGstSummary(
      items,
      supplyType,
      payload.discount || 0,
      payload.discount_type || "PERCENT",
      {
        isTaxExempt,
        taxExemptionReason,
        taxExemptionCertificate,
      }
    )

    const billToPayload = {
      name: payload.customer_name,
      email: payload.customer_email,
      gstin: payload.customer_gstin,
      reference: payload.reference,
      declaration: payload.declaration || "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct.",
      signatoryName: payload.signatory_name || "Authorized Representative",
      signatoryDesignation: payload.signatory_designation || "Authorized Signatory",
      supplierGstin: payload.supplier_gstin,
      supplierState: payload.supplier_state,
    }

    // Credit limit: only the increase over what this invoice already added to the balance
    const before = await prisma.invoice.findFirst({ where: { id: payload.id, tenantId }, select: { total: true, status: true, type: true, contactId: true } })
    if (!before) return { error: "Invoice not found" }
    if (!isProforma && LIVE_FOR_CREDIT.includes(payload.status)) {
      const already = before.type !== "PROFORMA" && LIVE_FOR_CREDIT.includes(before.status) && before.contactId === payload.contact_id ? Number(before.total) : 0
      await assertCreditLimit(tenantId, payload.contact_id, summary.grandTotal - already)
    }

    // Atomic update of header and line items
    await (prisma as any).$transaction(async (tx: any) => {
      // 1. Delete existing line items
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: payload.id },
      })

      // 2. Update invoice header and create new line items
      await tx.invoice.update({
        where: { id: payload.id, tenantId },
        data: {
          invoiceNumber: payload.invoice_number,
          type: finalType as any,
          status: (payload.status as any) || "DRAFT",
          invoiceDate: new Date(payload.invoice_date || Date.now()),
          dueDate: payload.valid_until ? new Date(payload.valid_until) : null,
          billTo: billToPayload,
          placeOfSupply: payload.place_of_supply || null,
          subtotal: summary.subtotal,
          taxAmount: summary.totalTax,
          discount: summary.discountAmount,
          total: summary.grandTotal,
          taxSummary: summary as any,
          isTaxExempt,
          taxExemptionReason: taxExemptionReason || null,
          taxExemptionCertificate: taxExemptionCertificate || null,
          notes: payload.notes || null,
          terms: payload.terms_and_conditions || null,
          signatureUrl: payload.signature_url || null,
          items: {
            create: payload.line_items.map((li) => {
              return {
                productId: li.product_id || null,
                description: lineDescription(li),
                hsnSacCode: li.hsn_sac || null,
                quantity: li.qty,
                unitPrice: li.unit_price,
                ...invoiceItemTaxColumns(li.qty, li.unit_price, isTaxExempt ? 0 : cleanTaxRate(li.tax_percent), supplyType),
              }
            }),
          },
        },
      })
    })

    // ─── LEDGER INTEGRATION ───
    // The invoice's customer can't change here, so post against the stored contact,
    // not the contact_id sent by the form.
    const stored = await prisma.invoice.findFirst({
      where: { id: payload.id, tenantId },
      select: { contactId: true },
    })
    const contactId = stored?.contactId

    if (!isProforma && payload.status !== "DRAFT" && contactId) {
      try {
        const newTotal = summary.grandTotal
        const entry = await prisma.ledgerEntry.findFirst({
          where: { referenceId: payload.id, tenantId },
        })

        if (entry) {
          const delta = newTotal - Number(entry.amount)
          if (delta !== 0) {
            await (prisma as any).$transaction(async (tx: any) => {
              await tx.contact.update({
                where: { id: entry.contactId, tenantId },
                data: { balance: { increment: delta } },
              })
              await tx.ledgerEntry.update({
                where: { id: entry.id },
                data: { amount: newTotal },
              })
            })
          }
        } else {
          await recordTransaction({
            contactId,
            type: "INVOICE",
            amount: newTotal,
            referenceId: payload.id,
            description: `Invoice ${payload.invoice_number} updated`,
            date: new Date(payload.invoice_date),
          })
        }
      } catch (ledgerError) {
        console.error("Ledger update failed for invoice:", ledgerError)
      }
    }

    await postToLedger(tenantId, { kind: "invoice", id: payload.id })
    await postInvoiceStock(tenantId, { invoiceId: payload.id })

    revalidatePath("/sales/invoices")
    revalidatePath(`/sales/invoices/${payload.id}`)
    revalidatePath(`/sales/invoices/${payload.id}/edit`)
    return { error: null }
  } catch (error: any) {
    console.error("updateInvoice error:", error.message)
    return { error: error.message || "Failed to update invoice" }
  }
}

/* ── Convert Proforma to Official Tax Invoice ── */
export async function convertProformaToInvoice(
  proformaId: string
): Promise<{ success: boolean; newInvoiceNumber?: string; error?: string }> {
  const tenantId = await getTenantWriterId()

  try {
    const proforma = await prisma.invoice.findFirst({
      where: { id: proformaId, tenantId },
      include: { items: true, contact: true },
    })

    if (!proforma) {
      return { success: false, error: "Proforma invoice not found" }
    }

    if (proforma.type !== "PROFORMA") {
      return { success: false, error: "Document is already an official Tax Invoice or Credit Note" }
    }

    // Generate next official Tax Invoice sequence
    const newInvoiceNumber = await getNextInvoiceNumber("TAX_INVOICE")

    const existingBillTo = (proforma.billTo as Record<string, any>) || {}
    const updatedBillTo = {
      ...existingBillTo,
      convertedFromProforma: proforma.invoiceNumber,
      convertedAt: new Date().toISOString(),
    }

    const conversionNote = `[Converted from Proforma ${proforma.invoiceNumber} on ${new Date().toLocaleDateString("en-IN")}]`
    const updatedNotes = proforma.notes ? `${proforma.notes}\n${conversionNote}` : conversionNote

    await prisma.invoice.update({
      where: { id: proforma.id },
      data: {
        invoiceNumber: newInvoiceNumber,
        type: "TAX_INVOICE",
        status: "SENT",
        billTo: updatedBillTo,
        notes: updatedNotes,
      },
    })

    // Record in Customer Ledger
    if (proforma.contactId) {
      try {
        await recordTransaction({
          contactId: proforma.contactId,
          type: "INVOICE",
          amount: Number(proforma.total),
          referenceId: proforma.id,
          description: `Tax Invoice ${newInvoiceNumber} (Converted from ${proforma.invoiceNumber})`,
          date: new Date(),
        })
      } catch (ledgerErr) {
        console.error("Ledger recording on proforma conversion error:", ledgerErr)
      }
    }

    await postToLedger(tenantId, { kind: "invoice", id: proformaId })
    await postInvoiceStock(tenantId, { invoiceId: proformaId })

    revalidatePath("/sales/invoices")
    revalidatePath(`/sales/invoices/${proformaId}`)
    return { success: true, newInvoiceNumber }
  } catch (error: any) {
    console.error("convertProformaToInvoice error:", error.message)
    return { success: false, error: error.message || "Failed to convert proforma invoice" }
  }
}

/* ── Delete ── */
export async function deleteInvoice(id: string): Promise<{ error: string | null }> {
  const tenantId = await getTenantManagerId()

  try {
    // Only this business's invoice (checked before anything is deleted)
    const owned = await prisma.invoice.findFirst({ where: { id, tenantId }, select: { id: true, invoiceNumber: true } })
    if (!owned) return { error: "Invoice not found" }
    // Its payments are deleted with it (cascade); their journals are voided below
    const paymentIds: string[] = (await prisma.payment.findMany({ where: { invoiceId: id, tenantId }, select: { id: true } })).map((p: { id: string }) => p.id)

    // ─── LEDGER INTEGRATION CLEANUP ───
    const entry = await prisma.ledgerEntry.findFirst({
      where: { referenceId: id, tenantId },
    })

    if (entry) {
      await (prisma as any).$transaction(async (tx: any) => {
        await tx.contact.update({
          where: { id: entry.contactId },
          data: { balance: { decrement: entry.amount } },
        })
        await tx.ledgerEntry.delete({ where: { id: entry.id } })
      })
    }

    // Delete invoice items and invoice
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: id },
    })

    await prisma.invoice.delete({
      where: { id, tenantId },
    })

    await postToLedger(tenantId, { kind: "invoice", id })
    for (const paymentId of paymentIds) await postToLedger(tenantId, { kind: "payment", id: paymentId })
    await postInvoiceStock(tenantId, { invoiceNumber: owned.invoiceNumber })

    revalidatePath("/sales/invoices")
    return { error: null }
  } catch (error: any) {
    console.error("deleteInvoice error:", error.message)
    return { error: error.message || "Failed to delete invoice" }
  }
}

/* ── Email ─────────────────────────────────────────────────────────────────── */
export async function sendInvoiceEmail(
  id: string
): Promise<{ error: string | null }> {
  const tenantId = await getTenantWriterId()
  const invoice = await getInvoiceById(id)
  if (!invoice) return { error: "Invoice not found" }

  const recipientEmail = invoice.customer_email
  if (!recipientEmail) return { error: "Customer has no email address" }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { error: "RESEND_API_KEY is not configured" }
  if (!process.env.RESEND_DOMAIN) return { error: "RESEND_DOMAIN is not configured" }

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
  const isProforma = invoice.type === "PROFORMA"
  const documentLabel = isProforma ? "Proforma Invoice" : "Tax Invoice"

  const { error: emailError } = await resend.emails.send({
    from: `${supplierName} <invoices@${process.env.RESEND_DOMAIN}>`,
    to: [recipientEmail],
    subject: `${documentLabel} ${invoice.invoice_number} from ${supplierName}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; color: #0f172a;">
        <h2 style="color: #1e40af;">${documentLabel} ${invoice.invoice_number}</h2>
        <p>Dear ${invoice.customer_name},</p>
        <p>Please find your ${documentLabel.toLowerCase()} attached to this email.</p>
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
        filename: `${documentLabel.replace(/\s+/g, "_")}-${invoice.invoice_number}.pdf`,
        content: pdfBuffer,
      },
    ],
  })

  if (emailError) {
    console.error("Resend error:", emailError)
    return { error: emailError.message }
  }

  // Update status in Prisma
  await prisma.invoice.updateMany({
    where: { id, tenantId, status: "DRAFT" },
    data: { status: "SENT" as any },
  })
  await postToLedger(tenantId, { kind: "invoice", id })
  await postInvoiceStock(tenantId, { invoiceId: id })

  revalidatePath("/sales/invoices")
  revalidatePath(`/sales/invoices/${id}`)
  return { error: null }
}

/**
 * Updates the presentation template preference for a specific invoice.
 */
export async function updateInvoiceTemplate(
  id: string,
  templateId: InvoiceTemplateId
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getTenantWriterId()
    const invoice = await prisma.invoice.findUnique({
      where: { id, tenantId },
      select: { billTo: true }
    })

    if (!invoice) {
      return { success: false, error: "Invoice not found" }
    }

    const currentBillTo = (invoice.billTo as Record<string, any>) || {}
    const updatedBillTo = { ...currentBillTo, templateId }

    await prisma.invoice.update({
      where: { id, tenantId },
      data: { billTo: updatedBillTo }
    })

    revalidatePath("/sales/invoices")
    revalidatePath(`/sales/invoices/${id}`)
    return { success: true }
  } catch (err: any) {
    console.error("Failed to update invoice template:", err)
    return { success: false, error: err.message || "Failed to update template" }
  }
}

/**
 * Updates the organization-wide default invoice template in tenant settings.
 */
export async function updateTenantDefaultTemplate(
  templateId: InvoiceTemplateId
): Promise<{ success: boolean; error?: string }> {
  try {
    const tenantId = await getTenantAdminId()
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { settings: true }
    })

    if (!tenant) {
      return { success: false, error: "Tenant not found" }
    }

    const currentSettings = (tenant.settings as Record<string, any>) || {}
    const updatedSettings = { ...currentSettings, invoice_template: templateId }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { settings: updatedSettings }
    })

    revalidatePath("/sales/invoices")
    revalidatePath("/sales/invoices/templates")
    return { success: true }
  } catch (err: any) {
    console.error("Failed to update tenant default template:", err)
    return { success: false, error: err.message || "Failed to update default template" }
  }
}

