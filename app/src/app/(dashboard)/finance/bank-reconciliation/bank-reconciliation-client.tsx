"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    BankReconciliationOverview,
    BankAccountRecord,
    BankStatementRecord,
    BankTransactionRecord,
    CandidateSystemRecord,
    createBankAccount,
    updateBankAccount,
    deleteBankAccount,
    importBankStatement,
    autoMatchTransactions,
    matchTransactionManual,
    unmatchTransaction,
    createQuickExpenseAndReconcile,
    finalizeReconciliation,
} from "@/app/actions/finance/bank-reconciliation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Building2,
    Landmark,
    Scale,
    CheckCircle2,
    AlertTriangle,
    ArrowUpRight,
    ArrowDownLeft,
    RefreshCw,
    Plus,
    FileSpreadsheet,
    Search,
    Filter,
    ShieldCheck,
    Sparkles,
    Trash2,
    Edit3,
    Check,
    X,
    Receipt,
    ExternalLink,
    Clock,
    Lock,
    HelpCircle,
    SlidersHorizontal,
    FileText,
} from "lucide-react"

interface BankReconciliationClientProps {
    initialData: BankReconciliationOverview
}

export default function BankReconciliationClient({ initialData }: BankReconciliationClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // State
    const [data, setData] = useState<BankReconciliationOverview>(initialData)
    const [selectedAccountId, setSelectedAccountId] = useState<string>(
        initialData.selectedAccount?.id || ""
    )
    const [activeTab, setActiveTab] = useState("match-desk")
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<"ALL" | "UNMATCHED" | "MATCHED" | "RECONCILED">("ALL")
    const [typeFilter, setTypeFilter] = useState<"ALL" | "DEPOSIT" | "WITHDRAWAL">("ALL")
    const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Modals
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)
    const [editingAccount, setEditingAccount] = useState<BankAccountRecord | null>(null)
    const [accountForm, setAccountForm] = useState({
        accountName: "",
        accountNumber: "",
        bankName: "",
        branchName: "",
        ifscRoutingCode: "",
        swiftCode: "",
        currencyCode: "INR",
        accountType: "CURRENT" as any,
        chartOfAccountId: "",
        openingBalance: 0,
        currentBalance: 0,
        isPrimary: false,
        notes: "",
    })

    const [isImportModalOpen, setIsImportModalOpen] = useState(false)
    const [importForm, setImportForm] = useState({
        statementNumber: "",
        startDate: new Date().toISOString().split("T")[0],
        endDate: new Date().toISOString().split("T")[0],
        openingBalance: data.kpis.statementBalance || 0,
        closingBalance: data.kpis.statementBalance || 0,
        notes: "",
        csvText: "",
    })

    const [isMatchModalOpen, setIsMatchModalOpen] = useState(false)
    const [matchingTxn, setMatchingTxn] = useState<BankTransactionRecord | null>(null)
    const [candidateSearch, setCandidateSearch] = useState("")

    const [isQuickExpenseModalOpen, setIsQuickExpenseModalOpen] = useState(false)
    const [quickExpenseTxn, setQuickExpenseTxn] = useState<BankTransactionRecord | null>(null)
    const [quickExpenseForm, setQuickExpenseForm] = useState({
        title: "",
        category: "Bank Charges & Commission",
        accountId: "",
        amount: 0,
        notes: "",
    })

    const activeAccount = data.bankAccounts.find((a) => a.id === selectedAccountId) || data.selectedAccount

    // Helper: format currency
    const formatCurrency = (val: number, currency: string = "INR") => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency || "INR",
            maximumFractionDigits: 2,
        }).format(val || 0)
    }

    // Helper: format date
    const formatDate = (val: string) => {
        try {
            return new Date(val).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
            })
        } catch {
            return val
        }
    }

    // Switch Account
    const handleAccountChange = (accountId: string) => {
        setSelectedAccountId(accountId)
        router.push(`/finance/bank-reconciliation?accountId=${accountId}`)
    }

    // Auto-Match Action
    const handleAutoMatch = () => {
        if (!activeAccount) return
        startTransition(async () => {
            const res = await autoMatchTransactions(activeAccount.id)
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({
                    type: "success",
                    text: `Auto-match rule engine completed! Matched ${res.matchedCount || 0} transaction(s).`,
                })
                router.refresh()
            }
        })
    }

    // Unmatch Action
    const handleUnmatch = (txnId: string) => {
        startTransition(async () => {
            const res = await unmatchTransaction(txnId)
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({ type: "success", text: "Transaction match unlinked successfully." })
                router.refresh()
            }
        })
    }

    // Manual Match Action
    const handleConfirmManualMatch = (candidate: CandidateSystemRecord) => {
        if (!matchingTxn) return
        startTransition(async () => {
            const res = await matchTransactionManual(matchingTxn.id, candidate.source, candidate.id)
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({
                    type: "success",
                    text: `Successfully matched bank line with ${candidate.source} (${candidate.numberOrRef}).`,
                })
                setIsMatchModalOpen(false)
                setMatchingTxn(null)
                router.refresh()
            }
        })
    }

    // Quick Expense Action
    const handleQuickExpenseSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!quickExpenseTxn) return
        startTransition(async () => {
            const res = await createQuickExpenseAndReconcile(quickExpenseTxn.id, {
                title: quickExpenseForm.title,
                category: quickExpenseForm.category,
                accountId: quickExpenseForm.accountId,
                amount: quickExpenseForm.amount,
                notes: quickExpenseForm.notes,
            })
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({
                    type: "success",
                    text: "Operational expense recorded with balanced Journal Entry and bank line reconciled!",
                })
                setIsQuickExpenseModalOpen(false)
                setQuickExpenseTxn(null)
                router.refresh()
            }
        })
    }

    // Finalize Statement Action
    const handleFinalizeStatement = () => {
        if (!data.activeStatement) return
        if (!confirm(`Finalize and lock statement "${data.activeStatement.statementNumber}"? This will mark all matched transactions as audited & reconciled.`)) {
            return
        }
        startTransition(async () => {
            const res = await finalizeReconciliation(data.activeStatement!.id)
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({
                    type: "success",
                    text: `Statement ${data.activeStatement!.statementNumber} locked and officially reconciled!`,
                })
                router.refresh()
            }
        })
    }

    // Save Bank Account
    const handleAccountSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            if (editingAccount) {
                const res = await updateBankAccount(editingAccount.id, accountForm)
                if (res.error) {
                    setActionMessage({ type: "error", text: res.error })
                } else {
                    setActionMessage({ type: "success", text: "Bank account updated successfully." })
                    setIsAccountModalOpen(false)
                    router.refresh()
                }
            } else {
                const res = await createBankAccount(accountForm)
                if (res.error) {
                    setActionMessage({ type: "error", text: res.error })
                } else {
                    setActionMessage({ type: "success", text: "New bank account added successfully." })
                    setIsAccountModalOpen(false)
                    router.refresh()
                }
            }
        })
    }

    // Delete Bank Account
    const handleDeleteAccount = (acc: BankAccountRecord) => {
        if (!confirm(`Are you sure you want to delete bank account "${acc.accountName}"?`)) return
        startTransition(async () => {
            const res = await deleteBankAccount(acc.id)
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({ type: "success", text: "Bank account deleted." })
                router.refresh()
            }
        })
    }

    // Submit Statement Import
    const handleImportSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!activeAccount) return

        // Parse CSV or build manual lines
        let parsedLines: any[] = []
        if (importForm.csvText.trim()) {
            const rows = importForm.csvText.trim().split("\n")
            for (let i = 0; i < rows.length; i++) {
                const row = rows[i].trim()
                if (!row) continue
                const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""))
                // Skip header row if starts with date or transaction
                if (cols[0].toLowerCase().includes("date")) continue
                if (cols.length >= 3) {
                    const date = cols[0]
                    const typeRaw = cols[1].toUpperCase()
                    const type = typeRaw.includes("DEP") || typeRaw.includes("CR") ? "DEPOSIT" : "WITHDRAWAL"
                    const amount = parseFloat(cols[2]) || 0
                    const payee = cols[3] || ""
                    const description = cols[4] || payee || `Imported ${type}`
                    const reference = cols[5] || ""
                    const balance = cols[6] ? parseFloat(cols[6]) : undefined

                    if (amount > 0) {
                        parsedLines.push({ date, type, amount, payee, description, reference, balance })
                    }
                }
            }
        }

        if (parsedLines.length === 0) {
            setActionMessage({
                type: "error",
                text: "No valid transaction rows found in CSV. Format: Date, Type (DEPOSIT/WITHDRAWAL), Amount, Payee, Description, Reference",
            })
            return
        }

        startTransition(async () => {
            const res = await importBankStatement({
                bankAccountId: activeAccount.id,
                statementNumber: importForm.statementNumber,
                startDate: importForm.startDate,
                endDate: importForm.endDate,
                openingBalance: importForm.openingBalance,
                closingBalance: importForm.closingBalance,
                notes: importForm.notes,
                lines: parsedLines,
            })
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({
                    type: "success",
                    text: `Statement imported successfully with ${parsedLines.length} transaction(s)!`,
                })
                setIsImportModalOpen(false)
                router.refresh()
            }
        })
    }

    // Filter transactions
    const filteredTransactions = data.transactions.filter((t) => {
        if (statusFilter !== "ALL" && t.status !== statusFilter) return false
        if (typeFilter !== "ALL" && t.type !== typeFilter) return false
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            const matchDesc = t.description.toLowerCase().includes(q)
            const matchPayee = t.payee?.toLowerCase().includes(q)
            const matchRef = t.reference?.toLowerCase().includes(q)
            const matchAmt = t.amount.toString().includes(q)
            if (!matchDesc && !matchPayee && !matchRef && !matchAmt) return false
        }
        return true
    })

    // Filter candidates for match modal
    const filteredCandidates = data.candidateRecords.filter((c) => {
        if (matchingTxn) {
            // Deposits match INBOUND payments; Withdrawals match OUTBOUND payments or expenses
            if (matchingTxn.type === "DEPOSIT" && c.type !== "INBOUND") return false
            if (matchingTxn.type === "WITHDRAWAL" && c.type !== "OUTBOUND") return false
        }
        if (candidateSearch.trim()) {
            const q = candidateSearch.toLowerCase()
            const matchRef = c.numberOrRef.toLowerCase().includes(q)
            const matchParty = c.titleOrParty.toLowerCase().includes(q)
            const matchAmt = c.amount.toString().includes(q)
            if (!matchRef && !matchParty && !matchAmt) return false
        }
        return true
    })

    return (
        <div className="space-y-6">
            {/* Action Feedback Banner */}
            {actionMessage && (
                <div
                    className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all duration-200 ${
                        actionMessage.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-destructive/10 border-destructive/30 text-destructive"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {actionMessage.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <span>{actionMessage.text}</span>
                    </div>
                    <button
                        onClick={() => setActionMessage(null)}
                        className="text-xs opacity-70 hover:opacity-100 underline ml-4"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Header with Account Selector & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Scale className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Bank Reconciliation
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Match bank statement transactions against ERP payments, expenses, and ledger entries.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right controls: Account Switcher & Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Account Selector Dropdown */}
                    <div className="flex items-center gap-2 bg-card border border-border/60 rounded-lg px-3 py-1.5 shadow-sm">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <select
                            value={selectedAccountId}
                            onChange={(e) => handleAccountChange(e.target.value)}
                            className="bg-transparent text-sm font-medium text-foreground focus:outline-none cursor-pointer"
                        >
                            {data.bankAccounts.map((acc) => (
                                <option key={acc.id} value={acc.id} className="bg-popover text-foreground">
                                    {acc.bankName} — {acc.accountNumber} ({acc.accountName})
                                </option>
                            ))}
                        </select>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setImportForm({
                                statementNumber: `STMT-${new Date().getFullYear()}-${String(
                                    new Date().getMonth() + 1
                                ).padStart(2, "0")}-${activeAccount?.bankName?.substring(0, 4).toUpperCase() || "BANK"}`,
                                startDate: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
                                    .toISOString()
                                    .split("T")[0],
                                endDate: new Date().toISOString().split("T")[0],
                                openingBalance: activeAccount?.openingBalance || 0,
                                closingBalance: activeAccount?.currentBalance || 0,
                                notes: "",
                                csvText: "",
                            })
                            setIsImportModalOpen(true)
                        }}
                        className="gap-1.5 shadow-sm"
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Import Statement
                    </Button>

                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleAutoMatch}
                        disabled={isPending}
                        className="gap-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-sm"
                    >
                        <Sparkles className="h-4 w-4" />
                        Run Auto-Match
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setEditingAccount(null)
                            setAccountForm({
                                accountName: "",
                                accountNumber: "",
                                bankName: "",
                                branchName: "",
                                ifscRoutingCode: "",
                                swiftCode: "",
                                currencyCode: "INR",
                                accountType: "CURRENT",
                                chartOfAccountId: data.chartOfAccounts[0]?.id || "",
                                openingBalance: 0,
                                currentBalance: 0,
                                isPrimary: data.bankAccounts.length === 0,
                                notes: "",
                            })
                            setIsAccountModalOpen(true)
                        }}
                        className="gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Add Bank Account
                    </Button>
                </div>
            </div>

            {/* 4 KPI Telemetry Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 1. Statement Closing Balance */}
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Statement Balance
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <Landmark className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                            {formatCurrency(data.kpis.statementBalance, activeAccount?.currencyCode)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {data.activeStatement
                                ? `Batch: ${data.activeStatement.statementNumber}`
                                : "Latest Bank Balance"}
                        </p>
                    </CardContent>
                </Card>

                {/* 2. ERP Book Balance (Chart of Accounts / General Ledger) */}
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            ERP Book Balance
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                            <FileText className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                            {formatCurrency(data.kpis.bookBalance, activeAccount?.currencyCode)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            CoA:{" "}
                            {activeAccount?.chartOfAccount
                                ? `${activeAccount.chartOfAccount.code} — ${activeAccount.chartOfAccount.name}`
                                : "Direct System Ledger"}
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Cleared & Reconciled Amount */}
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Cleared Balance
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight text-emerald-400">
                            {formatCurrency(data.kpis.clearedBalance, activeAccount?.currencyCode)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.matchedTransactions.length} of {data.transactions.length} lines cleared
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Discrepancy / Variance Indicator */}
                <Card
                    className={`border shadow-sm relative overflow-hidden ${
                        data.kpis.isBalanced
                            ? "border-emerald-500/30 bg-emerald-500/5"
                            : "border-amber-500/30 bg-amber-500/5"
                    }`}
                >
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Reconciliation Variance
                        </CardTitle>
                        <div
                            className={`p-2 rounded-lg ${
                                data.kpis.isBalanced
                                    ? "bg-emerald-500/20 text-emerald-400"
                                    : "bg-amber-500/20 text-amber-400"
                            }`}
                        >
                            {data.kpis.isBalanced ? (
                                <CheckCircle2 className="h-4 w-4" />
                            ) : (
                                <AlertTriangle className="h-4 w-4" />
                            )}
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div
                            className={`text-2xl font-bold tracking-tight ${
                                data.kpis.isBalanced ? "text-emerald-400" : "text-amber-400"
                            }`}
                        >
                            {data.kpis.isBalanced
                                ? "₹0.00 (Balanced)"
                                : formatCurrency(Math.abs(data.kpis.difference), activeAccount?.currencyCode)}
                        </div>
                        <div className="flex items-center justify-between mt-1">
                            <p className="text-xs text-muted-foreground">
                                {data.kpis.isBalanced
                                    ? "Audited & ready to finalize"
                                    : `${data.kpis.unmatchedCount} unmatched line(s)`}
                            </p>
                            {data.kpis.isBalanced && data.activeStatement?.status === "IN_PROGRESS" && (
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={handleFinalizeStatement}
                                    className="h-6 px-2 text-xs border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10"
                                >
                                    <Lock className="h-3 w-3 mr-1" />
                                    Finalize
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/60 p-1 border border-border/50">
                    <TabsTrigger value="match-desk" className="gap-2">
                        <Scale className="h-4 w-4" />
                        Reconciliation Match Desk
                        {data.kpis.unmatchedCount > 0 && (
                            <Badge
                                variant="secondary"
                                className="ml-1 px-1.5 py-0 text-[10px] bg-amber-500/20 text-amber-300 font-semibold"
                            >
                                {data.kpis.unmatchedCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="accounts" className="gap-2">
                        <Building2 className="h-4 w-4" />
                        Bank Accounts Directory
                    </TabsTrigger>
                    <TabsTrigger value="statements" className="gap-2">
                        <FileSpreadsheet className="h-4 w-4" />
                        Statement Batches & Periods
                    </TabsTrigger>
                    <TabsTrigger value="diagnostics" className="gap-2">
                        <HelpCircle className="h-4 w-4" />
                        Discrepancy & In-Transit Diagnostics
                    </TabsTrigger>
                </TabsList>

                {/* ========================================================= */}
                {/* TAB 1: RECONCILIATION MATCH DESK (SPLIT-SCREEN) */}
                {/* ========================================================= */}
                <TabsContent value="match-desk" className="space-y-4">
                    {/* Filters & Search Toolbar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border/60 shadow-sm">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search narration, ref, payee, amount..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
                            {/* Status Filter */}
                            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/50">
                                {(["ALL", "UNMATCHED", "MATCHED"] as const).map((st) => (
                                    <button
                                        key={st}
                                        onClick={() => setStatusFilter(st)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            statusFilter === st
                                                ? "bg-primary text-primary-foreground shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {st === "ALL" ? "All Lines" : st === "UNMATCHED" ? "Unmatched" : "Matched"}
                                    </button>
                                ))}
                            </div>

                            {/* Type Filter */}
                            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/50">
                                {(["ALL", "DEPOSIT", "WITHDRAWAL"] as const).map((t) => (
                                    <button
                                        key={t}
                                        onClick={() => setTypeFilter(t)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            typeFilter === t
                                                ? "bg-primary text-primary-foreground shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {t === "ALL" ? "All Types" : t === "DEPOSIT" ? "Deposits (+)" : "Withdrawals (-)"}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Split View: Bank Statement Lines on Left & ERP Candidate Pool on Right */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* LEFT: Bank Statement Lines (7 cols) */}
                        <div className="lg:col-span-7 space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <Landmark className="h-4 w-4 text-emerald-400" />
                                    Bank Statement Transactions ({filteredTransactions.length})
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    Showing imported bank lines
                                </span>
                            </div>

                            {filteredTransactions.length === 0 ? (
                                <Card className="p-8 text-center border-dashed border-border/60">
                                    <CheckCircle2 className="h-8 w-8 mx-auto text-muted-foreground/50 mb-2" />
                                    <p className="text-sm font-medium text-foreground">No bank transactions found</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Import a statement or adjust your search filters.
                                    </p>
                                </Card>
                            ) : (
                                <div className="space-y-2.5">
                                    {filteredTransactions.map((txn) => {
                                        const isDeposit = txn.type === "DEPOSIT"
                                        const isMatched = txn.status === "MATCHED" || txn.status === "RECONCILED"

                                        return (
                                            <div
                                                key={txn.id}
                                                className={`p-4 rounded-xl border transition-all duration-150 ${
                                                    isMatched
                                                        ? "bg-emerald-500/5 border-emerald-500/30"
                                                        : "bg-card border-border/70 hover:border-border"
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="flex items-start gap-3">
                                                        <div
                                                            className={`p-2 rounded-lg mt-0.5 ${
                                                                isDeposit
                                                                    ? "bg-emerald-500/10 text-emerald-400"
                                                                    : "bg-rose-500/10 text-rose-400"
                                                            }`}
                                                        >
                                                            {isDeposit ? (
                                                                <ArrowDownLeft className="h-4 w-4" />
                                                            ) : (
                                                                <ArrowUpRight className="h-4 w-4" />
                                                            )}
                                                        </div>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                <span className="font-semibold text-sm text-foreground">
                                                                    {txn.payee || "Bank Transaction"}
                                                                </span>
                                                                <Badge
                                                                    variant="outline"
                                                                    className={`text-[10px] px-1.5 py-0 ${
                                                                        isDeposit
                                                                            ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/5"
                                                                            : "border-rose-500/30 text-rose-400 bg-rose-500/5"
                                                                    }`}
                                                                >
                                                                    {isDeposit ? "Deposit" : "Withdrawal"}
                                                                </Badge>
                                                                {isMatched ? (
                                                                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-[10px] px-1.5 py-0 flex items-center gap-1">
                                                                        <Check className="h-2.5 w-2.5" />
                                                                        {txn.status}
                                                                        {txn.matchConfidence && ` (${txn.matchConfidence})`}
                                                                    </Badge>
                                                                ) : (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="bg-amber-500/10 text-amber-300 border-amber-500/30 text-[10px] px-1.5 py-0"
                                                                    >
                                                                        Unmatched
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <p className="text-xs text-muted-foreground leading-relaxed">
                                                                {txn.description}
                                                            </p>
                                                            <div className="flex items-center gap-3 text-[11px] text-muted-foreground/80">
                                                                <span>Date: {formatDate(txn.transactionDate)}</span>
                                                                {txn.reference && (
                                                                    <span>Ref: <code className="text-foreground">{txn.reference}</code></span>
                                                                )}
                                                                {txn.balance !== null && txn.balance !== undefined && (
                                                                    <span>Running: {formatCurrency(txn.balance, activeAccount?.currencyCode)}</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Amount & Action Buttons */}
                                                    <div className="text-right space-y-2 shrink-0">
                                                        <div
                                                            className={`font-bold text-base ${
                                                                isDeposit ? "text-emerald-400" : "text-rose-400"
                                                            }`}
                                                        >
                                                            {isDeposit ? "+" : "-"}
                                                            {formatCurrency(txn.amount, activeAccount?.currencyCode)}
                                                        </div>

                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {!isMatched ? (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setMatchingTxn(txn)
                                                                            setCandidateSearch(txn.reference || "")
                                                                            setIsMatchModalOpen(true)
                                                                        }}
                                                                        className="h-7 text-xs px-2 gap-1 border-primary/40 hover:bg-primary/10"
                                                                    >
                                                                        <Check className="h-3 w-3" />
                                                                        Match
                                                                    </Button>
                                                                    {!isDeposit && (
                                                                        <Button
                                                                            size="sm"
                                                                            variant="ghost"
                                                                            onClick={() => {
                                                                                setQuickExpenseTxn(txn)
                                                                                setQuickExpenseForm({
                                                                                    title: txn.description,
                                                                                    category: txn.description.toLowerCase().includes("charge") || txn.description.toLowerCase().includes("fee")
                                                                                        ? "Bank Charges & Commission"
                                                                                        : "Office Supplies",
                                                                                    accountId: data.chartOfAccounts[0]?.id || "",
                                                                                    amount: txn.amount,
                                                                                    notes: `Auto-reconciled from bank ref ${txn.reference || txn.id}`,
                                                                                })
                                                                                setIsQuickExpenseModalOpen(true)
                                                                            }}
                                                                            className="h-7 text-xs px-2 text-muted-foreground hover:text-foreground"
                                                                        >
                                                                            <Receipt className="h-3 w-3 mr-1" />
                                                                            Quick Expense
                                                                        </Button>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div className="flex items-center gap-1.5">
                                                                    <span className="text-[11px] text-muted-foreground font-medium">
                                                                        {txn.payment && `Pmt: ${txn.payment.reference || txn.payment.id.substring(0, 6)}`}
                                                                        {txn.expense && `Exp: ${txn.expense.expenseNumber}`}
                                                                    </span>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleUnmatch(txn.id)}
                                                                        disabled={isPending}
                                                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                                        title="Unlink match"
                                                                    >
                                                                        <X className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </div>

                        {/* RIGHT: Candidate ERP System Records (5 cols) */}
                        <div className="lg:col-span-5 space-y-3">
                            <div className="flex items-center justify-between px-1">
                                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                                    <FileText className="h-4 w-4 text-purple-400" />
                                    ERP System Candidate Ledger
                                </h3>
                                <span className="text-xs text-muted-foreground">
                                    Payments & Expenses in ERP
                                </span>
                            </div>

                            <Card className="border-border/60 shadow-sm p-4 space-y-3">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Active payments and expenses registered in the system available for reconciliation against your bank feed:
                                </p>

                                <div className="space-y-2 max-h-[560px] overflow-y-auto pr-1">
                                    {data.candidateRecords.map((c) => (
                                        <div
                                            key={`${c.source}-${c.id}`}
                                            className={`p-3 rounded-lg border text-xs transition-colors ${
                                                c.matchedTransactionId
                                                    ? "bg-muted/30 border-border/40 opacity-70"
                                                    : "bg-card border-border/70 hover:border-primary/50"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[9px] px-1 py-0 ${
                                                                c.source === "PAYMENT"
                                                                    ? "border-blue-500/30 text-blue-400"
                                                                    : "border-purple-500/30 text-purple-400"
                                                            }`}
                                                        >
                                                            {c.source}
                                                        </Badge>
                                                        <span className="font-semibold text-foreground">
                                                            {c.numberOrRef}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground mt-0.5 truncate max-w-[200px]">
                                                        {c.titleOrParty}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                                                        Date: {formatDate(c.date)}
                                                    </p>
                                                </div>

                                                <div className="text-right">
                                                    <span className="font-bold text-foreground block">
                                                        {formatCurrency(c.amount, activeAccount?.currencyCode)}
                                                    </span>
                                                    {c.matchedTransactionId ? (
                                                        <Badge
                                                            variant="secondary"
                                                            className="text-[9px] px-1 py-0 bg-emerald-500/10 text-emerald-400 mt-1"
                                                        >
                                                            Matched
                                                        </Badge>
                                                    ) : (
                                                        <Badge
                                                            variant="outline"
                                                            className="text-[9px] px-1 py-0 text-muted-foreground mt-1"
                                                        >
                                                            Open
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* ========================================================= */}
                {/* TAB 2: BANK ACCOUNTS DIRECTORY */}
                {/* ========================================================= */}
                <TabsContent value="accounts" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-foreground">
                                Corporate Bank Accounts ({data.bankAccounts.length})
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Manage registered institutional checking, current, and currency escrow accounts.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => {
                                setEditingAccount(null)
                                setAccountForm({
                                    accountName: "",
                                    accountNumber: "",
                                    bankName: "",
                                    branchName: "",
                                    ifscRoutingCode: "",
                                    swiftCode: "",
                                    currencyCode: "INR",
                                    accountType: "CURRENT",
                                    chartOfAccountId: data.chartOfAccounts[0]?.id || "",
                                    openingBalance: 0,
                                    currentBalance: 0,
                                    isPrimary: false,
                                    notes: "",
                                })
                                setIsAccountModalOpen(true)
                            }}
                            className="gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            Add Account
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {data.bankAccounts.map((acc) => (
                            <Card key={acc.id} className="border-border/60 shadow-sm relative overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                                <Building2 className="h-5 w-5" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <CardTitle className="text-base font-bold">
                                                        {acc.bankName}
                                                    </CardTitle>
                                                    {acc.isPrimary && (
                                                        <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[10px]">
                                                            Primary
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {acc.accountType}
                                                    </Badge>
                                                </div>
                                                <CardDescription className="text-xs">
                                                    {acc.accountName}
                                                </CardDescription>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-1">
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                                onClick={() => {
                                                    setEditingAccount(acc)
                                                    setAccountForm({
                                                        accountName: acc.accountName,
                                                        accountNumber: acc.accountNumber,
                                                        bankName: acc.bankName,
                                                        branchName: acc.branchName || "",
                                                        ifscRoutingCode: acc.ifscRoutingCode || "",
                                                        swiftCode: acc.swiftCode || "",
                                                        currencyCode: acc.currencyCode,
                                                        accountType: acc.accountType,
                                                        chartOfAccountId: acc.chartOfAccountId || "",
                                                        openingBalance: acc.openingBalance,
                                                        currentBalance: acc.currentBalance,
                                                        isPrimary: acc.isPrimary,
                                                        notes: acc.notes || "",
                                                    })
                                                    setIsAccountModalOpen(true)
                                                }}
                                            >
                                                <Edit3 className="h-4 w-4" />
                                            </Button>
                                            {!acc.isPrimary && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => handleDeleteAccount(acc)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-3 pt-0">
                                    <div className="p-3 rounded-lg bg-muted/40 grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Account Number</span>
                                            <code className="font-semibold text-foreground tracking-wide">
                                                {acc.accountNumber}
                                            </code>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">IFSC / Routing</span>
                                            <span className="font-medium text-foreground">
                                                {acc.ifscRoutingCode || "N/A"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">Branch</span>
                                            <span className="text-muted-foreground truncate block">
                                                {acc.branchName || "Main"}
                                            </span>
                                        </div>
                                        <div>
                                            <span className="text-muted-foreground block text-[11px]">General Ledger Map</span>
                                            <span className="text-emerald-400 font-medium">
                                                {acc.chartOfAccount
                                                    ? `${acc.chartOfAccount.code} — ${acc.chartOfAccount.name}`
                                                    : "Unlinked"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                                        <div>
                                            <span className="text-muted-foreground block text-[10px]">Book Balance</span>
                                            <span className="font-bold text-foreground text-sm">
                                                {formatCurrency(acc.currentBalance, acc.currencyCode)}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-muted-foreground block text-[10px]">Unreconciled Lines</span>
                                            <span className="font-semibold text-amber-400">
                                                {acc.unreconciledCount || 0} pending
                                            </span>
                                        </div>
                                    </div>

                                    {selectedAccountId !== acc.id && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="w-full text-xs h-8 mt-2"
                                            onClick={() => handleAccountChange(acc.id)}
                                        >
                                            Select for Reconciliation
                                        </Button>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ========================================================= */}
                {/* TAB 3: STATEMENT BATCHES & PERIODS */}
                {/* ========================================================= */}
                <TabsContent value="statements" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-foreground">
                                Statement Batches & Fiscal Close Log
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Historical records of imported bank statements and locked reconciliation periods.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setIsImportModalOpen(true)}
                            className="gap-1.5"
                        >
                            <Plus className="h-4 w-4" />
                            Import New Statement
                        </Button>
                    </div>

                    <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 border-b border-border/50 text-muted-foreground font-medium uppercase tracking-wider text-[11px]">
                                <tr>
                                    <th className="p-3.5 pl-4">Statement #</th>
                                    <th className="p-3.5">Period Dates</th>
                                    <th className="p-3.5">Opening Balance</th>
                                    <th className="p-3.5">Closing Balance</th>
                                    <th className="p-3.5">Reconciled Progress</th>
                                    <th className="p-3.5">Status</th>
                                    <th className="p-3.5 text-right pr-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {data.statements.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                                            No bank statements recorded for this account.
                                        </td>
                                    </tr>
                                ) : (
                                    data.statements.map((stmt) => {
                                        const progressPercent =
                                            stmt.transactionCount && stmt.transactionCount > 0
                                                ? Math.round(((stmt.matchedCount || 0) / stmt.transactionCount) * 100)
                                                : 0

                                        return (
                                            <tr key={stmt.id} className="hover:bg-muted/30 transition-colors">
                                                <td className="p-3.5 pl-4 font-semibold text-foreground">
                                                    {stmt.statementNumber}
                                                </td>
                                                <td className="p-3.5 text-muted-foreground">
                                                    {formatDate(stmt.startDate)} — {formatDate(stmt.endDate)}
                                                </td>
                                                <td className="p-3.5 text-foreground">
                                                    {formatCurrency(stmt.openingBalance, activeAccount?.currencyCode)}
                                                </td>
                                                <td className="p-3.5 font-semibold text-foreground">
                                                    {formatCurrency(stmt.closingBalance, activeAccount?.currencyCode)}
                                                </td>
                                                <td className="p-3.5 min-w-[140px]">
                                                    <div className="flex items-center gap-2">
                                                        <Progress value={progressPercent} className="h-1.5 flex-1" />
                                                        <span className="text-[10px] text-muted-foreground font-medium">
                                                            {progressPercent}%
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-3.5">
                                                    <Badge
                                                        className={`text-[10px] ${
                                                            stmt.status === "RECONCILED"
                                                                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                                : "bg-blue-500/20 text-blue-400 border-blue-500/30"
                                                        }`}
                                                    >
                                                        {stmt.status}
                                                    </Badge>
                                                </td>
                                                <td className="p-3.5 text-right pr-4">
                                                    {stmt.status === "IN_PROGRESS" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs px-2.5"
                                                            onClick={handleFinalizeStatement}
                                                        >
                                                            <Lock className="h-3 w-3 mr-1" />
                                                            Finalize
                                                        </Button>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* ========================================================= */}
                {/* TAB 4: DISCREPANCY & IN-TRANSIT DIAGNOSTICS */}
                {/* ========================================================= */}
                <TabsContent value="diagnostics" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Formal Bank Reconciliation Statement */}
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Scale className="h-4 w-4 text-primary" />
                                    Reconciliation Summary Statement
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Mathematical proof reconciling bank balance with general ledger book balance.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                <div className="space-y-2 divide-y divide-border/40">
                                    <div className="flex items-center justify-between py-1.5 font-semibold text-foreground">
                                        <span>Statement Ending Balance (Bank)</span>
                                        <span>{formatCurrency(data.kpis.statementBalance, activeAccount?.currencyCode)}</span>
                                    </div>

                                    <div className="flex items-center justify-between py-1.5 text-emerald-400">
                                        <span>Plus: Deposits in Transit (Uncleared Receipts)</span>
                                        <span>
                                            + {formatCurrency(
                                                data.unmatchedTransactions
                                                    .filter((t) => t.type === "DEPOSIT")
                                                    .reduce((s, t) => s + t.amount, 0),
                                                activeAccount?.currencyCode
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between py-1.5 text-rose-400">
                                        <span>Less: Outstanding Checks & Outgoing Debits</span>
                                        <span>
                                            - {formatCurrency(
                                                data.unmatchedTransactions
                                                    .filter((t) => t.type === "WITHDRAWAL")
                                                    .reduce((s, t) => s + t.amount, 0),
                                                activeAccount?.currencyCode
                                            )}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between py-2 font-bold text-sm text-foreground bg-muted/40 px-2 rounded-md">
                                        <span>Adjusted Reconciled Balance</span>
                                        <span className="text-emerald-400">
                                            {formatCurrency(data.kpis.clearedBalance, activeAccount?.currencyCode)}
                                        </span>
                                    </div>

                                    <div className="flex items-center justify-between py-1.5 text-muted-foreground">
                                        <span>Current ERP Ledger Book Balance</span>
                                        <span>{formatCurrency(data.kpis.bookBalance, activeAccount?.currencyCode)}</span>
                                    </div>

                                    <div className="flex items-center justify-between py-2 font-bold text-xs">
                                        <span>Audit Variance ($\Delta$)</span>
                                        <span
                                            className={
                                                data.kpis.isBalanced ? "text-emerald-400" : "text-amber-400"
                                            }
                                        >
                                            {formatCurrency(data.kpis.difference, activeAccount?.currencyCode)}
                                        </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Unrecorded Bank Items / Action Checklist */}
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <HelpCircle className="h-4 w-4 text-amber-400" />
                                    Unrecorded Bank Items (Immediate Attention)
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Bank-initiated fees, direct debits, or interest credits not yet recorded in ERP books.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                {data.unmatchedTransactions.length === 0 ? (
                                    <div className="p-6 text-center text-muted-foreground">
                                        <CheckCircle2 className="h-6 w-6 mx-auto text-emerald-400 mb-2" />
                                        <p className="font-medium text-foreground">Zero unreconciled items!</p>
                                        <p className="text-[11px] mt-1">
                                            All bank line items have been paired with ERP records.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-2">
                                        {data.unmatchedTransactions.map((t) => (
                                            <div
                                                key={t.id}
                                                className="p-3 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-between gap-3"
                                            >
                                                <div>
                                                    <span className="font-semibold text-foreground block">
                                                        {t.description}
                                                    </span>
                                                    <span className="text-[11px] text-muted-foreground">
                                                        {formatDate(t.transactionDate)} • Ref: {t.reference || "None"}
                                                    </span>
                                                </div>
                                                <div className="text-right shrink-0">
                                                    <span
                                                        className={`font-bold block ${
                                                            t.type === "DEPOSIT" ? "text-emerald-400" : "text-rose-400"
                                                        }`}
                                                    >
                                                        {t.type === "DEPOSIT" ? "+" : "-"}
                                                        {formatCurrency(t.amount, activeAccount?.currencyCode)}
                                                    </span>
                                                    {t.type === "WITHDRAWAL" && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-6 text-[10px] px-2 mt-1"
                                                            onClick={() => {
                                                                setQuickExpenseTxn(t)
                                                                setQuickExpenseForm({
                                                                    title: t.description,
                                                                    category: "Bank Charges & Commission",
                                                                    accountId: data.chartOfAccounts[0]?.id || "",
                                                                    amount: t.amount,
                                                                    notes: `Recorded during reconciliation for ref ${t.reference || t.id}`,
                                                                })
                                                                setIsQuickExpenseModalOpen(true)
                                                            }}
                                                        >
                                                            Book Expense
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ========================================================= */}
            {/* MODAL 1: ADD / EDIT BANK ACCOUNT */}
            {/* ========================================================= */}
            <Dialog open={isAccountModalOpen} onOpenChange={setIsAccountModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>
                            {editingAccount ? "Edit Bank Account" : "Add Corporate Bank Account"}
                        </DialogTitle>
                        <DialogDescription>
                            Configure institutional bank account details, routing codes, and general ledger mapping.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAccountSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Bank Name *</label>
                                <Input
                                    required
                                    placeholder="e.g. HDFC Bank, ICICI Bank, Chase"
                                    value={accountForm.bankName}
                                    onChange={(e) => setAccountForm({ ...accountForm, bankName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Account Name *</label>
                                <Input
                                    required
                                    placeholder="e.g. Primary Corporate Operating Account"
                                    value={accountForm.accountName}
                                    onChange={(e) => setAccountForm({ ...accountForm, accountName: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Account Number *</label>
                                <Input
                                    required
                                    placeholder="e.g. 50200098765432"
                                    value={accountForm.accountNumber}
                                    onChange={(e) => setAccountForm({ ...accountForm, accountNumber: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Account Type</label>
                                <select
                                    value={accountForm.accountType}
                                    onChange={(e) => setAccountForm({ ...accountForm, accountType: e.target.value as any })}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                                >
                                    <option value="CURRENT">Current Account</option>
                                    <option value="SAVINGS">Savings Account</option>
                                    <option value="CHECKING">Checking Account</option>
                                    <option value="OVERDRAFT">Overdraft (OD)</option>
                                    <option value="CREDIT_CARD">Corporate Credit Card</option>
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">IFSC / Routing Code</label>
                                <Input
                                    placeholder="e.g. HDFC0000240"
                                    value={accountForm.ifscRoutingCode}
                                    onChange={(e) => setAccountForm({ ...accountForm, ifscRoutingCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">SWIFT / BIC Code</label>
                                <Input
                                    placeholder="e.g. HDFCINBBXXX"
                                    value={accountForm.swiftCode}
                                    onChange={(e) => setAccountForm({ ...accountForm, swiftCode: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Currency Code</label>
                                <Input
                                    value={accountForm.currencyCode}
                                    onChange={(e) => setAccountForm({ ...accountForm, currencyCode: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Branch Name</label>
                                <Input
                                    placeholder="e.g. Indiranagar, Bengaluru"
                                    value={accountForm.branchName}
                                    onChange={(e) => setAccountForm({ ...accountForm, branchName: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Chart of Accounts Mapping</label>
                                <select
                                    value={accountForm.chartOfAccountId}
                                    onChange={(e) => setAccountForm({ ...accountForm, chartOfAccountId: e.target.value })}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                                >
                                    <option value="">-- Select Asset Account --</option>
                                    {data.chartOfAccounts.map((coa) => (
                                        <option key={coa.id} value={coa.id}>
                                            {coa.code} — {coa.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Opening Balance</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={accountForm.openingBalance}
                                    onChange={(e) =>
                                        setAccountForm({
                                            ...accountForm,
                                            openingBalance: parseFloat(e.target.value) || 0,
                                        })
                                    }
                                />
                            </div>
                            <div className="flex items-center gap-2 pt-6">
                                <input
                                    type="checkbox"
                                    id="isPrimaryAcc"
                                    checked={accountForm.isPrimary}
                                    onChange={(e) => setAccountForm({ ...accountForm, isPrimary: e.target.checked })}
                                    className="rounded border-input text-primary focus:ring-primary h-4 w-4"
                                />
                                <label htmlFor="isPrimaryAcc" className="font-medium text-foreground cursor-pointer">
                                    Set as Primary Corporate Account
                                </label>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground">Notes / Purpose</label>
                            <Textarea
                                placeholder="Internal operating purpose, signatories, or limits..."
                                value={accountForm.notes}
                                onChange={(e) => setAccountForm({ ...accountForm, notes: e.target.value })}
                                className="h-16 text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAccountModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {editingAccount ? "Save Changes" : "Create Account"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================= */}
            {/* MODAL 2: IMPORT STATEMENT / CSV */}
            {/* ========================================================= */}
            <Dialog open={isImportModalOpen} onOpenChange={setIsImportModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Import Bank Statement Batch</DialogTitle>
                        <DialogDescription>
                            Upload or paste bank transaction feed data for account:{" "}
                            <span className="font-semibold text-foreground">
                                {activeAccount?.bankName} ({activeAccount?.accountNumber})
                            </span>
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleImportSubmit} className="space-y-4 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Statement # *</label>
                                <Input
                                    required
                                    value={importForm.statementNumber}
                                    onChange={(e) => setImportForm({ ...importForm, statementNumber: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Start Date</label>
                                <Input
                                    type="date"
                                    required
                                    value={importForm.startDate}
                                    onChange={(e) => setImportForm({ ...importForm, startDate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">End Date</label>
                                <Input
                                    type="date"
                                    required
                                    value={importForm.endDate}
                                    onChange={(e) => setImportForm({ ...importForm, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Opening Balance</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={importForm.openingBalance}
                                    onChange={(e) =>
                                        setImportForm({ ...importForm, openingBalance: parseFloat(e.target.value) || 0 })
                                    }
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Closing Balance</label>
                                <Input
                                    type="number"
                                    step="0.01"
                                    value={importForm.closingBalance}
                                    onChange={(e) =>
                                        setImportForm({ ...importForm, closingBalance: parseFloat(e.target.value) || 0 })
                                    }
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <label className="font-semibold text-foreground">
                                    CSV Transaction Feed Data *
                                </label>
                                <span className="text-[10px] text-muted-foreground">
                                    Format: Date, Type, Amount, Payee, Narration, Reference
                                </span>
                            </div>
                            <Textarea
                                required
                                placeholder="2026-03-15, DEPOSIT, 54000, Client X, NEFT Invoice Payment, NEFT-88120&#10;2026-03-18, WITHDRAWAL, 1200, AWS, Cloud compute subscription, POS-991"
                                value={importForm.csvText}
                                onChange={(e) => setImportForm({ ...importForm, csvText: e.target.value })}
                                className="h-32 text-xs font-mono"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsImportModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                Parse & Import Statement
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================= */}
            {/* MODAL 3: MANUAL MATCH RECORD PICKER */}
            {/* ========================================================= */}
            <Dialog open={isMatchModalOpen} onOpenChange={setIsMatchModalOpen}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Match Bank Line to System Record</DialogTitle>
                        <DialogDescription>
                            Select an existing open ERP Payment or Expense to bind with this bank transaction.
                        </DialogDescription>
                    </DialogHeader>

                    {matchingTxn && (
                        <div className="space-y-4 text-xs">
                            {/* Selected Bank Transaction Snippet */}
                            <div className="p-3 rounded-lg bg-muted/40 border border-border/60 flex items-center justify-between">
                                <div>
                                    <span className="font-semibold text-foreground block">
                                        {matchingTxn.description}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        {formatDate(matchingTxn.transactionDate)} • Ref: {matchingTxn.reference || "None"}
                                    </span>
                                </div>
                                <span
                                    className={`font-bold text-sm ${
                                        matchingTxn.type === "DEPOSIT" ? "text-emerald-400" : "text-rose-400"
                                    }`}
                                >
                                    {matchingTxn.type === "DEPOSIT" ? "+" : "-"}
                                    {formatCurrency(matchingTxn.amount, activeAccount?.currencyCode)}
                                </span>
                            </div>

                            {/* Search Filter */}
                            <Input
                                placeholder="Filter candidate records..."
                                value={candidateSearch}
                                onChange={(e) => setCandidateSearch(e.target.value)}
                                className="h-9 text-xs"
                            />

                            {/* Candidate List */}
                            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                                {filteredCandidates.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-6">
                                        No compatible candidate records found. You can use &quot;Quick Expense&quot; to
                                        auto-book this item.
                                    </p>
                                ) : (
                                    filteredCandidates.map((cand) => {
                                        const isExactAmount = Math.abs(cand.amount - matchingTxn.amount) < 0.01

                                        return (
                                            <div
                                                key={`${cand.source}-${cand.id}`}
                                                className={`p-3 rounded-lg border flex items-center justify-between gap-3 transition-colors ${
                                                    isExactAmount
                                                        ? "border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/10"
                                                        : "border-border/60 hover:bg-muted/40"
                                                }`}
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="outline" className="text-[9px]">
                                                            {cand.source}
                                                        </Badge>
                                                        <span className="font-semibold text-foreground">
                                                            {cand.numberOrRef}
                                                        </span>
                                                        {isExactAmount && (
                                                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-[9px]">
                                                                Exact Amount
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-muted-foreground text-[11px]">
                                                        {cand.titleOrParty} • {formatDate(cand.date)}
                                                    </p>
                                                </div>

                                                <div className="text-right shrink-0 flex items-center gap-3">
                                                    <span className="font-bold text-foreground">
                                                        {formatCurrency(cand.amount, activeAccount?.currencyCode)}
                                                    </span>
                                                    <Button
                                                        size="sm"
                                                        onClick={() => handleConfirmManualMatch(cand)}
                                                        disabled={isPending}
                                                        className="h-7 text-xs px-2.5"
                                                    >
                                                        Link
                                                    </Button>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* ========================================================= */}
            {/* MODAL 4: QUICK RECORD EXPENSE & RECONCILE */}
            {/* ========================================================= */}
            <Dialog open={isQuickExpenseModalOpen} onOpenChange={setIsQuickExpenseModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Quick Record Operational Expense</DialogTitle>
                        <DialogDescription>
                            Create an expense and balanced Journal Entry to instantly reconcile bank charges, interest, or direct debits.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleQuickExpenseSubmit} className="space-y-4 text-xs">
                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground">Expense Title *</label>
                            <Input
                                required
                                value={quickExpenseForm.title}
                                onChange={(e) => setQuickExpenseForm({ ...quickExpenseForm, title: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Category *</label>
                                <select
                                    value={quickExpenseForm.category}
                                    onChange={(e) =>
                                        setQuickExpenseForm({ ...quickExpenseForm, category: e.target.value })
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                                >
                                    <option value="Bank Charges & Commission">Bank Charges & Commission</option>
                                    <option value="Interest Expense">Interest Expense</option>
                                    <option value="Software & Hosting">Software & Hosting</option>
                                    <option value="Utilities">Utilities</option>
                                    <option value="Office Supplies">Office Supplies</option>
                                    <option value="Miscellaneous">Miscellaneous</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="font-semibold text-foreground">Expense Account *</label>
                                <select
                                    required
                                    value={quickExpenseForm.accountId}
                                    onChange={(e) =>
                                        setQuickExpenseForm({ ...quickExpenseForm, accountId: e.target.value })
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs"
                                >
                                    <option value="">-- Select Expense Account --</option>
                                    {data.chartOfAccounts.map((coa) => (
                                        <option key={coa.id} value={coa.id}>
                                            {coa.code} — {coa.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground">Amount</label>
                            <Input
                                type="number"
                                step="0.01"
                                required
                                value={quickExpenseForm.amount}
                                onChange={(e) =>
                                    setQuickExpenseForm({
                                        ...quickExpenseForm,
                                        amount: parseFloat(e.target.value) || 0,
                                    })
                                }
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="font-semibold text-foreground">Notes</label>
                            <Input
                                value={quickExpenseForm.notes}
                                onChange={(e) => setQuickExpenseForm({ ...quickExpenseForm, notes: e.target.value })}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsQuickExpenseModalOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                Post & Instantly Reconcile
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
