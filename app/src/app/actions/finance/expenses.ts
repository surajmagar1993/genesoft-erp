"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    ExpenseStatus,
    JournalSourceType,
    JournalStatus,
    PaymentMethod,
    AccountType,
    Prisma,
} from "@prisma/client"

/* ─────────────────────────────────────────
   Interfaces
───────────────────────────────────────── */

export interface ExpenseRecord {
    id: string
    tenantId: string
    expenseNumber: string
    title: string
    description: string | null
    category: string
    accountId: string
    accountName: string
    accountCode: string
    paymentAccountId: string | null
    paymentAccountName: string | null
    vendorId: string | null
    vendorName: string | null
    employeeId: string | null
    employeeName: string | null
    amount: number
    taxAmount: number
    totalAmount: number
    currencyCode: string
    expenseDate: Date
    paymentMethod: PaymentMethod | null
    paymentReference: string | null
    status: ExpenseStatus
    isReimbursable: boolean
    isClaimSettled: boolean
    receiptUrl: string | null
    notes: string | null
    journalEntryId: string | null
    journalEntryNumber: string | null
    createdAt: Date
}

export interface JournalEntryLineRecord {
    id: string
    journalEntryId: string
    accountId: string
    accountCode: string
    accountName: string
    accountType: AccountType
    debit: number
    credit: number
    description: string | null
    contactId: string | null
    contactName: string | null
}

export interface JournalEntryRecord {
    id: string
    tenantId: string
    entryNumber: string
    date: Date
    reference: string | null
    sourceType: JournalSourceType
    sourceId: string | null
    narration: string
    status: JournalStatus
    totalDebit: number
    totalCredit: number
    currencyCode: string
    createdAt: Date
    lines: JournalEntryLineRecord[]
}

export interface AccountLookup {
    id: string
    code: string
    name: string
    type: AccountType
    balance: number
    currencyCode: string
    isGroup: boolean
}

export interface ContactLookup {
    id: string
    displayName: string
    email: string | null
    phone: string | null
    type: string
}

export interface EmployeeLookup {
    id: string
    employeeNumber: string
    name: string
    email: string
    departmentName: string | null
    designationTitle: string | null
}

export interface ExpensesOverviewStats {
    totalExpenses: number
    pendingApprovalCount: number
    pendingApprovalAmount: number
    inputTaxCredit: number
    topCategoryName: string
    topCategoryAmount: number
    reimbursablePendingCount: number
    totalJournalEntries: number
}

export interface ExpensesOverviewData {
    stats: ExpensesOverviewStats
    expenses: ExpenseRecord[]
    journalEntries: JournalEntryRecord[]
    accounts: AccountLookup[]
    vendors: ContactLookup[]
    employees: EmployeeLookup[]
}

/* ─────────────────────────────────────────
   Helper: Ensure Default Chart of Accounts
───────────────────────────────────────── */

