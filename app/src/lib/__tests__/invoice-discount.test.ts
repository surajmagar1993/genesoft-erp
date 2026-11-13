import { describe, expect, it } from "vitest"
import { computeHsnSummary, computeInvoiceGstSummary, computeLineItemGst, invoiceDiscountFraction } from "@/lib/gst-engine"
import { documentDiscountError, documentLinesError, resolveInvoiceStatus } from "@/lib/invoice-input"

describe("a document discount comes off before tax", () => {
    const lines = [{ qty: 1, unitPrice: 1000, gstRate: 18 }]

    it("10% off a 1,000 line at 18%: tax 162, total 1,062 (not 180 / 1,080)", () => {
        const s = computeInvoiceGstSummary(lines, "intra", 10, "PERCENT")
        expect(s).toMatchObject({ subtotal: 1000, discountAmount: 100, cgstTotal: 81, sgstTotal: 81, totalTax: 162, grandTotal: 1062 })
    })

    it("a fixed discount gives the same result as the matching percentage", () => {
        const fixed = computeInvoiceGstSummary(lines, "single", 100, "FIXED")
        expect(fixed).toMatchObject({ discountAmount: 100, vatTotal: 162, grandTotal: 1062 })
    })

    it("line tax amounts add up to the document's tax", () => {
        const items = [{ qty: 3, unitPrice: 333.33, gstRate: 18 }, { qty: 2, unitPrice: 50, gstRate: 5 }]
        const f = invoiceDiscountFraction(items, 7.5, "PERCENT")
        const lineTax = items.reduce((sum, l) => sum + computeLineItemGst(l.qty, l.unitPrice, l.gstRate, "inter", f).totalTaxAmount, 0)
        expect(computeInvoiceGstSummary(items, "inter", 7.5, "PERCENT").totalTax).toBeCloseTo(lineTax, 2)
    })

    it("no discount leaves the figures as before", () => {
        expect(computeInvoiceGstSummary(lines, "intra", 0, "PERCENT")).toMatchObject({ totalTax: 180, grandTotal: 1180 })
    })

    it("a discount can't go below zero or above the lines' total", () => {
        expect(computeInvoiceGstSummary(lines, "intra", -50, "FIXED")).toMatchObject({ discountAmount: 0, grandTotal: 1180 })
        expect(computeInvoiceGstSummary(lines, "intra", 5000, "FIXED")).toMatchObject({ discountAmount: 1000, totalTax: 0, grandTotal: 0 })
        expect(computeInvoiceGstSummary(lines, "intra", 250, "PERCENT")).toMatchObject({ discountAmount: 1000, grandTotal: 0 })
    })

    it("the HSN summary shows the value tax was charged on", () => {
        const [row] = computeHsnSummary([{ ...lines[0], hsnSac: "8471" }], "intra", 0.1)
        expect(row).toMatchObject({ taxableAmount: 900, cgstAmount: 81, sgstAmount: 81 })
    })
})

describe("invoice input checks", () => {
    it("rejects empty, negative and non-numeric lines", () => {
        expect(documentLinesError([])).toMatch(/at least one/)
        expect(documentLinesError([{ qty: -1, unit_price: 10 }])).toMatch(/Line 1: enter a quantity/)
        expect(documentLinesError([{ qty: 1, unit_price: 10 }, { qty: 1, unit_price: Number.NaN }])).toMatch(/Line 2: enter a price/)
        expect(documentLinesError([{ qty: "2" as unknown as number, unit_price: 10 }])).toMatch(/quantity/)
        expect(documentLinesError([{ qty: 2, unit_price: 0 }])).toBeNull()
    })

    it("rejects discounts over 100% or over the lines' total", () => {
        const lines = [{ qty: 2, unit_price: 50 }]
        expect(documentDiscountError(lines, 101, "PERCENT")).toMatch(/100%/)
        expect(documentDiscountError(lines, 100.01, "FIXED")).toMatch(/more than the total/)
        expect(documentDiscountError(lines, -1, "FIXED")).toMatch(/zero or more/)
        expect(documentDiscountError(lines, 100, "FIXED")).toBeNull()
    })

    it("a new invoice is Draft or Sent; a paid invoice stays paid when edited", () => {
        expect(resolveInvoiceStatus({ requested: "PAID", isProforma: false })).toHaveProperty("error")
        expect(resolveInvoiceStatus({ requested: "ACCEPTED", isProforma: false })).toHaveProperty("error")
        expect(resolveInvoiceStatus({ requested: "ACCEPTED", isProforma: true })).toEqual({ status: "ACCEPTED" })
        expect(resolveInvoiceStatus({ requested: "DRAFT", isProforma: false, current: "PAID" })).toEqual({ status: "PAID" })
        expect(resolveInvoiceStatus({ requested: "SENT", isProforma: false, current: "DRAFT" })).toEqual({ status: "SENT" })
    })
})

describe("money rounding", () => {
    it("rounds half a cent up, even where the float sits just below it", async () => {
        const { roundMoney, computeLineItemGst } = await import("@/lib/gst-engine")
        expect((47.925).toFixed(2)).toBe("47.92") // the float trap roundMoney avoids
        expect(roundMoney(47.925)).toBe(47.93)
        expect(roundMoney(1.005)).toBe(1.01)
        expect(roundMoney(0.1 + 0.2)).toBe(0.3)
        expect(roundMoney(-2.675)).toBe(-2.68)
        expect(computeLineItemGst(1, 540, 8.875, "single").vatAmount).toBe(47.93)
    })
})

describe("money rounding on large amounts", () => {
    it("keeps the cents up to the largest Decimal(15,2) value", async () => {
        const { roundMoney } = await import("@/lib/gst-engine")
        expect(roundMoney(10000000000.07)).toBe(10000000000.07)
        expect(roundMoney(99999999999.99)).toBe(99999999999.99)
        expect(roundMoney(9999999999999.99)).toBe(9999999999999.99)
    })
})
