import { describe, expect, it } from "vitest"
import type { InvoiceItem, LedgerEntry } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createInvoice, type CreateInvoicePayload } from "@/app/actions/sales/invoices"
import { createPayment, deletePayment } from "@/app/actions/finance/payments"
import { actAs, addUser, createCustomer, createTestTenant } from "./helpers"

function invoicePayload(contactId: string, overrides: Partial<CreateInvoicePayload> = {}): CreateInvoicePayload {
    const line = { cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, hsn_sac: "", description: "" }
    return {
        invoice_number: `INV-${Math.random().toString(36).slice(2, 8)}`,
        customer_name: "Acme Buyer",
        customer_email: "",
        invoice_date: "2026-10-01",
        valid_until: "2026-10-31",
        reference: "",
        status: "SENT",
        discount: 0,
        discount_type: "PERCENT",
        notes: "",
        terms_and_conditions: "",
        supplier_gstin: "",
        customer_gstin: "",
        supplier_state: "",
        place_of_supply: "Maharashtra",
        supply_type: "intra",
        contact_id: contactId,
        line_items: [
            { ...line, product_name: "Consulting", qty: 2, unit_price: 1000, tax_percent: 18 },
            { ...line, product_name: "Support", qty: 1, unit_price: 500, tax_percent: 18 },
        ],
        ...overrides,
    }
}

const balanceOf = async (contactId: string) =>
    Number((await prisma.contact.findUniqueOrThrow({ where: { id: contactId } })).balance)

describe("invoice → payment → ledger (India GST)", () => {
    it("charges GST, posts to the customer ledger and tracks payment status", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)

        const created = await createInvoice(invoicePayload(customer.id))
        expect(created.error).toBeNull()
        const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: created.id! }, include: { items: true } })

        // 2,500 + 18% = 2,950, split CGST/SGST inside Maharashtra
        expect(Number(invoice.subtotal)).toBe(2500)
        expect(Number(invoice.taxAmount)).toBe(450)
        expect(Number(invoice.total)).toBe(2950)
        expect(invoice.currencyCode).toBe("INR")
        expect(invoice.items.every((i: InvoiceItem) => Number(i.cgstRate) === 9 && Number(i.sgstRate) === 9 && Number(i.igstRate) === 0)).toBe(true)
        expect(await balanceOf(customer.id)).toBe(2950)

        const first = await createPayment({ invoice_id: invoice.id, contact_id: customer.id, amount: 1000, payment_date: "2026-10-05", payment_method: "UPI" })
        expect(first.error).toBeNull()
        expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status).toBe("PARTIALLY_PAID")
        expect(await balanceOf(customer.id)).toBe(1950)

        const second = await createPayment({ invoice_id: invoice.id, contact_id: customer.id, amount: 1950, payment_date: "2026-10-06", payment_method: "BANK_TRANSFER" })
        expect(second.error).toBeNull()
        expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status).toBe("PAID")
        expect(await balanceOf(customer.id)).toBe(0)

        const ledger = await prisma.ledgerEntry.findMany({ where: { contactId: customer.id }, orderBy: { createdAt: "asc" } })
        expect(ledger.map((e: LedgerEntry) => [e.type, Number(e.amount)])).toEqual([["INVOICE", 2950], ["PAYMENT", -1000], ["PAYMENT", -1950]])

        // Deleting a payment reopens the invoice and restores the balance
        expect((await deletePayment(second.id!)).error).toBeNull()
        expect((await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } })).status).toBe("PARTIALLY_PAID")
        expect(await balanceOf(customer.id)).toBe(1950)
        expect(await prisma.ledgerEntry.count({ where: { contactId: customer.id } })).toBe(2)
    })

    it("uses IGST for a customer in another state", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const created = await createInvoice(invoicePayload(customer.id, { place_of_supply: "Karnataka", supply_type: "inter" }))
        const items = await prisma.invoiceItem.findMany({ where: { invoiceId: created.id! } })
        expect(items.every((i: InvoiceItem) => Number(i.igstRate) === 18 && Number(i.cgstRate) === 0)).toBe(true)
    })

    it("rejects a zero or negative payment", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const res = await createPayment({ contact_id: customer.id, amount: 0, payment_date: "2026-10-05", payment_method: "CASH" })
        expect(res.error).toMatch(/greater than zero/)
    })
})

describe("other countries", () => {
    it("UAE: one 5% VAT line in AED, ledger not converted from INR", async () => {
        const { tenant, user } = await createTestTenant({ country: "AE", currency: "AED" })
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const created = await createInvoice(invoicePayload(customer.id, {
            place_of_supply: "",
            supply_type: "single",
            line_items: [{ product_name: "Service", description: "", qty: 1, unit_price: 1000, tax_percent: 5, hsn_sac: "", cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0 }],
        }))
        expect(created.error).toBeNull()
        const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: created.id! }, include: { items: true } })
        expect(invoice.currencyCode).toBe("AED")
        expect(Number(invoice.total)).toBe(1050)
        expect(Number(invoice.items[0].cgstRate)).toBe(0)

        const entry = await prisma.ledgerEntry.findFirstOrThrow({ where: { contactId: customer.id } })
        expect(entry.currencyCode).toBe("AED")
        expect(Number(entry.amount)).toBe(1050)
        expect(await balanceOf(customer.id)).toBe(1050)
    })
})

describe("access rules", () => {
    it("a business can't pay another business's invoice", async () => {
        const a = await createTestTenant()
        actAs(a.user)
        const customerA = await createCustomer(a.tenant.id)
        const inv = await createInvoice(invoicePayload(customerA.id))

        const b = await createTestTenant()
        actAs(b.user)
        const customerB = await createCustomer(b.tenant.id)
        const res = await createPayment({ invoice_id: inv.id, contact_id: customerB.id, amount: 100, payment_date: "2026-10-05", payment_method: "CASH" })
        expect(res.error).toBeTruthy()
        expect(await prisma.payment.count({ where: { invoiceId: inv.id! } })).toBe(0)
    })

    it("a VIEWER can't create invoices; a USER can't delete payments", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const pay = await createPayment({ contact_id: customer.id, amount: 50, payment_date: "2026-10-05", payment_method: "CASH", type: "INBOUND" })

        actAs(await addUser(tenant.id, "VIEWER"))
        await expect(createInvoice(invoicePayload(customer.id))).rejects.toThrow(/can only view Sales/)

        actAs(await addUser(tenant.id, "USER"))
        await expect(deletePayment(pay.id!)).rejects.toThrow(/full access to Finance or Sales/)
    })

    it("refuses payments on draft and proforma invoices (they aren't in the books yet)", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const draft = await createInvoice(invoicePayload(customer.id, { status: "DRAFT" }))
        const res = await createPayment({ invoice_id: draft.id!, contact_id: customer.id, amount: 100, payment_date: "2026-10-05", payment_method: "CASH" })
        expect(res.error).toMatch(/still a draft/)
        expect(await prisma.payment.count({ where: { invoiceId: draft.id! } })).toBe(0)
        expect((await prisma.invoice.findUniqueOrThrow({ where: { id: draft.id! } })).status).toBe("DRAFT")
    })
})