async function ensureDefaultAccounts(tenantId: string) {
    const existing = await prisma.account.findFirst({
        where: { tenantId },
    })

    if (existing) return

    const defaultAccounts = [
        // Assets (1xxx)
        { tenantId, code: "1000", name: "Assets", type: AccountType.ASSET, isGroup: true, description: "All asset accounts", balance: 0, isSystem: true },
        { tenantId, code: "1110", name: "Cash", type: AccountType.ASSET, isGroup: false, description: "Cash in hand", balance: 150000, isSystem: true },
        { tenantId, code: "1120", name: "Bank Account (HDFC)", type: AccountType.ASSET, isGroup: false, description: "Operating Bank Account", balance: 1850000, isSystem: true },
        { tenantId, code: "1200", name: "Accounts Receivable", type: AccountType.ASSET, isGroup: false, description: "Customer receivables", balance: 450000, isSystem: true },
        { tenantId, code: "1400", name: "Input GST (ITC)", type: AccountType.ASSET, isGroup: false, description: "Input Tax Credit Receivable", balance: 42000, isSystem: true },

        // Liabilities (2xxx)
        { tenantId, code: "2000", name: "Liabilities", type: AccountType.LIABILITY, isGroup: true, description: "All liability accounts", balance: 0, isSystem: true },
        { tenantId, code: "2100", name: "Accounts Payable", type: AccountType.LIABILITY, isGroup: false, description: "Vendor payables", balance: 320000, isSystem: true },
        { tenantId, code: "2200", name: "GST Output Payable", type: AccountType.LIABILITY, isGroup: false, description: "Output tax collected", balance: 75000, isSystem: true },

        // Equity (3xxx)
        { tenantId, code: "3000", name: "Equity", type: AccountType.EQUITY, isGroup: true, description: "Capital accounts", balance: 0, isSystem: true },
        { tenantId, code: "3100", name: "Owner's Capital", type: AccountType.EQUITY, isGroup: false, description: "Founder equity", balance: 2000000, isSystem: true },

        // Revenue (4xxx)
        { tenantId, code: "4000", name: "Revenue", type: AccountType.REVENUE, isGroup: true, description: "Operating income", balance: 0, isSystem: true },
        { tenantId, code: "4100", name: "Sales Revenue", type: AccountType.REVENUE, isGroup: false, description: "Income from sales & services", balance: 850000, isSystem: true },

        // Expenses (5xxx)
        { tenantId, code: "5000", name: "Expenses", type: AccountType.EXPENSE, isGroup: true, description: "Operating expenses", balance: 0, isSystem: true },
        { tenantId, code: "5100", name: "Cost of Goods Sold (COGS)", type: AccountType.EXPENSE, isGroup: false, description: "Direct product costs", balance: 180000, isSystem: true },
        { tenantId, code: "5200", name: "Salaries & Wages", type: AccountType.EXPENSE, isGroup: false, description: "Staff payroll & bonuses", balance: 320000, isSystem: false },
        { tenantId, code: "5300", name: "Rent & Facilities", type: AccountType.EXPENSE, isGroup: false, description: "Office & depot lease", balance: 95000, isSystem: false },
        { tenantId, code: "5400", name: "Utilities & Electricity", type: AccountType.EXPENSE, isGroup: false, description: "Power, water, internet", balance: 24000, isSystem: false },
        { tenantId, code: "5500", name: "Office Supplies & Consumables", type: AccountType.EXPENSE, isGroup: false, description: "Stationery, pantry", balance: 14500, isSystem: false },
        { tenantId, code: "5600", name: "Marketing & Advertising", type: AccountType.EXPENSE, isGroup: false, description: "Digital ads, campaigns", balance: 68000, isSystem: false },
        { tenantId, code: "5650", name: "Software & Cloud Infrastructure", type: AccountType.EXPENSE, isGroup: false, description: "AWS, GCP, SaaS tools", balance: 125000, isSystem: false },
        { tenantId, code: "5700", name: "Travel & Business Meals", type: AccountType.EXPENSE, isGroup: false, description: "Client travel, lodging", balance: 41000, isSystem: false },
        { tenantId, code: "5800", name: "Professional & Legal Fees", type: AccountType.EXPENSE, isGroup: false, description: "Auditing, compliance", balance: 35000, isSystem: false },
        { tenantId, code: "5950", name: "Miscellaneous Expenses", type: AccountType.EXPENSE, isGroup: false, description: "Uncategorized small expenses", balance: 8500, isSystem: false },
    ]

    for (const acc of defaultAccounts) {
        await prisma.account.create({
            data: acc,
        })
    }
}

/* ─────────────────────────────────────────
   Auto-Seeder: Starter Expenses & Journal Entries
───────────────────────────────────────── */

