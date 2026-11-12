import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createInvoice, updateInvoice, type CreateInvoicePayload } from "@/app/actions/sales/invoices"
import { createPayment } from "@/app/actions/finance/payments"
import { applyCreditToInvoice, createCreditNote, recordCreditNoteRefund, voidCreditNote } from "@/app/actions/sales/credit-notes"
import { createContact, updateContact } from "@/app/actions/crm/contacts"
import { actAs, createCustomer, createTestTenant } from "./helpers"

const line = { description: "", hsn_sac: "", cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0 }

function invoicePayload(contactId: string, over: Partial<CreateInvoicePayload> = {}): CreateInvoicePayload {
    return {
        invoice_number: "", customer_name: "Buyer", customer_email: "", invoice_date: "2026-09-05", valid_until: "",
        reference: "", status: "SENT", discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", supplier_gstin: "", customer_gstin: "",
        supplier_state: "", place_of_supply: "Maharashtra", supply_type: "intra", contact_id: contactId,
        line_items: [{ ...line, product_name: "Work", qty: 1, unit_price: 1000, tax_percent: 18 }],
        ...over,
    }
}
const note = (contactId: string, invoiceId: string | undefined, unitPrice = 500) =>
    createCreditNote({ contactId, invoiceId, reason: "GOODS_RETURN" as never, items: [{ description: "Return", quantity: 1, unitPrice, taxRate: 0 }] })

