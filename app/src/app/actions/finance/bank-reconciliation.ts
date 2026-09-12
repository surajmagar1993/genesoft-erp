"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    BankAccountType,
    BankStatementStatus,
    BankTransactionType,
    BankReconcileStatus,
    BankMatchedType,
    ExpenseStatus,
    PaymentMethod,
} from "@prisma/client"

// ============================================
// TYPES & INTERFACES
// ============================================

export interface BankAccountRecord {
    id: string
    tenantId: string
    accountName: string
    accountNumber: string
    bankName: string
    branchName?: string | null
    ifscRoutingCode?: string | null
    swiftCode?: string | null
    currencyCode: string
    accountType: BankAccountType
    chartOfAccountId?: string | null
    chartOfAccount?: {
        id: string
        code: string
        name: string
        balance: number
    } | null
    openingBalance: number
    currentBalance: number
    isActive: boolean
    isPrimary: boolean
    notes?: string | null
    createdAt: string
    updatedAt: string
    statementCount?: number
    transactionCount?: number
    unreconciledCount?: number
}

export interface BankStatementRecord {
    id: string
    tenantId: string
    bankAccountId: string
    statementNumber: string
    startDate: string
    endDate: string
    openingBalance: number
    closingBalance: number
    reconciledBalance: number
    status: BankStatementStatus
    reconciledAt?: string | null
    notes?: string | null
    createdAt: string
    updatedAt: string
    transactionCount?: number
    matchedCount?: number
}

export interface BankTransactionRecord {
    id: string
    tenantId: string
    bankAccountId: string
    statementId?: string | null
    transactionDate: string
    valueDate?: string | null
    type: BankTransactionType
    amount: number
    balance?: number | null
    payee?: string | null
    description: string
    reference?: string | null
    status: BankReconcileStatus
    matchedType?: BankMatchedType | null
    paymentId?: string | null
    payment?: {
        id: string
        amount: number
        paymentDate: string
        reference: string | null
        notes: string | null
        type: string
        contact?: {
            id: string
            displayName: string
            companyName: string | null
        } | null
    } | null
    expenseId?: string | null
    expense?: {
        id: string
        expenseNumber: string
        title: string
        totalAmount: number
        expenseDate: string
        category: string
        paymentReference: string | null
    } | null
    journalEntryId?: string | null
    matchedAt?: string | null
    reconciledAt?: string | null
    matchConfidence?: string | null
    notes?: string | null
    createdAt: string
    updatedAt: string
}

export interface CandidateSystemRecord {
    id: string
    source: "PAYMENT" | "EXPENSE"
    numberOrRef: string
    titleOrParty: string
    date: string
    amount: number
    type: "INBOUND" | "OUTBOUND"
    matchedTransactionId?: string | null
}

export interface BankReconciliationKPIs {
    statementBalance: number
    bookBalance: number
    clearedBalance: number
    unmatchedCount: number
    unmatchedAmount: number
    difference: number
    isBalanced: boolean
    totalDeposits: number
    totalWithdrawals: number
}

export interface BankReconciliationOverview {
    bankAccounts: BankAccountRecord[]
    selectedAccount: BankAccountRecord | null
    statements: BankStatementRecord[]
    activeStatement: BankStatementRecord | null
    transactions: BankTransactionRecord[]
    unmatchedTransactions: BankTransactionRecord[]
    matchedTransactions: BankTransactionRecord[]
    candidateRecords: CandidateSystemRecord[]
    chartOfAccounts: Array<{ id: string; code: string; name: string }>
    kpis: BankReconciliationKPIs
}

export interface CreateBankAccountInput {
    accountName: string
    accountNumber: string
    bankName: string
    branchName?: string
    ifscRoutingCode?: string
    swiftCode?: string
    currencyCode?: string
    accountType?: BankAccountType
    chartOfAccountId?: string
    openingBalance?: number
    currentBalance?: number
    isPrimary?: boolean
    notes?: string
}

export interface ImportBankStatementInput {
    bankAccountId: string
    statementNumber: string
    startDate: string
    endDate: string
    openingBalance: number
    closingBalance: number
    notes?: string
    lines: Array<{
        date: string
        type: "DEPOSIT" | "WITHDRAWAL"
        amount: number
        payee?: string
        description: string
        reference?: string
        balance?: number
    }>
}

export interface QuickExpenseInput {
    title: string
    category: string
    accountId: string
    amount: number
    expenseDate?: string
    paymentMethod?: PaymentMethod
    notes?: string
}

// ============================================
// DATA OVERVIEW & SEEDER
// ============================================

