import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { convertPOToBill } from "@/app/actions/purchase"
import { createCreditNote } from "@/app/actions/sales/credit-notes"
import { createPOSSale } from "@/app/actions/sales/pos"
import { generatePayRun } from "@/app/actions/payroll"
import { updateWorkOrderStatus } from "@/app/actions/manufacturing"
import { runCustomReportQuery } from "@/app/actions/reports/builder"
import { DATASET_DEFINITIONS } from "@/types/report-builder"
import { actAs, createCustomer, createTestTenant } from "./helpers"

const uid = () => Math.random().toString(36).slice(2, 8)
const warehouse = (tenantId: string, isDefault = true) =>
    prisma.warehouse.create({ data: { tenantId, code: `WH-${uid()}`, name: "Main", isDefault } as never })
const product = (tenantId: string, stockQty = 0, type = "PRODUCT") =>
    prisma.product.create({ data: { tenantId, name: `P-${uid()}`, type, unitPrice: 100, stockQty } as never })

describe("H1 purchase order → bill", () => {
    it("creates the bill, posts it to the ledger and the supplier statement, once", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const vendor = await prisma.contact.create({ data: { tenantId: tenant.id, displayName: "Supplier" } })
        const po = await prisma.purchaseOrder.create({
            data: {
                tenantId: tenant.id, vendorId: vendor.id, orderNumber: "PO-2026-0001", subtotal: 1000, taxAmount: 180, discount: 0, total: 1180, currencyCode: "INR",
                items: { create: [{ description: "Parts", quantity: 10, unitPrice: 100, taxPercent: 18, taxAmount: 180, lineTotal: 1180 }] },
            } as never,
        })
        const res = await convertPOToBill(po.id)
        expect(res.success).toBe(true)
        expect(await prisma.billItem.count({ where: { billId: res.billId } })).toBe(1)
        expect(Number((await prisma.contact.findUniqueOrThrow({ where: { id: vendor.id } })).balance)).toBe(-1180)
        expect(await prisma.journalEntry.count({ where: { tenantId: tenant.id, sourceId: res.billId, status: "POSTED" } })).toBe(1)
        await expect(convertPOToBill(po.id)).rejects.toThrow(/already linked/)
    })
})

describe("H2 credit note with restock", () => {
    it("restocks the warehouse and records a RETURN movement", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const wh = await warehouse(tenant.id)
        const p = await product(tenant.id, 5)
        await prisma.warehouseStock.create({ data: { tenantId: tenant.id, warehouseId: wh.id, productId: p.id, quantity: 5 } })
        await createCreditNote({ contactId: customer.id, reason: "GOODS_RETURN" as never, items: [{ productId: p.id, description: "Returned", quantity: 2, unitPrice: 100, taxRate: 18, restockInventory: true, warehouseId: wh.id }] })
        expect(Number((await prisma.warehouseStock.findFirstOrThrow({ where: { warehouseId: wh.id, productId: p.id } })).quantity)).toBe(7)
        const mv = await prisma.stockMovement.findFirstOrThrow({ where: { tenantId: tenant.id, productId: p.id } })
        expect(mv).toMatchObject({ type: "RETURN", referenceNo: expect.stringMatching(/^CN-/) })
        expect(Number(mv.previousQty)).toBe(5)
        expect(Number(mv.newQty)).toBe(7)
    })
})

describe("H3 POS sale reduces stock", () => {
    it("takes goods (not services) out of product and default-warehouse stock", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const wh = await warehouse(tenant.id)
        const goods = await product(tenant.id, 10)
        const service = await product(tenant.id, 0, "SERVICE")
        await prisma.warehouseStock.create({ data: { tenantId: tenant.id, warehouseId: wh.id, productId: goods.id, quantity: 10 } })
        const item = (id: string) => ({ productId: id, name: "x", sku: null, hsnSacCode: null, unitPrice: 100, qty: 3, unit: "Nos", lineTotal: 300, taxRate: 18 })
        const res = await createPOSSale({ contactId: null, customerName: "Walk-in", customerPhone: null, paymentMethod: "CASH", items: [item(goods.id), item(service.id)], subtotal: 600, taxAmount: 108, total: 708, amountReceived: 708, changeGiven: 0, sessionId: null, notes: null })
        expect(res.success).toBe(true)
        expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: goods.id } })).stockQty)).toBe(7)
        expect(Number((await prisma.warehouseStock.findFirstOrThrow({ where: { warehouseId: wh.id, productId: goods.id } })).quantity)).toBe(7)
        expect(Number((await prisma.product.findUniqueOrThrow({ where: { id: service.id } })).stockQty)).toBe(0)
        expect(await prisma.stockMovement.count({ where: { tenantId: tenant.id, type: "OUT" } })).toBe(1)
    })
})

