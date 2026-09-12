/**
 * gst-returns-engine.ts
 * Pure TypeScript Indian Statutory GST Returns Engine — CGST Act 2017 & IGST Act 2017.
 * Covers GSTR-1 (Outward Supplies Return), GSTR-3B (Monthly Summary & Rule 88A Tax Set-off Matrix),
 * State GST Codes, HSN Table 12, Table 13 Document Series, GSTN Offline Tool JSON & CSV Exporters.
 */

// ── Indian State & UT GST Codes Dictionary ─────────────────────────────────────
export interface StateGstEntry {
  code: string // 2-digit code e.g. "27"
  name: string // State / UT name e.g. "Maharashtra"
  type: "STATE" | "UT" | "OTHER"
}

export const STATE_GST_CODES: Record<string, StateGstEntry> = {
  "01": { code: "01", name: "Jammu and Kashmir", type: "UT" },
  "02": { code: "02", name: "Himachal Pradesh", type: "STATE" },
  "03": { code: "03", name: "Punjab", type: "STATE" },
  "04": { code: "04", name: "Chandigarh", type: "UT" },
  "05": { code: "05", name: "Uttarakhand", type: "STATE" },
  "06": { code: "06", name: "Haryana", type: "STATE" },
  "07": { code: "07", name: "Delhi", type: "UT" },
  "08": { code: "08", name: "Rajasthan", type: "STATE" },
  "09": { code: "09", name: "Uttar Pradesh", type: "STATE" },
  "10": { code: "10", name: "Bihar", type: "STATE" },
  "11": { code: "11", name: "Sikkim", type: "STATE" },
  "12": { code: "12", name: "Arunachal Pradesh", type: "STATE" },
  "13": { code: "13", name: "Nagaland", type: "STATE" },
  "14": { code: "14", name: "Manipur", type: "STATE" },
  "15": { code: "15", name: "Mizoram", type: "STATE" },
  "16": { code: "16", name: "Tripura", type: "STATE" },
  "17": { code: "17", name: "Meghalaya", type: "STATE" },
  "18": { code: "18", name: "Assam", type: "STATE" },
  "19": { code: "19", name: "West Bengal", type: "STATE" },
  "20": { code: "20", name: "Jharkhand", type: "STATE" },
  "21": { code: "21", name: "Odisha", type: "STATE" },
  "22": { code: "22", name: "Chhattisgarh", type: "STATE" },
  "23": { code: "23", name: "Madhya Pradesh", type: "STATE" },
  "24": { code: "24", name: "Gujarat", type: "STATE" },
  "26": { code: "26", name: "Dadra and Nagar Haveli and Daman and Diu", type: "UT" },
  "27": { code: "27", name: "Maharashtra", type: "STATE" },
  "28": { code: "28", name: "Andhra Pradesh (Old)", type: "STATE" },
  "29": { code: "29", name: "Karnataka", type: "STATE" },
  "30": { code: "30", name: "Goa", type: "STATE" },
  "31": { code: "31", name: "Lakshadweep", type: "UT" },
  "32": { code: "32", name: "Kerala", type: "STATE" },
  "33": { code: "33", name: "Tamil Nadu", type: "STATE" },
  "34": { code: "34", name: "Puducherry", type: "UT" },
  "35": { code: "35", name: "Andaman and Nicobar Islands", type: "UT" },
  "36": { code: "36", name: "Telangana", type: "STATE" },
  "37": { code: "37", name: "Andhra Pradesh", type: "STATE" },
  "38": { code: "38", name: "Ladakh", type: "UT" },
  "97": { code: "97", name: "Other Territory", type: "OTHER" },
}

/**
 * Normalizes state name / code to get a 2-digit GST state code.
 */
export function getStateCodeFromName(stateInput: string): string {
  if (!stateInput) return "27" // default Maharashtra
  const clean = stateInput.trim()
  // Check if already 2-digit code
  if (/^\d{2}$/.test(clean) && STATE_GST_CODES[clean]) return clean

  // Check prefix e.g. "27-Maharashtra"
  const prefixMatch = clean.match(/^(\d{2})[- ]/)?.[1]
  if (prefixMatch && STATE_GST_CODES[prefixMatch]) return prefixMatch

  // Match by state name
  const lower = clean.toLowerCase()
  for (const [code, item] of Object.entries(STATE_GST_CODES)) {
    if (item.name.toLowerCase() === lower) return code
  }
  for (const [code, item] of Object.entries(STATE_GST_CODES)) {
    if (item.name.toLowerCase().includes(lower) || lower.includes(item.name.toLowerCase())) {
      return code
    }
  }
  return "27"
}

export function getStateNameFromCode(code: string): string {
  const norm = code.padStart(2, "0")
  return STATE_GST_CODES[norm]?.name || "Other State"
}

// ── Statutory Filing Deadlines & Periods ────────────────────────────────────────

export interface GstFilingPeriod {
  year: number
  month: number // 1 to 12 (Jan = 1, Dec = 12)
  monthLabel: string // e.g. "September 2026"
  financialYear: string // e.g. "2026-27"
  quarter: "Q1" | "Q2" | "Q3" | "Q4" // Indian tax quarter (Q1: Apr-Jun)
  gstr1DueDate: string // e.g. "2026-10-11"
  gstr3bDueDate: string // e.g. "2026-10-20"
  fp: string // GSTN format MMYYYY e.g. "092026"
}

