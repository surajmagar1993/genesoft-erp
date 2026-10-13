import { InvoiceDB } from "@/app/actions/sales/invoices"
import { computeInvoiceGstSummary, computeHsnSummary, SupplyType } from "@/lib/gst-engine"
import { COMPANY } from "@/lib/constants/company"

export interface TemplateProps {
    invoice: InvoiceDB
    showControls?: boolean
}

export function formatCurrency(amount: number, currency: string = "INR") {
    return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
        minimumFractionDigits: 2
    }).format(amount)
}

export function formatDate(dateStr: string | null | undefined) {
    if (!dateStr) return "—"
    try {
        return new Date(dateStr).toLocaleDateString("en-IN", {
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
        gstRate: li.cgst_percent + li.sgst_percent + li.igst_percent || li.tax_percent || 0,
        isExempt: li.is_exempt || false,
        hsnSac: li.hsn_sac || "—"
    }))

    const supplyType: SupplyType = invoice.supply_type === "inter" ? "inter" : "intra"

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
        isInterState: supplyType === "inter"
    }
}
