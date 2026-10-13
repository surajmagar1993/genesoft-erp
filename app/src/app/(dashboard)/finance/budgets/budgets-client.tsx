"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Target,
    Calculator,
    PieChart,
    BarChart3,
    TrendingUp,
    TrendingDown,
    AlertTriangle,
    CheckCircle2,
    Clock,
    Plus,
    RefreshCw,
    Search,
    Download,
    Eye,
    SlidersHorizontal,
    Trash2,
    Calendar,
    Building2,
    Landmark,
    ReceiptText,
    ArrowUpRight,
    ArrowDownLeft,
    Check,
    X,
    ChevronRight,
    ShieldAlert,
    Wallet,
    HelpCircle,
    Copy,
    Percent,
    ExternalLink
} from "lucide-react"
import Papa from "papaparse"
import { format } from "date-fns"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    BudgetsOverviewData,
    BudgetSummary,
    BudgetItemDetail,
    BudgetDetailData,
    createBudget,
    updateBudget,
    changeBudgetStatus,
    deleteBudget,
    getBudgetDetail,
} from "@/app/actions/finance/budgets"
import { BudgetPeriodType, BudgetStatus } from "@prisma/client"
import { formatCurrency } from "@/lib/utils"
import { RequireRole } from "@/components/auth/role-context"

interface BudgetsClientProps {
    initialData: BudgetsOverviewData
}