export async function autoSeedExpensesIfEmpty(tenantId: string) {
    await ensureDefaultAccounts(tenantId)

    const existingExpense = await prisma.expense.findFirst({
        where: { tenantId },
    })

    if (existingExpense) return

    // Find accounts to link
    const bankAcc = await prisma.account.findFirst({ where: { tenantId, code: "1120" } })
    const cashAcc = await prisma.account.findFirst({ where: { tenantId, code: "1110" } })
    const itcAcc = await prisma.account.findFirst({ where: { tenantId, code: "1400" } })

    const softwareAcc = await prisma.account.findFirst({ where: { tenantId, code: "5650" } })
    const rentAcc = await prisma.account.findFirst({ where: { tenantId, code: "5300" } })
    const utilAcc = await prisma.account.findFirst({ where: { tenantId, code: "5400" } })
    const travelAcc = await prisma.account.findFirst({ where: { tenantId, code: "5700" } })
    const marketingAcc = await prisma.account.findFirst({ where: { tenantId, code: "5600" } })

    const defaultPaymentAccId = bankAcc?.id || cashAcc?.id || (await prisma.account.findFirst({ where: { tenantId, type: AccountType.ASSET, isGroup: false } }))?.id
    const defaultExpenseAccId = softwareAcc?.id || (await prisma.account.findFirst({ where: { tenantId, type: AccountType.EXPENSE, isGroup: false } }))?.id

    if (!defaultExpenseAccId || !defaultPaymentAccId) return

    // Sample starter operational expenses
    const seedExpenses = [
        {
            expenseNumber: "EXP-2026-0001",
            title: "AWS Cloud Infrastructure & EC2 Hosting",
            description: "Monthly cloud compute, RDS database hosting and S3 storage",
            category: "Software & Hosting",
            accountId: softwareAcc?.id || defaultExpenseAccId,
            paymentAccountId: bankAcc?.id || defaultPaymentAccId,
            vendorName: "Amazon Web Services India Pvt Ltd",
            amount: 45000,
            taxAmount: 8100, // 18% GST
            totalAmount: 53100,
            currencyCode: "INR",
            expenseDate: new Date(Date.now() - 14 * 86400000),
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            paymentReference: "NEFT-HDFC-99120481",
            status: ExpenseStatus.PAID,
            isReimbursable: false,
            notes: "Routine monthly infrastructure bill.",
        },
        {
            expenseNumber: "EXP-2026-0002",
            title: "Corporate Headquarters Office Rent",
            description: "Office rent for Mumbai HQ - Bandra Kurla Complex",
            category: "Rent & Facilities",
            accountId: rentAcc?.id || defaultExpenseAccId,
            paymentAccountId: bankAcc?.id || defaultPaymentAccId,
            vendorName: "Nesco Realty & Leasing Trust",
            amount: 85000,
            taxAmount: 15300, // 18% GST
            totalAmount: 100300,
            currencyCode: "INR",
            expenseDate: new Date(Date.now() - 10 * 86400000),
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            paymentReference: "RTGS-BKC-771920",
            status: ExpenseStatus.PAID,
            isReimbursable: false,
            notes: "Monthly commercial lease voucher.",
        },
        {
            expenseNumber: "EXP-2026-0003",
            title: "Google Ads & Performance Marketing",
            description: "Q3 customer acquisition search campaigns and lead ads",
            category: "Marketing & Advertising",
            accountId: marketingAcc?.id || defaultExpenseAccId,
            paymentAccountId: bankAcc?.id || defaultPaymentAccId,
            vendorName: "Google India Pvt Ltd",
            amount: 32000,
            taxAmount: 5760,
            totalAmount: 37760,
            currencyCode: "INR",
            expenseDate: new Date(Date.now() - 6 * 86400000),
            paymentMethod: PaymentMethod.CREDIT_CARD,
            paymentReference: "CORP-VISA-4402",
            status: ExpenseStatus.PAID,
            isReimbursable: false,
            notes: "Ad campaigns for ERP launch.",
        },
        {
            expenseNumber: "EXP-2026-0004",
            title: "Client Pitch Travel & Hotel - Bangalore",
            description: "Flight tickets, hotel accommodation and client business dinner",
            category: "Travel & Meals",
            accountId: travelAcc?.id || defaultExpenseAccId,
            paymentAccountId: cashAcc?.id || defaultPaymentAccId,
            vendorName: "MakeMyTrip Corporate",
            amount: 18500,
            taxAmount: 3330,
            totalAmount: 21830,
            currencyCode: "INR",
            expenseDate: new Date(Date.now() - 3 * 86400000),
            paymentMethod: PaymentMethod.UPI,
            paymentReference: "UPI-INDIGO-881239",
            status: ExpenseStatus.PENDING_APPROVAL,
            isReimbursable: true,
            notes: "Submitted by sales lead for enterprise prospect demo.",
        },
        {
            expenseNumber: "EXP-2026-0005",
            title: "High-Speed Leased Line Internet & Telecom",
            description: "Tata Teleservices 1 Gbps dedicated leased line for engineering depot",
            category: "Utilities",
            accountId: utilAcc?.id || defaultExpenseAccId,
            paymentAccountId: bankAcc?.id || defaultPaymentAccId,
            vendorName: "Tata Teleservices Limited",
            amount: 12000,
            taxAmount: 2160,
            totalAmount: 14160,
            currencyCode: "INR",
            expenseDate: new Date(Date.now() - 1 * 86400000),
            paymentMethod: PaymentMethod.BANK_TRANSFER,
            paymentReference: "IMPS-TT-1182390",
            status: ExpenseStatus.PAID,
            isReimbursable: false,
            notes: "Office backbone connectivity.",
        },
    ]

    let jeCounter = 1

    for (const item of seedExpenses) {
        let createdJeId: string | null = null

        // If PAID, auto-create a balanced Journal Voucher
        if (item.status === ExpenseStatus.PAID) {
            const entryNum = `JE-2026-${String(jeCounter).padStart(4, "0")}`
            jeCounter++

            const linesToCreate: any[] = [
                {
                    tenantId,
                    accountId: item.accountId,
                    debit: item.amount,
                    credit: 0,
                    description: `${item.title} - Expense`,
                },
            ]

            if (item.taxAmount > 0 && itcAcc) {
                linesToCreate.push({
                    tenantId,
                    accountId: itcAcc.id,
                    debit: item.taxAmount,
                    credit: 0,
                    description: "Input GST (ITC 18%)",
                })
            }

            linesToCreate.push({
                tenantId,
                accountId: item.paymentAccountId,
                debit: 0,
                credit: item.totalAmount,
                description: `Payment via ${item.paymentMethod}`,
            })

            const je = await prisma.journalEntry.create({
                data: {
                    tenantId,
                    entryNumber: entryNum,
                    date: item.expenseDate,
                    reference: item.expenseNumber,
                    sourceType: JournalSourceType.EXPENSE,
                    narration: `${item.title} (${item.vendorName})`,
                    status: JournalStatus.POSTED,
                    totalDebit: item.totalAmount,
                    totalCredit: item.totalAmount,
                    currencyCode: item.currencyCode,
                    lines: {
                        create: linesToCreate,
                    },
                },
            })

            createdJeId = je.id
        }

        await prisma.expense.create({
            data: {
                tenantId,
                expenseNumber: item.expenseNumber,
                title: item.title,
                description: item.description,
                category: item.category,
                accountId: item.accountId,
                paymentAccountId: item.paymentAccountId,
                vendorName: item.vendorName,
                amount: item.amount,
                taxAmount: item.taxAmount,
                totalAmount: item.totalAmount,
                currencyCode: item.currencyCode,
                expenseDate: item.expenseDate,
                paymentMethod: item.paymentMethod,
                paymentReference: item.paymentReference,
                status: item.status,
                isReimbursable: item.isReimbursable,
                notes: item.notes,
                journalEntryId: createdJeId,
            },
        })
    }
}

