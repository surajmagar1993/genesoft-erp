import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createInvoice, getInvoiceById, type CreateInvoicePayload } from "@/app/actions/sales/invoices"
import { createQuote } from "@/app/actions/sales/quotes"
import { createCreditNote } from "@/app/actions/sales/credit-notes"
import { getTaxSummary } from "@/app/actions/finance/tax-summary"
import { trialBalance } from "@/lib/accounting-reports"
import { renderInvoicePdf } from "@/lib/pdf/renderInvoicePdf"
import { decodeZatcaTlv } from "@/lib/ksa-zatca-engine"
import { getTenantTaxContext } from "@/lib/tenant-tax"
import { actAs, createCustomer, createTestTenant } from "./helpers"

/**
 * Every signup country (plus "Other") end to end: the tax setup, an invoice
 * with a 10% document discount (taken off before tax), its journal, the Tax
 * Summary, a credit note, a quote for the same lines, and the PDF.
 */
type Case = {
    country: string
    currency: string
    settings?: Record<string, unknown>
    rate: number
    label: string
    taxIdLabel: string
    mode: "IN_GST" | "SINGLE"
    /** expected tax on a 900 taxable value */
    tax: number
    split?: { cgst: number; sgst: number } | { igst: number }
    placeOfSupply?: string
}

const CASES: Case[] = [
    { country: "IN", currency: "INR", settings: { gstin: "27AAAAA0000A1Z5", state: "Maharashtra" }, rate: 18, label: "GST", taxIdLabel: "GSTIN", mode: "IN_GST", tax: 162, split: { cgst: 81, sgst: 81 }, placeOfSupply: "Maharashtra" },
    { country: "IN", currency: "INR", settings: { gstin: "27AAAAA0000A1Z5", state: "Maharashtra" }, rate: 18, label: "GST", taxIdLabel: "GSTIN", mode: "IN_GST", tax: 162, split: { igst: 162 }, placeOfSupply: "Karnataka" },
    { country: "AE", currency: "AED", settings: { trn: "100000000000003" }, rate: 5, label: "VAT", taxIdLabel: "TRN", mode: "SINGLE", tax: 45 },
    { country: "SA", currency: "SAR", settings: { vat_number: "300000000000003" }, rate: 15, label: "VAT", taxIdLabel: "VAT No.", mode: "SINGLE", tax: 135 },
    { country: "GB", currency: "GBP", settings: { vat_number: "GB123456789" }, rate: 20, label: "VAT", taxIdLabel: "VAT Reg. No.", mode: "SINGLE", tax: 180 },
    { country: "US", currency: "USD", settings: { ein: "12-3456789", tax: { label: "Sales Tax", rates: [8.875], defaultRate: 8.875 } }, rate: 8.875, label: "Sales Tax", taxIdLabel: "EIN", mode: "SINGLE", tax: 79.88 },
    { country: "AU", currency: "AUD", settings: { abn: "51824753556" }, rate: 10, label: "GST", taxIdLabel: "ABN", mode: "SINGLE", tax: 90 },
    { country: "SG", currency: "SGD", settings: { tax_id: "M90312345A", tax: { label: "GST", rates: [9], defaultRate: 9 } }, rate: 9, label: "GST", taxIdLabel: "Tax ID", mode: "SINGLE", tax: 81 },
]

const blankGst = { cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, hsn_sac: "998313", description: "" }

function invoicePayload(c: Case, contactId: string): CreateInvoicePayload {
    return {
        invoice_number: `INV-${Math.random().toString(36).slice(2, 8)}`,
        customer_name: "Acme Buyer",
        customer_email: "",
        invoice_date: "2026-10-05",
        valid_until: "2026-10-31",
        reference: "",
        status: "SENT",
        discount: 10,
        discount_type: "PERCENT",
        notes: "",
        terms_and_conditions: "",
        supplier_gstin: "",
        customer_gstin: "",
        supplier_state: "",
        place_of_supply: c.placeOfSupply ?? "",
        // what a browser might send: the server must work out the real supply type itself
        supply_type: "intra",
        contact_id: contactId,
        line_items: [
            { ...blankGst, product_name: "Consulting", qty: 2, unit_price: 300, tax_percent: c.rate },
            { ...blankGst, product_name: "Support", qty: 1, unit_price: 400, tax_percent: c.rate },
        ],
    }
}

