/**
 * verify-australia-tax.ts
 * Comprehensive Verification Test Suite for Australian ATO GST, ABN Modulus 89, and BAS Activity Statement.
 * Run with: npx tsx scripts/verify-australia-tax.ts
 */

import {
  AU_STANDARD_GST_RATE,
  validateAustralianAbn,
  getAustralianBasPeriod,
  compileAustralianBas,
  formatAustralianBasJson,
  formatAustralianBasCsv,
  RawAuInvoice,
  RawAuBill,
} from "../src/lib/australia-tax-engine"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

console.log("\n=======================================================")
console.log("  AUSTRALIA (ATO) GST & BAS VERIFICATION SUITE")
console.log("  A New Tax System (GST) Act 1999 & ATO Modulus 89 Check")
console.log("=======================================================\n")

// ── Test 1: ABN Modulus 89 Validation ─────────────────────────────────────────
console.log("▶ 1. ABN (Australian Business Number) Modulus 89 Algorithm:")
{
  // Valid ABN: Dept of Prime Minister & Cabinet (51 824 753 556)
  const v1 = validateAustralianAbn("51 824 753 556")
  assert(v1.isValid === true, "Valid 11-digit ABN passes Modulus 89")
  assert(v1.formattedAbn === "51 824 753 556", "Formatted standard ABN correct")

  // Valid ABN: Telstra Corporation (33 051 775 556)
  const v2 = validateAustralianAbn("33051775556")
  assert(v2.isValid === true, "Telstra Corporation unformatted ABN passes Modulus 89")
  assert(v2.formattedAbn === "33 051 775 556", "Telstra ABN formatted correctly")

  // Invalid: Failed checksum (change last digit of valid ABN)
  const v3 = validateAustralianAbn("51 824 753 557")
  assert(v3.isValid === false, "Incorrect checksum fails Modulus 89")
  assert(v3.error?.includes("Modulus 89") === true, "Error message specifies Modulus 89")

  // Invalid: Not 11 digits
  const v4 = validateAustralianAbn("51 824 753 55")
  assert(v4.isValid === false, "10-digit number fails length check")

  const v5 = validateAustralianAbn("51 824 753 5560")
  assert(v5.isValid === false, "12-digit number fails length check")

  // Invalid: Alphanumeric
  const v6 = validateAustralianAbn("51 ABC 753 556")
  assert(v6.isValid === false, "Alphanumeric string fails numeric check")

  // Empty or null
  const v7 = validateAustralianAbn("")
  assert(v7.isValid === false, "Empty string fails")
  const v8 = validateAustralianAbn(null)
  assert(v8.isValid === false, "Null fails")
}

// ── Test 2: Australian Financial Year (July to June) & BAS Quarters ───────────
console.log("\n▶ 2. Australian FY Cycle & BAS Quarterly Deadlines:")
{
  // FY 2026-27 Q1: Jul 1 to Sep 30, due Oct 28
  const p1 = getAustralianBasPeriod(2026, "Q1")
  assert(p1.fyLabel === "FY 2026-27", "FY label is FY 2026-27")
  assert(p1.startDate === "2026-07-01" && p1.endDate === "2026-09-30", "Q1 date range")
  assert(p1.dueDate === "2026-10-28", "Q1 due 28 October")

  // Q2: Oct 1 to Dec 31, due 28 February (ATO Christmas extension!)
  const p2 = getAustralianBasPeriod(2026, "Q2")
  assert(p2.dueDate === "2027-02-28", "Q2 has ATO statutory extension to 28 February")

  // Q3: Jan 1 to Mar 31, due 28 April
  const p3 = getAustralianBasPeriod(2026, "Q3")
  assert(p3.dueDate === "2027-04-28", "Q3 due 28 April")

  // Q4: Apr 1 to Jun 30, due 28 July
  const p4 = getAustralianBasPeriod(2026, "Q4")
  assert(p4.dueDate === "2027-07-28", "Q4 due 28 July")
}

