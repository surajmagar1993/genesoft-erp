"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
    PayrollRunStatus,
    PayslipStatus,
    AttendanceStatus,
    LeaveType,
    LeaveStatus
} from "@prisma/client"

export interface SalaryStructureRecord {
    id: string
    name: string
    code: string
    description: string | null
    isActive: boolean
    basicPercentage: number
    hraPercentage: number
    conveyanceMonthly: number
    medicalMonthly: number
    specialAllowancePct: number
    pfEmployeeRate: number
    pfEmployerRate: number
    esiEmployeeRate: number
    esiEmployerRate: number
    professionalTax: number
    tdsPercentage: number
    employeeCount?: number
    createdAt: Date
}

export interface PayrollRunRecord {
    id: string
    runNumber: string
    periodMonth: number
    periodYear: number
    payDate: Date
    status: PayrollRunStatus
    employeeCount: number
    totalGross: number
    totalDeductions: number
    totalNetPay: number
    paymentMethod: string | null
    paymentReference: string | null
    notes: string | null
    approvedAt: Date | null
    paidAt: Date | null
    createdAt: Date
}

export interface PayslipRecord {
    id: string
    payrollRunId: string
    employeeId: string
    employeeName: string
    employeeNumber: string
    departmentName: string | null
    designationTitle: string | null
    slipNumber: string
    periodMonth: number
    periodYear: number
    status: PayslipStatus
    workingDays: number
    presentDays: number
    paidLeaveDays: number
    unpaidLeaveDays: number
    basicSalary: number
    hra: number
    conveyance: number
    medical: number
    specialAllowance: number
    bonus: number
    totalGross: number
    pfEmployee: number
    esiEmployee: number
    professionalTax: number
    tdsDeduction: number
    unpaidLeaveDeduction: number
    otherDeductions: number
    totalDeductions: number
    netSalary: number
    bankName: string | null
    bankAccountNumber: string | null
    bankIfsc: string | null
    paymentDate: Date | null
    paymentMethod: string | null
    transactionRef: string | null
}

export interface PayrollOverviewData {
    telemetry: {
        totalMonthlyPayroll: number
        staffOnPayroll: number
        pendingApprovals: number
        totalDisbursedYTD: number
    }
    payRuns: PayrollRunRecord[]
    recentPayslips: PayslipRecord[]
    salaryStructures: SalaryStructureRecord[]
    activeEmployees: {
        id: string
        displayName: string
        employeeNumber: string
        departmentName: string | null
        designationTitle: string | null
        basicSalary: number | null
        currencyCode: string
        salaryStructureId: string | null
    }[]
}

/**
 * Get unified payroll overview telemetry, runs, payslips, and templates
 */
