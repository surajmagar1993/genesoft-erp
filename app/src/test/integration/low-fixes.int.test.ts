import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { nextSequence } from "@/lib/sequence"
import { deleteContact, importContacts } from "@/app/actions/crm/contacts"
import { createInvoice, type CreateInvoicePayload } from "@/app/actions/sales/invoices"
import { approvePayRun, generatePayRun } from "@/app/actions/payroll"
import { createBudget, getBudgetsOverview } from "@/app/actions/finance/budgets"
import { getRentalOverview } from "@/app/actions/rental"
import { markOverdueRentals } from "@/lib/rental-overdue"
import { actAs, createCustomer, createTestTenant } from "./helpers"

const uid = () => Math.random().toString(36).slice(2, 8)

describe("L13 document numbering", () => {
    it("continues after the highest number, even after deletions", async () => {
        const { tenant } = await createTestTenant()
        const mk = (n: string) => prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: n, firstName: "A", displayName: "A", email: `${uid()}@example.test` } as never })
        expect(await nextSequence(prisma, "employee", tenant.id, "EMP-")).toBe("EMP-0001")
        await mk("EMP-0001")
        const second = await mk("EMP-0002")
        await mk("EMP-0003")
        await prisma.employee.delete({ where: { id: second.id } })
        expect(await nextSequence(prisma, "employee", tenant.id, "EMP-")).toBe("EMP-0004") // count + 1 would repeat EMP-0003
        const other = await createTestTenant()
        expect(await nextSequence(prisma, "employee", other.tenant.id, "EMP-")).toBe("EMP-0001")
    })
})

describe("L1/L2 contacts", () => {
    it("explains why a customer with invoices can't be deleted", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const blank = { hsn_sac: "", cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0, description: "" }
        const payload = {
            invoice_number: `INV-${uid()}`, customer_name: "C", customer_email: "", invoice_date: "2026-10-05", valid_until: "", reference: "", status: "SENT", discount: 0,
            discount_type: "PERCENT", notes: "", terms_and_conditions: "", supplier_gstin: "", customer_gstin: "", supplier_state: "", place_of_supply: "Maharashtra", supply_type: "intra",
            contact_id: customer.id, line_items: [{ ...blank, product_name: "Work", qty: 1, unit_price: 100, tax_percent: 0 }],
        } as CreateInvoicePayload
        expect((await createInvoice(payload)).error).toBeNull()
        expect((await deleteContact(customer.id)).error).toMatch(/1 invoice\(s\).*can't be deleted/)
    })

    it("import skips duplicates and posts balances as opening entries", async () => {
        const { tenant, user } = await createTestTenant({ country: "AE", currency: "AED" })
        actAs(user)
        await prisma.contact.create({ data: { tenantId: tenant.id, displayName: "Old", email: "old@example.test" } as never })
        const res = await importContacts([
            { display_name: "Old again", email: "OLD@example.test" },
            { display_name: "New", email: "new@example.test", balance: "250" },
            { display_name: "New twice", email: "new@example.test" },
        ])
        expect(res).toMatchObject({ error: null, count: 1, skipped: 2 })
        const c = await prisma.contact.findFirstOrThrow({ where: { tenantId: tenant.id, email: "new@example.test" } })
        expect(c.currencyCode).toBe("AED")
        expect(Number(c.balance)).toBe(250)
        expect((await importContacts([{ display_name: "X", type: "ROBOT" }])).error).toMatch(/Row 1: type/)
    })
})

