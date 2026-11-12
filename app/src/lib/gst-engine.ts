/**
 * gst-engine.ts
 * Pure TypeScript GST calculation logic — no external dependencies.
 * Covers Indian GST: CGST + SGST (intra-state) and IGST (inter-state).
 */

// ── Indian States & UTs ──────────────────────────────────────────────────────
export const INDIAN_STATES = [
  "Andaman and Nicobar Islands",
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chandigarh",
  "Chhattisgarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jammu and Kashmir",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Ladakh",
  "Lakshadweep",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Puducherry",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
] as const

export type IndianState = (typeof INDIAN_STATES)[number] | ""

// ── Standard GST Rates ───────────────────────────────────────────────────────
export const GST_RATES = [0, 5, 12, 18, 28] as const
export type GstRate = (typeof GST_RATES)[number]

// ── Supply Type ──────────────────────────────────────────────────────────────
/**
 * intra / inter: Indian GST (CGST+SGST within a state, IGST between states).
 * single: every other country's one-line VAT / GST / sales tax.
 */
export type SupplyType = "intra" | "inter" | "single"

/**
 * Determine supply type from supplier state and place of supply.
 * If either is empty, defaults to "intra" (conservative).
 */
export function getSupplyType(
  supplierState: string,
  placeOfSupply: string
): SupplyType {
  if (!supplierState || !placeOfSupply) return "intra"
  return supplierState.trim().toLowerCase() === placeOfSupply.trim().toLowerCase()
    ? "intra"
    : "inter"
}

/** Supply type for a business: "single" outside India, otherwise by state. */
export function getSupplyTypeForRegime(
  mode: "IN_GST" | "SINGLE",
  supplierState: string,
  placeOfSupply: string
): SupplyType {
  return mode === "SINGLE" ? "single" : getSupplyType(supplierState, placeOfSupply)
}

// ── GST Split ────────────────────────────────────────────────────────────────
export interface GstSplit {
  cgstPercent: number // intra only
  sgstPercent: number // intra only
  igstPercent: number // inter only
  vatPercent: number // single only
}

/**
 * Compute CGST/SGST/IGST percentages from a given GST rate and supply type.
 * Intra: half goes to CGST, half to SGST.
 * Inter: full rate goes to IGST.
 */
export function computeGstSplit(
  gstRate: number,
  supplyType: SupplyType
): GstSplit {
  if (supplyType === "single") {
    return { cgstPercent: 0, sgstPercent: 0, igstPercent: 0, vatPercent: gstRate }
  }
  if (supplyType === "intra") {
    const half = gstRate / 2
    return { cgstPercent: half, sgstPercent: half, igstPercent: 0, vatPercent: 0 }
  }
  return { cgstPercent: 0, sgstPercent: 0, igstPercent: gstRate, vatPercent: 0 }
}

// ── Line Item Tax Amounts ────────────────────────────────────────────────────
export interface LineItemGst extends GstSplit {
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  vatAmount: number
  totalTaxAmount: number
  lineTotal: number // taxable + total tax
}

/**
 * The share of every line that a document-level discount takes off (0 to 1).
 * A discount is never negative and never more than the lines add up to.
 */
export function invoiceDiscountFraction(
  lineItems: { qty: number; unitPrice: number }[],
  discount: number,
  discountType: "PERCENT" | "FIXED"
): number {
  const subtotal = lineItems.reduce((sum, l) => sum + l.qty * l.unitPrice, 0)
  if (!(subtotal > 0) || !Number.isFinite(discount) || discount <= 0) return 0
  if (discountType === "PERCENT") return Math.min(discount, 100) / 100
  return Math.min(discount, subtotal) / subtotal
}

/**
 * Compute all GST amounts for a single line item. Tax is charged on the value
 * after the document's discount (`discountFraction`, from
 * invoiceDiscountFraction); `taxableAmount` stays the line's value before it,
 * so the document reads: lines, less discount, plus tax.
 */
