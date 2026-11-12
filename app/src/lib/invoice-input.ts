/**
 * Checks on what the browser sends for an invoice, quote-style document or
 * bill before any money is computed from it. Returns a message for the user,
 * or null when the input is usable.
 */

const MAX_LINES = 500
const MAX_AMOUNT = 1e12

export interface DocumentLineInput {
    qty: unknown
    unit_price: unknown
}

export function documentLinesError(lines: DocumentLineInput[] | undefined | null): string | null {
    if (!Array.isArray(lines) || lines.length === 0) return "Add at least one line item."
    if (lines.length > MAX_LINES) return `An invoice can have up to ${MAX_LINES} lines.`
    for (const [i, line] of lines.entries()) {
        const qty = Number(line.qty)
        const price = Number(line.unit_price)
        if (typeof line.qty !== "number" || !Number.isFinite(qty) || qty <= 0) return `Line ${i + 1}: enter a quantity above zero.`
        if (typeof line.unit_price !== "number" || !Number.isFinite(price) || price < 0) return `Line ${i + 1}: enter a price of zero or more.`
        if (qty * price > MAX_AMOUNT) return `Line ${i + 1}: the amount is too large.`
    }
    return null
}

export function documentDiscountError(
    lines: DocumentLineInput[],
    discount: unknown,
    discountType: "PERCENT" | "FIXED" | undefined | null
): string | null {
    if (discount === undefined || discount === null || discount === 0) return null
    const value = Number(discount)
    if (typeof discount !== "number" || !Number.isFinite(value) || value < 0) return "Enter a discount of zero or more."
    if ((discountType || "PERCENT") === "PERCENT") {
        if (value > 100) return "A discount can't be more than 100%."
        return null
    }
    const subtotal = lines.reduce((sum, l) => sum + Number(l.qty) * Number(l.unit_price), 0)
    if (value > subtotal + 0.005) return "The discount can't be more than the total of the lines."
    return null
}

export function documentDateError(value: unknown, label: string, required: boolean): string | null {
    if (value === undefined || value === null || value === "") return required ? `Enter the ${label}.` : null
    return Number.isNaN(new Date(String(value)).getTime()) ? `The ${label} isn't a valid date.` : null
}

/** Statuses a person may pick on the form; paid/overdue come from payments and due dates. */
const TAX_INVOICE_FORM_STATUSES = ["DRAFT", "SENT"]
const PROFORMA_FORM_STATUSES = ["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"]

export function invoiceFormStatuses(isProforma: boolean): string[] {
    return isProforma ? PROFORMA_FORM_STATUSES : TAX_INVOICE_FORM_STATUSES
}

/**
 * The status to save. A new tax invoice is Draft or Sent. On an edit, a status
 * that payments or due dates decided (Paid, Partially paid, Overdue, Viewed,
 * Cancelled) is kept, whatever the form sent; a Draft or Sent one may be cancelled.
 */
export function resolveInvoiceStatus(input: { requested: string | undefined | null; isProforma: boolean; current?: string | null }): { status: string } | { error: string } {
    const allowed = invoiceFormStatuses(input.isProforma)
    const requested = input.requested || "DRAFT"
    // Paid, partially paid, overdue and viewed are decided elsewhere; a cancelled invoice can be reopened
    if (input.current && !allowed.includes(input.current) && input.current !== "CANCELLED") return { status: input.current }
    // An invoice nobody has paid yet can be cancelled from an edit
    if (input.current && requested === "CANCELLED") return { status: "CANCELLED" }
    if (!allowed.includes(requested)) {
        return { error: input.isProforma ? "Choose a valid status." : "An invoice is saved as Draft or Sent. Record a payment to mark it paid." }
    }
    return { status: requested }
}
