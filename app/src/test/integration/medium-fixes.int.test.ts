import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { getPortalProfile } from "@/app/actions/portal/portal"
import { createWebForm, submitPublicForm } from "@/app/actions/crm/forms"
import { processRentalReturn } from "@/app/actions/rental"
import { submitLeaveRequest, updateLeaveStatus } from "@/app/actions/hr"
import { updateWorkOrderStatus } from "@/app/actions/manufacturing"
import { createAccount, updateAccount } from "@/app/actions/finance/accounts"
import { createInvoice, type CreateInvoicePayload } from "@/app/actions/sales/invoices"
import { convertOrderToInvoice, createOrder } from "@/app/actions/sales/orders"
import { createQuote } from "@/app/actions/sales/quotes"
import { actAs, addUser, createCustomer, createTestTenant } from "./helpers"
import { unwrap } from "@/lib/action-result"

const uid = () => Math.random().toString(36).slice(2, 8)

describe("M16 portal and web forms of suspended businesses", () => {
    it("portal links stop working and forms stop taking submissions", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const token = `tok-${uid()}${uid()}`
        await prisma.contact.create({ data: { tenantId: tenant.id, displayName: "Portal User", portalToken: token, portalEnabled: true } as never })
        expect(await getPortalProfile(token)).toBeTruthy()

        const form = await createWebForm({ title: "Contact us", type: "CONTACT" as never, fields: [{ id: "f1", name: "email", label: "Email", type: "email", required: true }] as never })
        const code = (form as { form?: { code: string }; code?: string }).form?.code ?? (form as { code?: string }).code
        expect(code).toMatch(/^FORM-\d{4}-[0-9A-F]{8}$/)

        await prisma.tenant.update({ where: { id: tenant.id }, data: { isActive: false } })
        expect(await getPortalProfile(token)).toBeNull()
        const res = await submitPublicForm({ formIdOrCode: code!, data: { email: "a@example.test" } })
        expect(res.success).toBe(false)
    })

    it("two businesses can both create their first web form", async () => {
        for (let i = 0; i < 2; i++) {
            const { user } = await createTestTenant()
            actAs(user)
            const form = await createWebForm({ title: "Enquiry", type: "CONTACT" as never, fields: [{ id: "f1", name: "email", label: "Email", type: "email", required: true }] as never })
            expect((form as { error?: string }).error ?? null).toBeNull()
        }
    })
})

describe("M14 rental returns", () => {
    it("validates refunds and can't return the same asset twice", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const asset = await prisma.rentalAsset.create({ data: { tenantId: tenant.id, assetCode: `A-${uid()}`, name: "Drill", category: "Tools", dailyRate: 100 } as never })
        const ag = await prisma.rentalAgreement.create({
            data: { tenantId: tenant.id, contactId: customer.id, agreementNumber: `RA-${uid()}`, startDate: new Date(), endDate: new Date(), rentalRate: 100, totalRentalAmount: 500, securityDeposit: 1000, status: "ACTIVE",
                items: { create: [{ tenantId: tenant.id, assetId: asset.id, quantity: 1, rentalDays: 5, rate: 100, totalAmount: 500 }] } } as never,
        })
        const base = { agreementId: ag.id, assetId: asset.id, returnDate: "2026-10-10", condition: "GOOD" as never }
        await expect(processRentalReturn({ ...base, depositRefunded: 1500 }).then(unwrap)).rejects.toThrow(/between 0 and the deposit/)
        await expect(processRentalReturn({ ...base, damageFee: -5 }).then(unwrap)).rejects.toThrow(/negative/)
        unwrap(await processRentalReturn({ ...base, depositRefunded: 1000 }))
        await expect(processRentalReturn({ ...base, depositRefunded: 1000 }).then(unwrap)).rejects.toThrow(/already/)
    })
})

describe("M12 leave", () => {
    it("rejects overlapping requests and managers approving their own leave", async () => {
        const { tenant, user } = await createTestTenant()
        const manager = await addUser(tenant.id, "MANAGER")
        const emp = await prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: `E-${uid()}`, firstName: "Mo", displayName: "Mo Manager", email: `mo-${uid()}@example.test`, userId: manager.id } as never })
        actAs(manager)
        const lv = unwrap(await submitLeaveRequest({ employeeId: emp.id, type: "CASUAL" as never, startDate: "2026-11-02", endDate: "2026-11-04", reason: "Trip" }))
        await expect(submitLeaveRequest({ employeeId: emp.id, type: "CASUAL" as never, startDate: "2026-11-04", endDate: "2026-11-05", reason: "Again" }).then(unwrap)).rejects.toThrow(/already a leave request/)
        await expect(updateLeaveStatus({ leaveId: lv.leave.id, status: "APPROVED" as never }).then(unwrap)).rejects.toThrow(/your own leave/)
        actAs(user) // the workspace admin can
        expect((unwrap(await updateLeaveStatus({ leaveId: lv.leave.id, status: "APPROVED" as never }))).success).toBe(true)
    })
})