describe("money guards", () => {
    it("an invoice discount comes off before tax, on the saved invoice and its lines", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const res = await createInvoice(invoicePayload(customer.id, { discount: 10, discount_type: "PERCENT" }))
        expect(res.error).toBeNull()
        const inv = await prisma.invoice.findFirstOrThrow({ where: { id: res.id! }, include: { items: true } })
        expect({ subtotal: Number(inv.subtotal), discount: Number(inv.discount), tax: Number(inv.taxAmount), total: Number(inv.total) }).toEqual({ subtotal: 1000, discount: 100, tax: 162, total: 1062 })
        expect(Number(inv.items[0].cgstAmount) + Number(inv.items[0].sgstAmount)).toBe(162)
    })

    it("refuses bad invoice input and a status only payments can set", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const bad = (over: Partial<CreateInvoicePayload>) => createInvoice(invoicePayload(customer.id, over))
        expect((await bad({ line_items: [] })).error).toMatch(/at least one line/)
        expect((await bad({ line_items: [{ ...line, product_name: "X", qty: -2, unit_price: 100, tax_percent: 18 }] })).error).toMatch(/quantity above zero/)
        expect((await bad({ discount: 150, discount_type: "PERCENT" })).error).toMatch(/100%/)
        expect((await bad({ discount: 5000, discount_type: "FIXED" })).error).toMatch(/more than the total/)
        expect((await bad({ status: "PAID" as never })).error).toMatch(/Draft or Sent/)
        expect((await bad({ invoice_date: "not a date" })).error).toMatch(/valid date/)
        expect(await prisma.invoice.count({ where: { tenantId: tenant.id } })).toBe(0)
    })

    it("a typed invoice number that is taken is refused; an edit can't un-pay a paid invoice", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const first = await createInvoice(invoicePayload(customer.id, { invoice_number: "INV-TAKEN-1" }))
        expect(first.error).toBeNull()
        expect((await createInvoice(invoicePayload(customer.id, { invoice_number: "INV-TAKEN-1" }))).error).toMatch(/already used/)

        expect((await createPayment({ invoice_id: first.id!, contact_id: customer.id, amount: 1180, payment_date: "2026-09-10", payment_method: "CASH" })).error).toBeNull()
        expect((await updateInvoice({ ...invoicePayload(customer.id, { invoice_number: "INV-TAKEN-1", status: "DRAFT" }), id: first.id! })).error).toBeNull()
        expect((await prisma.invoice.findFirstOrThrow({ where: { id: first.id! } })).status).toBe("PAID")
    })

    it("a payment can't be more than what is left to pay, even when two arrive together", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const inv = await createInvoice(invoicePayload(customer.id)) // 1,180
        const pay = (amount: number) => createPayment({ invoice_id: inv.id!, contact_id: customer.id, amount, payment_date: "2026-09-10", payment_method: "BANK_TRANSFER" })
        expect((await pay(2000)).error).toMatch(/1180\.00 left to pay/)
        const both = await Promise.all([pay(800), pay(800)])
        expect(both.filter((r) => r.error === null)).toHaveLength(1)
        expect(both.find((r) => r.error)?.error).toMatch(/380\.00 left to pay/)
        expect((await pay(380)).error).toBeNull()
        expect((await prisma.invoice.findFirstOrThrow({ where: { id: inv.id! } })).status).toBe("PAID")
        expect((await pay(1)).error).toMatch(/0\.00 left to pay/)
    })

    it("credit notes: the business's currency, capped at the invoice, never applied or refunded twice", async () => {
        const { tenant, user } = await createTestTenant({ country: "AE", currency: "AED" })
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const inv = await createInvoice(invoicePayload(customer.id, { supply_type: "single", line_items: [{ ...line, product_name: "Work", qty: 1, unit_price: 1000, tax_percent: 0 }] }))
        expect(inv.error).toBeNull()

        // More credit than the invoice is worth is refused; bad lines too
        expect((await note(customer.id, inv.id!, 1500)).success).toBe(false)
        const badLine = await createCreditNote({ contactId: customer.id, reason: "GOODS_RETURN" as never, items: [{ description: "X", quantity: 0, unitPrice: 10, taxRate: 0 }] })
        expect(badLine).toMatchObject({ success: false, error: expect.stringMatching(/quantity above zero/) })

        const cn = await note(customer.id, inv.id!, 600)
        if (!cn.success) throw new Error(cn.error)
        expect((await prisma.creditNote.findFirstOrThrow({ where: { id: cn.data.id } })).currencyCode).toBe("AED")
        // 600 already credited: only 400 more can be
        expect((await note(customer.id, inv.id!, 500)).success).toBe(false)

        // Two applies of 400 at the same moment: one goes through (600 available, 1,000 due)
        const apply = () => applyCreditToInvoice({ creditNoteId: cn.data.id, invoiceId: inv.id!, amount: 400 })
        const applied = await Promise.all([apply(), apply()])
        expect(applied.filter((r) => r.success)).toHaveLength(1)
        const after = await prisma.creditNote.findFirstOrThrow({ where: { id: cn.data.id } })
        expect({ allocated: Number(after.allocatedAmount), remaining: Number(after.remainingBalance) }).toEqual({ allocated: 400, remaining: 200 })
        expect((await prisma.invoice.findFirstOrThrow({ where: { id: inv.id! } })).status).toBe("PARTIALLY_PAID")

        // The rest is refunded once; a second refund has nothing left
        expect((await recordCreditNoteRefund({ creditNoteId: cn.data.id, amount: 200, paymentMethod: "BANK_TRANSFER" } as never)).success).toBe(true)
        expect((await recordCreditNoteRefund({ creditNoteId: cn.data.id, amount: 200, paymentMethod: "BANK_TRANSFER" } as never)).success).toBe(false)
        expect((await prisma.creditNote.findFirstOrThrow({ where: { id: cn.data.id } })).status).toBe("REFUNDED")
        // A used note can't be voided
        expect((await voidCreditNote(cn.data.id)).success).toBe(false)
    })

    it("credit can't settle a draft invoice or another customer's", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const other = await createCustomer(tenant.id)
        const draft = await createInvoice(invoicePayload(customer.id, { status: "DRAFT" }))
        const theirs = await createInvoice(invoicePayload(other.id))
        const cn = await note(customer.id, undefined, 300)
        if (!cn.success) throw new Error(cn.error)
        expect(await applyCreditToInvoice({ creditNoteId: cn.data.id, invoiceId: draft.id!, amount: 100 })).toMatchObject({ success: false, error: expect.stringMatching(/draft invoice/) })
        expect(await applyCreditToInvoice({ creditNoteId: cn.data.id, invoiceId: theirs.id!, amount: 100 })).toMatchObject({ success: false, error: expect.stringMatching(/different customer/) })
    })

    it("a contact's balance comes only from the ledger; staff without Finance can't set a credit limit", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const created = await createContact({ display_name: "Opening Co", type: "COMPANY", balance: 750, credit_limit: 5000 } as never)
        expect(created.error).toBeNull()
        const c = await prisma.contact.findFirstOrThrow({ where: { id: created.id! } })
        expect(Number(c.balance)).toBe(750)
        expect(await prisma.ledgerEntry.count({ where: { tenantId: tenant.id, contactId: c.id, type: "OPENING_BALANCE" } })).toBe(1)

        // An edit that sends a different balance doesn't change it
        expect((await updateContact(c.id, { balance: 0, credit_limit: 9000 } as never)).error).toBeNull()
        const after = await prisma.contact.findFirstOrThrow({ where: { id: c.id } })
        expect(Number(after.balance)).toBe(750)
        expect(Number(after.creditLimit)).toBe(9000) // the workspace admin has full Finance access

        expect((await createContact({ type: "INDIVIDUAL" } as never)).error).toMatch(/name, a company name or an email/)
    })
})