export async function getPayrollOverview(month?: number, year?: number): Promise<PayrollOverviewData> {
    const tenantId = await getTenantId()
    const now = new Date()
    const targetMonth = month || (now.getMonth() + 1)
    const targetYear = year || now.getFullYear()

    const [payRunsRaw, structuresRaw, payslipsRaw, employeesRaw] = await Promise.all([
        prisma.payrollRun.findMany({
            where: { tenantId },
            orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
            take: 20
        }),
        prisma.salaryStructure.findMany({
            where: { tenantId },
            include: {
                _count: { select: { employees: true } }
            },
            orderBy: { createdAt: "asc" }
        }),
        prisma.payslip.findMany({
            where: { tenantId },
            include: {
                employee: {
                    include: {
                        department: true,
                        designation: true
                    }
                }
            },
            orderBy: { createdAt: "desc" },
            take: 50
        }),
        prisma.employee.findMany({
            where: { tenantId, status: "ACTIVE" },
            include: {
                department: true,
                designation: true
            },
            orderBy: { displayName: "asc" }
        })
    ])

    // Format pay runs
    const payRuns: PayrollRunRecord[] = (payRunsRaw as any[]).map((r: any) => ({
        id: r.id,
        runNumber: r.runNumber,
        periodMonth: r.periodMonth,
        periodYear: r.periodYear,
        payDate: r.payDate,
        status: r.status,
        employeeCount: r.employeeCount,
        totalGross: Number(r.totalGross),
        totalDeductions: Number(r.totalDeductions),
        totalNetPay: Number(r.totalNetPay),
        paymentMethod: r.paymentMethod,
        paymentReference: r.paymentReference,
        notes: r.notes,
        approvedAt: r.approvedAt,
        paidAt: r.paidAt,
        createdAt: r.createdAt
    }))

    // Format structures
    const salaryStructures: SalaryStructureRecord[] = (structuresRaw as any[]).map((s: any) => ({
        id: s.id,
        name: s.name,
        code: s.code,
        description: s.description,
        isActive: s.isActive,
        basicPercentage: Number(s.basicPercentage),
        hraPercentage: Number(s.hraPercentage),
        conveyanceMonthly: Number(s.conveyanceMonthly),
        medicalMonthly: Number(s.medicalMonthly),
        specialAllowancePct: Number(s.specialAllowancePct),
        pfEmployeeRate: Number(s.pfEmployeeRate),
        pfEmployerRate: Number(s.pfEmployerRate),
        esiEmployeeRate: Number(s.esiEmployeeRate),
        esiEmployerRate: Number(s.esiEmployerRate),
        professionalTax: Number(s.professionalTax),
        tdsPercentage: Number(s.tdsPercentage),
        employeeCount: s._count.employees,
        createdAt: s.createdAt
    }))

    // Format payslips
    const recentPayslips: PayslipRecord[] = (payslipsRaw as any[]).map((p: any) => ({
        id: p.id,
        payrollRunId: p.payrollRunId,
        employeeId: p.employeeId,
        employeeName: p.employee.displayName,
        employeeNumber: p.employee.employeeNumber,
        departmentName: p.employee.department?.name || null,
        designationTitle: p.employee.designation?.title || null,
        slipNumber: p.slipNumber,
        periodMonth: p.periodMonth,
        periodYear: p.periodYear,
        status: p.status,
        workingDays: p.workingDays,
        presentDays: Number(p.presentDays),
        paidLeaveDays: Number(p.paidLeaveDays),
        unpaidLeaveDays: Number(p.unpaidLeaveDays),
        basicSalary: Number(p.basicSalary),
        hra: Number(p.hra),
        conveyance: Number(p.conveyance),
        medical: Number(p.medical),
        specialAllowance: Number(p.specialAllowance),
        bonus: Number(p.bonus),
        totalGross: Number(p.totalGross),
        pfEmployee: Number(p.pfEmployee),
        esiEmployee: Number(p.esiEmployee),
        professionalTax: Number(p.professionalTax),
        tdsDeduction: Number(p.tdsDeduction),
        unpaidLeaveDeduction: Number(p.unpaidLeaveDeduction),
        otherDeductions: Number(p.otherDeductions),
        totalDeductions: Number(p.totalDeductions),
        netSalary: Number(p.netSalary),
        bankName: p.bankName,
        bankAccountNumber: p.bankAccountNumber,
        bankIfsc: p.bankIfsc,
        paymentDate: p.paymentDate,
        paymentMethod: p.paymentMethod,
        transactionRef: p.transactionRef
    }))

    // Telemetry calculations
    const latestPayRun = payRuns.find(r => r.periodMonth === targetMonth && r.periodYear === targetYear) || payRuns[0]
    const totalMonthlyPayroll = latestPayRun ? latestPayRun.totalNetPay : 0
    const pendingApprovals = payRuns.filter(r => r.status === "DRAFT").length
    const totalDisbursedYTD = payRuns
        .filter(r => r.periodYear === targetYear && (r.status === "PAID" || r.status === "PROCESSED"))
        .reduce((sum, r) => sum + r.totalNetPay, 0)

    return {
        telemetry: {
            totalMonthlyPayroll,
            staffOnPayroll: employeesRaw.length,
            pendingApprovals,
            totalDisbursedYTD
        },
        payRuns,
        recentPayslips,
        salaryStructures,
        activeEmployees: (employeesRaw as any[]).map((e: any) => ({
            id: e.id,
            displayName: e.displayName,
            employeeNumber: e.employeeNumber,
            departmentName: e.department?.name || null,
            designationTitle: e.designation?.title || null,
            basicSalary: e.basicSalary ? Number(e.basicSalary) : null,
            currencyCode: e.currencyCode,
            salaryStructureId: e.salaryStructureId
        }))
    }
}

/**
 * Create a new salary structure template
 */