// ── Test 3: ATO Business Activity Statement (BAS) Compilation ─────────────────
console.log("\n▶ 3. Official ATO BAS Form Calculation (G1 to 9 & PAYG):")
{
  const invoices: RawAuInvoice[] = [
    // Invoice 1: Taxable local sales ($11,000 incl. 10% GST = $10,000 + $1,000 GST)
    {
      id: "inv-1",
      invoiceNumber: "INV-AU-001",
      invoiceDate: "2026-07-15",
      type: "TAX_INVOICE",
      status: "PAID",
      subtotal: 10000,
      taxAmount: 1000,
      total: 11000,
      contact: {
        companyName: "Melbourne Retail Ltd",
        trn: "33 051 775 556", // Valid ABN
      },
    },
    // Invoice 2: Export sales ($5,000 GST-free) -> G2
    {
      id: "inv-2",
      invoiceNumber: "INV-EXP-002",
      invoiceDate: "2026-08-10",
      type: "EXPORT",
      status: "PAID",
      subtotal: 5000,
      taxAmount: 0,
      total: 5000,
    },
    // Invoice 3: Other GST-free sales (Medical / Education $3,000) -> G3
    {
      id: "inv-3",
      invoiceNumber: "INV-FREE-003",
      invoiceDate: "2026-08-20",
      type: "GST_FREE",
      status: "PAID",
      subtotal: 3000,
      taxAmount: 0,
      total: 3000,
    },
    // Invoice 4: Input Taxed Sales ($2,000 residential rent / financial) -> G4
    {
      id: "inv-4",
      invoiceNumber: "INV-INP-004",
      invoiceDate: "2026-09-05",
      type: "INPUT_TAXED",
      status: "PAID",
      subtotal: 2000,
      taxAmount: 0,
      total: 2000,
    },
  ]

  const bills: RawAuBill[] = [
    // Bill 1: Capital Purchases ($4,400 incl. $400 GST for laptops) -> G10
    {
      id: "bill-1",
      billNumber: "BILL-CAP-001",
      billDate: "2026-07-25",
      status: "PAID",
      subtotal: 4000,
      taxAmount: 400,
      total: 4400,
      notes: "Capital Asset Laptop Equipment",
    },
    // Bill 2: Non-capital Purchases ($2,200 incl. $200 GST for office utilities) -> G11
    {
      id: "bill-2",
      billNumber: "BILL-NONCAP-002",
      billDate: "2026-08-15",
      status: "PAID",
      subtotal: 2000,
      taxAmount: 200,
      total: 2200,
    },
  ]

  const payg = {
    grossWages: 25000, // W1
    taxWithheld: 5500, // W2
  }

  const report = compileAustralianBas({
    startYear: 2026,
    quarter: "Q1",
    taxpayerAbn: "51 824 753 556",
    taxpayerLegalName: "Genesoft ERP Australia Pty Ltd",
    invoices,
    bills,
    payg,
  })

  // Verify G1 to G4
  assert(report.g1TotalSales === 21000, "G1 Total Sales is $21,000 (11,000 + 5,000 + 3,000 + 2,000)")
  assert(report.g2ExportSales === 5000, "G2 Export Sales is $5,000")
  assert(report.g3OtherGstFreeSales === 3000, "G3 Other GST-free Sales is $3,000")
  assert(report.g4InputTaxedSales === 2000, "G4 Input Taxed Sales is $2,000")
  assert(report.taxableSalesInclusive === 11000, "Taxable Sales Inclusive is $11,000")

  // Verify Purchases
  assert(report.g10CapitalPurchases === 4400, "G10 Capital Purchases is $4,400")
  assert(report.g11NonCapitalPurchases === 2200, "G11 Non-Capital Purchases is $2,200")
  assert(report.totalPurchasesInclusive === 6600, "Total Purchases is $6,600")

  // Verify 1A, 1B, 9
  assert(report.box1AGstOnSales === 1000, "1A: GST on Sales is $1,000")
  assert(report.box1BGstOnPurchases === 600, "1B: GST on Purchases is $600 (400 + 200)")
  assert(report.box9NetGst === 400, "9: Net GST Payable is $400 (1,000 - 600)")

  // Verify PAYG W1, W2, 8A
  assert(report.boxW1GrossWages === 25000, "W1 Gross Wages is $25,000")
  assert(report.boxW2TaxWithheld === 5500, "W2 Tax Withheld is $5,500")
  assert(report.box8ATotalOwedToAto === 5900, "8A Total Owed to ATO is $5,900 (Net GST $400 + PAYG $5,500)")
}

// ── Test 4: ATO Exporters (JSON & CSV) ─────────────────────────────────────────
console.log("\n▶ 4. ATO BAS Exporters:")
{
  const report = compileAustralianBas({
    startYear: 2026,
    quarter: "Q1",
    taxpayerAbn: "51 824 753 556",
    taxpayerLegalName: "Genesoft ERP Australia Pty Ltd",
    invoices: [],
    bills: [],
  })

  const jsonExport = formatAustralianBasJson(report) as any
  assert(jsonExport.agency === "ATO", "JSON agency is ATO")
  assert(jsonExport.taxpayer.abn === "51 824 753 556", "JSON contains ABN")

  const csvExport = formatAustralianBasCsv(report)
  assert(csvExport.includes("AUSTRALIAN TAXATION OFFICE - BUSINESS ACTIVITY STATEMENT"), "CSV header present")
  assert(csvExport.includes("51 824 753 556"), "CSV contains ABN")
  assert(csvExport.includes('"1A","GST on Sales (GST collected)"'), "CSV contains 1A label")
  assert(csvExport.includes('"9","Net GST (1A minus 1B)"'), "CSV contains 9 Net GST label")
}

console.log("\n=======================================================")
console.log("  ALL AUSTRALIA (ATO) GST TESTS PASSED!                ")
console.log("=======================================================\n")
