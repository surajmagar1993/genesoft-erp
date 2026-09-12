/**
 * eway-bill-engine.ts
 * Pure TypeScript Indian Statutory E-Way Bill Engine — Rule 138 of CGST Rules, 2017.
 * Covers Part-A, Part-B, Vehicle Number validation, Transporter ID,
 * Distance-to-validity calculation, 12-digit EWB generation, and NIC Bulk Upload JSON schema.
 */

// ── Statutory Constants & Enums ──────────────────────────────────────────────

export const EWAY_BILL_CONSIGNMENT_THRESHOLD = 50000 // Standard statutory threshold (₹50,000)

/**
 * Sub-supply types / reasons for transportation under Rule 138
 */
export const EWAY_SUPPLY_TYPES = {
  O: "Outward",
  I: "Inward",
} as const
export type EwaySupplyType = keyof typeof EWAY_SUPPLY_TYPES

export const EWAY_SUB_SUPPLY_TYPES: Record<string, { code: string; label: string; description: string }> = {
  "1": { code: "1", label: "Supply", description: "Standard business supply of goods against tax invoice" },
  "2": { code: "2", label: "Import", description: "Goods imported into India" },
  "3": { code: "3", label: "Export", description: "Goods exported outside India with/without payment of tax" },
  "4": { code: "4", label: "Job Work", description: "Movement of goods for job work / manufacturing processing" },
  "5": { code: "5", label: "For Own Use", description: "Inter-branch or inter-depot stock transfer for internal use" },
  "6": { code: "6", label: "Job Work Returns", description: "Goods returned after completion of job work" },
  "7": { code: "7", label: "Sales Return", description: "Goods returned by recipient/customer against credit note" },
  "8": { code: "8", label: "Exhibition or Fairs", description: "Goods sent for display or exhibition" },
  "9": { code: "9", label: "Line Sales", description: "Goods carried for direct sale in transit" },
  "10": { code: "10", label: "Recipient Not Known", description: "Delivery where final recipient is determined in transit" },
  "11": { code: "11", label: "SKD / CKD", description: "Semi knocked down or completely knocked down cargo" },
  "12": { code: "12", label: "Others", description: "Any other statutory movement of goods" },
}
export type EwaySubSupplyCode = keyof typeof EWAY_SUB_SUPPLY_TYPES

export const EWAY_DOCUMENT_TYPES = {
  INV: "Tax Invoice",
  BIL: "Bill of Supply",
  BOE: "Bill of Entry",
  CHL: "Delivery Challan",
  CNT: "Credit Note",
  OTH: "Others",
} as const
export type EwayDocType = keyof typeof EWAY_DOCUMENT_TYPES

export const EWAY_TRANSPORT_MODES = {
  "1": { code: "1", label: "Road", description: "Motor vehicle, truck, tempo, container carrier" },
  "2": { code: "2", label: "Rail", description: "Indian Railways cargo / parcel van" },
  "3": { code: "3", label: "Air", description: "Air freight / domestic cargo" },
  "4": { code: "4", label: "Ship", description: "Coastal or inland vessel" },
} as const
export type EwayTransportModeCode = keyof typeof EWAY_TRANSPORT_MODES

export const EWAY_VEHICLE_TYPES = {
  R: { code: "R", label: "Regular", description: "Normal cargo vehicle (1 day per 200 km)" },
  O: { code: "O", label: "Over Dimensional Cargo (ODC)", description: "Heavy multimodal ODC (1 day per 20 km)" },
} as const
export type EwayVehicleTypeCode = keyof typeof EWAY_VEHICLE_TYPES

// ── Validation Helpers ────────────────────────────────────────────────────────

export interface ValidationResult {
  isValid: boolean
  error?: string
}

/**
 * Validates Indian Vehicle Registration Number.
 * Examples: MH12AB1234, DL1AA1234, KA01F1234, GJ01AA1234, HR26DQ5551.
 * Standard format:
 *   - 2 letters: State Code (e.g. MH, DL, KA)
 *   - 1-2 digits: RTO district code
 *   - 0-3 letters: Series alphabet
 *   - 4 digits: Unique vehicle registration number
 * Also accepts Bharat Series (BH): e.g. 22BH1234AA
 */
export function validateVehicleNumber(vehicleNo: string | null | undefined): ValidationResult {
  const clean = (vehicleNo || "").replace(/[\s-]/g, "").toUpperCase()
  if (!clean) {
    return { isValid: false, error: "Vehicle number is required for Road transport mode." }
  }

  // Standard Indian Vehicle registration pattern: [State 2 letters][RTO 1-2 digits][Series 0-3 letters][Number 1-4 digits]
  const standardPattern = /^[A-Z]{2}[0-9]{1,2}[A-Z]{0,3}[0-9]{1,4}$/
  // Bharat (BH) series: e.g. 22BH1234AA
  const bhSeriesPattern = /^[0-9]{2}BH[0-9]{4}[A-Z]{1,2}$/

  if (standardPattern.test(clean) || bhSeriesPattern.test(clean)) {
    return { isValid: true }
  }

  return {
    isValid: false,
    error: "Invalid vehicle registration number. Standard format: State(2) + RTO(2) + Series(1-3) + Digits(4), e.g. MH12AB1234.",
  }
}