export async function getBankReconciliationOverview(
    bankAccountId?: string
): Promise<BankReconciliationOverview> {
    const tenantId = await getTenantId()
    if (!tenantId) {
        throw new Error("Authentication required")
    }

    // Check if initial bank accounts exist; if not, seed realistic data
    await autoSeedBankingIfEmpty(tenantId)

    // 1. Fetch all bank accounts
    const rawBankAccounts = await prisma.bankAccount.findMany({
        where: { tenantId },
        include: {
            chartOfAccount: {
                select: { id: true, code: true, name: true, balance: true },
            },
            statements: {
                select: { id: true, status: true },
            },
            transactions: {
                select: { id: true, status: true },
            },
        },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
    })

    const bankAccounts: BankAccountRecord[] = rawBankAccounts.map((ba: any) => ({
        id: ba.id,
        tenantId: ba.tenantId,
        accountName: ba.accountName,
        accountNumber: ba.accountNumber,
        bankName: ba.bankName,
        branchName: ba.branchName,
        ifscRoutingCode: ba.ifscRoutingCode,
        swiftCode: ba.swiftCode,
        currencyCode: ba.currencyCode,
        accountType: ba.accountType,
        chartOfAccountId: ba.chartOfAccountId,
        chartOfAccount: ba.chartOfAccount
            ? {
                  id: ba.chartOfAccount.id,
                  code: ba.chartOfAccount.code,
                  name: ba.chartOfAccount.name,
                  balance: Number(ba.chartOfAccount.balance),
              }
            : null,
        openingBalance: Number(ba.openingBalance),
        currentBalance: Number(ba.currentBalance),
        isActive: ba.isActive,
        isPrimary: ba.isPrimary,
        notes: ba.notes,
        createdAt: ba.createdAt.toISOString(),
        updatedAt: ba.updatedAt.toISOString(),
        statementCount: ba.statements.length,
        transactionCount: ba.transactions.length,
        unreconciledCount: ba.transactions.filter(
            (t: any) => t.status === BankReconcileStatus.UNMATCHED
        ).length,
    }))

    // Determine target bank account
    const selectedAccount =
        bankAccounts.find((a) => a.id === bankAccountId) ||
        bankAccounts.find((a) => a.isPrimary) ||
        bankAccounts[0] ||
        null

    if (!selectedAccount) {
        return {
            bankAccounts: [],
            selectedAccount: null,
            statements: [],
            activeStatement: null,
            transactions: [],
            unmatchedTransactions: [],
            matchedTransactions: [],
            candidateRecords: [],
            chartOfAccounts: [],
            kpis: {
                statementBalance: 0,
                bookBalance: 0,
                clearedBalance: 0,
                unmatchedCount: 0,
                unmatchedAmount: 0,
                difference: 0,
                isBalanced: true,
                totalDeposits: 0,
                totalWithdrawals: 0,
            },
        }
    }

    // 2. Fetch statements for target account
    const rawStatements = await prisma.bankStatement.findMany({
        where: { tenantId, bankAccountId: selectedAccount.id },
        include: {
            transactions: {
                select: { id: true, status: true },
            },
        },
        orderBy: { startDate: "desc" },
    })

    const statements: BankStatementRecord[] = rawStatements.map((s: any) => ({
        id: s.id,
        tenantId: s.tenantId,
        bankAccountId: s.bankAccountId,
        statementNumber: s.statementNumber,
        startDate: s.startDate.toISOString().split("T")[0],
        endDate: s.endDate.toISOString().split("T")[0],
        openingBalance: Number(s.openingBalance),
        closingBalance: Number(s.closingBalance),
        reconciledBalance: Number(s.reconciledBalance),
        status: s.status,
        reconciledAt: s.reconciledAt ? s.reconciledAt.toISOString() : null,
        notes: s.notes,
        createdAt: s.createdAt.toISOString(),
        updatedAt: s.updatedAt.toISOString(),
        transactionCount: s.transactions.length,
        matchedCount: s.transactions.filter(
            (t: any) =>
                t.status === BankReconcileStatus.MATCHED ||
                t.status === BankReconcileStatus.RECONCILED
        ).length,
    }))

    const activeStatement =
        statements.find((s) => s.status === BankStatementStatus.IN_PROGRESS) ||
        statements.find((s) => s.status === BankStatementStatus.DRAFT) ||
        statements[0] ||
        null

    // 3. Fetch bank transactions for selected account (filtered by active statement if present, otherwise all for account)
    const rawTransactions = await prisma.bankTransaction.findMany({
        where: {
            tenantId,
            bankAccountId: selectedAccount.id,
            ...(activeStatement ? { statementId: activeStatement.id } : {}),
        },
        include: {
            payment: {
                select: {
                    id: true,
                    amount: true,
                    paymentDate: true,
                    reference: true,
                    notes: true,
                    type: true,
                    contact: {
                        select: { id: true, displayName: true, companyName: true },
                    },
                },
            },
            expense: {
                select: {
                    id: true,
                    expenseNumber: true,
                    title: true,
                    totalAmount: true,
                    expenseDate: true,
                    category: true,
                    paymentReference: true,
                },
            },
        },
        orderBy: { transactionDate: "desc" },
    })

    const transactions: BankTransactionRecord[] = rawTransactions.map((t: any) => ({
        id: t.id,
        tenantId: t.tenantId,
        bankAccountId: t.bankAccountId,
        statementId: t.statementId,
        transactionDate: t.transactionDate.toISOString().split("T")[0],
        valueDate: t.valueDate ? t.valueDate.toISOString().split("T")[0] : null,
        type: t.type,
        amount: Number(t.amount),
        balance: t.balance ? Number(t.balance) : null,
        payee: t.payee,
        description: t.description,
        reference: t.reference,
        status: t.status,
        matchedType: t.matchedType,
        paymentId: t.paymentId,
        payment: t.payment
            ? {
                  id: t.payment.id,
                  amount: Number(t.payment.amount),
                  paymentDate: t.payment.paymentDate.toISOString().split("T")[0],
                  reference: t.payment.reference,
                  notes: t.payment.notes,
                  type: t.payment.type,
                  contact: t.payment.contact,
              }
            : null,
        expenseId: t.expenseId,
        expense: t.expense
            ? {
                  id: t.expense.id,
                  expenseNumber: t.expense.expenseNumber,
                  title: t.expense.title,
                  totalAmount: Number(t.expense.totalAmount),
                  expenseDate: t.expense.expenseDate.toISOString().split("T")[0],
                  category: t.expense.category,
                  paymentReference: t.expense.paymentReference,
              }
            : null,
        journalEntryId: t.journalEntryId,
        matchedAt: t.matchedAt ? t.matchedAt.toISOString() : null,
        reconciledAt: t.reconciledAt ? t.reconciledAt.toISOString() : null,
        matchConfidence: t.matchConfidence,
        notes: t.notes,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    }))

    const unmatchedTransactions = transactions.filter(
        (t) => t.status === BankReconcileStatus.UNMATCHED
    )
    const matchedTransactions = transactions.filter(
        (t) =>
            t.status === BankReconcileStatus.MATCHED ||
            t.status === BankReconcileStatus.RECONCILED
    )

    // 4. Fetch candidate ERP system records (Payments & Expenses)
    // Eligible payments
    const rawPayments = await prisma.payment.findMany({
        where: { tenantId },
        include: {
            contact: { select: { displayName: true, companyName: true } },
            bankTransactions: { select: { id: true } },
        },
        orderBy: { paymentDate: "desc" },
        take: 30,
    })

    // Eligible expenses
    const rawExpenses = await prisma.expense.findMany({
        where: { tenantId, status: ExpenseStatus.PAID },
        include: {
            vendor: { select: { displayName: true } },
            bankTransactions: { select: { id: true } },
        },
        orderBy: { expenseDate: "desc" },
        take: 30,
    })

    const candidateRecords: CandidateSystemRecord[] = [
        ...rawPayments.map((p: any) => ({
            id: p.id,
            source: "PAYMENT" as const,
            numberOrRef: p.reference || `PMT-${p.id.substring(0, 6).toUpperCase()}`,
            titleOrParty: p.contact?.displayName || p.contact?.companyName || "Customer Payment",
            date: p.paymentDate.toISOString().split("T")[0],
            amount: Number(p.amount),
            type: p.type as "INBOUND" | "OUTBOUND",
            matchedTransactionId: p.bankTransactions[0]?.id || null,
        })),
        ...rawExpenses.map((e: any) => ({
            id: e.id,
            source: "EXPENSE" as const,
            numberOrRef: e.expenseNumber,
            titleOrParty: `${e.title} (${e.vendor?.displayName || e.category})`,
            date: e.expenseDate.toISOString().split("T")[0],
            amount: Number(e.totalAmount),
            type: "OUTBOUND" as const,
            matchedTransactionId: e.bankTransactions[0]?.id || null,
        })),
    ]

    // 5. Chart of accounts bank/cash accounts
    const chartOfAccounts = await prisma.account.findMany({
        where: {
            tenantId,
            isActive: true,
            OR: [
                { type: "ASSET" },
                { code: { startsWith: "1" } },
            ],
        },
        select: { id: true, code: true, name: true },
        orderBy: { code: "asc" },
    })

    // 6. Calculate Reconciliation KPIs
    const openingBal = activeStatement ? activeStatement.openingBalance : selectedAccount.openingBalance
    const statementBal = activeStatement ? activeStatement.closingBalance : selectedAccount.currentBalance

    let totalDeposits = 0
    let totalWithdrawals = 0
    let clearedDeposits = 0
    let clearedWithdrawals = 0

    transactions.forEach((t) => {
        if (t.type === BankTransactionType.DEPOSIT) {
            totalDeposits += t.amount
            if (t.status === BankReconcileStatus.MATCHED || t.status === BankReconcileStatus.RECONCILED) {
                clearedDeposits += t.amount
            }
        } else {
            totalWithdrawals += t.amount
            if (t.status === BankReconcileStatus.MATCHED || t.status === BankReconcileStatus.RECONCILED) {
                clearedWithdrawals += t.amount
            }
        }
    })

    const clearedBalance = openingBal + clearedDeposits - clearedWithdrawals
    const bookBalance = selectedAccount.chartOfAccount
        ? selectedAccount.chartOfAccount.balance
        : selectedAccount.currentBalance
    const difference = statementBal - clearedBalance
    const isBalanced = Math.abs(difference) < 0.01

    const unmatchedCount = unmatchedTransactions.length
    const unmatchedAmount = unmatchedTransactions.reduce((sum, t) => {
        return t.type === BankTransactionType.DEPOSIT ? sum + t.amount : sum - t.amount
    }, 0)

    return {
        bankAccounts,
        selectedAccount,
        statements,
        activeStatement,
        transactions,
        unmatchedTransactions,
        matchedTransactions,
        candidateRecords,
        chartOfAccounts,
        kpis: {
            statementBalance: statementBal,
            bookBalance,
            clearedBalance,
            unmatchedCount,
            unmatchedAmount,
            difference,
            isBalanced,
            totalDeposits,
            totalWithdrawals,
        },
    }
}

