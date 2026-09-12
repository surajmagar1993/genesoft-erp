/**
 * verify-uk-vat.ts
 * Comprehensive Verification Test Suite for UK HMRC 20% VAT, VRN Modulus 97, and Making Tax Digital 9-Box Return.
 * Run with: npx tsx scripts/verify-uk-vat.ts
 */

import {
  UK_STANDARD_VAT_RATE,
  UK_REDUCED_VAT_RATE,
  UK_ZERO_VAT_RATE,
  validateUkVrn,
  getUkVatPeriod,
  compileUkMtdVatReturn,
  formatUkMtdJson,
  formatUkMtdCsv,
  RawUkInvoice,
  RawUkBill,
} from "../src/lib/uk-vat-engine"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

console.log("\n=======================================================")
console.log("  UK (HMRC) VAT & MTD 9-BOX RETURN VERIFICATION SUITE  ")
console.log("  Value Added Tax Act 1994 & HMRC Modulus 97 Check     ")
console.log("=======================================================\n")

// ── Test 1: UK VRN Modulus 97 Validation ──────────────────────────────────────
console.log("▶ 1. UK VRN (VAT Registration Number) Modulus 97 Check:")
{
  // Valid standard VRN: 999 9999 73 (Government/Public test)
  const v1 = validateUkVrn("GB 999 9999 73")
  assert(v1.isValid === true, "Valid 9-digit VRN with GB prefix passes Modulus 97")
  assert(v1.formattedVrn === "GB 999 9999 73", "Formatted VRN correct")

  // Valid without GB prefix
  const v2 = validateUkVrn("999999973")
  assert(v2.isValid === true, "Valid 9-digit VRN without GB prefix passes")

  // Valid post-2009 Modulus 97 + 55 rule
  const v3 = validateUkVrn("GB 123 4567 82")
  assert(v3.isValid === true, "HMRC Public Test VRN passes")

  // Invalid: Checksum fails
  const v4 = validateUkVrn("GB 999 9999 74")
  assert(v4.isValid === false, "Invalid checksum fails Modulus 97")
  assert(v4.error?.includes("Modulus 97") === true, "Error message mentions Modulus 97")

  // Invalid: Too short
  const v5 = validateUkVrn("GB 999 9999")
  assert(v5.isValid === false, "7-digit VRN fails length check")

  // Invalid: Too long
  const v6 = validateUkVrn("GB 999 9999 730")
  assert(v6.isValid === false, "10-digit VRN fails length check")

  // Invalid: Alphanumeric
  const v7 = validateUkVrn("GB 999 ABC9 73")
  assert(v7.isValid === false, "Alphanumeric string fails numeric test")

  // Empty or null
  const v8 = validateUkVrn("")
  assert(v8.isValid === false, "Empty string fails")
  const v9 = validateUkVrn(null)
  assert(v9.isValid === false, "Null fails")
}

// ── Test 2: UK VAT Period & Stagger Deadlines (1 Month + 7 Days) ───────────────
console.log("\n▶ 2. HMRC VAT Periods & Statutory Filing Deadlines:")
{
  // Q1 (Jan to Mar) due May 7
  const p1 = getUkVatPeriod(2026, "Q1")
  assert(p1.startDate === "2026-01-01" && p1.endDate === "2026-03-31", "Q1 date range")
  assert(p1.dueDate === "2026-05-07", "Q1 due date is 7 May (1 month + 7 days)")

  // Q2 (Apr to Jun) due Aug 7
  const p2 = getUkVatPeriod(2026, "Q2")
  assert(p2.dueDate === "2026-08-07", "Q2 due date is 7 August")

  // Q3 (Jul to Sep) due Nov 7
  const p3 = getUkVatPeriod(2026, "Q3")
  assert(p3.dueDate === "2026-11-07", "Q3 due date is 7 November")

  // Q4 (Oct to Dec) due Feb 7
  const p4 = getUkVatPeriod(2026, "Q4")
  assert(p4.dueDate === "2027-02-07", "Q4 due date is 7 February following year")
}

