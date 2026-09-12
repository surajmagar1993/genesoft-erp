/**
 * tds-engine.ts
 * Pure TypeScript Indian TDS (Tax Deducted at Source) engine.
 * Covers statutory sections, rates, threshold limits, PAN & TAN validation,
 * quarterly periods, and calculation logic under the Indian Income Tax Act, 1961.
 */

// ── Statutory TDS Sections Registry ───────────────────────────────────────────

export interface TdsSectionDefinition {
  code: string
  name: string
  description: string
  individualHufRate: number // Percentage (e.g. 1 for 1%)
  companyOtherRate: number // Percentage (e.g. 2 for 2%)
  exemptionThreshold: number // Single or annual threshold in INR
  thresholdType: "SINGLE_OR_AGGREGATE" | "ANNUAL" | "TRANSACTION"
  notes?: string
  subCategory?: string
}

export const TDS_SECTIONS: Record<string, TdsSectionDefinition> = {
  "194C": {
    code: "194C",
    name: "Payments to Contractors / Sub-contractors",
    description: "Work contracts, advertising, transport, catering, manufacturing through job-work.",
    individualHufRate: 1.0,
    companyOtherRate: 2.0,
    exemptionThreshold: 30000, // Single bill > 30,000 or aggregate > 1,00,000 in FY
    thresholdType: "SINGLE_OR_AGGREGATE",
    notes: "Single contract > ₹30,000 or aggregate > ₹1,00,000 per FY.",
  },
  "194J_TECH": {
    code: "194J_TECH",
    name: "194J: Fees for Technical Services (FTS) & Royalty",
    description: "Technical, engineering, architectural services, call center operations, royalty.",
    individualHufRate: 2.0,
    companyOtherRate: 2.0,
    exemptionThreshold: 30000,
    thresholdType: "ANNUAL",
    subCategory: "Technical Services",
    notes: "2% statutory rate for fees for technical services & call centers.",
  },
  "194J_PROF": {
    code: "194J_PROF",
    name: "194J: Professional Fees",
    description: "Legal, medical, engineering, accountancy, technical consultancy, interior decoration.",
    individualHufRate: 10.0,
    companyOtherRate: 10.0,
    exemptionThreshold: 30000,
    thresholdType: "ANNUAL",
    subCategory: "Professional Services",
    notes: "10% rate for professional services (exemption: ₹30,000/year).",
  },
  "194I_PLANT": {
    code: "194I_PLANT",
    name: "194I: Rent of Plant, Machinery & Equipment",
    description: "Lease or hire charges for equipment, tools, machinery, plant.",
    individualHufRate: 2.0,
    companyOtherRate: 2.0,
    exemptionThreshold: 240000,
    thresholdType: "ANNUAL",
    subCategory: "Plant & Machinery",
    notes: "2% rate for plant & machinery rent (threshold ₹2,40,000/year).",
  },
  "194I_LAND": {
    code: "194I_LAND",
    name: "194I: Rent of Land, Building & Furniture",
    description: "Office rent, commercial premises, warehouse lease, furniture rental.",
    individualHufRate: 10.0,
    companyOtherRate: 10.0,
    exemptionThreshold: 240000,
    thresholdType: "ANNUAL",
    subCategory: "Land & Building",
    notes: "10% rate for land/building rent (threshold ₹2,40,000/year).",
  },
  "194H": {
    code: "194H",
    name: "Commission or Brokerage",
    description: "Commission, brokerage, sales agency fees, factoring charges.",
    individualHufRate: 5.0,
    companyOtherRate: 5.0,
    exemptionThreshold: 15000,
    thresholdType: "ANNUAL",
    notes: "5% statutory rate (budget updated threshold ₹15,000/year).",
  },
  "194Q": {
    code: "194Q",
    name: "Purchase of Goods (High Volume)",
    description: "Purchase of goods exceeding ₹50 Lakhs in a financial year by buyers with turnover > ₹10 Cr.",
    individualHufRate: 0.1,
    companyOtherRate: 0.1,
    exemptionThreshold: 5000000,
    thresholdType: "ANNUAL",
    notes: "0.1% TDS on value exceeding ₹50,00,000 in FY.",
  },
  "194A": {
    code: "194A",
    name: "Interest Other than on Securities",
    description: "Unsecured loan interest, inter-corporate deposits, non-bank financing interest.",
    individualHufRate: 10.0,
    companyOtherRate: 10.0,
    exemptionThreshold: 5000,
    thresholdType: "ANNUAL",
    notes: "10% TDS on interest paid to resident lenders.",
  },
}

// Higher rate for non-furnishing of PAN as per Section 206AA
export const SECTION_206AA_PENALTY_RATE = 20.0

// ── PAN & TAN Validation ──────────────────────────────────────────────────────

export interface PanValidationResult {
  isValid: boolean
  pan: string
  entityType?: string
  entityCategory?: "INDIVIDUAL" | "COMPANY" | "FIRM" | "HUF" | "OTHER"
  isIndividualOrHuf: boolean
  error?: string
}