// ============================================
// BANK ACCOUNT CRUD ACTIONS
// ============================================

export async function createBankAccount(data: CreateBankAccountInput): Promise<{
    success?: boolean
    bankAccount?: BankAccountRecord
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.accountName?.trim()) return { error: "Account name is required" }
        if (!data.accountNumber?.trim()) return { error: "Account number is required" }
        if (!data.bankName?.trim()) return { error: "Bank name is required" }

        // Check duplicates
        const existing = await prisma.bankAccount.findFirst({
            where: { tenantId, accountNumber: data.accountNumber.trim() },
        })
        if (existing) {
            return { error: `Bank account with number "${data.accountNumber}" already exists.` }
        }

        // If isPrimary, unset previous primary
        if (data.isPrimary) {
            await prisma.bankAccount.updateMany({
                where: { tenantId, isPrimary: true },
                data: { isPrimary: false },
            })
        }

        const opening = Number(data.openingBalance || 0)
        const current = data.currentBalance !== undefined ? Number(data.currentBalance) : opening

        const created = await prisma.bankAccount.create({
            data: {
                tenantId,
                accountName: data.accountName.trim(),
                accountNumber: data.accountNumber.trim(),
                bankName: data.bankName.trim(),
                branchName: data.branchName?.trim() || null,
                ifscRoutingCode: data.ifscRoutingCode?.trim() || null,
                swiftCode: data.swiftCode?.trim() || null,
                currencyCode: data.currencyCode?.trim() || "INR",
                accountType: data.accountType || BankAccountType.CURRENT,
                chartOfAccountId: data.chartOfAccountId || null,
                openingBalance: opening,
                currentBalance: current,
                isPrimary: !!data.isPrimary,
                notes: data.notes?.trim() || null,
            },
        })

        revalidatePath("/finance/bank-reconciliation")

        return {
            success: true,
            bankAccount: {
                id: created.id,
                tenantId: created.tenantId,
                accountName: created.accountName,
                accountNumber: created.accountNumber,
                bankName: created.bankName,
                branchName: created.branchName,
                ifscRoutingCode: created.ifscRoutingCode,
                swiftCode: created.swiftCode,
                currencyCode: created.currencyCode,
                accountType: created.accountType,
                chartOfAccountId: created.chartOfAccountId,
                openingBalance: Number(created.openingBalance),
                currentBalance: Number(created.currentBalance),
                isActive: created.isActive,
                isPrimary: created.isPrimary,
                notes: created.notes,
                createdAt: created.createdAt.toISOString(),
                updatedAt: created.updatedAt.toISOString(),
            },
        }
    } catch (err: any) {
        console.error("createBankAccount error:", err)
        return { error: err.message || "Failed to create bank account" }
    }
}