export function BudgetsClient({ initialData }: BudgetsClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Sub-view: "portfolio" | "variance" | "departments" | "watchdog"
    const [activeTab, setActiveTab] = useState<"portfolio" | "variance" | "departments" | "watchdog">("portfolio")

    // Filters
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("ALL")
    const [departmentFilter, setDepartmentFilter] = useState<string>("ALL")
    const [fiscalYearFilter, setFiscalYearFilter] = useState<string>("ALL")

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [editingBudget, setEditingBudget] = useState<BudgetSummary | null>(null)
    const [statusModalBudget, setStatusModalBudget] = useState<BudgetSummary | null>(null)
    const [newStatus, setNewStatus] = useState<BudgetStatus>(BudgetStatus.APPROVED)

    // Deep-dive detail state for Variance Desk
    const [selectedBudgetId, setSelectedBudgetId] = useState<string>(
        initialData.budgets[0]?.id || ""
    )
    const [detailedBudgetData, setDetailedBudgetData] = useState<BudgetDetailData | null>(null)
    const [isLoadingDetail, setIsLoadingDetail] = useState(false)

    // Create Form State
    const [newPlan, setNewPlan] = useState<{
        name: string
        fiscalYear: string
        periodType: BudgetPeriodType
        startDate: string
        endDate: string
        departmentId: string
        alertThresholdPercent: number
        criticalThresholdPercent: number
        notes: string
        items: {
            accountId: string
            category: string
            budgetedAmount: number
            notes: string
        }[]
    }>({
        name: "",
        fiscalYear: "2026-2027",
        periodType: BudgetPeriodType.ANNUAL,
        startDate: "2026-04-01",
        endDate: "2027-03-31",
        departmentId: "COMPANY_WIDE",
        alertThresholdPercent: 80,
        criticalThresholdPercent: 100,
        notes: "",
        items: [
            { accountId: "", category: "Software & Hosting", budgetedAmount: 50000, notes: "" },
            { accountId: "", category: "Office Supplies", budgetedAmount: 20000, notes: "" },
        ]
    })

    // Available Fiscal Years
    const fiscalYears = useMemo(() => {
        const set = new Set<string>()
        initialData.budgets.forEach((b) => set.add(b.fiscalYear))
        set.add("2026-2027")
        set.add("2025-2026")
        return Array.from(set).sort().reverse()
    }, [initialData.budgets])

    // Filtered Budgets List
    const filteredBudgets = useMemo(() => {
        return initialData.budgets.filter((b) => {
            const matchesSearch =
                !searchQuery.trim() ||
                b.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                b.fiscalYear.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (b.departmentName && b.departmentName.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesStatus = statusFilter === "ALL" || b.status === statusFilter
            const matchesDept = departmentFilter === "ALL" || b.departmentId === departmentFilter
            const matchesFY = fiscalYearFilter === "ALL" || b.fiscalYear === fiscalYearFilter

            return matchesSearch && matchesStatus && matchesDept && matchesFY
        })
    }, [initialData.budgets, searchQuery, statusFilter, departmentFilter, fiscalYearFilter])

    // Load detailed budget when selected in Variance Desk
    const loadBudgetDetails = async (budgetId: string) => {
        if (!budgetId) return
        setSelectedBudgetId(budgetId)
        setIsLoadingDetail(true)
        try {
            const detail = await getBudgetDetail(budgetId)
            setDetailedBudgetData(detail)
        } catch (e: any) {
            toast.error("Failed to load budget details")
        } finally {
            setIsLoadingDetail(false)
        }
    }

    // Handlers: Form line items
    const handleAddItemLine = () => {
        setNewPlan((prev) => ({
            ...prev,
            items: [...prev.items, { accountId: "", category: "Miscellaneous", budgetedAmount: 10000, notes: "" }]
        }))
    }

    const handleRemoveItemLine = (idx: number) => {
        setNewPlan((prev) => ({
            ...prev,
            items: prev.items.filter((_, i) => i !== idx)
        }))
    }

    const handleItemChange = (idx: number, field: string, value: any) => {
        setNewPlan((prev) => {
            const updated = [...prev.items]
            updated[idx] = { ...updated[idx], [field]: value }
            return { ...prev, items: updated }
        })
    }

    const calculatedTotalBudget = useMemo(() => {
        return newPlan.items.reduce((sum, item) => sum + (Number(item.budgetedAmount) || 0), 0)
    }, [newPlan.items])

    // Submit New Budget Plan
    const handleCreateBudget = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newPlan.name.trim()) {
            toast.error("Plan name is required.")
            return
        }

        const validItems = newPlan.items.filter((i) => i.accountId)
        if (validItems.length === 0) {
            toast.error("Please assign an Expense Account to at least one allocation line.")
            return
        }

        startTransition(async () => {
            try {
                await createBudget({
                    name: newPlan.name,
                    fiscalYear: newPlan.fiscalYear,
                    periodType: newPlan.periodType,
                    startDate: newPlan.startDate,
                    endDate: newPlan.endDate,
                    departmentId: newPlan.departmentId === "COMPANY_WIDE" ? null : newPlan.departmentId,
                    alertThresholdPercent: Number(newPlan.alertThresholdPercent) || 80,
                    criticalThresholdPercent: Number(newPlan.criticalThresholdPercent) || 100,
                    notes: newPlan.notes || null,
                    items: validItems
                })
                toast.success(`Budget plan "${newPlan.name}" created successfully!`)
                setIsCreateModalOpen(false)
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to create budget plan")
            }
        })
    }

    // Change Status
    const handleStatusTransition = async () => {
        if (!statusModalBudget) return
        startTransition(async () => {
            try {
                await changeBudgetStatus(statusModalBudget.id, newStatus)
                toast.success(`Budget status updated to ${newStatus}`)
                setStatusModalBudget(null)
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to update budget status")
            }
        })
    }

    // Delete Budget
    const handleDeleteBudget = async (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete budget "${name}"?`)) return
        startTransition(async () => {
            try {
                await deleteBudget(id)
                toast.success("Budget plan deleted successfully")
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to delete budget")
            }
        })
    }

    // Export Variance Report CSV
    const exportVarianceCsv = () => {
        try {
            const rows = filteredBudgets.map((b) => ({
                "Budget Plan": b.name,
                "Fiscal Year": b.fiscalYear,
                "Period": b.periodType,
                "Department / Cost Center": b.departmentName || "Company-wide",
                "Allocated Budget Cap (INR)": b.totalBudgetedAmount,
                "Actual Incurred Spend (INR)": b.totalActualAmount,
                "Variance Net Delta (INR)": b.varianceAmount,
                "Utilization %": `${b.utilizationPercent}%`,
                "Health Status": b.burnStatus,
                "Approval Status": b.status,
                "Start Date": format(new Date(b.startDate), "yyyy-MM-dd"),
                "End Date": format(new Date(b.endDate), "yyyy-MM-dd")
            }))
            const csv = Papa.unparse(rows)
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `budget_variance_report_${new Date().toISOString().split("T")[0]}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success("Variance report exported to CSV.")
        } catch (e) {
            toast.error("Failed to export variance CSV")
        }
    }

    // Departmental Aggregation
    const departmentalRollup = useMemo(() => {
        const map = new Map<string, { name: string; budgeted: number; actual: number; count: number }>()

        // Initialize with all active departments
        initialData.departments.forEach((d) => {
            map.set(d.id, { name: d.name, budgeted: 0, actual: 0, count: 0 })
        })
        map.set("COMPANY_WIDE", { name: "Company-wide / Corporate", budgeted: 0, actual: 0, count: 0 })

        initialData.budgets.forEach((b) => {
            const key = b.departmentId || "COMPANY_WIDE"
            const entry = map.get(key)
            if (entry) {
                entry.budgeted += b.totalBudgetedAmount
                entry.actual += b.totalActualAmount
                entry.count += 1
            }
        })

        return Array.from(map.values()).filter((d) => d.budgeted > 0 || d.actual > 0 || d.count > 0)
    }, [initialData.budgets, initialData.departments])

    return (
        <div className="space-y-6 p-4 md:p-8 max-w-7xl mx-auto">
            {/* Header Title & Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                        <Target className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
                        Budgets &amp; Variance Analysis
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Fiscal planning, expense caps, real-time GL actuals aggregation, and threshold burn monitors.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={exportVarianceCsv}
                        className="gap-1.5 h-9 text-xs"
                    >
                        <Download className="h-4 w-4 text-muted-foreground" />
                        Export Report
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setIsCreateModalOpen(true)}
                        className="gap-1.5 h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        New Budget Plan
                    </Button>
                </div>
            </div>

            {/* Top Telemetry KPI Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Metric 1: Total Allocated Budget */}
                <Card className="border-l-4 border-l-blue-500 shadow-sm bg-gradient-to-br from-card to-blue-50/20 dark:to-blue-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget Cap</CardTitle>
                        <Target className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(initialData.telemetry.totalAllocatedBudget)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{initialData.telemetry.totalBudgetsCount}</span> budget plans configured
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 2: Actual Incurred Spend */}
                <Card className="border-l-4 border-l-purple-500 shadow-sm bg-gradient-to-br from-card to-purple-50/20 dark:to-purple-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Actual Spend (YTD)</CardTitle>
                        <ReceiptText className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(initialData.telemetry.totalActualSpend)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            <span className="font-semibold text-foreground">{initialData.telemetry.averageUtilizationPercent}%</span> aggregate utilization
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 3: Net Runway / Remaining Variance */}
                <Card className={`border-l-4 shadow-sm bg-gradient-to-br from-card ${
                    initialData.telemetry.netBudgetRunway >= 0
                        ? "border-l-emerald-500 to-emerald-50/20 dark:to-emerald-950/20"
                        : "border-l-rose-500 to-rose-50/20 dark:to-rose-950/20"
                }`}>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Remaining Net Runway</CardTitle>
                        <Wallet className={`h-4 w-4 ${initialData.telemetry.netBudgetRunway >= 0 ? "text-emerald-500" : "text-rose-500"}`} />
                    </CardHeader>
                    <CardContent>
                        <div className={`text-2xl font-bold ${
                            initialData.telemetry.netBudgetRunway >= 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                        }`}>
                            {formatCurrency(initialData.telemetry.netBudgetRunway)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {initialData.telemetry.netBudgetRunway >= 0 ? "Favorable surplus balance" : "Unfavorable budget deficit"}
                        </p>
                    </CardContent>
                </Card>

                {/* Metric 4: Threshold Alerts */}
                <Card className="border-l-4 border-l-amber-500 shadow-sm bg-gradient-to-br from-card to-amber-50/20 dark:to-amber-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Threshold Watchdog</CardTitle>
                        <AlertTriangle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <span className="text-rose-600 dark:text-rose-400">{initialData.telemetry.criticalBudgetsCount} Critical</span>
                            <span className="text-xs text-muted-foreground font-normal">&bull;</span>
                            <span className="text-amber-600 dark:text-amber-400 text-lg">{initialData.telemetry.warningBudgetsCount} Warning</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Plans breaching alert thresholds
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
                <TabsList className="grid grid-cols-2 sm:grid-cols-4 w-full max-w-2xl">
                    <TabsTrigger value="portfolio" className="gap-2 text-xs sm:text-sm">
                        <Target className="h-4 w-4" />
                        Budget Portfolio
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                            {initialData.budgets.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="variance" className="gap-2 text-xs sm:text-sm">
                        <Calculator className="h-4 w-4 text-indigo-500" />
                        Variance Desk
                    </TabsTrigger>
                    <TabsTrigger value="departments" className="gap-2 text-xs sm:text-sm">
                        <Building2 className="h-4 w-4 text-purple-500" />
                        Cost Centers
                    </TabsTrigger>
                    <TabsTrigger value="watchdog" className="gap-2 text-xs sm:text-sm">
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                        Burn Watchdog
                        {(initialData.telemetry.criticalBudgetsCount > 0 || initialData.telemetry.warningBudgetsCount > 0) && (
                            <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                                {initialData.telemetry.criticalBudgetsCount + initialData.telemetry.warningBudgetsCount}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* ========================================================================= */}
                {/* TAB 1: Budget Portfolio */}
                {/* ========================================================================= */}
                <TabsContent value="portfolio" className="space-y-4">
                    {/* Filters Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-sm">
                        <div className="flex flex-1 flex-col sm:flex-row items-center gap-2 w-full">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search plan name or department..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8 h-9 text-xs sm:text-sm"
                                />
                            </div>

                            <Select value={fiscalYearFilter} onValueChange={setFiscalYearFilter}>
                                <SelectTrigger className="w-full sm:w-40 h-9 text-xs">
                                    <SelectValue placeholder="All Fiscal Years" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Fiscal Years</SelectItem>
                                    {fiscalYears.map((fy) => (
                                        <SelectItem key={fy} value={fy}>
                                            FY {fy}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                                    <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Departments</SelectItem>
                                    {initialData.departments.map((d) => (
                                        <SelectItem key={d.id} value={d.id}>
                                            {d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-full sm:w-36 h-9 text-xs">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Statuses</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="APPROVED">Approved</SelectItem>
                                    <SelectItem value="SUBMITTED">Submitted</SelectItem>
                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                    <SelectItem value="CLOSED">Closed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => router.refresh()}
                            disabled={isPending}
                            className="h-8 w-8 p-0 self-end sm:self-auto"
                            title="Refresh"
                        >
                            <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                        </Button>
                    </div>

                    {/* Budgets Table */}
                    <Card className="shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="w-[240px]">Budget Plan</TableHead>
                                        <TableHead>Scope &amp; Period</TableHead>
                                        <TableHead className="text-right">Planned Cap</TableHead>
                                        <TableHead className="text-right">Actual Spend</TableHead>
                                        <TableHead className="w-[180px]">Utilization &amp; Runway</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBudgets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                <Target className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                No budget plans found matching your criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredBudgets.map((b) => {
                                            return (
                                                <TableRow key={b.id} className="hover:bg-muted/20">
                                                    <TableCell>
                                                        <div className="font-semibold text-xs sm:text-sm text-foreground">
                                                            {b.name}
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground font-mono">
                                                            FY {b.fiscalYear} &bull; {b.itemCount} account lines
                                                        </span>
                                                    </TableCell>

                                                    <TableCell className="text-xs">
                                                        <div className="font-medium text-foreground flex items-center gap-1.5">
                                                            <Building2 className="h-3 w-3 text-muted-foreground" />
                                                            <span>{b.departmentName || "Company-wide"}</span>
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground block">
                                                            {format(new Date(b.startDate), "MMM yyyy")} &ndash; {format(new Date(b.endDate), "MMM yyyy")} ({b.periodType})
                                                        </span>
                                                    </TableCell>

                                                    <TableCell className="text-right font-semibold text-xs sm:text-sm">
                                                        {formatCurrency(b.totalBudgetedAmount)}
                                                    </TableCell>

                                                    <TableCell className="text-right font-semibold text-xs sm:text-sm">
                                                        {formatCurrency(b.totalActualAmount)}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <div className="flex items-center justify-between text-[11px]">
                                                                <span className="font-medium">{b.utilizationPercent}%</span>
                                                                <span className={b.varianceAmount >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400 font-semibold"}>
                                                                    {b.varianceAmount >= 0 ? "+" : ""}{formatCurrency(b.varianceAmount)}
                                                                </span>
                                                            </div>
                                                            <Progress
                                                                value={Math.min(b.utilizationPercent, 100)}
                                                                className={`h-1.5 ${
                                                                    b.burnStatus === "CRITICAL"
                                                                        ? "[&>div]:bg-rose-500"
                                                                        : b.burnStatus === "WARNING"
                                                                        ? "[&>div]:bg-amber-500"
                                                                        : "[&>div]:bg-emerald-500"
                                                                }`}
                                                            />
                                                        </div>
                                                    </TableCell>

                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] px-2 py-0.5 border ${
                                                                b.status === "ACTIVE"
                                                                    ? "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                                    : b.status === "APPROVED"
                                                                    ? "border-blue-500 bg-blue-50 text-blue-800 dark:bg-blue-950 dark:text-blue-300"
                                                                    : b.status === "SUBMITTED"
                                                                    ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                                    : "text-muted-foreground"
                                                            }`}
                                                        >
                                                            {b.status}
                                                        </Badge>
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                                                onClick={() => {
                                                                    loadBudgetDetails(b.id)
                                                                    setActiveTab("variance")
                                                                }}
                                                                title="View Variance Analysis"
                                                            >
                                                                <Calculator className="h-3.5 w-3.5 mr-1" />
                                                                Analyze
                                                            </Button>

                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 px-2 text-xs"
                                                                onClick={() => {
                                                                    setStatusModalBudget(b)
                                                                    setNewStatus(b.status === "DRAFT" ? BudgetStatus.SUBMITTED : b.status === "SUBMITTED" ? BudgetStatus.APPROVED : BudgetStatus.ACTIVE)
                                                                }}
                                                                title="Lifecycle Status"
                                                            >
                                                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                                            </Button>

                                                            {b.status !== "ACTIVE" && (
                                                                <RequireRole min="MANAGER"><Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700"
                                                                    onClick={() => handleDeleteBudget(b.id, b.name)}
                                                                    title="Delete Budget"
                                                                >
                                                                    <Trash2 className="h-3.5 w-3.5" />
                                                                </Button></RequireRole>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 2: Variance Desk */}
                {/* ========================================================================= */}
                <TabsContent value="variance" className="space-y-4">
                    {/* Budget Plan Selector Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-xl border shadow-sm">
                        <div className="flex items-center gap-3">
                            <Label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">
                                Active Budget Plan:
                            </Label>
                            <Select
                                value={selectedBudgetId}
                                onValueChange={(val) => loadBudgetDetails(val)}
                            >
                                <SelectTrigger className="w-full sm:w-80 h-9 text-xs font-semibold">
                                    <SelectValue placeholder="Select Budget Plan" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.budgets.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.name} (FY {b.fiscalYear})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {detailedBudgetData && (
                            <div className="flex items-center gap-3 text-xs">
                                <span className="text-muted-foreground">
                                    Thresholds: Warning at {detailedBudgetData.budget.alertThresholdPercent}%, Critical at {detailedBudgetData.budget.criticalThresholdPercent}%
                                </span>
                            </div>
                        )}
                    </div>

                    {/* Detailed Variance Table */}
                    {isLoadingDetail ? (
                        <Card className="p-12 text-center text-muted-foreground">
                            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-indigo-500" />
                            Calculating General Ledger actuals...
                        </Card>
                    ) : !detailedBudgetData ? (
                        <Card className="p-12 text-center text-muted-foreground">
                            <Calculator className="h-8 w-8 mx-auto mb-2 opacity-30" />
                            Select a budget plan from the dropdown above to inspect line-item variances.
                        </Card>
                    ) : (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Line-item Variance Breakdown */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <CardTitle className="text-base font-semibold">
                                                Account-Level Variance Ledger: {detailedBudgetData.budget.name}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Comparing planned expense budget against actual booked expenses for {format(new Date(detailedBudgetData.budget.startDate), "yyyy-MM-dd")} to {format(new Date(detailedBudgetData.budget.endDate), "yyyy-MM-dd")}.
                                            </CardDescription>
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className="font-mono text-xs"
                                        >
                                            Total Lines: {detailedBudgetData.items.length}
                                        </Badge>
                                    </div>
                                </CardHeader>

                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/40 text-xs">
                                                <TableHead>Account Code &amp; Title</TableHead>
                                                <TableHead>Expense Category</TableHead>
                                                <TableHead className="text-right">Budgeted Cap</TableHead>
                                                <TableHead className="text-right">Actual Spend</TableHead>
                                                <TableHead className="text-right">Variance (+ / -)</TableHead>
                                                <TableHead className="w-[180px]">Utilization %</TableHead>
                                                <TableHead>Status</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {detailedBudgetData.items.map((item) => {
                                                const isUnfavorable = item.varianceAmount < 0
                                                return (
                                                    <TableRow key={item.id} className="hover:bg-muted/20 text-xs">
                                                        <TableCell className="font-mono">
                                                            <div className="font-semibold text-foreground">
                                                                {item.accountCode} - {item.accountName}
                                                            </div>
                                                            {item.notes && (
                                                                <span className="text-[10px] text-muted-foreground block font-sans italic">
                                                                    {item.notes}
                                                                </span>
                                                            )}
                                                        </TableCell>

                                                        <TableCell>
                                                            <Badge variant="secondary" className="text-[10px] font-normal">
                                                                {item.category || "General Expense"}
                                                            </Badge>
                                                        </TableCell>

                                                        <TableCell className="text-right font-medium">
                                                            {formatCurrency(item.budgetedAmount)}
                                                        </TableCell>

                                                        <TableCell className="text-right font-bold text-foreground">
                                                            {formatCurrency(item.actualAmount)}
                                                        </TableCell>

                                                        <TableCell className={`text-right font-semibold ${isUnfavorable ? "text-rose-600 dark:text-rose-400" : "text-emerald-600 dark:text-emerald-400"}`}>
                                                            {isUnfavorable ? "" : "+"}{formatCurrency(item.varianceAmount)}
                                                        </TableCell>

                                                        <TableCell>
                                                            <div className="space-y-1">
                                                                <div className="flex justify-between text-[10px]">
                                                                    <span>{item.utilizationPercent}%</span>
                                                                </div>
                                                                <Progress
                                                                    value={Math.min(item.utilizationPercent, 100)}
                                                                    className={`h-1.5 ${
                                                                        item.status === "CRITICAL"
                                                                            ? "[&>div]:bg-rose-500"
                                                                            : item.status === "WARNING"
                                                                            ? "[&>div]:bg-amber-500"
                                                                            : "[&>div]:bg-emerald-500"
                                                                    }`}
                                                                />
                                                            </div>
                                                        </TableCell>

                                                        <TableCell>
                                                            {item.status === "HEALTHY" && (
                                                                <Badge variant="outline" className="text-[10px] border-emerald-500 text-emerald-700 dark:text-emerald-300">
                                                                    Healthy
                                                                </Badge>
                                                            )}
                                                            {item.status === "WARNING" && (
                                                                <Badge variant="outline" className="text-[10px] border-amber-500 text-amber-700 dark:text-amber-300">
                                                                    Warning (&gt;80%)
                                                                </Badge>
                                                            )}
                                                            {item.status === "CRITICAL" && (
                                                                <Badge variant="destructive" className="text-[10px]">
                                                                    Over-Budget
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </Card>

                            {/* Recent Transactions in Period */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3 border-b">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <ReceiptText className="h-4 w-4 text-blue-500" />
                                        Recent Booked Expenses in Budget Window ({detailedBudgetData.recentExpenses.length})
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Actual expense ledger vouchers contributing to this budget period.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="pt-3">
                                    {detailedBudgetData.recentExpenses.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic text-center py-4">
                                            No recorded expenses in this date window yet.
                                        </p>
                                    ) : (
                                        <div className="divide-y text-xs">
                                            {detailedBudgetData.recentExpenses.map((exp) => (
                                                <div key={exp.id} className="py-2.5 flex items-center justify-between">
                                                    <div>
                                                        <div className="font-semibold text-foreground">
                                                            {exp.title}
                                                        </div>
                                                        <div className="text-muted-foreground text-[11px] font-mono">
                                                            {exp.expenseNumber} &bull; {exp.accountCode} ({exp.accountName}) &bull; {format(new Date(exp.expenseDate), "yyyy-MM-dd")}
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="font-bold text-foreground">
                                                            {formatCurrency(exp.totalAmount)}
                                                        </div>
                                                        {exp.vendorName && (
                                                            <span className="text-[10px] text-muted-foreground block">
                                                                Vendor: {exp.vendorName}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 3: Departmental Cost Centers */}
                {/* ========================================================================= */}
                <TabsContent value="departments" className="space-y-4">
                    <Card className="shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-purple-500" />
                                Departmental Opex &amp; Cost Center Allocations
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Planned vs actual operational expenditure distributed across organizational departments.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {departmentalRollup.map((dept, idx) => {
                                    const util = dept.budgeted > 0 ? (dept.actual / dept.budgeted) * 100 : 0
                                    const remaining = dept.budgeted - dept.actual
                                    return (
                                        <div
                                            key={idx}
                                            className="p-4 bg-muted/30 rounded-xl border space-y-3 shadow-xs hover:border-purple-300 dark:hover:border-purple-800 transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h4 className="font-bold text-sm text-foreground">{dept.name}</h4>
                                                <Badge variant="secondary" className="text-[10px]">
                                                    {dept.count} plans
                                                </Badge>
                                            </div>

                                            <div className="space-y-1.5">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Planned Cap:</span>
                                                    <span className="font-semibold">{formatCurrency(dept.budgeted)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Actual Spend:</span>
                                                    <span className="font-bold text-foreground">{formatCurrency(dept.actual)}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-muted-foreground">Net Runway:</span>
                                                    <span className={`font-semibold ${remaining >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                                                        {remaining >= 0 ? "+" : ""}{formatCurrency(remaining)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="space-y-1 pt-1 border-t">
                                                <div className="flex justify-between text-[11px] text-muted-foreground">
                                                    <span>Utilization:</span>
                                                    <span className="font-medium text-foreground">{Math.round(util * 10) / 10}%</span>
                                                </div>
                                                <Progress
                                                    value={Math.min(util, 100)}
                                                    className={`h-1.5 ${
                                                        util > 100
                                                            ? "[&>div]:bg-rose-500"
                                                            : util > 80
                                                            ? "[&>div]:bg-amber-500"
                                                            : "[&>div]:bg-purple-500"
                                                    }`}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 4: Runway & Burn Watchdog */}
                {/* ========================================================================= */}
                <TabsContent value="watchdog" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Critical Alerts Card */}
                        <Card className="border-t-4 border-t-rose-500 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                        <ShieldAlert className="h-4 w-4" />
                                        Over-Budget Plans (&gt;100% Cap)
                                    </CardTitle>
                                    <Badge variant="destructive" className="text-xs">
                                        {initialData.telemetry.criticalBudgetsCount}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Budgets whose actual expenses have exceeded 100% of planned authorization.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {initialData.budgets.filter((b) => b.burnStatus === "CRITICAL").length === 0 ? (
                                    <div className="text-center py-6 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                                        Zero budget breaches detected.
                                    </div>
                                ) : (
                                    initialData.budgets
                                        .filter((b) => b.burnStatus === "CRITICAL")
                                        .map((b) => (
                                            <div key={b.id} className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg text-xs space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-rose-900 dark:text-rose-200">{b.name}</span>
                                                    <Badge variant="destructive" className="text-[10px]">
                                                        {b.utilizationPercent}%
                                                    </Badge>
                                                </div>
                                                <div className="text-rose-700 dark:text-rose-300 text-[11px] flex justify-between">
                                                    <span>Cap: {formatCurrency(b.totalBudgetedAmount)}</span>
                                                    <span className="font-bold">Spent: {formatCurrency(b.totalActualAmount)}</span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground italic">
                                                    Recommended: Issue revision amendment or freeze non-essential purchase approvals.
                                                </p>
                                            </div>
                                        ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Warning Watchlist Card */}
                        <Card className="border-t-4 border-t-amber-500 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="h-4 w-4" />
                                        Approaching Cap Watchlist (80% &ndash; 100%)
                                    </CardTitle>
                                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-300">
                                        {initialData.telemetry.warningBudgetsCount}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Budgets approaching limit with less than 20% remaining runway.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {initialData.budgets.filter((b) => b.burnStatus === "WARNING").length === 0 ? (
                                    <div className="text-center py-6 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                                        No budgets in warning zone.
                                    </div>
                                ) : (
                                    initialData.budgets
                                        .filter((b) => b.burnStatus === "WARNING")
                                        .map((b) => (
                                            <div key={b.id} className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-lg text-xs space-y-1.5">
                                                <div className="flex justify-between items-center">
                                                    <span className="font-bold text-amber-900 dark:text-amber-200">{b.name}</span>
                                                    <span className="font-bold text-amber-600 dark:text-amber-400">{b.utilizationPercent}%</span>
                                                </div>
                                                <div className="text-amber-800 dark:text-amber-300 text-[11px] flex justify-between">
                                                    <span>Cap: {formatCurrency(b.totalBudgetedAmount)}</span>
                                                    <span>Runway Left: {formatCurrency(b.varianceAmount)}</span>
                                                </div>
                                            </div>
                                        ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ========================================================================= */}
            {/* MODAL: Create New Budget Plan */}
            {/* ========================================================================= */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-indigo-600" />
                            Create New Budget Plan
                        </DialogTitle>
                        <DialogDescription>
                            Establish an authorized spending ceiling for fiscal operations and departmental cost centers.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateBudget} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="sm:col-span-2 space-y-1">
                                <Label className="text-xs font-semibold">Plan Name *</Label>
                                <Input
                                    placeholder="e.g. FY 2026-2027 Corporate Operational Budget"
                                    value={newPlan.name}
                                    onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Fiscal Year *</Label>
                                <Input
                                    placeholder="e.g. 2026-2027"
                                    value={newPlan.fiscalYear}
                                    onChange={(e) => setNewPlan({ ...newPlan, fiscalYear: e.target.value })}
                                    className="text-xs font-mono"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Department / Scope</Label>
                                <Select
                                    value={newPlan.departmentId}
                                    onValueChange={(val) => setNewPlan({ ...newPlan, departmentId: val })}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="COMPANY_WIDE">Company-wide / Corporate</SelectItem>
                                        {initialData.departments.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Period Type</Label>
                                <Select
                                    value={newPlan.periodType}
                                    onValueChange={(val: BudgetPeriodType) => setNewPlan({ ...newPlan, periodType: val })}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ANNUAL">Annual (12 Mos)</SelectItem>
                                        <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                                        <SelectItem value="MONTHLY">Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Warning Threshold (%)</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={newPlan.alertThresholdPercent}
                                    onChange={(e) => setNewPlan({ ...newPlan, alertThresholdPercent: Number(e.target.value) })}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Start Date *</Label>
                                <Input
                                    type="date"
                                    value={newPlan.startDate}
                                    onChange={(e) => setNewPlan({ ...newPlan, startDate: e.target.value })}
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">End Date *</Label>
                                <Input
                                    type="date"
                                    value={newPlan.endDate}
                                    onChange={(e) => setNewPlan({ ...newPlan, endDate: e.target.value })}
                                    className="text-xs"
                                    required
                                />
                            </div>
                        </div>

                        {/* Line Items Allocator */}
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <div>
                                    <Label className="text-xs font-semibold">Account Allocations ({newPlan.items.length})</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Assign budget limits to specific Chart of Accounts expense categories.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={handleAddItemLine}
                                    className="h-7 text-xs gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Line
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                                {newPlan.items.map((item, idx) => (
                                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted/40 rounded-lg border text-xs">
                                        <div className="flex-1">
                                            <Select
                                                value={item.accountId}
                                                onValueChange={(val) => handleItemChange(idx, "accountId", val)}
                                            >
                                                <SelectTrigger className="text-xs h-8">
                                                    <SelectValue placeholder="Select Expense Account" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {initialData.expenseAccounts.map((acc) => (
                                                        <SelectItem key={acc.id} value={acc.id}>
                                                            {acc.code} - {acc.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="w-40">
                                            <Select
                                                value={item.category || "Miscellaneous"}
                                                onValueChange={(val) => handleItemChange(idx, "category", val)}
                                            >
                                                <SelectTrigger className="text-xs h-8">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {initialData.standardCategories.map((cat) => (
                                                        <SelectItem key={cat} value={cat}>
                                                            {cat}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="w-32">
                                            <Input
                                                type="number"
                                                min="0"
                                                step="1000"
                                                placeholder="Amount"
                                                value={item.budgetedAmount}
                                                onChange={(e) => handleItemChange(idx, "budgetedAmount", Number(e.target.value))}
                                                className="text-xs h-8 font-semibold"
                                            />
                                        </div>

                                        {newPlan.items.length > 1 && (
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant="ghost"
                                                onClick={() => handleRemoveItemLine(idx)}
                                                className="h-8 w-8 p-0 text-muted-foreground hover:text-rose-600"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Total Summary */}
                            <div className="flex justify-between items-center p-3 bg-muted/60 rounded-lg text-xs font-semibold">
                                <span>Calculated Total Budget Cap:</span>
                                <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                    {formatCurrency(calculatedTotalBudget)}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Notes / Objectives</Label>
                            <Textarea
                                placeholder="Strategic objectives, assumptions, or financial review stipulations..."
                                value={newPlan.notes}
                                onChange={(e) => setNewPlan({ ...newPlan, notes: e.target.value })}
                                className="text-xs"
                                rows={2}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateModalOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                                {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Budget Plan
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* MODAL: Update Status Workflow */}
            {/* ========================================================================= */}
            <Dialog open={!!statusModalBudget} onOpenChange={(open) => !open && setStatusModalBudget(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5 text-indigo-600" />
                            Update Budget Lifecycle Status
                        </DialogTitle>
                        <DialogDescription>
                            Transition plan <span className="font-semibold">{statusModalBudget?.name}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {statusModalBudget && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Select New Status</Label>
                                <Select
                                    value={newStatus}
                                    onValueChange={(val: BudgetStatus) => setNewStatus(val)}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                        <SelectItem value="SUBMITTED">Submitted (Under Review)</SelectItem>
                                        <SelectItem value="APPROVED">Approved</SelectItem>
                                        <SelectItem value="ACTIVE">Active (Live Tracking)</SelectItem>
                                        <SelectItem value="CLOSED">Closed (Archived)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <p className="text-[11px] text-muted-foreground">
                                Active budgets will actively enforce spending alert thresholds against outgoing expense claims and purchase bills.
                            </p>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStatusModalBudget(null)}
                                    disabled={isPending}
                                >
                                    Cancel
                                </Button>
                                <RequireRole min="MANAGER"><Button
                                    type="button"
                                    onClick={handleStatusTransition}
                                    disabled={isPending}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Confirm Status
                                </Button></RequireRole>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
