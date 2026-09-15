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
    financeTaxItems: [
      { name: "GST Returns (GSTR)", href: "/finance/gst-returns", shortName: "🇮🇳 India GST" },
      { name: "TDS & Withholding", href: "/finance/tds", shortName: "🇮🇳 TDS 26Q" },
    ],
    hasEwayBills: true,
    hasWithholdingTax: true,
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
  },
}

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
  return TAX_JURISDICTIONS[upper] ? upper : "IN"
}

/**
 * Retrieves the statutory tax jurisdiction configuration for a tenant.
 */
export function getTaxJurisdiction(country?: string | null): TaxJurisdictionConfig {
  const code = normalizeCountryCode(country)
  return TAX_JURISDICTIONS[code] || TAX_JURISDICTIONS.IN
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
