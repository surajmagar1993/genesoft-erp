"use client"

import { useState, useMemo, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  ShieldCheck,
  Building2,
  Calendar,
  CreditCard,
  Download,
  FileSpreadsheet,
  FileText,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Search,
  Filter,
  ArrowUpDown,
  RefreshCw,
  HelpCircle,
  Layers,
  Calculator,
  Percent,
  Landmark,
  BadgeAlert,
  SlidersHorizontal,
  ExternalLink,
  ChevronRight,
  Printer,
  Copy,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import {
  TDS_SECTIONS,
  calculateTds,
  validatePan,
  validateTan,
  IndianTaxQuarter,
} from "@/lib/tds-engine"
import {
  TdsOverviewData,
  TdsDeductionRecord,
  TdsChallanRecord,
  recordTdsChallan,
  updateTdsProfile,
  exportForm26QSummary,
} from "@/app/actions/finance/tds"

interface TdsClientProps {
  initialData: TdsOverviewData
}

export function TdsClient({ initialData }: TdsClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Period filters
  const [selectedFy, setSelectedFy] = useState<string>(initialData.fiscalYear)
  const [selectedQuarter, setSelectedQuarter] = useState<IndianTaxQuarter>(initialData.quarter)
  const [activeTab, setActiveTab] = useState<"ledger" | "challans" | "returns" | "calculator" | "settings">("ledger")

  // Search & Filter in Deductions
  const [searchQuery, setSearchQuery] = useState("")
  const [sectionFilter, setSectionFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")

  // Modal: Record Challan Deposit
  const [isChallanModalOpen, setIsChallanModalOpen] = useState(false)
  const [selectedDeductionsForChallan, setSelectedDeductionsForChallan] = useState<string[]>([])
  const [bsrCode, setBsrCode] = useState("")
  const [challanNo, setChallanNo] = useState("")
  const [depositDate, setDepositDate] = useState(new Date().toISOString().split("T")[0])
  const [challanSection, setChallanSection] = useState("194C")
  const [majorHead, setMajorHead] = useState<"0020" | "0021">("0020")
  const [minorHead, setMinorHead] = useState<"200" | "400">("200")
  const [bankName, setBankName] = useState("State Bank of India")
  const [tenderDate, setTenderDate] = useState(new Date().toISOString().split("T")[0])
  const [taxAmount, setTaxAmount] = useState("")
  const [surcharge, setSurcharge] = useState("0")
  const [cess, setCess] = useState("0")
  const [interest, setInterest] = useState("0")
  const [penalty, setPenalty] = useState("0")
  const [chequeRefNo, setChequeRefNo] = useState("")
  const [challanNotes, setChallanNotes] = useState("")
  const [isSubmittingChallan, setIsSubmittingChallan] = useState(false)

  // Modal: Form 16A Certificate Preview
  const [activeCertDeduction, setActiveCertDeduction] = useState<TdsDeductionRecord | null>(null)

  // Profile Edit State
  const [profileTan, setProfileTan] = useState(initialData.profile.tan || "")
  const [profilePan, setProfilePan] = useState(initialData.profile.pan || "")
  const [profileDeductorName, setProfileDeductorName] = useState(initialData.profile.deductorName || "")
  const [profileCategory, setProfileCategory] = useState(initialData.profile.deductorCategory || "COMPANY")
  const [profilePersonName, setProfilePersonName] = useState(initialData.profile.responsiblePersonName || "")
  const [profilePersonDesignation, setProfilePersonDesignation] = useState(
    initialData.profile.responsiblePersonDesignation || "Director"
  )
  const [profilePersonPan, setProfilePersonPan] = useState(initialData.profile.responsiblePersonPan || "")
  const [profileCity, setProfileCity] = useState(initialData.profile.city || "")
  const [profileState, setProfileState] = useState(initialData.profile.state || "")
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false)

  // Interactive Calculator State
  const [calcGross, setCalcGross] = useState("100000")
  const [calcSection, setCalcSection] = useState("194J_PROF")
  const [calcPan, setCalcPan] = useState("ABCDE1234F")
  const [calcApply206AA, setCalcApply206AA] = useState(true)

  // Live Calculator Calculation
  const calcResult = useMemo(() => {
    const grossNum = parseFloat(calcGross) || 0
    return calculateTds({
      grossAmount: grossNum,
      sectionCode: calcSection,
      deducteePan: calcPan,
      applySection206AA: calcApply206AA,
    })
  }, [calcGross, calcSection, calcPan, calcApply206AA])

  // Change Period Trigger
  const handlePeriodChange = (fy: string, q: IndianTaxQuarter) => {
    setSelectedFy(fy)
    setSelectedQuarter(q)
    startTransition(() => {
      router.push(`/finance/tds?fy=${fy}&q=${q}`)
    })
  }

  // Filtered Deductions
  const filteredDeductions = useMemo(() => {
    return initialData.deductions.filter((d) => {
      const q = searchQuery.toLowerCase()
      const matchesSearch =
        d.vendorName.toLowerCase().includes(q) ||
        (d.vendorPan?.toLowerCase() || "").includes(q) ||
        (d.billNumber?.toLowerCase() || "").includes(q) ||
        d.sectionCode.toLowerCase().includes(q)

      const matchesSection = sectionFilter === "all" || d.sectionCode === sectionFilter
      const matchesStatus = statusFilter === "all" || d.status === statusFilter
      return matchesSearch && matchesSection && matchesStatus
    })
  }, [initialData.deductions, searchQuery, sectionFilter, statusFilter])

  // Open Record Challan Modal with Auto-filled Amount from Selection
  const openChallanForPending = (deductionIds: string[]) => {
    setSelectedDeductionsForChallan(deductionIds)
    const pendingTotal = initialData.deductions
      .filter((d) => deductionIds.includes(d.id))
      .reduce((sum, d) => sum + d.tdsAmount, 0)
    setTaxAmount(String(pendingTotal || initialData.telemetry.totalPending))
    setIsChallanModalOpen(true)
  }

  // Submit Challan
  const handleSubmitChallan = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingChallan(true)
    try {
      const res = await recordTdsChallan({
        bsrCode,
        challanNo,
        depositDate,
        sectionCode: challanSection,
        majorHead,
        minorHead,
        bankName,
        tenderDate,
        taxAmount: parseFloat(taxAmount) || 0,
        surcharge: parseFloat(surcharge) || 0,
        cess: parseFloat(cess) || 0,
        interest: parseFloat(interest) || 0,
        penalty: parseFloat(penalty) || 0,
        chequeRefNo,
        deductionIds: selectedDeductionsForChallan,
        notes: challanNotes,
      })

      if (res.success) {
        toast.success("Challan 281 recorded successfully!", {
          description: `Challan No ${challanNo} (${bsrCode}) for ₹${res.challan?.totalAmount.toLocaleString()} deposited.`,
        })
        setIsChallanModalOpen(false)
        startTransition(() => router.refresh())
      } else {
        toast.error("Failed to record Challan", { description: res.error })
      }
    } catch (err: any) {
      toast.error("Error saving challan", { description: err.message })
    } finally {
      setIsSubmittingChallan(false)
    }
  }

  // Submit Profile Update
  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmittingProfile(true)
    try {
      const res = await updateTdsProfile({
        tan: profileTan,
        pan: profilePan,
        deductorName: profileDeductorName,
        deductorCategory: profileCategory as any,
        responsiblePersonName: profilePersonName,
        responsiblePersonDesignation: profilePersonDesignation,
        responsiblePersonPan: profilePersonPan,
        city: profileCity,
        state: profileState,
      })

      if (res.success) {
        toast.success("Deductor Profile saved successfully!")
        startTransition(() => router.refresh())
      } else {
        toast.error("Failed to update profile", { description: res.error })
      }
    } catch (err: any) {
      toast.error("Error updating profile", { description: err.message })
    } finally {
      setIsSubmittingProfile(false)
    }
  }

  // Export Form 26Q JSON / CSV
  const handleExportForm26Q = async (format: "json" | "csv") => {
    try {
      const res = await exportForm26QSummary(selectedFy, selectedQuarter)
      if (!res.success || !res.form26QData) {
        toast.error("Export failed", { description: res.error })
        return
      }

      if (format === "json") {
        const jsonStr = JSON.stringify(res.form26QData, null, 2)
        const blob = new Blob([jsonStr], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `Form26Q_${selectedFy}_${selectedQuarter}_${initialData.profile.tan || "TAN"}.json`
        a.click()
        toast.success("Form 26Q JSON exported successfully!")
      } else {
        // CSV Annexure export compatible with NSDL e-TDS return utility
        const headers = [
          "Serial No",
          "Deductee Code (01-Co, 02-Other)",
          "Deductee PAN",
          "Deductee Name",
          "TDS Section",
          "Payment / Credit Date",
          "Gross Amount Paid (INR)",
          "TDS Rate (%)",
          "TDS Deducted (INR)",
          "Challan BSR Code",
          "Challan Serial No",
          "Remarks",
        ]
        const rows = res.form26QData.deducteeAnnexure.records.map((r) => [
          r.serialNo,
          r.deducteeCode,
          r.pan,
          `"${r.name.replace(/"/g, '""')}"`,
          r.section,
          r.paymentDate,
          r.grossAmount,
          r.tdsRate,
          r.tdsAmount,
          r.challanBSR,
          r.challanNo,
          `"${r.reasonForNonDeduction}"`,
        ])
        const csvContent = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n")
        const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = `Form26Q_Annexure_${selectedFy}_${selectedQuarter}.csv`
        a.click()
        toast.success("Form 26Q Deductee Annexure CSV downloaded!")
      }
    } catch (err: any) {
      toast.error("Export error", { description: err.message })
    }
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Period Control */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">TDS & Tax Withholding</h1>
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px] font-semibold">
                  Form 26Q & Challan 281
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Indian Income Tax compliance, statutory section rates, PAN validation, and withholding returns.
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* FY Select */}
          <Select value={selectedFy} onValueChange={(val) => handlePeriodChange(val, selectedQuarter)}>
            <SelectTrigger className="w-[125px] h-9 text-xs font-semibold">
              <SelectValue placeholder="FY" />
            </SelectTrigger>
            <SelectContent>
              {initialData.availableFiscalYears.map((fy) => (
                <SelectItem key={fy} value={fy}>
                  FY {fy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Quarter Pills */}
          <div className="flex items-center bg-muted/60 p-0.5 rounded-lg border text-xs">
            {(["Q1", "Q2", "Q3", "Q4"] as IndianTaxQuarter[]).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handlePeriodChange(selectedFy, q)}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  selectedQuarter === q
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {q}
              </button>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-2 font-semibold text-xs h-9"
            onClick={() => handleExportForm26Q("csv")}
          >
            <Download className="h-4 w-4" />
            Export 26Q
          </Button>

          <Button
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs h-9 shadow-xs"
            onClick={() => openChallanForPending(initialData.deductions.filter((d) => d.status === "PENDING").map((d) => d.id))}
          >
            <Plus className="h-4 w-4" />
            Record Challan 281
          </Button>
        </div>
      </div>

      {/* Telemetry 4-Column KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Deducted */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total TDS Deducted</CardTitle>
            <Percent className="h-4 w-4 text-indigo-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-indigo-600 dark:text-indigo-400">
              {formatCurrency(initialData.telemetry.totalDeducted)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <FileText className="h-3 w-3 text-indigo-500" />
              Across {initialData.deductions.length} payments in {selectedQuarter} FY {selectedFy}
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Deposited to Government */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Deposited (Challan 281)</CardTitle>
            <Landmark className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
              {formatCurrency(initialData.telemetry.totalDeposited)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3 text-emerald-500" />
              {initialData.challans.length} paid Challans recorded
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Pending Deposit with Due Date */}
        <Card className={initialData.telemetry.totalPending > 0 ? "border-amber-500/30 bg-amber-500/5" : ""}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending Deposit</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-amber-600 dark:text-amber-400">
              {formatCurrency(initialData.telemetry.totalPending)}
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3 text-amber-500" />
              Due by 7th: {new Date(initialData.telemetry.nextDepositDueDate).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Deductee PAN Compliance */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">PAN Compliance</CardTitle>
            <ShieldCheck className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {initialData.deductions.length > 0
                ? Math.round((initialData.telemetry.panCompliantCount / initialData.deductions.length) * 100)
                : 100}
              %
            </div>
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              {initialData.telemetry.panNonCompliantCount > 0 ? (
                <span className="text-rose-500 font-semibold flex items-center gap-1">
                  <XCircle className="h-3 w-3" /> {initialData.telemetry.panNonCompliantCount} missing PAN (Sec 206AA: 20%)
                </span>
              ) : (
                <span className="text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" /> All deductees PAN verified
                </span>
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Layout */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
        <div className="overflow-x-auto pb-1 scrollbar-none">
          <TabsList className="inline-flex h-auto p-1 bg-muted/60 border rounded-xl gap-1 shrink-0">
            <TabsTrigger
              value="ledger"
              className="gap-2 px-3 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <FileText className="h-3.5 w-3.5 shrink-0" />
              <span>Deductions Ledger</span>
              <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-muted-foreground/10 text-muted-foreground data-[state=active]:bg-indigo-500/15 data-[state=active]:text-indigo-600">
                {initialData.deductions.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="challans"
              className="gap-2 px-3 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Landmark className="h-3.5 w-3.5 shrink-0" />
              <span>Challan 281 Desk</span>
              <span className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold rounded-full bg-muted-foreground/10 text-muted-foreground data-[state=active]:bg-emerald-500/15 data-[state=active]:text-emerald-600">
                {initialData.challans.length}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="returns"
              className="gap-2 px-3 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              <span>Form 26Q Returns</span>
            </TabsTrigger>
            <TabsTrigger
              value="calculator"
              className="gap-2 px-3 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Calculator className="h-3.5 w-3.5 shrink-0" />
              <span>TDS Calculator</span>
            </TabsTrigger>
            <TabsTrigger
              value="settings"
              className="gap-2 px-3 py-2 text-xs font-semibold rounded-lg data-[state=active]:bg-background data-[state=active]:shadow-xs"
            >
              <Building2 className="h-3.5 w-3.5 shrink-0" />
              <span>TAN & Profile</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── TAB 1: DEDUCTIONS LEDGER ────────────────────────────────────── */}
        <TabsContent value="ledger" className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by vendor name, PAN, bill number, or section..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs bg-background"
              />
            </div>

            <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
              <Select value={sectionFilter} onValueChange={setSectionFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-9 text-xs">
                  <SelectValue placeholder="All Sections" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sections</SelectItem>
                  {Object.keys(TDS_SECTIONS).map((secKey) => (
                    <SelectItem key={secKey} value={secKey}>
                      {TDS_SECTIONS[secKey].name.split(":")[0]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[130px] h-9 text-xs">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="PENDING">Pending Deposit</SelectItem>
                  <SelectItem value="DEPOSITED">Deposited</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Deductions Table */}
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>

              <TableHeader>
                <TableRow>
                  <TableHead>Deductee / Vendor</TableHead>
                  <TableHead>PAN & Entity</TableHead>
                  <TableHead>Bill Reference</TableHead>
                  <TableHead>TDS Section</TableHead>
                  <TableHead className="text-right">Gross Amount</TableHead>
                  <TableHead className="text-right">TDS Rate</TableHead>
                  <TableHead className="text-right">TDS Deducted</TableHead>
                  <TableHead className="text-right">Net Payable</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDeductions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                      <ShieldCheck className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No TDS deductions found for {selectedQuarter} FY {selectedFy}.</p>
                      <p className="text-xs mt-1">
                        Deductions are automatically generated when recording Vendor Bills with TDS or via the Record Challan Desk.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDeductions.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>
                        <div className="font-semibold text-sm">{d.vendorName}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {new Date(d.deductionDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs font-semibold">{d.vendorPan || "PANNOTAVBL"}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {d.vendorPan ? (
                            <span className="text-emerald-600">Valid PAN ({d.vendorType})</span>
                          ) : (
                            <span className="text-rose-500 font-semibold">No PAN (20% Sec 206AA)</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{d.billNumber || "Direct Payment"}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-[11px] font-semibold">
                          Sec {d.sectionCode}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCurrency(d.grossAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold">
                        {d.tdsRate}%
                        {d.is206AAPenaltyApplied && (
                          <span className="block text-[9px] text-rose-500 font-normal">206AA</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                        {formatCurrency(d.tdsAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-medium text-muted-foreground">
                        {formatCurrency(d.netPaidAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        {d.status === "DEPOSITED" ? (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                            Deposited
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                            Pending
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs gap-1"
                          onClick={() => setActiveCertDeduction(d)}
                        >
                          <FileText className="h-3.5 w-3.5" />
                          Form 16A
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </TabsContent>

      {/* ── TAB 2: CHALLAN 281 DESK ────────────────────────────────────── */}
      <TabsContent value="challans" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-muted/40 p-4 rounded-lg border">
          <div>
            <h3 className="text-sm font-semibold">Income Tax ITNS 281 Challan Receipts</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Record government tax payments deposited with authorized banks (BSR Code, Challan No, CIN).
            </p>
          </div>
          <Button
            size="sm"
            className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs shadow-xs shrink-0"
            onClick={() => openChallanForPending([])}
          >
            <Plus className="h-4 w-4" />
            New Challan 281 Deposit
          </Button>
        </div>

        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Challan CIN & Serial</TableHead>
                  <TableHead>BSR Code & Bank</TableHead>
                  <TableHead>Deposit Date</TableHead>
                  <TableHead>Section & Head</TableHead>
                  <TableHead className="text-right">Tax Deposited</TableHead>
                  <TableHead className="text-right">Interest / Fees</TableHead>
                  <TableHead className="text-right">Total Challan Amount</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {initialData.challans.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                      <Landmark className="h-10 w-10 mx-auto mb-3 opacity-30" />
                      <p className="font-medium">No Challan 281 tax payments recorded for this period.</p>
                      <p className="text-xs mt-1">
                        When you pay monthly TDS at NSDL/TIN-Protean or online banking, log the CIN challan receipt here.
                      </p>
                    </TableCell>
                  </TableRow>
                ) : (
                  initialData.challans.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>
                        <div className="font-mono text-xs font-bold">Challan #{c.challanNo}</div>
                        {c.chequeRefNo && (
                          <div className="text-[10px] text-muted-foreground">Ref: {c.chequeRefNo}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="font-mono text-xs">{c.bsrCode}</div>
                        <div className="text-xs text-muted-foreground">{c.bankName}</div>
                      </TableCell>
                      <TableCell className="text-xs">
                        {new Date(c.depositDate).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs font-semibold">Sec {c.sectionCode}</div>
                        <div className="text-[10px] text-muted-foreground">
                          Major {c.majorHead} • Minor {c.minorHead}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        {formatCurrency(c.taxAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">
                        {formatCurrency(c.interest + c.penalty)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(c.totalAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                          Paid & Verified
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        </TabsContent>

        {/* ── TAB 3: FORM 26Q QUARTERLY RETURN ───────────────────────────── */}
        <TabsContent value="returns" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="md:col-span-2">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold">
                      Form 26Q Quarterly e-TDS Return Summary
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Statutory statement of deduction of tax under section 200(3) of Income-tax Act, 1961.
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-xs font-semibold">
                    {selectedQuarter} ({selectedFy})
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-muted/40 p-3 rounded-lg border text-xs">
                  <div>
                    <span className="text-muted-foreground block">Deductor TAN:</span>
                    <span className="font-mono font-bold text-sm">{initialData.profile.tan || "Not Configured"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Deductor PAN:</span>
                    <span className="font-mono font-bold text-sm">{initialData.profile.pan || "Not Configured"}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Total Deductees:</span>
                    <span className="font-mono font-bold text-sm">{initialData.deductions.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground block">Form 26Q Due Date:</span>
                    <span className="font-mono font-bold text-sm text-indigo-600">
                      {new Date(initialData.telemetry.form26QDueDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>

                {/* Section-wise breakdown cards */}
                <div className="space-y-2">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Statutory Section-wise Breakdown
                  </h4>
                  <div className="grid gap-2">
                    {initialData.sectionBreakdown.map((sec) => (
                      <div
                        key={sec.sectionCode}
                        className="flex items-center justify-between p-2.5 rounded-md border bg-card text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="font-semibold flex items-center gap-2">
                            <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-[11px]">
                              {sec.sectionCode}
                            </span>
                            <span>{sec.sectionName}</span>
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {sec.deducteeCount} deductee payments recorded
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-bold text-sm">{formatCurrency(sec.totalTds)}</div>
                          <div className="text-[10px] text-muted-foreground">
                            Paid: {formatCurrency(sec.depositedAmount)} • Pending: {formatCurrency(sec.pendingAmount)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Export & Actions Card */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <FileSpreadsheet className="h-5 w-5 text-indigo-600" />
                  e-TDS Filing Package
                </CardTitle>
                <CardDescription className="text-xs">
                  Download returns formatted for the NSDL / Protean e-TDS Return Preparation Utility (RPU).
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs"
                  onClick={() => handleExportForm26Q("csv")}
                >
                  <Download className="h-4 w-4" />
                  Download Deductee Annexure (CSV)
                </Button>

                <Button
                  variant="outline"
                  className="w-full gap-2 text-xs font-semibold"
                  onClick={() => handleExportForm26Q("json")}
                >
                  <Download className="h-4 w-4" />
                  Download Full Form 26Q (JSON)
                </Button>

                <div className="p-3 bg-muted/60 rounded-lg text-xs space-y-1.5 text-muted-foreground">
                  <p className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" /> Filing Checklist:
                  </p>
                  <p>1. TAN & Responsible Person details verified</p>
                  <p>2. All Challan 281 BSR codes matched</p>
                  <p>3. Section 206AA 20% applied to non-PAN vendors</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 4: TDS CALCULATOR & RATE CARD ──────────────────────────── */}
        <TabsContent value="calculator" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Interactive Calculator Box */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Calculator className="h-5 w-5 text-indigo-600" />
                  Statutory TDS Tax Calculator
                </CardTitle>
                <CardDescription className="text-xs">
                  Compute withholding taxes, check Section 206AA PAN penalties, and verify net vendor payable.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-xs font-medium">TDS Section Code *</Label>
                  <Select value={calcSection} onValueChange={setCalcSection}>
                    <SelectTrigger className="text-xs">
                      <SelectValue placeholder="Select Section" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.keys(TDS_SECTIONS).map((secKey) => (
                        <SelectItem key={secKey} value={secKey}>
                          {TDS_SECTIONS[secKey].name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Gross Payment (INR) *</Label>
                    <Input
                      type="number"
                      step="any"
                      value={calcGross}
                      onChange={(e) => setCalcGross(e.target.value)}
                      className="text-xs font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Deductee PAN</Label>
                    <Input
                      placeholder="ABCDE1234F"
                      value={calcPan}
                      onChange={(e) => setCalcPan(e.target.value.toUpperCase())}
                      className="text-xs font-mono"
                      maxLength={10}
                    />
                  </div>
                </div>

                {/* Calculation Output Box */}
                <div className="p-4 bg-muted/60 rounded-xl space-y-2.5 border text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Statutory Section:</span>
                    <span className="font-semibold">{calcResult.sectionName}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Deductee Entity:</span>
                    <span className="font-medium">{calcResult.entityType || "Unknown"}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Applicable Tax Rate:</span>
                    <span className="font-mono font-bold text-sm text-indigo-600">
                      {calcResult.appliedRate}%
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-2 border-b">
                    <span className="text-muted-foreground">TDS Withheld:</span>
                    <span className="font-mono font-bold text-base text-rose-600">
                      - {formatCurrency(calcResult.tdsAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-bold pt-1">
                    <span className="text-foreground">Net Payable to Vendor:</span>
                    <span className="font-mono text-emerald-600 text-base">
                      {formatCurrency(calcResult.netPayableAmount)}
                    </span>
                  </div>

                  {calcResult.is206AAPenaltyApplied && (
                    <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded text-[11px] text-rose-600 flex items-start gap-1.5 font-medium">
                      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                      <div>
                        <strong>Section 206AA Penalty Applied:</strong> Valid PAN not provided. Tax deducted at higher statutory rate of 20%.
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Statutory Rate Card Reference */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Percent className="h-5 w-5 text-emerald-600" />
                  Indian Statutory TDS Rate Card
                </CardTitle>
                <CardDescription className="text-xs">
                  Income Tax Act prescribed rates for common domestic vendor categories.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">Section</TableHead>
                        <TableHead className="text-xs">Nature of Payment</TableHead>
                        <TableHead className="text-right text-xs">Rate</TableHead>
                        <TableHead className="text-right text-xs">Threshold</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {Object.keys(TDS_SECTIONS).map((key) => {
                        const s = TDS_SECTIONS[key]
                        return (
                          <TableRow key={key} className="text-xs">
                            <TableCell className="font-mono font-bold">{s.code.split("_")[0]}</TableCell>
                            <TableCell className="text-muted-foreground max-w-[150px] truncate" title={s.name}>
                              {s.name}
                            </TableCell>
                            <TableCell className="text-right font-mono font-semibold">
                              {s.individualHufRate === s.companyOtherRate
                                ? `${s.individualHufRate}%`
                                : `${s.individualHufRate}% / ${s.companyOtherRate}%`}
                            </TableCell>
                            <TableCell className="text-right font-mono text-muted-foreground">
                              {formatCurrency(s.exemptionThreshold)}
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 5: DEDUCTOR TAN & SETTINGS ─────────────────────────────── */}
        <TabsContent value="settings" className="space-y-4">
          <Card className="max-w-3xl">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building2 className="h-5 w-5 text-indigo-600" />
                Deductor TAN & Legal Tax Profile
              </CardTitle>
              <CardDescription className="text-xs">
                Your company's Tax Deduction Account Number (TAN) and Responsible Person details for statutory Form 26Q quarterly returns.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmitProfile} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Deductor TAN *</Label>
                    <Input
                      placeholder="MUMA12345B"
                      value={profileTan}
                      onChange={(e) => setProfileTan(e.target.value.toUpperCase())}
                      className="text-xs font-mono"
                      maxLength={10}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Company PAN *</Label>
                    <Input
                      placeholder="AAACA1234K"
                      value={profilePan}
                      onChange={(e) => setProfilePan(e.target.value.toUpperCase())}
                      className="text-xs font-mono"
                      maxLength={10}
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Deductor Legal Name *</Label>
                    <Input
                      placeholder="Genesoft Technologies Pvt Ltd"
                      value={profileDeductorName}
                      onChange={(e) => setProfileDeductorName(e.target.value)}
                      className="text-xs"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Deductor Category *</Label>
                    <Select value={profileCategory} onValueChange={(val: any) => setProfileCategory(val)}>
                      <SelectTrigger className="text-xs">
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="COMPANY">Company (Domestic / Private / Public)</SelectItem>
                        <SelectItem value="FIRM">Partnership Firm / LLP</SelectItem>
                        <SelectItem value="INDIVIDUAL">Individual / Proprietorship</SelectItem>
                        <SelectItem value="GOVERNMENT">Government Authority</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="border-t pt-3 space-y-3">
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Principal Officer / Responsible Person
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Responsible Person Name *</Label>
                      <Input
                        placeholder="Rajesh Sharma"
                        value={profilePersonName}
                        onChange={(e) => setProfilePersonName(e.target.value)}
                        className="text-xs"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Designation</Label>
                      <Input
                        placeholder="Director / Principal Officer"
                        value={profilePersonDesignation}
                        onChange={(e) => setProfilePersonDesignation(e.target.value)}
                        className="text-xs"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-medium">Responsible Person PAN</Label>
                      <Input
                        placeholder="ABCPS1234K"
                        value={profilePersonPan}
                        onChange={(e) => setProfilePersonPan(e.target.value.toUpperCase())}
                        className="text-xs font-mono"
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">City / Town</Label>
                    <Input
                      placeholder="Mumbai"
                      value={profileCity}
                      onChange={(e) => setProfileCity(e.target.value)}
                      className="text-xs"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-medium">State</Label>
                    <Input
                      placeholder="Maharashtra"
                      value={profileState}
                      onChange={(e) => setProfileState(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button type="submit" size="sm" disabled={isSubmittingProfile} className="gap-2">
                    {isSubmittingProfile && <RefreshCw className="h-4 w-4 animate-spin" />}
                    Save Deductor Profile
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── MODAL: RECORD CHALLAN 281 ─────────────────────────────────────── */}
      <Dialog open={isChallanModalOpen} onOpenChange={setIsChallanModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Landmark className="h-5 w-5 text-indigo-600" />
              Record Challan 281 Deposit
            </DialogTitle>
            <DialogDescription className="text-xs">
              Record tax payment deposit to the Income Tax Department (OLTAS / TIN-Protean).
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmitChallan} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Bank BSR Code (7 Digits) *</Label>
                <Input
                  placeholder="0210001"
                  value={bsrCode}
                  onChange={(e) => setBsrCode(e.target.value)}
                  maxLength={7}
                  required
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Challan Serial No *</Label>
                <Input
                  placeholder="00042"
                  value={challanNo}
                  onChange={(e) => setChallanNo(e.target.value)}
                  maxLength={5}
                  required
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Deposit Date *</Label>
                <Input
                  type="date"
                  value={depositDate}
                  onChange={(e) => setDepositDate(e.target.value)}
                  required
                  className="text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Major Head</Label>
                <Select value={majorHead} onValueChange={(val: any) => setMajorHead(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0020">0020 - Companies</SelectItem>
                    <SelectItem value="0021">0021 - Non-Companies</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Minor Head</Label>
                <Select value={minorHead} onValueChange={(val: any) => setMinorHead(val)}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="200">200 - TDS Taxpayer</SelectItem>
                    <SelectItem value="400">400 - Assessment</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Bank Name</Label>
                <Input
                  placeholder="State Bank of India"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="text-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Section Code</Label>
                <Select value={challanSection} onValueChange={setChallanSection}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.keys(TDS_SECTIONS).map((k) => (
                      <SelectItem key={k} value={k}>
                        {TDS_SECTIONS[k].name.split(":")[0]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs font-medium">Tax Amount (INR) *</Label>
                <Input
                  type="number"
                  step="any"
                  value={taxAmount}
                  onChange={(e) => setTaxAmount(e.target.value)}
                  required
                  className="text-xs font-mono font-bold text-indigo-600"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Interest (INR)</Label>
                <Input
                  type="number"
                  step="any"
                  value={interest}
                  onChange={(e) => setInterest(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-medium">Fee / Penalty</Label>
                <Input
                  type="number"
                  step="any"
                  value={penalty}
                  onChange={(e) => setPenalty(e.target.value)}
                  className="text-xs font-mono"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Cheque / Reference / UTR #</Label>
              <Input
                placeholder="UTR / Cheque No"
                value={chequeRefNo}
                onChange={(e) => setChequeRefNo(e.target.value)}
                className="text-xs font-mono"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsChallanModalOpen(false)}
                disabled={isSubmittingChallan}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingChallan}
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmittingChallan && <RefreshCw className="h-4 w-4 animate-spin" />}
                Confirm Challan 281
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: FORM 16A CERTIFICATE SUMMARY PREVIEW ──────────────────── */}
      {activeCertDeduction && (
        <Dialog open={!!activeCertDeduction} onOpenChange={() => setActiveCertDeduction(null)}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-indigo-600" />
                Form 16A Certificate Summary
              </DialogTitle>
              <DialogDescription className="text-xs">
                Certificate under section 203 of the Income-tax Act, 1961 for tax deducted at source.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-muted/60 rounded-lg space-y-2 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Certificate For:</span>
                  <span className="font-bold">{activeCertDeduction.vendorName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deductee PAN:</span>
                  <span className="font-mono font-semibold">{activeCertDeduction.vendorPan || "PANNOTAVBL"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Deductor TAN:</span>
                  <span className="font-mono font-semibold">{initialData.profile.tan || "Not Configured"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Fiscal Period:</span>
                  <span>{activeCertDeduction.quarter} (FY {activeCertDeduction.fiscalYear})</span>
                </div>
              </div>

              <div className="p-3 border rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Nature of Payment:</span>
                  <span className="font-semibold">{activeCertDeduction.sectionName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Gross Amount Paid:</span>
                  <span className="font-mono font-semibold">{formatCurrency(activeCertDeduction.grossAmount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">TDS Rate:</span>
                  <span className="font-mono font-semibold">{activeCertDeduction.tdsRate}%</span>
                </div>
                <div className="flex justify-between border-t pt-2 font-bold text-indigo-600 dark:text-indigo-400">
                  <span>Tax Deducted & Deposited:</span>
                  <span className="font-mono text-sm">{formatCurrency(activeCertDeduction.tdsAmount)}</span>
                </div>
              </div>

              {activeCertDeduction.challanBSR && (
                <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-md text-emerald-700 dark:text-emerald-300 text-[11px] space-y-1">
                  <div className="font-semibold">Deposit Reference:</div>
                  <div>Challan Serial No: {activeCertDeduction.challanNo} • BSR: {activeCertDeduction.challanBSR}</div>
                  <div>Date: {activeCertDeduction.challanDate ? new Date(activeCertDeduction.challanDate).toLocaleDateString("en-IN") : "—"}</div>
                </div>
              )}
            </div>

            <DialogFooter className="pt-2">
              <Button variant="outline" size="sm" onClick={() => setActiveCertDeduction(null)}>
                Close
              </Button>
              <Button
                size="sm"
                className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                onClick={() => {
                  window.print()
                }}
              >
                <Printer className="h-4 w-4" />
                Print Certificate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