export async function updateBankAccount(
    id: string,
    data: Partial<CreateBankAccountInput>
): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (data.isPrimary) {
            await prisma.bankAccount.updateMany({
                where: { tenantId, isPrimary: true },
                data: { isPrimary: false },
            })
        }

        const updateData: any = {}
        if (data.accountName !== undefined) updateData.accountName = data.accountName.trim()
        if (data.accountNumber !== undefined) updateData.accountNumber = data.accountNumber.trim()
        if (data.bankName !== undefined) updateData.bankName = data.bankName.trim()
        if (data.branchName !== undefined) updateData.branchName = data.branchName?.trim() || null
        if (data.ifscRoutingCode !== undefined) updateData.ifscRoutingCode = data.ifscRoutingCode?.trim() || null
        if (data.swiftCode !== undefined) updateData.swiftCode = data.swiftCode?.trim() || null
        if (data.accountType !== undefined) updateData.accountType = data.accountType
        if (data.chartOfAccountId !== undefined) updateData.chartOfAccountId = data.chartOfAccountId || null
        if (data.currentBalance !== undefined) updateData.currentBalance = Number(data.currentBalance)
        if (data.isPrimary !== undefined) updateData.isPrimary = data.isPrimary
        if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null

        await prisma.bankAccount.update({
            where: { id },
            data: updateData,
        })

        revalidatePath("/finance/bank-reconciliation")
        return { success: true }
    } catch (err: any) {
        console.error("updateBankAccount error:", err)
        return { error: err.message || "Failed to update bank account" }
    }
}

export async function deleteBankAccount(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        // Check if has locked reconciled statements
        const lockedStatements = await prisma.bankStatement.findFirst({
            where: { bankAccountId: id, status: BankStatementStatus.RECONCILED },
        })
        if (lockedStatements) {
            return { error: "Cannot delete bank account with finalized reconciled statements." }
        }

        await prisma.bankAccount.delete({
            where: { id },
        })

        revalidatePath("/finance/bank-reconciliation")
        return { success: true }
    } catch (err: any) {
        console.error("deleteBankAccount error:", err)
        return { error: err.message || "Failed to delete bank account" }
    }
}

// ============================================
// STATEMENT BATCH IMPORT ACTION
// ============================================