/* ─────────────────────────────────────────
   1. Get Expenses Overview & General Ledger Data
───────────────────────────────────────── */

export async function getExpensesOverview(): Promise<{
    data?: ExpensesOverviewData
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        // Auto-seed if empty
        await autoSeedExpensesIfEmpty(tenantId)

        // 1. Fetch Expenses
        const rawExpenses = await prisma.expense.findMany({
            where: { tenantId },
            include: {
                expenseAccount: { select: { id: true, name: true, code: true } },
                paymentAccount: { select: { id: true, name: true, code: true } },
                vendor: { select: { id: true, displayName: true } },
                employee: { select: { id: true, firstName: true, lastName: true, employeeNumber: true } },
                journalEntry: { select: { id: true, entryNumber: true } },
            },
            orderBy: { expenseDate: "desc" },
        })

        const expenses: ExpenseRecord[] = rawExpenses.map((e: any) => ({
            id: e.id,
            tenantId: e.tenantId,
            expenseNumber: e.expenseNumber,
            title: e.title,
            description: e.description,
            category: e.category,
            accountId: e.accountId,
            accountName: e.expenseAccount.name,
            accountCode: e.expenseAccount.code,
            paymentAccountId: e.paymentAccountId,
            paymentAccountName: e.paymentAccount ? e.paymentAccount.name : null,
            vendorId: e.vendorId,
            vendorName: e.vendor ? e.vendor.displayName : e.vendorName,
            employeeId: e.employeeId,
            employeeName: e.employee ? `${e.employee.firstName} ${e.employee.lastName}`.trim() : null,
            amount: Number(e.amount),
            taxAmount: Number(e.taxAmount),
            totalAmount: Number(e.totalAmount),
            currencyCode: e.currencyCode,
            expenseDate: e.expenseDate,
            paymentMethod: e.paymentMethod,
            paymentReference: e.paymentReference,
            status: e.status,
            isReimbursable: e.isReimbursable,
            isClaimSettled: e.isClaimSettled,
            receiptUrl: e.receiptUrl,
            notes: e.notes,
            journalEntryId: e.journalEntryId,
            journalEntryNumber: e.journalEntry?.entryNumber ?? null,
            createdAt: e.createdAt,
        }))

        // 2. Fetch Journal Entries with Lines
        const rawJes = await prisma.journalEntry.findMany({
            where: { tenantId },
            include: {
                lines: {
                    include: {
                        account: { select: { id: true, code: true, name: true, type: true } },
                        contact: { select: { id: true, displayName: true } },
                    },
                    orderBy: { debit: "desc" },
                },
            },
            orderBy: { date: "desc" },
        })

        const journalEntries: JournalEntryRecord[] = rawJes.map((je: any) => ({
            id: je.id,
            tenantId: je.tenantId,
            entryNumber: je.entryNumber,
            date: je.date,
            reference: je.reference,
            sourceType: je.sourceType,
            sourceId: je.sourceId,
            narration: je.narration,
            status: je.status,
            totalDebit: Number(je.totalDebit),
            totalCredit: Number(je.totalCredit),
            currencyCode: je.currencyCode,
            createdAt: je.createdAt,
            lines: je.lines.map((l: any) => ({
                id: l.id,
                journalEntryId: l.journalEntryId,
                accountId: l.accountId,
                accountCode: l.account.code,
                accountName: l.account.name,
                accountType: l.account.type,
                debit: Number(l.debit),
                credit: Number(l.credit),
                description: l.description,
                contactId: l.contactId,
                contactName: l.contact?.displayName ?? null,
            })),
        }))

        // 3. Lookups: Accounts, Vendors, Employees
        const rawAccounts = await prisma.account.findMany({
            where: { tenantId, isActive: true },
            orderBy: { code: "asc" },
        })

        const accounts: AccountLookup[] = rawAccounts.map((a: any) => ({
            id: a.id,
            code: a.code,
            name: a.name,
            type: a.type,
            balance: Number(a.balance),
            currencyCode: a.currencyCode,
            isGroup: a.isGroup,
        }))

        const rawVendors = await prisma.contact.findMany({
            where: { tenantId },
            select: { id: true, displayName: true, email: true, phone: true, type: true },
            orderBy: { displayName: "asc" },
        })

        const vendors: ContactLookup[] = rawVendors.map((c: any) => ({
            id: c.id,
            displayName: c.displayName,
            email: c.email,
            phone: c.phone,
            type: c.type,
        }))

        const rawEmployees = await prisma.employee.findMany({
            where: { tenantId, status: "ACTIVE" },
            include: {
                department: { select: { name: true } },
                designation: { select: { title: true } },
            },
            orderBy: { firstName: "asc" },
        })

        const employees: EmployeeLookup[] = rawEmployees.map((emp: any) => ({
            id: emp.id,
            employeeNumber: emp.employeeNumber,
            name: `${emp.firstName} ${emp.lastName}`.trim(),
            email: emp.email,
            departmentName: emp.department?.name ?? null,
            designationTitle: emp.designation?.title ?? null,
        }))

        // 4. Calculate Stats
        let totalExpenses = 0
        let pendingApprovalCount = 0
        let pendingApprovalAmount = 0
        let inputTaxCredit = 0
        let reimbursablePendingCount = 0

        const categoryTotals: Record<string, number> = {}

        for (const e of expenses) {
            if (e.status === ExpenseStatus.PAID || e.status === ExpenseStatus.APPROVED) {
                totalExpenses += e.totalAmount
                inputTaxCredit += e.taxAmount
                categoryTotals[e.category] = (categoryTotals[e.category] || 0) + e.totalAmount
            }
            if (e.status === ExpenseStatus.PENDING_APPROVAL) {
                pendingApprovalCount++
                pendingApprovalAmount += e.totalAmount
            }
            if (e.isReimbursable && !e.isClaimSettled) {
                reimbursablePendingCount++
            }
        }

        let topCategoryName = "None"
        let topCategoryAmount = 0

        for (const [cat, amt] of Object.entries(categoryTotals)) {
            if (amt > topCategoryAmount) {
                topCategoryAmount = amt
                topCategoryName = cat
            }
        }

        const stats: ExpensesOverviewStats = {
            totalExpenses,
            pendingApprovalCount,
            pendingApprovalAmount,
            inputTaxCredit,
            topCategoryName,
            topCategoryAmount,
            reimbursablePendingCount,
            totalJournalEntries: journalEntries.filter((j) => j.status === JournalStatus.POSTED).length,
        }

        return {
            data: {
                stats,
                expenses,
                journalEntries,
                accounts,
                vendors,
                employees,
            },
        }
    } catch (err: any) {
        console.error("Error in getExpensesOverview:", err)
        return { error: err.message || "Failed to load expenses overview" }
    }
}

