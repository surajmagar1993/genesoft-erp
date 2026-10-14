import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createInvoice, deleteInvoice, getInvoiceById, updateInvoice, type CreateInvoicePayload } from "@/app/actions/sales/invoices"
import { createPOSSale } from "@/app/actions/sales/pos"
import { getProductsForDocuments } from "@/app/actions/sales/products"
import { syncInvoiceStock } from "@/lib/stock"
import { actAs, createCustomer, createTestTenant } from "./helpers"

const uid = () => Math.random().toString(36).slice(2, 8)
const blank = { hsn_sac: "", cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0 }

function payload(contactId: string, lines: { product_id?: string | null; product_name: string; description?: string; qty: number }[], over: Partial<CreateInvoicePayload> = {}): CreateInvoicePayload {
    return {
        invoice_number: `INV-T-${uid()}`, customer_name: "Buyer", customer_email: "", invoice_date: "2026-10-05", valid_until: "", reference: "", status: "SENT",
        discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", supplier_gstin: "", customer_gstin: "", supplier_state: "", place_of_supply: "Maharashtra",
        supply_type: "intra", contact_id: contactId,
        line_items: lines.map((l) => ({ ...blank, product_id: l.product_id ?? null, product_name: l.product_name, description: l.description ?? "", qty: l.qty, unit_price: 100, tax_percent: 18 })),
        ...over,
    }
}

async function setup() {
    const { tenant, user } = await createTestTenant()
    actAs(user)
    const customer = await createCustomer(tenant.id)
    const wh = await prisma.warehouse.create({ data: { tenantId: tenant.id, code: `WH-${uid()}`, name: "Main", isDefault: true } as never })
    const goods = await prisma.product.create({ data: { tenantId: tenant.id, name: "Router", type: "PRODUCT", unitPrice: 100, stockQty: 20 } as never })
    const service = await prisma.product.create({ data: { tenantId: tenant.id, name: "Install", type: "SERVICE", unitPrice: 100 } as never })
    await prisma.warehouseStock.create({ data: { tenantId: tenant.id, warehouseId: wh.id, productId: goods.id, quantity: 20 } })
    const stock = async () => ({
        product: Number((await prisma.product.findUniqueOrThrow({ where: { id: goods.id } })).stockQty),
        warehouse: Number((await prisma.warehouseStock.findFirstOrThrow({ where: { warehouseId: wh.id, productId: goods.id } })).quantity),
    })
    return { tenant, customer, goods, service, stock }
}

describe("invoices move stock", () => {
    it("issue, edit, cancel and delete keep stock right; services and proformas don't move it", async () => {
        const { customer, goods, service, stock } = await setup()

        const created = await createInvoice(payload(customer.id, [{ product_id: goods.id, product_name: "Router", description: "AX3000", qty: 3 }, { product_id: service.id, product_name: "Install", qty: 1 }]))
        expect(created.error).toBeNull()
        expect(await stock()).toEqual({ product: 17, warehouse: 17 })

        // Name and details both survive, and the line remembers its product
        const inv = await getInvoiceById(created.id!)
        expect(inv?.invoice_line_items?.[0]).toMatchObject({ product_id: goods.id, product_name: "Router", description: "AX3000" })

        const base = payload(customer.id, [{ product_id: goods.id, product_name: "Router", qty: 5 }])
        await updateInvoice({ ...base, invoice_number: inv!.invoice_number, id: created.id! } as never)
        expect(await stock()).toEqual({ product: 15, warehouse: 15 })

        await updateInvoice({ ...base, invoice_number: inv!.invoice_number, id: created.id!, status: "CANCELLED" } as never)
        expect(await stock()).toEqual({ product: 20, warehouse: 20 })

        await updateInvoice({ ...base, invoice_number: inv!.invoice_number, id: created.id!, status: "SENT" } as never)
        expect(await stock()).toEqual({ product: 15, warehouse: 15 })
        expect((await deleteInvoice(created.id!)).error).toBeNull()
        expect(await stock()).toEqual({ product: 20, warehouse: 20 })

        await createInvoice(payload(customer.id, [{ product_id: goods.id, product_name: "Router", qty: 4 }], { type: "PROFORMA" }))
        await createInvoice(payload(customer.id, [{ product_id: goods.id, product_name: "Router", qty: 4 }], { status: "DRAFT" }))
        expect(await stock()).toEqual({ product: 20, warehouse: 20 })
    })

    it("POS sales aren't counted twice when the invoice is synced again", async () => {
        const { goods, stock } = await setup()
        const res = await createPOSSale({ contactId: null, customerName: "Walk-in", customerPhone: null, paymentMethod: "CASH", items: [{ productId: goods.id, name: "Router", sku: null, hsnSacCode: null, unitPrice: 100, qty: 2, unit: "Nos", lineTotal: 200, taxRate: 18 }], subtotal: 200, taxAmount: 36, total: 236, amountReceived: 236, changeGiven: 0, sessionId: null, notes: null })
        expect(await stock()).toEqual({ product: 18, warehouse: 18 })
        await syncInvoiceStock((await prisma.invoice.findUniqueOrThrow({ where: { id: res.invoiceId! } })).tenantId, { invoiceId: res.invoiceId! })
        expect(await stock()).toEqual({ product: 18, warehouse: 18 })
    })

    it("refuses another business's product and lists this business's catalog with tax rates", async () => {
        const { customer, goods } = await setup()
        const other = await setup()
        actAs((await prisma.user.findFirstOrThrow({ where: { tenantId: customer.tenantId } })) as never)
        const res = await createInvoice(payload(customer.id, [{ product_id: other.goods.id, product_name: "Router", qty: 1 }]))
        expect(res.error).toMatch(/Product not found/)

        const list = await getProductsForDocuments()
        expect(list.map((p) => p.id)).toContain(goods.id)
        expect(list.map((p) => p.id)).not.toContain(other.goods.id)
        expect(list.find((p) => p.id === goods.id)).toMatchObject({ unitPrice: 100, taxRate: 18, stockQty: 20 })
    })
})