// ── Test 3: HMRC MTD 9-Box VAT Return Compilation ─────────────────────────────
console.log("\n▶ 3. Official HMRC MTD 9-Box Return Engine:")
{
  const invoices: RawUkInvoice[] = [
    // Invoice 1: Standard Rate 20% (£10,000 + 20% = £2,000 VAT)
    {
      id: "inv-1",
      invoiceNumber: "INV-UK-001",
      invoiceDate: "2026-07-15",
      type: "TAX_INVOICE",
      status: "PAID",
      subtotal: 10000,
      taxAmount: 2000,
      total: 12000,
      contact: {
        companyName: "London Digital Services Ltd",
        trn: "GB 999 9999 73",
      },
      items: [
        {
          id: "it-1",
          description: "Enterprise Software License",
          quantity: 1,
          unitPrice: 10000,
          vatRate: 20,
          vatAmount: 2000,
          lineTotal: 10000,
        },
      ],
    },
    // Invoice 2: Reduced Rate 5% (£4,000 + 5% = £200 VAT)
    {
      id: "inv-2",
      invoiceNumber: "INV-RED-002",
      invoiceDate: "2026-08-10",
      type: "TAX_INVOICE",
      status: "PAID",
      subtotal: 4000,
      taxAmount: 200,
      total: 4200,
      items: [
        {
          id: "it-2",
          description: "Energy Saving Thermal Installation",
          quantity: 1,
          unitPrice: 4000,
          vatRate: 5,
          vatAmount: 200,
          lineTotal: 4000,
        },
      ],
    },
    // Invoice 3: Zero-Rated Supply (Books & Educational Materials £3,000)
    {
      id: "inv-3",
      invoiceNumber: "INV-ZERO-003",
      invoiceDate: "2026-08-22",
      type: "ZERO_RATED",
      status: "PAID",
      subtotal: 3000,
      taxAmount: 0,
      total: 3000,
      items: [
        {
          id: "it-3",
          description: "Technical Textbooks & Printed Manuals",
          quantity: 1,
          unitPrice: 3000,
          vatRate: 0,
          vatAmount: 0,
          lineTotal: 3000,
        },
      ],
    },
    // Invoice 4: Export to EU Ireland (£5,000) -> Box 8
    {
      id: "inv-4",
      invoiceNumber: "INV-EU-004",
      invoiceDate: "2026-09-05",
      type: "EXPORT",
      status: "PAID",
      subtotal: 5000,
      taxAmount: 0,
      total: 5000,
      placeOfSupply: "Ireland (EU)",
      items: [
        {
          id: "it-4",
          description: "EU B2B Dispatch",
          quantity: 1,
          unitPrice: 5000,
          vatRate: 0,
          vatAmount: 0,
          lineTotal: 5000,
        },
      ],
    },
  ]

  const bills: RawUkBill[] = [
    // Bill 1: Domestic Standard Purchases (£6,000 + 20% = £1,200 VAT)
    {
      id: "bill-1",
      billNumber: "BILL-DOM-001",
      billDate: "2026-07-25",
      status: "PAID",
      subtotal: 6000,
      taxAmount: 1200,
      total: 7200,
      items: [
        {
          id: "bi-1",
          description: "Cloud Infrastructure Hosting",
          quantity: 1,
          unitPrice: 6000,
          taxPercent: 20,
          taxAmount: 1200,
          lineTotal: 6000,
        },
      ],
    },
    // Bill 2: EU Acquisition / Reverse Charge (£2,000 -> 20% = £400 VAT)
    // Box 2 (Output VAT) + Box 4 (Input VAT) + Box 9 (Net Value)
    {
      id: "bill-2",
      billNumber: "BILL-EU-002",
      billDate: "2026-08-15",
      status: "PAID",
      subtotal: 2000,
      taxAmount: 0,
      total: 2000,
      notes: "Subject to EU Acquisition Reverse Charge",
      items: [
        {
          id: "bi-2",
          description: "European Software Components",
          quantity: 1,
          unitPrice: 2000,
          taxPercent: 0,
          taxAmount: 0,
          lineTotal: 2000,
        },
      ],
    },
  ]

  const report = compileUkMtdVatReturn({
    year: 2026,
    quarter: "Q3",
    taxpayerVrn: "GB 999 9999 73",
    taxpayerLegalName: "Genesoft Technologies UK Ltd",
    invoices,
    bills,
  })

  // Box 1: VAT due on sales = £2,000 (Standard) + £200 (Reduced) = £2,200
  assert(report.box1VatDueSales === 2200, "Box 1: VAT due on sales is £2,200 (£2,000 + £200)")

  // Box 2: VAT due on acquisitions = £400 (20% of £2,000)
  assert(report.box2VatDueAcquisitions === 400, "Box 2: VAT on acquisitions is £400")

  // Box 3: Total VAT due = Box 1 + Box 2 = £2,200 + £400 = £2,600
  assert(report.box3TotalVatDue === 2600, "Box 3: Total VAT due is £2,600 (Box 1 + Box 2)")

  // Box 4: VAT reclaimed = £1,200 (domestic) + £400 (EU acq) = £1,600
  assert(report.box4VatReclaimedPurchases === 1600, "Box 4: VAT reclaimed is £1,600")

  // Box 5: Net VAT due = Box 3 - Box 4 = £2,600 - £1,600 = £1,000 Payable
  assert(report.box5NetVatDue === 1000, "Box 5: Net VAT to pay is £1,000 (Box 3 - Box 4)")

  // Box 6: Total value of sales ex VAT = £10,000 + £4,000 + £3,000 + £5,000 = £22,000
  assert(report.box6TotalValueSalesExVat === 22000, "Box 6: Net sales value is £22,000")

  // Box 7: Total value of purchases ex VAT = £6,000 + £2,000 = £8,000
  assert(report.box7TotalValuePurchasesExVat === 8000, "Box 7: Net purchases value is £8,000")

  // Box 8: Total value of EU supplies = £5,000
  assert(report.box8TotalValueGoodsSuppliedExVat === 5000, "Box 8: EU supplies value is £5,000")

  // Box 9: Total value of EU acquisitions = £2,000
  assert(report.box9TotalAcquisitionsExVat === 2000, "Box 9: EU acquisitions value is £2,000")
}

