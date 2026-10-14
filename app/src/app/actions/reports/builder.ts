"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId, getTenantWriterId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

import type {
    DatasetType,
    DatasetMeta,
    ReportConfig,
    ReportQueryResult,
    SavedReportRecord
} from "@/types/report-builder"
import {
    DATASET_DEFINITIONS,
    PREBUILT_TEMPLATES
} from "@/types/report-builder"

/**
 * Initialize Report Builder state
 */
export async function getReportBuilderInitData(): Promise<{
    datasets: DatasetMeta[]
    savedReports: SavedReportRecord[]
}> {
    const tenantId = await getTenantId()

    // Fetch user-saved reports
    const dbReports = await prisma.customReport.findMany({
        where: { tenantId },
        orderBy: { updatedAt: "desc" }
    })

    const userReports: SavedReportRecord[] = dbReports.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        dataset: r.dataset as DatasetType,
        config: r.config as unknown as ReportConfig,
        isPrebuilt: r.isPrebuilt,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt
    }))

    // Merge with prebuilt templates (prebuilts with virtual IDs)
    const virtualPrebuilts: SavedReportRecord[] = PREBUILT_TEMPLATES.map((p, idx) => ({
        ...p,
        id: `prebuilt-${idx + 1}`,
        createdAt: new Date(),
        updatedAt: new Date()
    }))

    return {
        datasets: Object.values(DATASET_DEFINITIONS),
        savedReports: [...virtualPrebuilts, ...userReports]
    }
}

/**
 * Run dynamic custom report query
 */
