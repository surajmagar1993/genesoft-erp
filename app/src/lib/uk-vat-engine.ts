/**
 * uk-vat-engine.ts
 * Pure TypeScript Statutory Engine for United Kingdom (HMRC) Value Added Tax (VAT),
 * Making Tax Digital (MTD) 9-Box VAT Return, and VRN Modulus 97 Validation.
 *
 * Statutory References:
 * - Value Added Tax Act 1994 (VATA 1994)
 * - HMRC Making Tax Digital (MTD) for VAT API Specification
 * - Official HMRC VRN Modulus 97 Algorithm
 */

// ── Statutory Rates & Constants ────────────────────────────────────────────────

export const UK_STANDARD_VAT_RATE = 20.0 // 20% Standard Rate
export const UK_REDUCED_VAT_RATE = 5.0 // 5% Reduced Rate (domestic fuel, car seats)
export const UK_ZERO_VAT_RATE = 0.0 // 0% Zero Rate (food, books, exports)

export type UkVatRateCategory = "STANDARD" | "REDUCED" | "ZERO" | "EXEMPT"

// ── UK VRN (VAT Registration Number) Modulus 97 Validator ─────────────────────

export interface UkVrnValidationResult {
  isValid: boolean
  formattedVrn: string
  error?: string
}

const VRN_WEIGHTS = [8, 7, 6, 5, 4, 3, 2]

/**
 * Validates a 9-digit UK VAT Registration Number per HMRC Modulus 97 rules:
 * - Standard 9 digits (with optional "GB" prefix)
 * - Weighted sum of first 7 digits with weights [8, 7, 6, 5, 4, 3, 2]
 * - Check 1: (sum + checkDigits) % 97 === 0
 * - Check 2: (sum + checkDigits + 55) % 97 === 0 (for numbers issued since Nov 2009)
 */
export function validateUkVrn(vrnInput?: string | null): UkVrnValidationResult {
  if (!vrnInput) {
    return {
      isValid: false,
      formattedVrn: "",
      error: "VRN cannot be empty.",
    }
  }

  // Strip spaces, hyphens, and optional "GB" prefix
  let clean = vrnInput.replace(/[\s-]/g, "").toUpperCase()
  if (clean.startsWith("GB")) {
    clean = clean.slice(2)
  }

  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      formattedVrn: clean,
      error: "UK VRN must contain numeric digits only (optionally preceded by GB).",
    }
  }

  if (clean.length !== 9) {
    return {
      isValid: false,
      formattedVrn: clean,
      error: `UK VRN must be exactly 9 digits (currently ${clean.length}).`,
    }
  }

  const digits = clean.split("").map(Number)
  const checkDigits = digits[7] * 10 + digits[8]

  let weightedSum = 0
  for (let i = 0; i < 7; i++) {
    weightedSum += digits[i] * VRN_WEIGHTS[i]
  }

  const check1Valid = (weightedSum + checkDigits) % 97 === 0
  const check2Valid = (weightedSum + checkDigits + 55) % 97 === 0

  if (!check1Valid && !check2Valid) {
    return {
      isValid: false,
      formattedVrn: `GB ${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 9)}`,
      error: "UK VRN failed the official HMRC Modulus 97 checksum.",
    }
  }

  const formatted = `GB ${clean.slice(0, 3)} ${clean.slice(3, 7)} ${clean.slice(7, 9)}`

  return {
    isValid: true,
    formattedVrn: formatted,
  }
}

// ── UK VAT Periods & Statutory Deadlines (1 Month + 7 Days) ───────────────────

export interface UkVatPeriod {
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  quarterLabel: string // e.g. "Q3 2026 (Jul–Sep)"
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  dueDate: string // YYYY-MM-DD (1 calendar month + 7 days after period end)
  periodKey: string // "2026-Q3"
}

