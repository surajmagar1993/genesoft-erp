"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { Resend } from "resend"
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf"
import { COMPANY } from "@/lib/constants/company"
import { computeInvoiceGstSummary } from "@/lib/gst-engine"
import { recordTransaction } from "@/app/actions/crm/ledger"

/* ── Types ── */
export type InvoiceStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED"
export type InvoiceTypeEnum = "TAX_INVOICE" | "PROFORMA" | "CREDIT_NOTE" | "DEBIT_NOTE"

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
  supply_type: "intra" | "inter"
  pdf_url?: string | null
  tenant_id: string
  contact_id: string
  currency_code: string
  // Tax Exemption
  is_tax_exempt?: boolean
  tax_exemption_reason?: string | null
  tax_exemption_certificate?: string | null
  created_at: string
  updated_at: string
  invoice_line_items?: InvoiceLineItemDB[]
  tenants?: TenantDB
}

/* ── Helper: Map Prisma Model to InvoiceDB ── */
function mapPrismaInvoiceToDB(inv: any): InvoiceDB & { tenants?: TenantDB } {
  const billTo = (inv.billTo as Record<string, any>) || {}
  const tenantSettings = (inv.tenant?.settings as Record<string, any>) || {}
  const supplierState = tenantSettings.state || COMPANY.state
  const placeOfSupply = inv.placeOfSupply || ""
  const isInter = placeOfSupply ? placeOfSupply !== supplierState : false

  return {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    type: (inv.type as InvoiceTypeEnum) || "TAX_INVOICE",
    customer_name: billTo.name || inv.contact?.displayName || "Customer",
    customer_email: billTo.email || inv.contact?.email || "",
    customer_gstin: billTo.gstin || inv.contact?.taxNumber || "",
    invoice_date: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString() : new Date().toISOString(),
    valid_until: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
    reference: billTo.reference || "",
    status: inv.status as InvoiceStatus,
    discount: Number(inv.discount || 0),
    discount_type: "FIXED",
    notes: inv.notes || "",
    terms_and_conditions: inv.terms || "",
    declaration: billTo.declaration || "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct.",
    signatory_name: billTo.signatoryName || tenantSettings.signatory_name || "Authorized Representative",
    signatory_designation: billTo.signatoryDesignation || tenantSettings.signatory_designation || "Authorized Signatory",
    signature_url: inv.signatureUrl || tenantSettings.signature_url || null,
    supplier_gstin: tenantSettings.gstin || COMPANY.gstin,
    supplier_state: supplierState,
    place_of_supply: placeOfSupply,
    supply_type: isInter ? "inter" : "intra",
    pdf_url: inv.pdfUrl,
    tenant_id: inv.tenantId,
    contact_id: inv.contactId,
    currency_code: inv.currencyCode || "INR",
    is_tax_exempt: (inv as any).isTaxExempt || false,
    tax_exemption_reason: (inv as any).taxExemptionReason || null,
    tax_exemption_certificate: (inv as any).taxExemptionCertificate || null,
    created_at: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
    updated_at: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : new Date().toISOString(),
    invoice_line_items: (inv.items || []).map((li: any) => ({
      id: li.id,
      invoice_id: li.invoiceId,
      product_name: li.description || "Item",
      description: li.description || "",
      qty: Number(li.quantity),
      unit_price: Number(li.unitPrice),
      tax_percent:
        Number(li.cgstRate || 0) +
        Number(li.sgstRate || 0) +
        Number(li.igstRate || 0) +
        Number(li.vatRate || 0),
      hsn_sac: li.hsnSacCode || "",
      cgst_percent: Number(li.cgstRate || 0),
      sgst_percent: Number(li.sgstRate || 0),
      igst_percent: Number(li.igstRate || 0),
      cgst_amount: Number(li.cgstAmount || 0),
      sgst_amount: Number(li.sgstAmount || 0),
      igst_amount: Number(li.igstAmount || 0),
      tenant_id: inv.tenantId,
    })),
    tenants: inv.tenant
      ? {
          id: inv.tenant.id,
          name: inv.tenant.name,
          subdomain: inv.tenant.domain,
          logo_url: inv.tenant.logoUrl,
          address: inv.tenant.address,
          phone: inv.tenant.phone,
          email: inv.tenant.email,
          website: inv.tenant.website,
          fiscal_year_start: inv.tenant.fiscalYearStart || 4,
          settings: inv.tenant.settings || {},
        }
      : undefined,
  }
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

  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    select: { settings: true },
  })

  const tenantSettings = (tenant?.settings as Record<string, any>) || {}
  const fiscalMonthStart = tenantSettings.fiscal_year_start || 4 // defaults to April

  const now = new Date()
  let startYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1..12

  if (currentMonth < fiscalMonthStart) {
    startYear -= 1
  }
  const endYear = startYear + 1
  const fyPrefix = `${startYear}-${endYear.toString().slice(-2)}`
  const prefix = type === "PROFORMA" ? `PI-${fyPrefix}-` : `INV-${fyPrefix}-`

  const latestInvoice = await prisma.invoice.findFirst({
    where: {
      tenantId,
      invoiceNumber: { startsWith: prefix },
    },
    orderBy: { invoiceNumber: "desc" },
    select: { invoiceNumber: true },
  })

  let nextSeq = 1
  if (latestInvoice && latestInvoice.invoiceNumber) {
    const parts = latestInvoice.invoiceNumber.split("-")
    const lastSeq = parseInt(parts[parts.length - 1], 10)
    if (!isNaN(lastSeq)) {
      nextSeq = lastSeq + 1
    }
  }

  return `${prefix}${nextSeq.toString().padStart(4, "0")}`
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
  supply_type: "intra" | "inter"
  contact_id: string
  is_tax_exempt?: boolean
  tax_exemption_reason?: string
  tax_exemption_certificate?: string
  line_items: Array<{
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

export async function createInvoice(
  payload: CreateInvoicePayload
): Promise<{ id: string | null; error: string | null }> {
  const tenantId = await getTenantId()

  try {
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
    const items = payload.line_items.map((li) => ({
      qty: li.qty,
      unitPrice: li.unit_price,
      gstRate: isTaxExempt ? 0 : li.tax_percent,
      isExempt: isTaxExempt,
    }))
    const summary = computeInvoiceGstSummary(
      items,
      payload.supply_type || "intra",
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
        currencyCode: "INR",
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
            const lineTax = (li.cgst_amount || 0) + (li.sgst_amount || 0) + (li.igst_amount || 0)
            const lineTotal = li.qty * li.unit_price + lineTax
            return {
              description: li.description || li.product_name || "Item",
              hsnSacCode: li.hsn_sac || null,
              quantity: li.qty,
              unitPrice: li.unit_price,
              cgstRate: li.cgst_percent || 0,
              cgstAmount: li.cgst_amount || 0,
              sgstRate: li.sgst_percent || 0,
              sgstAmount: li.sgst_amount || 0,
              igstRate: li.igst_percent || 0,
              igstAmount: li.igst_amount || 0,
              lineTotal: lineTotal,
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
  const tenantId = await getTenantId()

  try {
    const isProforma = payload.type === "PROFORMA"
    const finalType: InvoiceTypeEnum = isProforma ? "PROFORMA" : "TAX_INVOICE"

    let isTaxExempt = Boolean(payload.is_tax_exempt)
    let taxExemptionReason = payload.tax_exemption_reason
    let taxExemptionCertificate = payload.tax_exemption_certificate

    const items = payload.line_items.map((li) => ({
      qty: li.qty,
      unitPrice: li.unit_price,
      gstRate: isTaxExempt ? 0 : li.tax_percent,
      isExempt: isTaxExempt,
    }))
    const summary = computeInvoiceGstSummary(
      items,
      payload.supply_type || "intra",
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
              const lineTax = (li.cgst_amount || 0) + (li.sgst_amount || 0) + (li.igst_amount || 0)
              const lineTotal = li.qty * li.unit_price + lineTax
              return {
                description: li.description || li.product_name || "Item",
                hsnSacCode: li.hsn_sac || null,
                quantity: li.qty,
                unitPrice: li.unit_price,
                cgstRate: li.cgst_percent || 0,
                cgstAmount: li.cgst_amount || 0,
                sgstRate: li.sgst_percent || 0,
                sgstAmount: li.sgst_amount || 0,
                igstRate: li.igst_percent || 0,
                igstAmount: li.igst_amount || 0,
                lineTotal: lineTotal,
              }
            }),
          },
        },
      })
    })

    // ─── LEDGER INTEGRATION ───
    if (!isProforma && payload.status !== "DRAFT" && payload.contact_id) {
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
                where: { id: payload.contact_id },
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
            contactId: payload.contact_id,
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
  const tenantId = await getTenantId()

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
  const tenantId = await getTenantId()

  try {
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
  const isProforma = invoice.type === "PROFORMA"
  const documentLabel = isProforma ? "Proforma Invoice" : "Tax Invoice"

  const { error: emailError } = await resend.emails.send({
    from: `${supplierName} <invoices@${process.env.RESEND_DOMAIN ?? "yourdomain.com"}>`,
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
  await prisma.invoice.update({
    where: { id },
    data: { status: "SENT" as any },
  })

  revalidatePath("/sales/invoices")
  revalidatePath(`/sales/invoices/${id}`)
  return { error: null }
}
