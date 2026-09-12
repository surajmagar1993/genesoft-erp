/**
 * australia-tax-engine.ts
 * Pure TypeScript Statutory Engine for Australian Taxation Office (ATO) GST & BAS.
 * Covers Standard 10% GST, ABN Modulus 89 Validation, Business Activity Statement (BAS) Form,
 * PAYG Withholding, and ATO Export Schemas.
 *
 * Statutory References:
 * - A New Tax System (Goods and Services Tax) Act 1999
 * - Australian Taxation Office (ATO) Business Activity Statement (BAS) Instructions
 * - Official ATO ABN Modulus 89 Algorithm
 */

// ── Statutory Constants ────────────────────────────────────────────────────────

export const AU_STANDARD_GST_RATE = 10.0 // 10% Standard Rate

export type AuSupplyClassification = "TAXABLE" | "GST_FREE" | "INPUT_TAXED"

// ── ABN (Australian Business Number) Modulus 89 Validator ──────────────────────

export interface AbnValidationResult {
  isValid: boolean
  formattedAbn: string
  error?: string
}

const ABN_WEIGHTS = [10, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19]

/**
 * Validates an 11-digit Australian Business Number (ABN) per official ATO Modulus 89 check:
 * 1. Remove non-digits, verify 11 digits.
 * 2. Subtract 1 from the first digit.
 * 3. Multiply each digit by its weighting factor.
 * 4. Sum the products.
 * 5. Verify that (sum % 89 === 0).
 */
export function validateAustralianAbn(abnInput?: string | null): AbnValidationResult {
  if (!abnInput) {
    return {
      isValid: false,
      formattedAbn: "",
      error: "ABN cannot be empty.",
    }
  }

  const clean = abnInput.replace(/[\s-]/g, "").trim()

  if (!/^\d+$/.test(clean)) {
    return {
      isValid: false,
      formattedAbn: clean,
      error: "ABN must contain numeric digits only.",
    }
  }

  if (clean.length !== 11) {
    return {
      isValid: false,
      formattedAbn: clean,
      error: `ABN must be exactly 11 digits (currently ${clean.length}).`,
    }
  }

  // Modulus 89 calculation
  const digits = clean.split("").map(Number)
  digits[0] -= 1 // Subtract 1 from first digit

  let sum = 0
  for (let i = 0; i < 11; i++) {
    sum += digits[i] * ABN_WEIGHTS[i]
  }

  if (sum % 89 !== 0) {
    return {
      isValid: false,
      formattedAbn: clean,
      error: "ABN failed the official ATO Modulus 89 checksum.",
    }
  }

  // Format as standard XX XXX XXX XXX
  const formatted = `${clean.slice(0, 2)} ${clean.slice(2, 5)} ${clean.slice(5, 8)} ${clean.slice(8, 11)}`

  return {
    isValid: true,
    formattedAbn: formatted,
  }
}

// ── Australian Financial Year & BAS Quarters ───────────────────────────────────

export interface AustralianBasPeriod {
  fyLabel: string // e.g. "FY 2026-27"
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
  quarterLabel: string // e.g. "Q1 (Jul–Sep)"
  startDate: string // YYYY-MM-DD
  endDate: string // YYYY-MM-DD
  dueDate: string // YYYY-MM-DD
  periodKey: string // "2026-Q1"
}

/**
 * Computes the Australian Financial Year (July 1 to June 30) BAS quarter.
 * Note: ATO grants a statutory extension for Q2 (ending Dec 31) to 28 February!
 */