/* ─────────────────────────────────────────
   2. Create Expense (with optional GL Auto-Post)
───────────────────────────────────────── */

export interface CreateExpenseInput {
    title: string
    description?: string
    category: string
    accountId: string
    paymentAccountId?: string
    vendorId?: string
    vendorName?: string
    employeeId?: string
    amount: number
    taxAmount?: number
    currencyCode?: string
    expenseDate?: string
    paymentMethod?: PaymentMethod
    paymentReference?: string
    status?: ExpenseStatus
    isReimbursable?: boolean
    receiptUrl?: string
    notes?: string
    autoPostJournal?: boolean
}

export async function createExpense(data: CreateExpenseInput): Promise<{
    success?: boolean
    expense?: ExpenseRecord
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.title?.trim()) return { error: "Expense title is required" }
        if (!data.category?.trim()) return { error: "Category is required" }
        if (!data.accountId) return { error: "Expense account must be selected" }
        if (data.amount <= 0) return { error: "Amount must be greater than zero" }

        const taxAmount = Number(data.taxAmount || 0)
        const totalAmount = Number(data.amount) + taxAmount
        const status = data.status || (data.isReimbursable ? ExpenseStatus.PENDING_APPROVAL : ExpenseStatus.PAID)
        const expenseDate = data.expenseDate ? new Date(data.expenseDate) : new Date()

        // Generate sequential expense number
        const count = await prisma.expense.count({ where: { tenantId } })
        const year = new Date().getFullYear()
        const expenseNumber = `EXP-${year}-${String(count + 1).padStart(4, "0")}`

        let journalEntryId: string | null = null

        // Interactive transaction
        const result = await prisma.$transaction(async (tx: any) => {
            // If PAID or APPROVED and autoPostJournal is true, post a balanced Journal Entry
            if (
                data.autoPostJournal !== false &&
                (status === ExpenseStatus.PAID || status === ExpenseStatus.APPROVED) &&
                data.paymentAccountId
            ) {
                const jeCount = await tx.journalEntry.count({ where: { tenantId } })
                const entryNumber = `JE-${year}-${String(jeCount + 1).padStart(4, "0")}`

                const linesToCreate: any[] = [
                    {
                        tenantId,
                        accountId: data.accountId,
                        debit: data.amount,
                        credit: 0,
                        description: `${data.title} - Expense`,
                        contactId: data.vendorId || null,
                    },
                ]

                // If tax amount > 0, post to Input GST account if available
                if (taxAmount > 0) {
                    const itcAcc = await tx.account.findFirst({
                        where: { tenantId, code: "1400" },
                    })
                    const taxAccId = itcAcc ? itcAcc.id : data.accountId

                    linesToCreate.push({
                        tenantId,
                        accountId: taxAccId,
                        debit: taxAmount,
                        credit: 0,
                        description: `Input GST (${data.title})`,
                        contactId: data.vendorId || null,
                    })
                }

                // Credit line: Payment account (Cash or Bank)
                linesToCreate.push({
                    tenantId,
                    accountId: data.paymentAccountId,
                    debit: 0,
                    credit: totalAmount,
                    description: `Payment via ${data.paymentMethod || "BANK_TRANSFER"}`,
                    contactId: data.vendorId || null,
                })

                const je = await tx.journalEntry.create({
                    data: {
                        tenantId,
                        entryNumber,
                        date: expenseDate,
                        reference: expenseNumber,
                        sourceType: JournalSourceType.EXPENSE,
                        narration: `${data.title} (${data.vendorName || "Payee"})`,
                        status: JournalStatus.POSTED,
                        totalDebit: totalAmount,
                        totalCredit: totalAmount,
                        currencyCode: data.currencyCode || "INR",
                        lines: {
                            create: linesToCreate,
                        },
                    },
                })

                journalEntryId = je.id

                // Update account balances
                await tx.account.update({
                    where: { id: data.accountId },
                    data: { balance: { increment: data.amount } },
                })

                await tx.account.update({
                    where: { id: data.paymentAccountId },
                    data: { balance: { decrement: totalAmount } },
                })
            }

            const exp = await tx.expense.create({
                data: {
                    tenantId,
                    expenseNumber,
                    title: data.title.trim(),
                    description: data.description?.trim() || null,
                    category: data.category.trim(),
                    accountId: data.accountId,
                    paymentAccountId: data.paymentAccountId || null,
                    vendorId: data.vendorId || null,
                    vendorName: data.vendorName?.trim() || null,
                    employeeId: data.employeeId || null,
                    amount: data.amount,
                    taxAmount,
                    totalAmount,
                    currencyCode: data.currencyCode || "INR",
                    expenseDate,
                    paymentMethod: data.paymentMethod || PaymentMethod.BANK_TRANSFER,
                    paymentReference: data.paymentReference?.trim() || null,
                    status,
                    isReimbursable: !!data.isReimbursable,
                    receiptUrl: data.receiptUrl?.trim() || null,
                    notes: data.notes?.trim() || null,
                    journalEntryId,
                },
            })

            return exp
        })

        revalidatePath("/finance/expenses")
        revalidatePath("/finance/accounts")
        return { success: true }
    } catch (err: any) {
        console.error("Error in createExpense:", err)
        return { error: err.message || "Failed to create expense" }
    }
}

