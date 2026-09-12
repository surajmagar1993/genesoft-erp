/**
 * verify-gst-returns.ts
 * Standalone verification suite for Indian Statutory GST Returns (GSTR-1 & GSTR-3B).
 * Run: npx tsx scripts/verify-gst-returns.ts
 */

import {
  getStateCodeFromName,
  getStateNameFromCode,
  getIndianGstPeriod,
  buildGstr1Report,
  buildGstr3bReport,
  computeRule88aSetoff,
  formatGstr1Json,
  formatGstr1B2bCsv,
  formatGstr1HsnCsv,
  formatGstr3bJson,
  B2C_LARGE_THRESHOLD,
  RawInvoice,
  RawCreditNote,
  RawBill,
} from "../src/lib/gst-returns-engine"

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`)
    passed++
  } else {
    console.error(`  ✗ FAIL: ${message}`)
    failed++
  }
}

console.log("=================================================================")
console.log("  INDIAN GST RETURNS (GSTR-1 & GSTR-3B) STATUTORY VERIFICATION   ")
console.log("=================================================================\n")

// ── Test 1: State GST Codes ───────────────────────────────────────────────────
console.log("[Test 1] Testing Indian State GST Codes & Normalization...")
assert(getStateCodeFromName("Maharashtra") === "27", "Maharashtra must be 27")
assert(getStateCodeFromName("Karnataka") === "29", "Karnataka must be 29")
assert(getStateCodeFromName("Delhi") === "07", "Delhi must be 07")
assert(getStateCodeFromName("Gujarat") === "24", "Gujarat must be 24")
assert(getStateCodeFromName("Tamil Nadu") === "33", "Tamil Nadu must be 33")
assert(getStateCodeFromName("Uttar Pradesh") === "09", "Uttar Pradesh must be 09")
assert(getStateCodeFromName("27") === "27", "2-digit code '27' should return '27'")
assert(getStateCodeFromName("27-Maharashtra") === "27", "Prefix '27-Maharashtra' should return '27'")
assert(getStateNameFromCode("27") === "Maharashtra", "Code 27 should map to Maharashtra")
assert(getStateNameFromCode("29") === "Karnataka", "Code 29 should map to Karnataka")

// ── Test 2: Tax Period & Filing Deadlines ──────────────────────────────────────
console.log("\n[Test 2] Testing Tax Period & Statutory Deadlines...")
const sepPeriod = getIndianGstPeriod(2026, 9)
assert(sepPeriod.financialYear === "2026-27", "Sep 2026 must be in FY 2026-27")
assert(sepPeriod.quarter === "Q2", "Sep 2026 must be in Q2 (Jul-Sep)")
assert(sepPeriod.gstr1DueDate === "2026-10-11", "GSTR-1 for Sep 2026 must be due on Oct 11, 2026")
assert(sepPeriod.gstr3bDueDate === "2026-10-20", "GSTR-3B for Sep 2026 must be due on Oct 20, 2026")
assert(sepPeriod.fp === "092026", "GSTN return period must be 092026")

const marPeriod = getIndianGstPeriod(2027, 3)
assert(marPeriod.financialYear === "2026-27", "Mar 2027 must still be in FY 2026-27")
assert(marPeriod.quarter === "Q4", "Mar 2027 must be in Q4 (Jan-Mar)")
assert(marPeriod.gstr1DueDate === "2027-04-11", "GSTR-1 for Mar 2027 must be due on Apr 11, 2027")
assert(marPeriod.gstr3bDueDate === "2027-04-20", "GSTR-3B for Mar 2027 must be due on Apr 20, 2027")

// ── Test 3: GSTR-1 Classification Engine ──────────────────────────────────────
console.log("\n[Test 3] Testing GSTR-1 Outward Classification Engine...")

const mockInvoices: RawInvoice[] = [
  // 1. Registered customer (B2B)
  {
    id: "inv-1",
    invoiceNumber: "INV-2026-001",
    invoiceDate: "2026-09-05",
    type: "TAX_INVOICE",
    status: "PAID",
    subtotal: 100000,
    taxAmount: 18000,
    total: 118000,
    placeOfSupply: "27-Maharashtra",
    contact: {
      displayName: "Tata Motors Ltd.",
      gstin: "27AAACT2727Q1ZW",
    },
    items: [
      {
        id: "li-1",
        description: "Enterprise ERP Software Subscription",
        hsnSacCode: "998313",
        quantity: 1,
        unitPrice: 100000,
        cgstRate: 9,
        cgstAmount: 9000,
        sgstRate: 9,
        sgstAmount: 9000,
        igstRate: 0,
        igstAmount: 0,
        lineTotal: 118000,
      }
    ]
  },
  // 2. Unregistered customer, Interstate > 2.5 Lakh (B2CL)
  {
    id: "inv-2",
    invoiceNumber: "INV-2026-002",
    invoiceDate: "2026-09-10",
    type: "TAX_INVOICE",
    status: "PAID",
    subtotal: 300000,
    taxAmount: 54000,
    total: 354000, // > 2.5L threshold
    placeOfSupply: "29-Karnataka",
    contact: {
      displayName: "Individual High-Net Consumer",
      gstin: null,
    },
    items: [
      {
        id: "li-2",
        description: "Hardware Server Rack System",
        hsnSacCode: "847130",
        quantity: 1,
        unitPrice: 300000,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 18,
        igstAmount: 54000,
        lineTotal: 354000,
      }
    ]
  },
  // 3. Unregistered customer, Intrastate (B2CS)
  {
    id: "inv-3",
    invoiceNumber: "INV-2026-003",
    invoiceDate: "2026-09-15",
    type: "TAX_INVOICE",
    status: "PAID",
    subtotal: 50000,
    taxAmount: 9000,
    total: 59000,
    placeOfSupply: "27-Maharashtra",
    contact: {
      displayName: "Local Walk-in Customer",
      gstin: null,
    },
    items: [
      {
        id: "li-3",
        description: "POS Retail Sale",
        hsnSacCode: "998311",
        quantity: 2,
        unitPrice: 25000,
        cgstRate: 9,
        cgstAmount: 4500,
        sgstRate: 9,
        sgstAmount: 4500,
        igstRate: 0,
        igstAmount: 0,
        lineTotal: 59000,
      }
    ]
  },
  // 4. Unregistered customer, Interstate <= 2.5 Lakh (B2CS)
  {
    id: "inv-4",
    invoiceNumber: "INV-2026-004",
    invoiceDate: "2026-09-18",
    type: "TAX_INVOICE",
    status: "PAID",
    subtotal: 40000,
    taxAmount: 7200,
    total: 47200, // <= 2.5L
    placeOfSupply: "07-Delhi",
    contact: {
      displayName: "Delhi Small Buyer",
      gstin: null,
    },
    items: [
      {
        id: "li-4",
        description: "Consulting Service",
        hsnSacCode: "998311",
        quantity: 1,
        unitPrice: 40000,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 18,
        igstAmount: 7200,
        lineTotal: 47200,
      }
    ]
  },
  // 5. Export invoice (EXP)
  {
    id: "inv-5",
    invoiceNumber: "INV-2026-005",
    invoiceDate: "2026-09-20",
    type: "EXPORT",
    status: "PAID",
    subtotal: 200000,
    taxAmount: 36000,
    total: 236000,
    placeOfSupply: "97-Other Territory",
    contact: {
      displayName: "Overseas Client Inc.",
      gstin: null,
    },
    items: [
      {
        id: "li-5",
        description: "Software Export to USA",
        hsnSacCode: "998313",
        quantity: 1,
        unitPrice: 200000,
        cgstRate: 0,
        cgstAmount: 0,
        sgstRate: 0,
        sgstAmount: 0,
        igstRate: 18,
        igstAmount: 36000,
        lineTotal: 236000,
      }
    ]
  }
]

const mockCreditNotes: RawCreditNote[] = [
  {
    id: "cn-1",
    creditNoteNumber: "CN-2026-001",
    issueDate: "2026-09-22",
    status: "ISSUED",
    reason: "GOODS_RETURN",
    subtotal: 10000,
    taxAmount: 1800,
    total: 11800,
    contact: {
      displayName: "Tata Motors Ltd.",
      gstin: "27AAACT2727Q1ZW",
    }
  }
]

const gstr1 = buildGstr1Report({
  invoices: mockInvoices,
  creditNotes: mockCreditNotes,
  supplierGstin: "27AABCG1234F1Z5",
  supplierLegalName: "Genesoft ERP Pvt Ltd",
  supplierState: "Maharashtra",
  year: 2026,
  month: 9,
})

assert(gstr1.b2b.length === 1, "Must have exactly 1 B2B invoice (Tata Motors)")
assert(gstr1.b2b[0].inum === "INV-2026-001", "B2B invoice number must be INV-2026-001")
assert(gstr1.b2b[0].ctin === "27AAACT2727Q1ZW", "B2B recipient GSTIN must match")
assert(gstr1.b2cl.length === 1, "Must have exactly 1 B2CL invoice (> 2.5L interstate unregistered)")
assert(gstr1.b2cl[0].inum === "INV-2026-002", "B2CL invoice number must be INV-2026-002")
assert(gstr1.b2cl[0].pos === "29", "B2CL POS must be 29 (Karnataka)")
assert(gstr1.b2cs.length === 2, "Must have 2 B2CS groups (Intrastate MH + Interstate DL)")
assert(gstr1.exp.length === 1, "Must have exactly 1 Export invoice")
assert(gstr1.cdnr.length === 1, "Must have exactly 1 Credit Note (Table 9B)")
assert(gstr1.summary.totalInvoicesCount === 5, "Total invoice count must be 5")
assert(gstr1.summary.totalTaxableValue === 690000, "Total taxable value must sum correctly (100k+300k+50k+40k+200k)")

// ── Test 4: Table 12 HSN Summary & Table 13 Documents ─────────────────────────
console.log("\n[Test 4] Testing Table 12 HSN Summary & Table 13 Documents...")
assert(gstr1.hsn.length >= 3, "HSN summary must contain at least 3 distinct codes (998313, 847130, 998311)")
const hsn998313 = gstr1.hsn.find(h => h.hsn_sc === "998313")
assert(hsn998313 !== undefined, "HSN 998313 must be present in Table 12")
assert(hsn998313!.qty === 2, "HSN 998313 must aggregate qty 2 (1 from inv-1 and 1 from inv-5)")
assert(hsn998313!.txval === 300000, "HSN 998313 must aggregate taxable val 300,000")

assert(gstr1.docIssue.length === 2, "Table 13 must have 2 document series (Invoices & Credit Notes)")
assert(gstr1.docIssue[0].from_serial === "INV-2026-001", "From serial must be INV-2026-001")
assert(gstr1.docIssue[0].to_serial === "INV-2026-005", "To serial must be INV-2026-005")
assert(gstr1.docIssue[0].tot_cnt === 5, "Total invoice count must be 5")
assert(gstr1.docIssue[0].net_cnt === 5, "Net invoice count must be 5")

// ── Test 5: GSTR-3B Eligible ITC from Vendor Bills ────────────────────────────
console.log("\n[Test 5] Testing GSTR-3B Outward & Inward ITC Synthesis...")

const mockBills: RawBill[] = [
  {
    id: "bill-1",
    billNumber: "BILL-2026-001",
    billDate: "2026-09-08",
    status: "PAID",
    subtotal: 50000,
    taxAmount: 9000, // 4500 CGST + 4500 SGST (Intrastate vendor)
    total: 59000,
    contact: {
      displayName: "Cloud Infrastructure India",
      gstin: "27AABCC5555K1Z9", // MH vendor
    },
    items: [
      {
        id: "bi-1",
        description: "Cloud Hosting",
        quantity: 1,
        unitPrice: 50000,
        taxPercent: 18,
        taxAmount: 9000,
        lineTotal: 59000,
      }
    ]
  },
  {
    id: "bill-2",
    billNumber: "BILL-2026-002",
    billDate: "2026-09-12",
    status: "PAID",
    subtotal: 80000,
    taxAmount: 14400, // IGST (Interstate vendor from Karnataka 29)
    total: 94400,
    contact: {
      displayName: "Hardware Supplier Bangalore",
      gstin: "29AAACB1234D1Z2", // KA vendor
    },
    items: [
      {
        id: "bi-2",
        description: "Networking Cables",
        quantity: 1,
        unitPrice: 80000,
        taxPercent: 18,
        taxAmount: 14400,
        lineTotal: 94400,
      }
    ]
  }
]

const gstr3b = buildGstr3bReport({
  gstr1,
  bills: mockBills,
})

assert(gstr3b.table31.outwardTaxable.txval === 690000, "Table 3.1(a) Taxable value must match outward supplies")
assert(gstr3b.table4Itc.available.allOtherItc.camt === 4500, "Eligible CGST ITC must be 4,500 from Bill-1")
assert(gstr3b.table4Itc.available.allOtherItc.samt === 4500, "Eligible SGST ITC must be 4,500 from Bill-1")
assert(gstr3b.table4Itc.available.allOtherItc.iamt === 14400, "Eligible IGST ITC must be 14,400 from Bill-2")
assert(gstr3b.table4Itc.netAvailable.iamt === 14400, "Net available IGST ITC must be 14,400")

// ── Test 6: Statutory Rule 88A Tax Set-off Matrix ─────────────────────────────
console.log("\n[Test 6] Testing Statutory Rule 88A Tax Set-off Matrix...")

// Case A: Liability exceeds ITC
const setoffA = computeRule88aSetoff(
  { igst: 20000, cgst: 10000, sgst: 10000, cess: 0 },
  { igst: 25000, cgst: 4000, sgst: 4000, cess: 0 }
)

// IGST ITC (25k) first pays IGST liability (20k).
// Remaining IGST ITC (5k) pays CGST liability (5k).
// Remaining CGST liability = 5k.
// CGST ITC (4k) pays CGST liability (4k).
// Remaining CGST cash payable = 1k.
// SGST liability (10k) paid by SGST ITC (4k) -> SGST cash payable = 6k.
assert(setoffA.paidViaItc.igstUsingIgst === 20000, "IGST liability fully paid by IGST ITC")
assert(setoffA.paidViaItc.cgstUsingIgst === 5000, "Excess 5k IGST ITC must offset CGST")
assert(setoffA.paidViaItc.cgstUsingCgst === 4000, "CGST ITC pays remaining CGST liability")
assert(setoffA.paidViaItc.sgstUsingSgst === 4000, "SGST ITC pays SGST liability")
assert(setoffA.taxPaidInCash.igst === 0, "No IGST cash payable")
assert(setoffA.taxPaidInCash.cgst === 1000, "1,000 CGST cash payable")
assert(setoffA.taxPaidInCash.sgst === 6000, "6,000 SGST cash payable")
assert(setoffA.taxPaidInCash.totalCashPayable === 7000, "Total cash payable must be 7,000")

// ── Test 7: Exporters (JSON & CSV) ────────────────────────────────────────────
console.log("\n[Test 7] Testing GST Offline Tool Exporters (JSON & CSV)...")

const gstr1Json: any = formatGstr1Json(gstr1)
assert(gstr1Json.gstin === "27AABCG1234F1Z5", "GSTR-1 JSON must have supplier GSTIN")
assert(gstr1Json.fp === "092026", "GSTR-1 JSON must have fp 092026")
assert(Array.isArray(gstr1Json.b2b), "GSTR-1 JSON must have b2b array")
assert(gstr1Json.b2b.length === 1, "GSTR-1 JSON b2b array must have 1 entry")
assert(Array.isArray(gstr1Json.b2cl), "GSTR-1 JSON must have b2cl array")
assert(Array.isArray(gstr1Json.b2cs), "GSTR-1 JSON must have b2cs array")
assert(gstr1Json.hsn.data.length >= 3, "GSTR-1 JSON must have hsn.data entries")
assert(gstr1Json.doc_issue.doc_det.length === 2, "GSTR-1 JSON must have doc_issue entries")

const b2bCsv = formatGstr1B2bCsv(gstr1)
assert(b2bCsv.includes("GSTIN/UIN of Recipient"), "B2B CSV must have header")
assert(b2bCsv.includes("27AAACT2727Q1ZW"), "B2B CSV must include Tata Motors GSTIN")

const hsnCsv = formatGstr1HsnCsv(gstr1)
assert(hsnCsv.includes("HSN,Description,UQC"), "HSN CSV must have header")
assert(hsnCsv.includes("998313"), "HSN CSV must contain code 998313")

const gstr3bJson: any = formatGstr3bJson(gstr3b)
assert(gstr3bJson.gstin === "27AABCG1234F1Z5", "GSTR-3B JSON must have supplier GSTIN")
assert(gstr3bJson.sup_details.osup_det.txval === 690000, "GSTR-3B JSON must have outward taxable value")

console.log("\n=================================================================")
if (failed === 0) {
  console.log(`    ALL ${passed}/${passed} GST RETURNS TESTS PASSED SUCCESSFULLY! ✓`)
} else {
  console.error(`    ${failed} TESTS FAILED!`)
  process.exit(1)
}
console.log("=================================================================\n")