export function getIndianGstPeriod(year: number, month: number): GstFilingPeriod {
  // Financial Year in India runs Apr to Mar
  const fyStart = month >= 4 ? year : year - 1
  const fyEnd = (fyStart + 1) % 100
  const financialYear = `${fyStart}-${fyEnd < 10 ? "0" + fyEnd : fyEnd}`

  let quarter: "Q1" | "Q2" | "Q3" | "Q4"
  if (month >= 4 && month <= 6) quarter = "Q1"
  else if (month >= 7 && month <= 9) quarter = "Q2"
  else if (month >= 10 && month <= 12) quarter = "Q3"
  else quarter = "Q4"

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]
  const monthLabel = `${monthNames[month - 1]} ${year}`

  // Next month calculation for due dates
  const nextMonth = month === 12 ? 1 : month + 1
  const nextYear = month === 12 ? year + 1 : year
  const nextMonthStr = String(nextMonth).padStart(2, "0")

  // GSTR-1: 11th of next month
  const gstr1DueDate = `${nextYear}-${nextMonthStr}-11`
  // GSTR-3B: 20th of next month
  const gstr3bDueDate = `${nextYear}-${nextMonthStr}-20`

  const fp = `${String(month).padStart(2, "0")}${year}`

  return {
    year,
    month,
    monthLabel,
    financialYear,
    quarter,
    gstr1DueDate,
    gstr3bDueDate,
    fp,
  }
}

// ── Models for Inward & Outward Data ─────────────────────────────────────────────

export interface RawInvoiceItem {
  id: string
  description: string
  hsnSacCode?: string | null
  quantity: number
  unitPrice: number
  cgstRate?: number | null
  cgstAmount?: number | null
  sgstRate?: number | null
  sgstAmount?: number | null
  igstRate?: number | null
  igstAmount?: number | null
  discount?: number
  lineTotal: number
}

export interface RawInvoice {
  id: string
  invoiceNumber: string
  invoiceDate: string | Date
  type: string
  status: string
  subtotal: number
  taxAmount: number
  total: number
  placeOfSupply?: string | null
  billTo?: any
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    gstin?: string | null
    email?: string | null
  } | null
  items: RawInvoiceItem[]
}

export interface RawCreditNote {
  id: string
  creditNoteNumber: string
  issueDate: string | Date
  invoiceId?: string | null
  status: string
  reason: string
  subtotal: number
  taxAmount: number
  total: number
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    gstin?: string | null
  } | null
  items?: Array<{
    description: string
    hsnSacCode?: string | null
    quantity: number
    unitPrice: number
    taxRate: number
    taxAmount: number
    total: number
  }>
}

export interface RawBillItem {
  id: string
  description: string
  hsnSacCode?: string | null
  quantity: number
  unitPrice: number
  taxPercent: number
  taxAmount: number
  lineTotal: number
}

export interface RawBill {
  id: string
  billNumber: string
  billDate: string | Date
  status: string
  subtotal: number
  taxAmount: number
  total: number
  notes?: string | null
  contact?: {
    id?: string
    displayName?: string
    companyName?: string
    gstin?: string | null
  } | null
  items: RawBillItem[]
}

// ── GSTR-1 Return Data Structures ───────────────────────────────────────────────

export const B2C_LARGE_THRESHOLD = 250000 // Statutory threshold ₹2.5 Lakh for interstate unregistered

export interface Gstr1B2BInvoice {
  ctin: string // Recipient GSTIN
  cname: string // Recipient Name
  inum: string // Invoice number
  idt: string // Invoice date (DD-MM-YYYY)
  val: number // Total invoice value
  pos: string // 2-digit POS code
  posName: string // e.g. "Maharashtra"
  rchrg: "Y" | "N" // Reverse charge
  inv_typ: "R" | "DE" | "SEWP" | "SEWOP" // Regular, Deemed Export, SEZ
  taxableValue: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  cessAmount: number
  rate: number
}

export interface Gstr1B2CLInvoice {
  inum: string
  idt: string
  val: number
  pos: string
  posName: string
  taxableValue: number
  igstAmount: number
  cessAmount: number
  rate: number
}

export interface Gstr1B2CSGroup {
  sply_ty: "INTER" | "INTRA"
  pos: string
  posName: string
  rate: number
  taxableValue: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  cessAmount: number
}

export interface Gstr1ExportInvoice {
  exp_typ: "WPAY" | "WOPAY" // With / Without payment of tax
  inum: string
  idt: string
  val: number
  taxableValue: number
  igstAmount: number
  rate: number
}

export interface Gstr1CdnrEntry {
  ctin: string
  cname: string
  nt_num: string // Credit/Debit note #
  nt_dt: string
  ntty: "C" | "D" // Credit or Debit
  val: number
  pos: string
  posName: string
  rchrg: "Y" | "N"
  taxableValue: number
  cgstAmount: number
  sgstAmount: number
  igstAmount: number
  rate: number
}

export interface Gstr1HsnItem {
  hsn_sc: string // HSN or SAC code
  desc: string
  uqc: string // Unit Quantity Code e.g. "NOS", "KGS", "UNT"
  qty: number
  val: number // Total value including tax
  txval: number // Taxable value
  iamt: number // IGST amount
  camt: number // CGST amount
  samt: number // SGST amount
  csamt: number // Cess amount
  rate: number
}

