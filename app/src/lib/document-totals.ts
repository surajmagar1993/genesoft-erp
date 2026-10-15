/**
 * Quote / sales order lines → line totals and header totals, worked out on
 * the server (browser totals are never trusted). line_total is before tax,
 * as the screens show it; the header total is subtotal + tax − discount.
 */
export interface DocumentLineInput {
    product_name: string
    description?: string | null
    qty: number
    unit_price: number
    tax_percent: number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function documentTotals(lines: DocumentLineInput[], discount: number, discountType: "PERCENT" | "FIXED") {
    let subtotal = 0
    let taxAmount = 0
    const items = lines.map((li, i) => {
        const qty = Number(li.qty)
        const price = Number(li.unit_price)
        const rate = Number(li.tax_percent ?? 0)
        if (!li.product_name?.trim()) throw new Error(`Line ${i + 1}: enter an item name`)
        if (!Number.isFinite(qty) || qty <= 0) throw new Error(`Line ${i + 1}: quantity must be more than 0`)
        if (!Number.isFinite(price) || price < 0) throw new Error(`Line ${i + 1}: price must be zero or more`)
        if (!Number.isFinite(rate) || rate < 0 || rate > 100) throw new Error(`Line ${i + 1}: tax must be between 0 and 100%`)
        const lineTotal = round2(qty * price)
        subtotal += lineTotal
        taxAmount += lineTotal * (rate / 100)
        return { product_name: li.product_name, description: li.description || null, qty, unit_price: price, tax_percent: rate, line_total: lineTotal }
    })
    const d = Number(discount || 0)
    if (!Number.isFinite(d) || d < 0) throw new Error("Discount must be zero or more")
    const discountValue = discountType === "PERCENT" ? subtotal * (Math.min(d, 100) / 100) : d
    return { items, subtotal: round2(subtotal), taxAmount: round2(taxAmount), total: round2(subtotal + taxAmount - discountValue) }
}
