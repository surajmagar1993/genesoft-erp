"use server"

import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getTenantId, getTenantManagerId } from "@/lib/get-tenant-id"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { revalidatePath } from "next/cache"
import { BudgetPeriodType, BudgetStatus, AccountType } from "@prisma/client"

export interface BudgetItemDetail {
    id: string
    budgetId: string
    accountId: string
    accountCode: string
    accountName: string
    category: string | null
    budgetedAmount: number
    actualAmount: number
    varianceAmount: number
    utilizationPercent: number
    status: "HEALTHY" | "WARNING" | "CRITICAL"
    notes: string | null
}

export interface BudgetSummary {
    id: string
    name: string
    fiscalYear: string
    periodType: BudgetPeriodType
    startDate: Date
    endDate: Date
    status: BudgetStatus
    departmentId: string | null
    departmentName: string | null
    departmentCode: string | null
    totalBudgetedAmount: number
    totalActualAmount: number
    varianceAmount: number
    utilizationPercent: number
    alertThresholdPercent: number
    criticalThresholdPercent: number
    burnStatus: "HEALTHY" | "WARNING" | "CRITICAL"
    itemCount: number
    approvedBy: string | null
    approvedAt: Date | null
    notes: string | null
    createdAt: Date
    updatedAt: Date
}

export interface BudgetTelemetry {
    totalAllocatedBudget: number
    totalActualSpend: number
    netBudgetRunway: number
    averageUtilizationPercent: number
    totalBudgetsCount: number
    activeBudgetsCount: number
    warningBudgetsCount: number
    criticalBudgetsCount: number
}

export interface BudgetsOverviewData {
    telemetry: BudgetTelemetry
    budgets: BudgetSummary[]
    departments: { id: string; name: string; code: string | null }[]
    expenseAccounts: { id: string; code: string; name: string; type: string }[]
    standardCategories: string[]
}

export interface BudgetDetailData {
    budget: BudgetSummary
    items: BudgetItemDetail[]
    recentExpenses: {
        id: string
        expenseNumber: string
        title: string
        category: string
        accountId: string
        accountCode: string
        accountName: string
        amount: number
        totalAmount: number
        expenseDate: Date
        vendorName: string | null
    }[]
}

const STANDARD_EXPENSE_CATEGORIES = [
    "Software & Hosting",
    "Rent & Facilities",
    "Utilities",
    "Office Supplies",
    "Salaries & Wages",
    "Travel & Meals",
    "Marketing & Advertising",
    "Professional Fees",
    "Equipment & Maintenance",
    "Research & Development",
    "Logistics & Shipping",
    "Miscellaneous",
]

/**
 * Retrieves the comprehensive Budgeting Overview, including telemetry, all budget plans with real-time actuals,
 * active departments, and Chart of Accounts expense accounts.
 */
/**
 * Actual spend per account from the general ledger (posted journal lines,
 * net of tax): expenses, bills and payroll all post there.
 */
async function ledgerSpendByAccount(tenantId: string, start: Date, end: Date, accountIds: string[]): Promise<Map<string, number>> {
    const out = new Map<string, number>()
    if (accountIds.length === 0) return out
    const rows: { account_id: string; net: number }[] = await prisma.$queryRaw`
        select l.account_id::text as account_id, coalesce(sum(l.debit - l.credit), 0)::float8 as net
        from journal_entry_lines l join journal_entries j on j.id = l.journal_entry_id
        where l.tenant_id = ${tenantId}::uuid and j.status = 'POSTED' and j.date >= ${start} and j.date <= ${end}
          and l.account_id = any(${accountIds}::uuid[])
        group by l.account_id`
    for (const r of rows) out.set(r.account_id, Math.round(r.net * 100) / 100)
    return out
}