export interface Gstr1DocIssued {
  doc_num: number // Doc type ID (1: Invoices, 2: Credit Notes, etc.)
  doc_name: string
  from_serial: string
  to_serial: string
  tot_cnt: number
  canc_cnt: number
  net_cnt: number
}

export interface Gstr1Report {
  period: GstFilingPeriod
  supplierGstin: string
  supplierLegalName: string
  supplierStateCode: string
  summary: {
    totalInvoicesCount: number
    totalTaxableValue: number
    totalCgst: number
    totalSgst: number
    totalIgst: number
    totalTax: number
    totalInvoiceValue: number
    b2bCount: number
    b2clCount: number
    b2csCount: number
    expCount: number
    cdnrCount: number
  }
  b2b: Gstr1B2BInvoice[]
  b2cl: Gstr1B2CLInvoice[]
  b2cs: Gstr1B2CSGroup[]
  exp: Gstr1ExportInvoice[]
  cdnr: Gstr1CdnrEntry[]
  hsn: Gstr1HsnItem[]
  docIssue: Gstr1DocIssued[]
}

// ── GSTR-3B Return Data Structures ───────────────────────────────────────────────

export interface Gstr3bTable31 {
  // 3.1(a) Outward taxable supplies (other than zero rated, nil rated and exempted)
  outwardTaxable: {
    txval: number
    iamt: number
    camt: number
    samt: number
    csamt: number
  }
  // 3.1(b) Outward taxable supplies (zero rated / exports)
  zeroRated: {
    txval: number
    iamt: number
    csamt: number
  }
  // 3.1(c) Other outward supplies (Nil rated, exempted)
  exempt: {
    txval: number
  }
  // 3.1(d) Inward supplies liable to reverse charge
  inwardRcm: {
    txval: number
    iamt: number
    camt: number
    samt: number
    csamt: number
  }
  // 3.1(e) Non-GST outward supplies
  nonGst: {
    txval: number
  }
}

export interface Gstr3bTable32Item {
  pos: string
  posName: string
  txval: number
  iamt: number
}

export interface Gstr3bTable4Itc {
  // 4(A) ITC Available
  available: {
    importGoods: { iamt: number; csamt: number } // 4(A)(1)
    importServices: { iamt: number; csamt: number } // 4(A)(2)
    inwardRcm: { iamt: number; camt: number; samt: number; csamt: number } // 4(A)(3)
    isd: { iamt: number; camt: number; samt: number; csamt: number } // 4(A)(4)
    allOtherItc: { iamt: number; camt: number; samt: number; csamt: number } // 4(A)(5) From Vendor Bills!
  }
  // 4(B) ITC Reversed
  reversed: {
    asPerRules: { iamt: number; camt: number; samt: number; csamt: number } // Rule 42/43
    others: { iamt: number; camt: number; samt: number; csamt: number }
  }
  // 4(C) Net ITC Available = 4(A) - 4(B)
  netAvailable: {
    iamt: number
    camt: number
    samt: number
    csamt: number
  }
  // 4(D) Ineligible ITC under Section 17(5)
  ineligible: {
    asPerSec17_5: { iamt: number; camt: number; samt: number; csamt: number }
    others: { iamt: number; camt: number; samt: number; csamt: number }
  }
}

export interface Gstr3bRule88aTaxPayment {
  // Output Tax Liability
  liability: {
    igst: number
    cgst: number
    sgst: number
    cess: number
    total: number
  }
  // Input Tax Credit Available
  itcAvailable: {
    igst: number
    cgst: number
    sgst: number
    cess: number
    total: number
  }
  // ITC Utilized per Rule 88A
  paidViaItc: {
    igstUsingIgst: number
    cgstUsingIgst: number
    sgstUsingIgst: number
    cgstUsingCgst: number
    sgstUsingSgst: number
    cessUsingCess: number
    totalItcUsed: number
  }
  // Net Tax to be Paid in Cash
  taxPaidInCash: {
    igst: number
    cgst: number
    sgst: number
    cess: number
    totalCashPayable: number
  }
  // Remaining Balance ITC Carried Forward
  itcCarriedForward: {
    igst: number
    cgst: number
    sgst: number
    cess: number
    totalRemainingItc: number
  }
}

export interface Gstr3bReport {
  period: GstFilingPeriod
  supplierGstin: string
  supplierLegalName: string
  supplierStateCode: string
  table31: Gstr3bTable31
  table32: Gstr3bTable32Item[]
  table4Itc: Gstr3bTable4Itc
  table61Payment: Gstr3bRule88aTaxPayment
}

// ── Pure Calculation Engine ───────────────────────────────────────────────────

/**
 * Builds full statutory GSTR-1 return data from invoices, credit notes, and supplier context.
 */