export async function createSalaryStructure(data: {
    name: string
    code: string
    description?: string
    basicPercentage?: number
    hraPercentage?: number
    conveyanceMonthly?: number
    medicalMonthly?: number
    specialAllowancePct?: number
    pfEmployeeRate?: number
    pfEmployerRate?: number
    esiEmployeeRate?: number
    esiEmployerRate?: number
    professionalTax?: number
    tdsPercentage?: number
}) {
    const tenantId = await getTenantId()

    const structure = await prisma.salaryStructure.create({
        data: {
            tenantId,
            name: data.name,
            code: data.code.toUpperCase(),
            description: data.description,
            basicPercentage: data.basicPercentage ?? 50,
            hraPercentage: data.hraPercentage ?? 20,
            conveyanceMonthly: data.conveyanceMonthly ?? 1600,
            medicalMonthly: data.medicalMonthly ?? 1250,
            specialAllowancePct: data.specialAllowancePct ?? 15,
            pfEmployeeRate: data.pfEmployeeRate ?? 12,
            pfEmployerRate: data.pfEmployerRate ?? 12,
            esiEmployeeRate: data.esiEmployeeRate ?? 0.75,
            esiEmployerRate: data.esiEmployerRate ?? 3.25,
            professionalTax: data.professionalTax ?? 200,
            tdsPercentage: data.tdsPercentage ?? 0
        }
    })

    revalidatePath("/hr")
    return { success: true, structure }
}

/**
 * Assign employee to a salary structure and set monthly compensation
 */
export async function assignEmployeeSalary(employeeId: string, salaryStructureId: string, basicSalary?: number) {
    const tenantId = await getTenantId()

    await prisma.employee.update({
        where: { id: employeeId, tenantId },
        data: {
            salaryStructureId,
            ...(basicSalary !== undefined ? { basicSalary } : {})
        }
    })

    revalidatePath("/hr")
    return { success: true }
}

/**
 * Generate monthly pay run with automated attendance and leave sync
 */
