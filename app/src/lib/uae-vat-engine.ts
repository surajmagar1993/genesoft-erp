/**
 * uae-vat-engine.ts
 * Pure TypeScript Statutory UAE VAT Engine — Federal Decree-Law No. (8) of 2017.
 * Covers Standard 5% VAT, 15-digit TRN Validation (^100\d{12}$), The 7 Emirates Apportionment,
 * Article 48 Reverse Charge Mechanism (RCM), Zero-rated Exports, and Form VAT201 Compiler.
 */

// ── Statutory Constants & Emirates ─────────────────────────────────────────────

export const UAE_STANDARD_VAT_RATE = 5.0 // 5% Standard Rate

export const UAE_EMIRATES = [
  "Abu Dhabi",
  "Dubai",
  "Sharjah",
  "Ajman",
  "Umm Al Quwain",
  "Ras Al Khaimah",
  "Fujairah",
] as const

export type UaeEmirate = (typeof UAE_EMIRATES)[number]

export const EMIRATE_BOX_CODES: Record<UaeEmirate, { boxCode: string; label: string }> = {
  "Abu Dhabi": { boxCode: "1a", label: "Abu Dhabi" },
  "Dubai": { boxCode: "1b", label: "Dubai" },
  "Sharjah": { boxCode: "1c", label: "Sharjah" },
  "Ajman": { boxCode: "1d", label: "Ajman" },
  "Umm Al Quwain": { boxCode: "1e", label: "Umm Al Quwain" },
  "Ras Al Khaimah": { boxCode: "1f", label: "Ras Al Khaimah" },
  "Fujairah": { boxCode: "1g", label: "Fujairah" },
}

/**
 * Normalizes any freeform location or state string to one of the 7 UAE Emirates.
 * Defaults to "Dubai" if unspecified or unrecognized.
 */
export function normalizeUaeEmirate(input?: string | null): UaeEmirate {
  if (!input) return "Dubai"
  const clean = input.trim().toLowerCase()

  if (clean.includes("abu dhabi") || clean.includes("auh") || clean.includes("al ain")) return "Abu Dhabi"
  if (clean.includes("dubai") || clean.includes("dxb")) return "Dubai"
  if (clean.includes("sharjah") || clean.includes("shj")) return "Sharjah"
  if (clean.includes("ajman") || clean.includes("ajm")) return "Ajman"
  if (clean.includes("quwain") || clean.includes("uaq")) return "Umm Al Quwain"
  if (clean.includes("khaimah") || clean.includes("rak")) return "Ras Al Khaimah"
  if (clean.includes("fujairah") || clean.includes("fuj")) return "Fujairah"

  return "Dubai"
}

// ── Statutory TRN Validator ───────────────────────────────────────────────────

export interface TrnValidationResult {
  isValid: boolean
  formattedTrn: string
  error?: string
}

/**
 * Validates a UAE Tax Registration Number (TRN) per Federal Tax Authority (FTA) specifications:
 * - Must be exactly 15 digits
 * - Must strictly begin with '100'
 * - Digits only
 */
export function validateUaeTrn(trnInput?: string | null): TrnValidationResult {
  if (!trnInput) {
    return {
      isValid: false,
      formattedTrn: "",
      error: "TRN cannot be empty.",
    }
  }

  // Remove spaces, hyphens, and any delimiters
  const clean = trnInput.replace(/[\s-]/g, "").trim()

  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      formattedTrn: clean,
      error: "TRN must contain digits only.",
    }
  }

  if (clean.length !== 15) {
    return {
      isValid: false,
      formattedTrn: clean,
      error: `TRN must be exactly 15 digits (currently ${clean.length}).`,
    }
  }

  if (!clean.startsWith("100")) {
    return {
      isValid: false,
      formattedTrn: clean,
      error: "UAE TRN must start with '100'.",
    }
  }

  return {
    isValid: true,
    formattedTrn: clean,
  }
}

// ── Tax Period & Due Dates ─────────────────────────────────────────────────────