export async function importBankStatement(data: ImportBankStatementInput): Promise<{
    success?: boolean
    statementId?: string
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.bankAccountId) return { error: "Bank account is required" }
        if (!data.statementNumber?.trim()) return { error: "Statement number is required" }
        if (!data.startDate || !data.endDate) return { error: "Statement period dates are required" }
        if (!data.lines || data.lines.length === 0) return { error: "At least one transaction line is required" }

        const result = await prisma.$transaction(async (tx: any) => {
            const statement = await tx.bankStatement.create({
                data: {
                    tenantId,
                    bankAccountId: data.bankAccountId,
                    statementNumber: data.statementNumber.trim(),
                    startDate: new Date(data.startDate),
                    endDate: new Date(data.endDate),
                    openingBalance: Number(data.openingBalance || 0),
                    closingBalance: Number(data.closingBalance || 0),
                    reconciledBalance: Number(data.openingBalance || 0),
                    status: BankStatementStatus.IN_PROGRESS,
                    notes: data.notes?.trim() || null,
                },
            })

            const transactionsToCreate = data.lines.map((line) => ({
                tenantId,
                bankAccountId: data.bankAccountId,
                statementId: statement.id,
                transactionDate: new Date(line.date),
                type: line.type === "DEPOSIT" ? BankTransactionType.DEPOSIT : BankTransactionType.WITHDRAWAL,
                amount: Number(line.amount),
                balance: line.balance !== undefined ? Number(line.balance) : null,
                payee: line.payee?.trim() || null,
                description: line.description.trim(),
                reference: line.reference?.trim() || null,
                status: BankReconcileStatus.UNMATCHED,
            }))

            await tx.bankTransaction.createMany({
                data: transactionsToCreate,
            })

            // Update bank account current balance to statement closing balance
            await tx.bankAccount.update({
                where: { id: data.bankAccountId },
                data: { currentBalance: Number(data.closingBalance) },
            })

            return statement
        })

        revalidatePath("/finance/bank-reconciliation")
        return { success: true, statementId: result.id }
    } catch (err: any) {
        console.error("importBankStatement error:", err)
        return { error: err.message || "Failed to import bank statement" }
    }
}

// ============================================
// SMART AUTO-MATCH RULE ENGINE
// ============================================

export async function autoMatchTransactions(bankAccountId: string): Promise<{
    success?: boolean
    matchedCount?: number
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        // Find all unmatched bank transactions for account
        const unmatchedBankTxns = await prisma.bankTransaction.findMany({
            where: {
                tenantId,
                bankAccountId,
                status: BankReconcileStatus.UNMATCHED,
            },
        })

        if (unmatchedBankTxns.length === 0) {
            return { success: true, matchedCount: 0 }
        }

        // Fetch candidate payments
        const systemPayments = await prisma.payment.findMany({
            where: { tenantId },
            include: { bankTransactions: true },
        })

        // Fetch candidate expenses
        const systemExpenses = await prisma.expense.findMany({
            where: { tenantId, status: ExpenseStatus.PAID },
            include: { bankTransactions: true },
        })

        let matchCount = 0

        for (const bTxn of unmatchedBankTxns) {
            const bAmount = Number(bTxn.amount)
            const bRef = bTxn.reference?.toLowerCase().trim()
            const bDesc = bTxn.description?.toLowerCase().trim()

            if (bTxn.type === BankTransactionType.DEPOSIT) {
                // Look for matching inbound payment
                const matchingPayment = systemPayments.find((p: any) => {
                    if (p.bankTransactions.length > 0) return false // already matched
                    if (p.type !== "INBOUND") return false
                    const pAmount = Number(p.amount)
                    const pRef = p.reference?.toLowerCase().trim()

                    // Match rule 1: exact reference match
                    if (bRef && pRef && (bRef.includes(pRef) || pRef.includes(bRef))) {
                        return Math.abs(pAmount - bAmount) < 0.01
                    }

                    // Match rule 2: amount match & narration contains payment reference or ID
                    if (pRef && bDesc.includes(pRef)) {
                        return Math.abs(pAmount - bAmount) < 0.01
                    }

                    // Match rule 3: exact amount match within 14 days
                    const daysDiff = Math.abs(
                        (bTxn.transactionDate.getTime() - p.paymentDate.getTime()) / (1000 * 3600 * 24)
                    )
                    return Math.abs(pAmount - bAmount) < 0.01 && daysDiff <= 14
                })

                if (matchingPayment) {
                    await prisma.bankTransaction.update({
                        where: { id: bTxn.id },
                        data: {
                            status: BankReconcileStatus.MATCHED,
                            matchedType: BankMatchedType.PAYMENT,
                            paymentId: matchingPayment.id,
                            matchedAt: new Date(),
                            matchConfidence: bRef && matchingPayment.reference ? "EXACT" : "RULE",
                        },
                    })
                    // Remove from candidates pool
                    matchingPayment.bankTransactions.push({ id: bTxn.id } as any)
                    matchCount++
                }
            } else if (bTxn.type === BankTransactionType.WITHDRAWAL) {
                // Look for matching outbound payment or expense
                // 1. Try expenses first
                const matchingExpense = systemExpenses.find((e: any) => {
                    if (e.bankTransactions.length > 0) return false
                    const eAmount = Number(e.totalAmount)
                    const eRef = e.paymentReference?.toLowerCase().trim()
                    const eNum = e.expenseNumber?.toLowerCase().trim()

                    // Match rule 1: reference or expenseNumber in narration
                    if ((eRef && bDesc.includes(eRef)) || (eNum && bDesc.includes(eNum))) {
                        return Math.abs(eAmount - bAmount) < 0.01
                    }

                    // Match rule 2: exact amount within 14 days
                    const daysDiff = Math.abs(
                        (bTxn.transactionDate.getTime() - e.expenseDate.getTime()) / (1000 * 3600 * 24)
                    )
                    return Math.abs(eAmount - bAmount) < 0.01 && daysDiff <= 14
                })

                if (matchingExpense) {
                    await prisma.bankTransaction.update({
                        where: { id: bTxn.id },
                        data: {
                            status: BankReconcileStatus.MATCHED,
                            matchedType: BankMatchedType.EXPENSE,
                            expenseId: matchingExpense.id,
                            matchedAt: new Date(),
                            matchConfidence: "RULE",
                        },
                    })
                    matchingExpense.bankTransactions.push({ id: bTxn.id } as any)
                    matchCount++
                    continue
                }

                // 2. Try outbound bill payments
                const matchingOutboundPayment = systemPayments.find((p: any) => {
                    if (p.bankTransactions.length > 0) return false
                    if (p.type !== "OUTBOUND") return false
                    const pAmount = Number(p.amount)
                    const pRef = p.reference?.toLowerCase().trim()

                    if (bRef && pRef && (bRef.includes(pRef) || pRef.includes(bRef))) {
                        return Math.abs(pAmount - bAmount) < 0.01
                    }

                    const daysDiff = Math.abs(
                        (bTxn.transactionDate.getTime() - p.paymentDate.getTime()) / (1000 * 3600 * 24)
                    )
                    return Math.abs(pAmount - bAmount) < 0.01 && daysDiff <= 14
                })

                if (matchingOutboundPayment) {
                    await prisma.bankTransaction.update({
                        where: { id: bTxn.id },
                        data: {
                            status: BankReconcileStatus.MATCHED,
                            matchedType: BankMatchedType.PAYMENT,
                            paymentId: matchingOutboundPayment.id,
                            matchedAt: new Date(),
                            matchConfidence: "RULE",
                        },
                    })
                    matchingOutboundPayment.bankTransactions.push({ id: bTxn.id } as any)
                    matchCount++
                }
            }
        }

        revalidatePath("/finance/bank-reconciliation")
        return { success: true, matchedCount: matchCount }
    } catch (err: any) {
        console.error("autoMatchTransactions error:", err)
        return { error: err.message || "Failed to auto-match transactions" }
    }
}