export function computeLineItemGst(
  qty: number,
  unitPrice: number,
  gstRate: number,
  supplyType: SupplyType,
  discountFraction: number = 0
): LineItemGst {
  const taxableAmount = qty * unitPrice
  const taxBase = taxableAmount * (1 - Math.min(Math.max(discountFraction, 0), 1))
  const split = computeGstSplit(gstRate, supplyType)

  const cgstAmount = parseFloat(
    ((taxBase * split.cgstPercent) / 100).toFixed(2)
  )
  const sgstAmount = parseFloat(
    ((taxBase * split.sgstPercent) / 100).toFixed(2)
  )
  const igstAmount = parseFloat(
    ((taxBase * split.igstPercent) / 100).toFixed(2)
  )
  const vatAmount = parseFloat(
    ((taxBase * split.vatPercent) / 100).toFixed(2)
  )
  const totalTaxAmount = cgstAmount + sgstAmount + igstAmount + vatAmount

  return {
    ...split,
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    cgstAmount,
    sgstAmount,
    igstAmount,
    vatAmount,
    totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
    lineTotal: parseFloat((taxableAmount + totalTaxAmount).toFixed(2)),
  }
}

// ── Tax Exemption Definitions ────────────────────────────────────────────────
export const TAX_EXEMPTION_REASONS = [
  { id: "SEZ_DEVELOPER", label: "Special Economic Zone (SEZ) Unit / Developer", defaultNote: "Supplied to SEZ unit/developer under authorized Letter of Undertaking (LUT) without payment of integrated tax." },
  { id: "GOVERNMENT_BODY", label: "Government Authority / Local Body", defaultNote: "Statutory supply to government body exempted under central/state notification." },
  { id: "EXPORT_ZERO_RATED", label: "Export of Goods/Services (Zero-Rated)", defaultNote: "Zero-rated export supply made under LUT / bond without payment of tax." },
  { id: "CHARITABLE_TRUST", label: "Registered Charitable / Non-Profit Institution", defaultNote: "Services by an entity registered under statutory non-profit/charity provisions." },
  { id: "RESELLER_CERTIFICATE", label: "Reseller / Wholesale Exemption Certificate", defaultNote: "Purchase for resale under valid statutory resale exemption certificate." },
  { id: "DIPLOMATIC_MISSION", label: "Diplomatic Mission / UN Consular Entity", defaultNote: "Supply to United Nations/Consulate entitled to exemption under international protocol." },
  { id: "AGRICULTURAL_BASIC", label: "Essential Agricultural / Healthcare Commodity", defaultNote: "Exempt supply of unprocessed produce/essential healthcare listed in nil-rated schedule." },
  { id: "OTHER", label: "Other Statutory Exemption", defaultNote: "Supply exempt under applicable statutory notifications." },
] as const

export type TaxExemptionReasonId = typeof TAX_EXEMPTION_REASONS[number]["id"]

// ── Invoice-Level GST Summary ────────────────────────────────────────────────
export interface InvoiceGstSummary {
  subtotal: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  vatTotal: number
  totalTax: number
  discountAmount: number
  grandTotal: number
  supplyType: SupplyType
  isTaxExempt?: boolean
  taxExemptionReason?: string
  taxExemptionCertificate?: string
  taxExemptionNotice?: string
  exemptSubtotal?: number
}

export interface SummaryLineItem {
  qty: number
  unitPrice: number
  gstRate: number
  isExempt?: boolean
}

/**
 * Compute invoice-level GST totals from all line items.
 */