export interface UaeTaxPeriod {
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  quarterLabel: string // e.g. "Q3 2026 (Jul–Sep)"
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  dueDate: string // YYYY-MM-DD (28th day following the tax period end)
  periodKey: string // e.g. "2026-Q3"
}

export function getUaeVatPeriod(year: number, quarter: "Q1" | "Q2" | "Q3" | "Q4"): UaeTaxPeriod {
  let startDate = ""
  let endDate = ""
  let dueDate = ""
  let quarterLabel = ""

  switch (quarter) {
    case "Q1":
      startDate = `${year}-01-01`
      endDate = `${year}-03-31`
      dueDate = `${year}-04-28`
      quarterLabel = `Q1 ${year} (Jan–Mar)`
      break
    case "Q2":
      startDate = `${year}-04-01`
      endDate = `${year}-06-30`
      dueDate = `${year}-07-28`
      quarterLabel = `Q2 ${year} (Apr–Jun)`
      break
    case "Q3":
      startDate = `${year}-07-01`
      endDate = `${year}-09-30`
      dueDate = `${year}-10-28`
      quarterLabel = `Q3 ${year} (Jul–Sep)`
      break
    case "Q4":
      startDate = `${year}-10-01`
      endDate = `${year}-12-31`
      dueDate = `${year + 1}-01-28`
      quarterLabel = `Q4 ${year} (Oct–Dec)`
      break
  }

  return {
    year,
    quarter,
    quarterLabel,
    startDate,
    endDate,
    dueDate,
    periodKey: `${year}-${quarter}`,
  }
}

// ── Models for Inward & Outward Data ─────────────────────────────────────────────

export interface RawUaeInvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate?: number | null // Standard 5%, 0%, or null
  vatAmount?: number | null
  discount?: number
  lineTotal: number
}

export interface RawUaeInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string | Date
  type: string // "TAX_INVOICE", "EXPORT", etc.
  status: string
  subtotal: number
  taxAmount: number
  total: number
  currencyCode?: string
  placeOfSupply?: string | null // Emirate or Country
  billTo?: any
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    trn?: string | null
    email?: string | null
  } | null
  items: RawUaeInvoiceItem[]
}

export interface RawUaeBillItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
}

export interface RawUaeBill {
  id: string
  billNumber: string
  billDate: string | Date
  status: string
  subtotal: number
  taxAmount: number
  total: number
  currencyCode?: string
  notes?: string | null // Checks for RCM / Reverse Charge tags
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    trn?: string | null
  } | null
  items: RawUaeBillItem[]
}

// ── Official FTA Form VAT201 Data Structure ────────────────────────────────────

export interface EmirateSupplyDetail {
  emirate: UaeEmirate
  boxCode: string
  taxableAmount: number
  vatAmount: number
  adjustments: number
}

export interface FormVat201Report {
  period: UaeTaxPeriod
  taxpayerTrn: string
  taxpayerLegalName: string
  taxpayerAddress: string

  // Box 1: Standard Rated Supplies by Emirate
  box1Emirates: EmirateSupplyDetail[]
  box1TotalTaxable: number
  box1TotalVat: number

  // Box 2: Tax Invoices / Supplies to Designated Zones
  box2DesignatedZones: {
    taxableAmount: number
    vatAmount: number
  }

  // Box 3: Supplies subject to Reverse Charge Mechanism (RCM - Output Tax)
  box3ReverseChargeOutput: {
    taxableAmount: number
    vatAmount: number
  }

  // Box 4: Zero-Rated Supplies (Exports & International Transport)
  box4ZeroRated: {
    taxableAmount: number
  }

  // Box 5: Exempt Supplies
  box5Exempt: {
    taxableAmount: number
  }

  // Box 6: Total Output Tax Due (Box 1 + Box 2 + Box 3)
  box6TotalOutputTaxDue: number

  // Box 9: Standard Rated Inward Expenses & Purchases (Recoverable Input VAT)
  box9StandardRatedPurchases: {
    taxableAmount: number
    recoverableVat: number
  }