export function getUkVatPeriod(year: number, quarter: "Q1" | "Q2" | "Q3" | "Q4"): UkVatPeriod {
  let startDate = ""
  let endDate = ""
  let dueDate = ""
  let quarterLabel = ""

  switch (quarter) {
    case "Q1": // Jan - Mar
      startDate = `${year}-01-01`
      endDate = `${year}-03-31`
      dueDate = `${year}-05-07` // May 7 (1 month + 7 days)
      quarterLabel = `Q1 ${year} (Jan–Mar)`
      break
    case "Q2": // Apr - Jun
      startDate = `${year}-04-01`
      endDate = `${year}-06-30`
      dueDate = `${year}-08-07` // Aug 7
      quarterLabel = `Q2 ${year} (Apr–Jun)`
      break
    case "Q3": // Jul - Sep
      startDate = `${year}-07-01`
      endDate = `${year}-09-30`
      dueDate = `${year}-11-07` // Nov 7
      quarterLabel = `Q3 ${year} (Jul–Sep)`
      break
    case "Q4": // Oct - Dec
      startDate = `${year}-10-01`
      endDate = `${year}-12-31`
      dueDate = `${year + 1}-02-07` // Feb 7
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

// ── Models for Outward & Inward Supplies ─────────────────────────────────────────

export interface RawUkInvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  vatRate: number // 20.0, 5.0, 0.0, or null
  vatAmount: number
  lineTotal: number
}

export interface RawUkInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string | Date
  type: string
  status: string
  subtotal: number
  taxAmount: number
  total: number
  placeOfSupply?: string | null // Checks for EU supply / export
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    trn?: string | null // UK VRN
  } | null
  items: RawUkInvoiceItem[]
}

export interface RawUkBillItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
}

export interface RawUkBill {
  id: string
  billNumber: string
  billDate: string | Date
  status: string
  subtotal: number
  taxAmount: number
  total: number
  notes?: string | null // Checks for EU acquisition / reverse charge
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    trn?: string | null
  } | null
  items: RawUkBillItem[]
}

// ── Official HMRC Making Tax Digital (MTD) 9-Box Model ────────────────────────

export interface UkMtdVatReturnReport {
  period: UkVatPeriod
  taxpayerVrn: string
  taxpayerLegalName: string
  taxpayerAddress: string

  // The 9 HMRC MTD Boxes
  box1VatDueSales: number // Box 1: VAT due in the period on sales and other outputs
  box2VatDueAcquisitions: number // Box 2: VAT due in the period on acquisitions from EU / RCM
  box3TotalVatDue: number // Box 3: Total VAT due (Box 1 + Box 2)
  box4VatReclaimedPurchases: number // Box 4: VAT reclaimed in the period on purchases & other inputs
  box5NetVatDue: number // Box 5: Net VAT to pay to HMRC or reclaim (Box 3 - Box 4)

  box6TotalValueSalesExVat: number // Box 6: Total value of sales and all other outputs excluding any VAT
  box7TotalValuePurchasesExVat: number // Box 7: Total value of purchases and all other inputs excluding any VAT
  box8TotalValueGoodsSuppliedExVat: number // Box 8: Total value of all supplies of goods to EU member states
  box9TotalAcquisitionsExVat: number // Box 9: Total value of all acquisitions of goods from EU member states

  summary: {
    standardRateVat: number // 20%
    reducedRateVat: number // 5%
    zeroRateSalesExVat: number // 0%
    exemptSalesExVat: number
    invoicesCount: number
    billsCount: number
    vrnComplianceRate: number
  }
}

/**
 * Compiles the official HMRC Making Tax Digital (MTD) 9-Box VAT Return.
 */
