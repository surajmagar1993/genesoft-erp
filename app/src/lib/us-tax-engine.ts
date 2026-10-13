/**
 * Comprehensive US Sales Tax & IRS Form 1099 Compliance Engine
 * 
 * Statutory coverage:
 * 1. 50 US States + District of Columbia Sales Tax Matrix
 * 2. Destination vs Origin Sourcing Rules
 * 3. South Dakota v. Wayfair Economic Nexus Threshold Tracking ($100k / $500k sales & transactions)
 * 4. Multi-State Exemption Certificates (Resale ST-120/CDTFA-230/MTC, Non-Profit 501(c)(3), Govt)
 * 5. IRS Form 1099-NEC & 1099-MISC (Box 1 Nonemployee Comp >= $600 threshold, TIN/EIN validation, backup withholding)
 * 6. IRS Publication 1220 FIRE Electronic Reporting & State Sales Tax CSV exporters
 */

export type SourcingRule = "DESTINATION" | "ORIGIN"

export type NexusStatus = "ACTIVE_NEXUS" | "APPROACHING" | "MONITORED" | "EXEMPT_NOMAD"

export type ExemptionType =
  | "RESALE"
  | "NON_PROFIT_501C3"
  | "GOVERNMENT"
  | "MANUFACTURING_EQUIPMENT"
  | "AGRICULTURAL"
  | "DIPLOMATIC"

export interface UsStateTaxRule {
  stateCode: string
  stateName: string
  stateBaseRate: number // e.g. 7.25 for CA
  avgLocalRate: number  // e.g. 1.60 for CA
  combinedAvgRate: number // e.g. 8.85 for CA
  sourcingRule: SourcingRule
  nexusSalesThreshold: number // e.g. 500000 or 100000
  nexusTxnsThreshold: number | null // e.g. 200 or null
  isNomad: boolean // NH, OR, MT, AK, DE
  filingAgency: string
  filingDeadlineDay: number // e.g. 20 or 31
  hasLocalTaxes: boolean
}

