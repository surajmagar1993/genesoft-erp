import type { Contact, Invoice, InvoiceItem, Tenant } from "@prisma/client"
import { COMPANY } from "@/lib/constants/company"
import { getStateNameFromCode } from "@/lib/gst-returns-engine"
import { resolveTaxRegime } from "@/lib/tax-jurisdiction"
import { encodeZatcaTlv } from "@/lib/ksa-zatca-engine"
import type {
  InvoiceDB,
  InvoiceStatus,
  InvoiceTemplateId,
  InvoiceTypeEnum,
  TenantDB,
} from "@/app/actions/sales/invoices"

/* ── Helper: Map Prisma Model to InvoiceDB ── */
/** An invoice row with whichever relations the caller loaded */
export type InvoiceWithRelations = Invoice & {
  items?: InvoiceItem[]
  contact?: (Pick<Contact, "displayName" | "email" | "taxNumber"> & { phone?: string | null }) | null
  tenant?: Tenant | null
}

/** The live (not cancelled) e-way bill draft saved for this invoice in the business's settings */
function ewayBillNoFor(inv: InvoiceWithRelations): string | undefined {
  const bills = (inv.tenant?.settings as { ewayBills?: { invoiceId?: string; ewayBillNo?: string; status?: string }[] } | null)?.ewayBills
  if (!Array.isArray(bills)) return undefined
  return bills.find((b) => b.invoiceId === inv.id && b.status !== "CANCELLED")?.ewayBillNo
}

export function mapPrismaInvoiceToDB(inv: InvoiceWithRelations): InvoiceDB & { tenants?: TenantDB } {
  const billTo = ((inv.billTo as Record<string, unknown> | null) || {}) as Record<string, string | undefined>
  const tenantSettings = ((inv.tenant?.settings as Record<string, unknown> | null) || {}) as Record<string, string | undefined>
  // A GSTIN starts with the 2-digit state code, so it gives the state when Settings has none
  const supplierGstin: string =
    tenantSettings.gstin || tenantSettings.vat_number || tenantSettings.ksa_vat_number || tenantSettings.trn ||
    tenantSettings.uk_vrn || tenantSettings.vrn || tenantSettings.abn || tenantSettings.ein || tenantSettings.tax_id ||
    COMPANY.gstin || ""
  const regime = resolveTaxRegime(inv.tenant?.countryCode, tenantSettings as { tax?: never }, inv.currencyCode)
  const gstinStateCode = regime.mode === "IN_GST" && /^\d{2}/.test(supplierGstin) ? supplierGstin.slice(0, 2) : ""
  const supplierState = tenantSettings.state || COMPANY.state || (gstinStateCode ? getStateNameFromCode(gstinStateCode) : "")
  const placeOfSupply = inv.placeOfSupply || ""
  const isInter = placeOfSupply ? placeOfSupply !== supplierState : false
  const supplyType = regime.mode === "SINGLE" ? "single" : isInter ? "inter" : "intra"

  // KSA ZATCA phase 1: seller name, VAT number, timestamp, total with VAT, VAT total
  let zatcaTlv: string | null = null
  if (regime.requiresZatcaQr && inv.type !== "PROFORMA" && supplierGstin) {
    zatcaTlv = encodeZatcaTlv({
      sellerName: inv.tenant?.name || "",
      vatNumber: supplierGstin,
      invoiceTimestamp: new Date(inv.invoiceDate || inv.createdAt || Date.now()).toISOString().replace(/\.\d{3}Z$/, "Z"),
      invoiceTotal: Number(inv.total || 0).toFixed(2),
      vatTotal: Number(inv.taxAmount || 0).toFixed(2),
    })
  }

  return {
    id: inv.id,
    invoice_number: inv.invoiceNumber,
    type: (inv.type as InvoiceTypeEnum) || "TAX_INVOICE",
    customer_name: billTo.name || inv.contact?.displayName || "Customer",
    customer_email: billTo.email || inv.contact?.email || "",
    customer_gstin: billTo.gstin || inv.contact?.taxNumber || "",
    customer_phone: billTo.phone || inv.contact?.phone || "",
    eway_bill_no: ewayBillNoFor(inv) || billTo.ewayBillNo || "",
    invoice_date: inv.invoiceDate ? new Date(inv.invoiceDate).toISOString() : new Date().toISOString(),
    valid_until: inv.dueDate ? new Date(inv.dueDate).toISOString() : null,
    reference: billTo.reference || "",
    status: inv.status as InvoiceStatus,
    discount: Number(inv.discount || 0),
    discount_type: "FIXED",
    subtotal: Number(inv.subtotal || 0),
    tax_amount: Number(inv.taxAmount || 0),
    total: Number(inv.total || 0),
    notes: inv.notes || "",
    terms_and_conditions: inv.terms || "",
    declaration: billTo.declaration || "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct.",
    signatory_name: billTo.signatoryName || tenantSettings.signatory_name || "Authorized Representative",
    signatory_designation: billTo.signatoryDesignation || tenantSettings.signatory_designation || "Authorized Signatory",
    signature_url: inv.signatureUrl || tenantSettings.signature_url || null,
    supplier_gstin: supplierGstin,
    supplier_state: supplierState,
    place_of_supply: placeOfSupply,
    supply_type: supplyType,
    tax_mode: regime.mode,
    tax_label: regime.taxLabel,
    tax_id_label: regime.taxIdLabel,
    invoice_title: regime.invoiceTitle,
    locale: regime.locale,
    zatca_tlv: zatcaTlv,
    pdf_url: inv.pdfUrl,
    tenant_id: inv.tenantId,
    contact_id: inv.contactId,
    currency_code: inv.currencyCode || regime.currencyCode,
    template_id: (billTo.templateId as InvoiceTemplateId) || (tenantSettings.invoice_template as InvoiceTemplateId) || "MODERN",
    is_tax_exempt: inv.isTaxExempt || false,
    tax_exemption_reason: inv.taxExemptionReason || null,
    tax_exemption_certificate: inv.taxExemptionCertificate || null,
    created_at: inv.createdAt ? new Date(inv.createdAt).toISOString() : new Date().toISOString(),
    updated_at: inv.updatedAt ? new Date(inv.updatedAt).toISOString() : new Date().toISOString(),
    invoice_line_items: (inv.items || []).map((li) => {
      // Lines are stored as "Product — details" (see lineDescription in invoices.ts)
      const text = String(li.description || "Item")
      const sep = text.indexOf(" — ")
      return {
      id: li.id,
      invoice_id: li.invoiceId,
      product_id: li.productId ?? null,
      product_name: sep > 0 ? text.slice(0, sep) : text,
      description: sep > 0 ? text.slice(sep + 3) : "",
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
      vat_percent: Number(li.vatRate || 0),
      vat_amount: Number(li.vatAmount || 0),
      tenant_id: inv.tenantId,
    }}),
    tenants: inv.tenant
      ? {
          id: inv.tenant.id,
          name: inv.tenant.name,
          subdomain: inv.tenant.domain,
          logo_url: inv.tenant.logoUrl,
          address: (inv.tenant.address ?? null) as TenantDB["address"],
          phone: inv.tenant.phone,
          email: inv.tenant.email,
          website: inv.tenant.website,
          fiscal_year_start: inv.tenant.fiscalYearStart || 4,
          settings: (inv.tenant.settings || {}) as Record<string, unknown>,
        }
      : undefined,
  }
}