export async function getBudgetsOverview(filters?: {
    fiscalYear?: string
    departmentId?: string
    status?: string
}): Promise<BudgetsOverviewData> {
    const tenantId = await getTenantId()

    // 1. Fetch departments and expense accounts for form pickers
    const [departments, expenseAccounts, rawBudgets] = await Promise.all([
        prisma.department.findMany({
            where: { tenantId, isActive: true },
            select: { id: true, name: true, code: true },
            orderBy: { name: "asc" }
        }),
        prisma.account.findMany({
            where: {
                tenantId,
                type: AccountType.EXPENSE,
                isActive: true
            },
            select: { id: true, code: true, name: true, type: true },
            orderBy: { code: "asc" }
        }),
        prisma.budget.findMany({
            where: {
                tenantId,
                ...(filters?.fiscalYear && filters.fiscalYear !== "ALL" ? { fiscalYear: filters.fiscalYear } : {}),
                ...(filters?.departmentId && filters.departmentId !== "ALL" ? { departmentId: filters.departmentId } : {}),
                ...(filters?.status && filters.status !== "ALL" ? { status: filters.status as BudgetStatus } : {})
            },
            include: {
                department: {
                    select: { id: true, name: true, code: true }
                },
                items: {
                    include: {
                        account: {
                            select: { id: true, code: true, name: true }
                        }
                    }
                }
            },
            orderBy: [{ fiscalYear: "desc" }, { startDate: "desc" }]
        })
    ])

    let totalAllocatedBudget = 0
    let totalActualSpend = 0
    let activeBudgetsCount = 0
    let warningBudgetsCount = 0
    let criticalBudgetsCount = 0

    // 2. Actual spend per budget, from the general ledger
    const spendByBudget = new Map<string, Map<string, number>>()
    for (const b of rawBudgets as { id: string; startDate: Date; endDate: Date; items: { accountId: string }[] }[]) {
        spendByBudget.set(b.id, await ledgerSpendByAccount(tenantId, new Date(b.startDate), new Date(b.endDate), [...new Set(b.items.map((i) => i.accountId))]))
    }

    const budgets: BudgetSummary[] = rawBudgets.map((b: any) => {
        const budgetStart = new Date(b.startDate)
        const budgetEnd = new Date(b.endDate)

        // Actuals for the budgeted accounts in this plan's window (from the ledger)
        const spend = spendByBudget.get(b.id) || new Map<string, number>()
        const planActualAmount = (b.items as { accountId: string }[]).reduce((sum, i) => sum + (spend.get(i.accountId) || 0), 0)

        const totalBudgeted = Number(b.totalBudgetedAmount || 0)
        const variance = totalBudgeted - planActualAmount
        const utilPercent = totalBudgeted > 0 ? (planActualAmount / totalBudgeted) * 100 : 0

        let burnStatus: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY"
        if (utilPercent >= b.criticalThresholdPercent) {
            burnStatus = "CRITICAL"
            criticalBudgetsCount++
        } else if (utilPercent >= b.alertThresholdPercent) {
            burnStatus = "WARNING"
            warningBudgetsCount++
        }

        if (b.status === "ACTIVE") {
            activeBudgetsCount++
        }

        totalAllocatedBudget += totalBudgeted
        totalActualSpend += planActualAmount

        return {
            id: b.id,
            name: b.name,
            fiscalYear: b.fiscalYear,
            periodType: b.periodType,
            startDate: b.startDate,
            endDate: b.endDate,
            status: b.status,
            departmentId: b.departmentId,
            departmentName: b.department?.name || null,
            departmentCode: b.department?.code || null,
            totalBudgetedAmount: totalBudgeted,
            totalActualAmount: planActualAmount,
            varianceAmount: variance,
            utilizationPercent: Math.round(utilPercent * 10) / 10,
            alertThresholdPercent: b.alertThresholdPercent,
            criticalThresholdPercent: b.criticalThresholdPercent,
            burnStatus,
            itemCount: b.items.length,
            approvedBy: b.approvedBy,
            approvedAt: b.approvedAt,
            notes: b.notes,
            createdAt: b.createdAt,
            updatedAt: b.updatedAt
        }
    })

    const netBudgetRunway = totalAllocatedBudget - totalActualSpend
    const averageUtilizationPercent =
        totalAllocatedBudget > 0 ? Math.round((totalActualSpend / totalAllocatedBudget) * 1000) / 10 : 0

    return {
        telemetry: {
            totalAllocatedBudget,
            totalActualSpend,
            netBudgetRunway,
            averageUtilizationPercent,
            totalBudgetsCount: budgets.length,
            activeBudgetsCount,
            warningBudgetsCount,
            criticalBudgetsCount
        },
        budgets,
        departments,
        expenseAccounts,
        standardCategories: STANDARD_EXPENSE_CATEGORIES
    }
}