export async function runCustomReportQuery(config: ReportConfig): Promise<ReportQueryResult> {
    const tenantId = await getTenantId()
    const datasetDef = DATASET_DEFINITIONS[config.dataset]

    if (!datasetDef) {
        throw new Error(`Unsupported dataset: ${config.dataset}`)
    }

    let rawData: Record<string, any>[] = []

    // 1. Fetch raw entity records based on dataset
    switch (config.dataset) {
        case "INVOICES": {
            const invoices = await prisma.invoice.findMany({
                where: { tenantId },
                include: { contact: { select: { displayName: true } } },
                orderBy: { createdAt: "desc" },
                take: 500
            })
            rawData = invoices.map((inv: any) => ({
                invoiceNumber: inv.invoiceNumber,
                customerName: inv.contact?.displayName || "Direct Customer",
                status: inv.status,
                issueDate: inv.issueDate ? inv.issueDate.toISOString().slice(0, 10) : "",
                dueDate: inv.dueDate ? inv.dueDate.toISOString().slice(0, 10) : "",
                subtotal: Number(inv.subtotal || 0),
                taxTotal: Number(inv.taxTotal || 0),
                total: Number(inv.total || 0),
                balanceDue: Number(inv.balanceDue !== null ? inv.balanceDue : inv.total || 0),
                currencyCode: inv.currencyCode || "INR"
            }))
            break
        }

        case "INVENTORY": {
            const products = await prisma.product.findMany({
                where: { tenantId },
                select: { sku: true, name: true, category: true, stockQty: true, unitPrice: true, warehouseStocks: { select: { reorderPoint: true } } },
                orderBy: { name: "asc" },
                take: 500
            })
            rawData = products.map((p: { sku: string | null; name: string; category: string | null; stockQty: unknown; unitPrice: unknown; warehouseStocks: { reorderPoint: unknown }[] }) => {
                const stock = Number(p.stockQty || 0)
                const unitPrice = Number(p.unitPrice || 0)
                // Same reorder rule as Inventory: the lowest reorder point across warehouses (default 10)
                const reorderLevel = p.warehouseStocks.length ? Math.min(...p.warehouseStocks.map((w) => Number(w.reorderPoint))) : 10
                return {
                    sku: p.sku,
                    name: p.name,
                    category: p.category || "Uncategorized",
                    stock,
                    unitPrice,
                    costPrice: null, // purchase cost isn't tracked per product
                    stockValue: Math.round(stock * unitPrice * 100) / 100,
                    reorderLevel,
                    status: stock <= 0 ? "OUT_OF_STOCK" : stock <= reorderLevel ? "LOW_STOCK" : "IN_STOCK"
                }
            })
            break
        }

        case "BILLS": {
            const bills = await prisma.bill.findMany({
                where: { tenantId },
                include: { contact: { select: { displayName: true } }, payments: { select: { amount: true } } },
                orderBy: { billDate: "desc" },
                take: 500
            })
            rawData = bills.map((b: { billNumber: string; contact: { displayName: string } | null; status: string; billDate: Date; dueDate: Date | null; subtotal: unknown; taxAmount: unknown; total: unknown; payments: { amount: unknown }[] }) => {
                const paid = b.payments.reduce((sum, pay) => sum + Number(pay.amount || 0), 0)
                return {
                    billNumber: b.billNumber,
                    vendorName: b.contact?.displayName || "",
                    status: b.status,
                    issueDate: b.billDate.toISOString().slice(0, 10),
                    dueDate: b.dueDate ? b.dueDate.toISOString().slice(0, 10) : "",
                    subtotal: Number(b.subtotal || 0),
                    taxTotal: Number(b.taxAmount || 0),
                    total: Number(b.total || 0),
                    balanceDue: Math.round((Number(b.total || 0) - paid) * 100) / 100
                }
            })
            break
        }

        case "EXPENSES": {
            const expenses = await prisma.expense.findMany({
                where: { tenantId },
                orderBy: { expenseDate: "desc" },
                take: 500
            })
            rawData = expenses.map((e: { expenseNumber: string; category: string; vendorName: string | null; title: string; totalAmount: unknown; amount: unknown; paymentMethod: string | null; expenseDate: Date; status: string }) => ({
                expenseNumber: e.expenseNumber,
                category: e.category,
                payee: e.vendorName || e.title,
                amount: Number(e.totalAmount ?? e.amount ?? 0),
                paymentMethod: e.paymentMethod || "",
                date: e.expenseDate.toISOString().slice(0, 10),
                taxDeductible: null, // not recorded on expenses
                status: e.status
            }))
            break
        }

        case "HR_WORKFORCE": {
            const employees = await prisma.employee.findMany({
                where: { tenantId },
                include: {
                    department: { select: { name: true } },
                    designation: { select: { title: true } }
                },
                orderBy: { displayName: "asc" },
                take: 500
            })
            rawData = employees.map((e: any) => ({
                employeeNumber: e.employeeNumber,
                displayName: e.displayName,
                department: e.department?.name || "General",
                designation: e.designation?.title || "Staff Member",
                employmentType: e.employmentType,
                status: e.status,
                basicSalary: Number(e.basicSalary || 0),
                joiningDate: e.joiningDate ? e.joiningDate.toISOString().slice(0, 10) : ""
            }))
            break
        }

        case "PROJECTS": {
            const tasks = await prisma.projectTask.findMany({
                where: { tenantId },
                include: {
                    project: { select: { name: true } },
                    assignedEmployee: { select: { displayName: true } }
                },
                orderBy: { createdAt: "desc" },
                take: 500
            })
            rawData = tasks.map((t: any) => ({
                taskCode: t.taskCode,
                title: t.title,
                projectName: t.project?.name || "General Project",
                assignee: t.assignedEmployee?.displayName || "Unassigned",
                status: t.status,
                priority: t.priority,
                dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : "",
                estimatedHours: Number(t.estimatedHours || 0)
            }))
            break
        }
    }

    // 2. In-memory dynamic filtering
    const filtered = rawData.filter(row => {
        if (!config.filters || config.filters.length === 0) return true
        return config.filters.every(f => {
            const val = row[f.field]
            if (val === undefined || val === null) return false

            const strVal = String(val).toLowerCase()
            const filterVal = f.value.toLowerCase()

            switch (f.operator) {
                case "equals":
                    return strVal === filterVal
                case "not_equals":
                    return strVal !== filterVal
                case "contains":
                    return strVal.includes(filterVal)
                case "greater_than":
                    return Number(val) > Number(f.value)
                case "less_than":
                    return Number(val) < Number(f.value)
                default:
                    return true
            }
        })
    })

    // 3. Sorting
    if (config.sortBy) {
        const sortField = config.sortBy
        const order = config.sortOrder === "desc" ? -1 : 1
        filtered.sort((a, b) => {
            const aVal = a[sortField]
            const bVal = b[sortField]
            if (aVal === bVal) return 0
            if (aVal > bVal) return order
            return -order
        })
    }

    // 4. Columns to output
    const fieldsToOutput = config.selectedFields.length > 0
        ? config.selectedFields
        : datasetDef.fields.map(f => f.key)

    const columns = fieldsToOutput.map(key => {
        const meta = datasetDef.fields.find(f => f.key === key)
        return {
            key,
            label: meta?.label || key,
            type: meta?.type || "string"
        }
    })

    // 5. Compute summary aggregations
    let aggregateResult: number | null = null
    let aggregateLabel: string | null = null

    if (config.aggregateField && config.aggregateFn) {
        const aggField = config.aggregateField
        const nums = filtered.map(r => Number(r[aggField] || 0)).filter(n => !isNaN(n))

        if (nums.length > 0) {
            switch (config.aggregateFn) {
                case "SUM":
                    aggregateResult = Math.round(nums.reduce((sum, n) => sum + n, 0) * 100) / 100
                    break
                case "AVG":
                    aggregateResult = Math.round((nums.reduce((sum, n) => sum + n, 0) / nums.length) * 100) / 100
                    break
                case "COUNT":
                    aggregateResult = nums.length
                    break
                case "MIN":
                    aggregateResult = Math.min(...nums)
                    break
                case "MAX":
                    aggregateResult = Math.max(...nums)
                    break
            }
        }
        const fieldMeta = datasetDef.fields.find(f => f.key === aggField)
        aggregateLabel = `${config.aggregateFn} of ${fieldMeta?.label || aggField}`
    }

    // Compute column numeric totals for table footer
    const numericTotals: Record<string, number> = {}
    columns.forEach(col => {
        if (col.type === "number") {
            const sum = filtered.reduce((acc, row) => acc + Number(row[col.key] || 0), 0)
            numericTotals[col.key] = Math.round(sum * 100) / 100
        }
    })

    // 6. Generate Chart Data Points (Grouped)
    const chartData: { name: string; value: number }[] = []
    if (config.groupBy && (config.aggregateField || config.aggregateFn === "COUNT")) {
        const groupKey = config.groupBy
        const aggKey = config.aggregateField || groupKey
        const groups: Record<string, number[]> = {}

        filtered.forEach(row => {
            const groupVal = String(row[groupKey] || "Unassigned")
            if (!groups[groupVal]) groups[groupVal] = []
            groups[groupVal].push(Number(row[aggKey] || 0))
        })

        Object.entries(groups).forEach(([name, values]) => {
            let val = 0
            if (config.aggregateFn === "AVG") {
                val = Math.round((values.reduce((s, v) => s + v, 0) / values.length) * 100) / 100
            } else if (config.aggregateFn === "COUNT") {
                val = values.length
            } else {
                val = Math.round(values.reduce((s, v) => s + v, 0) * 100) / 100
            }
            chartData.push({ name, value: val })
        })

        // Sort chart items descending by value, take top 10
        chartData.sort((a, b) => b.value - a.value)
        if (chartData.length > 10) {
            chartData.splice(10)
        }
    }

    return {
        columns,
        rows: filtered,
        totalCount: filtered.length,
        summary: {
            aggregateResult,
            aggregateLabel,
            numericTotals
        },
        chartData
    }
}