// ============================================
// MANUAL MATCH / UNMATCH ACTIONS
// ============================================

export async function matchTransactionManual(
    transactionId: string,
    matchType: "PAYMENT" | "EXPENSE" | "JOURNAL_ENTRY",
    recordId: string
): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const dataToUpdate: any = {
            status: BankReconcileStatus.MATCHED,
            matchedType: matchType as BankMatchedType,
            matchedAt: new Date(),
            matchConfidence: "MANUAL",
        }

        if (matchType === "PAYMENT") {
            dataToUpdate.paymentId = recordId
            dataToUpdate.expenseId = null
            dataToUpdate.journalEntryId = null
        } else if (matchType === "EXPENSE") {
            dataToUpdate.expenseId = recordId
            dataToUpdate.paymentId = null
            dataToUpdate.journalEntryId = null
        } else if (matchType === "JOURNAL_ENTRY") {
            dataToUpdate.journalEntryId = recordId
            dataToUpdate.paymentId = null
            dataToUpdate.expenseId = null
        }

        await prisma.bankTransaction.update({
            where: { id: transactionId },
            data: dataToUpdate,
        })

        revalidatePath("/finance/bank-reconciliation")
        return { success: true }
    } catch (err: any) {
        console.error("matchTransactionManual error:", err)
        return { error: err.message || "Failed to link transaction" }
    }
}

export async function unmatchTransaction(transactionId: string): Promise<{
    success?: boolean
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        await prisma.bankTransaction.update({
            where: { id: transactionId },
            data: {
                status: BankReconcileStatus.UNMATCHED,
                matchedType: null,
                paymentId: null,
                expenseId: null,
                journalEntryId: null,
                matchedAt: null,
                reconciledAt: null,
                matchConfidence: null,
            },
        })

        revalidatePath("/finance/bank-reconciliation")
        return { success: true }
    } catch (err: any) {
        console.error("unmatchTransaction error:", err)
        return { error: err.message || "Failed to unmatch transaction" }
    }
}

// ============================================
// QUICK EXPENSE & RECONCILE (BANK CHARGES / DIRECT DEBITS)
// ============================================

