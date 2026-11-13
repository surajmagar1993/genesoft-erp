import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createRecurringProfile, triggerGenerateInvoice } from "@/app/actions/sales/recurring-invoices"
import { actAs, createTestTenant } from "./helpers"

const num = (v: unknown) => Number(v ?? 0)

async function generate(country: string, currency: string, contact: { billingAddress?: object; gstin?: string }, settings: Record<string, unknown>) {
    const { tenant, user } = await createTestTenant({ country, currency })
    await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: settings as never } })
    actAs(user)
    const customer = await prisma.contact.create({ data: { tenantId: tenant.id, displayName: "Retainer Client", ...contact } as never })
    const created = await createRecurringProfile({
        title: "Monthly retainer",
        contactId: customer.id,
        frequency: "MONTHLY" as never,
        startDate: "2026-10-01",
        autoApprove: true,
        items: [
            { description: "Retainer", quantity: 1, unitPrice: 1000, taxRate: country === "IN" ? 18 : 5, discount: 100 },
            { description: "Hosting", quantity: 2, unitPrice: 250, taxRate: country === "IN" ? 18 : 5 },
        ],
    })
    expect(created).toMatchObject({ success: true })
    const profile = await prisma.recurringProfile.findFirstOrThrow({ where: { tenantId: tenant.id } })
    const run = await triggerGenerateInvoice(profile.id)
    expect(run).toMatchObject({ success: true })
    const invoice = await prisma.invoice.findFirstOrThrow({ where: { tenantId: tenant.id, recurringProfileId: profile.id }, include: { items: true } })
    const lineTax = invoice.items.reduce((s, i) => s + num(i.cgstAmount) + num(i.sgstAmount) + num(i.igstAmount) + num(i.vatAmount), 0)
    return { tenant, invoice, lineTax }
}

describe("invoices made from a recurring profile", () => {
    it("India, customer in another state: IGST, the line discount comes off before tax, header = lines", async () => {
        const { invoice, lineTax } = await generate("IN", "INR", { billingAddress: { state: "Karnataka" } }, { gstin: "27AAAAA0000A1Z5", state: "Maharashtra" })
        // taxable 900 + 500 = 1400, 18% = 252
        expect(invoice.items.every((i) => num(i.cgstAmount) === 0 && num(i.igstAmount) > 0)).toBe(true)
        expect(lineTax).toBeCloseTo(252, 2)
        expect(num(invoice.subtotal)).toBe(1500)
        expect(num(invoice.discount)).toBe(100)
        expect(num(invoice.taxAmount)).toBeCloseTo(252, 2)
        expect(num(invoice.total)).toBeCloseTo(1652, 2)
        expect(invoice.placeOfSupply).toBe("Karnataka")
    })

    it("India, customer in the same state (from the GSTIN): CGST + SGST", async () => {
        const { invoice, lineTax } = await generate("IN", "INR", { gstin: "27BBBBB1111B1Z5" }, { gstin: "27AAAAA0000A1Z5", state: "Maharashtra" })
        expect(invoice.items.every((i) => num(i.igstAmount) === 0 && num(i.cgstAmount) > 0)).toBe(true)
        expect(lineTax).toBeCloseTo(252, 2)
    })

    it("UAE: one VAT line, no Indian split, no made-up HSN code", async () => {
        const { invoice, lineTax } = await generate("AE", "AED", {}, { trn: "100000000000003" })
        expect(invoice.currencyCode).toBe("AED")
        expect(invoice.items.every((i) => num(i.cgstAmount) + num(i.sgstAmount) + num(i.igstAmount) === 0)).toBe(true)
        expect(lineTax).toBeCloseTo(70, 2) // 5% of 1400
        expect(num(invoice.total)).toBeCloseTo(1470, 2)
        expect(invoice.items.every((i) => !i.hsnSacCode)).toBe(true)
        // the journal for it balances and carries the same tax
        const journal = await prisma.journalEntry.findFirstOrThrow({ where: { sourceId: invoice.id, status: "POSTED" }, include: { lines: true } })
        const dr = journal.lines.reduce((s, l) => s + num(l.debit), 0)
        const cr = journal.lines.reduce((s, l) => s + num(l.credit), 0)
        expect(dr).toBeCloseTo(cr, 2)
        expect(dr).toBeCloseTo(1470, 2)
    })
})