export function compileUkMtdVatReturn(params: {
  invoices: RawUkInvoice[]
  bills: RawUkBill[]
  taxpayerVrn: string
  taxpayerLegalName: string
  taxpayerAddress?: string
  year: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
}): UkMtdVatReturnReport {
  const { invoices, bills, taxpayerVrn, taxpayerLegalName, taxpayerAddress, year, quarter } = params
  const period = getUkVatPeriod(year, quarter)

  let box1VatDueSales = 0
  let box2VatDueAcquisitions = 0
  let box6TotalValueSalesExVat = 0
  let box8TotalValueGoodsSuppliedExVat = 0

  let standardRateVat = 0
  let reducedRateVat = 0
  let zeroRateSalesExVat = 0
  let exemptSalesExVat = 0

  let verifiedVrnCount = 0

  const validInvoices = invoices.filter((i) => i.status !== "CANCELLED" && i.type !== "PROFORMA")

  for (const inv of validInvoices) {
    const isExport = inv.type === "EXPORT" || (inv.contact?.displayName || "").toLowerCase().includes("export")
    const isExempt = inv.type === "EXEMPT"
    const subtotal = Number(inv.subtotal || 0)
    const vat = Number(inv.taxAmount || 0)

    const buyerVrn = (inv.contact?.trn || "").trim()
    if (validateUkVrn(buyerVrn).isValid) {
      verifiedVrnCount++
    }

    const placeLower = (inv.placeOfSupply || "").toLowerCase()
    const isEuSupply = placeLower.includes("eu") || placeLower.includes("european") || placeLower.includes("ireland")

    box6TotalValueSalesExVat += subtotal

    if (isEuSupply) {
      box8TotalValueGoodsSuppliedExVat += subtotal
    }

    if (isExport || inv.type === "ZERO_RATED") {
      zeroRateSalesExVat += subtotal
    } else if (isExempt) {
      exemptSalesExVat += subtotal
    } else {
      box1VatDueSales += vat

      // Classify standard 20% vs reduced 5%
      const effectiveRate = subtotal > 0 ? (vat / subtotal) * 100 : 20
      if (Math.abs(effectiveRate - 5) < 1.5) {
        reducedRateVat += vat
      } else {
        standardRateVat += vat
      }
    }
  }

  // Purchases (Box 4, Box 7, Box 9)
  let box4VatReclaimedPurchases = 0
  let box7TotalValuePurchasesExVat = 0
  let box9TotalAcquisitionsExVat = 0

  const validBills = bills.filter((b) => b.status !== "VOID")

  for (const bill of validBills) {
    const bSubtotal = Number(bill.subtotal || 0)
    const bVat = Number(bill.taxAmount || 0)
    const notesLower = (bill.notes || "").toLowerCase()
    const isEuAcquisition = notesLower.includes("eu") || notesLower.includes("acquisition") || notesLower.includes("reverse charge")

    box7TotalValuePurchasesExVat += bSubtotal

    if (isEuAcquisition) {
      box9TotalAcquisitionsExVat += bSubtotal
      // Reverse charge / acquisition VAT: added to Box 2 output and reclaimed in Box 4
      const acqVat = bVat > 0 ? bVat : Math.round(bSubtotal * 0.20 * 100) / 100
      box2VatDueAcquisitions += acqVat
      box4VatReclaimedPurchases += acqVat
    } else {
      box4VatReclaimedPurchases += bVat
    }
  }

  // Box 3: Total VAT Due = Box 1 + Box 2
  const box3TotalVatDue = Math.round((box1VatDueSales + box2VatDueAcquisitions) * 100) / 100

  // Box 5: Net VAT to pay to HMRC or reclaim = Box 3 - Box 4
  const box5NetVatDue = Math.round((box3TotalVatDue - box4VatReclaimedPurchases) * 100) / 100

  const vrnComplianceRate = validInvoices.length > 0 ? Math.round((verifiedVrnCount / validInvoices.length) * 100) : 100

  return {
    period,
    taxpayerVrn: taxpayerVrn || "GB 999 9999 73",
    taxpayerLegalName: taxpayerLegalName || "Genesoft Technologies UK Ltd",
    taxpayerAddress: taxpayerAddress || "100 Bishopsgate, London EC2N 4AG, United Kingdom",
    box1VatDueSales: Math.round(box1VatDueSales * 100) / 100,
    box2VatDueAcquisitions: Math.round(box2VatDueAcquisitions * 100) / 100,
    box3TotalVatDue,
    box4VatReclaimedPurchases: Math.round(box4VatReclaimedPurchases * 100) / 100,
    box5NetVatDue,
    box6TotalValueSalesExVat: Math.round(box6TotalValueSalesExVat), // HMRC rules require integer for Box 6-9
    box7TotalValuePurchasesExVat: Math.round(box7TotalValuePurchasesExVat),
    box8TotalValueGoodsSuppliedExVat: Math.round(box8TotalValueGoodsSuppliedExVat),
    box9TotalAcquisitionsExVat: Math.round(box9TotalAcquisitionsExVat),
    summary: {
      standardRateVat: Math.round(standardRateVat * 100) / 100,
      reducedRateVat: Math.round(reducedRateVat * 100) / 100,
      zeroRateSalesExVat: Math.round(zeroRateSalesExVat * 100) / 100,
      exemptSalesExVat: Math.round(exemptSalesExVat * 100) / 100,
      invoicesCount: validInvoices.length,
      billsCount: validBills.length,
      vrnComplianceRate,
    },
  }
}