/**
 * Retrieves detailed breakdown of a single budget plan with item-by-item actuals vs budget variance,
 * along with recent transactions matching the budget period.
 */
export async function getBudgetDetail(id: string): Promise<BudgetDetailData | null> {
    const tenantId = await getTenantId()

    const rawBudget = await prisma.budget.findFirst({
        where: { id, tenantId },
        include: {
            department: {
                select: { id: true, name: true, code: true }
            },
            items: {
                include: {
                    account: {
                        select: { id: true, code: true, name: true }
                    }
                },
                orderBy: { account: { code: "asc" } }
            }
        }
    })

    if (!rawBudget) return null

    const budgetStart = new Date(rawBudget.startDate)
    const budgetEnd = new Date(rawBudget.endDate)

    // Fetch expenses for the account lines within this budget's timeframe
    const relevantExpenses = await prisma.expense.findMany({
        where: {
            tenantId,
            expenseDate: {
                gte: budgetStart,
                lte: budgetEnd
            },
            status: { notIn: ["DRAFT", "REJECTED", "VOID"] }
        },
        include: {
            expenseAccount: {
                select: { id: true, code: true, name: true }
            }
        },
        orderBy: { expenseDate: "desc" },
        take: 50
    })

    // Actuals per account from the general ledger (the list above is only the latest 50, for display)
    const expensesByAccount = await ledgerSpendByAccount(tenantId, budgetStart, budgetEnd, [...new Set((rawBudget.items as { accountId: string }[]).map((i) => i.accountId))])

    let planTotalActual = 0

    const items: BudgetItemDetail[] = rawBudget.items.map((item: any) => {
        const budgeted = Number(item.budgetedAmount || 0)
        const actual = expensesByAccount.get(item.accountId) || 0
        const variance = budgeted - actual
        const utilPercent = budgeted > 0 ? (actual / budgeted) * 100 : 0
        planTotalActual += actual

        let status: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY"
        if (utilPercent >= rawBudget.criticalThresholdPercent) {
            status = "CRITICAL"
        } else if (utilPercent >= rawBudget.alertThresholdPercent) {
            status = "WARNING"
        }

        return {
            id: item.id,
            budgetId: item.budgetId,
            accountId: item.accountId,
            accountCode: item.account.code,
            accountName: item.account.name,
            category: item.category,
            budgetedAmount: budgeted,
            actualAmount: actual,
            varianceAmount: variance,
            utilizationPercent: Math.round(utilPercent * 10) / 10,
            status,
            notes: item.notes
        }
    })

    const totalBudgeted = Number(rawBudget.totalBudgetedAmount || 0)
    const variance = totalBudgeted - planTotalActual
    const totalUtil = totalBudgeted > 0 ? (planTotalActual / totalBudgeted) * 100 : 0

    let planBurnStatus: "HEALTHY" | "WARNING" | "CRITICAL" = "HEALTHY"
    if (totalUtil >= rawBudget.criticalThresholdPercent) {
        planBurnStatus = "CRITICAL"
    } else if (totalUtil >= rawBudget.alertThresholdPercent) {
        planBurnStatus = "WARNING"
    }

    const budgetSummary: BudgetSummary = {
        id: rawBudget.id,
        name: rawBudget.name,
        fiscalYear: rawBudget.fiscalYear,
        periodType: rawBudget.periodType,
        startDate: rawBudget.startDate,
        endDate: rawBudget.endDate,
        status: rawBudget.status,
        departmentId: rawBudget.departmentId,
        departmentName: rawBudget.department?.name || null,
        departmentCode: rawBudget.department?.code || null,
        totalBudgetedAmount: totalBudgeted,
        totalActualAmount: planTotalActual,
        varianceAmount: variance,
        utilizationPercent: Math.round(totalUtil * 10) / 10,
        alertThresholdPercent: rawBudget.alertThresholdPercent,
        criticalThresholdPercent: rawBudget.criticalThresholdPercent,
        burnStatus: planBurnStatus,
        itemCount: rawBudget.items.length,
        approvedBy: rawBudget.approvedBy,
        approvedAt: rawBudget.approvedAt,
        notes: rawBudget.notes,
        createdAt: rawBudget.createdAt,
        updatedAt: rawBudget.updatedAt
    }

    return {
        budget: budgetSummary,
        items,
        recentExpenses: relevantExpenses.map((e: any) => ({
            id: e.id,
            expenseNumber: e.expenseNumber,
            title: e.title,
            category: e.category,
            accountId: e.accountId,
            accountCode: e.expenseAccount.code,
            accountName: e.expenseAccount.name,
            amount: Number(e.amount),
            totalAmount: Number(e.totalAmount),
            expenseDate: e.expenseDate,
            vendorName: e.vendorName
        }))
    }
}

