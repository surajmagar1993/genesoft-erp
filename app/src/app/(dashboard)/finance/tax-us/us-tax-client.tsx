"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  exportUsTaxCsv,
  export1099FireCsvAction,
  saveExemptionCertificateAction,
  updateVendorW9Action,
} from "@/app/actions/finance/us-tax"
import {
  US_STATE_TAX_RULES,
  calculateUsSalesTax,
  validateUsEin,
  ExemptionType,
  EXEMPTION_STATUTES,
  UsTaxOverviewReport,
  UsStateSchedule,
  Us1099VendorRecord,
  UsExemptionCertificate,
} from "@/lib/us-tax-engine"
import {
  Landmark,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Calendar,
  DollarSign,
  Search,
  ShieldCheck,
  Building2,
  Copy,
  Receipt,
  Users,
  TrendingUp,
  AlertTriangle,
  ArrowUpRight,
  Filter,
  FileCheck,
  Plus,
  RefreshCw,
  HelpCircle,
  SlidersHorizontal,
  FileText,
  BadgePercent,
  Calculator,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface Props {
  initialData: UsTaxOverviewReport
}

export function UsTaxClient({ initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // Selected Period Filters
  const [selectedYear, setSelectedYear] = useState<number>(initialData.taxYear)
  const [selectedQuarter, setSelectedQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4" | "ALL">(
    initialData.quarter
  )

  // Tab State
  const [activeTab, setActiveTab] = useState<"nexus_states" | "form_1099" | "exemptions" | "simulator" | "guidelines">(
    "nexus_states"
  )

  // Filters for State Schedules
  const [stateSearch, setStateSearch] = useState("")
  const [stateFilter, setStateFilter] = useState<"ALL" | "NEXUS" | "APPROACHING" | "NOMAD">("ALL")

  // Filters for 1099 Records
  const [vendorSearch, setVendorSearch] = useState("")
  const [vendorFilter, setVendorFilter] = useState<"ALL" | "REQUIRED" | "MISSING_TIN">("ALL")

  // Filters for Certificates
  const [certSearch, setCertSearch] = useState("")
  const [certFilter, setCertFilter] = useState<"ALL" | "ACTIVE" | "EXPIRING">("ALL")

  // 1099 Official Slip Modal State
  const [selected1099Record, setSelected1099Record] = useState<Us1099VendorRecord | null>(null)
  const [is1099ModalOpen, setIs1099ModalOpen] = useState(false)

  // Register Exemption Modal
  const [isCertModalOpen, setIsCertModalOpen] = useState(false)
  const [certForm, setCertForm] = useState({
    customerId: "",
    customerName: "",
    certificateNumber: "",
    issuingState: "CA",
    exemptionType: "RESALE" as ExemptionType,
    expiryDate: `${selectedYear + 1}-12-31`,
  })

  // W-9 / EIN Edit Modal
  const [isW9ModalOpen, setIsW9ModalOpen] = useState(false)
  const [w9Form, setW9Form] = useState({
    vendorId: "",
    vendorName: "",
    ein: "",
  })

  // Interactive Tax Simulator State
  const [simOrigin, setSimOrigin] = useState("CA")
  const [simDestination, setSimDestination] = useState("NY")
  const [simAmount, setSimAmount] = useState<number>(1000)
  const [simIsExempt, setSimIsExempt] = useState(false)
  const [simExemptType, setSimExemptType] = useState<ExemptionType>("RESALE")

  // Period Change Navigation
  const handlePeriodChange = (year: number, quarter: "Q1" | "Q2" | "Q3" | "Q4" | "ALL") => {
    setSelectedYear(year)
    setSelectedQuarter(quarter)
    startTransition(() => {
      router.push(`/finance/tax-us?taxYear=${year}&quarter=${quarter}`)
    })
  }

  // Export State Schedule CSV
  const handleExportStateCsv = async () => {
    try {
      const csvStr = await exportUsTaxCsv({
        taxYear: selectedYear,
        quarter: selectedQuarter,
      })
      const blob = new Blob([csvStr], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `US_State_Sales_Tax_Schedule_${selectedYear}_${selectedQuarter}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("State Sales Tax Schedule CSV exported successfully")
    } catch {
      toast.error("Failed to export Sales Tax CSV")
    }
  }

  // Export IRS FIRE 1099 CSV
  const handleExportFireCsv = async () => {
    try {
      const csvStr = await export1099FireCsvAction({ taxYear: selectedYear })
      const blob = new Blob([csvStr], { type: "text/csv" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `IRS_FIRE_1099_Report_${selectedYear}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("IRS Form 1099 FIRE CSV exported successfully")
    } catch {
      toast.error("Failed to export IRS FIRE 1099 CSV")
    }
  }

  // Filtered State Schedules
  const filteredStates = initialData.stateSchedules.filter((s: UsStateSchedule) => {
    const matchesSearch =
      s.stateName.toLowerCase().includes(stateSearch.toLowerCase()) ||
      s.stateCode.toLowerCase().includes(stateSearch.toLowerCase())
    if (!matchesSearch) return false

    if (stateFilter === "NEXUS") return s.nexusStatus === "ACTIVE_NEXUS"
    if (stateFilter === "APPROACHING") return s.nexusStatus === "APPROACHING"
    if (stateFilter === "NOMAD") return s.nexusStatus === "EXEMPT_NOMAD"
    return true
  })

  // Filtered 1099 Records
  const filteredVendors = initialData.vendor1099Records.filter((v: Us1099VendorRecord) => {
    const matchesSearch =
      v.vendorName.toLowerCase().includes(vendorSearch.toLowerCase()) ||
      v.tin.includes(vendorSearch)
    if (!matchesSearch) return false

    if (vendorFilter === "REQUIRED") return v.filingStatus === "REQUIRED"
    if (vendorFilter === "MISSING_TIN") return !v.isTinValid
    return true
  })

  // Filtered Certificates
  const filteredCerts = initialData.exemptionCertificates.filter((c: UsExemptionCertificate) => {
    const matchesSearch =
      c.customerName.toLowerCase().includes(certSearch.toLowerCase()) ||
      c.certificateNumber.toLowerCase().includes(certSearch.toLowerCase()) ||
      c.issuingState.toLowerCase().includes(certSearch.toLowerCase())
    if (!matchesSearch) return false

    if (certFilter === "ACTIVE") return c.status === "ACTIVE"
    if (certFilter === "EXPIRING") return c.status === "EXPIRING_SOON" || c.status === "EXPIRED"
    return true
  })

  // Simulator Calculation Result
  const simResult = calculateUsSalesTax({
    originState: simOrigin,
    destinationState: simDestination,
    amount: simAmount || 0,
    isExempt: simIsExempt,
    exemptionType: simExemptType,
  })

  // Open 1099 Modal
  const handleOpen1099Modal = (record: Us1099VendorRecord) => {
    setSelected1099Record(record)
    setIs1099ModalOpen(true)
  }

  // Save Certificate
  const handleSaveCert = async () => {
    if (!certForm.customerId && !certForm.customerName) {
      toast.error("Please enter customer name or ID")
      return
    }
    if (!certForm.certificateNumber) {
      toast.error("Please enter certificate number")
      return
    }

    try {
      const res = await saveExemptionCertificateAction({
        customerId: certForm.customerId || "default",
        certificateNumber: certForm.certificateNumber,
        issuingState: certForm.issuingState,
        exemptionType: certForm.exemptionType,
        expiryDate: certForm.expiryDate,
      })
      toast.success(res.message)
      setIsCertModalOpen(false)
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to register exemption certificate")
    }
  }

  // Update Vendor W-9 / EIN
  const handleSaveW9 = async () => {
    if (!w9Form.vendorId) {
      toast.error("Invalid vendor ID")
      return
    }
    const valCheck = validateUsEin(w9Form.ein)
    if (!valCheck.isValid) {
      toast.error(valCheck.error || "Please enter a valid 9-digit EIN (XX-XXXXXXX)")
      return
    }

    try {
      const res = await updateVendorW9Action({
        vendorId: w9Form.vendorId,
        ein: w9Form.ein,
      })
      toast.success(res.message)
      setIsW9ModalOpen(false)
      startTransition(() => {
        router.refresh()
      })
    } catch (err: any) {
      toast.error(err.message || "Failed to update vendor EIN")
    }
  }

  const { telemetry } = initialData

  return (
    <div className="space-y-6">
      {/* ── Top Header & Actions ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="text-3xl">🇺🇸</span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                US Sales Tax, Nexus & IRS Form 1099 Desk
              </h1>
              <p className="text-sm text-muted-foreground">
                South Dakota v. Wayfair economic nexus monitoring, destination vs origin rules, Form 1099-NEC & 1099-MISC contractor reporting, and exemption certificates vault.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Period Selector */}
          <div className="flex items-center rounded-lg border bg-card p-1 shadow-sm">
            <select
              value={selectedYear}
              onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10), selectedQuarter)}
              className="bg-transparent px-2 py-1 text-xs font-semibold focus:outline-none"
            >
              <option value={2026}>TY 2026</option>
              <option value={2025}>TY 2025</option>
              <option value={2024}>TY 2024</option>
            </select>
            <span className="text-muted-foreground">|</span>
            <select
              value={selectedQuarter}
              onChange={(e) => handlePeriodChange(selectedYear, e.target.value as any)}
              className="bg-transparent px-2 py-1 text-xs font-semibold focus:outline-none"
            >
              <option value="ALL">Full Year</option>
              <option value="Q1">Q1 (Jan-Mar)</option>
              <option value="Q2">Q2 (Apr-Jun)</option>
              <option value="Q3">Q3 (Jul-Sep)</option>
              <option value="Q4">Q4 (Oct-Dec)</option>
            </select>
          </div>

          <Button size="sm" variant="outline" onClick={handleExportStateCsv} className="gap-1 text-xs">
            <Download className="h-3.5 w-3.5" /> State Tax CSV
          </Button>

          <Button size="sm" variant="outline" onClick={handleExportFireCsv} className="gap-1 text-xs">
            <Download className="h-3.5 w-3.5" /> IRS FIRE 1099
          </Button>

          <Button size="sm" variant="default" onClick={() => window.print()} className="gap-1 text-xs">
            <Printer className="h-3.5 w-3.5" /> Print Worksheet
          </Button>
        </div>
      </div>

      {/* ── 4-Card Telemetry Bar ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Total Sales Tax Collected */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Sales Tax Collected
            </CardTitle>
            <div className="rounded-md bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              ${telemetry.totalSalesTaxCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>Gross: ${telemetry.totalGrossSales.toLocaleString("en-US")}</span>
              <span className="text-emerald-600 font-medium">Exempt: ${telemetry.totalExemptSales.toLocaleString("en-US")}</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Multi-State Nexus Risk */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Economic Nexus Radar
            </CardTitle>
            <div className="rounded-md bg-amber-500/10 p-2 text-amber-600 dark:text-amber-400">
              <TrendingUp className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold tracking-tight text-foreground">
                {telemetry.activeNexusCount}
              </span>
              <span className="text-xs text-muted-foreground">Active Nexus States</span>
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-amber-600 font-medium">
                {telemetry.approachingNexusCount} Approaching (&gt;70%)
              </span>
              <span>{telemetry.monitoredStatesCount} Monitored</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Form 1099-NEC Liabilities */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              IRS 1099-NEC Volume
            </CardTitle>
            <div className="rounded-md bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              ${telemetry.total1099ReportableAmount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{telemetry.reportable1099VendorCount} Contractors &ge; $600</span>
              <span className="text-blue-600 font-medium">Due Jan 31</span>
            </div>
          </CardContent>
        </Card>

        {/* Card 4: W-9 & Exemption Compliance */}
        <Card className="border-border/60 bg-gradient-to-br from-card to-card/60 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Tax Compliance Rate
            </CardTitle>
            <div className="rounded-md bg-purple-500/10 p-2 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight text-foreground">
              {telemetry.w9ComplianceRate}%
            </div>
            <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>W-9s Verified</span>
              <span className="text-purple-600 font-medium">
                {telemetry.activeCertificatesCount} Active Resale Certs
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed Interface ── */}
      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)}>
        <TabsList className="grid w-full grid-cols-2 lg:w-auto lg:inline-flex lg:grid-cols-5">
          <TabsTrigger value="nexus_states" className="gap-2 text-xs">
            <Landmark className="h-3.5 w-3.5" /> State Nexus & Rates ({filteredStates.length})
          </TabsTrigger>
          <TabsTrigger value="form_1099" className="gap-2 text-xs">
            <Users className="h-3.5 w-3.5" /> IRS Form 1099 Desk ({initialData.vendor1099Records.length})
          </TabsTrigger>
          <TabsTrigger value="exemptions" className="gap-2 text-xs">
            <ShieldCheck className="h-3.5 w-3.5" /> Exemption Vault ({initialData.exemptionCertificates.length})
          </TabsTrigger>
          <TabsTrigger value="simulator" className="gap-2 text-xs">
            <Calculator className="h-3.5 w-3.5" /> Tax Simulator
          </TabsTrigger>
          <TabsTrigger value="guidelines" className="gap-2 text-xs">
            <HelpCircle className="h-3.5 w-3.5" /> IRS & Nexus Law
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: State Nexus & Sales Tax Schedule ── */}
        <TabsContent value="nexus_states" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">
                  Multi-State Sales Tax Schedule & Economic Nexus Tracker
                </CardTitle>
                <CardDescription className="text-xs">
                  50-state tax schedule applying statutory destination/origin sourcing rules and South Dakota v. Wayfair thresholds.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search state..."
                    value={stateSearch}
                    onChange={(e) => setStateSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs">
                  <button
                    onClick={() => setStateFilter("ALL")}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      stateFilter === "ALL" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    All ({initialData.stateSchedules.length})
                  </button>
                  <button
                    onClick={() => setStateFilter("NEXUS")}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      stateFilter === "NEXUS" ? "bg-background shadow-xs text-red-600 dark:text-red-400" : "text-muted-foreground"
                    }`}
                  >
                    Active Nexus ({telemetry.activeNexusCount})
                  </button>
                  <button
                    onClick={() => setStateFilter("APPROACHING")}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      stateFilter === "APPROACHING" ? "bg-background shadow-xs text-amber-600 dark:text-amber-400" : "text-muted-foreground"
                    }`}
                  >
                    Approaching ({telemetry.approachingNexusCount})
                  </button>
                  <button
                    onClick={() => setStateFilter("NOMAD")}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      stateFilter === "NOMAD" ? "bg-background shadow-xs text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                    }`}
                  >
                    NOMAD (5)
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 text-[11px]">
                      <TableHead className="w-12">State</TableHead>
                      <TableHead>Jurisdiction</TableHead>
                      <TableHead>Sourcing</TableHead>
                      <TableHead className="text-right">Base / Local Rate</TableHead>
                      <TableHead className="text-right">Combined</TableHead>
                      <TableHead className="text-right">Gross Sales</TableHead>
                      <TableHead className="text-right">Taxable Base</TableHead>
                      <TableHead className="text-right">Tax Collected</TableHead>
                      <TableHead className="w-48">Economic Nexus ($100k/$500k)</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Filing Due Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredStates.map((s: UsStateSchedule) => (
                      <TableRow key={s.stateCode} className="hover:bg-muted/30 text-xs">
                        <TableCell className="font-mono font-bold text-foreground">
                          {s.stateCode}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{s.stateName}</div>
                          <div className="text-[10px] text-muted-foreground truncate max-w-[160px]">
                            {s.filingAgency}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0 font-normal ${
                              s.sourcingRule === "DESTINATION"
                                ? "border-blue-500/30 text-blue-600 dark:text-blue-400"
                                : "border-purple-500/30 text-purple-600 dark:text-purple-400"
                            }`}
                          >
                            {s.sourcingRule}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          {s.stateBaseRate.toFixed(2)}% + {s.avgLocalRate.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold">
                          {s.combinedAvgRate.toFixed(2)}%
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${s.grossSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          ${s.taxableSales.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          ${s.totalTaxCollected.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                              <span>${s.grossSales.toLocaleString("en-US")}</span>
                              <span>${s.nexusThreshold.toLocaleString("en-US")}</span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  s.nexusStatus === "ACTIVE_NEXUS"
                                    ? "bg-red-500"
                                    : s.nexusStatus === "APPROACHING"
                                    ? "bg-amber-500"
                                    : s.nexusStatus === "EXEMPT_NOMAD"
                                    ? "bg-blue-400"
                                    : "bg-emerald-500"
                                }`}
                                style={{ width: `${Math.min(100, s.nexusProgressPct)}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {s.nexusStatus === "ACTIVE_NEXUS" ? (
                            <Badge className="bg-red-500/15 text-red-600 hover:bg-red-500/20 border-red-500/30 text-[10px]">
                              Nexus Active
                            </Badge>
                          ) : s.nexusStatus === "APPROACHING" ? (
                            <Badge className="bg-amber-500/15 text-amber-600 hover:bg-amber-500/20 border-amber-500/30 text-[10px]">
                              Approaching ({s.nexusProgressPct}%)
                            </Badge>
                          ) : s.nexusStatus === "EXEMPT_NOMAD" ? (
                            <Badge className="bg-blue-500/15 text-blue-600 hover:bg-blue-500/20 border-blue-500/30 text-[10px]">
                              NOMAD 0%
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-muted-foreground text-[10px]">
                              Monitored ({s.nexusProgressPct}%)
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-[11px]">
                          {s.filingDueDate}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: IRS Form 1099 Compliance Desk ── */}
        <TabsContent value="form_1099" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">
                  IRS Form 1099-NEC & 1099-MISC Contractor Reporting
                </CardTitle>
                <CardDescription className="text-xs">
                  IRC Section 6041 compliance: Track payments &ge; $600 to independent contractors, verify Form W-9 TINs, and generate IRS FIRE copyable slips.
                </CardDescription>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search vendor / EIN..."
                    value={vendorSearch}
                    onChange={(e) => setVendorSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <div className="flex rounded-md border bg-muted/40 p-0.5 text-xs">
                  <button
                    onClick={() => setVendorFilter("ALL")}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      vendorFilter === "ALL" ? "bg-background shadow-xs text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    All Vendors ({initialData.vendor1099Records.length})
                  </button>
                  <button
                    onClick={() => setVendorFilter("REQUIRED")}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      vendorFilter === "REQUIRED" ? "bg-background shadow-xs text-blue-600 dark:text-blue-400" : "text-muted-foreground"
                    }`}
                  >
                    1099 Required ({telemetry.reportable1099VendorCount})
                  </button>
                  <button
                    onClick={() => setVendorFilter("MISSING_TIN")}
                    className={`px-2 py-1 rounded text-xs font-medium ${
                      vendorFilter === "MISSING_TIN" ? "bg-background shadow-xs text-red-600 dark:text-red-400" : "text-muted-foreground"
                    }`}
                  >
                    Missing TIN
                  </button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {filteredVendors.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium">No vendor records match criteria</p>
                  <p className="text-xs">Vendor accounts payable bills in the selected calendar tax year will automatically populate here.</p>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-[11px]">
                        <TableHead>Vendor / Payee</TableHead>
                        <TableHead>TIN / EIN</TableHead>
                        <TableHead>W-9 Status</TableHead>
                        <TableHead>Form Type</TableHead>
                        <TableHead className="text-right">Total Payments ($)</TableHead>
                        <TableHead className="text-right">Box 1 Reportable</TableHead>
                        <TableHead>Filing Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVendors.map((v: Us1099VendorRecord) => (
                        <TableRow key={v.vendorId} className="hover:bg-muted/30 text-xs">
                          <TableCell>
                            <div className="font-medium text-foreground">{v.vendorName}</div>
                            <div className="text-[10px] text-muted-foreground">ID: {v.vendorId.substring(0, 8)}...</div>
                          </TableCell>
                          <TableCell className="font-mono">
                            {v.tin ? (
                              <div className="flex items-center gap-1.5">
                                <span>{v.maskedTin}</span>
                                {v.isTinValid ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                ) : (
                                  <AlertCircle className="h-3 w-3 text-red-500" />
                                )}
                              </div>
                            ) : (
                              <span className="text-red-500 text-[11px] font-semibold flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" /> Missing TIN
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            {v.w9Status === "VERIFIED" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                                W-9 Verified
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">
                                W-9 Needed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-mono">
                              {v.formType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-medium">
                            ${v.totalPaid.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-foreground">
                            ${(v.box1NecAmount || v.box1MiscRents).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                          </TableCell>
                          <TableCell>
                            {v.filingStatus === "REQUIRED" ? (
                              <Badge className="bg-blue-500/15 text-blue-600 border-blue-500/30 text-[10px]">
                                1099 Required (&ge;$600)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px]">
                                &lt; $600 Exemption
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleOpen1099Modal(v)}
                                className="h-7 px-2 text-[11px] gap-1"
                              >
                                <FileText className="h-3 w-3" /> Form 1099
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => {
                                  setW9Form({
                                    vendorId: v.vendorId,
                                    vendorName: v.vendorName,
                                    ein: v.tin || "",
                                  })
                                  setIsW9ModalOpen(true)
                                }}
                                className="h-7 px-2 text-[11px]"
                              >
                                Edit W-9
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 3: Exemption Certificates Vault ── */}
        <TabsContent value="exemptions" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-4">
              <div>
                <CardTitle className="text-base font-semibold">
                  Multi-State Sales Tax Exemption Certificates Vault
                </CardTitle>
                <CardDescription className="text-xs">
                  Manage Uniform Resale Certificates (MTC), Form ST-120 (NY), CDTFA-230 (CA), 501(c)(3) charities, and government tax waivers.
                </CardDescription>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-48">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search certificates..."
                    value={certSearch}
                    onChange={(e) => setCertSearch(e.target.value)}
                    className="h-8 pl-8 text-xs"
                  />
                </div>

                <Button
                  size="sm"
                  onClick={() => setIsCertModalOpen(true)}
                  className="gap-1 h-8 text-xs"
                >
                  <Plus className="h-3.5 w-3.5" /> Register Certificate
                </Button>
              </div>
            </CardHeader>

            <CardContent>
              {filteredCerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                  <ShieldCheck className="h-10 w-10 text-muted-foreground/50 mb-2" />
                  <p className="text-sm font-medium">No exemption certificates registered</p>
                  <p className="text-xs mb-3">Add wholesale resale or non-profit exemption certificates to eliminate sales tax on qualifying B2B transactions.</p>
                  <Button size="sm" onClick={() => setIsCertModalOpen(true)} className="text-xs">
                    Register Exemption Certificate
                  </Button>
                </div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/40 text-[11px]">
                        <TableHead>Customer Entity</TableHead>
                        <TableHead>Certificate #</TableHead>
                        <TableHead>Issuing State</TableHead>
                        <TableHead>Exemption Category</TableHead>
                        <TableHead>Statutory Legal Authority</TableHead>
                        <TableHead>Expiration</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCerts.map((c: UsExemptionCertificate) => (
                        <TableRow key={c.id} className="hover:bg-muted/30 text-xs">
                          <TableCell className="font-medium text-foreground">
                            {c.customerName}
                          </TableCell>
                          <TableCell className="font-mono font-semibold">
                            {c.certificateNumber}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="font-mono text-[10px]">
                              {c.issuingState}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium">
                              {EXEMPTION_STATUTES[c.exemptionType as ExemptionType]?.title || c.exemptionType}
                            </span>
                          </TableCell>
                          <TableCell className="text-[11px] text-muted-foreground max-w-[200px] truncate">
                            {c.statutoryClause}
                          </TableCell>
                          <TableCell className="font-mono text-muted-foreground">
                            {c.expiryDate}
                          </TableCell>
                          <TableCell>
                            {c.status === "ACTIVE" ? (
                              <Badge className="bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-[10px]">
                                Active ({c.daysToExpiry}d left)
                              </Badge>
                            ) : c.status === "EXPIRING_SOON" ? (
                              <Badge className="bg-amber-500/15 text-amber-600 border-amber-500/30 text-[10px]">
                                Expiring Soon ({c.daysToExpiry}d)
                              </Badge>
                            ) : (
                              <Badge className="bg-red-500/15 text-red-600 border-red-500/30 text-[10px]">
                                Expired
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: Interactive Tax Simulator ── */}
        <TabsContent value="simulator" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Input Controls */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Calculator className="h-4 w-4 text-primary" /> Multi-State Sourcing & Tax Calculator
                </CardTitle>
                <CardDescription className="text-xs">
                  Simulate destination vs origin rules, local rate calculations, and tax-exempt transactions across all 50 states.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="font-medium text-foreground block mb-1">
                      Origin State (Seller Hub)
                    </label>
                    <select
                      value={simOrigin}
                      onChange={(e) => setSimOrigin(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none"
                    >
                      {Object.keys(US_STATE_TAX_RULES).map((code) => (
                        <option key={code} value={code}>
                          {code} - {US_STATE_TAX_RULES[code].stateName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="font-medium text-foreground block mb-1">
                      Destination State (Ship-To)
                    </label>
                    <select
                      value={simDestination}
                      onChange={(e) => setSimDestination(e.target.value)}
                      className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none"
                    >
                      {Object.keys(US_STATE_TAX_RULES).map((code) => (
                        <option key={code} value={code}>
                          {code} - {US_STATE_TAX_RULES[code].stateName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">
                    Taxable Sale Amount ($ USD)
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      type="number"
                      value={simAmount}
                      onChange={(e) => setSimAmount(parseFloat(e.target.value) || 0)}
                      className="pl-8 text-xs font-mono"
                    />
                  </div>
                </div>

                <div className="rounded-lg border p-3 bg-muted/20 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={simIsExempt}
                      onChange={(e) => setSimIsExempt(e.target.checked)}
                      className="rounded border"
                    />
                    <span className="font-medium text-foreground">Apply Exemption Certificate</span>
                  </label>

                  {simIsExempt && (
                    <div>
                      <label className="font-medium text-muted-foreground block mb-1">
                        Exemption Category
                      </label>
                      <select
                        value={simExemptType}
                        onChange={(e) => setSimExemptType(e.target.value as any)}
                        className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none"
                      >
                        {Object.entries(EXEMPTION_STATUTES).map(([key, item]) => (
                          <option key={key} value={key}>
                            {item.title}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Live Calculation Result Card */}
            <Card className="border-border/60 bg-gradient-to-br from-card via-card to-primary/5">
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center justify-between">
                  <span>Computed Tax Breakdown</span>
                  <Badge variant="outline" className="font-mono text-xs">
                    {simResult.applicableState} Jurisdictional Rule
                  </Badge>
                </CardTitle>
                <CardDescription className="text-xs">
                  {simResult.statutoryReason}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg border bg-card p-3 text-center">
                    <div className="text-[11px] text-muted-foreground">State Base Rate</div>
                    <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                      {simResult.baseRate.toFixed(2)}%
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      ${simResult.baseTax.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-card p-3 text-center">
                    <div className="text-[11px] text-muted-foreground">Avg Local Rate</div>
                    <div className="text-lg font-bold font-mono text-foreground mt-0.5">
                      {simResult.localRate.toFixed(2)}%
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      ${simResult.localTax.toFixed(2)}
                    </div>
                  </div>

                  <div className="rounded-lg border bg-primary/10 border-primary/30 p-3 text-center">
                    <div className="text-[11px] text-primary font-medium">Effective Combined</div>
                    <div className="text-lg font-bold font-mono text-primary mt-0.5">
                      {simResult.effectiveRate.toFixed(2)}%
                    </div>
                    <div className="text-[11px] font-semibold text-primary mt-1">
                      ${simResult.totalTax.toFixed(2)}
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border bg-card p-4 space-y-2">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Taxable Subtotal</span>
                    <span className="font-mono text-foreground font-medium">${(simAmount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Sales Tax Payable</span>
                    <span className="font-mono text-primary font-semibold">+${simResult.totalTax.toFixed(2)}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-sm font-bold text-foreground">
                    <span>Total Transaction Cost</span>
                    <span className="font-mono text-base">${((simAmount || 0) + simResult.totalTax).toFixed(2)}</span>
                  </div>
                </div>

                <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                  <div className="font-semibold text-foreground flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    Sourcing Rule Applied: {simResult.sourcingApplied}
                  </div>
                  <p className="text-muted-foreground">
                    {simResult.sourcingApplied === "DESTINATION"
                      ? "Under modern Marketplace Facilitator and Wayfair standards, sales tax is sourced to the delivery address in the buyer's state."
                      : "For intra-state shipments originating in origin-based states (such as TX, OH, PA, IL, AZ), the seller location tax rate governs."}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 5: IRS & Nexus Guidelines ── */}
        <TabsContent value="guidelines" className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <FileSpreadsheet className="h-4 w-4 text-primary" /> IRS Form 1099 Statutory Rules
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="font-semibold text-foreground mb-1">Form 1099-NEC Threshold ($600)</div>
                  <p>
                    Required for nonemployee compensation paid to independent contractors, freelancers, and professional service providers totaling $600 or more in a calendar year. Due by January 31.
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="font-semibold text-foreground mb-1">Section 3406 Backup Withholding (24%)</div>
                  <p>
                    If an independent contractor fails to provide a certified Form W-9 TIN (EIN or SSN) or provides an incorrect TIN, payers are statutorily required to withhold 24% backup withholding.
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="font-semibold text-foreground mb-1">IRS FIRE Publication 1220 System</div>
                  <p>
                    Businesses with 10 or more information returns must electronically file via the IRS FIRE system. Genesoft provides formatted CSVs compliant with FIRE specification guidelines.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Landmark className="h-4 w-4 text-primary" /> South Dakota v. Wayfair Nexus & NOMAD
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs text-muted-foreground">
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="font-semibold text-foreground mb-1">Economic Nexus ($100k / $500k Thresholds)</div>
                  <p>
                    Following the 2018 Supreme Court ruling in South Dakota v. Wayfair, remote sellers exceeding economic thresholds (standard $100k in sales, or $500k in CA, NY, TX) establish sales tax obligations.
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="font-semibold text-foreground mb-1">NOMAD States (0% Statewide Tax)</div>
                  <p>
                    Five states have no statewide sales tax: New Hampshire, Oregon, Montana, Alaska, and Delaware. Remote transactions shipped to these jurisdictions are legally zero-rated.
                  </p>
                </div>
                <div className="p-3 bg-muted/30 rounded-lg">
                  <div className="font-semibold text-foreground mb-1">Resale Certificates (MTC Rule 3.285)</div>
                  <p>
                    B2B wholesale sales require valid resale certificates on file (such as MTC Uniform Multistate Certificate, CA CDTFA-230, NY ST-120) to support sales tax exemptions under audit.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── MODAL: Form 1099-NEC Authentic IRS Layout Slip ── */}
      <Dialog open={is1099ModalOpen} onOpenChange={setIs1099ModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between text-base">
              <span>Form 1099-NEC - Nonemployee Compensation</span>
              <Badge variant="outline" className="font-mono text-xs">
                Tax Year {selectedYear}
              </Badge>
            </DialogTitle>
            <DialogDescription className="text-xs">
              Official IRS layout for contractor information returns (IRC § 6041A).
            </DialogDescription>
          </DialogHeader>

          {selected1099Record && (
            <div className="border border-red-500/40 rounded-lg p-4 bg-background text-xs space-y-4 print:border-black">
              {/* Top Banner */}
              <div className="flex justify-between items-center border-b pb-2">
                <div>
                  <span className="font-bold text-red-600 dark:text-red-400 text-sm">FORM 1099-NEC</span>
                  <div className="text-[10px] text-muted-foreground">(Rev. January 2024)</div>
                </div>
                <div className="text-right">
                  <span className="font-bold text-foreground">Nonemployee Compensation</span>
                  <div className="text-[10px] text-muted-foreground">Copy B - For Recipient</div>
                </div>
              </div>

              {/* Grid 2-column */}
              <div className="grid grid-cols-2 gap-4">
                {/* Left Column: Payer & Recipient */}
                <div className="space-y-3 border-r pr-4">
                  <div className="p-2 border rounded bg-muted/20">
                    <div className="text-[10px] text-muted-foreground font-semibold">PAYER&apos;S name & address</div>
                    <div className="font-bold text-foreground">Your business (from Settings → Organization)</div>
                    <div className="text-[10px] font-mono mt-1 text-muted-foreground">PAYER&apos;S TIN: your EIN</div>
                  </div>

                  <div className="p-2 border rounded bg-muted/20">
                    <div className="text-[10px] text-muted-foreground font-semibold">RECIPIENT&apos;S name & TIN</div>
                    <div className="font-bold text-foreground">{selected1099Record.vendorName}</div>
                    <div className="text-[11px] font-mono font-semibold text-foreground mt-0.5">
                      TIN: {selected1099Record.tin || "NOT ON FILE"}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-1">
                      W-9 Status: {selected1099Record.w9Status}
                    </div>
                  </div>
                </div>

                {/* Right Column: Boxes */}
                <div className="space-y-2">
                  <div className="p-2 border rounded border-red-500/20 bg-red-500/5">
                    <div className="text-[10px] font-bold text-red-600 dark:text-red-400">
                      1 Nonemployee compensation
                    </div>
                    <div className="text-xl font-bold font-mono text-foreground mt-1">
                      ${(selected1099Record.box1NecAmount || selected1099Record.totalPaid).toLocaleString("en-US", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 border rounded">
                      <div className="text-[10px] text-muted-foreground">4 Federal tax withheld</div>
                      <div className="font-mono text-foreground font-semibold mt-1">
                        ${selected1099Record.box4FederalTaxWithheld.toFixed(2)}
                      </div>
                    </div>
                    <div className="p-2 border rounded">
                      <div className="text-[10px] text-muted-foreground">5 State tax withheld</div>
                      <div className="font-mono text-foreground font-semibold mt-1">
                        ${selected1099Record.box5StateTaxWithheld.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  <div className="p-2 border rounded bg-muted/10">
                    <div className="text-[10px] text-muted-foreground">Filing Statutory Notice</div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Reportable to IRS per IRC § 6041A. File Copy A with IRS by January 31 of following calendar year.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setIs1099ModalOpen(false)}>
              Close
            </Button>
            <Button onClick={() => window.print()} className="gap-1">
              <Printer className="h-3.5 w-3.5" /> Print Recipient Copy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Register New Exemption Certificate ── */}
      <Dialog open={isCertModalOpen} onOpenChange={setIsCertModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Register Exemption Certificate</DialogTitle>
            <DialogDescription className="text-xs">
              Attach state-issued resale or non-profit exemption certificate to eliminate tax on qualifying sales.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-medium text-foreground block mb-1">Customer / Entity Name</label>
              <Input
                placeholder="e.g. Acme Wholesale Corp"
                value={certForm.customerName}
                onChange={(e) => setCertForm({ ...certForm, customerName: e.target.value })}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Certificate #</label>
                <Input
                  placeholder="e.g. ST-120-NY-8849"
                  value={certForm.certificateNumber}
                  onChange={(e) => setCertForm({ ...certForm, certificateNumber: e.target.value })}
                  className="text-xs font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Issuing State</label>
                <select
                  value={certForm.issuingState}
                  onChange={(e) => setCertForm({ ...certForm, issuingState: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none"
                >
                  {Object.keys(US_STATE_TAX_RULES).map((code) => (
                    <option key={code} value={code}>
                      {code} - {US_STATE_TAX_RULES[code].stateName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Exemption Category</label>
              <select
                value={certForm.exemptionType}
                onChange={(e) => setCertForm({ ...certForm, exemptionType: e.target.value as any })}
                className="w-full rounded-md border bg-background px-3 py-2 text-xs focus:outline-none"
              >
                {Object.entries(EXEMPTION_STATUTES).map(([key, item]) => (
                  <option key={key} value={key}>
                    {item.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Expiry Date</label>
              <Input
                type="date"
                value={certForm.expiryDate}
                onChange={(e) => setCertForm({ ...certForm, expiryDate: e.target.value })}
                className="text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCertModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveCert}>Save Certificate</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: Edit W-9 / EIN ── */}
      <Dialog open={isW9ModalOpen} onOpenChange={setIsW9ModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Update Vendor Form W-9 TIN</DialogTitle>
            <DialogDescription className="text-xs">
              Record 9-digit Employer Identification Number (EIN) or SSN for {w9Form.vendorName}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <label className="font-medium text-foreground block mb-1">Vendor Name</label>
              <Input value={w9Form.vendorName} disabled className="text-xs bg-muted" />
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">
                Employer Identification Number (EIN)
              </label>
              <Input
                placeholder="12-3456789"
                value={w9Form.ein}
                onChange={(e) => setW9Form({ ...w9Form, ein: e.target.value })}
                className="text-xs font-mono"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Format: 2-digit IRS campus prefix followed by 7 digits (e.g. 12-3456789).
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsW9ModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveW9}>Verify & Update EIN</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