/* ─────────────────────────────────────────
   3. Update Expense Status (Approve / Settle)
───────────────────────────────────────── */

export async function updateExpenseStatus(
    id: string,
    status: ExpenseStatus,
    isClaimSettled?: boolean
): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const expense = await prisma.expense.findFirst({
            where: { id, tenantId },
            include: { expenseAccount: true, paymentAccount: true },
        })

        if (!expense) return { error: "Expense voucher not found" }

        await prisma.$transaction(async (tx: any) => {
            let journalEntryId = expense.journalEntryId

            // If transitioning to PAID and had no journal voucher, auto-create one
            if (
                status === ExpenseStatus.PAID &&
                !journalEntryId &&
                expense.paymentAccountId
            ) {
                const count = await tx.journalEntry.count({ where: { tenantId } })
                const year = new Date().getFullYear()
                const entryNumber = `JE-${year}-${String(count + 1).padStart(4, "0")}`

                const linesToCreate: any[] = [
                    {
                        tenantId,
                        accountId: expense.accountId,
                        debit: expense.amount,
                        credit: 0,
                        description: `${expense.title} - Expense`,
                        contactId: expense.vendorId,
                    },
                ]

                if (Number(expense.taxAmount) > 0) {
                    const itcAcc = await tx.account.findFirst({
                        where: { tenantId, code: "1400" },
                    })
                    const taxAccId = itcAcc ? itcAcc.id : expense.accountId

                    linesToCreate.push({
                        tenantId,
                        accountId: taxAccId,
                        debit: expense.taxAmount,
                        credit: 0,
                        description: `Input GST (${expense.title})`,
                        contactId: expense.vendorId,
                    })
                }

                linesToCreate.push({
                    tenantId,
                    accountId: expense.paymentAccountId,
                    debit: 0,
                    credit: expense.totalAmount,
                    description: `Payment via ${expense.paymentMethod || "BANK_TRANSFER"}`,
                    contactId: expense.vendorId,
                })

                const je = await tx.journalEntry.create({
                    data: {
                        tenantId,
                        entryNumber,
                        date: new Date(),
                        reference: expense.expenseNumber,
                        sourceType: JournalSourceType.EXPENSE,
                        narration: `${expense.title} (${expense.vendorName || "Payee"})`,
                        status: JournalStatus.POSTED,
                        totalDebit: expense.totalAmount,
                        totalCredit: expense.totalAmount,
                        currencyCode: expense.currencyCode,
                        lines: {
                            create: linesToCreate,
                        },
                    },
                })

                journalEntryId = je.id

                await tx.account.update({
                    where: { id: expense.accountId },
                    data: { balance: { increment: expense.amount } },
                })

                await tx.account.update({
                    where: { id: expense.paymentAccountId },
                    data: { balance: { decrement: expense.totalAmount } },
                })
            }

            await tx.expense.update({
                where: { id },
                data: {
                    status,
                    isClaimSettled: isClaimSettled !== undefined ? isClaimSettled : (status === ExpenseStatus.PAID && expense.isReimbursable ? true : expense.isClaimSettled),
                    journalEntryId,
                },
            })
        })

        revalidatePath("/finance/expenses")
        revalidatePath("/finance/accounts")
        return { success: true }
    } catch (err: any) {
        console.error("Error in updateExpenseStatus:", err)
        return { error: err.message || "Failed to update expense status" }
    }
}

