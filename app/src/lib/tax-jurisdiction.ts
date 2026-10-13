/**
 * Unified Tax Jurisdiction Engine
 * Resolves statutory tax modules, currency symbols, and applicable filing desks
 * based on the tenant's registered country.
 */

export interface TaxModuleItem {
  id: string
  name: string
  href: string
  flag: string
  description: string
  law: string
  isWithholding?: boolean
  isEway?: boolean
}

export interface TaxJurisdictionConfig {
  countryCode: string
  countryName: string
  flag: string
  currencyCode: string
  currencySymbol: string
  regimeName: string
  taxLabel: string
  defaultRate: number
  standardRates: number[]
  financeTaxItems: Array<{
    name: string
    href: string
    shortName: string
  }>
  hasEwayBills: boolean
  hasWithholdingTax: boolean
  /** IN_GST: Indian CGST+SGST / IGST split by state. SINGLE: one VAT / GST / sales tax line. */
  mode: "IN_GST" | "SINGLE"
  /** Number and date formatting for this country */
  locale: string
  /** Label of the business's tax registration number on invoices */
  taxIdLabel: string
  /** Document title the law expects on a taxable sales invoice */
  invoiceTitle: string
  /** KSA ZATCA phase 1: a QR code (TLV) is required on every invoice */
  requiresZatcaQr?: boolean
  /** Usual first month of the financial year (1 = January) */
  fiscalYearStartMonth?: number
}

export const TAX_JURISDICTIONS: Record<string, TaxJurisdictionConfig> = {
  IN: {
    countryCode: "IN",
    countryName: "India",
    flag: "🇮🇳",
    currencyCode: "INR",
    currencySymbol: "₹",
    regimeName: "Goods and Services Tax (GST) & TDS",
    taxLabel: "GST",
    defaultRate: 18.0,
    standardRates: [0, 5, 12, 18, 28],
    financeTaxItems: [],
    hasEwayBills: false,
    hasWithholdingTax: false,
    mode: "IN_GST",
    locale: "en-IN",
    taxIdLabel: "GSTIN",
    invoiceTitle: "Tax Invoice",
    fiscalYearStartMonth: 4,
  },
  AE: {
    countryCode: "AE",
    countryName: "United Arab Emirates",
    flag: "🇦🇪",
    currencyCode: "AED",
    currencySymbol: "AED ",
    regimeName: "Federal Tax Authority (FTA) VAT",
    taxLabel: "VAT",
    defaultRate: 5.0,
    standardRates: [0, 5],
    financeTaxItems: [
      { name: "UAE VAT (Form 201)", href: "/finance/vat-uae", shortName: "🇦🇪 UAE VAT" },
    ],
    hasEwayBills: false,
    hasWithholdingTax: false,
    mode: "SINGLE",
    locale: "en-AE",
    taxIdLabel: "TRN",
    invoiceTitle: "Tax Invoice",
  },
  SA: {
    countryCode: "SA",
    countryName: "Saudi Arabia",
    flag: "🇸🇦",
    currencyCode: "SAR",
    currencySymbol: "SAR ",
    regimeName: "ZATCA Fatoora E-Invoicing & VAT",
    taxLabel: "VAT",
    defaultRate: 15.0,
    standardRates: [0, 15],
    financeTaxItems: [
      { name: "KSA VAT & ZATCA", href: "/finance/vat-ksa", shortName: "🇸🇦 KSA VAT" },
    ],
    hasEwayBills: false,
    hasWithholdingTax: false,
    mode: "SINGLE",
    locale: "en-SA",
    taxIdLabel: "VAT No.",
    invoiceTitle: "Tax Invoice",
    requiresZatcaQr: true,
  },
  AU: {
    countryCode: "AU",
    countryName: "Australia",
    flag: "🇦🇺",
    currencyCode: "AUD",
    currencySymbol: "A$",
    regimeName: "Australian Taxation Office (ATO) BAS & GST",
    taxLabel: "GST",
    defaultRate: 10.0,
    standardRates: [0, 10],
    financeTaxItems: [
      { name: "Australia BAS (GST)", href: "/finance/tax-australia", shortName: "🇦🇺 Australia BAS" },
    ],
    hasEwayBills: false,
    hasWithholdingTax: false,
    mode: "SINGLE",
    locale: "en-AU",
    taxIdLabel: "ABN",
    invoiceTitle: "Tax Invoice",
    fiscalYearStartMonth: 7,
  },
  GB: {
    countryCode: "GB",
    countryName: "United Kingdom",
    flag: "🇬🇧",
    currencyCode: "GBP",
    currencySymbol: "£",
    regimeName: "HMRC Making Tax Digital (MTD) VAT",
    taxLabel: "VAT",
    defaultRate: 20.0,
    standardRates: [0, 5, 20],
    financeTaxItems: [
      { name: "UK VAT (MTD)", href: "/finance/vat-uk", shortName: "🇬🇧 UK VAT" },
    ],
    hasEwayBills: false,
    hasWithholdingTax: false,
    mode: "SINGLE",
    locale: "en-GB",
    taxIdLabel: "VAT Reg. No.",
    invoiceTitle: "VAT Invoice",
    fiscalYearStartMonth: 4,
  },
  US: {
    countryCode: "US",
    countryName: "United States",
    flag: "🇺🇸",
    currencyCode: "USD",
    currencySymbol: "$",
    regimeName: "US Sales Tax & IRS Form 1099",
    taxLabel: "Sales Tax",
    defaultRate: 7.25,
    standardRates: [0, 4.0, 6.0, 6.25, 7.25, 8.875],
    financeTaxItems: [
      { name: "US Sales Tax & 1099", href: "/finance/tax-us", shortName: "🇺🇸 US Sales Tax" },
    ],
    hasEwayBills: false,
    hasWithholdingTax: true,
    mode: "SINGLE",
    locale: "en-US",
    taxIdLabel: "EIN",
    invoiceTitle: "Invoice",
  },
}

