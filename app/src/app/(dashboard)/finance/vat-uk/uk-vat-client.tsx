"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  UkVatOverviewResult,
  exportUkMtdJson,
  exportUkMtdCsv,
} from "@/app/actions/finance/uk-vat"
import { validateUkVrn } from "@/lib/uk-vat-engine"
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Download,
  Printer,
  Calendar,
  Building2,
  Search,
  ShieldCheck,
  CreditCard,
  FileCheck,
  Percent,
} from "lucide-react"
import { toast } from "sonner"

interface Props {
  initialData: UkVatOverviewResult
}

export function UkVatClient({ initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<"mtd_return" | "vrn_validator" | "rate_breakdown" | "certificate">("mtd_return")
  const [selectedYear, setSelectedYear] = useState<number>(initialData.year)
  const [selectedQuarter, setSelectedQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">(initialData.quarter)

  // Interactive VRN Tester State
  const [testVrn, setTestVrn] = useState("GB 999 9999 73")
  const [vrnValidation, setVrnValidation] = useState(validateUkVrn("GB 999 9999 73"))

  // Certificate Modal State
  const [isCertificateModalOpen, setIsCertificateModalOpen] = useState(false)

  const handlePeriodChange = (newYear: number, newQuarter: "Q1" | "Q2" | "Q3" | "Q4") => {
    setSelectedYear(newYear)
    setSelectedQuarter(newQuarter)
    startTransition(() => {
      router.push(`/finance/vat-uk?year=${newYear}&quarter=${newQuarter}`)
    })
  }

  const handleVrnCheck = (val: string) => {
    setTestVrn(val)
    setVrnValidation(validateUkVrn(val))
  }

  const handleExportJson = async () => {
    try {
      const jsonStr = await exportUkMtdJson({
        year: selectedYear,
        quarter: selectedQuarter,
      })
      const blob = new Blob([jsonStr], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `HMRC_MTD_VAT_RETURN_${initialData.report.period.periodKey}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("HMRC MTD JSON exported successfully")
    } catch {
      toast.error("Failed to export MTD JSON")
    }
  }

  const handleExportCsv = async () => {
    try {
      const csvStr = await exportUkMtdCsv({
        year: selectedYear,
        quarter: selectedQuarter,
      })
      const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `HMRC_MTD_VAT_RETURN_${initialData.report.period.periodKey}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("HMRC MTD CSV exported successfully")
    } catch {
      toast.error("Failed to export MTD CSV")
    }
  }

  const { telemetry, report } = initialData

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl bg-gradient-to-r from-blue-950 via-indigo-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/20 text-blue-400 ring-1 ring-blue-400/40">
              <FileSpreadsheet className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">UK VAT (20%) & HMRC MTD</h1>
                <span className="rounded-md bg-blue-500/30 px-2 py-0.5 text-xs font-semibold text-blue-200 ring-1 ring-blue-400/30">
                  🇬🇧 Making Tax Digital (9-Box Model)
                </span>
              </div>
              <p className="text-sm text-blue-200/80">
                Official HMRC 9-Box VAT return, Modulus 97 VRN validation, standard 20% / reduced 5% rates
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector & Deadlines */}
        <div className="flex flex-wrap items-center gap-3 bg-blue-950/70 p-3 rounded-xl border border-blue-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-blue-300" />
            <select
              value={selectedYear}
              onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10), selectedQuarter)}
              className="bg-blue-900/80 border border-blue-600/60 rounded px-2.5 py-1 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-blue-950 text-white">
                  {y}
                </option>
              ))}
            </select>

            <div className="flex rounded-lg bg-blue-900/90 p-0.5 border border-blue-700/50">
              {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => handlePeriodChange(selectedYear, q)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    selectedQuarter === q
                      ? "bg-blue-500 text-white shadow-md font-bold"
                      : "text-blue-200 hover:text-white"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="border-l border-blue-700/60 pl-3">
            <div className="text-[11px] text-blue-200 font-medium">HMRC Submission Due:</div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{report.period.dueDate}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  telemetry.status === "OVERDUE"
                    ? "bg-red-500 text-white"
                    : telemetry.status === "DUE_SOON"
                    ? "bg-amber-400 text-slate-950"
                    : "bg-blue-500/30 text-blue-200"
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
        {/* Card 1: Box 3 Total Output VAT */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-blue-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Box 3: Total Output VAT Due
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              £{telemetry.box3TotalVatDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            Box 1 (£{report.box1VatDueSales.toFixed(2)}) + Box 2 (£{report.box2VatDueAcquisitions.toFixed(2)})
          </div>
        </div>

        {/* Card 2: Box 4 Input VAT Reclaimed */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-blue-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Box 4: VAT Reclaimed
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Download className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              £{telemetry.box4VatReclaimed.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            From £{telemetry.box7NetPurchases.toLocaleString()} net purchases (Box 7)
          </div>
        </div>

        {/* Card 3: Box 5 Net VAT */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-blue-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Box 5: Net VAT {telemetry.isPayable ? "to Pay" : "to Reclaim"}
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                telemetry.isPayable
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <CreditCard className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                telemetry.isPayable ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              £{telemetry.box5NetVatDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs font-medium flex items-center gap-1.5">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                telemetry.isPayable ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
            {telemetry.isPayable ? "Pay to HMRC via Direct Debit / BACS" : "HMRC Repayment Claim"}
          </div>
        </div>

        {/* Card 4: VRN Compliance */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-blue-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              VRN Compliance Rate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {telemetry.vrnComplianceRate}%
            </span>
            <span className="text-xs text-muted-foreground">
              ({report.summary.invoicesCount} Invoices)
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            B2B customers verified with Modulus 97
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────── */}
      <div className="flex border-b border-border">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("mtd_return")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "mtd_return"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            HMRC MTD 9-Box Return
          </button>

          <button
            onClick={() => setActiveTab("vrn_validator")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "vrn_validator"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Search className="h-4 w-4" />
            VRN Validator (Modulus 97)
          </button>

          <button
            onClick={() => setActiveTab("rate_breakdown")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "rate_breakdown"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Percent className="h-4 w-4" />
            Rate Ledger (20%, 5%, 0%)
          </button>

          <button
            onClick={() => setActiveTab("certificate")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "certificate"
                ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <FileCheck className="h-4 w-4" />
            Printable HMRC Return Slip
          </button>
        </div>
      </div>

      {/* ── TAB 1: HMRC MTD 9-Box Return ──────────────────────────────── */}
      {activeTab === "mtd_return" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">
                Making Tax Digital for VAT — {report.period.quarterLabel}
              </h2>
              <p className="text-xs text-muted-foreground">
                Taxpayer: {report.taxpayerLegalName} | VRN: {report.taxpayerVrn}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                <Download className="h-3.5 w-3.5 text-blue-600" />
                Export MTD API JSON
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Download className="h-3.5 w-3.5" />
                Export 9-Box CSV
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 w-20">Box #</th>
                  <th className="px-4 py-3">Statutory Description (HMRC MTD Standard)</th>
                  <th className="px-4 py-3 text-right">Amount (GBP £)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border font-mono text-xs">
                {/* Box 1 */}
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-bold text-foreground">Box 1</td>
                  <td className="px-4 py-3 font-sans">VAT due in the period on sales and other outputs</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">£{report.box1VatDueSales.toFixed(2)}</td>
                </tr>

                {/* Box 2 */}
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-bold text-foreground">Box 2</td>
                  <td className="px-4 py-3 font-sans">VAT due in the period on acquisitions from EU member states</td>
                  <td className="px-4 py-3 text-right font-bold text-foreground">£{report.box2VatDueAcquisitions.toFixed(2)}</td>
                </tr>

                {/* Box 3 */}
                <tr className="bg-blue-500/10 font-semibold">
                  <td className="px-4 py-3 font-bold text-blue-600 dark:text-blue-400">Box 3</td>
                  <td className="px-4 py-3 font-sans font-bold text-foreground">TOTAL VAT DUE (Box 1 + Box 2)</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600 dark:text-blue-400 text-sm">£{report.box3TotalVatDue.toFixed(2)}</td>
                </tr>

                {/* Box 4 */}
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-bold text-foreground">Box 4</td>
                  <td className="px-4 py-3 font-sans">VAT reclaimed in the period on purchases and other inputs (including acquisitions from the EU)</td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400">£{report.box4VatReclaimedPurchases.toFixed(2)}</td>
                </tr>

                {/* Box 5 */}
                <tr className="bg-amber-500/10 font-bold">
                  <td className="px-4 py-3 text-amber-700 dark:text-amber-400 text-sm">Box 5</td>
                  <td className="px-4 py-3 font-sans text-foreground text-sm">
                    NET VAT TO PAY TO HMRC OR RECLAIM (Box 3 minus Box 4)
                  </td>
                  <td className="px-4 py-3 text-right text-amber-700 dark:text-amber-400 text-base">
                    £{Math.abs(report.box5NetVatDue).toFixed(2)} {report.box5NetVatDue >= 0 ? "(Pay)" : "(Reclaim)"}
                  </td>
                </tr>

                {/* Box 6 */}
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-bold text-foreground">Box 6</td>
                  <td className="px-4 py-3 font-sans">Total value of sales and all other outputs excluding any VAT (whole pounds)</td>
                  <td className="px-4 py-3 text-right font-bold">£{report.box6TotalValueSalesExVat.toLocaleString()}</td>
                </tr>

                {/* Box 7 */}
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-bold text-foreground">Box 7</td>
                  <td className="px-4 py-3 font-sans">Total value of purchases and all other inputs excluding any VAT (whole pounds)</td>
                  <td className="px-4 py-3 text-right font-bold">£{report.box7TotalValuePurchasesExVat.toLocaleString()}</td>
                </tr>

                {/* Box 8 */}
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-bold text-foreground">Box 8</td>
                  <td className="px-4 py-3 font-sans">Total value of all supplies of goods and related costs, excluding any VAT, to EU Member States</td>
                  <td className="px-4 py-3 text-right">£{report.box8TotalValueGoodsSuppliedExVat.toLocaleString()}</td>
                </tr>

                {/* Box 9 */}
                <tr className="hover:bg-muted/30">
                  <td className="px-4 py-3 font-bold text-foreground">Box 9</td>
                  <td className="px-4 py-3 font-sans">Total value of all acquisitions of goods and related costs, excluding any VAT, from EU Member States</td>
                  <td className="px-4 py-3 text-right">£{report.box9TotalAcquisitionsExVat.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: VRN Validator (Modulus 97) ─────────────────────────── */}
      {activeTab === "vrn_validator" && (
        <div className="max-w-2xl mx-auto space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
          <div className="border-b border-border pb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-600" />
              HMRC Modulus 97 VRN Validation Desk
            </h3>
            <p className="text-xs text-muted-foreground">
              Tests 9-digit UK VAT Registration Numbers against HMRC statutory checksum rules (weights [8,7,6,5,4,3,2])
            </p>
          </div>

          <div className="space-y-3 text-sm">
            <div>
              <label className="block text-xs font-semibold text-muted-foreground">
                Enter UK VAT Registration Number (VRN):
              </label>
              <input
                type="text"
                value={testVrn}
                onChange={(e) => handleVrnCheck(e.target.value)}
                placeholder="e.g. GB 999 9999 73 or 123456782"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div
              className={`p-4 rounded-xl border flex items-start gap-3 ${
                vrnValidation.isValid
                  ? "bg-blue-500/10 border-blue-500/30 text-blue-950 dark:text-blue-200"
                  : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200"
              }`}
            >
              {vrnValidation.isValid ? (
                <CheckCircle2 className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <div className="font-bold text-sm">
                  {vrnValidation.isValid ? "Valid UK VAT Registration Number" : "Invalid UK VRN"}
                </div>
                {vrnValidation.isValid ? (
                  <div>
                    Standard Formatted VRN: <strong className="font-mono">{vrnValidation.formattedVrn}</strong>
                    <div className="text-[11px] text-muted-foreground mt-1">
                      HMRC Modulus 97 Verification: Passed. Eligible for MTD digital linking.
                    </div>
                  </div>
                ) : (
                  <div className="font-semibold">{vrnValidation.error}</div>
                )}
              </div>
            </div>

            {/* Presets */}
            <div className="pt-2">
              <span className="text-xs font-semibold text-muted-foreground block mb-1.5">
                Test Known VRN Formats:
              </span>
              <div className="flex flex-wrap gap-2">
                {[
                  { name: "Standard Government VRN", vrn: "GB 999 9999 73" },
                  { name: "HMRC Public Test VRN 1", vrn: "GB 123 4567 82" },
                  { name: "Valid Compact VRN", vrn: "999999973" },
                ].map((item) => (
                  <button
                    key={item.vrn}
                    onClick={() => handleVrnCheck(item.vrn)}
                    className="text-xs px-2.5 py-1 rounded border border-border bg-muted/40 hover:bg-accent text-foreground transition-all"
                  >
                    {item.name} ({item.vrn})
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: Rate Breakdown (20%, 5%, 0%) ───────────────────────── */}
      {activeTab === "rate_breakdown" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase text-muted-foreground">Standard Rate (20%)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-blue-500/10 text-blue-600 font-bold">20.00%</span>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-2">
              £{report.summary.standardRateVat.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Applies to most business goods, cloud software licenses, and professional consulting services.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase text-muted-foreground">Reduced Rate (5%)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 font-bold">5.00%</span>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-2">
              £{report.summary.reducedRateVat.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Applies to qualifying domestic electricity/gas, children&apos;s car seats, and energy saving materials.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-2 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-2">
              <span className="text-xs font-bold uppercase text-muted-foreground">Zero Rate & Exports (0%)</span>
              <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold">0.00%</span>
            </div>
            <div className="text-2xl font-bold font-mono text-foreground mt-2">
              £{report.summary.zeroRateSalesExVat.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Applies to books, food, children&apos;s clothes, and outward supplies exported outside the UK.
            </p>
          </div>
        </div>
      )}

      {/* ── TAB 4: Printable HMRC Slip ────────────────────────────────── */}
      {activeTab === "certificate" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-4">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-blue-600" />
                  Official HMRC MTD VAT Return Declaration
                </h3>
                <p className="text-xs text-muted-foreground">
                  Statutory declaration for auditor review and corporate records
                </p>
              </div>
              <button
                onClick={() => setIsCertificateModalOpen(true)}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Printer className="h-3.5 w-3.5" /> Preview MTD Certificate
              </button>
            </div>

            <div className="p-4 rounded-lg bg-muted/20 border border-border text-xs space-y-2 text-muted-foreground">
              <p>
                Under Section 58A of the Value Added Tax Act 1994, VAT-registered businesses must keep digital records and submit their VAT returns using MTD-compatible software.
              </p>
              <p>
                Net VAT due at Box 5: <strong className="text-foreground">£{Math.abs(report.box5NetVatDue).toFixed(2)}</strong> ({report.box5NetVatDue >= 0 ? "Payable" : "Reclaimable"}).
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Printable HMRC Return Slip ────────────────────────── */}
      {isCertificateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl p-6 relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-border pb-3 no-print">
              <span className="font-bold">Official HMRC MTD Return Certificate</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
                >
                  <Printer className="h-4 w-4" /> Print Return Certificate
                </button>
                <button
                  onClick={() => setIsCertificateModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Content */}
            <div className="printable-content space-y-6 pt-4 text-slate-900 bg-white p-6 rounded-lg">
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold">{report.taxpayerLegalName}</h2>
                  <div className="text-xs text-slate-600">{report.taxpayerAddress}</div>
                  <div className="text-xs font-mono font-bold text-blue-900 mt-1">
                    VAT Registration Number: {report.taxpayerVrn}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black text-slate-900">HM REVENUE & CUSTOMS</div>
                  <div className="text-xs text-slate-600 mt-0.5">Making Tax Digital for VAT</div>
                  <div className="text-xs font-mono font-bold mt-1">Period: {report.period.quarterLabel}</div>
                  <div className="text-xs text-slate-600">Due Date: {report.period.dueDate}</div>
                </div>
              </div>

              <div className="border border-slate-200 rounded p-4 text-xs space-y-2">
                <div className="font-bold text-sm text-slate-800 border-b pb-1">MTD 9-Box Figures Submitted:</div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
                  <div>Box 1 (VAT due on sales): <strong>£{report.box1VatDueSales.toFixed(2)}</strong></div>
                  <div>Box 2 (VAT on acquisitions): <strong>£{report.box2VatDueAcquisitions.toFixed(2)}</strong></div>
                  <div>Box 3 (Total VAT due): <strong>£{report.box3TotalVatDue.toFixed(2)}</strong></div>
                  <div>Box 4 (VAT reclaimed): <strong>£{report.box4VatReclaimedPurchases.toFixed(2)}</strong></div>
                  <div className="col-span-2 pt-1 border-t text-sm font-bold text-blue-900">
                    Box 5 (Net VAT {report.box5NetVatDue >= 0 ? "to Pay" : "to Reclaim"}): £{Math.abs(report.box5NetVatDue).toFixed(2)}
                  </div>
                  <div className="pt-1">Box 6 (Net Sales): £{report.box6TotalValueSalesExVat.toLocaleString()}</div>
                  <div className="pt-1">Box 7 (Net Purchases): £{report.box7TotalValuePurchasesExVat.toLocaleString()}</div>
                  <div>Box 8 (EU Supplies): £{report.box8TotalValueGoodsSuppliedExVat.toLocaleString()}</div>
                  <div>Box 9 (EU Acquisitions): £{report.box9TotalAcquisitionsExVat.toLocaleString()}</div>
                </div>
              </div>

              <div className="border-t pt-4 text-[10px] text-slate-500 text-center">
                I declare that the information given on this return is true and complete to the best of my knowledge and belief.
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
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