export function computeInvoiceGstSummary(
  lineItems: SummaryLineItem[],
  supplyType: SupplyType,
  discount: number,
  discountType: "PERCENT" | "FIXED",
  options?: {
    isTaxExempt?: boolean
    taxExemptionReason?: string
    taxExemptionCertificate?: string
  }
): InvoiceGstSummary {
  let subtotal = 0
  let cgstTotal = 0
  let sgstTotal = 0
  let igstTotal = 0
  let vatTotal = 0
  let exemptSubtotal = 0

  const invoiceIsExempt = Boolean(options?.isTaxExempt)
  // The discount comes off before tax: tax is charged on what the customer actually pays for the goods
  const discountFraction = invoiceDiscountFraction(lineItems, discount, discountType)

  for (const item of lineItems) {
    const itemIsExempt = invoiceIsExempt || Boolean(item.isExempt)
    const effectiveRate = itemIsExempt ? 0 : item.gstRate
    const gst = computeLineItemGst(item.qty, item.unitPrice, effectiveRate, supplyType, discountFraction)
    subtotal += gst.taxableAmount
    if (itemIsExempt) {
      exemptSubtotal += gst.taxableAmount
    } else {
      cgstTotal += gst.cgstAmount
      sgstTotal += gst.sgstAmount
      igstTotal += gst.igstAmount
      vatTotal += gst.vatAmount
    }
  }

  const discountAmount = parseFloat((subtotal * discountFraction).toFixed(2))

  const totalTax = parseFloat((cgstTotal + sgstTotal + igstTotal + vatTotal).toFixed(2))
  const grandTotal = parseFloat(
    (subtotal - discountAmount + totalTax).toFixed(2)
  )

  let taxExemptionNotice: string | undefined
  if (invoiceIsExempt) {
    const matched = TAX_EXEMPTION_REASONS.find(r => r.id === options?.taxExemptionReason)
    const reasonText = matched ? matched.label : (options?.taxExemptionReason || "Statutory Exemption")
    const certText = options?.taxExemptionCertificate ? ` (Cert/Ref: ${options.taxExemptionCertificate})` : ""
    taxExemptionNotice = `Tax Exemption Applied: ${reasonText}${certText}. Assessed Tax Rate: 0.00%.`
  }

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    cgstTotal: parseFloat(cgstTotal.toFixed(2)),
    sgstTotal: parseFloat(sgstTotal.toFixed(2)),
    igstTotal: parseFloat(igstTotal.toFixed(2)),
    vatTotal: parseFloat(vatTotal.toFixed(2)),
    totalTax,
    discountAmount,
    grandTotal,
    supplyType,
    isTaxExempt: invoiceIsExempt,
    taxExemptionReason: options?.taxExemptionReason,
    taxExemptionCertificate: options?.taxExemptionCertificate,
    taxExemptionNotice,
    exemptSubtotal: parseFloat(exemptSubtotal.toFixed(2)),
  }
}

// ── HSN Summary ──────────────────────────────────────────────────────────────
export interface HsnSummaryItem {
  hsnSac: string
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalTaxAmount: number
}

export interface HsnSummaryLineItem extends SummaryLineItem {
  hsnSac?: string | null
}

export function computeHsnSummary(
  lineItems: HsnSummaryLineItem[],
  supplyType: SupplyType,
  /** From invoiceDiscountFraction: the summary shows the value tax was charged on */
  discountFraction: number = 0
): HsnSummaryItem[] {
  const map = new Map<string, HsnSummaryItem>()

  for (const item of lineItems) {
    const hsn = item.hsnSac || "Unspecified"
    const effectiveRate = item.isExempt ? 0 : item.gstRate
    const gross = computeLineItemGst(item.qty, item.unitPrice, effectiveRate, supplyType, discountFraction)
    const gst = { ...gross, taxableAmount: parseFloat((gross.taxableAmount * (1 - discountFraction)).toFixed(2)) }

    const existing = map.get(hsn)
    if (existing) {
      existing.taxableAmount = parseFloat((existing.taxableAmount + gst.taxableAmount).toFixed(2))
      existing.cgstAmount = parseFloat((existing.cgstAmount + gst.cgstAmount).toFixed(2))
      existing.sgstAmount = parseFloat((existing.sgstAmount + gst.sgstAmount).toFixed(2))
      existing.igstAmount = parseFloat((existing.igstAmount + gst.igstAmount).toFixed(2))
      existing.totalTaxAmount = parseFloat((existing.totalTaxAmount + gst.totalTaxAmount).toFixed(2))
    } else {
      map.set(hsn, {
        hsnSac: hsn,
        taxableAmount: gst.taxableAmount,
        cgstAmount: gst.cgstAmount,
        sgstAmount: gst.sgstAmount,
        igstAmount: gst.igstAmount,
        totalTaxAmount: gst.totalTaxAmount,
      })
    }
  }

  return Array.from(map.values())
}

// ── GSTIN Validator ──────────────────────────────────────────────────────────
/**
 * Basic GSTIN format validation: 15 chars, pattern 22ABCDE1234F1Z5
 */
export function isValidGstin(gstin: string): boolean {
  if (!gstin) return true // optional field — empty is valid
  const pattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/
  return pattern.test(gstin.toUpperCase())
}