/**
 * Validates an Indian Permanent Account Number (PAN).
 * Format: 5 uppercase letters, 4 digits, 1 uppercase letter (e.g. ABCDE1234F).
 * 4th character denotes entity status:
 *   P - Individual
 *   C - Company
 *   F - Firm / LLP
 *   H - Hindu Undivided Family (HUF)
 *   A - Association of Persons (AOP)
 *   T - Trust
 *   B - Body of Individuals (BOI)
 *   G - Government Agency
 *   J - Artificial Juridical Person
 *   L - Local Authority
 */
export function validatePan(pan: string | null | undefined): PanValidationResult {
  const clean = (pan || "").trim().toUpperCase()
  if (!clean) {
    return {
      isValid: false,
      pan: "",
      isIndividualOrHuf: false,
      error: "PAN is required.",
    }
  }

  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]$/
  if (!panRegex.test(clean)) {
    return {
      isValid: false,
      pan: clean,
      isIndividualOrHuf: false,
      error: "Invalid PAN format. Must be 10 characters (5 letters, 4 numbers, 1 letter).",
    }
  }

  const fourthChar = clean.charAt(3)
  let entityType = "Other Entity"
  let entityCategory: "INDIVIDUAL" | "COMPANY" | "FIRM" | "HUF" | "OTHER" = "OTHER"
  let isIndividualOrHuf = false

  switch (fourthChar) {
    case "P":
      entityType = "Individual"
      entityCategory = "INDIVIDUAL"
      isIndividualOrHuf = true
      break
    case "C":
      entityType = "Company"
      entityCategory = "COMPANY"
      break
    case "F":
      entityType = "Partnership Firm / LLP"
      entityCategory = "FIRM"
      break
    case "H":
      entityType = "Hindu Undivided Family (HUF)"
      entityCategory = "HUF"
      isIndividualOrHuf = true
      break
    case "A":
      entityType = "Association of Persons (AOP)"
      break
    case "T":
      entityType = "Trust"
      break
    case "B":
      entityType = "Body of Individuals (BOI)"
      break
    case "G":
      entityType = "Government Agency"
      break
    case "J":
      entityType = "Artificial Juridical Person"
      break
    case "L":
      entityType = "Local Authority"
      break
    default:
      entityType = "Unknown Entity"
  }

  return {
    isValid: true,
    pan: clean,
    entityType,
    entityCategory,
    isIndividualOrHuf,
  }
}

export interface TanValidationResult {
  isValid: boolean
  tan: string
  error?: string
}

/**
 * Validates an Indian Tax Deduction and Collection Account Number (TAN).
 * Format: 4 letters, 5 digits, 1 letter (e.g. MUMA12345B).
 */
export function validateTan(tan: string | null | undefined): TanValidationResult {
  const clean = (tan || "").trim().toUpperCase()
  if (!clean) {
    return { isValid: false, tan: "", error: "TAN is required." }
  }

  const tanRegex = /^[A-Z]{4}[0-9]{5}[A-Z]$/
  if (!tanRegex.test(clean)) {
    return {
      isValid: false,
      tan: clean,
      error: "Invalid TAN format. Must be 10 characters (4 letters, 5 numbers, 1 letter).",
    }
  }

  return { isValid: true, tan: clean }
}

// ── TDS Calculation Engine ────────────────────────────────────────────────────

export interface TdsCalculationInput {
  grossAmount: number
  sectionCode: string
  deducteePan?: string | null
  isIndividualOrHuf?: boolean
  customRate?: number
  applySection206AA?: boolean // If true, penalize missing/invalid PAN with 20%
  priorYtdAmount?: number // Cumulative payment in FY for threshold checking
  enforceThreshold?: boolean // If true, amounts below statutory threshold result in zero deduction
}

export interface TdsCalculationResult {
  sectionCode: string
  sectionName: string
  grossAmount: number
  statutoryRate: number
  appliedRate: number
  tdsAmount: number
  netPayableAmount: number
  isPanValid: boolean
  panError?: string
  entityType?: string
  is206AAPenaltyApplied: boolean
  isThresholdExceeded: boolean
  thresholdLimit: number
  notes: string
}

/**
 * Calculates TDS deduction amount, applicable rate, and net payable.
 */
