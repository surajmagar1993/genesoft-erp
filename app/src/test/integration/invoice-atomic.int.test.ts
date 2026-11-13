import { describe, expect, it, vi } from "vitest"

// The ledger step fails on demand: the whole save must roll back
const failLedger = { on: false }
vi.mock("@/lib/ledger", async (importOriginal) => {
    const real = await importOriginal<typeof import("@/lib/ledger")>()
    return {
        ...real,
        syncLedgerIn: async (...args: Parameters<typeof real.syncLedgerIn>) => {
            if (failLedger.on) throw new TypeError("ledger exploded")
            return real.syncLedgerIn(...args)
        },
    }
})

import { prisma } from "@/lib/prisma"
import { createInvoice, deleteInvoice, updateInvoice, type CreateInvoicePayload } from "@/app/actions/sales/invoices"
import { actAs, createCustomer, createTestTenant } from "./helpers"

const line = { cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, hsn_sac: "", description: "" }
const payload = (contactId: string, productId: string, qty = 2): CreateInvoicePayload => ({
    invoice_number: "", customer_name: "Acme", customer_email: "", invoice_date: "2026-10-01", valid_until: "", reference: "",
    status: "SENT", discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", supplier_gstin: "", customer_gstin: "",
    supplier_state: "", place_of_supply: "Maharashtra", supply_type: "intra", contact_id: contactId,
    line_items: [{ ...line, product_name: "Widget", product_id: productId, qty, unit_price: 100, tax_percent: 18 }],
})

async function setup() {
    const { tenant, user } = await createTestTenant({ country: "IN", currency: "INR" })
    actAs(user)
    const customer = await createCustomer(tenant.id)
    const product = await prisma.product.create({ data: { tenantId: tenant.id, name: "Widget", type: "PRODUCT", unitPrice: 100, stockQty: 10 } as never })
    await prisma.warehouse.create({ data: { tenantId: tenant.id, name: "Main", code: "WH-MAIN", isDefault: true, isActive: true } as never })
    return { tenant, customer, product }
}
const state = async (tenantId: string, contactId: string, productId: string) => ({
    invoices: await prisma.invoice.count({ where: { tenantId } }),
    balance: Number((await prisma.contact.findUniqueOrThrow({ where: { id: contactId } })).balance),
    statement: await prisma.ledgerEntry.count({ where: { tenantId } }),
    journals: await prisma.journalEntry.count({ where: { tenantId, status: "POSTED" } }),
    stock: Number((await prisma.product.findUniqueOrThrow({ where: { id: productId } })).stockQty),
    moves: await prisma.stockMovement.count({ where: { tenantId } }),
})

describe("saving an invoice is all or nothing", () => {
    it("create: a failing step leaves no invoice, balance entry, journal or stock movement", async () => {
        const { tenant, customer, product } = await setup()
        const before = await state(tenant.id, customer.id, product.id)
        failLedger.on = true
        const res = await createInvoice(payload(customer.id, product.id))
        failLedger.on = false
        expect(res.id).toBeNull()
        expect(res.error).toMatch(/couldn't be saved/)
        expect(await state(tenant.id, customer.id, product.id)).toEqual(before)

        // and it works normally afterwards: all four parts saved
        const ok = await createInvoice(payload(customer.id, product.id))
        expect(ok.error).toBeNull()
        const after = await state(tenant.id, customer.id, product.id)
        expect(after).toMatchObject({ invoices: 1, balance: 236, statement: 1, journals: 1, stock: 8, moves: 1 })
    })

    it("update and delete: a failing step changes nothing", async () => {
        const { tenant, customer, product } = await setup()
        const ok = await createInvoice(payload(customer.id, product.id))
        const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: ok.id! } })
        const before = await state(tenant.id, customer.id, product.id)

        failLedger.on = true
        const upd = await updateInvoice({ ...payload(customer.id, product.id, 5), id: inv.id, invoice_number: inv.invoiceNumber })
        const del = await deleteInvoice(inv.id)
        failLedger.on = false
        expect(upd.error).toMatch(/couldn't be saved/)
        expect(del.error).toMatch(/couldn't be deleted/)
        expect(await state(tenant.id, customer.id, product.id)).toEqual(before)
        expect(Number((await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id }, include: { items: true } })).items[0].quantity)).toBe(2)

        // the real edit moves everything together
        expect((await updateInvoice({ ...payload(customer.id, product.id, 5), id: inv.id, invoice_number: inv.invoiceNumber })).error).toBeNull()
        expect(await state(tenant.id, customer.id, product.id)).toMatchObject({ balance: 590, stock: 5, journals: 1 })
        expect((await deleteInvoice(inv.id)).error).toBeNull()
        expect(await state(tenant.id, customer.id, product.id)).toMatchObject({ invoices: 0, balance: 0, journals: 0, stock: 10 })
    })
})