  // Box 10: Supplies subject to Reverse Charge Provisions (Input VAT Recovered)
  box10ReverseChargeInput: {
    taxableAmount: number
    recoverableVat: number
  }

  // Box 12: Total Recoverable Input Tax (Box 9 + Box 10)
  box12TotalRecoverableTax: number

  // Box 13: Net VAT Payable / (Reclaimable) to the Federal Tax Authority
  box13NetVatPayable: number // Positive: Payable, Negative: Reclaimable

  summary: {
    invoicesCount: number
    billsCount: number
    rcmCount: number
    exportCount: number
    b2bTrnCount: number
    b2cCount: number
  }
}

// ── Form VAT201 Compilation Engine ─────────────────────────────────────────────

export function compileFormVat201(params: {
  invoices: RawUaeInvoice[]
  bills: RawUaeBill[]
  taxpayerTrn: string
  taxpayerLegalName: string
  taxpayerAddress?: string
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
}): FormVat201Report {
  const { invoices, bills, taxpayerTrn, taxpayerLegalName, taxpayerAddress, year, quarter } = params
  const period = getUaeVatPeriod(year, quarter)

  // Initialize Emirate Buckets (1a to 1g)
  const emirateMap = new Map<UaeEmirate, EmirateSupplyDetail>()
  for (const em of UAE_EMIRATES) {
    emirateMap.set(em, {
      emirate: em,
      boxCode: EMIRATE_BOX_CODES[em].boxCode,
      taxableAmount: 0,
      vatAmount: 0,
      adjustments: 0,
    })
  }

  let box4ZeroRatedTaxable = 0
  let box5ExemptTaxable = 0
  let exportCount = 0
  let b2bTrnCount = 0
  let b2cCount = 0

  // 1. Process Outward Invoices
  const validInvoices = invoices.filter(inv => inv.status !== "CANCELLED" && inv.type !== "PROFORMA")

  for (const inv of validInvoices) {
    const isExport = inv.type === "EXPORT" || (inv.contact?.displayName || "").toLowerCase().includes("export")
    const isExempt = inv.type === "EXEMPT" || (inv.contact?.displayName || "").toLowerCase().includes("exempt")
    const customerTrn = (inv.contact?.trn || inv.billTo?.trn || "").trim()
    const hasTrn = validateUaeTrn(customerTrn).isValid

    if (hasTrn) b2bTrnCount++
    else b2cCount++

    const subtotal = Number(inv.subtotal || 0)
    const taxAmount = Number(inv.taxAmount || 0)

    if (isExport) {
      box4ZeroRatedTaxable += subtotal
      exportCount++
      continue
    }

    if (isExempt) {
      box5ExemptTaxable += subtotal
      continue
    }

    // Determine Emirate
    const emirate = normalizeUaeEmirate(inv.placeOfSupply || inv.billTo?.emirate || inv.billTo?.state)
    const entry = emirateMap.get(emirate)!
    entry.taxableAmount = Math.round((entry.taxableAmount + subtotal) * 100) / 100
    entry.vatAmount = Math.round((entry.vatAmount + taxAmount) * 100) / 100
  }

  const box1Emirates = Array.from(emirateMap.values())
  const box1TotalTaxable = Math.round(box1Emirates.reduce((sum, e) => sum + e.taxableAmount, 0) * 100) / 100
  const box1TotalVat = Math.round(box1Emirates.reduce((sum, e) => sum + e.vatAmount, 0) * 100) / 100

  // 2. Process Inward Bills (Purchases & RCM)
  const validBills = bills.filter(b => b.status !== "VOID")

  let standardPurchasesTaxable = 0
  let standardPurchasesVat = 0
  let rcmTaxable = 0
  let rcmVat = 0
  let rcmCount = 0

  for (const bill of validBills) {
    const notesLower = (bill.notes || "").toLowerCase()
    const isRcm = notesLower.includes("rcm") || notesLower.includes("reverse charge") || notesLower.includes("article 48")

    const bSubtotal = Number(bill.subtotal || 0)
    const bTax = Number(bill.taxAmount || 0)

    if (isRcm) {
      // Under Article 48 RCM, if not charged by vendor, calculate 5% VAT
      const effectiveRcmVat = bTax > 0 ? bTax : Math.round(bSubtotal * 0.05 * 100) / 100
      rcmTaxable += bSubtotal
      rcmVat += effectiveRcmVat
      rcmCount++
    } else {
      standardPurchasesTaxable += bSubtotal
      standardPurchasesVat += bTax
    }
  }

  // Box 3: Supplies Subject to Reverse Charge (Output Tax)
  const box3ReverseChargeOutput = {
    taxableAmount: Math.round(rcmTaxable * 100) / 100,
    vatAmount: Math.round(rcmVat * 100) / 100,
  }

  // Box 6: Total Output Tax Due = Box 1 VAT + Box 2 VAT + Box 3 VAT
  const box6TotalOutputTaxDue = Math.round((box1TotalVat + box3ReverseChargeOutput.vatAmount) * 100) / 100

  // Box 9: Standard Rated Inward Expenses
  const box9StandardRatedPurchases = {
    taxableAmount: Math.round(standardPurchasesTaxable * 100) / 100,
    recoverableVat: Math.round(standardPurchasesVat * 100) / 100,
  }

  // Box 10: RCM Input Tax Recovered
  const box10ReverseChargeInput = {
    taxableAmount: Math.round(rcmTaxable * 100) / 100,
    recoverableVat: Math.round(rcmVat * 100) / 100,
  }

  // Box 12: Total Recoverable Input Tax = Box 9 + Box 10
  const box12TotalRecoverableTax = Math.round((box9StandardRatedPurchases.recoverableVat + box10ReverseChargeInput.recoverableVat) * 100) / 100

  // Box 13: Net VAT Payable / (Reclaimable) = Box 6 - Box 12
  const box13NetVatPayable = Math.round((box6TotalOutputTaxDue - box12TotalRecoverableTax) * 100) / 100

  return {
    period,
    taxpayerTrn: taxpayerTrn || "100123456789003",
    taxpayerLegalName: taxpayerLegalName || "Genesoft Technologies FZ-LLC",
    taxpayerAddress: taxpayerAddress || "Dubai Internet City, Dubai, UAE",
    box1Emirates,
    box1TotalTaxable,
    box1TotalVat,
    box2DesignatedZones: { taxableAmount: 0, vatAmount: 0 },
    box3ReverseChargeOutput,
    box4ZeroRated: { taxableAmount: Math.round(box4ZeroRatedTaxable * 100) / 100 },
    box5Exempt: { taxableAmount: Math.round(box5ExemptTaxable * 100) / 100 },
    box6TotalOutputTaxDue,
    box9StandardRatedPurchases,
    box10ReverseChargeInput,
    box12TotalRecoverableTax,
    box13NetVatPayable,
    summary: {
      invoicesCount: validInvoices.length,
      billsCount: validBills.length,
      rcmCount,
      exportCount,
      b2bTrnCount,
      b2cCount,
    },
  }
}

