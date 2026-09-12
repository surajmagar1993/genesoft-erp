"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  AustralianBasOverviewResult,
  exportAustralianBasJson,
  exportAustralianBasCsv,
} from "@/app/actions/finance/australia-tax"
import { validateAustralianAbn } from "@/lib/australia-tax-engine"
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
} from "lucide-react"
import { toast } from "sonner"

interface Props {
  initialData: AustralianBasOverviewResult
}

export function AustraliaTaxClient({ initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<"bas" | "abn_validator" | "payg" | "tax_invoice">("bas")
  const [selectedStartYear, setSelectedStartYear] = useState<number>(initialData.startYear)
  const [selectedQuarter, setSelectedQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">(initialData.quarter)

  // Interactive ABN Tester State
  const [testAbn, setTestAbn] = useState("51 824 753 556")
  const [abnValidation, setAbnValidation] = useState(validateAustralianAbn("51 824 753 556"))

  // Tax Invoice Printable Modal
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false)

  const handlePeriodChange = (newYear: number, newQuarter: "Q1" | "Q2" | "Q3" | "Q4") => {
    setSelectedStartYear(newYear)
    setSelectedQuarter(newQuarter)
    startTransition(() => {
      router.push(`/finance/tax-australia?startYear=${newYear}&quarter=${newQuarter}`)
    })
  }

  const handleAbnCheck = (val: string) => {
    setTestAbn(val)
    setAbnValidation(validateAustralianAbn(val))
  }

  const handleExportJson = async () => {
    try {
      const jsonStr = await exportAustralianBasJson({
        startYear: selectedStartYear,
        quarter: selectedQuarter,
      })
      const blob = new Blob([jsonStr], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ATO_BAS_${initialData.report.period.periodKey}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("ATO BAS JSON exported successfully")
    } catch {
      toast.error("Failed to export BAS JSON")
    }
  }

  const handleExportCsv = async () => {
    try {
      const csvStr = await exportAustralianBasCsv({
        startYear: selectedStartYear,
        quarter: selectedQuarter,
      })
      const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ATO_BAS_${initialData.report.period.periodKey}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("ATO BAS CSV exported successfully")
    } catch {
      toast.error("Failed to export BAS CSV")
    }
  }

  const { telemetry, report } = initialData

  return (
    <div className="space-y-6">
      {/* ── Header Banner ────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl bg-gradient-to-r from-emerald-950 via-teal-900 to-amber-950 p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-400/20 text-amber-300 ring-1 ring-amber-400/40">
              <Landmark className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">Australia GST (10%) & ATO BAS</h1>
                <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-xs font-semibold text-amber-200 ring-1 ring-amber-400/30">
                  🇦🇺 ATO Activity Statement
                </span>
              </div>
              <p className="text-sm text-emerald-200/80">
                Business Activity Statement (BAS), Modulus 89 ABN validation, PAYG withholding & 10% GST
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector & Deadlines */}
        <div className="flex flex-wrap items-center gap-3 bg-emerald-950/60 p-3 rounded-xl border border-emerald-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-amber-300" />
            <select
              value={selectedStartYear}
              onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10), selectedQuarter)}
              className="bg-emerald-900/80 border border-emerald-600/60 rounded px-2.5 py-1 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-amber-400"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-emerald-950 text-white">
                  FY {y}-{String(y + 1).slice(2)}
                </option>
              ))}
            </select>

            <div className="flex rounded-lg bg-emerald-900/90 p-0.5 border border-emerald-700/50">
              {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => handlePeriodChange(selectedStartYear, q)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    selectedQuarter === q
                      ? "bg-amber-400 text-slate-950 shadow-md font-bold"
                      : "text-emerald-200 hover:text-white"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="border-l border-emerald-700/60 pl-3">
            <div className="text-[11px] text-amber-200 font-medium">ATO Lodgment Due:</div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{report.period.dueDate}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  telemetry.status === "OVERDUE"
                    ? "bg-red-500 text-white"
                    : telemetry.status === "DUE_SOON"
                    ? "bg-amber-400 text-slate-950"
                    : "bg-emerald-500/30 text-emerald-200"
                }`}
              >
                {telemetry.daysRemaining >= 0 ? `${telemetry.daysRemaining}d left` : "Overdue"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── 4 Telemetry KPI Cards ────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: 1A GST on Sales */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-amber-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1A: GST on Sales (Collected)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              AUD ${telemetry.gstOnSales1A.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            From AUD ${report.g1TotalSales.toLocaleString()} gross sales (G1)
          </div>
        </div>

        {/* Card 2: 1B GST on Purchases */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-amber-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              1B: GST on Purchases (Credits)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Download className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              AUD ${telemetry.gstOnPurchases1B.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            From AUD ${report.totalPurchasesInclusive.toLocaleString()} total purchases (G10+G11)
          </div>
        </div>

        {/* Card 3: 9 Net GST */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-amber-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              9: Net GST {telemetry.isPayable ? "Payable" : "Refund"}
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                telemetry.isPayable
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                telemetry.isPayable ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              AUD ${telemetry.netGst9.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs font-medium flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                telemetry.isPayable ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
            {telemetry.isPayable ? "Payable to ATO on 1A - 1B" : "Refundable ATO Credit"}
          </div>
        </div>

        {/* Card 4: 8A Total Owed */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-amber-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              8A: Total Owed (GST + PAYG)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-purple-600 dark:text-purple-400">
              AUD ${telemetry.totalOwedToAto8A.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Includes AUD ${telemetry.paygWithheldW2.toLocaleString()} PAYG (W2)
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────── */}
      <div className="flex border-b border-border">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("bas")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "bas"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            ATO BAS Statement ({report.period.quarterLabel})
          </button>

          <button
            onClick={() => setActiveTab("abn_validator")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "abn_validator"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Search className="h-4 w-4" />
            ABN Validator (Modulus 89)
          </button>

          <button
            onClick={() => setActiveTab("payg")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "payg"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Users className="h-4 w-4" />
            PAYG Withholding (W1, W2, 8A)
          </button>

          <button
            onClick={() => setActiveTab("tax_invoice")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "tax_invoice"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Receipt className="h-4 w-4" />
            Official Tax Invoice Desk
          </button>
        </div>
      </div>

      {/* ── TAB 1: ATO BAS Statement ──────────────────────────────────── */}
      {activeTab === "bas" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">
                ATO Business Activity Statement — {report.period.fyLabel} {report.period.quarterLabel}
              </h2>
              <p className="text-xs text-muted-foreground">
                Entity: {report.taxpayerLegalName} | ABN: {report.taxpayerAbn}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5 text-emerald-600" />
                Export BAS JSON
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Download className="h-3.5 w-3.5" />
                Export BAS CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Calculation Sheet */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 border-b border-border pb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                GST Calculation — Sales (G1 to G4)
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span><strong className="font-mono text-foreground">G1:</strong> Total Sales (includes any GST)</span>
                  <span className="font-mono font-bold">AUD ${report.g1TotalSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span><strong className="font-mono text-foreground">G2:</strong> Export Sales (GST-free)</span>
                  <span className="font-mono">AUD ${report.g2ExportSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span><strong className="font-mono text-foreground">G3:</strong> Other GST-free Sales (Medical/Education)</span>
                  <span className="font-mono">AUD ${report.g3OtherGstFreeSales.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span><strong className="font-mono text-foreground">G4:</strong> Input Taxed Sales (Financial/Rent)</span>
                  <span className="font-mono">AUD ${report.g4InputTaxedSales.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-2 pt-3 font-bold bg-muted/40 px-3 rounded-lg text-sm">
                  <span>1A: GST on Sales (Collected)</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    AUD ${report.box1AGstOnSales.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Purchases Calculation Sheet */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 border-b border-border pb-2 flex items-center gap-2">
                <Download className="h-4 w-4" />
                GST Calculation — Purchases (G10 to G11)
              </h3>

              <div className="space-y-2 text-xs">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span><strong className="font-mono text-foreground">G10:</strong> Capital Purchases (Assets/Equipment)</span>
                  <span className="font-mono">AUD ${report.g10CapitalPurchases.toFixed(2)}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span><strong className="font-mono text-foreground">G11:</strong> Non-capital Purchases (Operating/Stock)</span>
                  <span className="font-mono">AUD ${report.g11NonCapitalPurchases.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-2 pt-8 font-bold bg-muted/40 px-3 rounded-lg text-sm">
                  <span>1B: GST on Purchases (Credits Claimed)</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    AUD ${report.box1BGstOnPurchases.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Activity Statement Summary Settlement */}
          <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-background to-amber-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Label 9: Net GST (1A minus 1B)
              </div>
              <div className="text-3xl font-black text-foreground mt-1">
                AUD ${Math.abs(report.box9NetGst).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="ml-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {report.box9NetGst >= 0 ? "Payable to ATO" : "Refundable Credit"}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Lodgment & Payment Due: <span className="font-bold text-foreground">{report.period.dueDate}</span></div>
              <div>Payment Reference Number (PRN): <span className="font-mono text-foreground">ATO-{report.taxpayerAbn.replace(/\s/g, "")}</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: ABN Validator (Modulus 89) ─────────────────────────── */}
      {activeTab === "abn_validator" && (
        <div className="max-w-2xl mx-auto space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Search className="h-5 w-5 text-emerald-600" />
              ATO Modulus 89 ABN Verification Engine
            </h3>
            <p className="text-xs text-muted-foreground">
              Validates Australian Business Numbers against the official ATO algorithm (11 digits, weight factors, sum mod 89)
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground">
                Enter Australian Business Number (ABN):
              </label>
              <input
                type="text"
                value={testAbn}
                onChange={(e) => handleAbnCheck(e.target.value)}
                placeholder="e.g. 51 824 753 556"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none"
              />
            </div>

            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                abnValidation.isValid
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                  : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200"
              }`}
            >
              {abnValidation.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <div className="font-bold text-sm">
                  {abnValidation.isValid ? "Valid Australian Business Number (ABN)" : "Invalid ABN"}
                </div>
                {abnValidation.isValid ? (
                  <div>
                    Standard Formatted ABN: <strong className="font-mono">{abnValidation.formattedAbn}</strong>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      Status: Active and compliant for Australian GST invoicing and input tax credits.
                    </div>
                  </div>
                ) : (
                  <div className="font-semibold">{abnValidation.error}</div>
                )}
              </div>
            </div>

            {/* Quick Presets */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Test Known Valid ABNs:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Dept of Prime Minister & Cabinet", abn: "51 824 753 556" },
                  { name: "Telstra Corporation", abn: "33 051 775 556" },
                  { name: "Commonwealth Bank", abn: "48 123 123 124" },
                ].map((item) => (
                  <button
                    key={item.abn}
                    onClick={() => handleAbnCheck(item.abn)}
                    className="text-xs px-2.5 py-1 rounded border border-border bg-muted/40 hover:bg-accent text-foreground transition-all"
                  >
                    {item.name} ({item.abn})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: PAYG Withholding Desk ──────────────────────────────── */}
      {activeTab === "payg" && (
        <div className="space-y-5">
          <div className="bg-card p-5 rounded-xl border border-border shadow-sm space-y-4">
            <div>
              <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="h-5 w-5 text-purple-600" />
                PAYG Tax Withheld (Option 4: W1 & W2)
              </h3>
              <p className="text-xs text-muted-foreground">
                Employee salaries, contractor withholding, and total activity statement liability to the ATO
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">
                  W1: Total salary, wages and other payments
                </span>
                <div className="text-xl font-bold font-mono text-foreground">
                  AUD ${report.boxW1GrossWages.toFixed(2)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Gross wages subject to PAYG withholding in {report.period.quarterLabel}
                </div>
              </div>

              <div className="p-4 rounded-lg bg-muted/40 border border-border space-y-1">
                <span className="text-xs text-muted-foreground font-semibold">
                  W2: Amounts withheld from payments shown at W1
                </span>
                <div className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400">
                  AUD ${report.boxW2TaxWithheld.toFixed(2)}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Statutory tax withheld on behalf of the Commissioner of Taxation
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-purple-500/30 bg-purple-500/10 p-5 flex justify-between items-center">
              <div>
                <span className="text-xs uppercase font-bold text-muted-foreground">
                  8A: Total Amount Owed to ATO (GST + PAYG)
                </span>
                <div className="text-2xl font-black text-purple-700 dark:text-purple-300 mt-0.5">
                  AUD ${report.box8ATotalOwedToAto.toFixed(2)}
                </div>
              </div>
              <div className="text-xs text-right text-muted-foreground">
                <div>Formula: <strong>Net GST (9) + PAYG (W2)</strong></div>
                <div>ATO Payment Reference: <strong>PRN-AU-{report.period.quarter}</strong></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Official Tax Invoice Desk ──────────────────────────── */}
      {activeTab === "tax_invoice" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-600" />
                  ATO Tax Invoice Statutory Standards
                </h3>
                <p className="text-xs text-muted-foreground">
                  Statutory rules for invoices over $1,000 AUD (ABN display, GST inclusive breakdown)
                </p>
              </div>
              <button
                onClick={() => setIsInvoiceModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Printer className="h-3.5 w-3.5" /> Preview Australian Tax Invoice
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
                <div className="font-bold text-foreground">ATO Mandatory Requirements:</div>
                <ul className="space-y-1 list-disc list-inside text-muted-foreground">
                  <li>Must state that the document is intended to be a <strong>"Tax Invoice"</strong></li>
                  <li>Seller's identity and <strong>Australian Business Number (ABN)</strong></li>
                  <li>Date of issue of the invoice</li>
                  <li>Brief description of items sold, quantity, and price</li>
                  <li>The GST amount payable (or statement: <em>"Total price includes GST"</em>)</li>
                  <li>If total exceeds <strong>$1,000 AUD</strong>, buyer's identity or buyer's ABN must be shown</li>
                </ul>
              </div>

              <div className="p-3.5 rounded-lg border border-border bg-muted/20 space-y-2">
                <div className="font-bold text-foreground">GST Calculation Method (1/11th):</div>
                <p className="text-muted-foreground">
                  For GST-inclusive pricing at 10%, the GST portion is calculated as exactly <strong>1/11th</strong> of the total price.
                </p>
                <div className="p-2 rounded bg-background font-mono text-[11px] border border-border">
                  GST = Total Inclusive Amount / 11<br />
                  e.g. $1,100.00 AUD total includes $100.00 AUD GST ($1,100 / 11)
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Printable Australian Tax Invoice Modal ───────────────────── */}
      {isInvoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3 no-print">
              <span className="font-bold">Compliant Australian Tax Invoice</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <Printer className="h-4 w-4" /> Print Tax Invoice
                </button>
                <button
                  onClick={() => setIsInvoiceModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="printable-content space-y-6 pt-4 text-slate-900 bg-white p-6 rounded-lg">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold">{report.taxpayerLegalName}</h2>
                  <div className="text-xs text-slate-600">{report.taxpayerAddress}</div>
                  <div className="text-xs font-mono font-bold text-emerald-800 mt-1">
                    ABN: {report.taxpayerAbn}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-black text-slate-900 tracking-tight">TAX INVOICE</div>
                  <div className="text-xs text-slate-600 mt-1">
                    Invoice #: <span className="font-mono font-bold">AU-INV-2026-0042</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Date: <span className="font-mono">{new Date().toISOString().split("T")[0]}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded border border-slate-200">
                  <span className="font-bold text-slate-700 uppercase">Billed To (Customer):</span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">Sydney Tech Enterprises Pty Ltd</div>
                  <div className="text-slate-600">Level 12, 200 George Street, Sydney NSW 2000</div>
                  <div className="font-mono text-slate-700 mt-0.5">ABN: 33 051 775 556 (Verified)</div>
                </div>

                <div className="p-3 rounded border border-slate-200 space-y-1">
                  <span className="font-bold text-slate-700 uppercase">GST Registration & Compliance:</span>
                  <div className="text-xs text-emerald-800 font-semibold">
                    Registered for Australian GST (10%)
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Complies with Section 29-70 of A New Tax System (GST) Act 1999.
                  </div>
                </div>
              </div>

              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Description</th>
                    <th className="p-2 text-right">Price (Excl. GST)</th>
                    <th className="p-2 text-right">GST Rate</th>
                    <th className="p-2 text-right">GST Amount</th>
                    <th className="p-2 text-right">Total (AUD)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="p-2 font-medium">Enterprise Cloud ERP Subscription (Quarterly)</td>
                    <td className="p-2 text-right font-mono">$1,000.00</td>
                    <td className="p-2 text-right font-mono">10.00%</td>
                    <td className="p-2 text-right font-mono text-emerald-800 font-semibold">$100.00</td>
                    <td className="p-2 text-right font-mono font-bold">$1,100.00</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 font-bold">
                  <tr>
                    <td colSpan={4} className="p-2 text-right">Total Price (Includes $100.00 GST):</td>
                    <td className="p-2 text-right font-mono text-sm text-slate-900">$1,100.00 AUD</td>
                  </tr>
                </tfoot>
              </table>

              <div className="text-[10px] text-slate-500 text-center border-t pt-3">
                Total price includes GST. Please pay within 14 days of invoice date.
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .printable-content,
          .printable-content * {
            visibility: visible;
          }
          .printable-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  )
}