export function calculateTds(input: TdsCalculationInput): TdsCalculationResult {
  const gross = Math.max(0, Number(input.grossAmount) || 0)
  const section = TDS_SECTIONS[input.sectionCode] || TDS_SECTIONS["194C"]
  const panResult = validatePan(input.deducteePan)

  // Determine if deductee is Individual/HUF
  const isIndividual = input.isIndividualOrHuf ?? panResult.isIndividualOrHuf

  // Base statutory rate for this section & entity
  let statutoryRate = isIndividual ? section.individualHufRate : section.companyOtherRate
  if (input.customRate !== undefined && input.customRate >= 0) {
    statutoryRate = input.customRate
  }

  // Check 206AA: If PAN is invalid or missing, mandatory 20%
  const apply206AA = input.applySection206AA !== false
  const is206AAPenaltyApplied = apply206AA && !panResult.isValid
  const appliedRate = is206AAPenaltyApplied ? SECTION_206AA_PENALTY_RATE : statutoryRate

  // Check exemption threshold
  const priorYtd = Number(input.priorYtdAmount) || 0
  const totalFyAmount = priorYtd + gross
  const isThresholdExceeded = totalFyAmount >= section.exemptionThreshold

  // TDS Amount rounded to nearest rupee as per Section 288B
  const rawTds = (gross * appliedRate) / 100
  let tdsAmount = Math.round(rawTds * 100) / 100
  let netPayableAmount = Math.max(0, Math.round((gross - tdsAmount) * 100) / 100)

  let notes = `${section.name} @ ${appliedRate}%`

  if (input.enforceThreshold && !isThresholdExceeded) {
    tdsAmount = 0
    netPayableAmount = gross
    notes = `${section.name}: Below statutory threshold limit of ₹${section.exemptionThreshold.toLocaleString("en-IN")}. Exemption applied.`
  } else if (is206AAPenaltyApplied) {
    notes += ` (Sec 206AA applied: Higher 20% rate due to missing/invalid PAN)`
  }

  return {
    sectionCode: section.code,
    sectionName: section.name,
    grossAmount: gross,
    statutoryRate,
    appliedRate,
    tdsAmount,
    netPayableAmount,
    isPanValid: panResult.isValid,
    panError: panResult.error,
    entityType: panResult.entityType,
    is206AAPenaltyApplied,
    isThresholdExceeded,
    thresholdLimit: section.exemptionThreshold,
    notes,
  }
}

// ── Fiscal Year & Indian Tax Quarter Helpers ─────────────────────────────────

export type IndianTaxQuarter = "Q1" | "Q2" | "Q3" | "Q4"

/**
 * Returns Indian Financial Year string (e.g. "2026-27") for a given date.
 */
export function getIndianFinancialYear(date: Date = new Date()): string {
  const month = date.getMonth() + 1 // 1-12
  const year = date.getFullYear()
  const startYear = month >= 4 ? year : year - 1
  const endYear = (startYear + 1) % 100
  return `${startYear}-${String(endYear).padStart(2, "0")}`
}

/**
 * Returns Indian Tax Quarter:
 * Q1: Apr - Jun
 * Q2: Jul - Sep
 * Q3: Oct - Dec
 * Q4: Jan - Mar
 */
export function getIndianTaxQuarter(date: Date = new Date()): IndianTaxQuarter {
  const month = date.getMonth() + 1
  if (month >= 4 && month <= 6) return "Q1"
  if (month >= 7 && month <= 9) return "Q2"
  if (month >= 10 && month <= 12) return "Q3"
  return "Q4"
}

/**
 * Returns start and end dates for a specific FY and Quarter.
 */
export function getQuarterDateRange(fy: string, quarter: IndianTaxQuarter): { start: Date; end: Date } {
  const parts = fy.split("-")
  const startYear = parseInt(parts[0], 10) || new Date().getFullYear()

  switch (quarter) {
    case "Q1":
      return {
        start: new Date(startYear, 3, 1, 0, 0, 0), // Apr 1
        end: new Date(startYear, 5, 30, 23, 59, 59), // Jun 30
      }
    case "Q2":
      return {
        start: new Date(startYear, 6, 1, 0, 0, 0), // Jul 1
        end: new Date(startYear, 8, 30, 23, 59, 59), // Sep 30
      }
    case "Q3":
      return {
        start: new Date(startYear, 9, 1, 0, 0, 0), // Oct 1
        end: new Date(startYear, 11, 31, 23, 59, 59), // Dec 31
      }
    case "Q4":
      return {
        start: new Date(startYear + 1, 0, 1, 0, 0, 0), // Jan 1
        end: new Date(startYear + 1, 2, 31, 23, 59, 59), // Mar 31
      }
  }
}

/**
 * Monthly TDS Deposit Due Date:
 * 7th of the following month (except for March deductions, which are due April 30th).
 */
export function getTdsMonthlyDepositDueDate(deductionDate: Date): Date {
  const month = deductionDate.getMonth() // 0-11
  const year = deductionDate.getFullYear()

  if (month === 2) {
    // March deduction -> April 30
    return new Date(year, 3, 30, 23, 59, 59)
  }
  // Other months -> 7th of next month
  return new Date(year, month + 1, 7, 23, 59, 59)
}

/**
 * Quarterly Form 26Q Filing Due Date:
 * Q1: July 31
 * Q2: October 31
 * Q3: January 31
 * Q4: May 31
 */
export function getForm26QDueDate(fy: string, quarter: IndianTaxQuarter): Date {
  const parts = fy.split("-")
  const startYear = parseInt(parts[0], 10) || new Date().getFullYear()

  switch (quarter) {
    case "Q1":
      return new Date(startYear, 6, 31, 23, 59, 59) // July 31
    case "Q2":
      return new Date(startYear, 9, 31, 23, 59, 59) // October 31
    case "Q3":
      return new Date(startYear + 1, 0, 31, 23, 59, 59) // January 31
    case "Q4":
      return new Date(startYear + 1, 4, 31, 23, 59, 59) // May 31
  }
}