// ── Official HMRC MTD Exporters (JSON & CSV) ───────────────────────────────────

export function formatUkMtdJson(report: UkMtdVatReturnReport): object {
  return {
    vrn: report.taxpayerVrn.replace(/[\s-]/g, "").replace(/^GB/i, ""),
    periodKey: report.period.periodKey,
    vatDueSales: report.box1VatDueSales,
    vatDueAcquisitions: report.box2VatDueAcquisitions,
    totalVatDue: report.box3TotalVatDue,
    vatReclaimedCurrPeriod: report.box4VatReclaimedPurchases,
    netVatDue: Math.abs(report.box5NetVatDue),
    totalValueSalesExVAT: report.box6TotalValueSalesExVat,
    totalValuePurchasesExVAT: report.box7TotalValuePurchasesExVat,
    totalValueGoodsSuppliedExVAT: report.box8TotalValueGoodsSuppliedExVat,
    totalAcquisitionsExVAT: report.box9TotalAcquisitionsExVat,
    finalised: true,
  }
}

export function formatUkMtdCsv(report: UkMtdVatReturnReport): string {
  const lines: string[] = [
    `"HM REVENUE & CUSTOMS - MAKING TAX DIGITAL (MTD) VAT RETURN"`,
    `"VAT Registration Number (VRN)","${report.taxpayerVrn}"`,
    `"Taxable Person Legal Name","${report.taxpayerLegalName.replace(/"/g, '""')}"`,
    `"Tax Period","${report.period.quarterLabel}"`,
    `"Submission Due Date","${report.period.dueDate}"`,
    `""`,
    `"Box Number","Description","Amount (GBP)"`,
    `"Box 1","VAT due in the period on sales and other outputs",${report.box1VatDueSales.toFixed(2)}`,
    `"Box 2","VAT due in the period on acquisitions from EU member states",${report.box2VatDueAcquisitions.toFixed(2)}`,
    `"Box 3","TOTAL VAT DUE (Box 1 + Box 2)",${report.box3TotalVatDue.toFixed(2)}`,
    `"Box 4","VAT reclaimed in the period on purchases and other inputs",${report.box4VatReclaimedPurchases.toFixed(2)}`,
    `"Box 5","NET VAT TO PAY TO HMRC OR RECLAIM (Box 3 - Box 4)",${report.box5NetVatDue.toFixed(2)}`,
    `"Box 6","Total value of sales and all other outputs excluding any VAT",${report.box6TotalValueSalesExVat}`,
    `"Box 7","Total value of purchases and all other inputs excluding any VAT",${report.box7TotalValuePurchasesExVat}`,
    `"Box 8","Total value of all supplies of goods to EU member states",${report.box8TotalValueGoodsSuppliedExVat}`,
    `"Box 9","Total value of all acquisitions of goods from EU member states",${report.box9TotalAcquisitionsExVat}`,
    `""`,
    `"STATUS",,${report.box5NetVatDue >= 0 ? '"PAYABLE TO HMRC"' : '"RECLAIMABLE REPAYMENT"'}`,
  ]

  return lines.join("\n")
}