/**
 * Creates a new Budget plan with line item allocations.
 */
export async function createBudget(data: {
    name: string
    fiscalYear: string
    periodType: BudgetPeriodType
    startDate: string
    endDate: string
    departmentId?: string | null
    alertThresholdPercent?: number
    criticalThresholdPercent?: number
    notes?: string | null
    items: {
        accountId: string
        category?: string | null
        budgetedAmount: number
        notes?: string | null
    }[]
}) {
    const tenantId = await getTenantManagerId()
    await assertTenantRefs(tenantId, { department: data.departmentId, account: data.items.map((i) => i.accountId) })

    if (!data.name?.trim()) throw new Error("Budget plan name is required.")
    if (!data.fiscalYear?.trim()) throw new Error("Fiscal year is required.")
    if (!data.startDate || !data.endDate) throw new Error("Start date and End date are required.")
    if (new Date(data.endDate) <= new Date(data.startDate)) {
        throw new Error("End date must be strictly after Start date.")
    }
    if (!data.items || data.items.length === 0) {
        throw new Error("At least one expense account allocation line is required.")
    }

    // Compute total budgeted amount
    const totalBudgetedAmount = data.items.reduce(
        (sum, item) => sum + (Number(item.budgetedAmount) || 0),
        0
    )

    const budget = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const createdBudget = await tx.budget.create({
            data: {
                tenantId,
                name: data.name.trim(),
                fiscalYear: data.fiscalYear.trim(),
                periodType: data.periodType || BudgetPeriodType.ANNUAL,
                startDate: new Date(data.startDate),
                endDate: new Date(data.endDate),
                status: BudgetStatus.DRAFT,
                departmentId: data.departmentId || null,
                totalBudgetedAmount,
                alertThresholdPercent: data.alertThresholdPercent || 80,
                criticalThresholdPercent: data.criticalThresholdPercent || 100,
                notes: data.notes?.trim() || null
            }
        })

        // Insert line items
        await tx.budgetItem.createMany({
            data: data.items.map((item) => ({
                tenantId,
                budgetId: createdBudget.id,
                accountId: item.accountId,
                category: item.category?.trim() || null,
                budgetedAmount: Number(item.budgetedAmount) || 0,
                notes: item.notes?.trim() || null
            }))
        })

        return createdBudget
    })

    revalidatePath("/finance/budgets")
    return { success: true, budgetId: budget.id }
}

/**
 * Updates an existing Budget plan's metadata and line item allocations.
 */
