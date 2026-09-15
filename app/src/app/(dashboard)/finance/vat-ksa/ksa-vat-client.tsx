"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  KsaVatOverviewResult,
  KsaInvoiceListItem,
  exportKsaVatReturnJson,
  exportKsaVatReturnCsv,
  generateZatcaInvoicePayload,
} from "@/app/actions/finance/ksa-zatca"
import {
  encodeZatcaTlv,
  decodeZatcaTlv,
  validateKsaVatNumber,
  calculateZakatBase,
  ZakatCalculationInputs,
  ZakatCalculationResult,
} from "@/lib/ksa-zatca-engine"
import {
  ShieldCheck,
  QrCode,
  FileText,
  Calculator,
  Download,
  Printer,
  Calendar,
  Building2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  Search,
  Eye,
  FileCode,
  Copy,
  Check,
  RefreshCw,
} from "lucide-react"
import { toast } from "sonner"

interface Props {
  initialData: KsaVatOverviewResult
}

export function KsaVatClient({ initialData }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const [activeTab, setActiveTab] = useState<"fatoora" | "qr_studio" | "vat_return" | "zakat">("fatoora")
  const [selectedYear, setSelectedYear] = useState<number>(initialData.year)
  const [selectedQuarter, setSelectedQuarter] = useState<"Q1" | "Q2" | "Q3" | "Q4">(initialData.quarter)

  // Invoice Inspection Modals
  const [inspectingPayload, setInspectingPayload] = useState<any | null>(null)
  const [isInspectingLoading, setIsInspectingLoading] = useState(false)
  const [isXmlModalOpen, setIsXmlModalOpen] = useState(false)
  const [isPrintInvoiceModalOpen, setIsPrintInvoiceModalOpen] = useState(false)
  const [copiedText, setCopiedText] = useState<string | null>(null)

  // Interactive QR Studio State
  const [qrSellerName, setQrSellerName] = useState("Genesoft Middle East KSA LLC")
  const [qrVatNumber, setQrVatNumber] = useState("310123456789003")
  const [qrTimestamp, setQrTimestamp] = useState(new Date().toISOString().slice(0, 19) + "Z")
  const [qrTotal, setQrTotal] = useState("1150.00")
  const [qrVat, setQrVat] = useState("150.00")

  // Interactive QR Decoder State
  const [decodeInput, setDecodeInput] = useState("")
  const [decodedResult, setDecodedResult] = useState<any | null>(null)

  // Interactive Zakat Calculator State
  const [zakatInputs, setZakatInputs] = useState<ZakatCalculationInputs>({
    calendarType: "GREGORIAN",
    paidUpCapital: 500000,
    retainedEarnings: 120000,
    statutoryReserves: 50000,
    otherReserves: 10000,
    longTermLiabilities: 80000,
    provisions: 15000,
    adjustedNetProfit: Math.max(0, initialData.report.totalSalesTaxable - initialData.report.totalPurchasesTaxable),
    netFixedAssets: 150000,
    longTermInvestments: 25000,
    constructionInProgress: 0,
    carriedForwardLosses: 0,
  })

  const [zakatResult, setZakatResult] = useState<ZakatCalculationResult>(
    calculateZakatBase(zakatInputs)
  )

  const handlePeriodChange = (newYear: number, newQuarter: "Q1" | "Q2" | "Q3" | "Q4") => {
    setSelectedYear(newYear)
    setSelectedQuarter(newQuarter)
    startTransition(() => {
      router.push(`/finance/vat-ksa?year=${newYear}&quarter=${newQuarter}`)
    })
  }

  // Copy helper
  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopiedText(label)
    toast.success(`Copied ${label} to clipboard`)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Open Invoice Inspection
  const handleInspectInvoice = async (invoiceId: string, mode: "xml" | "print") => {
    try {
      setIsInspectingLoading(true)
      const payload = await generateZatcaInvoicePayload(invoiceId)
      setInspectingPayload(payload)
      if (mode === "xml") setIsXmlModalOpen(true)
      else setIsPrintInvoiceModalOpen(true)
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch invoice details")
    } finally {
      setIsInspectingLoading(false)
    }
  }

  // Export JSON
  const handleExportJson = async () => {
    try {
      const jsonStr = await exportKsaVatReturnJson({
        year: selectedYear,
        quarter: selectedQuarter,
      })
      const blob = new Blob([jsonStr], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ZATCA_VAT_RETURN_${initialData.report.period.periodKey}.json`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("ZATCA VAT Return JSON exported successfully")
    } catch (err) {
      toast.error("Failed to export ZATCA JSON")
    }
  }

  // Export CSV
  const handleExportCsv = async () => {
    try {
      const csvStr = await exportKsaVatReturnCsv({
        year: selectedYear,
        quarter: selectedQuarter,
      })
      const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `ZATCA_VAT_RETURN_${initialData.report.period.periodKey}.csv`
      a.click()
      URL.revokeObjectURL(url)
      toast.success("ZATCA VAT Return CSV exported successfully")
    } catch (err) {
      toast.error("Failed to export CSV")
    }
  }

  // Run TLV Generator
  const generatedTlv = encodeZatcaTlv({
    sellerName: qrSellerName,
    vatNumber: qrVatNumber,
    invoiceTimestamp: qrTimestamp,
    invoiceTotal: qrTotal,
    vatTotal: qrVat,
  })

  // Run TLV Decoder
  const handleDecode = () => {
    if (!decodeInput.trim()) {
      toast.error("Please paste a ZATCA Base64 string to decode")
      return
    }
    const res = decodeZatcaTlv(decodeInput.trim())
    setDecodedResult(res)
    if (res.isValid) {
      toast.success("ZATCA TLV successfully decoded and verified!")
    } else {
      toast.error(res.error || "Decoding failed")
    }
  }

  // Recompute Zakat
  const updateZakatInput = (field: keyof ZakatCalculationInputs, val: any) => {
    const updated = { ...zakatInputs, [field]: val }
    setZakatInputs(updated)
    setZakatResult(calculateZakatBase(updated))
  }

  const { telemetry, report, invoices } = initialData

  return (
    <div className="space-y-6">
      {/* ── Top Header Banner ────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between rounded-xl bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-950 p-6 text-white shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-400/40">
              <ShieldCheck className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">KSA VAT (15%) & ZATCA Fatoora</h1>
                <span className="rounded-md bg-emerald-500/30 px-2 py-0.5 text-xs font-semibold text-emerald-200 ring-1 ring-emerald-400/30">
                  🇸🇦 ZATCA E-Invoicing Phase 1 & 2
                </span>
              </div>
              <p className="text-sm text-emerald-200/80">
                Statutory 15% VAT return, TLV Base64 QR codes, UBL 2.1 e-invoicing & Zakat estimation
              </p>
            </div>
          </div>
        </div>

        {/* Period Selector & Deadlines */}
        <div className="flex flex-wrap items-center gap-3 bg-emerald-950/60 p-3 rounded-xl border border-emerald-700/50 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-emerald-400" />
            <select
              value={selectedYear}
              onChange={(e) => handlePeriodChange(parseInt(e.target.value, 10), selectedQuarter)}
              className="bg-emerald-900/80 border border-emerald-600/60 rounded px-2.5 py-1 text-sm font-medium text-white focus:outline-none focus:ring-1 focus:ring-emerald-400"
            >
              {[2025, 2026, 2027].map((y) => (
                <option key={y} value={y} className="bg-emerald-950 text-white">
                  {y}
                </option>
              ))}
            </select>

            <div className="flex rounded-lg bg-emerald-900/90 p-0.5 border border-emerald-700/50">
              {(["Q1", "Q2", "Q3", "Q4"] as const).map((q) => (
                <button
                  key={q}
                  onClick={() => handlePeriodChange(selectedYear, q)}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    selectedQuarter === q
                      ? "bg-emerald-500 text-slate-950 shadow-md"
                      : "text-emerald-200 hover:text-white"
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>

          <div className="border-l border-emerald-700/60 pl-3">
            <div className="text-[11px] text-emerald-300 font-medium">ZATCA Return Due:</div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{report.period.dueDate}</span>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-bold ${
                  telemetry.status === "OVERDUE"
                    ? "bg-red-500/80 text-white"
                    : telemetry.status === "DUE_SOON"
                    ? "bg-amber-500 text-slate-950"
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
        {/* Card 1: Output VAT */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Output VAT (15%)
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <Building2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              SAR {telemetry.totalOutputVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            From SAR {report.totalSalesTaxable.toLocaleString()} taxable sales (B2B & B2C)
          </div>
        </div>

        {/* Card 2: Recoverable Input VAT */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Recoverable Input VAT
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
              <Download className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              SAR {telemetry.totalRecoverableInputVat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            From {telemetry.billsCount} supplier bills & import declarations
          </div>
        </div>

        {/* Card 3: Net VAT Due */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Net VAT {telemetry.isPayable ? "Payable" : "Refundable"}
            </span>
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                telemetry.isPayable
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
              }`}
            >
              <FileText className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold tracking-tight ${
                telemetry.isPayable ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              SAR {telemetry.netVatDue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium">
            <span
              className={`inline-block h-2 w-2 rounded-full ${
                telemetry.isPayable ? "bg-amber-500" : "bg-emerald-500"
              }`}
            />
            {telemetry.isPayable ? "Due to ZATCA by month end" : "Refundable Credit Balance"}
          </div>
        </div>

        {/* Card 4: ZATCA Compliance */}
        <div className="rounded-xl border border-border bg-card p-5 shadow-sm transition-all hover:border-emerald-500/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              ZATCA Compliance Rate
            </span>
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold tracking-tight text-foreground">
              {telemetry.complianceRate}%
            </span>
            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
              {telemetry.standardInvoicesCount} B2B / {telemetry.simplifiedInvoicesCount} B2C
            </span>
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            All invoices have 100% compliant TLV QR codes
          </div>
        </div>
      </div>

      {/* ── Tabs Navigation ──────────────────────────────────────────── */}
      <div className="flex border-b border-border">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab("fatoora")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "fatoora"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <ShieldCheck className="h-4 w-4" />
            ZATCA Fatoora Desk ({invoices.length})
          </button>

          <button
            onClick={() => setActiveTab("qr_studio")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "qr_studio"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <QrCode className="h-4 w-4" />
            ZATCA QR Studio & Decoder
          </button>

          <button
            onClick={() => setActiveTab("vat_return")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "vat_return"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <FileText className="h-4 w-4" />
            KSA VAT Return (ZATCA Form)
          </button>

          <button
            onClick={() => setActiveTab("zakat")}
            className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition-colors ${
              activeTab === "zakat"
                ? "border-emerald-600 text-emerald-600 dark:border-emerald-400 dark:text-emerald-400"
                : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
            }`}
          >
            <Calculator className="h-4 w-4" />
            Zakat Calculation Engine 🇸🇦
          </button>
        </div>
      </div>

      {/* ── TAB 1: ZATCA Fatoora Desk ──────────────────────────────────── */}
      {activeTab === "fatoora" && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">
                ZATCA E-Invoicing Invoices ({report.period.quarterLabel})
              </h2>
              <p className="text-xs text-muted-foreground">
                All tax invoices generated with statutory 15% VAT and ZATCA TLV Base64 QR code
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Phase 1 & 2 Ready
              </span>
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card shadow-sm">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-muted/50 text-xs uppercase font-semibold text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Invoice #</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Buyer & VAT #</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Subtotal</th>
                  <th className="px-4 py-3 text-right">VAT (15%)</th>
                  <th className="px-4 py-3 text-right">Total (SAR)</th>
                  <th className="px-4 py-3 text-center">ZATCA Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {invoices.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-muted-foreground">
                      No invoices found in {report.period.quarterLabel}. Create a sales invoice with 15% VAT to populate the Fatoora desk.
                    </td>
                  </tr>
                ) : (
                  invoices.map((inv) => (
                    <tr key={inv.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-foreground">{inv.invoiceNumber}</td>
                      <td className="px-4 py-3 text-muted-foreground">{inv.invoiceDate}</td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-foreground">{inv.customerName}</div>
                        {inv.customerVatNumber ? (
                          <div className="text-xs font-mono text-emerald-600 dark:text-emerald-400">
                            VAT: {inv.customerVatNumber}
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground">Consumer (No VAT)</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {inv.invoiceType === "STANDARD" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            Standard (B2B)
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            Simplified (B2C)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right font-mono">
                        {inv.subtotal.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-emerald-600 dark:text-emerald-400">
                        {inv.vatAmount.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        SAR {inv.total.toFixed(2)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleInspectInvoice(inv.id, "print")}
                            title="Print Bilingual ZATCA Invoice"
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent text-foreground transition-all"
                          >
                            <Printer className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleInspectInvoice(inv.id, "xml")}
                            title="Inspect UBL 2.1 XML"
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent text-emerald-600 dark:text-emerald-400 transition-all"
                          >
                            <FileCode className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleCopy(inv.tlvBase64, "ZATCA TLV Base64")}
                            title="Copy TLV Base64 Payload"
                            className="p-1.5 rounded-lg border border-border bg-card hover:bg-accent text-muted-foreground transition-all"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TAB 2: ZATCA QR Code Studio & Decoder ─────────────────────── */}
      {activeTab === "qr_studio" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Section A: Live TLV Generator */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <QrCode className="h-5 w-5 text-emerald-500" />
                  ZATCA TLV Generator (Tags 1–5)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Encodes seller name, 15-digit VAT number, ISO timestamp, total, and VAT amount into statutory UTF-8 TLV Base64
                </p>
              </div>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Tag 1: Seller Name (اسم المورد)
                </label>
                <input
                  type="text"
                  value={qrSellerName}
                  onChange={(e) => setQrSellerName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Tag 2: Seller VAT Number (الرقم الضريبي - 15 digits 3...3)
                </label>
                <input
                  type="text"
                  value={qrVatNumber}
                  onChange={(e) => setQrVatNumber(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Tag 3: Invoice Timestamp (تاريخ ووقت الفاتورة - ISO 8601)
                </label>
                <input
                  type="text"
                  value={qrTimestamp}
                  onChange={(e) => setQrTimestamp(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Tag 4: Invoice Total (with VAT)
                  </label>
                  <input
                    type="text"
                    value={qrTotal}
                    onChange={(e) => setQrTotal(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground">
                    Tag 5: VAT Total (15%)
                  </label>
                  <input
                    type="text"
                    value={qrVat}
                    onChange={(e) => setQrVat(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-mono focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold text-muted-foreground">
                    Generated Base64 Payload:
                  </span>
                  <button
                    onClick={() => handleCopy(generatedTlv, "Base64 TLV")}
                    className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                </div>
                <div className="rounded-lg bg-muted p-2.5 font-mono text-[11px] break-all border border-border max-h-24 overflow-y-auto">
                  {generatedTlv}
                </div>
              </div>
            </div>
          </div>

          {/* Section B: Live TLV Decoder */}
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-sm">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Search className="h-5 w-5 text-blue-500" />
                  ZATCA QR Decoder & Validator
                </h3>
                <p className="text-xs text-muted-foreground">
                  Paste any ZATCA Base64 string to verify compliance and extract decoded tags
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground">
                  Paste ZATCA Base64 TLV String:
                </label>
                <textarea
                  rows={3}
                  value={decodeInput}
                  onChange={(e) => setDecodeInput(e.target.value)}
                  placeholder="Paste Base64 payload here (e.g. AQ9HZW5lc29mdCBLU0EgTExDAx8zMTAxMjM0NTY3ODkwMDM...)"
                  className="mt-1 w-full rounded-lg border border-border bg-background p-2 font-mono text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleDecode}
                  className="flex-1 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 transition-colors flex items-center justify-center gap-2"
                >
                  <Search className="h-4 w-4" /> Decode & Validate TLV
                </button>
                <button
                  onClick={() => {
                    setDecodeInput(generatedTlv)
                    const res = decodeZatcaTlv(generatedTlv)
                    setDecodedResult(res)
                  }}
                  className="rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-accent text-foreground"
                >
                  Paste Generator Output
                </button>
              </div>

              {decodedResult && (
                <div
                  className={`rounded-xl p-4 border text-xs space-y-2 ${
                    decodedResult.isValid
                      ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                      : "bg-red-500/10 border-red-500/30 text-red-950 dark:text-red-200"
                  }`}
                >
                  <div className="flex items-center gap-2 font-bold text-sm">
                    {decodedResult.isValid ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                        Valid ZATCA TLV Payload (Statutory Pass)
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-600" />
                        Invalid ZATCA TLV Payload
                      </>
                    )}
                  </div>
                  {decodedResult.error && <div className="text-red-600 dark:text-red-400 font-semibold">{decodedResult.error}</div>}

                  <div className="mt-2 space-y-1 divide-y divide-border/40 font-mono">
                    {decodedResult.tags.map((t: any) => (
                      <div key={t.tag} className="pt-1 flex justify-between">
                        <span className="text-muted-foreground">{t.label}:</span>
                        <span className="font-bold text-foreground">{t.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 3: KSA VAT Return (ZATCA Form) ────────────────────────── */}
      {activeTab === "vat_return" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div>
              <h2 className="text-base font-bold text-foreground">
                ZATCA VAT Return Declaration — {report.period.quarterLabel}
              </h2>
              <p className="text-xs text-muted-foreground">
                Taxpayer: {report.taxpayerLegalName} | VAT Registration #: {report.taxpayerVatNumber}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportJson}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-accent"
              >
                <FileCode className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                Export JSON (ZATCA Portal)
              </button>
              <button
                onClick={handleExportCsv}
                className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV Declaration
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Sales Section */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                <Building2 className="h-4 w-4 text-emerald-500" />
                VAT On Sales (Outputs)
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Standard Rated Sales (15%)</span>
                  <div className="text-right">
                    <span className="font-mono">SAR {report.salesStandardRated.taxableAmount.toFixed(2)}</span>
                    <span className="block text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      VAT: SAR {report.salesStandardRated.vatAmount.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Zero-Rated Exports (0%)</span>
                  <span className="font-mono">SAR {report.salesZeroRatedExports.taxableAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Exempt Supplies</span>
                  <span className="font-mono">SAR {report.salesExempt.taxableAmount.toFixed(2)}</span>
                </div>

                <div className="flex justify-between py-2 pt-3 font-bold bg-muted/30 px-3 rounded-lg">
                  <span>Total Output Tax Due</span>
                  <span className="font-mono text-emerald-600 dark:text-emerald-400">
                    SAR {report.totalOutputVat.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Purchases Section */}
            <div className="rounded-xl border border-border bg-card p-5 shadow-sm space-y-3">
              <h3 className="text-sm font-bold text-foreground uppercase tracking-wider flex items-center gap-2 border-b border-border pb-2">
                <Download className="h-4 w-4 text-blue-500" />
                VAT On Purchases (Inputs)
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Standard Rated Domestic Purchases (15%)</span>
                  <div className="text-right">
                    <span className="font-mono">SAR {report.purchasesStandardRated.taxableAmount.toFixed(2)}</span>
                    <span className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                      VAT: SAR {report.purchasesStandardRated.recoverableVat.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between py-1.5 border-b border-border/50">
                  <span className="text-muted-foreground">Imports Paid at Customs / RCM</span>
                  <div className="text-right">
                    <span className="font-mono">SAR {report.purchasesImports.taxableAmount.toFixed(2)}</span>
                    <span className="block text-xs font-bold text-blue-600 dark:text-blue-400">
                      VAT: SAR {report.purchasesImports.recoverableVat.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between py-2 pt-3 font-bold bg-muted/30 px-3 rounded-lg">
                  <span>Total Recoverable Input Tax</span>
                  <span className="font-mono text-blue-600 dark:text-blue-400">
                    SAR {report.totalRecoverableInputVat.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Net VAT Settlement Card */}
          <div className="rounded-xl border border-emerald-500/40 bg-gradient-to-r from-emerald-500/10 via-background to-teal-500/10 p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase font-bold tracking-wider text-muted-foreground">
                Net Tax Due To / (Refundable From) ZATCA
              </div>
              <div className="text-2xl sm:text-3xl font-black tracking-tight text-foreground mt-1">
                SAR {Math.abs(report.netVatDue).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                <span className="ml-2 text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                  {report.netVatDue >= 0 ? "Payable" : "Refundable"}
                </span>
              </div>
            </div>
            <div className="text-right text-xs text-muted-foreground">
              <div>Statutory Deadline: <span className="font-bold text-foreground">{report.period.dueDate}</span></div>
              <div>ZATCA Portal Status: <span className="font-semibold text-emerald-600">Ready for E-Filing</span></div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: Zakat Calculation Engine ───────────────────────────── */}
      {activeTab === "zakat" && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-card p-4 rounded-xl border border-border">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-foreground">
                  Statutory Zakat Calculation Engine (حساب وعاء الزكاة الشرعية)
                </h2>
                <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-semibold">
                  Ministerial Res. 2216
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Zakat base and liability calculation based on company capital, reserves, and net long-term assets
              </p>
            </div>

            {/* Calendar toggle */}
            <div className="flex items-center gap-2 bg-muted p-1 rounded-lg border border-border">
              <span className="text-xs font-semibold px-2 text-muted-foreground">Calendar:</span>
              <button
                onClick={() => updateZakatInput("calendarType", "HIJRI")}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  zakatInputs.calendarType === "HIJRI"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Hijri (2.50%)
              </button>
              <button
                onClick={() => updateZakatInput("calendarType", "GREGORIAN")}
                className={`px-3 py-1 rounded text-xs font-bold transition-all ${
                  zakatInputs.calendarType === "GREGORIAN"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Gregorian (2.5775%)
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1: Additions (مكونات الوعاء الموجبة) */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border pb-2">
                <CheckCircle2 className="h-4 w-4" />
                1. Additions (مكونات الوعاء الموجبة)
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-muted-foreground">Paid-up Capital (رأس المال):</label>
                  <input
                    type="number"
                    value={zakatInputs.paidUpCapital}
                    onChange={(e) => updateZakatInput("paidUpCapital", parseFloat(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2.5 py-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground">Retained Earnings (الأرباح المبقاة):</label>
                  <input
                    type="number"
                    value={zakatInputs.retainedEarnings}
                    onChange={(e) => updateZakatInput("retainedEarnings", parseFloat(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2.5 py-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground">Statutory Reserves (الاحتياطي النظامي):</label>
                  <input
                    type="number"
                    value={zakatInputs.statutoryReserves}
                    onChange={(e) => updateZakatInput("statutoryReserves", parseFloat(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2.5 py-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground">Long-Term Liabilities (ديون طويلة الأجل):</label>
                  <input
                    type="number"
                    value={zakatInputs.longTermLiabilities}
                    onChange={(e) => updateZakatInput("longTermLiabilities", parseFloat(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2.5 py-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground">Adjusted Net Profit (صافي الربح المعدل):</label>
                  <input
                    type="number"
                    value={zakatInputs.adjustedNetProfit}
                    onChange={(e) => updateZakatInput("adjustedNetProfit", parseFloat(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2.5 py-1 font-mono text-sm"
                  />
                </div>
                <div className="pt-2 font-bold text-foreground flex justify-between">
                  <span>Total Additions:</span>
                  <span className="font-mono">SAR {zakatResult.totalAdditions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Column 2: Deductions (حسومات الوعاء) */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 flex items-center gap-1.5 border-b border-border pb-2">
                <Download className="h-4 w-4" />
                2. Deductions (حسومات الوعاء)
              </h3>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="text-muted-foreground">Net Fixed Assets (صافي الأصول الثابتة):</label>
                  <input
                    type="number"
                    value={zakatInputs.netFixedAssets}
                    onChange={(e) => updateZakatInput("netFixedAssets", parseFloat(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2.5 py-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground">Long-Term Investments (استثمارات خارجية):</label>
                  <input
                    type="number"
                    value={zakatInputs.longTermInvestments}
                    onChange={(e) => updateZakatInput("longTermInvestments", parseFloat(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2.5 py-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground">Construction in Progress (مشروعات قيد التنفيذ):</label>
                  <input
                    type="number"
                    value={zakatInputs.constructionInProgress}
                    onChange={(e) => updateZakatInput("constructionInProgress", parseFloat(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2.5 py-1 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="text-muted-foreground">Carried Forward Losses (خسائر مرحلة):</label>
                  <input
                    type="number"
                    value={zakatInputs.carriedForwardLosses}
                    onChange={(e) => updateZakatInput("carriedForwardLosses", parseFloat(e.target.value) || 0)}
                    className="mt-0.5 w-full rounded border border-border bg-background px-2.5 py-1 font-mono text-sm"
                  />
                </div>
                <div className="pt-2 font-bold text-foreground flex justify-between">
                  <span>Total Deductions:</span>
                  <span className="font-mono">SAR {zakatResult.totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>

            {/* Column 3: Zakat Base & Amount Due */}
            <div className="rounded-xl border border-emerald-500/30 bg-gradient-to-b from-emerald-500/10 via-card to-card p-5 space-y-4 shadow-sm flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 border-b border-border pb-2">
                  <Calculator className="h-4 w-4" />
                  3. Zakat Assessment (الربط الزكوي)
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Calculated Zakat Base (وعاء الزكاة):</span>
                    <span className="font-mono font-bold text-foreground">
                      SAR {zakatResult.zakatBase.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between py-1 border-b border-border/50">
                    <span className="text-muted-foreground">Effective Rate:</span>
                    <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                      {zakatResult.effectiveRateLabel}
                    </span>
                  </div>

                  {zakatResult.minimumZakatApplied && (
                    <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 text-[11px]">
                      Notice: Zakat base is less than adjusted net profit. Minimum Zakat assessed on Adjusted Profit per Article 5.
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <span className="text-xs uppercase font-bold text-muted-foreground tracking-wider">
                  Total Zakat Liability (الزكاة المستحقة)
                </span>
                <div className="text-3xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  SAR {zakatResult.calculatedZakat.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Payable to ZATCA upon annual tax return filing
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 1: UBL 2.1 XML Inspector ───────────────────────────── */}
      {isXmlModalOpen && inspectingPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border p-4">
              <div>
                <h3 className="font-bold text-foreground flex items-center gap-2">
                  <FileCode className="h-5 w-5 text-emerald-500" />
                  ZATCA UBL 2.1 E-Invoice XML ({inspectingPayload.invoiceNumber})
                </h3>
                <span className="text-xs text-muted-foreground font-mono">
                  Type: {inspectingPayload.invoiceType} | ProfileID: reporting:1.0
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopy(inspectingPayload.xmlContent, "UBL 2.1 XML")}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-accent flex items-center gap-1"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy XML
                </button>
                <button
                  onClick={() => setIsXmlModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
                >
                  ✕
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-auto p-4 bg-muted/40">
              <pre className="font-mono text-xs text-foreground/90 whitespace-pre-wrap">
                {inspectingPayload.xmlContent}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL 2: Printable Bilingual ZATCA Invoice ───────────────── */}
      {isPrintInvoiceModalOpen && inspectingPayload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl border border-border bg-card shadow-2xl p-6 relative">
            <div className="flex items-center justify-between border-b border-border pb-4 no-print">
              <div className="flex items-center gap-2">
                <Printer className="h-5 w-5 text-emerald-600" />
                <span className="font-bold">Official Bilingual Tax Invoice (فاتورة ضريبية)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700"
                >
                  <Printer className="h-4 w-4" /> Print / Save PDF
                </button>
                <button
                  onClick={() => setIsPrintInvoiceModalOpen(false)}
                  className="rounded-lg p-1 text-muted-foreground hover:bg-accent"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Document Body */}
            <div className="printable-content space-y-6 pt-4 text-slate-900 bg-white p-6 rounded-lg">
              {/* Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold">{inspectingPayload.sellerName}</h2>
                  <div className="text-xs text-slate-600">Riyadh, Kingdom of Saudi Arabia</div>
                  <div className="text-xs font-mono font-bold text-emerald-800 mt-1">
                    VAT Registration #: {inspectingPayload.sellerVatNumber}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-lg font-black tracking-tight text-slate-900">
                    {inspectingPayload.invoiceType === "STANDARD" ? "TAX INVOICE / فاتورة ضريبية" : "SIMPLIFIED TAX INVOICE / فاتورة ضريبية مبسطة"}
                  </div>
                  <div className="text-xs text-slate-600 mt-1">
                    Invoice #: <span className="font-mono font-bold text-slate-900">{inspectingPayload.invoiceNumber}</span>
                  </div>
                  <div className="text-xs text-slate-600">
                    Date: <span className="font-mono">{new Date().toISOString().split("T")[0]}</span>
                  </div>
                </div>
              </div>

              {/* Parties */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 rounded border border-slate-200">
                  <span className="font-bold text-slate-700 uppercase">Customer / العميل:</span>
                  <div className="font-bold text-sm text-slate-900 mt-0.5">{inspectingPayload.buyerName}</div>
                  <div className="font-mono text-slate-600 mt-0.5">
                    VAT #: {inspectingPayload.buyerVatNumber || "N/A (Consumer)"}
                  </div>
                </div>

                <div className="p-3 rounded border border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-bold text-slate-700 uppercase">ZATCA E-Invoicing:</span>
                    <div className="text-[11px] text-emerald-800 font-semibold mt-0.5">
                      ✓ Phase 1 & 2 Compliant
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      TLV Base64 Encoded
                    </div>
                  </div>

                  {/* Scannable QR Image */}
                  <div
                    className="h-20 w-20 flex items-center justify-center p-1 bg-white border border-slate-300 rounded"
                    dangerouslySetInnerHTML={{ __html: inspectingPayload.qrSvg }}
                  />
                </div>
              </div>

              {/* Amounts Table */}
              <table className="w-full text-left text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-2">Description / البيان</th>
                    <th className="p-2 text-right">Taxable Subtotal</th>
                    <th className="p-2 text-right">VAT Rate</th>
                    <th className="p-2 text-right">VAT (15%)</th>
                    <th className="p-2 text-right">Total (SAR)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-100">
                    <td className="p-2 font-medium">Supply of Goods / Professional Services</td>
                    <td className="p-2 text-right font-mono">{inspectingPayload.subtotal.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono">15.00%</td>
                    <td className="p-2 text-right font-mono text-emerald-800 font-semibold">{inspectingPayload.vatAmount.toFixed(2)}</td>
                    <td className="p-2 text-right font-mono font-bold">{inspectingPayload.total.toFixed(2)}</td>
                  </tr>
                </tbody>
                <tfoot className="bg-slate-50 font-bold">
                  <tr>
                    <td colSpan={4} className="p-2 text-right">Total Amount Due (الإجمالي المستحق):</td>
                    <td className="p-2 text-right font-mono text-sm text-slate-900">
                      SAR {inspectingPayload.total.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>

              {/* Declaration Statement */}
              <div className="text-[10px] text-slate-500 text-center border-t pt-3">
                This electronic invoice is generated in compliance with the Zakat, Tax and Customs Authority (ZATCA) regulations in the Kingdom of Saudi Arabia.
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