/**
 * Validates 15-character Transporter ID (GSTIN or TRANSIN).
 * Transporter ID format matches 15-character GSTIN structure or TRANSIN issued by tax authority.
 */
export function validateTransporterId(transId: string | null | undefined): ValidationResult {
  const clean = (transId || "").trim().toUpperCase()
  if (!clean) {
    return { isValid: true } // Optional if transporter is not assigned or self-transported
  }

  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[A-Z0-9]{1}[0-9A-Z]{1}$/
  if (!pattern.test(clean)) {
    return {
      isValid: false,
      error: "Transporter ID must be a 15-character valid GSTIN or TRANSIN starting with a 2-digit state code.",
    }
  }

  return { isValid: true }
}

/**
 * Validates 6-digit Indian postal PIN code.
 */
export function validatePinCode(pin: string | number | null | undefined): ValidationResult {
  const clean = String(pin || "").trim()
  if (!clean) {
    return { isValid: false, error: "PIN code is mandatory for distance & tax jurisdiction." }
  }

  const pattern = /^[1-9][0-9]{5}$/
  if (!pattern.test(clean)) {
    return { isValid: false, error: "PIN code must be a 6-digit valid number not starting with 0." }
  }

  return { isValid: true }
}

// ── Journey Validity Duration Calculation ──────────────────────────────────────

export interface EwayValidityResult {
  validityDays: number
  validFrom: Date
  validUntil: Date
  approxDistanceKm: number
  vehicleType: EwayVehicleTypeCode
  isExpired: boolean
  hoursRemaining: number
}

/**
 * Computes E-Way Bill validity based on distance and vehicle type as per CBIC Notification No. 94/2020.
 * - Regular Cargo: 1 day for every 200 km or part thereof (minimum 1 day).
 * - Over Dimensional Cargo (ODC): 1 day for every 20 km or part thereof (minimum 1 day).
 * Validity starts from the moment Part-B (or Part-A if self-transport) is entered.
 */
export function calculateEwayBillValidity(
  approxDistanceKm: number,
  vehicleType: EwayVehicleTypeCode = "R",
  generatedAt: Date = new Date()
): EwayValidityResult {
  const distance = Math.max(1, Math.round(approxDistanceKm))
  const kmPerDay = vehicleType === "O" ? 20 : 200
  const validityDays = Math.max(1, Math.ceil(distance / kmPerDay))

  const validFrom = new Date(generatedAt)
  const validUntil = new Date(validFrom)
  
  // Per Rule 138(10), validity expires at midnight (23:59:59) of the last day
  validUntil.setDate(validUntil.getDate() + validityDays)
  validUntil.setHours(23, 59, 59, 999)

  const now = new Date()
  const isExpired = now.getTime() > validUntil.getTime()
  const diffMs = validUntil.getTime() - now.getTime()
  const hoursRemaining = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10)

  return {
    validityDays,
    validFrom,
    validUntil,
    approxDistanceKm: distance,
    vehicleType,
    isExpired,
    hoursRemaining,
  }
}

// ── E-Way Bill Number Generator ───────────────────────────────────────────────

/**
 * Generates an authentic 12-digit Indian E-Way Bill number.
 * Format: 2-digit state code + 2-digit FY indicator + 8-digit unique serial number.
 * e.g. 121000458921
 */
export function generateEwayBillNumber(stateCode: string = "27"): string {
  const cleanState = (stateCode.replace(/\D/g, "") || "27").padStart(2, "0").slice(0, 2)
  const now = new Date()
  const yy = String(now.getFullYear()).slice(-2)
  // Random 8-digit serial
  const randSerial = Math.floor(10000000 + Math.random() * 90000000)
  return `${cleanState}${yy}${randSerial}`
}

// ── QR Code Payload Formatter ──────────────────────────────────────────────────

export interface EwayQrData {
  ewayBillNo: string
  docNo: string
  docDate: string
  genGstin: string
  fromGstin: string
  toGstin: string
  totalValue: number
  mainHsn: string
}

/**
 * Creates the standard digital string encoded in E-Way Bill QR codes per NIC standards.
 */
