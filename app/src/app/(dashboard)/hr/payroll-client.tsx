"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    DollarSign,
    Users,
    Clock,
    CheckCircle2,
    Calendar,
    FileText,
    Printer,
    Search,
    Plus,
    RefreshCw,
    AlertCircle,
    Building2,
    Briefcase,
    CreditCard,
    Check,
    X,
    Loader2,
    Eye,
    TrendingUp,
    Shield,
    Trash2,
    ArrowUpRight,
    Download
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import {
    PayrollOverviewData,
    PayrollRunRecord,
    PayslipRecord,
    SalaryStructureRecord,
    generatePayRun,
    approvePayRun,
    processPayRun,
    deletePayRun,
    createSalaryStructure,
    getPayslipDetails
} from "@/app/actions/payroll"

const MONTH_NAMES = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
]

export function PayrollClient({ initialData }: { initialData: PayrollOverviewData }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<"payruns" | "slips" | "structures">("payruns")

    // Modals
    const [isRunWizardOpen, setIsRunWizardOpen] = useState(false)
    const [isStructureModalOpen, setIsStructureModalOpen] = useState(false)
    const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false)
    const [isPayslipSlipOpen, setIsPayslipSlipOpen] = useState(false)

    // Active records for modals
    const [selectedRunForDisburse, setSelectedRunForDisburse] = useState<PayrollRunRecord | null>(null)
    const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null)

    // Search & Filter
    const [slipSearch, setSlipSearch] = useState("")
    const [slipPeriodFilter, setSlipPeriodFilter] = useState("ALL")
    const [slipStatusFilter, setSlipStatusFilter] = useState("ALL")

    // Run Wizard form state
    const currentMonth = new Date().getMonth() + 1
    const currentYear = new Date().getFullYear()
    const [runMonth, setRunMonth] = useState(String(currentMonth))
    const [runYear, setRunYear] = useState(String(currentYear))
    const [runPayDate, setRunPayDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [runNotes, setRunNotes] = useState("")

    // Disburse form state
    const [disburseMethod, setDisburseMethod] = useState("DIRECT_DEPOSIT")
    const [disburseRef, setDisburseRef] = useState("")

    // Structure form state
    const [structName, setStructName] = useState("")
    const [structCode, setStructCode] = useState("")
    const [structDesc, setStructDesc] = useState("")
    const [structBasicPct, setStructBasicPct] = useState("50")
    const [structHraPct, setStructHraPct] = useState("20")
    const [structConveyance, setStructConveyance] = useState("1600")
    const [structMedical, setStructMedical] = useState("1250")
    const [structSpecialPct, setStructSpecialPct] = useState("15")
    const [structPfRate, setStructPfRate] = useState("12")
    const [structEsiRate, setStructEsiRate] = useState("0.75")
    const [structPt, setStructPt] = useState("200")
    const [structTdsPct, setStructTdsPct] = useState("0")

    // Filtered payslips
    const filteredPayslips = useMemo(() => {
        return initialData.recentPayslips.filter(slip => {
            const matchesSearch =
                slip.employeeName.toLowerCase().includes(slipSearch.toLowerCase()) ||
                slip.employeeNumber.toLowerCase().includes(slipSearch.toLowerCase()) ||
                slip.slipNumber.toLowerCase().includes(slipSearch.toLowerCase())

            const matchesStatus = slipStatusFilter === "ALL" || slip.status === slipStatusFilter
            const matchesPeriod = slipPeriodFilter === "ALL" || `${slip.periodYear}-${slip.periodMonth}` === slipPeriodFilter

            return matchesSearch && matchesStatus && matchesPeriod
        })
    }, [initialData.recentPayslips, slipSearch, slipStatusFilter, slipPeriodFilter])

    // Generate Pay Run
    const handleGenerateRun = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            try {
                const res = await generatePayRun(
                    Number(runMonth),
                    Number(runYear),
                    runPayDate,
                    runNotes || undefined
                )
                if (res.success) {
                    toast.success(`Payroll run ${res.runNumber} generated successfully in draft mode!`)
                    setIsRunWizardOpen(false)
                    router.refresh()
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to generate payroll run")
            }
        })
    }

    // Approve Pay Run
    const handleApprove = (runId: string) => {
        startTransition(async () => {
            try {
                const res = await approvePayRun(runId)
                if (res.success) {
                    toast.success("Payroll run approved successfully!")
                    router.refresh()
                }
            } catch (err: any) {
                toast.error(err.message || "Approval failed")
            }
        })
    }

    // Disburse Pay Run
    const handleDisburseSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedRunForDisburse) return

        startTransition(async () => {
            try {
                const res = await processPayRun(
                    selectedRunForDisburse.id,
                    disburseMethod,
                    disburseRef || undefined
                )
                if (res.success) {
                    toast.success(`Payroll ${selectedRunForDisburse.runNumber} marked as disbursed & paid!`)
                    setIsDisburseModalOpen(false)
                    setSelectedRunForDisburse(null)
                    router.refresh()
                }
            } catch (err: any) {
                toast.error(err.message || "Disbursement processing failed")
            }
        })
    }

    // Delete Draft Pay Run
    const handleDeleteRun = (runId: string) => {
        if (!confirm("Are you sure you want to discard this draft payroll run? All draft payslips will be deleted.")) return
        startTransition(async () => {
            try {
                const res = await deletePayRun(runId)
                if (res.success) {
                    toast.success("Draft payroll run deleted")
                    router.refresh()
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to delete run")
            }
        })
    }

    // Create Structure
    const handleCreateStructure = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            try {
                const res = await createSalaryStructure({
                    name: structName,
                    code: structCode,
                    description: structDesc || undefined,
                    basicPercentage: Number(structBasicPct),
                    hraPercentage: Number(structHraPct),
                    conveyanceMonthly: Number(structConveyance),
                    medicalMonthly: Number(structMedical),
                    specialAllowancePct: Number(structSpecialPct),
                    pfEmployeeRate: Number(structPfRate),
                    esiEmployeeRate: Number(structEsiRate),
                    professionalTax: Number(structPt),
                    tdsPercentage: Number(structTdsPct)
                })
                if (res.success) {
                    toast.success("New salary structure created!")
                    setIsStructureModalOpen(false)
                    router.refresh()
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to create structure")
            }
        })
    }

    // Open Payslip Slip
    const handleViewSlip = (payslipId: string) => {
        startTransition(async () => {
            try {
                const data = await getPayslipDetails(payslipId)
                setSelectedPayslip(data)
                setIsPayslipSlipOpen(true)
            } catch (err: any) {
                toast.error(err.message || "Failed to fetch payslip details")
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header / Summary */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <DollarSign className="h-6 w-6 text-emerald-600" />
                        Payroll & Compensation Hub
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Automated statutory deductions (PF, ESI, TDS, PT), attendance proration, and instant salary slip issuance.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.refresh()}
                        disabled={isPending}
                        className="h-9"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>

                    <Button
                        onClick={() => setIsRunWizardOpen(true)}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm h-9"
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Run Monthly Payroll
                    </Button>
                </div>
            </div>

            {/* KPI Telemetry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Latest Pay Run Net
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-foreground">
                            {formatCurrency(initialData.telemetry.totalMonthlyPayroll)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="text-emerald-600 font-medium">Auto-calculated</span> including deductions
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Active Staff on Payroll
                        </CardTitle>
                        <Users className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-foreground">
                            {initialData.telemetry.staffOnPayroll}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Active salaried workforce
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Pending Approvals
                        </CardTitle>
                        <Clock className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-foreground">
                            {initialData.telemetry.pendingApprovals}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Draft pay runs awaiting review
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Total Disbursed (YTD)
                        </CardTitle>
                        <TrendingUp className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-foreground">
                            {formatCurrency(initialData.telemetry.totalDisbursedYTD)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Year-to-date net compensation
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Sub Tabs */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
                <TabsList className="grid grid-cols-3 sm:flex sm:w-auto h-auto p-1 gap-1 border bg-muted/40">
                    <TabsTrigger value="payruns" className="text-xs py-1.5 px-3">
                        <Calendar className="h-3.5 w-3.5 mr-1.5" />
                        Pay Runs ({initialData.payRuns.length})
                    </TabsTrigger>
                    <TabsTrigger value="slips" className="text-xs py-1.5 px-3">
                        <FileText className="h-3.5 w-3.5 mr-1.5" />
                        Salary Slips ({initialData.recentPayslips.length})
                    </TabsTrigger>
                    <TabsTrigger value="structures" className="text-xs py-1.5 px-3">
                        <Shield className="h-3.5 w-3.5 mr-1.5" />
                        Salary Structures ({initialData.salaryStructures.length})
                    </TabsTrigger>
                </TabsList>

                {/* --- TAB 1: PAY RUNS --- */}
                <TabsContent value="payruns" className="space-y-4 mt-0">
                    <Card className="border-border">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">Monthly Payroll Cycles</CardTitle>
                                <CardDescription className="text-xs">
                                    Track, approve, and execute consolidated staff wage disbursements.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsRunWizardOpen(true)}
                                className="h-8 text-xs"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                New Run
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead>Run Number</TableHead>
                                            <TableHead>Period</TableHead>
                                            <TableHead>Pay Date</TableHead>
                                            <TableHead className="text-center">Staff</TableHead>
                                            <TableHead className="text-right">Total Gross</TableHead>
                                            <TableHead className="text-right">Deductions</TableHead>
                                            <TableHead className="text-right">Net Payout</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {initialData.payRuns.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                                                    No pay runs generated yet. Click "Run Monthly Payroll" to start your first cycle.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            initialData.payRuns.map((run) => (
                                                <TableRow key={run.id} className="text-xs hover:bg-muted/40">
                                                    <TableCell className="font-semibold font-mono text-foreground">
                                                        {run.runNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        {MONTH_NAMES[run.periodMonth - 1]} {run.periodYear}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {format(new Date(run.payDate), "dd MMM yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="font-mono text-[11px]">
                                                            {run.employeeCount}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-muted-foreground">
                                                        {formatCurrency(run.totalGross)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                                                        -{formatCurrency(run.totalDeductions)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-foreground">
                                                        {formatCurrency(run.totalNetPay)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {run.status === "DRAFT" && (
                                                            <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20 text-[10px]">
                                                                DRAFT
                                                            </Badge>
                                                        )}
                                                        {run.status === "APPROVED" && (
                                                            <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20 text-[10px]">
                                                                APPROVED
                                                            </Badge>
                                                        )}
                                                        {run.status === "PAID" && (
                                                            <Badge variant="outline" className="border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-[10px]">
                                                                DISBURSED (PAID)
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            {run.status === "DRAFT" && (
                                                                <>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => handleApprove(run.id)}
                                                                        disabled={isPending}
                                                                        className="h-7 px-2 text-[11px] text-blue-600 hover:text-blue-700"
                                                                    >
                                                                        <Check className="h-3 w-3 mr-1" />
                                                                        Approve
                                                                    </Button>
                                                                    <Button
                                                                        size="sm"
                                                                        variant="ghost"
                                                                        onClick={() => handleDeleteRun(run.id)}
                                                                        disabled={isPending}
                                                                        className="h-7 w-7 p-0 text-red-500 hover:text-red-700"
                                                                    >
                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </>
                                                            )}

                                                            {run.status === "APPROVED" && (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => {
                                                                        setSelectedRunForDisburse(run)
                                                                        setIsDisburseModalOpen(true)
                                                                    }}
                                                                    disabled={isPending}
                                                                    className="h-7 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                >
                                                                    <CreditCard className="h-3 w-3 mr-1" />
                                                                    Disburse
                                                                </Button>
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                onClick={() => {
                                                                    setSlipPeriodFilter(`${run.periodYear}-${run.periodMonth}`)
                                                                    setActiveTab("slips")
                                                                }}
                                                                className="h-7 px-2 text-[11px]"
                                                            >
                                                                View Slips
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB 2: SALARY SLIPS --- */}
                <TabsContent value="slips" className="space-y-4 mt-0">
                    <Card className="border-border">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base font-semibold">Employee Payslips</CardTitle>
                                    <CardDescription className="text-xs">
                                        Itemized earnings, statutory tax/PF deductions, and printable pay vouchers.
                                    </CardDescription>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative w-full sm:w-60">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Search employee or slip #..."
                                            value={slipSearch}
                                            onChange={(e) => setSlipSearch(e.target.value)}
                                            className="h-8 pl-8 text-xs"
                                        />
                                    </div>

                                    <Select value={slipPeriodFilter} onValueChange={setSlipPeriodFilter}>
                                        <SelectTrigger className="h-8 text-xs w-[140px]">
                                            <SelectValue placeholder="Period" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Periods</SelectItem>
                                            {initialData.payRuns.map((r) => (
                                                <SelectItem key={r.id} value={`${r.periodYear}-${r.periodMonth}`}>
                                                    {MONTH_NAMES[r.periodMonth - 1]} {r.periodYear}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <Select value={slipStatusFilter} onValueChange={setSlipStatusFilter}>
                                        <SelectTrigger className="h-8 text-xs w-[110px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Status</SelectItem>
                                            <SelectItem value="DRAFT">Draft</SelectItem>
                                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                            <SelectItem value="PAID">Paid</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead>Slip #</TableHead>
                                            <TableHead>Employee</TableHead>
                                            <TableHead>Period</TableHead>
                                            <TableHead className="text-center">Days Worked</TableHead>
                                            <TableHead className="text-right">Gross Pay</TableHead>
                                            <TableHead className="text-right">Deductions</TableHead>
                                            <TableHead className="text-right">Net Salary</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Voucher</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredPayslips.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                                                    No payslips match your query.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredPayslips.map((slip) => (
                                                <TableRow key={slip.id} className="text-xs hover:bg-muted/40">
                                                    <TableCell className="font-semibold font-mono text-foreground">
                                                        {slip.slipNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-foreground">{slip.employeeName}</div>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            {slip.employeeNumber} {slip.designationTitle ? `• ${slip.designationTitle}` : ""}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        {MONTH_NAMES[slip.periodMonth - 1]} {slip.periodYear}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {slip.presentDays} / {slip.workingDays}
                                                        {slip.unpaidLeaveDays > 0 && (
                                                            <span className="text-red-500 text-[10px] block">
                                                                ({slip.unpaidLeaveDays} unpaid)
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-muted-foreground">
                                                        {formatCurrency(slip.totalGross)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-red-600 dark:text-red-400">
                                                        -{formatCurrency(slip.totalDeductions)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                        {formatCurrency(slip.netSalary)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] ${
                                                                slip.status === "PAID"
                                                                    ? "border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                                                                    : "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                                                            }`}
                                                        >
                                                            {slip.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleViewSlip(slip.id)}
                                                            disabled={isPending}
                                                            className="h-7 px-2.5 text-[11px]"
                                                        >
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            View Slip
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB 3: SALARY STRUCTURES --- */}
                <TabsContent value="structures" className="space-y-4 mt-0">
                    <Card className="border-border">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-semibold">Compensation & Salary Structures</CardTitle>
                                <CardDescription className="text-xs">
                                    Configure wage formulas, statutory deductions (PF, ESI, PT), and allowance splits.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setIsStructureModalOpen(true)}
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                New Structure
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead>Code & Name</TableHead>
                                            <TableHead className="text-center">Basic %</TableHead>
                                            <TableHead className="text-center">HRA %</TableHead>
                                            <TableHead className="text-center">Special %</TableHead>
                                            <TableHead className="text-center">Conveyance / Med</TableHead>
                                            <TableHead className="text-center">PF Rate</TableHead>
                                            <TableHead className="text-center">ESI Rate</TableHead>
                                            <TableHead className="text-center">Prof. Tax</TableHead>
                                            <TableHead className="text-center">Staff Count</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {initialData.salaryStructures.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-xs">
                                                    No salary structures configured yet. Click "New Structure" to create your first template.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            initialData.salaryStructures.map((struct) => (
                                                <TableRow key={struct.id} className="text-xs hover:bg-muted/40">
                                                    <TableCell>
                                                        <div className="font-semibold text-foreground">{struct.name}</div>
                                                        <div className="text-[11px] font-mono text-muted-foreground">{struct.code}</div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-medium">
                                                        {struct.basicPercentage}%
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {struct.hraPercentage}%
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {struct.specialAllowancePct}%
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-muted-foreground">
                                                        ₹{struct.conveyanceMonthly} / ₹{struct.medicalMonthly}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {struct.pfEmployeeRate}%
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {struct.esiEmployeeRate}%
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        ₹{struct.professionalTax}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="font-mono text-[11px]">
                                                            {struct.employeeCount || 0}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-[10px]">
                                                            ACTIVE
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* --- MODAL 1: RUN MONTHLY PAYROLL WIZARD --- */}
            <Dialog open={isRunWizardOpen} onOpenChange={setIsRunWizardOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-emerald-600" />
                            Run Monthly Payroll Cycle
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Select month and disbursement date. The engine will automatically pull attendance logs, calculate statutory deductions, and generate draft payslips.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleGenerateRun} className="space-y-4 py-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Payroll Month *</Label>
                                <Select value={runMonth} onValueChange={setRunMonth}>
                                    <SelectTrigger className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {MONTH_NAMES.map((name, idx) => (
                                            <SelectItem key={idx + 1} value={String(idx + 1)}>
                                                {name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Payroll Year *</Label>
                                <Input
                                    type="number"
                                    value={runYear}
                                    onChange={(e) => setRunYear(e.target.value)}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Scheduled Pay Date *</Label>
                            <Input
                                type="date"
                                value={runPayDate}
                                onChange={(e) => setRunPayDate(e.target.value)}
                                required
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Cycle Notes / Remarks (Optional)</Label>
                            <Textarea
                                placeholder="e.g. Standard September payroll cycle including festival bonus adjustments"
                                value={runNotes}
                                onChange={(e) => setRunNotes(e.target.value)}
                                className="text-xs h-18 resize-none"
                            />
                        </div>

                        <div className="p-3 bg-muted/50 rounded-lg border text-xs space-y-1">
                            <div className="font-semibold text-foreground flex items-center justify-between">
                                <span>Active Employees Included:</span>
                                <span className="font-mono text-emerald-600 font-bold">{initialData.activeEmployees.length} staff</span>
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                All active staff without a custom salary structure will automatically receive standard statutory compensation.
                            </p>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsRunWizardOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isPending ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Computing Calculations...
                                    </>
                                ) : (
                                    "Generate Payroll Run"
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL 2: DISBURSE / RECORD PAYMENT --- */}
            <Dialog open={isDisburseModalOpen} onOpenChange={setIsDisburseModalOpen}>
                <DialogContent className="sm:max-w-[440px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CreditCard className="h-5 w-5 text-emerald-600" />
                            Disburse Payroll Payout
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Confirm salary release for {selectedRunForDisburse?.runNumber}. This marks all associated payslips as PAID.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleDisburseSubmit} className="space-y-4 py-2 text-xs">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-lg space-y-1">
                            <div className="text-[11px] text-muted-foreground uppercase font-semibold">Total Net Payout</div>
                            <div className="text-2xl font-bold font-mono text-emerald-600">
                                {formatCurrency(selectedRunForDisburse?.totalNetPay || 0)}
                            </div>
                            <div className="text-[11px] text-muted-foreground">
                                Disbursing across {selectedRunForDisburse?.employeeCount} employee bank accounts
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Disbursement Method *</Label>
                            <Select value={disburseMethod} onValueChange={setDisburseMethod}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="DIRECT_DEPOSIT">Direct Bank Transfer / NEFT / RTGS</SelectItem>
                                    <SelectItem value="ACH">ACH Direct Credit</SelectItem>
                                    <SelectItem value="CHECK">Corporate Cheque</SelectItem>
                                    <SelectItem value="CASH">Cash Disbursement</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Bank Reference / UTR Number (Optional)</Label>
                            <Input
                                placeholder="e.g. UTR-HDFC982347102"
                                value={disburseRef}
                                onChange={(e) => setDisburseRef(e.target.value)}
                                className="text-xs font-mono"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDisburseModalOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Disburse"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL 3: NEW SALARY STRUCTURE --- */}
            <Dialog open={isStructureModalOpen} onOpenChange={setIsStructureModalOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Shield className="h-5 w-5 text-emerald-600" />
                            Create Salary Compensation Template
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define standard wage components, statutory deduction rates, and allowances.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateStructure} className="space-y-4 py-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Structure Name *</Label>
                                <Input
                                    placeholder="e.g. Executive Management"
                                    value={structName}
                                    onChange={(e) => setStructName(e.target.value)}
                                    required
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Structure Code *</Label>
                                <Input
                                    placeholder="SAL-EXEC"
                                    value={structCode}
                                    onChange={(e) => setStructCode(e.target.value.toUpperCase())}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="border-t pt-3 space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Earnings Percentage Breakdown (% of CTC)
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Basic Salary % *</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={structBasicPct}
                                        onChange={(e) => setStructBasicPct(e.target.value)}
                                        required
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">HRA % *</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={structHraPct}
                                        onChange={(e) => setStructHraPct(e.target.value)}
                                        required
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Special Allowance %</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={structSpecialPct}
                                        onChange={(e) => setStructSpecialPct(e.target.value)}
                                        required
                                        className="text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t pt-3 space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Statutory Deductions Configuration
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">PF Rate % *</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={structPfRate}
                                        onChange={(e) => setStructPfRate(e.target.value)}
                                        required
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">ESI Rate %</Label>
                                    <Input
                                        type="number"
                                        step="any"
                                        value={structEsiRate}
                                        onChange={(e) => setStructEsiRate(e.target.value)}
                                        required
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Prof. Tax (Monthly INR)</Label>
                                    <Input
                                        type="number"
                                        value={structPt}
                                        onChange={(e) => setStructPt(e.target.value)}
                                        required
                                        className="text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsStructureModalOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                Save Structure
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL 4: PRINTABLE PAYSLIP SLIP --- */}
            <Dialog open={isPayslipSlipOpen} onOpenChange={setIsPayslipSlipOpen}>
                <DialogContent className="sm:max-w-[650px] p-0 overflow-hidden">
                    {selectedPayslip && (
                        <div>
                            {/* Printable Container */}
                            <div className="p-6 bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 font-sans space-y-6 print:p-0">
                                {/* Header */}
                                <div className="border-b pb-4 flex items-start justify-between">
                                    <div>
                                        <h3 className="text-xl font-black tracking-tight text-emerald-600">
                                            {selectedPayslip.company.name}
                                        </h3>
                                        <p className="text-xs text-muted-foreground">{selectedPayslip.company.email}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-xs font-mono uppercase bg-muted/60 px-2 py-1 rounded">
                                            {selectedPayslip.slip.slipNumber}
                                        </span>
                                        <p className="text-xs font-bold text-foreground mt-1">
                                            Payslip for {MONTH_NAMES[selectedPayslip.slip.periodMonth - 1]} {selectedPayslip.slip.periodYear}
                                        </p>
                                    </div>
                                </div>

                                {/* Employee Metadata Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-muted/20 p-3 rounded-lg border">
                                    <div>
                                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Employee Name</span>
                                        <span className="font-bold">{selectedPayslip.slip.employee.displayName}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Staff Code</span>
                                        <span className="font-mono">{selectedPayslip.slip.employee.employeeNumber}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Designation</span>
                                        <span>{selectedPayslip.slip.employee.designation?.title || "Staff"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Department</span>
                                        <span>{selectedPayslip.slip.employee.department?.name || "Operations"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Bank Name</span>
                                        <span>{selectedPayslip.slip.bankName || "HDFC Bank"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Account #</span>
                                        <span className="font-mono">{selectedPayslip.slip.bankAccountNumber ? `••••${selectedPayslip.slip.bankAccountNumber.slice(-4)}` : "••••4092"}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Days Worked</span>
                                        <span className="font-bold">{selectedPayslip.slip.presentDays} / {selectedPayslip.slip.workingDays}</span>
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-muted-foreground block uppercase font-semibold">Paid Status</span>
                                        <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-400">
                                            {selectedPayslip.slip.status}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Two-Column Table: Earnings vs Deductions */}
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                                    {/* Earnings */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-emerald-50 dark:bg-emerald-950/40 p-2 font-bold text-emerald-800 dark:text-emerald-300 border-b">
                                            Earnings Breakdown
                                        </div>
                                        <div className="divide-y p-2 space-y-1.5">
                                            <div className="flex justify-between py-1">
                                                <span>Basic Salary</span>
                                                <span className="font-mono">{formatCurrency(selectedPayslip.slip.basicSalary)}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span>House Rent Allowance (HRA)</span>
                                                <span className="font-mono">{formatCurrency(selectedPayslip.slip.hra)}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span>Conveyance Allowance</span>
                                                <span className="font-mono">{formatCurrency(selectedPayslip.slip.conveyance)}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span>Medical Allowance</span>
                                                <span className="font-mono">{formatCurrency(selectedPayslip.slip.medical)}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span>Special Allowance</span>
                                                <span className="font-mono">{formatCurrency(selectedPayslip.slip.specialAllowance)}</span>
                                            </div>
                                            <div className="flex justify-between py-1.5 font-bold border-t bg-muted/20 px-1 rounded">
                                                <span>Total Gross Earnings</span>
                                                <span className="font-mono">{formatCurrency(selectedPayslip.slip.totalGross)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Deductions */}
                                    <div className="border rounded-lg overflow-hidden">
                                        <div className="bg-red-50 dark:bg-red-950/40 p-2 font-bold text-red-800 dark:text-red-300 border-b">
                                            Statutory Deductions
                                        </div>
                                        <div className="divide-y p-2 space-y-1.5">
                                            <div className="flex justify-between py-1">
                                                <span>Provident Fund (PF)</span>
                                                <span className="font-mono text-red-600">-{formatCurrency(selectedPayslip.slip.pfEmployee)}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span>Employee State Insurance (ESI)</span>
                                                <span className="font-mono text-red-600">-{formatCurrency(selectedPayslip.slip.esiEmployee)}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span>Professional Tax (PT)</span>
                                                <span className="font-mono text-red-600">-{formatCurrency(selectedPayslip.slip.professionalTax)}</span>
                                            </div>
                                            <div className="flex justify-between py-1">
                                                <span>TDS (Income Tax)</span>
                                                <span className="font-mono text-red-600">-{formatCurrency(selectedPayslip.slip.tdsDeduction)}</span>
                                            </div>
                                            {selectedPayslip.slip.unpaidLeaveDeduction > 0 && (
                                                <div className="flex justify-between py-1">
                                                    <span>Unpaid Leave Deductions</span>
                                                    <span className="font-mono text-red-600">-{formatCurrency(selectedPayslip.slip.unpaidLeaveDeduction)}</span>
                                                </div>
                                            )}
                                            <div className="flex justify-between py-1.5 font-bold border-t bg-muted/20 px-1 rounded">
                                                <span>Total Deductions</span>
                                                <span className="font-mono text-red-600">-{formatCurrency(selectedPayslip.slip.totalDeductions)}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Net Payable Banner */}
                                <div className="p-4 bg-emerald-600 text-white rounded-lg flex flex-col sm:flex-row items-center justify-between gap-2 shadow-sm">
                                    <div>
                                        <span className="text-[11px] uppercase tracking-wider font-semibold opacity-90 block">Net Payable Amount</span>
                                        <span className="text-2xl font-black font-mono">
                                            {formatCurrency(selectedPayslip.slip.netSalary)}
                                        </span>
                                    </div>
                                    <div className="text-right text-xs opacity-90">
                                        Disbursed via {selectedPayslip.slip.paymentMethod || "Direct Deposit"}
                                    </div>
                                </div>

                                {/* Signatures */}
                                <div className="grid grid-cols-2 gap-8 pt-6 border-t text-[11px] text-muted-foreground">
                                    <div className="text-center pt-8 border-t border-dashed">
                                        Employee Signature
                                    </div>
                                    <div className="text-center pt-8 border-t border-dashed">
                                        Authorized Signatory (HR / Finance)
                                    </div>
                                </div>
                            </div>

                            {/* Modal Actions Footer */}
                            <div className="p-3 bg-muted/30 border-t flex justify-end gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsPayslipSlipOpen(false)}
                                >
                                    Close
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => window.print()}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                >
                                    <Printer className="h-4 w-4 mr-1.5" />
                                    Print Salary Slip
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