describe("M15 work order shortages", () => {
    it("won't complete a work order without enough raw material", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const wh = await prisma.warehouse.create({ data: { tenantId: tenant.id, code: `WH-${uid()}`, name: "Main" } as never })
        const raw = await prisma.product.create({ data: { tenantId: tenant.id, name: "Steel", type: "PRODUCT", unitPrice: 1 } as never })
        const fg = await prisma.product.create({ data: { tenantId: tenant.id, name: "Frame", type: "PRODUCT", unitPrice: 1 } as never })
        await prisma.warehouseStock.create({ data: { tenantId: tenant.id, warehouseId: wh.id, productId: raw.id, quantity: 3 } })
        const bom = await prisma.billOfMaterials.create({ data: { tenantId: tenant.id, bomNumber: `B-${uid()}`, name: "Frame", productId: fg.id, quantity: 1, items: { create: [{ productId: raw.id, quantity: 2, scrapPercentage: 0 }] } } as never })
        const wo = await prisma.workOrder.create({ data: { tenantId: tenant.id, orderNumber: `WO-${uid()}`, bomId: bom.id, productId: fg.id, plannedQuantity: 5, sourceWarehouseId: wh.id, targetWarehouseId: wh.id, dueDate: new Date(), status: "IN_PROGRESS" } as never })
        await expect(updateWorkOrderStatus(wo.id, "COMPLETED" as never, 5, 0).then(unwrap)).rejects.toThrow(/Not enough raw material.*Steel \(need 10, have 3\)/)
        expect((await prisma.workOrder.findUniqueOrThrow({ where: { id: wo.id } })).status).toBe("IN_PROGRESS")
    })
})

describe("M8 account balances come only from journals", () => {
    it("ignores a typed balance on create and update", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        await createAccount({ code: "5970", name: "Misc", type: "EXPENSE", parent_id: null, is_group: false, description: "", balance: 99999, currency_code: "INR", is_active: true, is_system: false } as never)
        const acc = await prisma.account.findFirstOrThrow({ where: { tenantId: tenant.id, code: "5970" } })
        expect(Number(acc.balance)).toBe(0)
        await updateAccount(acc.id, { name: "Misc costs", balance: 5000 } as never)
        const after = await prisma.account.findUniqueOrThrow({ where: { id: acc.id } })
        expect(after.name).toBe("Misc costs")
        expect(Number(after.balance)).toBe(0)
    })
})

describe("M7 credit limit, M4 order → invoice, currency", () => {
    const blank = { hsn_sac: "", cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, description: "" }
    const inv = (contactId: string, price: number, over: Partial<CreateInvoicePayload> = {}): CreateInvoicePayload => ({
        invoice_number: `INV-${uid()}`, customer_name: "C", customer_email: "", invoice_date: "2026-10-05", valid_until: "", reference: "", status: "SENT", discount: 0,
        discount_type: "PERCENT", notes: "", terms_and_conditions: "", supplier_gstin: "", customer_gstin: "", supplier_state: "", place_of_supply: "Maharashtra", supply_type: "intra",
        contact_id: contactId, line_items: [{ ...blank, product_name: "Work", qty: 1, unit_price: price, tax_percent: 0 }], ...over,
    })

    it("blocks issuing an invoice over the customer's credit limit (drafts are fine)", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await prisma.contact.create({ data: { tenantId: tenant.id, displayName: "Limited Ltd", creditLimit: 1000 } as never })
        expect((await createInvoice(inv(customer.id, 800))).error).toBeNull()
        expect((await createInvoice(inv(customer.id, 300))).error).toMatch(/over their credit limit of 1000/)
        expect((await createInvoice(inv(customer.id, 300, { status: "DRAFT" }))).error).toBeNull()
    })

    it("turns a sales order into one draft invoice in the business's currency; quotes use it too", async () => {
        const { tenant, user } = await createTestTenant({ country: "AE", currency: "AED" })
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const line = { product_name: "Work", description: "", qty: 2, unit_price: 500, tax_percent: 5 }
        const order = await createOrder({ order_number: "SO-9", customer_name: "C", customer_email: "", order_date: "2026-10-01", reference: "", status: "CONFIRMED", discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", contact_id: customer.id, currency_code: "INR", line_items: [line] } as never)
        expect((await prisma.salesOrder.findUniqueOrThrow({ where: { id: order.id! } })).currencyCode).toBe("AED")

        const res = await convertOrderToInvoice(order.id!)
        expect(res.error).toBeNull()
        const invoice = await prisma.invoice.findUniqueOrThrow({ where: { id: res.invoiceId! }, include: { items: true } })
        expect(invoice).toMatchObject({ status: "DRAFT", currencyCode: "AED" })
        expect(Number(invoice.total)).toBe(1050)
        expect(Number(invoice.items[0].vatRate)).toBe(5)
        expect((await convertOrderToInvoice(order.id!)).error).toMatch(/Already invoiced/)

        const q = await createQuote({ quote_number: "Q-9", customer_name: "C", customer_email: "", quote_date: "2026-10-01", valid_until: "2026-10-30", reference: "", status: "DRAFT", discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", contact_id: customer.id, currency_code: "INR", line_items: [line] } as never)
        expect((await prisma.quote.findUniqueOrThrow({ where: { id: q.id! } })).currencyCode).toBe("AED")
    })
})