export function formatEwayBillQrPayload(data: EwayQrData): string {
  return [
    `EWB:${data.ewayBillNo}`,
    `DOC:${data.docNo}`,
    `DATE:${data.docDate}`,
    `GEN:${data.genGstin}`,
    `FROM:${data.fromGstin}`,
    `TO:${data.toGstin}`,
    `VAL:${data.totalValue}`,
    `HSN:${data.mainHsn}`,
  ].join("|")
}

// ── NIC Bulk Upload JSON Schema Builder ───────────────────────────────────────

export interface EwayItemPayload {
  productName: string
  productDesc?: string
  hsnCode: string
  quantity: number
  qtyUnit: string
  cgstRate: number
  sgstRate: number
  igstRate: number
  cessRate?: number
  taxableAmount: number
}

export interface EwayBillInput {
  ewayBillNo?: string
  supplyType: EwaySupplyType
  subSupplyType: EwaySubSupplyCode
  docType: EwayDocType
  docNo: string
  docDate: string // YYYY-MM-DD
  fromGstin: string
  fromTrdName: string
  fromAddr1: string
  fromAddr2?: string
  fromPlace: string
  fromPincode: number
  fromStateCode: number
  actualFromStateCode?: number
  toGstin: string
  toTrdName: string
  toAddr1: string
  toAddr2?: string
  toPlace: string
  toPincode: number
  toStateCode: number
  actualToStateCode?: number
  totalValue: number
  cgstValue: number
  sgstValue: number
  igstValue: number
  cessValue?: number
  transMode: EwayTransportModeCode
  transDistance: number
  transporterId?: string
  transporterName?: string
  transDocNo?: string
  transDocDate?: string
  vehicleNo?: string
  vehicleType?: EwayVehicleTypeCode
  itemList: EwayItemPayload[]
}

/**
 * Formats one or more E-Way bills into the official NIC Bulk Upload JSON payload structure
 * accepted by the government E-Way Bill portal (ewaybillgst.gov.in).
 */
export function buildNicBulkUploadJson(bills: EwayBillInput[]): { version: string; billLists: any[] } {
  return {
    version: "1.0.0123",
    billLists: bills.map((b) => ({
      userGstin: b.fromGstin,
      supplyType: b.supplyType,
      subSupplyType: b.subSupplyType,
      docType: b.docType,
      docNo: b.docNo,
      docDate: b.docDate.split("-").reverse().join("/"), // DD/MM/YYYY per NIC format
      fromGstin: b.fromGstin,
      fromTrdName: b.fromTrdName,
      fromAddr1: b.fromAddr1,
      fromAddr2: b.fromAddr2 || "",
      fromPlace: b.fromPlace,
      fromPincode: Number(b.fromPincode),
      actFromStateCode: Number(b.actualFromStateCode || b.fromStateCode),
      fromStateCode: Number(b.fromStateCode),
      toGstin: b.toGstin,
      toTrdName: b.toTrdName,
      toAddr1: b.toAddr1,
      toAddr2: b.toAddr2 || "",
      toPlace: b.toPlace,
      toPincode: Number(b.toPincode),
      actToStateCode: Number(b.actualToStateCode || b.toStateCode),
      toStateCode: Number(b.toStateCode),
      transactionType: 1, // Regular
      totalValue: Number(b.totalValue.toFixed(2)),
      cgstValue: Number(b.cgstValue.toFixed(2)),
      sgstValue: Number(b.sgstValue.toFixed(2)),
      igstValue: Number(b.igstValue.toFixed(2)),
      cessValue: Number((b.cessValue || 0).toFixed(2)),
      totInvValue: Number((b.totalValue + b.cgstValue + b.sgstValue + b.igstValue + (b.cessValue || 0)).toFixed(2)),
      transMode: b.transMode,
      transDistance: String(Math.round(b.transDistance)),
      transporterId: b.transporterId || "",
      transporterName: b.transporterName || "",
      transDocNo: b.transDocNo || "",
      transDocDate: b.transDocDate ? b.transDocDate.split("-").reverse().join("/") : "",
      vehicleNo: b.vehicleNo ? b.vehicleNo.replace(/[\s-]/g, "").toUpperCase() : "",
      vehicleType: b.vehicleType || "R",
      itemList: b.itemList.map((it, idx) => ({
        itemNo: idx + 1,
        productName: it.productName,
        productDesc: it.productDesc || it.productName,
        hsnCode: Number(it.hsnCode.replace(/\D/g, "")) || 9999,
        quantity: Number(it.quantity),
        qtyUnit: it.qtyUnit || "NOS",
        cgstRate: Number(it.cgstRate),
        sgstRate: Number(it.sgstRate),
        igstRate: Number(it.igstRate),
        cessRate: Number(it.cessRate || 0),
        taxableAmount: Number(it.taxableAmount.toFixed(2)),
      })),
    })),
  }
}