export async function updateBudget(
    id: string,
    data: {
        name?: string
        fiscalYear?: string
        periodType?: BudgetPeriodType
        startDate?: string
        endDate?: string
        departmentId?: string | null
        alertThresholdPercent?: number
        criticalThresholdPercent?: number
        notes?: string | null
        items?: {
            id?: string
            accountId: string
            category?: string | null
            budgetedAmount: number
            notes?: string | null
        }[]
    }
) {
    const tenantId = await getTenantManagerId()
    await assertTenantRefs(tenantId, { department: data.departmentId, account: data.items?.map((i) => i.accountId) })

    const existing = await prisma.budget.findFirst({
        where: { id, tenantId },
        include: { items: true }
    })

    if (!existing) throw new Error("Budget plan not found or access denied.")
    if (existing.status === BudgetStatus.CLOSED) {
        throw new Error("Cannot modify a closed budget plan.")
    }

    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        let totalBudgetedAmount = Number(existing.totalBudgetedAmount)

        if (data.items) {
            totalBudgetedAmount = data.items.reduce(
                (sum, item) => sum + (Number(item.budgetedAmount) || 0),
                0
            )

            // Replace line items
            await tx.budgetItem.deleteMany({
                where: { budgetId: id }
            })

            await tx.budgetItem.createMany({
                data: data.items.map((item) => ({
                    tenantId,
                    budgetId: id,
                    accountId: item.accountId,
                    category: item.category?.trim() || null,
                    budgetedAmount: Number(item.budgetedAmount) || 0,
                    notes: item.notes?.trim() || null
                }))
            })
        }

        const updateData: any = {
            totalBudgetedAmount
        }

        if (data.name !== undefined) updateData.name = data.name.trim()
        if (data.fiscalYear !== undefined) updateData.fiscalYear = data.fiscalYear.trim()
        if (data.periodType !== undefined) updateData.periodType = data.periodType
        if (data.startDate !== undefined) updateData.startDate = new Date(data.startDate)
        if (data.endDate !== undefined) updateData.endDate = new Date(data.endDate)
        if (data.departmentId !== undefined) updateData.departmentId = data.departmentId || null
        if (data.alertThresholdPercent !== undefined) updateData.alertThresholdPercent = data.alertThresholdPercent
        if (data.criticalThresholdPercent !== undefined) updateData.criticalThresholdPercent = data.criticalThresholdPercent
        if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null

        await tx.budget.update({
            where: { id },
            data: updateData
        })
    })

    revalidatePath("/finance/budgets")
    return { success: true }
}

/**
 * Transitions a budget's lifecycle status (DRAFT -> SUBMITTED -> APPROVED -> ACTIVE -> CLOSED).
 */
export async function changeBudgetStatus(
    id: string,
    status: BudgetStatus,
    approverName?: string
) {
    const tenantId = await getTenantManagerId()

    const existing = await prisma.budget.findFirst({
        where: { id, tenantId }
    })

    if (!existing) throw new Error("Budget plan not found.")

    const updateData: any = { status }

    if (status === BudgetStatus.APPROVED || status === BudgetStatus.ACTIVE) {
        updateData.approvedBy = approverName || "Financial Controller"
        updateData.approvedAt = new Date()
    }

    await prisma.budget.update({
        where: { id },
        data: updateData
    })

    revalidatePath("/finance/budgets")
    return { success: true }
}

/**
 * Deletes a draft or closed budget plan.
 */
export async function deleteBudget(id: string) {
    const tenantId = await getTenantManagerId()

    const existing = await prisma.budget.findFirst({
        where: { id, tenantId }
    })

    if (!existing) throw new Error("Budget plan not found.")
    if (existing.status === BudgetStatus.ACTIVE) {
        throw new Error("Active budgets cannot be deleted. Close the budget cycle first.")
    }

    await prisma.budget.delete({
        where: { id }
    })

    revalidatePath("/finance/budgets")
    return { success: true }
}