export async function generatePayRun(
    periodMonth: number,
    periodYear: number,
    payDateString: string,
    notes?: string
) {
    const tenantId = await getTenantId()
    const payDate = new Date(payDateString)

    // Check if a run already exists for this period
    const existing = await prisma.payrollRun.findUnique({
        where: {
            tenantId_periodYear_periodMonth: {
                tenantId,
                periodYear,
                periodMonth
            }
        }
    })

    if (existing && existing.status !== "DRAFT") {
        throw new Error(`A finalized pay run (${existing.runNumber}) already exists for ${periodMonth}/${periodYear}. Cannot overwrite.`)
    }

    // Days in target month (e.g., 28, 30, 31)
    const daysInMonth = new Date(periodYear, periodMonth, 0).getDate()
    const runNumber = `PAYRUN-${periodYear}-${String(periodMonth).padStart(2, "0")}`

    // Fetch active employees
    const employees = await prisma.employee.findMany({
        where: { tenantId, status: "ACTIVE" },
        include: {
            salaryStructure: true,
            attendances: {
                where: {
                    date: {
                        gte: new Date(periodYear, periodMonth - 1, 1),
                        lte: new Date(periodYear, periodMonth - 1, daysInMonth, 23, 59, 59)
                    }
                }
            },
            leaves: {
                where: {
                    status: "APPROVED",
                    startDate: {
                        lte: new Date(periodYear, periodMonth - 1, daysInMonth, 23, 59, 59)
                    },
                    endDate: {
                        gte: new Date(periodYear, periodMonth - 1, 1)
                    }
                }
            }
        }
    })

    if (employees.length === 0) {
        throw new Error("No active employees found to generate payroll.")
    }

    // Default corporate structure fallback if employee doesn't have one assigned
    let defaultStructure = await prisma.salaryStructure.findFirst({
        where: { tenantId, isActive: true }
    })

    if (!defaultStructure) {
        defaultStructure = await prisma.salaryStructure.create({
            data: {
                tenantId,
                name: "Standard Corporate Structure",
                code: "SAL-STD",
                description: "Standard statutory compensation template",
                basicPercentage: 50,
                hraPercentage: 20,
                conveyanceMonthly: 1600,
                medicalMonthly: 1250,
                specialAllowancePct: 15,
                pfEmployeeRate: 12,
                pfEmployerRate: 12,
                esiEmployeeRate: 0.75,
                esiEmployerRate: 3.25,
                professionalTax: 200,
                tdsPercentage: 0
            }
        })
    }

    let totalGrossAccum = 0
    let totalDeductionsAccum = 0
    let totalNetPayAccum = 0

    const payslipsData: any[] = []

    for (let i = 0; i < employees.length; i++) {
        const emp = employees[i]
        const structure = emp.salaryStructure || defaultStructure

        // Monthly compensation CTC (default to ₹35,000 if not specified on employee)
        const monthlyCtc = emp.basicSalary ? Number(emp.basicSalary) : 35000

        // Attendance & Leave calculations
        const attendances = emp.attendances
        const approvedLeaves = emp.leaves

        let presentDays = daysInMonth
        let paidLeaveDays = 0
        let unpaidLeaveDays = 0

        if (attendances.length > 0) {
            let actualPresent = 0
            attendances.forEach((att: any) => {
                if (att.status === "PRESENT") actualPresent += 1
                else if (att.status === "HALF_DAY") actualPresent += 0.5
            })
            presentDays = actualPresent
        }

        approvedLeaves.forEach((lv: any) => {
            const days = Number(lv.days) || 1
            if (lv.type === "UNPAID") {
                unpaidLeaveDays += days
            } else {
                paidLeaveDays += days
            }
        })

        // Working days count
        const workingDays = daysInMonth

        // Proration factor for unpaid leaves
        const dailyRate = monthlyCtc / workingDays
        const unpaidLeaveDeduction = Math.round(unpaidLeaveDays * dailyRate)

        // Earnings
        const basicSalary = Math.round(monthlyCtc * (Number(structure.basicPercentage) / 100))
        const hra = Math.round(monthlyCtc * (Number(structure.hraPercentage) / 100))
        const conveyance = Number(structure.conveyanceMonthly)
        const medical = Number(structure.medicalMonthly)
        const specialAllowance = Math.max(0, Math.round(monthlyCtc - (basicSalary + hra + conveyance + medical)))
        const bonus = 0
        const totalGross = basicSalary + hra + conveyance + medical + specialAllowance + bonus

        // Deductions
        const pfEmployee = Math.round(basicSalary * (Number(structure.pfEmployeeRate) / 100))
        // ESI applicable if gross <= 21,000 INR
        const esiEmployee = totalGross <= 21000 ? Math.round(totalGross * (Number(structure.esiEmployeeRate) / 100)) : 0
        const professionalTax = Number(structure.professionalTax)
        const tdsDeduction = Math.round(totalGross * (Number(structure.tdsPercentage) / 100))
        const otherDeductions = 0

        const totalDeductions = pfEmployee + esiEmployee + professionalTax + tdsDeduction + unpaidLeaveDeduction + otherDeductions
        const netSalary = Math.max(0, totalGross - totalDeductions)

        totalGrossAccum += totalGross
        totalDeductionsAccum += totalDeductions
        totalNetPayAccum += netSalary

        // Extract employee bank details snapshot
        const bank = (emp.bankDetails as any) || {}

        const slipNumber = `SLIP-${periodYear}${String(periodMonth).padStart(2, "0")}-${String(i + 1).padStart(3, "0")}`

        payslipsData.push({
            employeeId: emp.id,
            slipNumber,
            periodMonth,
            periodYear,
            status: "DRAFT",
            workingDays,
            presentDays,
            paidLeaveDays,
            unpaidLeaveDays,
            basicSalary,
            hra,
            conveyance,
            medical,
            specialAllowance,
            bonus,
            totalGross,
            pfEmployee,
            esiEmployee,
            professionalTax,
            tdsDeduction,
            unpaidLeaveDeduction,
            otherDeductions,
            totalDeductions,
            netSalary,
            bankName: bank.bankName || null,
            bankAccountNumber: bank.accountNumber || null,
            bankIfsc: bank.ifscRoutingCode || null,
            paymentDate: payDate,
            paymentMethod: "DIRECT_DEPOSIT"
        })
    }

    // Execute in transaction
    const result = await prisma.$transaction(async (tx: any) => {
        // If a draft exists, remove its old payslips
        if (existing && existing.status === "DRAFT") {
            await tx.payslip.deleteMany({
                where: { payrollRunId: existing.id }
            })
            await tx.payrollRun.delete({
                where: { id: existing.id }
            })
        }

        const run = await tx.payrollRun.create({
            data: {
                tenantId,
                runNumber,
                periodMonth,
                periodYear,
                payDate,
                status: "DRAFT",
                employeeCount: employees.length,
                totalGross: totalGrossAccum,
                totalDeductions: totalDeductionsAccum,
                totalNetPay: totalNetPayAccum,
                paymentMethod: "DIRECT_DEPOSIT",
                notes
            }
        })

        // Create individual payslips
        for (const slip of payslipsData) {
            await tx.payslip.create({
                data: {
                    ...slip,
                    tenantId,
                    payrollRunId: run.id
                }
            })
        }

        return run
    })

    revalidatePath("/hr")
    return { success: true, payRunId: result.id, runNumber: result.runNumber }
}

