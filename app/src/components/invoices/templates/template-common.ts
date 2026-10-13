import { InvoiceDB } from "@/app/actions/sales/invoices"
import { computeInvoiceGstSummary, computeHsnSummary, SupplyType } from "@/lib/gst-engine"
import { COMPANY } from "@/lib/constants/company"
import { localeForCurrency } from "@/lib/utils"

export interface TemplateProps {
    invoice: InvoiceDB
    showControls?: boolean
}

export function formatCurrency(amount: number, currency: string = "INR") {
    return new Intl.NumberFormat(localeForCurrency(currency), {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    }).format(amount)
}

export function formatDate(dateStr: string | null | undefined, locale = "en-IN") {
    if (!dateStr) return "—"
    try {
        return new Date(dateStr).toLocaleDateString(locale, {
            day: "2-digit",
            month: "short",
            year: "numeric"
        })
    } catch {
        return dateStr
    }
}

export function getInvoiceSummary(invoice: InvoiceDB) {
    const items = invoice.invoice_line_items ?? []
    const lineItemsForGst = items.map((li) => ({
        qty: li.qty,
        unitPrice: li.unit_price,
        gstRate: li.cgst_percent + li.sgst_percent + li.igst_percent + (li.vat_percent || 0) || li.tax_percent || 0,
        isExempt: li.is_exempt || false,
        hsnSac: li.hsn_sac || "—"
    }))

    const supplyType: SupplyType = invoice.supply_type === "single" ? "single" : invoice.supply_type === "inter" ? "inter" : "intra"

    const gstSummary = computeInvoiceGstSummary(
        lineItemsForGst,
        supplyType,
        invoice.discount,
        invoice.discount_type || "FIXED",
        {
            isTaxExempt: invoice.is_tax_exempt,
            taxExemptionReason: invoice.tax_exemption_reason || undefined,
            taxExemptionCertificate: invoice.tax_exemption_certificate || undefined
        }
    )

    const hsnSummary = computeHsnSummary(lineItemsForGst, supplyType)

    const companyName = invoice.tenants?.name || COMPANY.name
    const companyGstin = invoice.supplier_gstin || COMPANY.gstin
    const companyAddress = typeof invoice.tenants?.address === "string" 
        ? invoice.tenants.address 
        : (invoice.tenants?.address?.street 
            ? `${invoice.tenants.address.street}, ${invoice.tenants.address.city || ""}, ${invoice.tenants.address.state || ""}` 
            : COMPANY.address)
    const companyPhone = invoice.tenants?.phone || ""
    const companyEmail = invoice.tenants?.email || ""

    return {
        items,
        gstSummary,
        hsnSummary,
        supplyType,
        companyName,
        companyGstin,
        companyAddress,
        companyPhone,
        companyEmail,
        isInterState: supplyType === "inter",
        // Country tax setup: outside India there's one VAT / GST / sales tax line
        isSingle: supplyType === "single",
        taxLabel: invoice.tax_label || "GST",
        taxIdLabel: invoice.tax_id_label || "GSTIN",
        docTitle: invoice.type === "PROFORMA" ? "PROFORMA INVOICE" : (invoice.invoice_title || "Tax Invoice").toUpperCase(),
    }
}
