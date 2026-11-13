import { getTenantTaxContext, invoiceItemTaxColumns, supplyTypeFor, type TenantTaxContext } from "@/lib/tenant-tax"
import { getStateNameFromCode } from "@/lib/gst-returns-engine"
import { invoiceDiscountFraction, isValidGstin, roundMoney } from "@/lib/gst-engine"

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

export async function buildInvoiceLines(
    tenantId: string,
    lines: InvoiceLineInput[],
    placeOfSupply?: string | null,
    /** A document discount (e.g. the sales order's), taken off before tax like on invoices */
    docDiscount?: { discount?: number; discountType?: "PERCENT" | "FIXED" | string | null }
) {
    const ctx: TenantTaxContext = await getTenantTaxContext(tenantId)
    const supplyType = supplyTypeFor(ctx, ctx.supplierState, placeOfSupply || ctx.supplierState)
    const parsed = lines.map((l) => {
        const qty = Number(l.quantity)
        const unitPrice = Number(l.unitPrice)
        if (!(qty > 0)) throw new Error(`Quantity must be greater than zero (${l.description})`)
        if (!(unitPrice >= 0)) throw new Error(`Price can't be negative (${l.description})`)
        return { l, qty, unitPrice }
    })
    const fraction = invoiceDiscountFraction(
        parsed.map((p) => ({ qty: p.qty, unitPrice: p.unitPrice })),
        Number(docDiscount?.discount || 0),
        docDiscount?.discountType === "PERCENT" ? "PERCENT" : "FIXED"
    )
    const items = parsed.map(({ l, qty, unitPrice }) => {
        const rate = l.taxRate ?? ctx.regime.defaultRate
        return {
            productId: l.productId || null,
            description: l.description,
            hsnSacCode: l.hsnSacCode || null,
            quantity: qty,
            unitPrice,
            ...invoiceItemTaxColumns(qty, unitPrice, rate, supplyType, fraction),
        }
    })
    const subtotal = roundMoney(items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))
    const taxAmount = roundMoney(items.reduce((s, i) => s + i.cgstAmount + i.sgstAmount + i.igstAmount + i.vatAmount, 0))
    const discount = roundMoney(subtotal * fraction)
    const total = roundMoney(subtotal - discount + taxAmount)
    return { items, subtotal, taxAmount, discount, total, currencyCode: ctx.currency, supplyType }
}

/** A customer's state for place of supply: from their GSTIN, else their billing address. */
export function contactPlaceOfSupply(contact: { gstin?: string | null; billingAddress?: unknown } | null | undefined): string | null {
    if (!contact) return null
    // Only a real Indian GSTIN gives a state (a TRN, ABN or VAT number can start with two digits too)
    const gstin = String(contact.gstin || "").trim().toUpperCase()
    if (gstin && isValidGstin(gstin)) {
        const name = getStateNameFromCode(gstin.slice(0, 2))
        if (name && name !== "Other State") return name
    }
    const addr = (contact.billingAddress || {}) as { state?: unknown }
    return typeof addr.state === "string" && addr.state.trim() ? addr.state.trim() : null
}
