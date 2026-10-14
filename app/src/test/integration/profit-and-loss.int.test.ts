import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { getMonthlyRevenue, getPnlReport } from "@/app/actions/finance/reports"
import { actAs, createCustomer, createTestTenant } from "./helpers"

/**
 * One month of documents with known amounts (all INR, before tax):
 *   sales 10,000 (sent) + 2,000 (overdue)            = 12,000
 *   credit note                                        −1,000  → revenue 11,000
 *   bill: stock product 3,000 + service 1,000          COGS 3,000, bills 1,000
 *   expenses: approved 500 + paid 700 (draft ignored)  1,200
 *   payroll run (approved) gross                        4,000
 *   → gross profit 8,000; operating 6,200; net 1,800
 * Ignored: draft and proforma invoices, a void bill, a draft expense, a draft payroll run.
 */
describe("profit and loss", () => {
    it("counts sales, credit notes, bills, expenses and payroll, before tax", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const t = tenant.id
        const customer = await createCustomer(t)
        const vendor = await prisma.contact.create({ data: { tenantId: t, displayName: "Supplier" } })
        const d = (day: number) => new Date(Date.UTC(2026, 8, day, 10)) // September 2026

        const invoice = (n: string, status: string, total: number, tax: number, type = "TAX_INVOICE") =>
            prisma.invoice.create({
                data: { tenantId: t, contactId: customer.id, invoiceNumber: n, type: type as never, status: status as never, invoiceDate: d(5), billTo: {}, subtotal: total - tax, taxAmount: tax, total, currencyCode: "INR" },
            })
        await invoice("A1", "SENT", 11800, 1800)
        await invoice("A2", "OVERDUE", 2360, 360)
        await invoice("A3", "DRAFT", 5900, 900)
        await invoice("A4", "SENT", 5900, 900, "PROFORMA")

        await prisma.creditNote.create({
            data: { tenantId: t, contactId: customer.id, creditNoteNumber: "CN1", issueDate: d(10), status: "ISSUED", subtotal: 1000, taxAmount: 180, total: 1180, currencyCode: "INR" } as never,
        })

        const stock = await prisma.product.create({ data: { tenantId: t, name: "Widget", type: "PRODUCT" } as never })
        const service = await prisma.product.create({ data: { tenantId: t, name: "Repair", type: "SERVICE" } as never })
        const bill = (n: string, status: string) =>
            prisma.bill.create({
                data: {
                    tenantId: t, contactId: vendor.id, billNumber: n, status: status as never, billDate: d(12), subtotal: 4000, taxAmount: 720, total: 4720, currencyCode: "INR",
                    items: {
                        create: [
                            { description: "Widgets", productId: stock.id, quantity: 3, unitPrice: 1000, taxPercent: 18, taxAmount: 540, lineTotal: 3540 },
                            { description: "Repair", productId: service.id, quantity: 1, unitPrice: 1000, taxPercent: 18, taxAmount: 180, lineTotal: 1180 },
                        ],
                    },
                } as never,
            })
        await bill("B1", "OPEN")
        await bill("B2", "VOID")

        const account = await prisma.account.create({ data: { tenantId: t, code: "5100", name: "Office", type: "EXPENSE" } as never })
        const expense = (n: string, status: string, amount: number) =>
            prisma.expense.create({
                data: { tenantId: t, expenseNumber: n, title: n, category: "Office Supplies", accountId: account.id, amount, taxAmount: 0, totalAmount: amount, currencyCode: "INR", expenseDate: d(15), status: status as never } as never,
            })
        await expense("E1", "APPROVED", 500)
        await expense("E2", "PAID", 700)
        await expense("E3", "DRAFT", 9999)

        await prisma.payrollRun.create({ data: { tenantId: t, runNumber: "PR-2026-09", periodYear: 2026, periodMonth: 9, payDate: d(30), status: "APPROVED", totalGross: 4000, totalDeductions: 400, totalNetPay: 3600 } as never })
        await prisma.payrollRun.create({ data: { tenantId: t, runNumber: "PR-2026-08", periodYear: 2026, periodMonth: 8, payDate: d(1), status: "DRAFT", totalGross: 99999 } as never })

        const pnl = await getPnlReport("2026-09-01", "2026-09-30")
        expect(pnl.revenue).toMatchObject({ sales: 12000, creditNotes: 1000, total: 11000 })
        expect(pnl.expenses).toMatchObject({ cogs: 3000, bills: 1000, expenses: 1200, payroll: 4000, operating: 6200, total: 9200 })
        expect(pnl.grossProfit).toBe(8000)
        expect(pnl.netProfit).toBe(1800)
        expect(pnl.profitMargin).toBe(16.4)

        // Outside the period nothing counts; the monthly chart puts it all in September
        expect((await getPnlReport("2026-10-01", "2026-10-31")).netProfit).toBe(0)
        const months = await getMonthlyRevenue(2026)
        expect(months[8]).toMatchObject({ month: "Sep", revenue: 11000, expenses: 9200, profit: 1800 })
        expect(months.filter((m) => m.revenue !== 0 || m.expenses !== 0)).toHaveLength(1)
    })
})