export async function createQuickExpenseAndReconcile(
    transactionId: string,
    payload: QuickExpenseInput
): Promise<{ success?: boolean; expenseId?: string; error?: string }> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const bTxn = await prisma.bankTransaction.findUnique({
            where: { id: transactionId },
            include: { bankAccount: true },
        })

        if (!bTxn) return { error: "Bank transaction not found" }
        if (!payload.title?.trim()) return { error: "Expense title is required" }
        if (!payload.category?.trim()) return { error: "Category is required" }
        if (!payload.accountId) return { error: "Expense account is required" }

        const year = new Date().getFullYear()
        const count = await prisma.expense.count({ where: { tenantId } })
        const expenseNumber = `EXP-${year}-${String(count + 1).padStart(4, "0")}`

        const expenseDate = payload.expenseDate ? new Date(payload.expenseDate) : bTxn.transactionDate
        const amount = Number(payload.amount || bTxn.amount)
        const paymentAccountId = bTxn.bankAccount?.chartOfAccountId || null

        // Atomic transaction creating expense, balanced journal entry, and linking bank transaction
        const result = await prisma.$transaction(async (tx: any) => {
            let journalEntryId: string | null = null

            if (paymentAccountId) {
                const jeCount = await tx.journalEntry.count({ where: { tenantId } })
                const entryNumber = `JE-${year}-${String(jeCount + 1).padStart(4, "0")}`

                const journal = await tx.journalEntry.create({
                    data: {
                        tenantId,
                        entryNumber,
                        date: expenseDate,
                        reference: expenseNumber,
                        sourceType: "EXPENSE",
                        narration: `Bank Reconcile Adjustment: ${payload.title}`,
                        status: "POSTED",
                        totalDebit: amount,
                        totalCredit: amount,
                        lines: {
                            create: [
                                {
                                    tenantId,
                                    accountId: payload.accountId,
                                    debit: amount,
                                    credit: 0,
                                    description: payload.title,
                                },
                                {
                                    tenantId,
                                    accountId: paymentAccountId,
                                    debit: 0,
                                    credit: amount,
                                    description: `Settled via ${bTxn.bankAccount.bankName}`,
                                },
                            ],
                        },
                    },
                })
                journalEntryId = journal.id

                // Update Chart of Accounts balances
                await tx.account.update({
                    where: { id: payload.accountId },
                    data: { balance: { increment: amount } },
                })
                await tx.account.update({
                    where: { id: paymentAccountId },
                    data: { balance: { decrement: amount } },
                })
            }

            const createdExpense = await tx.expense.create({
                data: {
                    tenantId,
                    expenseNumber,
                    title: payload.title.trim(),
                    category: payload.category.trim(),
                    accountId: payload.accountId,
                    paymentAccountId,
                    amount,
                    taxAmount: 0,
                    totalAmount: amount,
                    expenseDate,
                    paymentMethod: payload.paymentMethod || PaymentMethod.BANK_TRANSFER,
                    paymentReference: bTxn.reference || `RECON-${bTxn.id.substring(0, 6)}`,
                    status: ExpenseStatus.PAID,
                    journalEntryId,
                    notes: payload.notes?.trim() || `Auto-created during bank reconciliation from "${bTxn.description}"`,
                },
            })

            // Bind bank transaction as RECONCILED
            await tx.bankTransaction.update({
                where: { id: transactionId },
                data: {
                    status: BankReconcileStatus.RECONCILED,
                    matchedType: BankMatchedType.EXPENSE,
                    expenseId: createdExpense.id,
                    journalEntryId,
                    matchedAt: new Date(),
                    reconciledAt: new Date(),
                    matchConfidence: "MANUAL",
                },
            })

            return createdExpense
        })

        revalidatePath("/finance/bank-reconciliation")
        return { success: true, expenseId: result.id }
    } catch (err: any) {
        console.error("createQuickExpenseAndReconcile error:", err)
        return { error: err.message || "Failed to record expense and reconcile" }
    }
}

// ============================================
// FINALIZE & LOCK RECONCILIATION STATEMENT
// ============================================

export async function finalizeReconciliation(statementId: string): Promise<{
    success?: boolean
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const statement = await prisma.bankStatement.findUnique({
            where: { id: statementId },
            include: { transactions: true },
        })

        if (!statement) return { error: "Statement batch not found" }

        // Check if there are any unmatched transactions in this statement
        const unmatched = statement.transactions.filter(
            (t: any) => t.status === BankReconcileStatus.UNMATCHED
        )
        if (unmatched.length > 0) {
            return {
                error: `Cannot finalize statement: ${unmatched.length} transaction(s) are still unmatched. Match or adjust all lines first.`,
            }
        }

        // Lock all matched lines to RECONCILED and mark statement RECONCILED
        await prisma.$transaction(async (tx: any) => {
            await tx.bankTransaction.updateMany({
                where: {
                    statementId,
                    status: BankReconcileStatus.MATCHED,
                },
                data: {
                    status: BankReconcileStatus.RECONCILED,
                    reconciledAt: new Date(),
                },
            })

            await tx.bankStatement.update({
                where: { id: statementId },
                data: {
                    status: BankStatementStatus.RECONCILED,
                    reconciledBalance: statement.closingBalance,
                    reconciledAt: new Date(),
                },
            })
        })

        revalidatePath("/finance/bank-reconciliation")
        return { success: true }
    } catch (err: any) {
        console.error("finalizeReconciliation error:", err)
        return { error: err.message || "Failed to finalize reconciliation statement" }
    }
}

// ============================================
// AUTO SEEDER (IF EMPTY)
// ============================================

