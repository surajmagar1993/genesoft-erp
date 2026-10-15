import { describe, expect, it } from "vitest"
import { mapPrismaInvoiceToDB } from "@/lib/invoice-mapper"
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf"
import { decodeZatcaTlv } from "@/lib/ksa-zatca-engine"
import { computeLineItemGst } from "@/lib/gst-engine"
import { resolveTaxRegime } from "@/lib/tax-jurisdiction"

const prismaInvoice = (country: string, currency: string, settings: Record<string, unknown>, item: Record<string, number>) => ({
    id: "inv-1",
    tenantId: "t1",
    contactId: "c1",
    invoiceNumber: "INV-1",
    type: "TAX_INVOICE",
    status: "SENT",
    invoiceDate: new Date("2026-10-01T10:00:00Z"),
    currencyCode: currency,
    subtotal: 1000,
    taxAmount: item.tax,
    total: 1000 + item.tax,
    billTo: { name: "Customer" },
    items: [{ id: "i1", invoiceId: "inv-1", description: "Service", quantity: 1, unitPrice: 1000, ...item }],
    tenant: { id: "t1", name: "Seller Co", countryCode: country, settings },
})

describe("invoices by country", () => {
    it("India: CGST+SGST split, GSTIN label, no QR", async () => {
        const db = mapPrismaInvoiceToDB(prismaInvoice("IN", "INR", { gstin: "29ABCDE1234F1Z5" }, { cgstRate: 9, sgstRate: 9, cgstAmount: 90, sgstAmount: 90, tax: 180 }))
        expect(db.supply_type).toBe("intra")
        expect(db.supplier_state).toBe("Karnataka") // from the GSTIN prefix
        expect(db.tax_id_label).toBe("GSTIN")
        expect(db.zatca_tlv).toBeNull()
        const pdf = await renderInvoicePdf(db)
        expect(pdf.subarray(0, 4).toString()).toBe("%PDF")
    }, 30000)

    it("Saudi Arabia: single VAT line and a ZATCA phase 1 QR with the right values", async () => {
        const db = mapPrismaInvoiceToDB(prismaInvoice("SA", "SAR", { vat_number: "300000000000003" }, { vatRate: 15, vatAmount: 150, tax: 150 }))
        expect(db.supply_type).toBe("single")
        expect(db.tax_label).toBe("VAT")
        expect(db.currency_code).toBe("SAR")
        const decoded = decodeZatcaTlv(db.zatca_tlv!)
        const values = Object.fromEntries((decoded.tags || []).map((t: { tag: number; value: string }) => [t.tag, t.value]))
        expect(values[1]).toBe("Seller Co")
        expect(values[2]).toBe("300000000000003")
        expect(values[4]).toBe("1150.00")
        expect(values[5]).toBe("150.00")
        const pdf = await renderInvoicePdf(db)
        expect(pdf.subarray(0, 4).toString()).toBe("%PDF")
    }, 30000)

    it("UK: VAT with the business's own rates when set; unknown country gets a generic setup, not India", () => {
        expect(resolveTaxRegime("GB").standardRates).toEqual([0, 5, 20])
        const other = resolveTaxRegime("SG", { tax: { label: "GST", rates: [9], defaultRate: 9 } }, "SGD")
        expect(other.mode).toBe("SINGLE")
        expect(other.taxLabel).toBe("GST")
        expect(other.standardRates).toEqual([0, 9])
        expect(other.currencyCode).toBe("SGD")
        expect(computeLineItemGst(1, 100, 9, "single")).toMatchObject({ vatAmount: 9, cgstAmount: 0, igstAmount: 0, lineTotal: 109 })
    })

    it("draws the business logo when it is in our storage, and ignores outside addresses", async () => {
        const logo = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAAECAYAAACp8Z5+AAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEklEQVQImWN4Xy/1HxkzkC4AAGEXKHFX160TAAAAAElFTkSuQmCC"
        const withLogo = mapPrismaInvoiceToDB({ ...prismaInvoice("IN", "INR", { gstin: "29ABCDE1234F1Z5" }, { cgstRate: 9, sgstRate: 9, cgstAmount: 90, sgstAmount: 90, tax: 180 }), tenant: { id: "t1", name: "Seller Co", countryCode: "IN", settings: {}, logoUrl: logo } } as never)
        const plain = mapPrismaInvoiceToDB(prismaInvoice("IN", "INR", { gstin: "29ABCDE1234F1Z5" }, { cgstRate: 9, sgstRate: 9, cgstAmount: 90, sgstAmount: 90, tax: 180 }))
        const a = await renderInvoicePdf(withLogo)
        const b = await renderInvoicePdf(plain)
        expect(a.subarray(0, 4).toString()).toBe("%PDF")
        expect(a.toString("latin1")).toContain("/Subtype /Image")
        expect(b.toString("latin1")).not.toContain("/Subtype /Image")
        // An address someone typed in is never fetched
        const outside = mapPrismaInvoiceToDB({ ...prismaInvoice("IN", "INR", { gstin: "29ABCDE1234F1Z5" }, { cgstRate: 9, sgstRate: 9, cgstAmount: 90, sgstAmount: 90, tax: 180 }), tenant: { id: "t1", name: "Seller Co", countryCode: "IN", settings: {}, logoUrl: "http://169.254.169.254/latest" } } as never)
        expect((await renderInvoicePdf(outside)).toString("latin1")).not.toContain("/Subtype /Image")
    }, 30000)
})