/* ─────────────────────────────────────────
   4. Create Manual Journal Entry (Double-Entry)
───────────────────────────────────────── */

export interface CreateJournalLineInput {
    accountId: string
    debit: number
    credit: number
    description?: string
    contactId?: string
}

export interface CreateJournalEntryInput {
    date?: string
    reference?: string
    narration: string
    lines: CreateJournalLineInput[]
    sourceType?: JournalSourceType
}

export async function createJournalEntry(data: CreateJournalEntryInput): Promise<{
    success?: boolean
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.narration?.trim()) return { error: "Narration / description is required" }
        if (!data.lines || data.lines.length < 2) {
            return { error: "A journal entry must contain at least 2 lines (Debit and Credit)" }
        }

        let totalDebit = 0
        let totalCredit = 0

        for (const line of data.lines) {
            if (!line.accountId) return { error: "All journal lines must specify an account" }
            const d = Number(line.debit || 0)
            const c = Number(line.credit || 0)
            if (d < 0 || c < 0) return { error: "Debit and Credit amounts cannot be negative" }
            if (d === 0 && c === 0) return { error: "Each line must have either a debit or credit amount" }
            if (d > 0 && c > 0) return { error: "A single line cannot have both debit and credit" }
            totalDebit += d
            totalCredit += c
        }

        // Strict double-entry balance check (within 2 decimal cents)
        if (Math.abs(totalDebit - totalCredit) > 0.01) {
            return {
                error: `Unbalanced entry! Total Debits (₹${totalDebit.toFixed(2)}) must exactly equal Total Credits (₹${totalCredit.toFixed(2)}). Difference: ₹${Math.abs(totalDebit - totalCredit).toFixed(2)}`,
            }
        }

        const count = await prisma.journalEntry.count({ where: { tenantId } })
        const year = new Date().getFullYear()
        const entryNumber = `JE-${year}-${String(count + 1).padStart(4, "0")}`
        const entryDate = data.date ? new Date(data.date) : new Date()

        await prisma.$transaction(async (tx: any) => {
            const je = await tx.journalEntry.create({
                data: {
                    tenantId,
                    entryNumber,
                    date: entryDate,
                    reference: data.reference?.trim() || null,
                    sourceType: data.sourceType || JournalSourceType.MANUAL,
                    narration: data.narration.trim(),
                    status: JournalStatus.POSTED,
                    totalDebit,
                    totalCredit,
                    lines: {
                        create: data.lines.map((l) => ({
                            tenantId,
                            accountId: l.accountId,
                            debit: Number(l.debit || 0),
                            credit: Number(l.credit || 0),
                            description: l.description?.trim() || null,
                            contactId: l.contactId || null,
                        })),
                    },
                },
            })

            // Update balances on each account
            for (const line of data.lines) {
                const acc = await tx.account.findUnique({ where: { id: line.accountId } })
                if (acc) {
                    // Normal balances:
                    // ASSET & EXPENSE: Normal debit (Debit increases, Credit decreases)
                    // LIABILITY, EQUITY, REVENUE: Normal credit (Credit increases, Debit decreases)
                    const d = Number(line.debit || 0)
                    const c = Number(line.credit || 0)

                    if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) {
                        const netDelta = d - c
                        await tx.account.update({
                            where: { id: line.accountId },
                            data: { balance: { increment: netDelta } },
                        })
                    } else {
                        const netDelta = c - d
                        await tx.account.update({
                            where: { id: line.accountId },
                            data: { balance: { increment: netDelta } },
                        })
                    }
                }
            }

            return je
        })

        revalidatePath("/finance/expenses")
        revalidatePath("/finance/accounts")
        return { success: true }
    } catch (err: any) {
        console.error("Error in createJournalEntry:", err)
        return { error: err.message || "Failed to create journal entry" }
    }
}

