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
export type SupplyType = "intra" | "inter"

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

// ── GST Split ────────────────────────────────────────────────────────────────
export interface GstSplit {
  cgstPercent: number // intra only
  sgstPercent: number // intra only
  igstPercent: number // inter only
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
  if (supplyType === "intra") {
    const half = gstRate / 2
    return { cgstPercent: half, sgstPercent: half, igstPercent: 0 }
  }
  return { cgstPercent: 0, sgstPercent: 0, igstPercent: gstRate }
}

// ── Line Item Tax Amounts ────────────────────────────────────────────────────
export interface LineItemGst extends GstSplit {
  taxableAmount: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  totalTaxAmount: number
  lineTotal: number // taxable + total tax
}

/**
 * Compute all GST amounts for a single line item.
 */
export function computeLineItemGst(
  qty: number,
  unitPrice: number,
  gstRate: number,
  supplyType: SupplyType
): LineItemGst {
  const taxableAmount = qty * unitPrice
  const split = computeGstSplit(gstRate, supplyType)

  const cgstAmount = parseFloat(
    ((taxableAmount * split.cgstPercent) / 100).toFixed(2)
  )
  const sgstAmount = parseFloat(
    ((taxableAmount * split.sgstPercent) / 100).toFixed(2)
  )
  const igstAmount = parseFloat(
    ((taxableAmount * split.igstPercent) / 100).toFixed(2)
  )
  const totalTaxAmount = cgstAmount + sgstAmount + igstAmount

  return {
    ...split,
    taxableAmount: parseFloat(taxableAmount.toFixed(2)),
    cgstAmount,
    sgstAmount,
    igstAmount,
    totalTaxAmount: parseFloat(totalTaxAmount.toFixed(2)),
    lineTotal: parseFloat((taxableAmount + totalTaxAmount).toFixed(2)),
  }
}

// ── Invoice-Level GST Summary ────────────────────────────────────────────────
export interface InvoiceGstSummary {
  subtotal: number
  cgstTotal: number
  sgstTotal: number
  igstTotal: number
  totalTax: number
  discountAmount: number
  grandTotal: number
  supplyType: SupplyType
}

export interface SummaryLineItem {
  qty: number
  unitPrice: number
  gstRate: number
}

/**
 * Compute invoice-level GST totals from all line items.
 */
export function computeInvoiceGstSummary(
  lineItems: SummaryLineItem[],
  supplyType: SupplyType,
  discount: number,
  discountType: "PERCENT" | "FIXED"
): InvoiceGstSummary {
  let subtotal = 0
  let cgstTotal = 0
  let sgstTotal = 0
  let igstTotal = 0

  for (const item of lineItems) {
    const gst = computeLineItemGst(item.qty, item.unitPrice, item.gstRate, supplyType)
    subtotal += gst.taxableAmount
    cgstTotal += gst.cgstAmount
    sgstTotal += gst.sgstAmount
    igstTotal += gst.igstAmount
  }

  const discountAmount =
    discountType === "PERCENT"
      ? parseFloat(((subtotal * discount) / 100).toFixed(2))
      : parseFloat(discount.toFixed(2))

  const totalTax = parseFloat((cgstTotal + sgstTotal + igstTotal).toFixed(2))
  const grandTotal = parseFloat(
    (subtotal + totalTax - discountAmount).toFixed(2)
  )

  return {
    subtotal: parseFloat(subtotal.toFixed(2)),
    cgstTotal: parseFloat(cgstTotal.toFixed(2)),
    sgstTotal: parseFloat(sgstTotal.toFixed(2)),
    igstTotal: parseFloat(igstTotal.toFixed(2)),
    totalTax,
    discountAmount,
    grandTotal,
    supplyType,
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
  supplyType: SupplyType
): HsnSummaryItem[] {
  const map = new Map<string, HsnSummaryItem>()

  for (const item of lineItems) {
    const hsn = item.hsnSac || "Unspecified"
    const gst = computeLineItemGst(item.qty, item.unitPrice, item.gstRate, supplyType)

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