export function buildGstr1Report(params: {
  invoices: RawInvoice[]
  creditNotes: RawCreditNote[]
  supplierGstin: string
  supplierLegalName: string
  supplierState: string
  year: number
  month: number
}): Gstr1Report {
  const { invoices, creditNotes, supplierGstin, supplierLegalName, supplierState, year, month } = params
  const period = getIndianGstPeriod(year, month)
  const supplierStateCode = getStateCodeFromName(supplierGstin ? supplierGstin.slice(0, 2) : supplierState)

  const b2b: Gstr1B2BInvoice[] = []
  const b2cl: Gstr1B2CLInvoice[] = []
  const b2csMap = new Map<string, Gstr1B2CSGroup>() // key: pos_rate
  const exp: Gstr1ExportInvoice[] = []
  const cdnr: Gstr1CdnrEntry[] = []
  const hsnMap = new Map<string, Gstr1HsnItem>() // key: hsn_rate

  let totalTaxableValue = 0
  let totalCgst = 0
  let totalSgst = 0
  let totalIgst = 0
  let totalTax = 0
  let totalInvoiceValue = 0

  // Filter valid invoices (excluding cancelled / draft proforma)
  const validInvoices = invoices.filter(inv => {
    if (inv.type === "PROFORMA") return false
    return inv.status !== "CANCELLED"
  })

  for (const inv of validInvoices) {
    const contactGstin = (inv.contact?.gstin || inv.billTo?.gstin || "").trim().toUpperCase()
    const hasValidGstin = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(contactGstin)

    // Determine POS
    const rawPos = inv.placeOfSupply || inv.billTo?.state || inv.contact?.displayName || supplierState
    const pos = getStateCodeFromName(rawPos)
    const posName = getStateNameFromCode(pos)
    const isInterState = pos !== supplierStateCode

    const isExport = inv.type === "EXPORT" || (inv.contact?.displayName || "").toLowerCase().includes("export")

    const invTotal = Number(inv.total || 0)
    const invSubtotal = Number(inv.subtotal || 0)
    const invTax = Number(inv.taxAmount || 0)

    totalInvoiceValue += invTotal
    totalTaxableValue += invSubtotal
    totalTax += invTax

    // Date formatting (DD-MM-YYYY)
    const invDateObj = new Date(inv.invoiceDate)
    const d = String(invDateObj.getDate()).padStart(2, "0")
    const m = String(invDateObj.getMonth() + 1).padStart(2, "0")
    const y = invDateObj.getFullYear()
    const idt = `${d}-${m}-${y}`

    // Calculate aggregated item tax metrics
    let invCgst = 0
    let invSgst = 0
    let invIgst = 0
    let mainRate = 0

    for (const itm of inv.items || []) {
      const q = Number(itm.quantity || 1)
      const p = Number(itm.unitPrice || 0)
      const lineTaxable = q * p
      const itmCgst = Number(itm.cgstAmount || 0)
      const itmSgst = Number(itm.sgstAmount || 0)
      const itmIgst = Number(itm.igstAmount || 0)

      invCgst += itmCgst
      invSgst += itmSgst
      invIgst += itmIgst

      const effRate = Number(itm.igstRate || 0) || (Number(itm.cgstRate || 0) + Number(itm.sgstRate || 0)) || 18
      if (effRate > mainRate) mainRate = effRate

      // HSN Table 12 aggregation
      const hsnCode = (itm.hsnSacCode || "998311").trim()
      const hsnKey = `${hsnCode}_${effRate}`
      const existingHsn = hsnMap.get(hsnKey)
      if (existingHsn) {
        existingHsn.qty += q
        existingHsn.txval = Math.round((existingHsn.txval + lineTaxable) * 100) / 100
        existingHsn.camt = Math.round((existingHsn.camt + itmCgst) * 100) / 100
        existingHsn.samt = Math.round((existingHsn.samt + itmSgst) * 100) / 100
        existingHsn.iamt = Math.round((existingHsn.iamt + itmIgst) * 100) / 100
        existingHsn.val = Math.round((existingHsn.txval + existingHsn.camt + existingHsn.samt + existingHsn.iamt) * 100) / 100
      } else {
        hsnMap.set(hsnKey, {
          hsn_sc: hsnCode,
          desc: itm.description || "Goods / Services",
          uqc: "NOS",
          qty: q,
          val: Math.round((lineTaxable + itmCgst + itmSgst + itmIgst) * 100) / 100,
          txval: Math.round(lineTaxable * 100) / 100,
          iamt: Math.round(itmIgst * 100) / 100,
          camt: Math.round(itmCgst * 100) / 100,
          samt: Math.round(itmSgst * 100) / 100,
          csamt: 0,
          rate: effRate,
        })
      }
    }

    totalCgst += invCgst
    totalSgst += invSgst
    totalIgst += invIgst

    if (isExport) {
      exp.push({
        exp_typ: "WPAY",
        inum: inv.invoiceNumber,
        idt,
        val: invTotal,
        taxableValue: invSubtotal,
        igstAmount: invIgst,
        rate: mainRate || 18,
      })
    } else if (hasValidGstin) {
      // Table 4: B2B Invoices (registered)
      b2b.push({
        ctin: contactGstin,
        cname: inv.contact?.companyName || inv.contact?.displayName || inv.billTo?.name || "Registered Recipient",
        inum: inv.invoiceNumber,
        idt,
        val: invTotal,
        pos,
        posName,
        rchrg: "N",
        inv_typ: "R",
        taxableValue: invSubtotal,
        cgstAmount: invCgst,
        sgstAmount: invSgst,
        igstAmount: invIgst,
        cessAmount: 0,
        rate: mainRate || 18,
      })
    } else if (isInterState && invTotal > B2C_LARGE_THRESHOLD) {
      // Table 5: B2CL (unregistered, interstate, > ₹2.5L)
      b2cl.push({
        inum: inv.invoiceNumber,
        idt,
        val: invTotal,
        pos,
        posName,
        taxableValue: invSubtotal,
        igstAmount: invIgst,
        cessAmount: 0,
        rate: mainRate || 18,
      })
    } else {
      // Table 7: B2CS (unregistered, intrastate of any value or interstate <= ₹2.5L)
      const b2csKey = `${pos}_${mainRate || 18}`
      const existingB2cs = b2csMap.get(b2csKey)
      if (existingB2cs) {
        existingB2cs.taxableValue = Math.round((existingB2cs.taxableValue + invSubtotal) * 100) / 100
        existingB2cs.cgstAmount = Math.round((existingB2cs.cgstAmount + invCgst) * 100) / 100
        existingB2cs.sgstAmount = Math.round((existingB2cs.sgstAmount + invSgst) * 100) / 100
        existingB2cs.igstAmount = Math.round((existingB2cs.igstAmount + invIgst) * 100) / 100
      } else {
        b2csMap.set(b2csKey, {
          sply_ty: isInterState ? "INTER" : "INTRA",
          pos,
          posName,
          rate: mainRate || 18,
          taxableValue: invSubtotal,
          cgstAmount: invCgst,
          sgstAmount: invSgst,
          igstAmount: invIgst,
          cessAmount: 0,
        })
      }
    }
  }

  // Process Credit Notes (Table 9B)
  for (const cn of creditNotes || []) {
    const cnGstin = (cn.contact?.gstin || "").trim().toUpperCase()
    const pos = supplierStateCode
    const posName = getStateNameFromCode(pos)

    const cnDateObj = new Date(cn.issueDate)
    const nt_dt = `${String(cnDateObj.getDate()).padStart(2, "0")}-${String(cnDateObj.getMonth() + 1).padStart(2, "0")}-${cnDateObj.getFullYear()}`

    cdnr.push({
      ctin: cnGstin || "UNREGISTERED",
      cname: cn.contact?.companyName || cn.contact?.displayName || "Party",
      nt_num: cn.creditNoteNumber,
      nt_dt,
      ntty: "C",
      val: Number(cn.total || 0),
      pos,
      posName,
      rchrg: "N",
      taxableValue: Number(cn.subtotal || 0),
      cgstAmount: Math.round(Number(cn.taxAmount || 0) / 2 * 100) / 100,
      sgstAmount: Math.round(Number(cn.taxAmount || 0) / 2 * 100) / 100,
      igstAmount: 0,
      rate: 18,
    })
  }

  // Table 13: Documents Issued
  const invoiceNumbers = validInvoices.map(i => i.invoiceNumber).filter(Boolean)
  const cancelledInvoices = invoices.filter(i => i.status === "CANCELLED").length
  const cnNumbers = (creditNotes || []).map(c => c.creditNoteNumber).filter(Boolean)

  const docIssue: Gstr1DocIssued[] = [
    {
      doc_num: 1,
      doc_name: "Invoices for outward supply",
      from_serial: invoiceNumbers[0] || "N/A",
      to_serial: invoiceNumbers[invoiceNumbers.length - 1] || "N/A",
      tot_cnt: validInvoices.length + cancelledInvoices,
      canc_cnt: cancelledInvoices,
      net_cnt: validInvoices.length,
    },
    {
      doc_num: 2,
      doc_name: "Credit Notes",
      from_serial: cnNumbers[0] || "N/A",
      to_serial: cnNumbers[cnNumbers.length - 1] || "N/A",
      tot_cnt: cnNumbers.length,
      canc_cnt: 0,
      net_cnt: cnNumbers.length,
    }
  ]

  return {
    period,
    supplierGstin: supplierGstin || "27AABCG1234F1Z5",
    supplierLegalName: supplierLegalName || "Genesoft ERP Enterprises Ltd.",
    supplierStateCode,
    summary: {
      totalInvoicesCount: validInvoices.length,
      totalTaxableValue: Math.round(totalTaxableValue * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      totalInvoiceValue: Math.round(totalInvoiceValue * 100) / 100,
      b2bCount: b2b.length,
      b2clCount: b2cl.length,
      b2csCount: b2csMap.size,
      expCount: exp.length,
      cdnrCount: cdnr.length,
    },
    b2b,
    b2cl,
    b2cs: Array.from(b2csMap.values()),
    exp,
    cdnr,
    hsn: Array.from(hsnMap.values()),
    docIssue,
  }
}

/**
 * Executes statutory Rule 88A tax payment set-off logic.
 * Step 1: IGST credit used against IGST liability; excess against CGST and SGST in any proportion.
 * Step 2: CGST credit used against CGST liability (strictly no SGST cross-offset).
 * Step 3: SGST credit used against SGST liability (strictly no CGST cross-offset).
 */
export function computeRule88aSetoff(
  liability: { igst: number; cgst: number; sgst: number; cess: number },
  itc: { igst: number; cgst: number; sgst: number; cess: number }
): Gstr3bRule88aTaxPayment {
  let remLiabIgst = liability.igst
  let remLiabCgst = liability.cgst
  let remLiabSgst = liability.sgst
  let remLiabCess = liability.cess

  let remItcIgst = itc.igst
  let remItcCgst = itc.cgst
  let remItcSgst = itc.sgst
  let remItcCess = itc.cess

  // Step 1: IGST ITC used against IGST Liability
  const igstUsingIgst = Math.min(remItcIgst, remLiabIgst)
  remLiabIgst -= igstUsingIgst
  remItcIgst -= igstUsingIgst

  // Excess IGST ITC used against CGST & SGST (split equally or as needed)
  let cgstUsingIgst = 0
  let sgstUsingIgst = 0
  if (remItcIgst > 0) {
    cgstUsingIgst = Math.min(remItcIgst, remLiabCgst)
    remLiabCgst -= cgstUsingIgst
    remItcIgst -= cgstUsingIgst
  }
  if (remItcIgst > 0) {
    sgstUsingIgst = Math.min(remItcIgst, remLiabSgst)
    remLiabSgst -= sgstUsingIgst
    remItcIgst -= sgstUsingIgst
  }

  // Step 2: CGST ITC used against CGST Liability
  const cgstUsingCgst = Math.min(remItcCgst, remLiabCgst)
  remLiabCgst -= cgstUsingCgst
  remItcCgst -= cgstUsingCgst

  // Step 3: SGST ITC used against SGST Liability
  const sgstUsingSgst = Math.min(remItcSgst, remLiabSgst)
  remLiabSgst -= sgstUsingSgst
  remItcSgst -= sgstUsingSgst

  // Cess ITC used against Cess liability
  const cessUsingCess = Math.min(remItcCess, remLiabCess)
  remLiabCess -= cessUsingCess
  remItcCess -= cessUsingCess

  const totalItcUsed = igstUsingIgst + cgstUsingIgst + sgstUsingIgst + cgstUsingCgst + sgstUsingSgst + cessUsingCess
  const totalCashPayable = remLiabIgst + remLiabCgst + remLiabSgst + remLiabCess
  const totalRemainingItc = remItcIgst + remItcCgst + remItcSgst + remItcCess

  return {
    liability: {
      igst: liability.igst,
      cgst: liability.cgst,
      sgst: liability.sgst,
      cess: liability.cess,
      total: liability.igst + liability.cgst + liability.sgst + liability.cess,
    },
    itcAvailable: {
      igst: itc.igst,
      cgst: itc.cgst,
      sgst: itc.sgst,
      cess: itc.cess,
      total: itc.igst + itc.cgst + itc.sgst + itc.cess,
    },
    paidViaItc: {
      igstUsingIgst: Math.round(igstUsingIgst * 100) / 100,
      cgstUsingIgst: Math.round(cgstUsingIgst * 100) / 100,
      sgstUsingIgst: Math.round(sgstUsingIgst * 100) / 100,
      cgstUsingCgst: Math.round(cgstUsingCgst * 100) / 100,
      sgstUsingSgst: Math.round(sgstUsingSgst * 100) / 100,
      cessUsingCess: Math.round(cessUsingCess * 100) / 100,
      totalItcUsed: Math.round(totalItcUsed * 100) / 100,
    },
    taxPaidInCash: {
      igst: Math.round(remLiabIgst * 100) / 100,
      cgst: Math.round(remLiabCgst * 100) / 100,
      sgst: Math.round(remLiabSgst * 100) / 100,
      cess: Math.round(remLiabCess * 100) / 100,
      totalCashPayable: Math.round(totalCashPayable * 100) / 100,
    },
    itcCarriedForward: {
      igst: Math.round(remItcIgst * 100) / 100,
      cgst: Math.round(remItcCgst * 100) / 100,
      sgst: Math.round(remItcSgst * 100) / 100,
      cess: Math.round(remItcCess * 100) / 100,
      totalRemainingItc: Math.round(totalRemainingItc * 100) / 100,
    }
  }
}

/**
 * Builds full statutory GSTR-3B return summary from GSTR-1 and Inward Vendor Bills.
 */
export function buildGstr3bReport(params: {
  gstr1: Gstr1Report
  bills: RawBill[]
}): Gstr3bReport {
  const { gstr1, bills } = params

  // 1. Table 3.1 Outward Taxable Supplies
  const table31: Gstr3bTable31 = {
    outwardTaxable: {
      txval: gstr1.summary.totalTaxableValue,
      iamt: gstr1.summary.totalIgst,
      camt: gstr1.summary.totalCgst,
      samt: gstr1.summary.totalSgst,
      csamt: 0,
    },
    zeroRated: {
      txval: gstr1.exp.reduce((sum, e) => sum + e.taxableValue, 0),
      iamt: gstr1.exp.reduce((sum, e) => sum + e.igstAmount, 0),
      csamt: 0,
    },
    exempt: { txval: 0 },
    inwardRcm: { txval: 0, iamt: 0, camt: 0, samt: 0, csamt: 0 },
    nonGst: { txval: 0 },
  }

  // 2. Table 3.2 Interstate unregistered supplies
  const table32: Gstr3bTable32Item[] = []
  for (const b2cl of gstr1.b2cl) {
    table32.push({
      pos: b2cl.pos,
      posName: b2cl.posName,
      txval: b2cl.taxableValue,
      iamt: b2cl.igstAmount,
    })
  }
  for (const b2cs of gstr1.b2cs) {
    if (b2cs.sply_ty === "INTER") {
      table32.push({
        pos: b2cs.pos,
        posName: b2cs.posName,
        txval: b2cs.taxableValue,
        iamt: b2cs.igstAmount,
      })
    }
  }

  // 3. Table 4 Eligible ITC from Vendor Bills
  let billItcCgst = 0
  let billItcSgst = 0
  let billItcIgst = 0

  const validBills = bills.filter(b => b.status !== "VOID")
  for (const b of validBills) {
    const vendorGstin = (b.contact?.gstin || "").trim().toUpperCase()
    const vendorStateCode = vendorGstin.length >= 2 ? vendorGstin.slice(0, 2) : gstr1.supplierStateCode
    const isInter = vendorStateCode !== gstr1.supplierStateCode

    const bTax = Number(b.taxAmount || 0)
    if (isInter) {
      billItcIgst += bTax
    } else {
      const half = Math.round((bTax / 2) * 100) / 100
      billItcCgst += half
      billItcSgst += half
    }
  }

  const table4Itc: Gstr3bTable4Itc = {
    available: {
      importGoods: { iamt: 0, csamt: 0 },
      importServices: { iamt: 0, csamt: 0 },
      inwardRcm: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
      isd: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
      allOtherItc: {
        iamt: Math.round(billItcIgst * 100) / 100,
        camt: Math.round(billItcCgst * 100) / 100,
        samt: Math.round(billItcSgst * 100) / 100,
        csamt: 0,
      }
    },
    reversed: {
      asPerRules: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
      others: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
    },
    netAvailable: {
      iamt: Math.round(billItcIgst * 100) / 100,
      camt: Math.round(billItcCgst * 100) / 100,
      samt: Math.round(billItcSgst * 100) / 100,
      csamt: 0,
    },
    ineligible: {
      asPerSec17_5: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
      others: { iamt: 0, camt: 0, samt: 0, csamt: 0 },
    }
  }

  // 4. Table 6.1 Payment of Tax per Rule 88A
  const liability = {
    igst: table31.outwardTaxable.iamt + table31.zeroRated.iamt,
    cgst: table31.outwardTaxable.camt,
    sgst: table31.outwardTaxable.samt,
    cess: 0,
  }

  const itcAvailable = {
    igst: table4Itc.netAvailable.iamt,
    cgst: table4Itc.netAvailable.camt,
    sgst: table4Itc.netAvailable.samt,
    cess: 0,
  }

  const table61Payment = computeRule88aSetoff(liability, itcAvailable)

  return {
    period: gstr1.period,
    supplierGstin: gstr1.supplierGstin,
    supplierLegalName: gstr1.supplierLegalName,
    supplierStateCode: gstr1.supplierStateCode,
    table31,
    table32,
    table4Itc,
    table61Payment,
  }
}

// ── Official GST Offline Tool Exporters (JSON & CSV) ───────────────────────────

/**
 * Formats official GSTR-1 JSON schema conformant with GSTN offline tool.
 */
export function formatGstr1Json(report: Gstr1Report): object {
  return {
    gstin: report.supplierGstin,
    fp: report.period.fp,
    cur_gt: report.summary.totalInvoiceValue,
    gt: report.summary.totalInvoiceValue,
    version: "GSTR1_Excel_V1.0",
    hash: "hash",
    b2b: report.b2b.map(item => ({
      ctin: item.ctin,
      cname: item.cname,
      inv: [
        {
          inum: item.inum,
          idt: item.idt,
          val: item.val,
          pos: item.pos,
          rchrg: item.rchrg,
          inv_typ: item.inv_typ,
          itms: [
            {
              num: 1,
              itm_det: {
                rt: item.rate,
                txval: item.taxableValue,
                iamt: item.igstAmount,
                camt: item.cgstAmount,
                samt: item.sgstAmount,
                csamt: item.cessAmount,
              }
            }
          ]
        }
      ]
    })),
    b2cl: report.b2cl.map(item => ({
      pos: item.pos,
      inv: [
        {
          inum: item.inum,
          idt: item.idt,
          val: item.val,
          itms: [
            {
              num: 1,
              itm_det: {
                rt: item.rate,
                txval: item.taxableValue,
                iamt: item.igstAmount,
                csamt: item.cessAmount,
              }
            }
          ]
        }
      ]
    })),
    b2cs: report.b2cs.map(item => ({
      sply_ty: item.sply_ty,
      pos: item.pos,
      typ: "OE",
      rt: item.rate,
      txval: item.taxableValue,
      iamt: item.igstAmount,
      camt: item.cgstAmount,
      samt: item.sgstAmount,
      csamt: item.cessAmount,
    })),
    exp: report.exp.map(item => ({
      exp_typ: item.exp_typ,
      inv: [
        {
          inum: item.inum,
          idt: item.idt,
          val: item.val,
          itms: [
            {
              txval: item.taxableValue,
              rt: item.rate,
              iamt: item.igstAmount,
            }
          ]
        }
      ]
    })),
    cdnr: report.cdnr.map(item => ({
      ctin: item.ctin,
      nt: [
        {
          nt_num: item.nt_num,
          nt_dt: item.nt_dt,
          ntty: item.ntty,
          val: item.val,
          pos: item.pos,
          rchrg: item.rchrg,
          itms: [
            {
              num: 1,
              itm_det: {
                rt: item.rate,
                txval: item.taxableValue,
                iamt: item.igstAmount,
                camt: item.cgstAmount,
                samt: item.sgstAmount,
                csamt: 0,
              }
            }
          ]
        }
      ]
    })),
    hsn: {
      data: report.hsn.map((h, idx) => ({
        num: idx + 1,
        hsn_sc: h.hsn_sc,
        desc: h.desc,
        uqc: h.uqc,
        qty: h.qty,
        val: h.val,
        txval: h.txval,
        iamt: h.iamt,
        camt: h.camt,
        samt: h.samt,
        csamt: h.csamt,
        rt: h.rate,
      }))
    },
    doc_issue: {
      doc_det: report.docIssue.map(d => ({
        doc_num: d.doc_num,
        doc_typ: d.doc_name,
        docs: [
          {
            num: 1,
            from: d.from_serial,
            to: d.to_serial,
            totnum: d.tot_cnt,
            canc: d.canc_cnt,
            net_issue: d.net_cnt,
          }
        ]
      }))
    }
  }
}

/**
 * Formats CSV file for GSTR-1 Table 4 (B2B).
 */
export function formatGstr1B2bCsv(report: Gstr1Report): string {
  const headers = [
    "GSTIN/UIN of Recipient",
    "Receiver Name",
    "Invoice Number",
    "Invoice date",
    "Invoice Value",
    "Place Of Supply",
    "Reverse Charge",
    "Applicable % of Tax Rate",
    "Invoice Type",
    "E-Commerce GSTIN",
    "Rate",
    "Taxable Value",
    "Cess Amount"
  ]

  const rows = report.b2b.map(item => [
    `"${item.ctin}"`,
    `"${item.cname.replace(/"/g, '""')}"`,
    `"${item.inum}"`,
    `"${item.idt}"`,
    item.val.toFixed(2),
    `"${item.pos}-${item.posName}"`,
    `"${item.rchrg}"`,
    `""`,
    `"Regular"`,
    `""`,
    item.rate.toFixed(2),
    item.taxableValue.toFixed(2),
    item.cessAmount.toFixed(2),
  ])

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
}

/**
 * Formats CSV file for GSTR-1 Table 12 (HSN Summary).
 */
export function formatGstr1HsnCsv(report: Gstr1Report): string {
  const headers = [
    "HSN",
    "Description",
    "UQC",
    "Total Quantity",
    "Total Value",
    "Taxable Value",
    "Integrated Tax Amount",
    "Central Tax Amount",
    "State/UT Tax Amount",
    "Cess Amount",
    "Rate"
  ]

  const rows = report.hsn.map(item => [
    `"${item.hsn_sc}"`,
    `"${item.desc.replace(/"/g, '""')}"`,
    `"${item.uqc}"`,
    item.qty.toString(),
    item.val.toFixed(2),
    item.txval.toFixed(2),
    item.iamt.toFixed(2),
    item.camt.toFixed(2),
    item.samt.toFixed(2),
    item.csamt.toFixed(2),
    item.rate.toFixed(2),
  ])

  return [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
}

/**
 * Formats official GSTR-3B JSON schema.
 */
export function formatGstr3bJson(report: Gstr3bReport): object {
  return {
    gstin: report.supplierGstin,
    ret_period: report.period.fp,
    version: "GSTR3B_Excel_V1.0",
    inward_sup: {
      isup_details: [
        {
          ty: "ISD",
          iamt: report.table4Itc.available.isd.iamt,
          camt: report.table4Itc.available.isd.camt,
          samt: report.table4Itc.available.isd.samt,
          csamt: 0,
        },
        {
          ty: "OTH",
          iamt: report.table4Itc.available.allOtherItc.iamt,
          camt: report.table4Itc.available.allOtherItc.camt,
          samt: report.table4Itc.available.allOtherItc.samt,
          csamt: 0,
        }
      ]
    },
    sup_details: {
      osup_det: {
        txval: report.table31.outwardTaxable.txval,
        iamt: report.table31.outwardTaxable.iamt,
        camt: report.table31.outwardTaxable.camt,
        samt: report.table31.outwardTaxable.samt,
        csamt: report.table31.outwardTaxable.csamt,
      },
      osup_zero: {
        txval: report.table31.zeroRated.txval,
        iamt: report.table31.zeroRated.iamt,
        csamt: report.table31.zeroRated.csamt,
      },
      osup_nil_exmp: {
        txval: report.table31.exempt.txval,
      },
      isup_rev: {
        txval: report.table31.inwardRcm.txval,
        iamt: report.table31.inwardRcm.iamt,
        camt: report.table31.inwardRcm.camt,
        samt: report.table31.inwardRcm.samt,
        csamt: report.table31.inwardRcm.csamt,
      },
      osup_nongst: {
        txval: report.table31.nonGst.txval,
      }
    },
    itc_elg: {
      itc_avl: [
        {
          ty: "ALL_OTHER",
          iamt: report.table4Itc.available.allOtherItc.iamt,
          camt: report.table4Itc.available.allOtherItc.camt,
          samt: report.table4Itc.available.allOtherItc.samt,
          csamt: 0,
        }
      ],
      itc_net: {
        iamt: report.table4Itc.netAvailable.iamt,
        camt: report.table4Itc.netAvailable.camt,
        samt: report.table4Itc.netAvailable.samt,
        csamt: 0,
      }
    },
    tax_pmt: {
      tx_py: [
        {
          trans_typ: "IGST",
          txval: report.table61Payment.liability.igst,
          itc_paid: report.table61Payment.paidViaItc.igstUsingIgst,
          cash_paid: report.table61Payment.taxPaidInCash.igst,
        },
        {
          trans_typ: "CGST",
          txval: report.table61Payment.liability.cgst,
          itc_paid: report.table61Payment.paidViaItc.cgstUsingCgst + report.table61Payment.paidViaItc.cgstUsingIgst,
          cash_paid: report.table61Payment.taxPaidInCash.cgst,
        },
        {
          trans_typ: "SGST",
          txval: report.table61Payment.liability.sgst,
          itc_paid: report.table61Payment.paidViaItc.sgstUsingSgst + report.table61Payment.paidViaItc.sgstUsingIgst,
          cash_paid: report.table61Payment.taxPaidInCash.sgst,
        }
      ]
    }
  }
}