export function getAustralianBasPeriod(startYear: number, quarter: "Q1" | "Q2" | "Q3" | "Q4"): AustralianBasPeriod {
  let startDate = ""
  let endDate = ""
  let dueDate = ""
  let quarterLabel = ""
  const fyLabel = `FY ${startYear}-${String(startYear + 1).slice(2)}`

  switch (quarter) {
    case "Q1": // July to September
      startDate = `${startYear}-07-01`
      endDate = `${startYear}-09-30`
      dueDate = `${startYear}-10-28`
      quarterLabel = `Q1 (Jul–Sep ${startYear})`
      break
    case "Q2": // October to December (Christmas extension to Feb 28)
      startDate = `${startYear}-10-01`
      endDate = `${startYear}-12-31`
      dueDate = `${startYear + 1}-02-28`
      quarterLabel = `Q2 (Oct–Dec ${startYear})`
      break
    case "Q3": // January to March
      startDate = `${startYear + 1}-01-01`
      endDate = `${startYear + 1}-03-31`
      dueDate = `${startYear + 1}-04-28`
      quarterLabel = `Q3 (Jan–Mar ${startYear + 1})`
      break
    case "Q4": // April to June
      startDate = `${startYear + 1}-04-01`
      endDate = `${startYear + 1}-06-30`
      dueDate = `${startYear + 1}-07-28`
      quarterLabel = `Q4 (Apr–Jun ${startYear + 1})`
      break
  }

  return {
    fyLabel,
    quarter,
    quarterLabel,
    startDate,
    endDate,
    dueDate,
    periodKey: `${startYear}-${quarter}`,
  }
}

// ── Models for Invoices, Bills & PAYG ───────────────────────────────────────────

export interface RawAuInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string | Date
  type: string
  status: string
  subtotal: number // Exclusive of GST
  taxAmount: number // 10% GST
  total: number // Inclusive of GST
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    trn?: string | null // ABN
  } | null
}

export interface RawAuBill {
  id: string
  billNumber: string
  billDate: string | Date
  status: string
  subtotal: number
  taxAmount: number
  total: number
  notes?: string | null // Checks for capital purchases (e.g. equipment/assets)
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    trn?: string | null // Supplier ABN
  } | null
}

export interface RawAuPaygRecord {
  grossWages: number // W1
  taxWithheld: number // W2
}

// ── Official ATO Business Activity Statement (BAS) Report ──────────────────────

export interface AustralianBasReport {
  period: AustralianBasPeriod
  taxpayerAbn: string
  taxpayerLegalName: string
  taxpayerAddress: string

  // GST Calculation (Calculation Sheet & BAS Labels)
  g1TotalSales: number // G1: Total sales (including any GST)
  g2ExportSales: number // G2: Export sales (GST-free)
  g3OtherGstFreeSales: number // G3: Other GST-free sales (medical, education, basic food)
  g4InputTaxedSales: number // G4: Input taxed sales (financial, residential rent)
  taxableSalesInclusive: number // G1 - (G2 + G3 + G4)

  g10CapitalPurchases: number // G10: Capital purchases (including GST)
  g11NonCapitalPurchases: number // G11: Other non-capital purchases (including GST)
  totalPurchasesInclusive: number // G10 + G11

  // Summary Box Labels
  box1AGstOnSales: number // 1A: GST on Sales (GST collected)
  box1BGstOnPurchases: number // 1B: GST on Purchases (Input tax credit claimed)
  box9NetGst: number // 9: Net GST (1A - 1B). Positive: Payable, Negative: Refundable

  // PAYG Withholding
  paygOption: "W1_W2"
  boxW1GrossWages: number // W1: Total salary, wages and other payments
  boxW2TaxWithheld: number // W2: Amount withheld from payments shown at W1

  // Total Activity Statement Settlement
  box8ATotalOwedToAto: number // 8A: Net GST (if positive) + PAYG W2

  summary: {
    invoicesCount: number
    billsCount: number
    abnComplianceRate: number
    gstFreeSalesCount: number
    capitalPurchasesCount: number
  }
}

/**
 * Compiles the official ATO Business Activity Statement (BAS).
 */