/**
 * Any country without its own entry: one tax line whose name and rates the
 * business sets in Settings (settings.tax.label / rates / defaultRate).
 */
export const OTHER_JURISDICTION: TaxJurisdictionConfig = {
  countryCode: "OTHER",
  countryName: "Other country",
  flag: "🌐",
  currencyCode: "USD",
  currencySymbol: "",
  regimeName: "Sales tax / VAT",
  taxLabel: "Tax",
  defaultRate: 0,
  standardRates: [0],
  financeTaxItems: [],
  hasEwayBills: false,
  hasWithholdingTax: false,
  mode: "SINGLE",
  locale: "en-US",
  taxIdLabel: "Tax ID",
  invoiceTitle: "Invoice",
}

/** Countries offered at signup, plus "Other". */
export const SIGNUP_COUNTRIES = ["IN", "AE", "SA", "GB", "US", "AU"] as const

/**
 * Normalizes any country representation (e.g. "IN", "India", "AE", "SA")
 * into a standardized 2-letter ISO code.
 */
export function normalizeCountryCode(country?: string | null): string {
  if (!country) return "IN"
  const upper = country.trim().toUpperCase()
  if (upper === "INDIA" || upper === "IND" || upper === "IN") return "IN"
  if (upper === "UNITED ARAB EMIRATES" || upper === "UAE" || upper === "DUBAI" || upper === "AE") return "AE"
  if (upper === "SAUDI ARABIA" || upper === "KSA" || upper === "SA") return "SA"
  if (upper === "AUSTRALIA" || upper === "AUS" || upper === "AU") return "AU"
  if (upper === "UNITED KINGDOM" || upper === "UK" || upper === "GREAT BRITAIN" || upper === "GB") return "GB"
  if (upper === "UNITED STATES" || upper === "USA" || upper === "US" || upper === "AMERICA") return "US"
  // Unknown countries keep their own code (they get the generic "Other" setup), never India's
  return upper
}

/**
 * Retrieves the statutory tax jurisdiction configuration for a tenant.
 */
export function getTaxJurisdiction(country?: string | null): TaxJurisdictionConfig {
  const code = normalizeCountryCode(country)
  return TAX_JURISDICTIONS[code] || { ...OTHER_JURISDICTION, countryCode: code }
}

/** Per-business tax overrides saved in tenant settings (settings.tax). */
export interface TenantTaxSettings {
  label?: string
  rates?: number[]
  defaultRate?: number
}

/**
 * The tax setup a business actually uses: its country's rules, with the
 * business's own tax name and rates from Settings when set (needed for
 * "Other" countries and US state rates).
 */
export function resolveTaxRegime(
  countryCode?: string | null,
  settings?: { tax?: TenantTaxSettings } | null,
  currencyCode?: string | null
): TaxJurisdictionConfig {
  const base = getTaxJurisdiction(countryCode)
  const custom = settings?.tax || {}
  const rates = Array.isArray(custom.rates) && custom.rates.length
    ? [...new Set([0, ...custom.rates.map(Number).filter((r) => r >= 0 && r <= 100)])].sort((a, b) => a - b)
    : base.standardRates
  const defaultRate = typeof custom.defaultRate === "number" && rates.includes(custom.defaultRate) ? custom.defaultRate : base.defaultRate
  return {
    ...base,
    taxLabel: base.mode === "SINGLE" && custom.label?.trim() ? custom.label.trim() : base.taxLabel,
    standardRates: base.mode === "IN_GST" ? base.standardRates : rates,
    defaultRate: base.mode === "IN_GST" ? base.defaultRate : defaultRate,
    currencyCode: currencyCode || base.currencyCode,
  }
}

/**
 * Checks if a specific finance tax route is applicable to the tenant.
 */
export function isTaxRouteApplicable(
  href: string,
  country?: string | null,
  enableMultiJurisdiction: boolean = false
): boolean {
  if (enableMultiJurisdiction) return true

  const jurisdiction = getTaxJurisdiction(country)
  const isMatch = jurisdiction.financeTaxItems.some((item) => item.href === href)
  return isMatch
}
