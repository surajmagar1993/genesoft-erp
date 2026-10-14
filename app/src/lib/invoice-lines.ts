import { getTenantTaxContext, invoiceItemTaxColumns, supplyTypeFor, type TenantTaxContext } from "@/lib/tenant-tax"
import { getStateNameFromCode } from "@/lib/gst-returns-engine"

/**
 * Builds invoice line items and totals with the business's own tax rules
 * (India: CGST+SGST in-state or IGST; elsewhere one VAT/GST/sales-tax line).
 * Shared by every flow that turns another document into an invoice.
 */
export interface InvoiceLineInput {
    description: string
    quantity: number
    unitPrice: number
    /** Tax rate in %; defaults to the business's standard rate */
    taxRate?: number
    hsnSacCode?: string | null
    productId?: string | null
}

export async function buildInvoiceLines(tenantId: string, lines: InvoiceLineInput[], placeOfSupply?: string | null) {
    const ctx: TenantTaxContext = await getTenantTaxContext(tenantId)
    const supplyType = supplyTypeFor(ctx, ctx.supplierState, placeOfSupply || ctx.supplierState)
    const round = (n: number) => Math.round(n * 100) / 100
    const items = lines.map((l) => {
        const qty = Number(l.quantity)
        const unitPrice = Number(l.unitPrice)
        if (!(qty > 0)) throw new Error(`Quantity must be greater than zero (${l.description})`)
        if (!(unitPrice >= 0)) throw new Error(`Price can't be negative (${l.description})`)
        const rate = l.taxRate ?? ctx.regime.defaultRate
        return {
            productId: l.productId || null,
            description: l.description,
            hsnSacCode: l.hsnSacCode || null,
            quantity: qty,
            unitPrice,
            ...invoiceItemTaxColumns(qty, unitPrice, rate, supplyType),
        }
    })
    const subtotal = round(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))
    const total = round(items.reduce((s, i) => s + i.lineTotal, 0))
    return { items, subtotal, taxAmount: round(total - subtotal), total, currencyCode: ctx.currency, supplyType }
}

/** A customer's state for place of supply: from their GSTIN, else their billing address. */
export function contactPlaceOfSupply(contact: { gstin?: string | null; billingAddress?: unknown } | null | undefined): string | null {
    if (!contact) return null
    const gstin = String(contact.gstin || "")
    if (/^\d{2}/.test(gstin)) {
        const name = getStateNameFromCode(gstin.slice(0, 2))
        if (name) return name
    }
    const addr = (contact.billingAddress || {}) as { state?: unknown }
    return typeof addr.state === "string" && addr.state.trim() ? addr.state.trim() : null
}