describe("L7 budgets and L8 proration", () => {
    it("payroll counts in budget actuals; a mid-month joiner is paid for days worked", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        await prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: `E-${uid()}`, firstName: "Full", displayName: "Full", email: `${uid()}@example.test`, basicSalary: 60000, status: "ACTIVE", joiningDate: new Date(2025, 0, 1) } as never })
        const late = await prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: `E-${uid()}`, firstName: "Late", displayName: "Late", email: `${uid()}@example.test`, basicSalary: 60000, status: "ACTIVE", joiningDate: new Date(2026, 8, 16) } as never })
        const future = await prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: `E-${uid()}`, firstName: "Future", displayName: "Future", email: `${uid()}@example.test`, basicSalary: 60000, status: "ACTIVE", joiningDate: new Date(2026, 10, 1) } as never })
        await generatePayRun(9, 2026, "2026-09-30")
        const lateSlip = await prisma.payslip.findFirstOrThrow({ where: { employeeId: late.id } })
        expect(Number(lateSlip.unpaidLeaveDays)).toBe(15)
        expect(await prisma.payslip.count({ where: { employeeId: future.id } })).toBe(0)
        await approvePayRun((await prisma.payrollRun.findFirstOrThrow({ where: { tenantId: tenant.id } })).id)

        const salaries = await prisma.account.findFirstOrThrow({ where: { tenantId: tenant.id, code: "5200" } })
        await createBudget({ name: "FY", fiscalYear: "2026", periodType: "ANNUAL" as never, startDate: "2026-01-01", endDate: "2026-12-31", items: [{ accountId: salaries.id, budgetedAmount: 200000 }] })
        const overview = await getBudgetsOverview()
        const lines = await prisma.journalEntryLine.aggregate({ where: { tenantId: tenant.id, accountId: salaries.id, journalEntry: { status: "POSTED" } }, _sum: { debit: true, credit: true } })
        const posted = Number(lines._sum.debit) - Number(lines._sum.credit)
        expect(posted).toBeGreaterThan(60000)
        expect(overview.budgets[0].totalActualAmount).toBe(posted)
    })
})

describe("L11 rentals", () => {
    it("the overview shows overdue without writing; the daily job saves it", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const ag = await prisma.rentalAgreement.create({ data: { tenantId: tenant.id, contactId: customer.id, agreementNumber: `RA-${uid()}`, startDate: new Date(2026, 0, 1), endDate: new Date(2026, 0, 10), rentalRate: 10, totalRentalAmount: 100, status: "ACTIVE" } as never })
        const overview = await getRentalOverview()
        expect(overview.agreements.find((a) => a.id === ag.id)?.status).toBe("OVERDUE")
        expect((await prisma.rentalAgreement.findUniqueOrThrow({ where: { id: ag.id } })).status).toBe("ACTIVE")
        expect(await markOverdueRentals()).toBeGreaterThanOrEqual(1)
        expect((await prisma.rentalAgreement.findUniqueOrThrow({ where: { id: ag.id } })).status).toBe("OVERDUE")
    })
})

describe("L6 bank auto-match", () => {
    it("matches on amount alone only when one payment fits, and never to cash", async () => {
        const { autoMatchTransactions } = await import("@/app/actions/finance/bank-reconciliation")
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const bank = await prisma.bankAccount.create({ data: { tenantId: tenant.id, accountName: "Current", accountNumber: uid(), bankName: "Bank", currencyCode: tenant.currencyCode } as never })
        const pay = (amount: number, method: string, day: number) =>
            prisma.payment.create({ data: { tenantId: tenant.id, contactId: customer.id, amount, paymentMethod: method, type: "INBOUND", paymentDate: new Date(2026, 9, day), currencyCode: tenant.currencyCode } as never })
        const line = (amount: number, day: number) =>
            prisma.bankTransaction.create({ data: { tenantId: tenant.id, bankAccountId: bank.id, transactionDate: new Date(2026, 9, day), amount, type: "DEPOSIT", description: "NEFT credit" } as never })

        await pay(500, "BANK_TRANSFER", 2)
        await pay(500, "BANK_TRANSFER", 3) // two payments of 500: ambiguous
        await pay(700, "CASH", 2) // cash never reaches the bank
        const only = await pay(900, "BANK_TRANSFER", 2)
        const l500 = await line(500, 4)
        const l700 = await line(700, 4)
        const l900 = await line(900, 4)

        await autoMatchTransactions(bank.id)
        const status = async (id: string) => prisma.bankTransaction.findUniqueOrThrow({ where: { id } })
        expect((await status(l500.id)).status).not.toBe("MATCHED")
        expect((await status(l700.id)).status).not.toBe("MATCHED")
        expect(await status(l900.id)).toMatchObject({ status: "MATCHED", paymentId: only.id })
    })
})
