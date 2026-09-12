"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Landmark,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileText,
  Search,
  Scale,
  Receipt,
  Percent,
  Layers,
  ArrowUpRight,
  ShieldCheck,
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { UaeVatOverviewResult } from "@/app/actions/finance/uae-vat"
import { exportUaeVat201Json, exportUaeVat201Csv } from "@/app/actions/finance/uae-vat"
import { validateUaeTrn } from "@/lib/uae-vat-engine"

const fmtAed = (n: number) =>
  new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(n || 0)

interface Props {
  initialData: UaeVatOverviewResult
}

export default function UaeVatClient({ initialData }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [year, setYear] = useState(initialData.year.toString())
  const [quarter, setQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">(initialData.quarter)
  const [activeTab, setActiveTab] = useState("vat201")
  const [testTrn, setTestTrn] = useState("100234567890003")
  const [isExporting, setIsExporting] = useState(false)
  const [printModalOpen, setPrintModalOpen] = useState(false)

  const { report, telemetry } = initialData

  const handlePeriodChange = (newYear: string, newQuarter: "Q1" | "Q2" | "Q3" | "Q4") => {
    setYear(newYear)
    setQuarter(newQuarter)
    startTransition(() => {
      router.push(`/finance/vat-uae?year=${newYear}&quarter=${newQuarter}`)
    })
  }

  // File Download Helpers
  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportJson = async () => {
    try {
      setIsExporting(true)
      const res = await exportUaeVat201Json({ year: parseInt(year, 10), quarter })
      downloadFile(res.json, res.filename, "application/json")
    } catch (err: any) {
      alert("Failed to export FTA JSON: " + (err?.message || "Unknown error"))
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      setIsExporting(true)
      const res = await exportUaeVat201Csv({ year: parseInt(year, 10), quarter })
      downloadFile(res.csv, res.filename, "text/csv")
    } catch (err: any) {
      alert("Failed to export Form 201 CSV: " + (err?.message || "Unknown error"))
    } finally {
      setIsExporting(false)
    }
  }

  const currentYearNum = new Date().getFullYear()
  const yearOptions = [currentYearNum, currentYearNum - 1, currentYearNum - 2]
  const trnValidation = validateUaeTrn(testTrn)

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <span className="text-2xl">🇦🇪</span>
              UAE VAT Returns Studio
            </h1>
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 border-emerald-300/30 font-medium">
              Federal Tax Authority (FTA) • Form VAT201
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Federal Decree-Law No. (8) of 2017 — Standard 5% VAT, 15-digit TRN validation, The 7 Emirates apportionment, and Article 48 RCM.
          </p>
        </div>

        {/* Period Selector & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-card border rounded-lg p-1 shadow-sm gap-2">
            <Select value={year} onValueChange={val => handlePeriodChange(val, quarter)}>
              <SelectTrigger className="w-[100px] h-8 text-xs font-semibold">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={quarter} onValueChange={(val: any) => handlePeriodChange(year, val)}>
              <SelectTrigger className="w-[110px] h-8 text-xs font-semibold">
                <SelectValue placeholder="Quarter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Q1">Q1 (Jan–Mar)</SelectItem>
                <SelectItem value="Q2">Q2 (Apr–Jun)</SelectItem>
                <SelectItem value="Q3">Q3 (Jul–Sep)</SelectItem>
                <SelectItem value="Q4">Q4 (Oct–Dec)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setPrintModalOpen(true)}
          >
            <Printer className="h-3.5 w-3.5" />
            Print Form VAT201
          </Button>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={handleExportCsv}
            disabled={isExporting}
          >
            <Download className="h-3.5 w-3.5" />
            Export CSV
          </Button>

          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleExportJson}
            disabled={isExporting}
          >
            <Download className="h-3.5 w-3.5" />
            Export EmaraTax (JSON)
          </Button>
        </div>
      </div>

      {/* ── Statutory EmaraTax Deadlines Banner ── */}
      <div className="bg-gradient-to-r from-emerald-50/70 via-teal-50/70 to-blue-50/70 border border-emerald-200/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-700 text-white rounded-lg shadow-sm">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-emerald-950 text-sm">
                Tax Period: {report.period.quarterLabel}
              </span>
              <Badge variant="secondary" className="text-xs bg-white text-emerald-900 border">
                TRN: {report.taxpayerTrn}
              </Badge>
            </div>
            <div className="text-xs text-emerald-800/80 mt-0.5 flex flex-wrap items-center gap-3">
              <span>Taxable Person: <strong>{report.taxpayerLegalName}</strong></span>
              <span>•</span>
              <span>Establishment: <strong>{report.taxpayerAddress}</strong></span>
            </div>
          </div>
        </div>

        <div className="bg-white/90 border border-emerald-200 px-3.5 py-1.5 rounded-lg shadow-xs flex items-center gap-2 text-xs font-medium text-emerald-900">
          <Clock className="h-4 w-4 text-emerald-600" />
          <span>FTA Filing Due Date: <strong>{report.period.dueDate}</strong> ({telemetry.daysRemaining >= 0 ? `${telemetry.daysRemaining} days left` : `${Math.abs(telemetry.daysRemaining)} days overdue`})</span>
        </div>
      </div>

      {/* ── 4 Telemetry KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Output VAT */}
        <Card className="bg-gradient-to-br from-red-50/80 to-rose-50/40 border-red-200/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-700">Total Output Tax Due (Box 6)</span>
              <Receipt className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-950 mt-1">
              {fmtAed(telemetry.totalOutputTax)}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-red-700/80">
            From {telemetry.invoicesCount} tax invoices across 7 Emirates (Taxable: {fmtAed(report.box1TotalTaxable)})
          </CardContent>
        </Card>

        {/* Card 2: Recoverable Input VAT */}
        <Card className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-emerald-200/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700">Total Recoverable Tax (Box 12)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-950 mt-1">
              {fmtAed(telemetry.totalRecoverableTax)}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-emerald-700/80">
            Input VAT paid on {telemetry.billsCount} business purchase bills
          </CardContent>
        </Card>

        {/* Card 3: Net VAT Payable / Reclaimable */}
        <Card className={`bg-gradient-to-br shadow-xs ${telemetry.isPayable ? "from-blue-50/80 to-indigo-50/40 border-blue-200/80" : "from-teal-50/80 to-emerald-50/40 border-teal-200/80"}`}>
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-medium ${telemetry.isPayable ? "text-blue-700" : "text-teal-700"}`}>
                Net VAT {telemetry.isPayable ? "Payable" : "Reclaimable"} (Box 13)
              </span>
              <Scale className={`h-4 w-4 ${telemetry.isPayable ? "text-blue-600" : "text-teal-600"}`} />
            </div>
            <div className={`text-2xl font-bold mt-1 ${telemetry.isPayable ? "text-blue-950" : "text-teal-950"}`}>
              {fmtAed(telemetry.netVatPayable)}
            </div>
          </CardHeader>
          <CardContent className={`p-4 pt-1 text-xs ${telemetry.isPayable ? "text-blue-700/80" : "text-teal-700/80"}`}>
            {telemetry.isPayable ? "Due for payment to the Federal Tax Authority" : "Credit refundable / carried forward by FTA"}
          </CardContent>
        </Card>

        {/* Card 4: TRN Compliance */}
        <Card className="bg-gradient-to-br from-purple-50/80 to-violet-50/40 border-purple-200/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-purple-700">TRN Compliance Rate</span>
              <ShieldCheck className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-2xl font-bold text-purple-950 mt-1">
              {telemetry.trnComplianceRate}%
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-purple-700/80">
            {report.summary.b2bTrnCount} verified 15-digit B2B TRNs | {telemetry.rcmCount} RCM transactions
          </CardContent>
        </Card>
      </div>

      {/* ── Workspaces ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="vat201" className="gap-2">
            <FileText className="h-4 w-4 text-emerald-600" />
            Form VAT 201 Return
          </TabsTrigger>
          <TabsTrigger value="emirates" className="gap-2">
            <Building2 className="h-4 w-4 text-blue-600" />
            Emirate Sales Matrix
          </TabsTrigger>
          <TabsTrigger value="rcm" className="gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            Reverse Charge (Article 48)
          </TabsTrigger>
          <TabsTrigger value="trn" className="gap-2">
            <Percent className="h-4 w-4 text-amber-600" />
            TRN Validator & FTA Rules
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 1: FORM VAT 201 RETURN
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="vat201" className="space-y-6">
          {/* Section 1: VAT on Sales */}
          <Card>
            <CardHeader className="p-4 pb-2 bg-muted/20 border-b">
              <CardTitle className="text-sm font-bold text-foreground">
                VAT on Sales and all other Outputs
              </CardTitle>
              <CardDescription className="text-xs">
                Standard rated supplies segregated by the 7 Emirates, exports, and RCM supplies.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs w-[80px]">Box #</TableHead>
                    <TableHead className="text-xs">Description of Supplies</TableHead>
                    <TableHead className="text-xs text-right">Taxable Amount (AED)</TableHead>
                    <TableHead className="text-xs text-right">VAT Amount (5%)</TableHead>
                    <TableHead className="text-xs text-right">Adjustments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.box1Emirates.map((em, idx) => (
                    <TableRow key={idx} className="hover:bg-muted/40">
                      <TableCell className="font-mono text-xs font-semibold text-emerald-700">
                        {em.boxCode}
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        Standard Rated Supplies in {em.emirate}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono font-medium">
                        {fmtAed(em.taxableAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-red-600 font-semibold">
                        {fmtAed(em.vatAmount)}
                      </TableCell>
                      <TableCell className="text-xs text-right font-mono text-muted-foreground">
                        {fmtAed(em.adjustments)}
                      </TableCell>
                    </TableRow>
                  ))}

                  <TableRow className="bg-muted/30 font-semibold border-t">
                    <TableCell className="text-xs font-bold">Total 1</TableCell>
                    <TableCell className="text-xs font-bold">Total Standard Rated Supplies (7 Emirates)</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold">{fmtAed(report.box1TotalTaxable)}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-red-700">{fmtAed(report.box1TotalVat)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">0.00</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-mono text-xs font-semibold text-emerald-700">2</TableCell>
                    <TableCell className="text-xs">Tax Invoices and Supplies to Designated Zones</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtAed(report.box2DesignatedZones.taxableAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtAed(report.box2DesignatedZones.vatAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">0.00</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-mono text-xs font-semibold text-emerald-700">3</TableCell>
                    <TableCell className="text-xs">Supplies subject to the Reverse Charge provisions</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtAed(report.box3ReverseChargeOutput.taxableAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-red-600 font-semibold">{fmtAed(report.box3ReverseChargeOutput.vatAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">0.00</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-mono text-xs font-semibold text-emerald-700">4</TableCell>
                    <TableCell className="text-xs">Zero Rated Supplies (Exports & Transport)</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtAed(report.box4ZeroRated.taxableAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">-</TableCell>
                    <TableCell className="text-xs text-right font-mono">0.00</TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell className="font-mono text-xs font-semibold text-emerald-700">5</TableCell>
                    <TableCell className="text-xs">Exempt Supplies</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtAed(report.box5Exempt.taxableAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">-</TableCell>
                    <TableCell className="text-xs text-right font-mono">0.00</TableCell>
                  </TableRow>

                  <TableRow className="bg-red-50/70 font-bold border-t-2 border-red-200">
                    <TableCell className="font-mono text-xs font-bold text-red-950">6</TableCell>
                    <TableCell className="text-xs text-red-950 font-bold">TOTAL OUTPUT TAX DUE</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">-</TableCell>
                    <TableCell className="text-xs text-right font-mono font-extrabold text-red-700 text-sm">
                      {fmtAed(report.box6TotalOutputTaxDue)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">0.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Section 2: VAT on Expenses */}
          <Card>
            <CardHeader className="p-4 pb-2 bg-muted/20 border-b">
              <CardTitle className="text-sm font-bold text-foreground">
                VAT on Expenses and all other Inputs
              </CardTitle>
              <CardDescription className="text-xs">
                Recoverable input tax incurred on business purchases and Article 48 RCM expenses.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs w-[80px]">Box #</TableHead>
                    <TableHead className="text-xs">Description of Inputs</TableHead>
                    <TableHead className="text-xs text-right">Taxable Amount (AED)</TableHead>
                    <TableHead className="text-xs text-right">Recoverable VAT (5%)</TableHead>
                    <TableHead className="text-xs text-right">Adjustments</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="font-mono text-xs font-semibold text-emerald-700">9</TableCell>
                    <TableCell className="text-xs font-medium">Standard Rated Expenses</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtAed(report.box9StandardRatedPurchases.taxableAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-700 font-semibold">{fmtAed(report.box9StandardRatedPurchases.recoverableVat)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">0.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="font-mono text-xs font-semibold text-emerald-700">10</TableCell>
                    <TableCell className="text-xs font-medium">Supplies subject to the Reverse Charge provisions</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtAed(report.box10ReverseChargeInput.taxableAmount)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-700 font-semibold">{fmtAed(report.box10ReverseChargeInput.recoverableVat)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">0.00</TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-50/70 font-bold border-t-2 border-emerald-200">
                    <TableCell className="font-mono text-xs font-bold text-emerald-950">12</TableCell>
                    <TableCell className="text-xs text-emerald-950 font-bold">TOTAL RECOVERABLE TAX</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">-</TableCell>
                    <TableCell className="text-xs text-right font-mono font-extrabold text-emerald-700 text-sm">
                      {fmtAed(report.box12TotalRecoverableTax)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">0.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Section 3: Net VAT Due */}
          <Card className="border-blue-200 bg-gradient-to-r from-blue-50/40 via-indigo-50/30 to-purple-50/40">
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-bold text-blue-950">
                Net VAT Due or Reclaimable
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/80 border border-blue-200 p-4 rounded-xl shadow-xs">
                <div>
                  <span className="text-xs font-semibold text-slate-600 block">Box 13: Net VAT Payable / (Reclaimable)</span>
                  <span className="text-xs text-muted-foreground">Calculated as Box 6 (Total Output Tax) minus Box 12 (Total Recoverable Tax)</span>
                </div>
                <div className="text-right">
                  <span className={`text-2xl font-extrabold ${report.box13NetVatPayable >= 0 ? "text-blue-700" : "text-teal-700"}`}>
                    {fmtAed(Math.abs(report.box13NetVatPayable))}
                  </span>
                  <Badge variant="outline" className={`ml-2 text-xs font-bold ${report.box13NetVatPayable >= 0 ? "bg-blue-100 text-blue-800" : "bg-teal-100 text-teal-800"}`}>
                    {report.box13NetVatPayable >= 0 ? "PAYABLE TO FTA" : "RECLAIMABLE FROM FTA"}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 2: EMIRATE SALES MATRIX
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="emirates" className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Supplies Apportioned by the 7 Emirates</CardTitle>
              <CardDescription className="text-xs">
                Under FTA rules, standard rated supplies must be declared in the Emirate where the fixed establishment is located or where the supply took place.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {report.box1Emirates.map((em, idx) => {
                  const pct = report.box1TotalTaxable > 0
                    ? Math.round((em.taxableAmount / report.box1TotalTaxable) * 100)
                    : 0
                  return (
                    <div key={idx} className="border rounded-xl p-4 bg-muted/20 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-foreground">{em.emirate}</span>
                        <Badge variant="secondary" className="text-[10px] font-mono">Box {em.boxCode}</Badge>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Taxable:</span>
                          <span className="font-mono font-medium">{fmtAed(em.taxableAmount)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">VAT (5%):</span>
                          <span className="font-mono font-semibold text-red-600">{fmtAed(em.vatAmount)}</span>
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                        <div className="bg-emerald-600 h-1.5 rounded-full" style={{ width: `${Math.max(pct, 3)}%` }} />
                      </div>
                      <span className="text-[10px] text-muted-foreground block text-right">{pct}% of total sales</span>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 3: REVERSE CHARGE MECHANISM (ARTICLE 48)
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="rcm" className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Article 48 Reverse Charge Mechanism (RCM)</CardTitle>
              <CardDescription className="text-xs">
                Inward supplies of goods and services from foreign / non-resident suppliers where the UAE registered taxable recipient is liable for VAT.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-xl p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground block">RCM Purchase Invoices</span>
                  <span className="text-2xl font-bold mt-1 block">{report.summary.rcmCount}</span>
                  <span className="text-xs text-muted-foreground mt-1 block">Cross-border foreign vendor bills</span>
                </div>
                <div className="border rounded-xl p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground block">Box 3: Output VAT Accounted</span>
                  <span className="text-2xl font-bold text-red-700 mt-1 block">{fmtAed(report.box3ReverseChargeOutput.vatAmount)}</span>
                  <span className="text-xs text-muted-foreground mt-1 block">Self-assessed output tax due to FTA</span>
                </div>
                <div className="border rounded-xl p-4 bg-muted/20">
                  <span className="text-xs text-muted-foreground block">Box 10: Input VAT Recovered</span>
                  <span className="text-2xl font-bold text-emerald-700 mt-1 block">{fmtAed(report.box10ReverseChargeInput.recoverableVat)}</span>
                  <span className="text-xs text-muted-foreground mt-1 block">Matching input tax claimed (net cash neutral)</span>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900">
                <strong>Statutory Mechanism:</strong> Under Article 48 of UAE Federal Decree-Law No. (8) of 2017, the recipient declares output VAT in Box 3 and recovers it simultaneously in Box 10, resulting in a zero net cash impact for fully taxable businesses while maintaining comprehensive audit visibility for the FTA.
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 4: TRN VALIDATOR & FTA RULES
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="rates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Live UAE TRN Syntax Validator</CardTitle>
                <CardDescription className="text-xs">
                  Validates against the 15-digit Federal Tax Authority format (`^100\d&#123;12&#125;$`).
                </CardDescription>
              </CardHeader>
              <CardContent className="p-4 space-y-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold">Enter 15-Digit TRN to Test:</label>
                  <Input
                    value={testTrn}
                    onChange={e => setTestTrn(e.target.value)}
                    placeholder="e.g. 100234567890003"
                    className="font-mono text-sm"
                  />
                </div>

                <div className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${trnValidation.isValid ? "bg-emerald-50 text-emerald-900 border-emerald-200" : "bg-red-50 text-red-900 border-red-200"}`}>
                  {trnValidation.isValid ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                      <span>Valid UAE Tax Registration Number (TRN): <strong>{trnValidation.formattedTrn}</strong></span>
                    </>
                  ) : (
                    <>
                      <AlertTriangle className="h-4 w-4 text-red-600 shrink-0" />
                      <span>{trnValidation.error}</span>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">FTA Statutory Rate Slabs & Deadlines</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3 text-muted-foreground">
                <div className="p-2 bg-muted/40 rounded border space-y-0.5">
                  <strong className="text-foreground block">Standard Rate (5%)</strong>
                  <span>Applies to general supplies of goods, services, commercial leases, and IT software.</span>
                </div>
                <div className="p-2 bg-muted/40 rounded border space-y-0.5">
                  <strong className="text-foreground block">Zero-Rated (0%)</strong>
                  <span>Exports of goods/services outside UAE, international transportation, and investment precious metals.</span>
                </div>
                <div className="p-2 bg-muted/40 rounded border space-y-0.5">
                  <strong className="text-foreground block">Filing Due Date (28th of following month)</strong>
                  <span>Tax returns must be submitted on the EmaraTax portal with payment by the 28th following quarter-end.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Official Printable Form VAT 201 Modal ── */}
      <Dialog open={printModalOpen} onOpenChange={setPrintModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6 bg-white text-slate-900 print:p-0 print:m-0" id="vat201-print-slip">
            {/* Header with Bilingual English/Arabic Style */}
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <div className="text-xs text-slate-600 uppercase font-semibold">United Arab Emirates • Federal Tax Authority</div>
              <h2 className="text-xl font-extrabold tracking-wider mt-1">FORM VAT 201 — VALUE ADDED TAX RETURN</h2>
              <p className="text-xs text-slate-500 mt-0.5">Federal Decree-Law No. (8) of 2017 on Value Added Tax</p>
            </div>

            {/* Taxpayer Information */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 border-b border-slate-300 py-3 text-xs">
              <div>
                <span className="text-slate-500 block">Tax Year & Quarter</span>
                <span className="font-bold">{report.period.quarterLabel}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tax Registration No. (TRN)</span>
                <span className="font-bold font-mono">{report.taxpayerTrn}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Legal Name of Taxable Person</span>
                <span className="font-bold">{report.taxpayerLegalName}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Due Date</span>
                <span className="font-bold text-red-600">{report.period.dueDate}</span>
              </div>
            </div>

            {/* VAT on Sales Table */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-1.5 border border-slate-300">
                VAT on Sales and all other Outputs
              </h3>
              <table className="w-full text-xs border border-collapse border-slate-300 mt-1">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-1.5 text-left w-14">Box #</th>
                    <th className="border border-slate-300 p-1.5 text-left">Description</th>
                    <th className="border border-slate-300 p-1.5 text-right">Taxable (AED)</th>
                    <th className="border border-slate-300 p-1.5 text-right">VAT (5%)</th>
                  </tr>
                </thead>
                <tbody>
                  {report.box1Emirates.map((em, idx) => (
                    <tr key={idx}>
                      <td className="border border-slate-300 p-1.5 font-mono">{em.boxCode}</td>
                      <td className="border border-slate-300 p-1.5">Standard Rated Supplies in {em.emirate}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(em.taxableAmount)}</td>
                      <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(em.vatAmount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-mono">2</td>
                    <td className="border border-slate-300 p-1.5">Tax Invoices / Designated Zones</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(report.box2DesignatedZones.taxableAmount)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(report.box2DesignatedZones.vatAmount)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-mono">3</td>
                    <td className="border border-slate-300 p-1.5">Supplies subject to Reverse Charge provisions</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(report.box3ReverseChargeOutput.taxableAmount)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(report.box3ReverseChargeOutput.vatAmount)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-mono">4</td>
                    <td className="border border-slate-300 p-1.5">Zero Rated Supplies (Exports)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(report.box4ZeroRated.taxableAmount)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">-</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold">
                    <td className="border border-slate-300 p-1.5 font-mono">6</td>
                    <td className="border border-slate-300 p-1.5">TOTAL OUTPUT TAX DUE</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">-</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono text-sm">{fmtAed(report.box6TotalOutputTaxDue)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* VAT on Expenses Table */}
            <div className="mt-4">
              <h3 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-1.5 border border-slate-300">
                VAT on Expenses and all other Inputs
              </h3>
              <table className="w-full text-xs border border-collapse border-slate-300 mt-1">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-1.5 text-left w-14">Box #</th>
                    <th className="border border-slate-300 p-1.5 text-left">Description</th>
                    <th className="border border-slate-300 p-1.5 text-right">Taxable (AED)</th>
                    <th className="border border-slate-300 p-1.5 text-right">Recoverable VAT</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-mono">9</td>
                    <td className="border border-slate-300 p-1.5">Standard Rated Expenses</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(report.box9StandardRatedPurchases.taxableAmount)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(report.box9StandardRatedPurchases.recoverableVat)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5 font-mono">10</td>
                    <td className="border border-slate-300 p-1.5">Supplies subject to Reverse Charge provisions</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(report.box10ReverseChargeInput.taxableAmount)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtAed(report.box10ReverseChargeInput.recoverableVat)}</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold">
                    <td className="border border-slate-300 p-1.5 font-mono">12</td>
                    <td className="border border-slate-300 p-1.5">TOTAL RECOVERABLE TAX</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">-</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono text-sm">{fmtAed(report.box12TotalRecoverableTax)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Net VAT Box */}
            <div className="mt-4 p-3 border-2 border-slate-900 bg-slate-50 flex justify-between items-center text-xs">
              <div>
                <span className="font-bold uppercase tracking-wider block">Box 13: Net VAT Due for Tax Period</span>
                <span className="text-slate-500 text-[11px]">(Box 6 minus Box 12)</span>
              </div>
              <div className="text-right">
                <span className="text-xl font-black block">{fmtAed(Math.abs(report.box13NetVatPayable))}</span>
                <span className="text-[10px] font-bold text-slate-700 uppercase">
                  {report.box13NetVatPayable >= 0 ? "Payable to Federal Tax Authority" : "Reclaimable from Federal Tax Authority"}
                </span>
              </div>
            </div>

            {/* Legal Declaration */}
            <div className="mt-8 border-t border-slate-300 pt-4 flex justify-between items-end text-xs">
              <div className="max-w-md text-slate-500 text-[10px]">
                I declare that the information provided in this Value Added Tax Return (Form VAT 201) is true, complete and correct in accordance with the provisions of Federal Decree-Law No. (8) of 2017 on Value Added Tax.
              </div>
              <div className="text-center">
                <div className="w-44 border-b border-slate-400 mb-1"></div>
                <span className="font-semibold block">Authorized Tax Agent / Signatory</span>
                <span className="text-[10px] text-slate-500 block">{report.taxpayerLegalName}</span>
              </div>
            </div>

            {/* Print Action Bar */}
            <div className="mt-6 flex justify-end gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setPrintModalOpen(false)}>
                Close
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print Form VAT 201 Slip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