const num = (v: unknown) => Number(v ?? 0)

describe.each(CASES)("tax for $country ($currency, $rate%)$placeOfSupply", (c) => {
    it("tax setup, invoice, ledger, tax summary, credit note, quote and PDF all agree", async () => {
        const { tenant, user } = await createTestTenant({ country: c.country, currency: c.currency })
        await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: (c.settings ?? {}) as never } })
        actAs(user)

        // Tax setup
        const ctx = await getTenantTaxContext(tenant.id)
        expect(ctx.regime.mode).toBe(c.mode)
        expect(ctx.regime.taxLabel).toBe(c.label)
        expect(ctx.regime.taxIdLabel).toBe(c.taxIdLabel)
        expect(ctx.regime.standardRates).toContain(c.rate)
        expect(ctx.currency).toBe(c.currency)

        // Invoice: 1000 less 10% = 900 taxable
        const customer = await createCustomer(tenant.id)
        const created = await createInvoice(invoicePayload(c, customer.id))
        expect(created.error).toBeNull()
        const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: created.id! }, include: { items: true } })
        expect(inv.currencyCode).toBe(c.currency)
        expect(num(inv.taxAmount)).toBeCloseTo(c.tax, 2)
        expect(num(inv.total)).toBeCloseTo(900 + c.tax, 2)
        const sumItems = (k: "cgstAmount" | "sgstAmount" | "igstAmount" | "vatAmount") => inv.items.reduce((s, i) => s + num(i[k]), 0)
        if (c.mode === "SINGLE") {
            expect(sumItems("vatAmount")).toBeCloseTo(c.tax, 2)
            expect(sumItems("cgstAmount") + sumItems("sgstAmount") + sumItems("igstAmount")).toBe(0)
        } else if (c.split && "igst" in c.split) {
            expect(sumItems("igstAmount")).toBeCloseTo(c.split.igst, 2)
            expect(sumItems("cgstAmount") + sumItems("vatAmount")).toBe(0)
        } else if (c.split) {
            expect(sumItems("cgstAmount")).toBeCloseTo(c.split.cgst, 2)
            expect(sumItems("sgstAmount")).toBeCloseTo(c.split.sgst, 2)
            expect(sumItems("igstAmount") + sumItems("vatAmount")).toBe(0)
        }

        // Journal: AR debit = total, sales credit = 900, tax credit = tax, balanced
        const journal = await prisma.journalEntry.findFirstOrThrow({
            where: { tenantId: tenant.id, sourceId: inv.id, status: "POSTED" },
            include: { lines: { include: { account: true } } },
        })
        const debit = journal.lines.reduce((s, l) => s + num(l.debit), 0)
        const credit = journal.lines.reduce((s, l) => s + num(l.credit), 0)
        expect(debit).toBeCloseTo(credit, 2)
        expect(debit).toBeCloseTo(900 + c.tax, 2)
        const taxCredit = journal.lines.filter((l) => l.account.type === "LIABILITY").reduce((s, l) => s + num(l.credit), 0)
        expect(taxCredit).toBeCloseTo(c.tax, 2)
        const salesCredit = journal.lines.filter((l) => l.account.type === "REVENUE").reduce((s, l) => s + num(l.credit), 0)
        expect(salesCredit).toBeCloseTo(900, 2)
        if (c.mode === "SINGLE") {
            expect(journal.lines.some((l) => /CGST|SGST|IGST/.test(l.account.name))).toBe(false)
        }
        const tb = await trialBalance(tenant.id, "2026-12-31")
        expect(tb.totalDebit).toBeCloseTo(tb.totalCredit, 2)

        // Tax Summary for the period: taxable is after the discount, like the tax
        const summary = await getTaxSummary({ from: "2026-10-01", to: "2026-10-31" })
        expect(summary.countryCode).toBe(c.country)
        expect(summary.taxLabel).toBe(c.label)
        expect(summary.currency).toBe(c.currency)
        expect(summary.sales.tax).toBeCloseTo(c.tax, 2)
        expect(summary.sales.taxable).toBeCloseTo(900, 2)

        // Credit note for one Support line (400 at the same rate)
        const cn = await createCreditNote({ contactId: customer.id, invoiceId: inv.id, issueDate: "2026-10-10", reason: "GOODS_RETURN", items: [{ description: "Support", quantity: 1, unitPrice: 400, taxRate: c.rate }] })
        expect(cn).toMatchObject({ success: true })
        const note = await prisma.creditNote.findFirstOrThrow({ where: { tenantId: tenant.id } })
        expect(num(note.taxAmount)).toBeCloseTo(Math.round(400 * c.rate) / 100, 2)
        expect(note.currencyCode).toBe(c.currency)
        const after = await getTaxSummary({ from: "2026-10-01", to: "2026-10-31" })
        expect(after.creditNotes.tax).toBeCloseTo(num(note.taxAmount), 2)

        // A quote for the same lines and discount totals the same as the invoice
        const quote = await createQuote({
            quote_number: `QT-${Math.random().toString(36).slice(2, 8)}`, customer_name: "Acme Buyer", customer_email: "", quote_date: "2026-10-01",
            status: "DRAFT" as never, discount: 10, discount_type: "PERCENT", contact_id: customer.id, currency_code: c.currency,
            line_items: [{ product_name: "Consulting", qty: 2, unit_price: 300, tax_percent: c.rate }, { product_name: "Support", qty: 1, unit_price: 400, tax_percent: c.rate }],
        })
        expect(quote.error).toBeNull()
        const q = await prisma.quote.findUniqueOrThrow({ where: { id: quote.id! } })
        expect(q.currencyCode).toBe(c.currency)
        expect(num(q.taxAmount)).toBeCloseTo(c.tax, 2)
        expect(num(q.total)).toBeCloseTo(900 + c.tax, 2)

        // PDF: right labels; Saudi Arabia carries the ZATCA phase 1 QR with the invoice totals
        const db = (await getInvoiceById(inv.id))!
        expect(db.tax_label).toBe(c.label)
        expect(db.tax_id_label).toBe(c.taxIdLabel)
        if (c.country === "SA") {
            const tags = Object.fromEntries((decodeZatcaTlv(db.zatca_tlv!).tags || []).map((t: { tag: number; value: string }) => [t.tag, t.value]))
            expect(tags[2]).toBe("300000000000003")
            expect(tags[4]).toBe((900 + c.tax).toFixed(2))
            expect(tags[5]).toBe(c.tax.toFixed(2))
        } else {
            expect(db.zatca_tlv ?? null).toBeNull()
        }
        const pdf = await renderInvoicePdf(db)
        expect(pdf.subarray(0, 4).toString()).toBe("%PDF")
    }, 60000)
})

describe("a business with no country saved", () => {
    it("isn't treated as India", async () => {
        const { tenant } = await createTestTenant({ country: "SG", currency: "SGD" })
        await prisma.$executeRaw`update tenants set country_code = '' where id = ${tenant.id}::uuid`
        const ctx = await getTenantTaxContext(tenant.id)
        expect(ctx.regime.mode).toBe("SINGLE")
        expect(ctx.regime.taxLabel).not.toBe("GST")
        expect(ctx.currency).toBe("SGD")
    })
})