describe("H4 payroll", () => {
    it("deducts marked absences and only this month's part of a leave crossing month-end", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const emp = await prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: "EMP-1", firstName: "Asha", displayName: "Asha Rao", email: `asha-${uid()}@example.test`, basicSalary: 30000, status: "ACTIVE" } as never })
        // Unpaid leave 30 Aug – 2 Sep (4 days): 2 of them are in September
        await prisma.leave.create({ data: { tenantId: tenant.id, employeeId: emp.id, type: "UNPAID", status: "APPROVED", startDate: new Date(2026, 7, 30), endDate: new Date(2026, 8, 2), days: 4, reason: "Family" } as never })
        const att = (day: number, status: string) => prisma.attendance.create({ data: { tenantId: tenant.id, employeeId: emp.id, date: new Date(2026, 8, day, 12), status } as never })
        await att(1, "ABSENT") // covered by the leave, not counted twice
        await att(10, "ABSENT")
        await att(11, "ABSENT")
        await att(12, "HALF_DAY")
        await att(15, "PRESENT")

        await generatePayRun(9, 2026, "2026-09-30")
        const slip = await prisma.payslip.findFirstOrThrow({ where: { employeeId: emp.id } })
        // 2 leave days + 2.5 absent days = 4.5 unpaid days × 30,000 / 30
        expect(Number(slip.unpaidLeaveDays)).toBe(4.5)
        expect(Number(slip.unpaidLeaveDeduction)).toBe(4500)
    })

    it("refuses to invent a salary", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        await prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: "EMP-2", firstName: "No", displayName: "No Salary", email: `no-${uid()}@example.test`, status: "ACTIVE" } as never })
        await expect(generatePayRun(9, 2026, "2026-09-30")).rejects.toThrow(/Set a monthly salary for No Salary/)
    })
})

describe("H5 work orders", () => {
    it("completing twice doesn't move stock twice; finished orders are final", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const src = await warehouse(tenant.id)
        const dst = await warehouse(tenant.id, false)
        const raw = await product(tenant.id, 100)
        const fg = await product(tenant.id, 0)
        await prisma.warehouseStock.create({ data: { tenantId: tenant.id, warehouseId: src.id, productId: raw.id, quantity: 100 } })
        const bom = await prisma.billOfMaterials.create({ data: { tenantId: tenant.id, bomNumber: "BOM-1", name: "Kit", productId: fg.id, quantity: 1, items: { create: [{ productId: raw.id, quantity: 2, scrapPercentage: 0 }] } } as never })
        const wo = await prisma.workOrder.create({ data: { tenantId: tenant.id, orderNumber: "WO-1", bomId: bom.id, productId: fg.id, plannedQuantity: 5, sourceWarehouseId: src.id, targetWarehouseId: dst.id, dueDate: new Date(), status: "IN_PROGRESS" } as never })

        await updateWorkOrderStatus(wo.id, "COMPLETED" as never, 5, 0)
        const rawLeft = async () => Number((await prisma.warehouseStock.findFirstOrThrow({ where: { warehouseId: src.id, productId: raw.id } })).quantity)
        expect(await rawLeft()).toBe(90)
        await expect(updateWorkOrderStatus(wo.id, "COMPLETED" as never, 5, 0)).rejects.toThrow(/already completed/)
        await expect(updateWorkOrderStatus(wo.id, "PLANNED" as never)).rejects.toThrow(/already completed/)
        expect(await rawLeft()).toBe(90)
    })
})

describe("H6 custom report builder", () => {
    it("every dataset runs (with grouping) and invents no costs", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        await product(tenant.id, 4)
        const failures: string[] = []
        for (const [id, def] of Object.entries(DATASET_DEFINITIONS)) {
            const fields = def.fields.map((f) => f.key)
            const numeric = def.fields.find((f) => f.aggregatable)?.key ?? null
            const text = def.fields.find((f) => f.type === "string")?.key ?? null
            try {
                await runCustomReportQuery({ dataset: id as never, selectedFields: fields, filters: [] })
                if (numeric && text) await runCustomReportQuery({ dataset: id as never, selectedFields: fields, filters: [], groupBy: text, aggregateField: numeric, aggregateFn: "SUM" })
            } catch (err) {
                failures.push(`${id}: ${err instanceof Error ? err.message.split("\n").filter(Boolean).slice(-1)[0] : err}`)
            }
        }
        expect(failures).toEqual([])
        const inv = await runCustomReportQuery({ dataset: "INVENTORY" as never, selectedFields: ["name", "costPrice", "stockValue"], filters: [] })
        expect(JSON.stringify(inv)).not.toMatch(/"costPrice":\s*70/)
    })
})