// ── Test 4: HMRC MTD Exporters (JSON & CSV) ───────────────────────────────────
console.log("\n▶ 4. HMRC MTD API Exporters:")
{
  const report = compileUkMtdVatReturn({
    year: 2026,
    quarter: "Q3",
    taxpayerVrn: "GB 999 9999 73",
    taxpayerLegalName: "Genesoft Technologies UK Ltd",
    invoices: [],
    bills: [],
  })

  const jsonExport = formatUkMtdJson(report) as any
  assert(jsonExport.vrn === "999999973", "MTD JSON contains stripped 9-digit VRN")
  assert(jsonExport.finalised === true, "MTD JSON has finalised flag")

  const csvExport = formatUkMtdCsv(report)
  assert(csvExport.includes("HM REVENUE & CUSTOMS - MAKING TAX DIGITAL"), "CSV header present")
  assert(csvExport.includes("GB 999 9999 73"), "CSV contains VRN")
  assert(csvExport.includes('"Box 1","VAT due in the period on sales and other outputs"'), "CSV contains Box 1")
  assert(csvExport.includes('"Box 5","NET VAT TO PAY TO HMRC OR RECLAIM (Box 3 - Box 4)"'), "CSV contains Box 5")
}

console.log("\n=======================================================")
console.log("  ALL UK (HMRC) VAT & MTD TESTS PASSED!                ")
console.log("=======================================================\n")
