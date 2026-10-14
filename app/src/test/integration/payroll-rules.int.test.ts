import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { approvePayRun, generatePayRun, updatePfWageCeiling } from "@/app/actions/payroll"
import { getPnlReport } from "@/app/actions/finance/reports"
import { trialBalance } from "@/lib/accounting-reports"
import { actAs, createTestTenant } from "./helpers"

const uid = () => Math.random().toString(36).slice(2, 8)

async function oneEmployee(tenantId: string) {
    return prisma.employee.create({ data: { tenantId, employeeNumber: `E-${uid()}`, firstName: "Ravi", displayName: "Ravi", email: `r-${uid()}@example.test`, basicSalary: 60000, status: "ACTIVE", joiningDate: new Date(2025, 0, 1) } as never })
}

describe("PF wage ceiling and employer contributions", () => {
    it("PF on basic up to 15,000; employer PF reaches the ledger and the P&L, which agree", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const emp = await oneEmployee(tenant.id)
        const run = await generatePayRun(9, 2026, "2026-09-30")
        const slip = await prisma.payslip.findFirstOrThrow({ where: { employeeId: emp.id } })
        expect(Number(slip.basicSalary)).toBe(30000)
        expect(Number(slip.pfEmployee)).toBe(1800) // 12% of 15,000, not of 30,000
        await approvePayRun((run as { run?: { id: string } }).run?.id ?? (await prisma.payrollRun.findFirstOrThrow({ where: { tenantId: tenant.id } })).id)

        const tb = await trialBalance(tenant.id, "2026-12-31")
        expect(tb.balanced).toBe(true)
        const row = (code: string) => tb.rows.find((r) => r.code === code)
        expect(row("5210")?.debit).toBe(1800) // employer PF (ESI doesn't apply above 21,000)
        const pnl = await getPnlReport("2026-09-01", "2026-09-30")
        expect(pnl.expenses.payroll).toBe(60000 + 1800)
        expect(pnl.expenses.payroll).toBe((row("5200")?.debit ?? 0) + (row("5210")?.debit ?? 0))
    })

    it("a business can use full basic (ceiling 0)", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const emp = await oneEmployee(tenant.id)
        expect((await updatePfWageCeiling(0)).success).toBe(true)
        await generatePayRun(9, 2026, "2026-09-30")
        expect(Number((await prisma.payslip.findFirstOrThrow({ where: { employeeId: emp.id } })).pfEmployee)).toBe(3600)
        expect((await updatePfWageCeiling(-1)).success).toBe(false)
    })
})
