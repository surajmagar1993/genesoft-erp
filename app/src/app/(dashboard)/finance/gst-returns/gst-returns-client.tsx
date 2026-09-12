"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  FileSpreadsheet,
  Download,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  FileText,
  Search,
  ArrowRight,
  TrendingUp,
  Receipt,
  Scale,
  Percent,
  Layers,
  HelpCircle,
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import type { GstReturnsOverviewResult } from "@/app/actions/finance/gst-returns"
import { exportGstr1Json, exportGstr1Csv, exportGstr3bJson } from "@/app/actions/finance/gst-returns"

const fmtInr = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0)

const fmtNum = (n: number) =>
  new Intl.NumberFormat("en-IN").format(n || 0)

interface Props {
  initialData: GstReturnsOverviewResult
}

export default function GstReturnsClient({ initialData }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [year, setYear] = useState(initialData.year.toString())
  const [month, setMonth] = useState(initialData.month.toString())
  const [activeTab, setActiveTab] = useState("gstr1")
  const [gstr1SubTab, setGstr1SubTab] = useState("b2b")
  const [b2bSearch, setB2bSearch] = useState("")
  const [isExporting, setIsExporting] = useState(false)
  const [printGstr3bOpen, setPrintGstr3bOpen] = useState(false)

  const { gstr1, gstr3b, telemetry } = initialData

  const handlePeriodChange = (newYear: string, newMonth: string) => {
    setYear(newYear)
    setMonth(newMonth)
    startTransition(() => {
      router.push(`/finance/gst-returns?year=${newYear}&month=${newMonth}`)
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

  const handleExportGstr1Json = async () => {
    try {
      setIsExporting(true)
      const res = await exportGstr1Json({ year: parseInt(year, 10), month: parseInt(month, 10) })
      downloadFile(res.json, res.filename, "application/json")
    } catch (err: any) {
      alert("Failed to export GSTR-1 JSON: " + (err?.message || "Unknown error"))
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportGstr1Csv = async (table: "b2b" | "hsn") => {
    try {
      setIsExporting(true)
      const res = await exportGstr1Csv({
        year: parseInt(year, 10),
        month: parseInt(month, 10),
        table,
      })
      downloadFile(res.csv, res.filename, "text/csv")
    } catch (err: any) {
      alert("Failed to export CSV: " + (err?.message || "Unknown error"))
    } finally {
      setIsExporting(false)
    }
  }

  const handleExportGstr3bJson = async () => {
    try {
      setIsExporting(true)
      const res = await exportGstr3bJson({ year: parseInt(year, 10), month: parseInt(month, 10) })
      downloadFile(res.json, res.filename, "application/json")
    } catch (err: any) {
      alert("Failed to export GSTR-3B JSON: " + (err?.message || "Unknown error"))
    } finally {
      setIsExporting(false)
    }
  }

  // Filtered B2B invoices
  const filteredB2b = gstr1.b2b.filter(item => {
    if (!b2bSearch) return true
    const q = b2bSearch.toLowerCase()
    return (
      item.ctin.toLowerCase().includes(q) ||
      item.cname.toLowerCase().includes(q) ||
      item.inum.toLowerCase().includes(q) ||
      item.posName.toLowerCase().includes(q)
    )
  })

  const currentYearNum = new Date().getFullYear()
  const yearOptions = [currentYearNum, currentYearNum - 1, currentYearNum - 2]

  const monthOptions = [
    { value: "4", label: "April" },
    { value: "5", label: "May" },
    { value: "6", label: "June (Q1)" },
    { value: "7", label: "July" },
    { value: "8", label: "August" },
    { value: "9", label: "September (Q2)" },
    { value: "10", label: "October" },
    { value: "11", label: "November" },
    { value: "12", label: "December (Q3)" },
    { value: "1", label: "January" },
    { value: "2", label: "February" },
    { value: "3", label: "March (Q4)" },
  ]

  return (
    <div className="space-y-6">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              GST Returns Studio
            </h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-medium">
              🇮🇳 CGST & IGST Acts 2017
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Statutory GSTR-1 Outward Supplies, GSTR-3B Monthly Summary, Rule 88A Tax Set-off Matrix, and GSTN Offline Tool Exporters.
          </p>
        </div>

        {/* Period Selector & Action Desk */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center bg-card border rounded-lg p-1 shadow-sm gap-2">
            <Select value={year} onValueChange={val => handlePeriodChange(val, month)}>
              <SelectTrigger className="w-[110px] h-8 text-xs font-semibold">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map(y => (
                  <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={month} onValueChange={val => handlePeriodChange(year, val)}>
              <SelectTrigger className="w-[130px] h-8 text-xs font-semibold">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map(m => (
                  <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-8 text-xs"
            onClick={() => setPrintGstr3bOpen(true)}
          >
            <Printer className="h-3.5 w-3.5" />
            Print Form GSTR-3B
          </Button>

          <Button
            size="sm"
            className="gap-1.5 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={handleExportGstr1Json}
            disabled={isExporting}
          >
            <Download className="h-3.5 w-3.5" />
            Export GSTR-1 (JSON)
          </Button>
        </div>
      </div>

      {/* ── Statutory Deadlines Alert Banner ── */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/70 to-purple-50/70 border border-blue-200/80 rounded-xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 text-white rounded-lg shadow-sm">
            <Calendar className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-blue-950 text-sm">
                Filing Period: {gstr1.period.monthLabel} (FY {gstr1.period.financialYear} • {gstr1.period.quarter})
              </span>
              <Badge variant="secondary" className="text-xs bg-white text-blue-900 border">
                GSTIN: {gstr1.supplierGstin}
              </Badge>
            </div>
            <div className="text-xs text-blue-800/80 mt-0.5 flex flex-wrap items-center gap-3">
              <span>Legal Entity: <strong>{gstr1.supplierLegalName}</strong></span>
              <span>•</span>
              <span>State: <strong>{gstr1.supplierStateCode} ({gstr1.period.quarter})</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="bg-white/90 border border-blue-200 px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 text-blue-900">
            <Clock className="h-3.5 w-3.5 text-blue-600" />
            <span>GSTR-1 Due: <strong>{gstr1.period.gstr1DueDate}</strong> ({telemetry.gstr1DueInDays >= 0 ? `${telemetry.gstr1DueInDays}d left` : `${Math.abs(telemetry.gstr1DueInDays)}d overdue`})</span>
          </div>
          <div className="bg-white/90 border border-indigo-200 px-3 py-1.5 rounded-lg shadow-xs flex items-center gap-1.5 text-indigo-900">
            <Clock className="h-3.5 w-3.5 text-indigo-600" />
            <span>GSTR-3B Due: <strong>{gstr1.period.gstr3bDueDate}</strong> ({telemetry.gstr3bDueInDays >= 0 ? `${telemetry.gstr3bDueInDays}d left` : `${Math.abs(telemetry.gstr3bDueInDays)}d overdue`})</span>
          </div>
        </div>
      </div>

      {/* ── 4 Telemetry KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Output Tax Liability */}
        <Card className="bg-gradient-to-br from-red-50/80 to-rose-50/40 border-red-200/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-red-700">Total Output Tax Liability</span>
              <Receipt className="h-4 w-4 text-red-600" />
            </div>
            <div className="text-2xl font-bold text-red-950 mt-1">
              {fmtInr(telemetry.totalOutputTax)}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-red-700/80">
            From {telemetry.invoicesCount} outward tax invoices (Taxable: {fmtInr(gstr1.summary.totalTaxableValue)})
          </CardContent>
        </Card>

        {/* Card 2: Eligible Input Tax Credit */}
        <Card className="bg-gradient-to-br from-emerald-50/80 to-teal-50/40 border-emerald-200/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-emerald-700">Eligible Input Tax Credit (ITC)</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            </div>
            <div className="text-2xl font-bold text-emerald-950 mt-1">
              {fmtInr(telemetry.totalEligibleItc)}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-emerald-700/80">
            Available from {telemetry.billsCount} domestic vendor purchase bills
          </CardContent>
        </Card>

        {/* Card 3: Net Cash Tax Payable */}
        <Card className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 border-blue-200/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-blue-700">Net Tax Payable in Cash</span>
              <Scale className="h-4 w-4 text-blue-600" />
            </div>
            <div className="text-2xl font-bold text-blue-950 mt-1">
              {fmtInr(telemetry.netCashPayable)}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-blue-700/80">
            Post-Rule 88A ITC offset against Electronic Cash Ledger
          </CardContent>
        </Card>

        {/* Card 4: Compliance Status */}
        <Card className="bg-gradient-to-br from-purple-50/80 to-violet-50/40 border-purple-200/80 shadow-xs">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-purple-700">Compliance Health</span>
              <Building2 className="h-4 w-4 text-purple-600" />
            </div>
            <div className="text-xl font-bold text-purple-950 mt-1 flex items-center gap-1.5">
              {telemetry.complianceStatus === "ON_TRACK" && (
                <>
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  <span className="text-emerald-700">On Track</span>
                </>
              )}
              {telemetry.complianceStatus === "DUE_SOON" && (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <span className="text-amber-700">Due Shortly</span>
                </>
              )}
              {telemetry.complianceStatus === "OVERDUE" && (
                <>
                  <AlertTriangle className="h-5 w-5 text-rose-600" />
                  <span className="text-rose-700">Past Due Date</span>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-1 text-xs text-purple-700/80">
            State Code: {gstr1.supplierStateCode} ({getStateName(gstr1.supplierStateCode)})
          </CardContent>
        </Card>
      </div>

      {/* ── Main Tabbed Workspaces ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/70 p-1">
          <TabsTrigger value="gstr1" className="gap-2">
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            GSTR-1 (Outward Supplies)
          </TabsTrigger>
          <TabsTrigger value="gstr3b" className="gap-2">
            <Scale className="h-4 w-4 text-blue-600" />
            GSTR-3B (Monthly Summary & Set-off)
          </TabsTrigger>
          <TabsTrigger value="itc" className="gap-2">
            <Layers className="h-4 w-4 text-purple-600" />
            ITC Reconciliation
          </TabsTrigger>
          <TabsTrigger value="rates" className="gap-2">
            <Percent className="h-4 w-4 text-amber-600" />
            GST Rate Card & Rules
          </TabsTrigger>
        </TabsList>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 1: GSTR-1 RETURN STUDIO
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="gstr1" className="space-y-4">
          {/* GSTR-1 Metric Bar */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div className="bg-card border rounded-lg p-3 text-center">
              <span className="text-xs text-muted-foreground block">Table 4 (B2B)</span>
              <span className="text-lg font-bold text-foreground">{gstr1.summary.b2bCount} Invoices</span>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <span className="text-xs text-muted-foreground block">Table 5 (B2CL)</span>
              <span className="text-lg font-bold text-foreground">{gstr1.summary.b2clCount} Invoices</span>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <span className="text-xs text-muted-foreground block">Table 7 (B2CS)</span>
              <span className="text-lg font-bold text-foreground">{gstr1.summary.b2csCount} Groups</span>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <span className="text-xs text-muted-foreground block">Table 6 (Exports)</span>
              <span className="text-lg font-bold text-foreground">{gstr1.summary.expCount} Shipments</span>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <span className="text-xs text-muted-foreground block">Table 9B (CDNR)</span>
              <span className="text-lg font-bold text-foreground">{gstr1.summary.cdnrCount} Notes</span>
            </div>
            <div className="bg-card border rounded-lg p-3 text-center">
              <span className="text-xs text-muted-foreground block">Table 12 (HSN)</span>
              <span className="text-lg font-bold text-foreground">{gstr1.hsn.length} Codes</span>
            </div>
          </div>

          {/* GSTR-1 Sub-navigation & Actions */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-2 rounded-lg border">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                variant={gstr1SubTab === "b2b" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setGstr1SubTab("b2b")}
              >
                Table 4: B2B Invoices ({gstr1.b2b.length})
              </Button>
              <Button
                variant={gstr1SubTab === "b2cl" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setGstr1SubTab("b2cl")}
              >
                Table 5: B2C Large ({gstr1.b2cl.length})
              </Button>
              <Button
                variant={gstr1SubTab === "b2cs" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setGstr1SubTab("b2cs")}
              >
                Table 7: B2C Small ({gstr1.b2cs.length})
              </Button>
              <Button
                variant={gstr1SubTab === "hsn" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setGstr1SubTab("hsn")}
              >
                Table 12: HSN Summary ({gstr1.hsn.length})
              </Button>
              <Button
                variant={gstr1SubTab === "docs" ? "default" : "ghost"}
                size="sm"
                className="h-8 text-xs"
                onClick={() => setGstr1SubTab("docs")}
              >
                Table 13: Docs Issued
              </Button>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => handleExportGstr1Csv("b2b")}
                disabled={isExporting}
              >
                <Download className="h-3.5 w-3.5" />
                Table 4 CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => handleExportGstr1Csv("hsn")}
                disabled={isExporting}
              >
                <Download className="h-3.5 w-3.5" />
                Table 12 CSV
              </Button>
            </div>
          </div>

          {/* Table 4: B2B Sub-tab */}
          {gstr1SubTab === "b2b" && (
            <Card>
              <CardHeader className="p-4 pb-3 flex flex-row items-center justify-between gap-4">
                <div>
                  <CardTitle className="text-base">Table 4: B2B Invoices</CardTitle>
                  <CardDescription className="text-xs">
                    Taxable supplies made to registered recipients holding valid 15-digit GSTINs.
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Search GSTIN, name, invoice..."
                    className="h-8 pl-8 text-xs"
                    value={b2bSearch}
                    onChange={e => setB2bSearch(e.target.value)}
                  />
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Recipient GSTIN</TableHead>
                      <TableHead className="text-xs">Legal / Trade Name</TableHead>
                      <TableHead className="text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">POS</TableHead>
                      <TableHead className="text-xs text-right">Taxable Val</TableHead>
                      <TableHead className="text-xs text-right">CGST</TableHead>
                      <TableHead className="text-xs text-right">SGST</TableHead>
                      <TableHead className="text-xs text-right">IGST</TableHead>
                      <TableHead className="text-xs text-right">Total (INR)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredB2b.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center py-8 text-muted-foreground text-xs">
                          No registered B2B invoices found for {gstr1.period.monthLabel}.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredB2b.map((inv, idx) => (
                        <TableRow key={idx} className="hover:bg-muted/40">
                          <TableCell className="font-mono text-xs font-medium text-primary">
                            {inv.ctin}
                          </TableCell>
                          <TableCell className="text-xs max-w-[180px] truncate">
                            {inv.cname}
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {inv.inum}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {inv.idt}
                          </TableCell>
                          <TableCell className="text-xs">
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                              {inv.pos}-{inv.posName}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-medium">
                            {fmtInr(inv.taxableValue)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {inv.cgstAmount > 0 ? fmtInr(inv.cgstAmount) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {inv.sgstAmount > 0 ? fmtInr(inv.sgstAmount) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {inv.igstAmount > 0 ? fmtInr(inv.igstAmount) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold">
                            {fmtInr(inv.val)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Table 5: B2CL Sub-tab */}
          {gstr1SubTab === "b2cl" && (
            <Card>
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base">Table 5: B2C Large Invoices (B2CL)</CardTitle>
                <CardDescription className="text-xs">
                  Inter-state supplies made to unregistered consumers where total invoice value exceeds ₹2,50,000.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Invoice #</TableHead>
                      <TableHead className="text-xs">Date</TableHead>
                      <TableHead className="text-xs">Place of Supply (POS)</TableHead>
                      <TableHead className="text-xs text-right">Tax Rate</TableHead>
                      <TableHead className="text-xs text-right">Taxable Value</TableHead>
                      <TableHead className="text-xs text-right">IGST Amount</TableHead>
                      <TableHead className="text-xs text-right">Invoice Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gstr1.b2cl.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground text-xs">
                          No inter-state unregistered invoices exceeding ₹2,50,000 in this tax period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      gstr1.b2cl.map((inv, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs font-medium">{inv.inum}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">{inv.idt}</TableCell>
                          <TableCell className="text-xs">{inv.pos} - {inv.posName}</TableCell>
                          <TableCell className="text-xs text-right">{inv.rate}%</TableCell>
                          <TableCell className="text-xs text-right font-mono">{fmtInr(inv.taxableValue)}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-red-600">{fmtInr(inv.igstAmount)}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold">{fmtInr(inv.val)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Table 7: B2CS Sub-tab */}
          {gstr1SubTab === "b2cs" && (
            <Card>
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base">Table 7: B2C Small (B2CS)</CardTitle>
                <CardDescription className="text-xs">
                  Intra-state consumer sales (any amount) & inter-state consumer sales (≤ ₹2,50,000), grouped by Place of Supply and GST rate.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Supply Type</TableHead>
                      <TableHead className="text-xs">Place of Supply (POS)</TableHead>
                      <TableHead className="text-xs text-right">Rate</TableHead>
                      <TableHead className="text-xs text-right">Taxable Value</TableHead>
                      <TableHead className="text-xs text-right">CGST</TableHead>
                      <TableHead className="text-xs text-right">SGST</TableHead>
                      <TableHead className="text-xs text-right">IGST</TableHead>
                      <TableHead className="text-xs text-right">Total Tax</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gstr1.b2cs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground text-xs">
                          No B2C small supplies recorded for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      gstr1.b2cs.map((group, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="text-xs">
                            <Badge variant="secondary" className="text-[10px]">
                              {group.sply_ty}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs font-medium">
                            {group.pos} - {group.posName}
                          </TableCell>
                          <TableCell className="text-xs text-right">{group.rate}%</TableCell>
                          <TableCell className="text-xs text-right font-mono font-medium">
                            {fmtInr(group.taxableValue)}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {group.cgstAmount > 0 ? fmtInr(group.cgstAmount) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {group.sgstAmount > 0 ? fmtInr(group.sgstAmount) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {group.igstAmount > 0 ? fmtInr(group.igstAmount) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono font-bold text-red-700">
                            {fmtInr(group.cgstAmount + group.sgstAmount + group.igstAmount)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Table 12: HSN Summary Sub-tab */}
          {gstr1SubTab === "hsn" && (
            <Card>
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base">Table 12: HSN Summary of Outward Supplies</CardTitle>
                <CardDescription className="text-xs">
                  Statutory HSN/SAC code breakdown required for all registered taxpayers under Notification No. 78/2020.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">HSN/SAC</TableHead>
                      <TableHead className="text-xs">Description</TableHead>
                      <TableHead className="text-xs">UQC</TableHead>
                      <TableHead className="text-xs text-right">Qty</TableHead>
                      <TableHead className="text-xs text-right">Total Val</TableHead>
                      <TableHead className="text-xs text-right">Taxable Val</TableHead>
                      <TableHead className="text-xs text-right">CGST</TableHead>
                      <TableHead className="text-xs text-right">SGST</TableHead>
                      <TableHead className="text-xs text-right">IGST</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gstr1.hsn.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                          No HSN line items aggregated for this period.
                        </TableCell>
                      </TableRow>
                    ) : (
                      gstr1.hsn.map((hsn, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-mono text-xs font-bold text-primary">
                            {hsn.hsn_sc}
                          </TableCell>
                          <TableCell className="text-xs max-w-[200px] truncate">
                            {hsn.desc}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{hsn.uqc}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{fmtNum(hsn.qty)}</TableCell>
                          <TableCell className="text-xs text-right font-mono">{fmtInr(hsn.val)}</TableCell>
                          <TableCell className="text-xs text-right font-mono font-medium">{fmtInr(hsn.txval)}</TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {hsn.camt > 0 ? fmtInr(hsn.camt) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {hsn.samt > 0 ? fmtInr(hsn.samt) : "-"}
                          </TableCell>
                          <TableCell className="text-xs text-right font-mono text-muted-foreground">
                            {hsn.iamt > 0 ? fmtInr(hsn.iamt) : "-"}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Table 13: Documents Issued Sub-tab */}
          {gstr1SubTab === "docs" && (
            <Card>
              <CardHeader className="p-4 pb-3">
                <CardTitle className="text-base">Table 13: Documents Issued During Tax Period</CardTitle>
                <CardDescription className="text-xs">
                  Summary of serial numbers of outward tax invoices and credit/debit notes issued.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-xs">Nature of Document</TableHead>
                      <TableHead className="text-xs">From Serial #</TableHead>
                      <TableHead className="text-xs">To Serial #</TableHead>
                      <TableHead className="text-xs text-right">Total Number</TableHead>
                      <TableHead className="text-xs text-right">Cancelled</TableHead>
                      <TableHead className="text-xs text-right font-bold">Net Issued</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {gstr1.docIssue.map((doc, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="text-xs font-medium">{doc.doc_name}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{doc.from_serial}</TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">{doc.to_serial}</TableCell>
                        <TableCell className="text-xs text-right font-mono">{doc.tot_cnt}</TableCell>
                        <TableCell className="text-xs text-right font-mono text-rose-600">{doc.canc_cnt}</TableCell>
                        <TableCell className="text-xs text-right font-mono font-bold text-emerald-700">{doc.net_cnt}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 2: GSTR-3B RETURN STUDIO
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="gstr3b" className="space-y-6">
          {/* Top GSTR-3B Action Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border">
            <div>
              <span className="font-semibold text-sm">Form GSTR-3B Self-Assessed Summary Return</span>
              <p className="text-xs text-muted-foreground">Synthesized under Section 39 of CGST Act from outward tax invoices and eligible purchase bills.</p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={() => setPrintGstr3bOpen(true)}
              >
                <Printer className="h-3.5 w-3.5" />
                Print Form GSTR-3B
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs gap-1.5 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={handleExportGstr3bJson}
                disabled={isExporting}
              >
                <Download className="h-3.5 w-3.5" />
                Export GSTR-3B (JSON)
              </Button>
            </div>
          </div>

          {/* Table 3.1: Outward Supplies */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Nature of Supplies</TableHead>
                    <TableHead className="text-xs text-right">Total Taxable Val</TableHead>
                    <TableHead className="text-xs text-right">IGST</TableHead>
                    <TableHead className="text-xs text-right">CGST</TableHead>
                    <TableHead className="text-xs text-right">SGST</TableHead>
                    <TableHead className="text-xs text-right">Cess</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs font-medium">
                      (a) Outward taxable supplies (other than zero rated, nil, and exempt)
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">
                      {fmtInr(gstr3b.table31.outwardTaxable.txval)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {fmtInr(gstr3b.table31.outwardTaxable.iamt)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {fmtInr(gstr3b.table31.outwardTaxable.camt)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {fmtInr(gstr3b.table31.outwardTaxable.samt)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">
                      (b) Outward taxable supplies (zero rated / exports)
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {fmtInr(gstr3b.table31.zeroRated.txval)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">
                      {fmtInr(gstr3b.table31.zeroRated.iamt)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">-</TableCell>
                    <TableCell className="text-xs text-right font-mono">-</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">
                      (c) Other outward supplies (Nil rated, exempted)
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                    <TableCell className="text-xs text-right font-mono">-</TableCell>
                    <TableCell className="text-xs text-right font-mono">-</TableCell>
                    <TableCell className="text-xs text-right font-mono">-</TableCell>
                    <TableCell className="text-xs text-right font-mono">-</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">
                      (d) Inward supplies liable to reverse charge (RCM)
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Table 4: Eligible ITC */}
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-sm font-semibold">4. Eligible Input Tax Credit (ITC)</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Details</TableHead>
                    <TableHead className="text-xs text-right">IGST</TableHead>
                    <TableHead className="text-xs text-right">CGST</TableHead>
                    <TableHead className="text-xs text-right">SGST</TableHead>
                    <TableHead className="text-xs text-right">Cess</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow className="font-medium bg-muted/20">
                    <TableCell className="text-xs">(A) ITC Available (whether in full or part)</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtInr(gstr3b.table4Itc.available.allOtherItc.iamt)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtInr(gstr3b.table4Itc.available.allOtherItc.camt)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{fmtInr(gstr3b.table4Itc.available.allOtherItc.samt)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs pl-6 text-muted-foreground">(5) All other ITC (From registered vendor bills)</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{fmtInr(gstr3b.table4Itc.available.allOtherItc.iamt)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{fmtInr(gstr3b.table4Itc.available.allOtherItc.camt)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">{fmtInr(gstr3b.table4Itc.available.allOtherItc.samt)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">₹0.00</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs">(B) ITC Reversed (Rule 38/42/43)</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                    <TableCell className="text-xs text-right font-mono">₹0.00</TableCell>
                  </TableRow>
                  <TableRow className="bg-emerald-50/50 font-bold">
                    <TableCell className="text-xs text-emerald-900">(C) Net ITC Available = (A) - (B)</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-800">{fmtInr(gstr3b.table4Itc.netAvailable.iamt)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-800">{fmtInr(gstr3b.table4Itc.netAvailable.camt)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-800">{fmtInr(gstr3b.table4Itc.netAvailable.samt)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-800">₹0.00</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Table 6.1: Payment of Tax per Statutory Rule 88A */}
          <Card className="border-indigo-200">
            <CardHeader className="p-4 pb-2 bg-gradient-to-r from-indigo-50/60 to-blue-50/60 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-sm font-bold text-indigo-950 flex items-center gap-2">
                    <Scale className="h-4 w-4 text-indigo-600" />
                    6.1 Payment of Tax (Statutory Rule 88A Set-off Matrix)
                  </CardTitle>
                  <CardDescription className="text-xs text-indigo-900/80">
                    Mandatory utilization hierarchy: IGST ITC first offsets IGST, then CGST & SGST. CGST cannot offset SGST; SGST cannot offset CGST.
                  </CardDescription>
                </div>
                <Badge variant="outline" className="bg-white text-indigo-700 border-indigo-200 font-semibold">
                  Rule 88A Enforced
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Tax Head</TableHead>
                    <TableHead className="text-xs text-right">Tax Payable (Output)</TableHead>
                    <TableHead className="text-xs text-right">Paid via IGST ITC</TableHead>
                    <TableHead className="text-xs text-right">Paid via CGST ITC</TableHead>
                    <TableHead className="text-xs text-right">Paid via SGST ITC</TableHead>
                    <TableHead className="text-xs text-right font-bold text-blue-900">Tax Paid in Cash</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell className="text-xs font-bold text-foreground">Integrated Tax (IGST)</TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">{fmtInr(gstr3b.table61Payment.liability.igst)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-700">{fmtInr(gstr3b.table61Payment.paidViaItc.igstUsingIgst)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">-</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">-</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-blue-700">
                      {fmtInr(gstr3b.table61Payment.taxPaidInCash.igst)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-bold text-foreground">Central Tax (CGST)</TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">{fmtInr(gstr3b.table61Payment.liability.cgst)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-700">{fmtInr(gstr3b.table61Payment.paidViaItc.cgstUsingIgst)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-700">{fmtInr(gstr3b.table61Payment.paidViaItc.cgstUsingCgst)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">-</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-blue-700">
                      {fmtInr(gstr3b.table61Payment.taxPaidInCash.cgst)}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell className="text-xs font-bold text-foreground">State Tax (SGST)</TableCell>
                    <TableCell className="text-xs text-right font-mono font-medium">{fmtInr(gstr3b.table61Payment.liability.sgst)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-700">{fmtInr(gstr3b.table61Payment.paidViaItc.sgstUsingIgst)}</TableCell>
                    <TableCell className="text-xs text-right font-mono text-muted-foreground">-</TableCell>
                    <TableCell className="text-xs text-right font-mono text-emerald-700">{fmtInr(gstr3b.table61Payment.paidViaItc.sgstUsingSgst)}</TableCell>
                    <TableCell className="text-xs text-right font-mono font-bold text-blue-700">
                      {fmtInr(gstr3b.table61Payment.taxPaidInCash.sgst)}
                    </TableCell>
                  </TableRow>
                  <TableRow className="bg-blue-50/70 font-bold border-t-2 border-blue-200">
                    <TableCell className="text-xs text-blue-950 font-extrabold">TOTAL TAX LIABILITY</TableCell>
                    <TableCell className="text-xs text-right font-mono text-blue-950">{fmtInr(gstr3b.table61Payment.liability.total)}</TableCell>
                    <TableCell colSpan={3} className="text-xs text-center font-mono text-emerald-800">
                      Total ITC Set-off: {fmtInr(gstr3b.table61Payment.paidViaItc.totalItcUsed)}
                    </TableCell>
                    <TableCell className="text-xs text-right font-mono font-extrabold text-blue-900 text-sm">
                      {fmtInr(gstr3b.table61Payment.taxPaidInCash.totalCashPayable)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 3: ITC RECONCILIATION
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="itc" className="space-y-4">
          <Card>
            <CardHeader className="p-4 pb-2">
              <CardTitle className="text-base">Inward Purchases & ITC Match Desk</CardTitle>
              <CardDescription className="text-xs">
                Reconciles inward purchases recorded in books with input tax credits claimed under GSTR-3B Table 4.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="border rounded-lg p-4 bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground block">Purchase Bills In Period</span>
                  <span className="text-2xl font-bold mt-1 block">{telemetry.billsCount}</span>
                  <span className="text-xs text-muted-foreground mt-1 block">Active vendor invoices eligible for credit</span>
                </div>
                <div className="border rounded-lg p-4 bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground block">Gross Input Tax Recorded</span>
                  <span className="text-2xl font-bold text-emerald-700 mt-1 block">{fmtInr(telemetry.totalEligibleItc)}</span>
                  <span className="text-xs text-muted-foreground mt-1 block">CGST + SGST + IGST on purchases</span>
                </div>
                <div className="border rounded-lg p-4 bg-muted/20">
                  <span className="text-xs font-semibold text-muted-foreground block">ITC Set-Off Utilization</span>
                  <span className="text-2xl font-bold text-indigo-700 mt-1 block">
                    {fmtInr(gstr3b.table61Payment.paidViaItc.totalItcUsed)}
                  </span>
                  <span className="text-xs text-muted-foreground mt-1 block">Credit absorbed against current output liability</span>
                </div>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-900 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                <div>
                  <strong>Statutory Section 16(2)(aa) Matching Condition:</strong> Taxpayers are legally entitled to claim ITC only if the supplier has furnished the invoice in their GSTR-1 and it appears in your auto-populated Form GSTR-2B. Invoices from unregistered suppliers or composite dealers are ineligble for ITC.
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ═══════════════════════════════════════════════════════════════════════
            TAB 4: GST RATE CARD & STATUTORY RULES
        ═══════════════════════════════════════════════════════════════════════ */}
        <TabsContent value="rates" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Place of Supply Rules (IGST Act 2017)</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3 text-muted-foreground">
                <div className="p-2.5 bg-muted/40 rounded border space-y-1">
                  <strong className="text-foreground block">Intra-State Supply (CGST + SGST)</strong>
                  <span>When location of supplier and place of supply (POS) are in the <strong>same State or Union Territory</strong>. Tax is split equally (e.g. 18% = 9% CGST + 9% SGST).</span>
                </div>
                <div className="p-2.5 bg-muted/40 rounded border space-y-1">
                  <strong className="text-foreground block">Inter-State Supply (IGST)</strong>
                  <span>When location of supplier and place of supply (POS) are in <strong>different States or UTs</strong>. Entire tax is Integrated Tax (IGST).</span>
                </div>
                <div className="p-2.5 bg-muted/40 rounded border space-y-1">
                  <strong className="text-foreground block">Exports & SEZ Supplies (Zero-Rated)</strong>
                  <span>Treated as inter-state supply. May be made with payment of IGST (WPAY) or without payment under Letter of Undertaking (LUT / WOPAY).</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-4 pb-2">
                <CardTitle className="text-sm font-semibold">Statutory HSN Mandate (Notif. 78/2020)</CardTitle>
              </CardHeader>
              <CardContent className="p-4 text-xs space-y-3 text-muted-foreground">
                <div className="p-2.5 bg-muted/40 rounded border space-y-1">
                  <strong className="text-foreground block">Turnover ≤ ₹5 Crores</strong>
                  <span>Minimum <strong>4-digit HSN</strong> code mandatory for all B2B supplies. Optional for B2C supplies.</span>
                </div>
                <div className="p-2.5 bg-muted/40 rounded border space-y-1">
                  <strong className="text-foreground block">Turnover &gt; ₹5 Crores</strong>
                  <span>Minimum <strong>6-digit HSN</strong> code mandatory for all B2B and B2C outward supplies.</span>
                </div>
                <div className="p-2.5 bg-muted/40 rounded border space-y-1">
                  <strong className="text-foreground block">Rule 88A Set-off Priority Order</strong>
                  <span>IGST credit must be fully exhausted first before using CGST or SGST credits. CGST and SGST cannot cross-compensate each other.</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Official Printable Form GSTR-3B Modal ── */}
      <Dialog open={printGstr3bOpen} onOpenChange={setPrintGstr3bOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <div className="p-6 bg-white text-slate-900 print:p-0 print:m-0" id="gstr3b-print-slip">
            {/* Government Emblem / Header */}
            <div className="border-b-2 border-slate-900 pb-4 text-center">
              <h2 className="text-lg font-bold uppercase tracking-wide">Government of India</h2>
              <h3 className="text-xl font-extrabold tracking-wider mt-0.5">FORM GSTR-3B</h3>
              <p className="text-xs text-slate-600 mt-1">[See Rule 61(5) of CGST Rules, 2017]</p>
              <p className="text-xs font-semibold text-slate-800">Monthly Self-Assessed Summary Return</p>
            </div>

            {/* Return Meta Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 border-b border-slate-300 py-3 text-xs">
              <div>
                <span className="text-slate-500 block">Financial Year</span>
                <span className="font-bold">{gstr1.period.financialYear}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tax Period</span>
                <span className="font-bold">{gstr1.period.monthLabel}</span>
              </div>
              <div>
                <span className="text-slate-500 block">GSTIN of Supplier</span>
                <span className="font-bold font-mono">{gstr1.supplierGstin}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Legal Name</span>
                <span className="font-bold">{gstr1.supplierLegalName}</span>
              </div>
            </div>

            {/* Print Slip Table 3.1 */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-1.5 border border-slate-300">
                3.1 Details of Outward Supplies and Inward Supplies Liable to Reverse Charge
              </h4>
              <table className="w-full text-xs border border-collapse border-slate-300 mt-1">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-1.5 text-left">Nature of Supplies</th>
                    <th className="border border-slate-300 p-1.5 text-right">Taxable Val</th>
                    <th className="border border-slate-300 p-1.5 text-right">IGST</th>
                    <th className="border border-slate-300 p-1.5 text-right">CGST</th>
                    <th className="border border-slate-300 p-1.5 text-right">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1.5">(a) Outward Taxable Supplies</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table31.outwardTaxable.txval)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table31.outwardTaxable.iamt)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table31.outwardTaxable.camt)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table31.outwardTaxable.samt)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">(b) Zero Rated (Exports)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table31.zeroRated.txval)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table31.zeroRated.iamt)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">-</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">-</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Print Slip Table 4 */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-1.5 border border-slate-300">
                4. Eligible Input Tax Credit (ITC)
              </h4>
              <table className="w-full text-xs border border-collapse border-slate-300 mt-1">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-1.5 text-left">Details</th>
                    <th className="border border-slate-300 p-1.5 text-right">IGST</th>
                    <th className="border border-slate-300 p-1.5 text-right">CGST</th>
                    <th className="border border-slate-300 p-1.5 text-right">SGST</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1.5">(A) (5) All Other ITC (From Vendor Bills)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table4Itc.available.allOtherItc.iamt)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table4Itc.available.allOtherItc.camt)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table4Itc.available.allOtherItc.samt)}</td>
                  </tr>
                  <tr className="font-bold bg-slate-50">
                    <td className="border border-slate-300 p-1.5">(C) Net ITC Available</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table4Itc.netAvailable.iamt)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table4Itc.netAvailable.camt)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table4Itc.netAvailable.samt)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Print Slip Table 6.1 */}
            <div className="mt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider bg-slate-100 p-1.5 border border-slate-300">
                6.1 Payment of Tax (Rule 88A)
              </h4>
              <table className="w-full text-xs border border-collapse border-slate-300 mt-1">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="border border-slate-300 p-1.5 text-left">Tax Head</th>
                    <th className="border border-slate-300 p-1.5 text-right">Output Tax</th>
                    <th className="border border-slate-300 p-1.5 text-right">Paid via ITC</th>
                    <th className="border border-slate-300 p-1.5 text-right font-bold">Tax Paid in Cash</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Integrated Tax (IGST)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table61Payment.liability.igst)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table61Payment.paidViaItc.igstUsingIgst)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{fmtInr(gstr3b.table61Payment.taxPaidInCash.igst)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">Central Tax (CGST)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table61Payment.liability.cgst)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table61Payment.paidViaItc.cgstUsingCgst + gstr3b.table61Payment.paidViaItc.cgstUsingIgst)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{fmtInr(gstr3b.table61Payment.taxPaidInCash.cgst)}</td>
                  </tr>
                  <tr>
                    <td className="border border-slate-300 p-1.5">State Tax (SGST)</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table61Payment.liability.sgst)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table61Payment.paidViaItc.sgstUsingSgst + gstr3b.table61Payment.paidViaItc.sgstUsingIgst)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono font-bold">{fmtInr(gstr3b.table61Payment.taxPaidInCash.sgst)}</td>
                  </tr>
                  <tr className="bg-slate-100 font-bold">
                    <td className="border border-slate-300 p-1.5">TOTAL PAYABLE</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table61Payment.liability.total)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono">{fmtInr(gstr3b.table61Payment.paidViaItc.totalItcUsed)}</td>
                    <td className="border border-slate-300 p-1.5 text-right font-mono text-sm">{fmtInr(gstr3b.table61Payment.taxPaidInCash.totalCashPayable)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Declaration & Signatory */}
            <div className="mt-8 border-t border-slate-300 pt-4 flex justify-between items-end text-xs">
              <div className="max-w-md text-slate-500 text-[10px]">
                I hereby solemnly affirm and declare that the information given herein above is true and correct to the best of my knowledge and belief and nothing has been concealed therefrom.
              </div>
              <div className="text-center">
                <div className="w-40 border-b border-slate-400 mb-1"></div>
                <span className="font-semibold block">Authorized Signatory</span>
                <span className="text-[10px] text-slate-500 block">{gstr1.supplierLegalName}</span>
              </div>
            </div>

            {/* Print Action Bar */}
            <div className="mt-6 flex justify-end gap-2 print:hidden">
              <Button variant="outline" size="sm" onClick={() => setPrintGstr3bOpen(false)}>
                Close
              </Button>
              <Button
                size="sm"
                className="gap-1.5 bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => window.print()}
              >
                <Printer className="h-4 w-4" />
                Print Form GSTR-3B Slip
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function getStateName(code: string): string {
  const map: Record<string, string> = {
    "27": "Maharashtra",
    "29": "Karnataka",
    "07": "Delhi",
    "24": "Gujarat",
    "33": "Tamil Nadu",
    "06": "Haryana",
    "09": "Uttar Pradesh",
  }
  return map[code] || "Other State"
}