// ── Official FTA EmaraTax Exporters (JSON & CSV) ───────────────────────────────

/**
 * Formats official FTA EmaraTax JSON payload for Form VAT201.
 */
export function formatUaeVat201Json(report: FormVat201Report): object {
  return {
    taxpayer_trn: report.taxpayerTrn,
    tax_period: report.period.periodKey,
    due_date: report.period.dueDate,
    currency: "AED",
    form_vat_201: {
      vat_on_sales: {
        standard_rated_supplies_by_emirate: report.box1Emirates.map(e => ({
          emirate_code: e.boxCode,
          emirate_name: e.emirate,
          amount_aed: e.taxableAmount,
          vat_amount_aed: e.vatAmount,
          adjustments_aed: e.adjustments,
        })),
        total_box_1_taxable: report.box1TotalTaxable,
        total_box_1_vat: report.box1TotalVat,
        box_2_designated_zones: report.box2DesignatedZones,
        box_3_reverse_charge: report.box3ReverseChargeOutput,
        box_4_zero_rated: report.box4ZeroRated,
        box_5_exempt: report.box5Exempt,
        box_6_total_output_tax_due: report.box6TotalOutputTaxDue,
      },
      vat_on_expenses: {
        box_9_standard_rated_expenses: report.box9StandardRatedPurchases,
        box_10_reverse_charge_expenses: report.box10ReverseChargeInput,
        box_12_total_recoverable_tax: report.box12TotalRecoverableTax,
      },
      net_vat_due: {
        box_13_net_vat_payable_or_reclaimable: report.box13NetVatPayable,
        status: report.box13NetVatPayable >= 0 ? "PAYABLE" : "RECLAIMABLE",
      },
    },
  }
}

