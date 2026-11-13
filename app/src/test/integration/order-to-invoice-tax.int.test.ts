import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createOrder, convertOrderToInvoice } from "@/app/actions/sales/orders"
import { mapPrismaInvoiceToDB, type InvoiceWithRelations } from "@/lib/invoice-mapper"
import { contactPlaceOfSupply } from "@/lib/invoice-lines"
import { actAs, createTestTenant } from "./helpers"

const num = (v: unknown) => Number(v ?? 0)

describe("sales order → invoice", () => {
    it("the invoice totals the same as the order (discount before tax), and the page shows the tax that was charged", async () => {
        const { tenant, user } = await createTestTenant({ country: "IN", currency: "INR" })
        await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: { gstin: "27AAAAA0000A1Z5", state: "Maharashtra" } as never } })
        actAs(user)
        // customer typed in another case: still the same state
        const customer = await prisma.contact.create({ data: { tenantId: tenant.id, displayName: "Buyer", billingAddress: { state: "MAHARASHTRA" } } })
        const created = await createOrder({
            order_number: `SO-${Math.random().toString(36).slice(2, 8)}`, customer_name: "Buyer", customer_email: "", order_date: "2026-10-01",
            status: "CONFIRMED" as never, discount: 10, discount_type: "PERCENT", contact_id: customer.id, currency_code: "INR",
            line_items: [{ product_name: "Service", qty: 1, unit_price: 1000, tax_percent: 18 }],
        })
        expect(created.error).toBeNull()
        const order = await prisma.salesOrder.findUniqueOrThrow({ where: { id: created.id! } })
        expect(num(order.total)).toBeCloseTo(1062, 2)

        const conv = await convertOrderToInvoice(order.id)
        expect(conv.error).toBeNull()
        const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: conv.invoiceId! }, include: { items: true, contact: true, tenant: true } })
        expect(num(inv.taxAmount)).toBeCloseTo(162, 2)
        expect(num(inv.discount)).toBeCloseTo(100, 2)
        expect(num(inv.total)).toBeCloseTo(1062, 2)
        expect(num(inv.items[0].cgstAmount)).toBeCloseTo(81, 2)

        const db = mapPrismaInvoiceToDB(inv as unknown as InvoiceWithRelations)
        expect(db.supply_type).toBe("intra")
    })

    it("a UAE tax number in the GSTIN field isn't read as an Indian state", () => {
        expect(contactPlaceOfSupply({ gstin: "100000000000003" })).toBeNull()
        expect(contactPlaceOfSupply({ gstin: "29ABCDE1234F1Z5" })).toBe("Karnataka")
    })
})