export async function autoSeedBankingIfEmpty(tenantId: string): Promise<void> {
    const existingCount = await prisma.bankAccount.count({ where: { tenantId } })
    if (existingCount > 0) return

    // Find or locate Chart of Accounts asset bank accounts
    const bankCoA = await prisma.account.findFirst({
        where: { tenantId, code: "1120" },
    })

    const hdfc = await prisma.bankAccount.create({
        data: {
            tenantId,
            accountName: "HDFC Primary Corporate Current Account",
            accountNumber: "50200098765432",
            bankName: "HDFC Bank",
            branchName: "Indiranagar 100ft Road, Bengaluru",
            ifscRoutingCode: "HDFC0000240",
            swiftCode: "HDFCINBBXXX",
            currencyCode: "INR",
            accountType: BankAccountType.CURRENT,
            chartOfAccountId: bankCoA ? bankCoA.id : null,
            openingBalance: 1250000.0,
            currentBalance: 1425850.0,
            isActive: true,
            isPrimary: true,
            notes: "Main operational account for client receipts, payroll settlements, and supplier vendor payments.",
        },
    })

    await prisma.bankAccount.create({
        data: {
            tenantId,
            accountName: "ICICI Forex & Escrow Current Account",
            accountNumber: "001205019822",
            bankName: "ICICI Bank",
            branchName: "Bandra-Kurla Complex (BKC), Mumbai",
            ifscRoutingCode: "ICIC0000012",
            swiftCode: "ICICINBBXXX",
            currencyCode: "INR",
            accountType: BankAccountType.CURRENT,
            chartOfAccountId: bankCoA ? bankCoA.id : null,
            openingBalance: 650000.0,
            currentBalance: 820400.0,
            isActive: true,
            isPrimary: false,
            notes: "Secondary current account dedicated to overseas SaaS inward remittances and client escrow advances.",
        },
    })

    // Seed March 2026 statement batch for HDFC
    const marchStatement = await prisma.bankStatement.create({
        data: {
            tenantId,
            bankAccountId: hdfc.id,
            statementNumber: "STMT-2026-03-HDFC",
            startDate: new Date("2026-03-01"),
            endDate: new Date("2026-03-31"),
            openingBalance: 1250000.0,
            closingBalance: 1425850.0,
            reconciledBalance: 1340000.0,
            status: BankStatementStatus.IN_PROGRESS,
            notes: "Standard monthly bank reconciliation batch for March 2026 fiscal close.",
        },
    })

    // Find any existing system payments or expenses to link
    const samplePayment = await prisma.payment.findFirst({
        where: { tenantId, type: "INBOUND" },
    })
    const sampleExpense = await prisma.expense.findFirst({
        where: { tenantId, status: ExpenseStatus.PAID },
    })

    // Seed realistic statement lines
    await prisma.bankTransaction.createMany({
        data: [
            {
                tenantId,
                bankAccountId: hdfc.id,
                statementId: marchStatement.id,
                transactionDate: new Date("2026-03-04"),
                type: BankTransactionType.DEPOSIT,
                amount: 145000.0,
                balance: 1395000.0,
                payee: "Acme Global Technologies",
                description: "NEFT IN: Acme Global Enterprise Tech Solutions INV-2026-0001",
                reference: "NEFT-902188231",
                status: samplePayment ? BankReconcileStatus.MATCHED : BankReconcileStatus.UNMATCHED,
                matchedType: samplePayment ? BankMatchedType.PAYMENT : null,
                paymentId: samplePayment ? samplePayment.id : null,
                matchedAt: samplePayment ? new Date() : null,
                matchConfidence: samplePayment ? "EXACT" : null,
            },
            {
                tenantId,
                bankAccountId: hdfc.id,
                statementId: marchStatement.id,
                transactionDate: new Date("2026-03-08"),
                type: BankTransactionType.WITHDRAWAL,
                amount: 55000.0,
                balance: 1340000.0,
                payee: "Nexus Business Parks Ltd",
                description: "RTGS OUT: Corporate Headquarters Indiranagar Monthly Office Rent",
                reference: "RTGS-781920144",
                status: sampleExpense ? BankReconcileStatus.MATCHED : BankReconcileStatus.UNMATCHED,
                matchedType: sampleExpense ? BankMatchedType.EXPENSE : null,
                expenseId: sampleExpense ? sampleExpense.id : null,
                matchedAt: sampleExpense ? new Date() : null,
                matchConfidence: sampleExpense ? "EXACT" : null,
            },
            {
                tenantId,
                bankAccountId: hdfc.id,
                statementId: marchStatement.id,
                transactionDate: new Date("2026-03-12"),
                type: BankTransactionType.DEPOSIT,
                amount: 98000.0,
                balance: 1438000.0,
                payee: "Starlight Enterprise Solutions",
                description: "IMPS IN: Starlight Annual Cloud Architecture Retainer Remittance",
                reference: "IMPS-662910382",
                status: BankReconcileStatus.UNMATCHED,
            },
            {
                tenantId,
                bankAccountId: hdfc.id,
                statementId: marchStatement.id,
                transactionDate: new Date("2026-03-16"),
                type: BankTransactionType.WITHDRAWAL,
                amount: 12400.0,
                balance: 1425600.0,
                payee: "Amazon Web Services",
                description: "DEBIT: AWS Cloud Hosting Compute & Database Instances Invoice",
                reference: "POS-AWS-99120",
                status: BankReconcileStatus.UNMATCHED,
            },
            {
                tenantId,
                bankAccountId: hdfc.id,
                statementId: marchStatement.id,
                transactionDate: new Date("2026-03-22"),
                type: BankTransactionType.WITHDRAWAL,
                amount: 1750.0,
                balance: 1423850.0,
                payee: "HDFC Bank Ltd",
                description: "BANK CHG: Quarterly Corporate NetBanking & Open Banking API Gateway Fee",
                reference: "CHG-2026-Q1",
                status: BankReconcileStatus.UNMATCHED,
            },
            {
                tenantId,
                bankAccountId: hdfc.id,
                statementId: marchStatement.id,
                transactionDate: new Date("2026-03-28"),
                type: BankTransactionType.DEPOSIT,
                amount: 2000.0,
                balance: 1425850.0,
                payee: "HDFC Bank Ltd",
                description: "INT CR: Auto-Sweep Flexi Fixed Deposit Quarterly Interest Credit",
                reference: "INT-CR-8812",
                status: BankReconcileStatus.UNMATCHED,
            },
        ],
    })
}