export function compileAustralianBas(params: {
  invoices: RawAuInvoice[]
  bills: RawAuBill[]
  payg?: RawAuPaygRecord
  taxpayerAbn: string
  taxpayerLegalName: string
  taxpayerAddress?: string
  startYear: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4"
}): AustralianBasReport {
  const { invoices, bills, payg, taxpayerAbn, taxpayerLegalName, taxpayerAddress, startYear, quarter } = params
  const period = getAustralianBasPeriod(startYear, quarter)

  let g1TotalSales = 0
  let g2ExportSales = 0
  let g3OtherGstFreeSales = 0
  let g4InputTaxedSales = 0
  let box1AGstOnSales = 0

  let verifiedAbnCount = 0
  let gstFreeSalesCount = 0

  const validInvoices = invoices.filter((i) => i.status !== "CANCELLED" && i.type !== "PROFORMA")

  for (const inv of validInvoices) {
    const isExport = inv.type === "EXPORT" || (inv.contact?.displayName || "").toLowerCase().includes("export")
    const isGstFree = inv.type === "GST_FREE" || inv.type === "EXEMPT"
    const isInputTaxed = inv.type === "INPUT_TAXED"

    const grossTotal = Number(inv.total || 0)
    const gstPortion = Number(inv.taxAmount || 0)

    g1TotalSales += grossTotal

    const buyerAbn = (inv.contact?.trn || "").trim()
    if (validateAustralianAbn(buyerAbn).isValid) {
      verifiedAbnCount++
    }

    if (isExport) {
      g2ExportSales += grossTotal
      gstFreeSalesCount++
    } else if (isGstFree) {
      g3OtherGstFreeSales += grossTotal
      gstFreeSalesCount++
    } else if (isInputTaxed) {
      g4InputTaxedSales += grossTotal
    } else {
      box1AGstOnSales += gstPortion
    }
  }

  // Purchases (Capital G10 vs Non-capital G11)
  let g10CapitalPurchases = 0
  let g11NonCapitalPurchases = 0
  let box1BGstOnPurchases = 0
  let capitalPurchasesCount = 0

  const validBills = bills.filter((b) => b.status !== "VOID")

  for (const bill of validBills) {
    const grossTotal = Number(bill.total || 0)
    const gstPortion = Number(bill.taxAmount || 0)
    const notesLower = (bill.notes || "").toLowerCase()
    const isCapital =
      notesLower.includes("capital") ||
      notesLower.includes("asset") ||
      notesLower.includes("equipment") ||
      notesLower.includes("vehicle") ||
      notesLower.includes("hardware")

    if (isCapital) {
      g10CapitalPurchases += grossTotal
      capitalPurchasesCount++
    } else {
      g11NonCapitalPurchases += grossTotal
    }

    box1BGstOnPurchases += gstPortion
  }

  const taxableSalesInclusive = Math.max(0, g1TotalSales - (g2ExportSales + g3OtherGstFreeSales + g4InputTaxedSales))
  const totalPurchasesInclusive = g10CapitalPurchases + g11NonCapitalPurchases

  // If GST on sales was not explicitly itemized, calculate 1/11th of taxable inclusive sales
  if (box1AGstOnSales === 0 && taxableSalesInclusive > 0) {
    box1AGstOnSales = Math.round((taxableSalesInclusive / 11) * 100) / 100
  }

  const box9NetGst = Math.round((box1AGstOnSales - box1BGstOnPurchases) * 100) / 100

  // PAYG
  const boxW1GrossWages = Math.round((payg?.grossWages || 0) * 100) / 100
  const boxW2TaxWithheld = Math.round((payg?.taxWithheld || 0) * 100) / 100

  // Box 8A: Total owed to ATO
  const gstOwed = box9NetGst > 0 ? box9NetGst : 0
  const box8ATotalOwedToAto = Math.round((gstOwed + boxW2TaxWithheld) * 100) / 100

  const abnComplianceRate = validInvoices.length > 0 ? Math.round((verifiedAbnCount / validInvoices.length) * 100) : 100

  return {
    period,
    taxpayerAbn: taxpayerAbn || "51 824 753 556",
    taxpayerLegalName: taxpayerLegalName || "Genesoft ERP Australia Pty Ltd",
    taxpayerAddress: taxpayerAddress || "Level 25, 100 Barangaroo Avenue, Sydney NSW 2000",
    g1TotalSales: Math.round(g1TotalSales * 100) / 100,
    g2ExportSales: Math.round(g2ExportSales * 100) / 100,
    g3OtherGstFreeSales: Math.round(g3OtherGstFreeSales * 100) / 100,
    g4InputTaxedSales: Math.round(g4InputTaxedSales * 100) / 100,
    taxableSalesInclusive: Math.round(taxableSalesInclusive * 100) / 100,
    g10CapitalPurchases: Math.round(g10CapitalPurchases * 100) / 100,
    g11NonCapitalPurchases: Math.round(g11NonCapitalPurchases * 100) / 100,
    totalPurchasesInclusive: Math.round(totalPurchasesInclusive * 100) / 100,
    box1AGstOnSales: Math.round(box1AGstOnSales * 100) / 100,
    box1BGstOnPurchases: Math.round(box1BGstOnPurchases * 100) / 100,
    box9NetGst,
    paygOption: "W1_W2",
    boxW1GrossWages,
    boxW2TaxWithheld,
    box8ATotalOwedToAto,
    summary: {
      invoicesCount: validInvoices.length,
      billsCount: validBills.length,
      abnComplianceRate,
      gstFreeSalesCount,
      capitalPurchasesCount,
    },
  }
}

