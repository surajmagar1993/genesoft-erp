import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type Db = Prisma.TransactionClient | typeof prisma

/**
 * Statutory payroll rules shared by the pay run, the general ledger and the
 * P&L, so they always agree.
 *
 * PF wage ceiling (India EPF): PF is worked out on basic pay up to the
 * ceiling (₹15,000 by default). Businesses that pay PF on full basic set the
 * ceiling to 0 (Settings in tenants.settings.payroll.pfWageCeiling).
 * ESI applies when gross pay is at most ₹21,000 a month.
 */
export const DEFAULT_PF_WAGE_CEILING = 15000
export const ESI_GROSS_LIMIT = 21000

export async function getPfWageCeiling(tenantId: string, db: Db = prisma): Promise<number> {
    const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } })
    const raw = ((t?.settings as { payroll?: { pfWageCeiling?: unknown } } | null)?.payroll?.pfWageCeiling)
    const n = Number(raw)
    return raw === undefined || raw === null || raw === "" || !Number.isFinite(n) || n < 0 ? DEFAULT_PF_WAGE_CEILING : n
}

/** Basic pay PF is calculated on (0 ceiling = full basic). */
export function pfWage(basic: number, ceiling: number): number {
    return ceiling > 0 ? Math.min(basic, ceiling) : basic
}

export interface EmployerRates {
    pfEmployerRate: number
    esiEmployerRate: number
}

/** The employer's PF and ESI for one payslip (a company cost on top of gross pay). */
export function employerContribution(slip: { basicSalary: number; totalGross: number }, rates: EmployerRates, ceiling: number) {
    const pf = Math.round(pfWage(slip.basicSalary, ceiling) * (rates.pfEmployerRate / 100))
    const esi = slip.totalGross > 0 && slip.totalGross <= ESI_GROSS_LIMIT ? Math.round(slip.totalGross * (rates.esiEmployerRate / 100)) : 0
    return { pf, esi, total: pf + esi }
}

/** Employer PF+ESI for a whole pay run, from its payslips and each employee's salary structure. */
export async function payRunEmployerCost(tenantId: string, payrollRunId: string, db: Db = prisma): Promise<number> {
    const ceiling = await getPfWageCeiling(tenantId, db)
    const slips = await db.payslip.findMany({
        where: { tenantId, payrollRunId },
        select: { basicSalary: true, totalGross: true, employee: { select: { salaryStructure: { select: { pfEmployerRate: true, esiEmployerRate: true } } } } },
    })
    const fallback = await db.salaryStructure.findFirst({ where: { tenantId, isActive: true }, select: { pfEmployerRate: true, esiEmployerRate: true } })
    return slips.reduce((sum, s) => {
        const r = s.employee?.salaryStructure ?? fallback
        if (!r) return sum
        return sum + employerContribution({ basicSalary: Number(s.basicSalary), totalGross: Number(s.totalGross) }, { pfEmployerRate: Number(r.pfEmployerRate), esiEmployerRate: Number(r.esiEmployerRate) }, ceiling).total
    }, 0)
}