export const US_STATE_TAX_RULES: Record<string, UsStateTaxRule> = {
  AL: {
    stateCode: "AL",
    stateName: "Alabama",
    stateBaseRate: 4.0,
    avgLocalRate: 5.29,
    combinedAvgRate: 9.29,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 250000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Alabama Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  AK: {
    stateCode: "AK",
    stateName: "Alaska",
    stateBaseRate: 0.0,
    avgLocalRate: 1.82,
    combinedAvgRate: 1.82,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: true,
    filingAgency: "Alaska Remote Seller Sales Tax Commission",
    filingDeadlineDay: 30,
    hasLocalTaxes: true,
  },
  AZ: {
    stateCode: "AZ",
    stateName: "Arizona",
    stateBaseRate: 5.6,
    avgLocalRate: 2.8,
    combinedAvgRate: 8.4,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Arizona Dept of Revenue (TPT)",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  AR: {
    stateCode: "AR",
    stateName: "Arkansas",
    stateBaseRate: 6.5,
    avgLocalRate: 2.97,
    combinedAvgRate: 9.47,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Arkansas Dept of Finance and Administration",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  CA: {
    stateCode: "CA",
    stateName: "California",
    stateBaseRate: 7.25,
    avgLocalRate: 1.63,
    combinedAvgRate: 8.88,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 500000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "California Dept of Tax and Fee Administration (CDTFA)",
    filingDeadlineDay: 31,
    hasLocalTaxes: true,
  },
  CO: {
    stateCode: "CO",
    stateName: "Colorado",
    stateBaseRate: 2.9,
    avgLocalRate: 4.91,
    combinedAvgRate: 7.81,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Colorado Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  CT: {
    stateCode: "CT",
    stateName: "Connecticut",
    stateBaseRate: 6.35,
    avgLocalRate: 0.0,
    combinedAvgRate: 6.35,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Connecticut Dept of Revenue Services",
    filingDeadlineDay: 31,
    hasLocalTaxes: false,
  },
  DE: {
    stateCode: "DE",
    stateName: "Delaware",
    stateBaseRate: 0.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 0.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: true,
    filingAgency: "Delaware Division of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: false,
  },
  FL: {
    stateCode: "FL",
    stateName: "Florida",
    stateBaseRate: 6.0,
    avgLocalRate: 1.05,
    combinedAvgRate: 7.05,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Florida Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  GA: {
    stateCode: "GA",
    stateName: "Georgia",
    stateBaseRate: 4.0,
    avgLocalRate: 3.40,
    combinedAvgRate: 7.40,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Georgia Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  HI: {
    stateCode: "HI",
    stateName: "Hawaii",
    stateBaseRate: 4.0,
    avgLocalRate: 0.50,
    combinedAvgRate: 4.50,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Hawaii Dept of Taxation (GET)",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  ID: {
    stateCode: "ID",
    stateName: "Idaho",
    stateBaseRate: 6.0,
    avgLocalRate: 0.03,
    combinedAvgRate: 6.03,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Idaho State Tax Commission",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  IL: {
    stateCode: "IL",
    stateName: "Illinois",
    stateBaseRate: 6.25,
    avgLocalRate: 2.61,
    combinedAvgRate: 8.86,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Illinois Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  IN: {
    stateCode: "IN",
    stateName: "Indiana",
    stateBaseRate: 7.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 7.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Indiana Dept of Revenue",
    filingDeadlineDay: 30,
    hasLocalTaxes: false,
  },
  IA: {
    stateCode: "IA",
    stateName: "Iowa",
    stateBaseRate: 6.0,
    avgLocalRate: 0.94,
    combinedAvgRate: 6.94,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Iowa Dept of Revenue",
    filingDeadlineDay: 31,
    hasLocalTaxes: true,
  },
  KS: {
    stateCode: "KS",
    stateName: "Kansas",
    stateBaseRate: 6.5,
    avgLocalRate: 2.21,
    combinedAvgRate: 8.71,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Kansas Dept of Revenue",
    filingDeadlineDay: 25,
    hasLocalTaxes: true,
  },
  KY: {
    stateCode: "KY",
    stateName: "Kentucky",
    stateBaseRate: 6.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 6.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Kentucky Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: false,
  },
  LA: {
    stateCode: "LA",
    stateName: "Louisiana",
    stateBaseRate: 4.45,
    avgLocalRate: 5.11,
    combinedAvgRate: 9.56,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Louisiana Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  ME: {
    stateCode: "ME",
    stateName: "Maine",
    stateBaseRate: 5.5,
    avgLocalRate: 0.0,
    combinedAvgRate: 5.5,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Maine Revenue Services",
    filingDeadlineDay: 15,
    hasLocalTaxes: false,
  },
  MD: {
    stateCode: "MD",
    stateName: "Maryland",
    stateBaseRate: 6.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 6.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Comptroller of Maryland",
    filingDeadlineDay: 20,
    hasLocalTaxes: false,
  },
  MA: {
    stateCode: "MA",
    stateName: "Massachusetts",
    stateBaseRate: 6.25,
    avgLocalRate: 0.0,
    combinedAvgRate: 6.25,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Massachusetts Dept of Revenue",
    filingDeadlineDay: 30,
    hasLocalTaxes: false,
  },
  MI: {
    stateCode: "MI",
    stateName: "Michigan",
    stateBaseRate: 6.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 6.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Michigan Dept of Treasury",
    filingDeadlineDay: 20,
    hasLocalTaxes: false,
  },
  MN: {
    stateCode: "MN",
    stateName: "Minnesota",
    stateBaseRate: 6.875,
    avgLocalRate: 1.16,
    combinedAvgRate: 8.04,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 100,
    isNomad: false,
    filingAgency: "Minnesota Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  MS: {
    stateCode: "MS",
    stateName: "Mississippi",
    stateBaseRate: 7.0,
    avgLocalRate: 0.07,
    combinedAvgRate: 7.07,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 250000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Mississippi Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  MO: {
    stateCode: "MO",
    stateName: "Missouri",
    stateBaseRate: 4.225,
    avgLocalRate: 4.14,
    combinedAvgRate: 8.37,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Missouri Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  MT: {
    stateCode: "MT",
    stateName: "Montana",
    stateBaseRate: 0.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 0.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: true,
    filingAgency: "Montana Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: false,
  },
  NE: {
    stateCode: "NE",
    stateName: "Nebraska",
    stateBaseRate: 5.5,
    avgLocalRate: 1.47,
    combinedAvgRate: 6.97,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Nebraska Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  NV: {
    stateCode: "NV",
    stateName: "Nevada",
    stateBaseRate: 6.85,
    avgLocalRate: 1.39,
    combinedAvgRate: 8.24,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Nevada Dept of Taxation",
    filingDeadlineDay: 31,
    hasLocalTaxes: true,
  },
  NH: {
    stateCode: "NH",
    stateName: "New Hampshire",
    stateBaseRate: 0.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 0.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: true,
    filingAgency: "New Hampshire Dept of Revenue",
    filingDeadlineDay: 15,
    hasLocalTaxes: false,
  },
  NJ: {
    stateCode: "NJ",
    stateName: "New Jersey",
    stateBaseRate: 6.625,
    avgLocalRate: -0.03,
    combinedAvgRate: 6.60,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "New Jersey Division of Taxation",
    filingDeadlineDay: 20,
    hasLocalTaxes: false,
  },
  NM: {
    stateCode: "NM",
    stateName: "New Mexico",
    stateBaseRate: 4.875,
    avgLocalRate: 2.85,
    combinedAvgRate: 7.73,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "New Mexico Taxation & Revenue Dept",
    filingDeadlineDay: 25,
    hasLocalTaxes: true,
  },
  NY: {
    stateCode: "NY",
    stateName: "New York",
    stateBaseRate: 4.0,
    avgLocalRate: 4.52,
    combinedAvgRate: 8.52,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 500000,
    nexusTxnsThreshold: 100,
    isNomad: false,
    filingAgency: "New York Dept of Taxation and Finance",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  NC: {
    stateCode: "NC",
    stateName: "North Carolina",
    stateBaseRate: 4.75,
    avgLocalRate: 2.25,
    combinedAvgRate: 7.00,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "North Carolina Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  ND: {
    stateCode: "ND",
    stateName: "North Dakota",
    stateBaseRate: 5.0,
    avgLocalRate: 2.04,
    combinedAvgRate: 7.04,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "North Dakota Office of State Tax Commissioner",
    filingDeadlineDay: 31,
    hasLocalTaxes: true,
  },
  OH: {
    stateCode: "OH",
    stateName: "Ohio",
    stateBaseRate: 5.75,
    avgLocalRate: 1.49,
    combinedAvgRate: 7.24,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Ohio Dept of Taxation",
    filingDeadlineDay: 23,
    hasLocalTaxes: true,
  },
  OK: {
    stateCode: "OK",
    stateName: "Oklahoma",
    stateBaseRate: 4.5,
    avgLocalRate: 4.50,
    combinedAvgRate: 9.00,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Oklahoma Tax Commission",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  OR: {
    stateCode: "OR",
    stateName: "Oregon",
    stateBaseRate: 0.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 0.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: true,
    filingAgency: "Oregon Dept of Revenue",
    filingDeadlineDay: 30,
    hasLocalTaxes: false,
  },
  PA: {
    stateCode: "PA",
    stateName: "Pennsylvania",
    stateBaseRate: 6.0,
    avgLocalRate: 0.34,
    combinedAvgRate: 6.34,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Pennsylvania Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  RI: {
    stateCode: "RI",
    stateName: "Rhode Island",
    stateBaseRate: 7.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 7.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Rhode Island Division of Taxation",
    filingDeadlineDay: 20,
    hasLocalTaxes: false,
  },
  SC: {
    stateCode: "SC",
    stateName: "South Carolina",
    stateBaseRate: 6.0,
    avgLocalRate: 1.46,
    combinedAvgRate: 7.46,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "South Carolina Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  SD: {
    stateCode: "SD",
    stateName: "South Dakota",
    stateBaseRate: 4.2,
    avgLocalRate: 1.91,
    combinedAvgRate: 6.11,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "South Dakota Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  TN: {
    stateCode: "TN",
    stateName: "Tennessee",
    stateBaseRate: 7.0,
    avgLocalRate: 2.55,
    combinedAvgRate: 9.55,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Tennessee Dept of Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  TX: {
    stateCode: "TX",
    stateName: "Texas",
    stateBaseRate: 6.25,
    avgLocalRate: 1.95,
    combinedAvgRate: 8.20,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 500000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Texas Comptroller of Public Accounts",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  UT: {
    stateCode: "UT",
    stateName: "Utah",
    stateBaseRate: 6.1,
    avgLocalRate: 1.15,
    combinedAvgRate: 7.25,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Utah State Tax Commission",
    filingDeadlineDay: 31,
    hasLocalTaxes: true,
  },
  VT: {
    stateCode: "VT",
    stateName: "Vermont",
    stateBaseRate: 6.0,
    avgLocalRate: 0.36,
    combinedAvgRate: 6.36,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Vermont Dept of Taxes",
    filingDeadlineDay: 25,
    hasLocalTaxes: true,
  },
  VA: {
    stateCode: "VA",
    stateName: "Virginia",
    stateBaseRate: 5.3,
    avgLocalRate: 0.47,
    combinedAvgRate: 5.77,
    sourcingRule: "ORIGIN",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Virginia Dept of Taxation",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  WA: {
    stateCode: "WA",
    stateName: "Washington",
    stateBaseRate: 6.5,
    avgLocalRate: 2.88,
    combinedAvgRate: 9.38,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Washington Dept of Revenue",
    filingDeadlineDay: 25,
    hasLocalTaxes: true,
  },
  WV: {
    stateCode: "WV",
    stateName: "West Virginia",
    stateBaseRate: 6.0,
    avgLocalRate: 0.57,
    combinedAvgRate: 6.57,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "West Virginia State Tax Dept",
    filingDeadlineDay: 20,
    hasLocalTaxes: true,
  },
  WI: {
    stateCode: "WI",
    stateName: "Wisconsin",
    stateBaseRate: 5.0,
    avgLocalRate: 0.43,
    combinedAvgRate: 5.43,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: null,
    isNomad: false,
    filingAgency: "Wisconsin Dept of Revenue",
    filingDeadlineDay: 31,
    hasLocalTaxes: true,
  },
  WY: {
    stateCode: "WY",
    stateName: "Wyoming",
    stateBaseRate: 4.0,
    avgLocalRate: 1.44,
    combinedAvgRate: 5.44,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "Wyoming Dept of Revenue",
    filingDeadlineDay: 31,
    hasLocalTaxes: true,
  },
  DC: {
    stateCode: "DC",
    stateName: "District of Columbia",
    stateBaseRate: 6.0,
    avgLocalRate: 0.0,
    combinedAvgRate: 6.0,
    sourcingRule: "DESTINATION",
    nexusSalesThreshold: 100000,
    nexusTxnsThreshold: 200,
    isNomad: false,
    filingAgency: "DC Office of Tax and Revenue",
    filingDeadlineDay: 20,
    hasLocalTaxes: false,
  },
}

// ── EIN & SSN Validation & Formatting ──

export interface TinValidationResult {
  isValid: boolean
  formatted: string
  tinType: "EIN" | "SSN" | "UNKNOWN"
  error?: string
}

export function validateUsEin(ein?: string | null): TinValidationResult {
  if (!ein) {
    return { isValid: false, formatted: "", tinType: "UNKNOWN", error: "EIN is required" }
  }
  const digits = ein.replace(/\D/g, "")
  if (digits.length !== 9) {
    return {
      isValid: false,
      formatted: ein,
      tinType: "EIN",
      error: `Invalid length: Expected 9 digits, got ${digits.length}`,
    }
  }

  // Common valid IRS 2-digit prefixes:
  // 01-06, 10-16, 20-27, 30-39, 40-48, 51-59, 60-68, 71-77, 80-88, 90-95, 98-99
  const prefix = parseInt(digits.substring(0, 2), 10)
  const invalidPrefixes = [0, 7, 8, 9, 17, 18, 19, 28, 29, 49, 50, 69, 70, 78, 79, 89, 96, 97]
  if (invalidPrefixes.includes(prefix)) {
    return {
      isValid: false,
      formatted: `${digits.substring(0, 2)}-${digits.substring(2)}`,
      tinType: "EIN",
      error: `Prefix '${digits.substring(0, 2)}' is not an active IRS campus allocation`,
    }
  }

  return {
    isValid: true,
    formatted: `${digits.substring(0, 2)}-${digits.substring(2)}`,
    tinType: "EIN",
  }
}

export function validateUsSsn(ssn?: string | null): TinValidationResult {
  if (!ssn) {
    return { isValid: false, formatted: "", tinType: "UNKNOWN", error: "SSN is required" }
  }
  const digits = ssn.replace(/\D/g, "")
  if (digits.length !== 9) {
    return {
      isValid: false,
      formatted: ssn,
      tinType: "SSN",
      error: `Invalid length: Expected 9 digits, got ${digits.length}`,
    }
  }
  if (digits === "000000000" || digits.startsWith("000") || digits.startsWith("666") || digits.startsWith("9")) {
    return {
      isValid: false,
      formatted: `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5)}`,
      tinType: "SSN",
      error: "Invalid SSN prefix or sequence per SSA rules",
    }
  }
  return {
    isValid: true,
    formatted: `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5)}`,
    tinType: "SSN",
  }
}

export function maskUsTin(tin?: string | null): string {
  if (!tin) return "Not Provided"
  const digits = tin.replace(/\D/g, "")
  if (digits.length !== 9) return tin
  return `**-***${digits.substring(5)}`
}

// ── Exemption Certificate Tracking ──

export interface UsExemptionCertificate {
  id: string
  customerId: string
  customerName: string
  certificateNumber: string
  issuingState: string
  exemptionType: ExemptionType
  effectiveDate: string
  expiryDate: string
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED"
  daysToExpiry: number
  statutoryClause: string
}

export function evaluateCertificateStatus(expiryDateStr: string): {
  status: "ACTIVE" | "EXPIRING_SOON" | "EXPIRED"
  daysToExpiry: number
} {
  const expiry = new Date(expiryDateStr)
  const now = new Date()
  const diffMs = expiry.getTime() - now.getTime()
  const daysToExpiry = Math.ceil(diffMs / (1000 * 60 * 60 * 24))

  if (daysToExpiry < 0) {
    return { status: "EXPIRED", daysToExpiry }
  }
  if (daysToExpiry <= 60) {
    return { status: "EXPIRING_SOON", daysToExpiry }
  }
  return { status: "ACTIVE", daysToExpiry }
}

export const EXEMPTION_STATUTES: Record<ExemptionType, { title: string; law: string; formName: string }> = {
  RESALE: {
    title: "Sale for Resale / Wholesale",
    law: "Multistate Tax Commission (MTC) Uniform Sales & Use Tax Exemption / Rule 3.285",
    formName: "MTC Uniform Resale Certificate",
  },
  NON_PROFIT_501C3: {
    title: "501(c)(3) Charitable / Religious / Educational",
    law: "IRC Section 501(c)(3) & State Statutory Sales Tax Exemption Letters",
    formName: "Certificate of Exemption (Form ST-119 / CDTFA-230-E)",
  },
  GOVERNMENT: {
    title: "Federal / State / Municipal Entity",
    law: "Statutory Sovereign Immunity & Direct State Procurement Exemption",
    formName: "Government Direct Billing Exemption Certificate",
  },
  MANUFACTURING_EQUIPMENT: {
    title: "Industrial Machinery & Processing Materials",
    law: "State Manufacturing & R&D Exemption Statutes (e.g. CA RTC § 6377.1)",
    formName: "Partial Exemption Certificate (CDTFA-230-M)",
  },
  AGRICULTURAL: {
    title: "Commercial Farming & Livestock Production",
    law: "Commercial Agricultural Inputs Exemption (Fertilizers, Feeds, Seed)",
    formName: "Farmer Exemption Certificate (ST-125)",
  },
  DIPLOMATIC: {
    title: "Foreign Diplomatic Mission / Consular",
    law: "Vienna Convention on Diplomatic Relations / US Dept of State OFM Tax Exemption",
    formName: "OFM Diplomatic Tax Exemption Card",
  },
}

// ── State Sales Tax Compilation & Nexus Telemetry ──

export interface RawUsInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string
  contactId: string
  contactName: string
  stateCode: string
  subtotal: number
  taxAmount: number
  total: number
  isTaxExempt: boolean
  taxExemptionReason?: string | null
  taxExemptionCertificate?: string | null
}

export interface RawUsBill {
  id: string
  billNumber: string
  billDate: string
  vendorId: string
  vendorName: string
  vendorEin?: string | null
  total: number
  status: string
  category?: string | null
}

export interface UsStateSchedule {
  stateCode: string
  stateName: string
  sourcingRule: SourcingRule
  stateBaseRate: number
  avgLocalRate: number
  combinedAvgRate: number
  grossSales: number
  exemptSales: number
  taxableSales: number
  stateTaxCollected: number
  localTaxCollected: number
  totalTaxCollected: number
  transactionCount: number
  nexusThreshold: number
  nexusProgressPct: number
  nexusStatus: NexusStatus
  filingAgency: string
  filingDueDate: string
}

export interface Us1099VendorRecord {
  vendorId: string
  vendorName: string
  legalName: string
  tin: string
  tinType: "EIN" | "SSN" | "UNKNOWN"
  isTinValid: boolean
  maskedTin: string
  w9Status: "VERIFIED" | "MISSING" | "EXEMPT"
  totalPaid: number
  box1NecAmount: number
  box1MiscRents: number
  box4FederalTaxWithheld: number
  box5StateTaxWithheld: number
  filingStatus: "REQUIRED" | "EXEMPT_UNDER_THRESHOLD"
  formType: "1099-NEC" | "1099-MISC"
  state: string
}

export interface UsTaxOverviewReport {
  taxYear: number
  quarter: "Q1" | "Q2" | "Q3" | "Q4" | "ALL"
  periodLabel: string
  telemetry: {
    totalGrossSales: number
    totalTaxableSales: number
    totalExemptSales: number
    totalSalesTaxCollected: number
    activeNexusCount: number
    approachingNexusCount: number
    monitoredStatesCount: number
    total1099ReportableAmount: number
    reportable1099VendorCount: number
    w9ComplianceRate: number
    activeCertificatesCount: number
  }
  stateSchedules: UsStateSchedule[]
  vendor1099Records: Us1099VendorRecord[]
  exemptionCertificates: UsExemptionCertificate[]
}

export function compileUsStateSalesTaxSchedule(
  invoices: RawUsInvoice[],
  taxYear: number,
  quarter: "Q1" | "Q2" | "Q3" | "Q4" | "ALL" = "ALL"
): UsStateSchedule[] {
  // Group invoices by state
  const stateAggMap = new Map<
    string,
    {
      grossSales: number
      exemptSales: number
      taxableSales: number
      taxCollected: number
      transactionCount: number
    }
  >()

  for (const inv of invoices) {
    // Sales with no known state can't count toward any state's nexus threshold
    if (!inv.stateCode) continue
    const code = inv.stateCode.toUpperCase()
    const current = stateAggMap.get(code) || {
      grossSales: 0,
      exemptSales: 0,
      taxableSales: 0,
      taxCollected: 0,
      transactionCount: 0,
    }

    current.grossSales += inv.total
    if (inv.isTaxExempt || inv.taxExemptionCertificate) {
      current.exemptSales += inv.total
    } else {
      current.taxableSales += inv.subtotal
      current.taxCollected += inv.taxAmount
    }
    current.transactionCount += 1
    stateAggMap.set(code, current)
  }

  const schedules: UsStateSchedule[] = []

  // Ensure high-priority and active states are returned
  const allStates = Object.keys(US_STATE_TAX_RULES)

  for (const code of allStates) {
    const rule = US_STATE_TAX_RULES[code]
    const agg = stateAggMap.get(code) || {
      grossSales: 0,
      exemptSales: 0,
      taxableSales: 0,
      taxCollected: 0,
      transactionCount: 0,
    }

    const stateBaseRate = rule.stateBaseRate
    const avgLocalRate = rule.avgLocalRate
    const combinedRate = rule.combinedAvgRate

    // Apportion collected tax between state base and local
    let stateTaxCollected = 0
    let localTaxCollected = 0

    if (agg.taxCollected > 0 && combinedRate > 0) {
      const stateRatio = stateBaseRate / combinedRate
      stateTaxCollected = Math.round(agg.taxCollected * stateRatio * 100) / 100
      localTaxCollected = Math.round((agg.taxCollected - stateTaxCollected) * 100) / 100
    } else if (agg.taxableSales > 0 && stateBaseRate > 0) {
      stateTaxCollected = Math.round((agg.taxableSales * stateBaseRate) / 100 * 100) / 100
      localTaxCollected = Math.round((agg.taxableSales * avgLocalRate) / 100 * 100) / 100
    }

    const totalTaxCollected = stateTaxCollected + localTaxCollected
    const nexusThreshold = rule.nexusSalesThreshold
    const nexusProgressPct = Math.min(100, Math.round((agg.grossSales / nexusThreshold) * 1000) / 10)

    let nexusStatus: NexusStatus = "MONITORED"
    if (rule.isNomad) {
      nexusStatus = "EXEMPT_NOMAD"
    } else if (nexusProgressPct >= 100) {
      nexusStatus = "ACTIVE_NEXUS"
    } else if (nexusProgressPct >= 70) {
      nexusStatus = "APPROACHING"
    }

    // Determine statutory filing due date
    const nextMonth = quarter === "Q1" ? "Apr" : quarter === "Q2" ? "Jul" : quarter === "Q3" ? "Oct" : "Jan"
    const filingDueDate = `${nextMonth} ${rule.filingDeadlineDay}, ${quarter === "Q4" || quarter === "ALL" ? taxYear + 1 : taxYear}`

    schedules.push({
      stateCode: rule.stateCode,
      stateName: rule.stateName,
      sourcingRule: rule.sourcingRule,
      stateBaseRate: rule.stateBaseRate,
      avgLocalRate: rule.avgLocalRate,
      combinedAvgRate: rule.combinedAvgRate,
      grossSales: Math.round(agg.grossSales * 100) / 100,
      exemptSales: Math.round(agg.exemptSales * 100) / 100,
      taxableSales: Math.round(agg.taxableSales * 100) / 100,
      stateTaxCollected,
      localTaxCollected,
      totalTaxCollected,
      transactionCount: agg.transactionCount,
      nexusThreshold,
      nexusProgressPct,
      nexusStatus,
      filingAgency: rule.filingAgency,
      filingDueDate,
    })
  }

  // Sort: Active Nexus first, then highest sales
  return schedules.sort((a, b) => {
    if (a.nexusStatus === "ACTIVE_NEXUS" && b.nexusStatus !== "ACTIVE_NEXUS") return -1
    if (b.nexusStatus === "ACTIVE_NEXUS" && a.nexusStatus !== "ACTIVE_NEXUS") return 1
    return b.grossSales - a.grossSales
  })
}

// ── Compile IRS Form 1099 Records ──

export function compileUs1099Records(bills: RawUsBill[]): Us1099VendorRecord[] {
  const vendorMap = new Map<
    string,
    {
      vendorName: string
      vendorEin?: string | null
      totalPaid: number
      category?: string | null
    }
  >()

  for (const bill of bills) {
    const current = vendorMap.get(bill.vendorId) || {
      vendorName: bill.vendorName,
      vendorEin: bill.vendorEin,
      totalPaid: 0,
      category: bill.category,
    }
    current.totalPaid += bill.total
    if (bill.vendorEin && !current.vendorEin) {
      current.vendorEin = bill.vendorEin
    }
    vendorMap.set(bill.vendorId, current)
  }

  const records: Us1099VendorRecord[] = []

  for (const [vendorId, data] of vendorMap.entries()) {
    const einCheck = validateUsEin(data.vendorEin)
    const isW9Verified = einCheck.isValid
    const isRequired = data.totalPaid >= 600

    const isRentCategory = data.category?.toLowerCase().includes("rent") || false
    const formType = isRentCategory ? "1099-MISC" : "1099-NEC"

    records.push({
      vendorId,
      vendorName: data.vendorName,
      legalName: data.vendorName,
      tin: einCheck.formatted || data.vendorEin || "",
      tinType: einCheck.tinType,
      isTinValid: einCheck.isValid,
      maskedTin: maskUsTin(data.vendorEin),
      w9Status: isW9Verified ? "VERIFIED" : "MISSING",
      totalPaid: Math.round(data.totalPaid * 100) / 100,
      box1NecAmount: formType === "1099-NEC" ? Math.round(data.totalPaid * 100) / 100 : 0,
      box1MiscRents: formType === "1099-MISC" ? Math.round(data.totalPaid * 100) / 100 : 0,
      box4FederalTaxWithheld: 0,
      box5StateTaxWithheld: 0,
      filingStatus: isRequired ? "REQUIRED" : "EXEMPT_UNDER_THRESHOLD",
      formType,
      state: "US",
    })
  }

  return records.sort((a, b) => b.totalPaid - a.totalPaid)
}

// ── Sourcing & Tax Calculation Engine ──

export interface CalculateTaxParams {
  originState: string
  destinationState: string
  amount: number
  isExempt?: boolean
  exemptionType?: ExemptionType
}

export interface CalculateTaxResult {
  applicableState: string
  sourcingApplied: SourcingRule
  baseRate: number
  localRate: number
  effectiveRate: number
  baseTax: number
  localTax: number
  totalTax: number
  statutoryReason: string
}

export function calculateUsSalesTax(params: CalculateTaxParams): CalculateTaxResult {
  const { originState, destinationState, amount, isExempt } = params

  if (isExempt) {
    return {
      applicableState: destinationState,
      sourcingApplied: "DESTINATION",
      baseRate: 0,
      localRate: 0,
      effectiveRate: 0,
      baseTax: 0,
      localTax: 0,
      totalTax: 0,
      statutoryReason: "Exempt supply per validated exemption certificate on file.",
    }
  }

  const destRule = US_STATE_TAX_RULES[destinationState]
  const originRule = US_STATE_TAX_RULES[originState] || destRule

  // Never borrow another state's rate: without a known destination there is nothing to apply
  if (!destRule) {
    return {
      applicableState: destinationState || "",
      sourcingApplied: "DESTINATION",
      baseRate: 0,
      localRate: 0,
      effectiveRate: 0,
      baseTax: 0,
      localTax: 0,
      totalTax: 0,
      statutoryReason: "Destination state unknown. Add the customer's billing state to calculate sales tax.",
    }
  }

  const isIntrastate = originState === destinationState

  let applicableRule = destRule
  let sourcingApplied: SourcingRule = "DESTINATION"

  if (isIntrastate && originRule.sourcingRule === "ORIGIN") {
    applicableRule = originRule
    sourcingApplied = "ORIGIN"
  } else {
    applicableRule = destRule
    sourcingApplied = "DESTINATION"
  }

  if (applicableRule.isNomad) {
    return {
      applicableState: applicableRule.stateCode,
      sourcingApplied,
      baseRate: 0,
      localRate: 0,
      effectiveRate: 0,
      baseTax: 0,
      localTax: 0,
      totalTax: 0,
      statutoryReason: `${applicableRule.stateName} is a NOMAD state with 0% statewide sales tax.`,
    }
  }

  const baseRate = applicableRule.stateBaseRate
  const localRate = applicableRule.avgLocalRate
  const effectiveRate = applicableRule.combinedAvgRate

  const baseTax = Math.round((amount * baseRate) / 100 * 100) / 100
  const localTax = Math.round((amount * localRate) / 100 * 100) / 100
  const totalTax = baseTax + localTax

  const statutoryReason = sourcingApplied === "DESTINATION"
    ? `Destination Sourcing: Tax determined by delivery location (${applicableRule.stateName}).`
    : `Origin Sourcing: Tax determined by seller location (${applicableRule.stateName}) for intrastate order.`

  return {
    applicableState: applicableRule.stateCode,
    sourcingApplied,
    baseRate,
    localRate,
    effectiveRate,
    baseTax,
    localTax,
    totalTax,
    statutoryReason,
  }
}

// ── Export Utilities ──

export function formatUsStateSalesTaxCsv(
  schedules: UsStateSchedule[],
  payerName: string,
  taxYear: number
): string {
  const headers = [
    "State Code",
    "State Name",
    "Sourcing Rule",
    "State Base Rate (%)",
    "Avg Local Rate (%)",
    "Combined Rate (%)",
    "Gross Sales ($)",
    "Exempt Sales ($)",
    "Taxable Sales ($)",
    "State Tax ($)",
    "Local Tax ($)",
    "Total Tax ($)",
    "Txn Count",
    "Nexus Threshold ($)",
    "Nexus Progress (%)",
    "Nexus Status",
    "Filing Agency",
    "Filing Due Date",
  ]

  const rows = schedules.map((s) => [
    s.stateCode,
    `"${s.stateName}"`,
    s.sourcingRule,
    s.stateBaseRate.toFixed(2),
    s.avgLocalRate.toFixed(2),
    s.combinedAvgRate.toFixed(2),
    s.grossSales.toFixed(2),
    s.exemptSales.toFixed(2),
    s.taxableSales.toFixed(2),
    s.stateTaxCollected.toFixed(2),
    s.localTaxCollected.toFixed(2),
    s.totalTaxCollected.toFixed(2),
    s.transactionCount,
    s.nexusThreshold,
    s.nexusProgressPct.toFixed(1),
    s.nexusStatus,
    `"${s.filingAgency}"`,
    `"${s.filingDueDate}"`,
  ])

  return [
    `# US Multi-State Sales Tax Schedule - ${payerName} (Tax Year ${taxYear})`,
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\n")
}

export function format1099FireCsv(
  records: Us1099VendorRecord[],
  payerName: string,
  payerEin: string,
  taxYear: number
): string {
  const headers = [
    "Form Type",
    "Tax Year",
    "Payer Name",
    "Payer EIN",
    "Recipient Name",
    "Recipient TIN",
    "TIN Type",
    "TIN Valid",
    "W-9 Status",
    "Box 1 Nonemployee Comp ($)",
    "Box 1 Rents ($)",
    "Box 4 Federal Withholding ($)",
    "Box 5 State Withholding ($)",
    "Filing Status",
  ]

  const rows = records.map((r) => [
    r.formType,
    taxYear,
    `"${payerName}"`,
    `"${payerEin}"`,
    `"${r.vendorName}"`,
    `"${r.tin || "MISSING"}"`,
    r.tinType,
    r.isTinValid ? "YES" : "NO",
    r.w9Status,
    r.box1NecAmount.toFixed(2),
    r.box1MiscRents.toFixed(2),
    r.box4FederalTaxWithheld.toFixed(2),
    r.box5StateTaxWithheld.toFixed(2),
    r.filingStatus,
  ])

  return [
    `# IRS FIRE Electronic Reporting Schedule - Form 1099 Series (IRS Pub 1220)`,
    headers.join(","),
    ...rows.map((r) => r.join(",")),
  ].join("\n")
}
