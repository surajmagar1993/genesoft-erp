"use client"

import { useState, useTransition, useMemo } from "react"
import {
    ExpenseRecord,
    JournalEntryRecord,
    AccountLookup,
    ContactLookup,
    EmployeeLookup,
    ExpensesOverviewStats,
    createExpense,
    updateExpenseStatus,
    createJournalEntry,
    voidExpense,
} from "@/app/actions/finance/expenses"
import {
    ExpenseStatus,
    PaymentMethod,
    JournalStatus,
    JournalSourceType,
    AccountType,
} from "@prisma/client"
import {
    ReceiptText,
    BookOpen,
    Plus,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    TrendingDown,
    Clock,
    CheckCircle2,
    XCircle,
    Ban,
    DollarSign,
    ShieldCheck,
    CreditCard,
    FileText,
    ExternalLink,
    AlertCircle,
    Layers,
    PieChart,
    Building2,
    User,
    Calendar,
    ChevronRight,
    Info,
    Trash2,
    Eye,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

interface ExpensesClientProps {
    initialStats: ExpensesOverviewStats
    initialExpenses: ExpenseRecord[]
    initialJournalEntries: JournalEntryRecord[]
    accounts: AccountLookup[]
    vendors: ContactLookup[]
    employees: EmployeeLookup[]
}

const CATEGORY_OPTIONS = [
    "Software & Hosting",
    "Rent & Facilities",
    "Utilities",
    "Office Supplies",
    "Salaries & Wages",
    "Marketing & Advertising",
    "Travel & Meals",
    "Professional Fees",
    "Equipment & Maintenance",
    "Miscellaneous",
]

export default function ExpensesClient({
    initialStats,
    initialExpenses,
    initialJournalEntries,
    accounts,
    vendors,
    employees,
}: ExpensesClientProps) {
    const [isPending, startTransition] = useTransition()

    // Data State
    const [expenses, setExpenses] = useState<ExpenseRecord[]>(initialExpenses)
    const [journalEntries, setJournalEntries] = useState<JournalEntryRecord[]>(initialJournalEntries)
    const [stats, setStats] = useState<ExpensesOverviewStats>(initialStats)

    // Filters & Navigation
    const [activeTab, setActiveTab] = useState("expenses")
    const [searchQuery, setSearchQuery] = useState("")
    const [categoryFilter, setCategoryFilter] = useState("ALL")
    const [statusFilter, setStatusFilter] = useState("ALL")

    // Modals
    const [isCreateExpenseOpen, setIsCreateExpenseOpen] = useState(false)
    const [isCreateJournalOpen, setIsCreateJournalOpen] = useState(false)
    const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null)
    const [selectedJournal, setSelectedJournal] = useState<JournalEntryRecord | null>(null)

    // Account T-Ledger Drilldown
    const expenseAccounts = useMemo(() => accounts.filter((a) => a.type === AccountType.EXPENSE), [accounts])
    const assetAccounts = useMemo(() => accounts.filter((a) => a.type === AccountType.ASSET), [accounts])
    const defaultSelectedAccountId = expenseAccounts[0]?.id || accounts[0]?.id || ""
    const [drilldownAccountId, setDrilldownAccountId] = useState<string>(defaultSelectedAccountId)

    // Form State: Record Expense
    const [expForm, setExpForm] = useState<{
        title: string
        category: string
        accountId: string
        paymentAccountId: string
        vendorId: string
        vendorName: string
        employeeId: string
        amount: string
        taxRate: string
        expenseDate: string
        paymentMethod: PaymentMethod
        paymentReference: string
        isReimbursable: boolean
        receiptUrl: string
        notes: string
        autoPostJournal: boolean
    }>({
        title: "",
        category: "Software & Hosting",
        accountId: expenseAccounts[0]?.id || "",
        paymentAccountId: assetAccounts.find((a) => a.code === "1120")?.id || assetAccounts[0]?.id || "",
        vendorId: "",
        vendorName: "",
        employeeId: "",
        amount: "",
        taxRate: "18",
        expenseDate: new Date().toISOString().split("T")[0],
        paymentMethod: PaymentMethod.BANK_TRANSFER,
        paymentReference: "",
        isReimbursable: false,
        receiptUrl: "",
        notes: "",
        autoPostJournal: true,
    })

    // Form State: Journal Entry
    const [jeForm, setJeForm] = useState<{
        date: string
        reference: string
        narration: string
        lines: { accountId: string; debit: string; credit: string; description: string }[]
    }>({
        date: new Date().toISOString().split("T")[0],
        reference: "",
        narration: "",
        lines: [
            { accountId: expenseAccounts[0]?.id || accounts[0]?.id || "", debit: "", credit: "", description: "" },
            { accountId: assetAccounts[0]?.id || accounts[1]?.id || "", debit: "", credit: "", description: "" },
        ],
    })

    const [formError, setFormError] = useState<string | null>(null)

    // Helper: Format Currency
    const formatINR = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(val)
    }

    // Helper: Filtered Expenses
    const filteredExpenses = useMemo(() => {
        return expenses.filter((e) => {
            const matchesCategory = categoryFilter === "ALL" || e.category === categoryFilter
            const matchesStatus = statusFilter === "ALL" || e.status === statusFilter
            const q = searchQuery.toLowerCase().trim()
            const matchesSearch =
                !q ||
                e.expenseNumber.toLowerCase().includes(q) ||
                e.title.toLowerCase().includes(q) ||
                (e.vendorName && e.vendorName.toLowerCase().includes(q)) ||
                (e.employeeName && e.employeeName.toLowerCase().includes(q)) ||
                (e.paymentReference && e.paymentReference.toLowerCase().includes(q))
            return matchesCategory && matchesStatus && matchesSearch
        })
    }, [expenses, categoryFilter, statusFilter, searchQuery])

    // Helper: Filtered Journal Entries
    const filteredJournals = useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return journalEntries
        return journalEntries.filter(
            (j) =>
                j.entryNumber.toLowerCase().includes(q) ||
                j.narration.toLowerCase().includes(q) ||
                (j.reference && j.reference.toLowerCase().includes(q)) ||
                j.lines.some((l) => l.accountName.toLowerCase().includes(q) || l.accountCode.includes(q))
        )
    }, [journalEntries, searchQuery])

    // Helper: T-Ledger Calculations for Selected Account
    const selectedAccount = useMemo(() => {
        return accounts.find((a) => a.id === drilldownAccountId) || accounts[0]
    }, [accounts, drilldownAccountId])

    const accountLedgerLines = useMemo(() => {
        if (!selectedAccount) return []
        const lines: {
            date: Date
            entryNumber: string
            narration: string
            debit: number
            credit: number
            runningBalance: number
            reference: string | null
        }[] = []

        let running = Number(selectedAccount.balance) // Current or baseline

        // Find all lines across journal entries that reference this account
        for (const je of journalEntries) {
            if (je.status !== JournalStatus.POSTED) continue
            for (const l of je.lines) {
                if (l.accountId === selectedAccount.id) {
                    lines.push({
                        date: je.date,
                        entryNumber: je.entryNumber,
                        narration: l.description || je.narration,
                        debit: l.debit,
                        credit: l.credit,
                        runningBalance: 0, // will compute sequentially
                        reference: je.reference,
                    })
                }
            }
        }

        // Sort chronologically ascending for ledger calculation
        lines.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

        let bal = 0
        const isDebitNormal =
            selectedAccount.type === AccountType.ASSET || selectedAccount.type === AccountType.EXPENSE

        for (const item of lines) {
            if (isDebitNormal) {
                bal += item.debit - item.credit
            } else {
                bal += item.credit - item.debit
            }
            item.runningBalance = bal
        }

        // Return latest first for user display
        return lines.reverse()
    }, [selectedAccount, journalEntries])

    // Journal Voucher Calculations (Live Double-Entry Balancing)
    const jeTotalDebit = useMemo(() => {
        return jeForm.lines.reduce((acc, l) => acc + (parseFloat(l.debit) || 0), 0)
    }, [jeForm.lines])

    const jeTotalCredit = useMemo(() => {
        return jeForm.lines.reduce((acc, l) => acc + (parseFloat(l.credit) || 0), 0)
    }, [jeForm.lines])

    const jeDifference = Math.abs(jeTotalDebit - jeTotalCredit)
    const isJeBalanced = jeDifference < 0.01 && jeTotalDebit > 0

    // Handlers: Record Expense Submit
    const handleCreateExpense = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        const numAmount = parseFloat(expForm.amount)
        if (isNaN(numAmount) || numAmount <= 0) {
            setFormError("Please provide a valid expense amount greater than 0.")
            return
        }

        const taxRateNum = parseFloat(expForm.taxRate) || 0
        const taxAmount = (numAmount * taxRateNum) / 100

        const selectedVendor = vendors.find((v) => v.id === expForm.vendorId)

        startTransition(async () => {
            const res = await createExpense({
                title: expForm.title,
                category: expForm.category,
                accountId: expForm.accountId,
                paymentAccountId: expForm.paymentAccountId || undefined,
                vendorId: expForm.vendorId || undefined,
                vendorName: selectedVendor ? selectedVendor.displayName : expForm.vendorName || undefined,
                employeeId: expForm.isReimbursable ? expForm.employeeId || undefined : undefined,
                amount: numAmount,
                taxAmount,
                expenseDate: expForm.expenseDate,
                paymentMethod: expForm.paymentMethod,
                paymentReference: expForm.paymentReference || undefined,
                isReimbursable: expForm.isReimbursable,
                receiptUrl: expForm.receiptUrl || undefined,
                notes: expForm.notes || undefined,
                autoPostJournal: expForm.autoPostJournal,
            })

            if (res.error) {
                setFormError(res.error)
            } else {
                setIsCreateExpenseOpen(false)
                // Refresh full state by reloading or fetching
                window.location.reload()
            }
        })
    }

    // Handlers: Create Journal Entry Submit
    const handleCreateJournal = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        if (!isJeBalanced) {
            setFormError(`Debits (₹${jeTotalDebit.toFixed(2)}) must equal Credits (₹${jeTotalCredit.toFixed(2)})!`)
            return
        }

        const linesPayload = jeForm.lines.map((l) => ({
            accountId: l.accountId,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
            description: l.description || undefined,
        }))

        startTransition(async () => {
            const res = await createJournalEntry({
                date: jeForm.date,
                reference: jeForm.reference || undefined,
                narration: jeForm.narration,
                lines: linesPayload,
                sourceType: JournalSourceType.MANUAL,
            })

            if (res.error) {
                setFormError(res.error)
            } else {
                setIsCreateJournalOpen(false)
                window.location.reload()
            }
        })
    }

    // Handlers: Update Status
    const handleStatusUpdate = (expenseId: string, newStatus: ExpenseStatus, isClaimSettled?: boolean) => {
        startTransition(async () => {
            const res = await updateExpenseStatus(expenseId, newStatus, isClaimSettled)
            if (res.error) {
                alert(res.error)
            } else {
                window.location.reload()
            }
        })
    }

    // Handlers: Void Expense
    const handleVoidExpense = (expenseId: string) => {
        if (!confirm("Are you sure you want to void this expense voucher and reverse its General Ledger entry?")) {
            return
        }

        startTransition(async () => {
            const res = await voidExpense(expenseId)
            if (res.error) {
                alert(res.error)
            } else {
                window.location.reload()
            }
        })
    }

    // Category distribution calculations for Analytics tab
    const categoryBreakdown = useMemo(() => {
        const breakdown: Record<string, { count: number; total: number }> = {}
        let grandTotal = 0

        for (const e of expenses) {
            if (e.status === ExpenseStatus.PAID || e.status === ExpenseStatus.APPROVED) {
                if (!breakdown[e.category]) {
                    breakdown[e.category] = { count: 0, total: 0 }
                }
                breakdown[e.category].count++
                breakdown[e.category].total += e.totalAmount
                grandTotal += e.totalAmount
            }
        }

        return Object.entries(breakdown)
            .map(([cat, val]) => ({
                category: cat,
                count: val.count,
                total: val.total,
                percentage: grandTotal > 0 ? (val.total / grandTotal) * 100 : 0,
            }))
            .sort((a, b) => b.total - a.total)
    }, [expenses])

    return (
        <div className="space-y-6">
            {/* 1. Header Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                        <ReceiptText className="h-8 w-8 text-indigo-500" />
                        Expense Management & General Ledger
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track business expenditures, record employee claims, and inspect balanced double-entry Journal Vouchers.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        onClick={() => setIsCreateJournalOpen(true)}
                        className="gap-2 border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30"
                    >
                        <BookOpen className="h-4 w-4" />
                        New Journal Voucher
                    </Button>
                    <Button
                        onClick={() => setIsCreateExpenseOpen(true)}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Record Expense
                    </Button>
                </div>
            </div>

            {/* 2. 4-Column KPI Telemetry Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Total Operational Expenses */}
                <Card className="border-border/60 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Operational Expenses
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                            <ReceiptText className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatINR(stats.totalExpenses)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                                {expenses.filter((e) => e.status === ExpenseStatus.PAID).length} paid
                            </span>{" "}
                            across active fiscal year
                        </p>
                    </CardContent>
                </Card>

                {/* KPI 2: Pending Approval / Claims */}
                <Card className="border-border/60 shadow-sm hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pending Approvals
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                            <Clock className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatINR(stats.pendingApprovalAmount)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {stats.pendingApprovalCount} claim{stats.pendingApprovalCount !== 1 ? "s" : ""} awaiting review
                        </p>
                    </CardContent>
                </Card>

                {/* KPI 3: Top Expense Driver */}
                <Card className="border-border/60 shadow-sm hover:border-purple-300 dark:hover:border-purple-800 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Top Expense Driver
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                            <PieChart className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-xl font-bold text-foreground truncate">
                            {stats.topCategoryName}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {formatINR(stats.topCategoryAmount)} allocated
                        </p>
                    </CardContent>
                </Card>

                {/* KPI 4: Input Tax Credit (ITC) */}
                <Card className="border-border/60 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Input Tax Credit (ITC)
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatINR(stats.inputTaxCredit)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            GST input claimable against output tax
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Tabbed Views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/50 p-1 border">
                    <TabsTrigger value="expenses" className="gap-2">
                        <ReceiptText className="h-4 w-4" />
                        Expenses Register ({filteredExpenses.length})
                    </TabsTrigger>
                    <TabsTrigger value="ledger" className="gap-2">
                        <BookOpen className="h-4 w-4" />
                        General Ledger Vouchers ({journalEntries.length})
                    </TabsTrigger>
                    <TabsTrigger value="t-ledger" className="gap-2">
                        <Layers className="h-4 w-4" />
                        Account T-Ledger
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                        <PieChart className="h-4 w-4" />
                        Spending Breakdown
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: Expenses Register ── */}
                <TabsContent value="expenses" className="space-y-4">
                    {/* Filters & Search */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by voucher #, title, vendor, staff..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-background"
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <select
                                value={categoryFilter}
                                onChange={(e) => setCategoryFilter(e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                                <option value="ALL">All Categories</option>
                                {CATEGORY_OPTIONS.map((cat) => (
                                    <option key={cat} value={cat}>
                                        {cat}
                                    </option>
                                ))}
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value="PAID">Paid</option>
                                <option value="PENDING_APPROVAL">Pending Approval</option>
                                <option value="APPROVED">Approved</option>
                                <option value="VOID">Void</option>
                            </select>
                        </div>
                    </div>

                    {/* Table of Expenses */}
                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/40 text-muted-foreground font-medium border-b text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3.5 px-4">Voucher</th>
                                        <th className="py-3.5 px-4">Date</th>
                                        <th className="py-3.5 px-4">Expense Details</th>
                                        <th className="py-3.5 px-4">Payee / Vendor</th>
                                        <th className="py-3.5 px-4">Accounts & Method</th>
                                        <th className="py-3.5 px-4 text-right">Amount (₹)</th>
                                        <th className="py-3.5 px-4 text-center">Status</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {filteredExpenses.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-muted-foreground">
                                                No expense records matching the selected criteria.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredExpenses.map((exp) => (
                                            <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-semibold text-xs text-indigo-600 dark:text-indigo-400">
                                                    {exp.expenseNumber}
                                                    {exp.journalEntryNumber && (
                                                        <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                            GL: {exp.journalEntryNumber}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap">
                                                    {new Date(exp.expenseDate).toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="font-medium text-foreground">{exp.title}</div>
                                                    <div className="flex items-center gap-1.5 mt-1">
                                                        <Badge variant="outline" className="text-[11px] font-normal">
                                                            {exp.category}
                                                        </Badge>
                                                        {exp.isReimbursable && (
                                                            <Badge variant="secondary" className="text-[10px] bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200">
                                                                Reimbursable
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="text-foreground">{exp.vendorName || "—"}</div>
                                                    {exp.employeeName && (
                                                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                                                            <User className="h-3 w-3" />
                                                            {exp.employeeName}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-xs">
                                                    <div className="text-muted-foreground">
                                                        <span className="font-mono text-[11px] text-foreground font-medium">
                                                            {exp.accountCode}
                                                        </span>{" "}
                                                        {exp.accountName}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                                        Via {exp.paymentMethod?.replace("_", " ") || "Bank"}{" "}
                                                        {exp.paymentReference ? `(${exp.paymentReference})` : ""}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <div className="font-bold text-foreground">
                                                        {formatINR(exp.totalAmount)}
                                                    </div>
                                                    {exp.taxAmount > 0 && (
                                                        <div className="text-[11px] text-muted-foreground">
                                                            Net {formatINR(exp.amount)} + GST {formatINR(exp.taxAmount)}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {exp.status === ExpenseStatus.PAID && (
                                                        <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                                                            Paid
                                                        </Badge>
                                                    )}
                                                    {exp.status === ExpenseStatus.PENDING_APPROVAL && (
                                                        <Badge className="bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-300">
                                                            Pending Approval
                                                        </Badge>
                                                    )}
                                                    {exp.status === ExpenseStatus.APPROVED && (
                                                        <Badge className="bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-300">
                                                            Approved
                                                        </Badge>
                                                    )}
                                                    {exp.status === ExpenseStatus.REJECTED && (
                                                        <Badge variant="destructive">Rejected</Badge>
                                                    )}
                                                    {exp.status === ExpenseStatus.VOID && (
                                                        <Badge variant="outline" className="text-muted-foreground line-through">
                                                            Void
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedExpense(exp)}
                                                        className="h-8 px-2 text-xs"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 mr-1" />
                                                        View
                                                    </Button>
                                                    {exp.status === ExpenseStatus.PENDING_APPROVAL && (
                                                        <>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleStatusUpdate(exp.id, ExpenseStatus.APPROVED)}
                                                                disabled={isPending}
                                                                className="h-8 px-2 text-xs text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                                                            >
                                                                Approve
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleStatusUpdate(exp.id, ExpenseStatus.REJECTED)}
                                                                disabled={isPending}
                                                                className="h-8 px-2 text-xs text-destructive border-destructive/30"
                                                            >
                                                                Reject
                                                            </Button>
                                                        </>
                                                    )}
                                                    {exp.status === ExpenseStatus.APPROVED && (
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleStatusUpdate(exp.id, ExpenseStatus.PAID)}
                                                            disabled={isPending}
                                                            className="h-8 px-2 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                        >
                                                            Mark Paid
                                                        </Button>
                                                    )}
                                                    {exp.status !== ExpenseStatus.VOID && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            onClick={() => handleVoidExpense(exp.id)}
                                                            disabled={isPending}
                                                            className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Ban className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* ── TAB 2: General Ledger & Journal Vouchers ── */}
                <TabsContent value="ledger" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-foreground">Double-Entry Journal Vouchers</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Every transaction maintains balanced Debits and Credits ($\sum D = \sum C$).
                            </p>
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreateJournalOpen(true)}
                            className="gap-1.5"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Post Manual Voucher
                        </Button>
                    </div>

                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/40 text-muted-foreground font-medium border-b text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3.5 px-4">Voucher Code</th>
                                        <th className="py-3.5 px-4">Date</th>
                                        <th className="py-3.5 px-4">Source & Ref</th>
                                        <th className="py-3.5 px-4">Narration / Memo</th>
                                        <th className="py-3.5 px-4 text-right">Debit (₹)</th>
                                        <th className="py-3.5 px-4 text-right">Credit (₹)</th>
                                        <th className="py-3.5 px-4 text-center">Status</th>
                                        <th className="py-3.5 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {filteredJournals.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="py-12 text-center text-muted-foreground">
                                                No journal vouchers found.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredJournals.map((je) => (
                                            <tr key={je.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3.5 px-4 font-mono font-semibold text-xs text-indigo-600 dark:text-indigo-400">
                                                    {je.entryNumber}
                                                </td>
                                                <td className="py-3.5 px-4 text-muted-foreground text-xs whitespace-nowrap">
                                                    {new Date(je.date).toLocaleDateString("en-IN", {
                                                        day: "2-digit",
                                                        month: "short",
                                                        year: "numeric",
                                                    })}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {je.sourceType}
                                                    </Badge>
                                                    {je.reference && (
                                                        <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                                                            {je.reference}
                                                        </div>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4">
                                                    <div className="text-foreground max-w-sm font-medium">{je.narration}</div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {je.lines.length} balancing lines
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                                                    {formatINR(je.totalDebit)}
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground">
                                                    {formatINR(je.totalCredit)}
                                                </td>
                                                <td className="py-3.5 px-4 text-center">
                                                    {je.status === JournalStatus.POSTED ? (
                                                        <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                                                            Posted ✓
                                                        </Badge>
                                                    ) : (
                                                        <Badge variant="outline" className="line-through text-muted-foreground">
                                                            Void
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="py-3.5 px-4 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setSelectedJournal(je)}
                                                        className="h-8 px-2 text-xs"
                                                    >
                                                        <Eye className="h-3.5 w-3.5 mr-1" />
                                                        Inspect Lines
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* ── TAB 3: Account T-Ledger Drilldown ── */}
                <TabsContent value="t-ledger" className="space-y-4">
                    <Card className="border-border/60">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-base font-semibold">
                                        Account T-Ledger Statement
                                    </CardTitle>
                                    <CardDescription>
                                        Inspect chronological debits, credits, and rolling balances for any Chart of Accounts node.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <label className="text-xs text-muted-foreground font-medium whitespace-nowrap">
                                        Select Account:
                                    </label>
                                    <select
                                        value={drilldownAccountId}
                                        onChange={(e) => setDrilldownAccountId(e.target.value)}
                                        className="h-9 min-w-[240px] rounded-md border border-input bg-background px-3 text-sm font-medium focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        {accounts.map((a) => (
                                            <option key={a.id} value={a.id}>
                                                {a.code} — {a.name} ({a.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {selectedAccount && (
                                <div className="space-y-4">
                                    {/* Account Summary Banner */}
                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-muted/40 border text-sm">
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Account Code</span>
                                            <span className="font-mono font-bold text-foreground text-base">
                                                {selectedAccount.code}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Account Classification</span>
                                            <Badge variant="outline" className="mt-0.5">
                                                {selectedAccount.type}
                                            </Badge>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Current Balance</span>
                                            <span className="font-mono font-bold text-base text-foreground">
                                                {formatINR(Number(selectedAccount.balance))}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-xs text-muted-foreground block">Voucher Volume</span>
                                            <span className="font-medium text-foreground text-base">
                                                {accountLedgerLines.length} line entries
                                            </span>
                                        </div>
                                    </div>

                                    {/* Ledger Transactions Table */}
                                    <div className="rounded-lg border overflow-hidden">
                                        <table className="w-full text-sm text-left">
                                            <thead className="bg-muted/40 text-muted-foreground text-xs uppercase tracking-wider border-b">
                                                <tr>
                                                    <th className="py-2.5 px-3">Date</th>
                                                    <th className="py-2.5 px-3">Voucher Ref</th>
                                                    <th className="py-2.5 px-3">Description / Narration</th>
                                                    <th className="py-2.5 px-3 text-right">Debit (₹)</th>
                                                    <th className="py-2.5 px-3 text-right">Credit (₹)</th>
                                                    <th className="py-2.5 px-3 text-right">Running Balance (₹)</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60">
                                                {accountLedgerLines.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={6} className="py-8 text-center text-muted-foreground text-xs">
                                                            No posted transactions in General Ledger for this account yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    accountLedgerLines.map((line, idx) => (
                                                        <tr key={idx} className="hover:bg-muted/20">
                                                            <td className="py-2.5 px-3 text-xs text-muted-foreground whitespace-nowrap">
                                                                {new Date(line.date).toLocaleDateString("en-IN", {
                                                                    day: "2-digit",
                                                                    month: "short",
                                                                    year: "numeric",
                                                                })}
                                                            </td>
                                                            <td className="py-2.5 px-3 font-mono text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                                                                {line.entryNumber}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-xs text-foreground">
                                                                {line.narration}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-mono text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                                                {line.debit > 0 ? formatINR(line.debit) : "—"}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-mono text-xs text-amber-600 dark:text-amber-400 font-medium">
                                                                {line.credit > 0 ? formatINR(line.credit) : "—"}
                                                            </td>
                                                            <td className="py-2.5 px-3 text-right font-mono text-xs font-bold text-foreground">
                                                                {formatINR(line.runningBalance)}
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── TAB 4: Spending Breakdown & Analytics ── */}
                <TabsContent value="analytics" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">
                                    Expenses by Category
                                </CardTitle>
                                <CardDescription>
                                    Cost drivers and percentage share across operational categories.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {categoryBreakdown.length === 0 ? (
                                    <p className="text-sm text-muted-foreground py-6 text-center">
                                        No paid expenses recorded to generate category analytics.
                                    </p>
                                ) : (
                                    categoryBreakdown.map((item) => (
                                        <div key={item.category} className="space-y-1.5">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="font-medium text-foreground">{item.category}</span>
                                                <span className="font-mono text-muted-foreground">
                                                    {formatINR(item.total)} ({item.percentage.toFixed(1)}%)
                                                </span>
                                            </div>
                                            <Progress value={item.percentage} className="h-2" />
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        <Card className="border-border/60 shadow-sm">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold">
                                    Reimbursement Claims Status
                                </CardTitle>
                                <CardDescription>
                                    Staff out-of-pocket expenses submitted for company reimbursement.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-3">
                                    {expenses
                                        .filter((e) => e.isReimbursable)
                                        .slice(0, 5)
                                        .map((claim) => (
                                            <div
                                                key={claim.id}
                                                className="p-3 rounded-lg border bg-muted/20 flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <div className="font-semibold text-foreground">{claim.title}</div>
                                                    <div className="text-muted-foreground mt-0.5">
                                                        Claimed by {claim.employeeName || "Employee"} •{" "}
                                                        {new Date(claim.expenseDate).toLocaleDateString()}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold font-mono text-foreground">
                                                        {formatINR(claim.totalAmount)}
                                                    </div>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] mt-1 ${
                                                            claim.isClaimSettled
                                                                ? "text-emerald-600 border-emerald-300"
                                                                : "text-amber-600 border-amber-300"
                                                        }`}
                                                    >
                                                        {claim.isClaimSettled ? "Settled" : "Unsettled"}
                                                    </Badge>
                                                </div>
                                            </div>
                                        ))}
                                    {expenses.filter((e) => e.isReimbursable).length === 0 && (
                                        <p className="text-sm text-muted-foreground py-6 text-center">
                                            No employee reimbursement claims submitted.
                                        </p>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* 4. MODAL: Record Expense */}
            <Dialog open={isCreateExpenseOpen} onOpenChange={setIsCreateExpenseOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ReceiptText className="h-5 w-5 text-indigo-500" />
                            Record Operational Business Expense
                        </DialogTitle>
                        <DialogDescription>
                            Create an expense voucher. Optionally auto-post balanced double-entry lines to the General Ledger.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateExpense} className="space-y-4 pt-2">
                        {formError && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-semibold text-foreground">
                                    Expense Title / Description *
                                </label>
                                <Input
                                    required
                                    placeholder="Enter expense title (e.g. AWS Cloud Hosting, Mumbai Office Rent)"
                                    value={expForm.title}
                                    onChange={(e) => setExpForm({ ...expForm, title: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Category *</label>
                                <select
                                    required
                                    value={expForm.category}
                                    onChange={(e) => setExpForm({ ...expForm, category: e.target.value })}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {CATEGORY_OPTIONS.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Expense Account (CoA) *
                                </label>
                                <select
                                    required
                                    value={expForm.accountId}
                                    onChange={(e) => setExpForm({ ...expForm, accountId: e.target.value })}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {expenseAccounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.code} — {a.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Payment Account (Bank / Cash) *
                                </label>
                                <select
                                    required
                                    value={expForm.paymentAccountId}
                                    onChange={(e) => setExpForm({ ...expForm, paymentAccountId: e.target.value })}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {assetAccounts.map((a) => (
                                        <option key={a.id} value={a.id}>
                                            {a.code} — {a.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Vendor / Payee</label>
                                <select
                                    value={expForm.vendorId}
                                    onChange={(e) => setExpForm({ ...expForm, vendorId: e.target.value })}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="">Choose saved contact / vendor...</option>
                                    {vendors.map((v) => (
                                        <option key={v.id} value={v.id}>
                                            {v.displayName} ({v.type})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {!expForm.vendorId && (
                                <div className="space-y-1.5 sm:col-span-2">
                                    <label className="text-xs font-semibold text-foreground">
                                        Payee Name (Manual entry if not in contacts)
                                    </label>
                                    <Input
                                        placeholder="Enter vendor or supplier name"
                                        value={expForm.vendorName}
                                        onChange={(e) => setExpForm({ ...expForm, vendorName: e.target.value })}
                                    />
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Net Amount (₹, ex-tax) *
                                </label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    required
                                    placeholder="Enter net amount"
                                    value={expForm.amount}
                                    onChange={(e) => setExpForm({ ...expForm, amount: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    GST / Tax Rate (%)
                                </label>
                                <select
                                    value={expForm.taxRate}
                                    onChange={(e) => setExpForm({ ...expForm, taxRate: e.target.value })}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="0">0% (Nil / Exempt)</option>
                                    <option value="5">5% GST</option>
                                    <option value="12">12% GST</option>
                                    <option value="18">18% GST (Standard)</option>
                                    <option value="28">28% GST</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Expense Date *</label>
                                <Input
                                    type="date"
                                    required
                                    value={expForm.expenseDate}
                                    onChange={(e) => setExpForm({ ...expForm, expenseDate: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Payment Method</label>
                                <select
                                    value={expForm.paymentMethod}
                                    onChange={(e) =>
                                        setExpForm({ ...expForm, paymentMethod: e.target.value as PaymentMethod })
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value={PaymentMethod.BANK_TRANSFER}>Bank Transfer (NEFT/RTGS/IMPS)</option>
                                    <option value={PaymentMethod.CREDIT_CARD}>Corporate Credit Card</option>
                                    <option value={PaymentMethod.UPI}>UPI Payout</option>
                                    <option value={PaymentMethod.CASH}>Petty Cash</option>
                                    <option value={PaymentMethod.CHEQUE}>Cheque</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Payment Reference / UTR #
                                </label>
                                <Input
                                    placeholder="Enter transaction or cheque reference"
                                    value={expForm.paymentReference}
                                    onChange={(e) => setExpForm({ ...expForm, paymentReference: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Receipt / Invoice URL
                                </label>
                                <Input
                                    placeholder="Enter receipt document link"
                                    value={expForm.receiptUrl}
                                    onChange={(e) => setExpForm({ ...expForm, receiptUrl: e.target.value })}
                                />
                            </div>

                            {/* Reimbursable Staff Claim Toggle */}
                            <div className="sm:col-span-2 p-3 rounded-lg border bg-muted/20 space-y-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={expForm.isReimbursable}
                                        onChange={(e) =>
                                            setExpForm({ ...expForm, isReimbursable: e.target.checked })
                                        }
                                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                    />
                                    <span className="text-xs font-semibold text-foreground">
                                        This is an Employee Reimbursement Claim
                                    </span>
                                </label>

                                {expForm.isReimbursable && (
                                    <div className="space-y-1.5 pt-1">
                                        <label className="text-xs font-medium text-muted-foreground">
                                            Claiming Employee *
                                        </label>
                                        <select
                                            value={expForm.employeeId}
                                            onChange={(e) => setExpForm({ ...expForm, employeeId: e.target.value })}
                                            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                                        >
                                            <option value="">Select employee from roster...</option>
                                            {employees.map((emp) => (
                                                <option key={emp.id} value={emp.id}>
                                                    {emp.name} ({emp.employeeNumber} - {emp.departmentName || "Staff"})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Auto Post Journal Toggle */}
                            <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-lg bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30">
                                <div>
                                    <div className="text-xs font-semibold text-foreground">
                                        Auto-Post to General Ledger
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Automatically creates a balanced Journal Voucher debiting the expense account and crediting payment account.
                                    </div>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={expForm.autoPostJournal}
                                    onChange={(e) =>
                                        setExpForm({ ...expForm, autoPostJournal: e.target.checked })
                                    }
                                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateExpenseOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isPending ? "Recording..." : "Record & Post Expense"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 5. MODAL: Create Manual Journal Voucher */}
            <Dialog open={isCreateJournalOpen} onOpenChange={setIsCreateJournalOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BookOpen className="h-5 w-5 text-indigo-500" />
                            Post Double-Entry Journal Voucher
                        </DialogTitle>
                        <DialogDescription>
                            Author double-entry accounting lines. All entries must adhere to strictly balanced debits and credits ($\sum D = \sum C$).
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateJournal} className="space-y-4 pt-2">
                        {formError && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Voucher Date *</label>
                                <Input
                                    type="date"
                                    required
                                    value={jeForm.date}
                                    onChange={(e) => setJeForm({ ...jeForm, date: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Source Reference / Document #
                                </label>
                                <Input
                                    placeholder="Enter reference (e.g. INV-001, MEMO-99)"
                                    value={jeForm.reference}
                                    onChange={(e) => setJeForm({ ...jeForm, reference: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5 sm:col-span-2">
                                <label className="text-xs font-semibold text-foreground">
                                    Narration / Business Memo *
                                </label>
                                <Input
                                    required
                                    placeholder="Enter descriptive narrative of this journal voucher"
                                    value={jeForm.narration}
                                    onChange={(e) => setJeForm({ ...jeForm, narration: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Journal Entry Lines Editor */}
                        <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-semibold text-foreground uppercase tracking-wider">
                                    Journal Lines
                                </label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() =>
                                        setJeForm({
                                            ...jeForm,
                                            lines: [
                                                ...jeForm.lines,
                                                {
                                                    accountId: accounts[0]?.id || "",
                                                    debit: "",
                                                    credit: "",
                                                    description: "",
                                                },
                                            ],
                                        })
                                    }
                                    className="h-7 text-xs gap-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add Line
                                </Button>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-muted/50 border-b text-muted-foreground font-medium">
                                        <tr>
                                            <th className="py-2 px-3 text-left">Account</th>
                                            <th className="py-2 px-3 text-left">Memo</th>
                                            <th className="py-2 px-3 text-right w-28">Debit (₹)</th>
                                            <th className="py-2 px-3 text-right w-28">Credit (₹)</th>
                                            <th className="py-2 px-2 text-center w-8"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {jeForm.lines.map((line, idx) => (
                                            <tr key={idx}>
                                                <td className="p-2">
                                                    <select
                                                        value={line.accountId}
                                                        onChange={(e) => {
                                                            const newLines = [...jeForm.lines]
                                                            newLines[idx].accountId = e.target.value
                                                            setJeForm({ ...jeForm, lines: newLines })
                                                        }}
                                                        className="w-full h-8 rounded border border-input bg-background px-2 text-xs"
                                                    >
                                                        {accounts.map((a) => (
                                                            <option key={a.id} value={a.id}>
                                                                {a.code} — {a.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        placeholder="Line note"
                                                        value={line.description}
                                                        onChange={(e) => {
                                                            const newLines = [...jeForm.lines]
                                                            newLines[idx].description = e.target.value
                                                            setJeForm({ ...jeForm, lines: newLines })
                                                        }}
                                                        className="h-8 text-xs"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={line.debit}
                                                        onChange={(e) => {
                                                            const newLines = [...jeForm.lines]
                                                            newLines[idx].debit = e.target.value
                                                            if (e.target.value) newLines[idx].credit = ""
                                                            setJeForm({ ...jeForm, lines: newLines })
                                                        }}
                                                        className="h-8 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="p-2">
                                                    <Input
                                                        type="number"
                                                        step="0.01"
                                                        min="0"
                                                        placeholder="0.00"
                                                        value={line.credit}
                                                        onChange={(e) => {
                                                            const newLines = [...jeForm.lines]
                                                            newLines[idx].credit = e.target.value
                                                            if (e.target.value) newLines[idx].debit = ""
                                                            setJeForm({ ...jeForm, lines: newLines })
                                                        }}
                                                        className="h-8 text-xs text-right font-mono"
                                                    />
                                                </td>
                                                <td className="p-2 text-center">
                                                    {jeForm.lines.length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const newLines = jeForm.lines.filter((_, i) => i !== idx)
                                                                setJeForm({ ...jeForm, lines: newLines })
                                                            }}
                                                            className="text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-muted/30 border-t font-semibold">
                                        <tr>
                                            <td colSpan={2} className="py-2.5 px-3 text-right">
                                                Totals:
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-emerald-600">
                                                ₹{jeTotalDebit.toFixed(2)}
                                            </td>
                                            <td className="py-2.5 px-3 text-right font-mono text-indigo-600">
                                                ₹{jeTotalCredit.toFixed(2)}
                                            </td>
                                            <td></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            {/* Balance Indicator Status */}
                            <div className="flex items-center justify-between p-2.5 rounded-lg border text-xs">
                                <span className="text-muted-foreground">Verification Check:</span>
                                {isJeBalanced ? (
                                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                        <CheckCircle2 className="h-4 w-4" />
                                        Balanced Entry (₹{jeTotalDebit.toFixed(2)} = ₹{jeTotalCredit.toFixed(2)})
                                    </span>
                                ) : (
                                    <span className="text-destructive font-semibold flex items-center gap-1">
                                        <XCircle className="h-4 w-4" />
                                        Unbalanced: Difference of ₹{jeDifference.toFixed(2)}
                                    </span>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateJournalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={!isJeBalanced || isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isPending ? "Posting..." : "Post Journal Voucher"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 6. MODAL: Inspect Expense Voucher */}
            {selectedExpense && (
                <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                                <span className="font-mono text-indigo-600">
                                    {selectedExpense.expenseNumber}
                                </span>
                                <Badge variant="outline">{selectedExpense.category}</Badge>
                            </DialogTitle>
                            <DialogDescription>{selectedExpense.title}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg border">
                                <div>
                                    <span className="text-muted-foreground block">Voucher Date</span>
                                    <span className="font-medium text-foreground">
                                        {new Date(selectedExpense.expenseDate).toLocaleDateString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Payee / Vendor</span>
                                    <span className="font-medium text-foreground">
                                        {selectedExpense.vendorName || "—"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Expense Account</span>
                                    <span className="font-mono font-medium text-foreground">
                                        {selectedExpense.accountCode} - {selectedExpense.accountName}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Payment Account</span>
                                    <span className="font-medium text-foreground">
                                        {selectedExpense.paymentAccountName || "Cash/Bank"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Method & Ref</span>
                                    <span className="font-medium text-foreground">
                                        {selectedExpense.paymentMethod || "Bank"} (
                                        {selectedExpense.paymentReference || "N/A"})
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block">Reimbursement</span>
                                    <span className="font-medium text-foreground">
                                        {selectedExpense.isReimbursable
                                            ? `Yes (${selectedExpense.employeeName || "Staff"})`
                                            : "No"}
                                    </span>
                                </div>
                            </div>

                            <div className="p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-lg border border-indigo-100 dark:border-indigo-900/30 flex justify-between items-center text-sm">
                                <span className="font-medium text-muted-foreground">Total Voucher Outlay:</span>
                                <span className="font-mono font-bold text-base text-foreground">
                                    {formatINR(selectedExpense.totalAmount)}
                                </span>
                            </div>

                            {selectedExpense.journalEntryNumber && (
                                <div className="p-2.5 rounded bg-muted/40 text-muted-foreground border flex items-center justify-between">
                                    <span>Linked General Ledger Voucher:</span>
                                    <span className="font-mono font-semibold text-indigo-600">
                                        {selectedExpense.journalEntryNumber}
                                    </span>
                                </div>
                            )}

                            {selectedExpense.receiptUrl && (
                                <a
                                    href={selectedExpense.receiptUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="flex items-center gap-1 text-indigo-600 hover:underline pt-1 block"
                                >
                                    <ExternalLink className="h-3.5 w-3.5" />
                                    View Attached Receipt Document
                                </a>
                            )}
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedExpense(null)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* 7. MODAL: Inspect Journal Voucher Lines */}
            {selectedJournal && (
                <Dialog open={!!selectedJournal} onOpenChange={() => setSelectedJournal(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle className="flex items-center justify-between">
                                <span className="font-mono text-indigo-600">
                                    {selectedJournal.entryNumber}
                                </span>
                                <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                                    Balanced Voucher
                                </Badge>
                            </DialogTitle>
                            <DialogDescription>{selectedJournal.narration}</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2 text-xs">
                            <div className="flex items-center justify-between text-muted-foreground">
                                <span>
                                    Date: {new Date(selectedJournal.date).toLocaleDateString()}
                                </span>
                                <span>Source: {selectedJournal.sourceType} {selectedJournal.reference ? `(${selectedJournal.reference})` : ""}</span>
                            </div>

                            <div className="border rounded-lg overflow-hidden">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 border-b text-muted-foreground">
                                        <tr>
                                            <th className="p-2.5">Account</th>
                                            <th className="p-2.5">Line Memo</th>
                                            <th className="p-2.5 text-right">Debit (₹)</th>
                                            <th className="p-2.5 text-right">Credit (₹)</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {selectedJournal.lines.map((l, i) => (
                                            <tr key={i}>
                                                <td className="p-2.5">
                                                    <span className="font-mono font-semibold text-foreground">
                                                        {l.accountCode}
                                                    </span>{" "}
                                                    {l.accountName}
                                                </td>
                                                <td className="p-2.5 text-muted-foreground">
                                                    {l.description || "—"}
                                                </td>
                                                <td className="p-2.5 text-right font-mono text-emerald-600 font-medium">
                                                    {l.debit > 0 ? formatINR(l.debit) : "—"}
                                                </td>
                                                <td className="p-2.5 text-right font-mono text-indigo-600 font-medium">
                                                    {l.credit > 0 ? formatINR(l.credit) : "—"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot className="bg-muted/30 border-t font-semibold">
                                        <tr>
                                            <td colSpan={2} className="p-2.5 text-right">
                                                Sum:
                                            </td>
                                            <td className="p-2.5 text-right font-mono text-emerald-600">
                                                {formatINR(selectedJournal.totalDebit)}
                                            </td>
                                            <td className="p-2.5 text-right font-mono text-indigo-600">
                                                {formatINR(selectedJournal.totalCredit)}
                                            </td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setSelectedJournal(null)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