/* ─────────────────────────────────────────
   5. Void Expense
───────────────────────────────────────── */

export async function voidExpense(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const expense = await prisma.expense.findFirst({
            where: { id, tenantId },
            include: { journalEntry: { include: { lines: true } } },
        })

        if (!expense) return { error: "Expense voucher not found" }
        if (expense.status === ExpenseStatus.VOID) return { error: "Expense is already voided" }

        await prisma.$transaction(async (tx: any) => {
            // Void linked journal entry and reverse balances
            if (expense.journalEntry && expense.journalEntry.status === JournalStatus.POSTED) {
                await tx.journalEntry.update({
                    where: { id: expense.journalEntry.id },
                    data: { status: JournalStatus.VOID },
                })

                // Reverse account balances
                for (const line of expense.journalEntry.lines) {
                    const acc = await tx.account.findUnique({ where: { id: line.accountId } })
                    if (acc) {
                        const d = Number(line.debit || 0)
                        const c = Number(line.credit || 0)

                        if (acc.type === AccountType.ASSET || acc.type === AccountType.EXPENSE) {
                            const netDelta = -(d - c)
                            await tx.account.update({
                                where: { id: line.accountId },
                                data: { balance: { increment: netDelta } },
                            })
                        } else {
                            const netDelta = -(c - d)
                            await tx.account.update({
                                where: { id: line.accountId },
                                data: { balance: { increment: netDelta } },
                            })
                        }
                    }
                }
            }

            await tx.expense.update({
                where: { id },
                data: { status: ExpenseStatus.VOID },
            })
        })

        revalidatePath("/finance/expenses")
        revalidatePath("/finance/accounts")
        return { success: true }
    } catch (err: any) {
        console.error("Error in voidExpense:", err)
        return { error: err.message || "Failed to void expense" }
    }
}