/**
 * Formats CSV file for Form VAT201.
 */
export function formatUaeVat201Csv(report: FormVat201Report): string {
  const lines: string[] = [
    `"UAE FEDERAL TAX AUTHORITY - FORM VAT 201"`,
    `"Tax Registration Number (TRN)","${report.taxpayerTrn}"`,
    `"Legal Name of Taxable Person","${report.taxpayerLegalName.replace(/"/g, '""')}"`,
    `"Tax Period","${report.period.quarterLabel}"`,
    `"Due Date","${report.period.dueDate}"`,
    `""`,
    `"VAT ON SALES AND ALL OTHER OUTPUTS",,,`,
    `"Box Number","Description","Taxable Amount (AED)","VAT Amount (AED)"`,
  ]

  for (const em of report.box1Emirates) {
    lines.push(`"Box ${em.boxCode}","Standard Rated Supplies in ${em.emirate}",${em.taxableAmount.toFixed(2)},${em.vatAmount.toFixed(2)}`)
  }

  lines.push(`"Box 1 Total","Total Standard Rated Supplies",${report.box1TotalTaxable.toFixed(2)},${report.box1TotalVat.toFixed(2)}`)
  lines.push(`"Box 2","Tax Invoices and Supplies to Designated Zones",${report.box2DesignatedZones.taxableAmount.toFixed(2)},${report.box2DesignatedZones.vatAmount.toFixed(2)}`)
  lines.push(`"Box 3","Supplies Subject to Reverse Charge Mechanism",${report.box3ReverseChargeOutput.taxableAmount.toFixed(2)},${report.box3ReverseChargeOutput.vatAmount.toFixed(2)}`)
  lines.push(`"Box 4","Zero Rated Supplies",${report.box4ZeroRated.taxableAmount.toFixed(2)},0.00`)
  lines.push(`"Box 5","Exempt Supplies",${report.box5Exempt.taxableAmount.toFixed(2)},0.00`)
  lines.push(`"Box 6","TOTAL OUTPUT TAX DUE",-,${report.box6TotalOutputTaxDue.toFixed(2)}`)
  lines.push(`""`)
  lines.push(`"VAT ON EXPENSES AND ALL OTHER INPUTS",,,`)
  lines.push(`"Box 9","Standard Rated Expenses",${report.box9StandardRatedPurchases.taxableAmount.toFixed(2)},${report.box9StandardRatedPurchases.recoverableVat.toFixed(2)}`)
  lines.push(`"Box 10","Supplies Subject to Reverse Charge Provisions",${report.box10ReverseChargeInput.taxableAmount.toFixed(2)},${report.box10ReverseChargeInput.recoverableVat.toFixed(2)}`)
  lines.push(`"Box 12","TOTAL RECOVERABLE TAX",-,${report.box12TotalRecoverableTax.toFixed(2)}`)
  lines.push(`""`)
  lines.push(`"NET VAT DUE",,,`)
  lines.push(`"Box 13","Net VAT Payable / (Reclaimable)",-,${report.box13NetVatPayable.toFixed(2)}`)

  return lines.join("\n")
}