// ── Official ATO Exporters (JSON & CSV) ────────────────────────────────────────

export function formatAustralianBasJson(report: AustralianBasReport): object {
  return {
    agency: "ATO",
    form: "BUSINESS_ACTIVITY_STATEMENT",
    taxpayer: {
      abn: report.taxpayerAbn,
      entity_name: report.taxpayerLegalName,
      address: report.taxpayerAddress,
    },
    period: {
      financial_year: report.period.fyLabel,
      quarter: report.period.quarterLabel,
      start_date: report.period.startDate,
      end_date: report.period.endDate,
      due_date: report.period.dueDate,
    },
    goods_and_services_tax: {
      g1_total_sales: report.g1TotalSales,
      g2_export_sales: report.g2ExportSales,
      g3_other_gst_free_sales: report.g3OtherGstFreeSales,
      g4_input_taxed_sales: report.g4InputTaxedSales,
      g10_capital_purchases: report.g10CapitalPurchases,
      g11_non_capital_purchases: report.g11NonCapitalPurchases,
      box_1a_gst_on_sales: report.box1AGstOnSales,
      box_1b_gst_on_purchases: report.box1BGstOnPurchases,
      box_9_net_gst: report.box9NetGst,
      status: report.box9NetGst >= 0 ? "PAYABLE_TO_ATO" : "REFUNDABLE_CREDIT",
    },
    payg_tax_withheld: {
      box_w1_total_wages: report.boxW1GrossWages,
      box_w2_amount_withheld: report.boxW2TaxWithheld,
    },
    settlement: {
      box_8a_total_amount_payable_to_ato: report.box8ATotalOwedToAto,
    },
  }
}

export function formatAustralianBasCsv(report: AustralianBasReport): string {
  const lines: string[] = [
    `"AUSTRALIAN TAXATION OFFICE - BUSINESS ACTIVITY STATEMENT (BAS)"`,
    `"Australian Business Number (ABN)","${report.taxpayerAbn}"`,
    `"Entity Name","${report.taxpayerLegalName.replace(/"/g, '""')}"`,
    `"Financial Year","${report.period.fyLabel} - ${report.period.quarterLabel}"`,
    `"Due Date","${report.period.dueDate}"`,
    `""`,
    `"GST CALCULATION SHEET",,`,
    `"Code","Item Description","Amount (AUD)"`,
    `"G1","Total Sales (including any GST)",${report.g1TotalSales.toFixed(2)}`,
    `"G2","Export Sales (GST-free)",${report.g2ExportSales.toFixed(2)}`,
    `"G3","Other GST-free Sales",${report.g3OtherGstFreeSales.toFixed(2)}`,
    `"G4","Input Taxed Sales",${report.g4InputTaxedSales.toFixed(2)}`,
    `"G10","Capital Purchases (including GST)",${report.g10CapitalPurchases.toFixed(2)}`,
    `"G11","Non-capital Purchases (including GST)",${report.g11NonCapitalPurchases.toFixed(2)}`,
    `""`,
    `"SUMMARY LABELS",,`,
    `"1A","GST on Sales (GST collected)",${report.box1AGstOnSales.toFixed(2)}`,
    `"1B","GST on Purchases (Input tax credit)",${report.box1BGstOnPurchases.toFixed(2)}`,
    `"9","Net GST (1A minus 1B)",${report.box9NetGst.toFixed(2)}`,
    `""`,
    `"PAYG WITHHOLDING",,`,
    `"W1","Total salary, wages and other payments",${report.boxW1GrossWages.toFixed(2)}`,
    `"W2","Amounts withheld from payments shown at W1",${report.boxW2TaxWithheld.toFixed(2)}`,
    `""`,
    `"NET ATO ACTIVITY STATEMENT SUMMARY",,`,
    `"8A","Total Amount Owed to ATO",${report.box8ATotalOwedToAto.toFixed(2)}`,
  ]

  return lines.join("\n")
}