/**
 * Approve a draft pay run
 */
export async function approvePayRun(payRunId: string) {
    const tenantId = await getTenantId()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const run = await prisma.payrollRun.findUnique({
        where: { id: payRunId, tenantId }
    })

    if (!run) throw new Error("Payroll run not found")
    if (run.status !== "DRAFT") throw new Error("Only draft pay runs can be approved")

    const updated = await prisma.payrollRun.update({
        where: { id: payRunId },
        data: {
            status: "APPROVED",
            approvedAt: new Date(),
            approvedById: user?.id || null
        }
    })

    revalidatePath("/hr")
    return { success: true, run: updated }
}

/**
 * Disburse / mark pay run as PAID
 */
export async function processPayRun(
    payRunId: string,
    paymentMethod: string = "DIRECT_DEPOSIT",
    paymentReference?: string
) {
    const tenantId = await getTenantId()

    const run = await prisma.payrollRun.findUnique({
        where: { id: payRunId, tenantId },
        include: { payslips: true }
    })

    if (!run) throw new Error("Payroll run not found")

    await prisma.$transaction(async (tx: any) => {
        // Update run
        await tx.payrollRun.update({
            where: { id: payRunId },
            data: {
                status: "PAID",
                paidAt: new Date(),
                paymentMethod,
                paymentReference
            }
        })

        // Update all payslips
        await tx.payslip.updateMany({
            where: { payrollRunId: payRunId },
            data: {
                status: "PAID",
                paymentDate: new Date(),
                paymentMethod,
                transactionRef: paymentReference
            }
        })
    })

    revalidatePath("/hr")
    return { success: true }
}

/**
 * Delete a draft pay run
 */
export async function deletePayRun(payRunId: string) {
    const tenantId = await getTenantId()

    const run = await prisma.payrollRun.findUnique({
        where: { id: payRunId, tenantId }
    })

    if (!run) throw new Error("Payroll run not found")
    if (run.status !== "DRAFT") throw new Error("Only draft pay runs can be deleted")

    await prisma.$transaction(async (tx: any) => {
        await tx.payslip.deleteMany({
            where: { payrollRunId: payRunId }
        })
        await tx.payrollRun.delete({
            where: { id: payRunId }
        })
    })

    revalidatePath("/hr")
    return { success: true }
}

/**
 * Fetch detailed payslip document with organization letterhead details
 */
export async function getPayslipDetails(payslipId: string) {
    const tenantId = await getTenantId()

    const [slip, tenant] = await Promise.all([
        prisma.payslip.findUnique({
            where: { id: payslipId, tenantId },
            include: {
                employee: {
                    include: {
                        department: true,
                        designation: true
                    }
                },
                payrollRun: true
            }
        }),
        prisma.tenant.findUnique({
            where: { id: tenantId }
        })
    ])

    if (!slip) throw new Error("Payslip record not found")

    return {
        slip: {
            ...slip,
            presentDays: Number(slip.presentDays),
            paidLeaveDays: Number(slip.paidLeaveDays),
            unpaidLeaveDays: Number(slip.unpaidLeaveDays),
            basicSalary: Number(slip.basicSalary),
            hra: Number(slip.hra),
            conveyance: Number(slip.conveyance),
            medical: Number(slip.medical),
            specialAllowance: Number(slip.specialAllowance),
            bonus: Number(slip.bonus),
            totalGross: Number(slip.totalGross),
            pfEmployee: Number(slip.pfEmployee),
            esiEmployee: Number(slip.esiEmployee),
            professionalTax: Number(slip.professionalTax),
            tdsDeduction: Number(slip.tdsDeduction),
            unpaidLeaveDeduction: Number(slip.unpaidLeaveDeduction),
            otherDeductions: Number(slip.otherDeductions),
            totalDeductions: Number(slip.totalDeductions),
            netSalary: Number(slip.netSalary)
        },
        company: {
            name: tenant?.name || "Genesoft Enterprise",
            email: tenant?.billingEmail || "payroll@genesoft.erp",
            currency: tenant?.currency || "INR"
        }
    }
}