/**
 * Save custom report configuration
 */
export async function saveCustomReport(input: {
    id?: string
    name: string
    description?: string
    dataset: DatasetType
    config: ReportConfig
}): Promise<{ success: boolean; id?: string; error?: string }> {
    try {
        const tenantId = await getTenantWriterId()

        if (!input.name.trim()) {
            return { success: false, error: "Report name is required" }
        }

        if (input.id && !input.id.startsWith("prebuilt-")) {
            const updated = await prisma.customReport.update({
                where: { id: input.id, tenantId },
                data: {
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    dataset: input.dataset,
                    config: input.config as any
                }
            })
            revalidatePath("/reports/builder")
            return { success: true, id: updated.id }
        } else {
            const created = await prisma.customReport.create({
                data: {
                    tenantId,
                    name: input.name.trim(),
                    description: input.description?.trim() || null,
                    dataset: input.dataset,
                    config: input.config as any,
                    isPrebuilt: false
                }
            })
            revalidatePath("/reports/builder")
            return { success: true, id: created.id }
        }
    } catch (err: any) {
        console.error("Save custom report failed:", err)
        return { success: false, error: err.message || "Failed to save report" }
    }
}

/**
 * Delete custom report
 */
export async function deleteCustomReport(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantWriterId()

        if (id.startsWith("prebuilt-")) {
            return { success: false, error: "Cannot delete pre-built system templates" }
        }

        await prisma.customReport.delete({
            where: { id, tenantId }
        })

        revalidatePath("/reports/builder")
        return { success: true }
    } catch (err: any) {
        console.error("Delete custom report failed:", err)
        return { success: false, error: err.message || "Failed to delete report" }
    }
}
