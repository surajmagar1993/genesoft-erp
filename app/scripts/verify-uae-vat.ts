/**
 * verify-uae-vat.ts
 * Comprehensive Verification Test Suite for UAE VAT Engine (Form VAT201 & FTA Compliance).
 * Run with: npx tsx scripts/verify-uae-vat.ts
 */

import {
  UAE_STANDARD_VAT_RATE,
  UAE_EMIRATES,
  normalizeUaeEmirate,
  validateUaeTrn,
  getUaeVatPeriod,
  compileFormVat201,
  formatUaeVat201Json,
  formatUaeVat201Csv,
  RawUaeInvoice,
  RawUaeBill,
} from "../src/lib/uae-vat-engine"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

console.log("\n=======================================================")
console.log("  UAE VAT & FORM VAT201 ENGINE VERIFICATION SUITE")
console.log("  Federal Decree-Law No. (8) of 2017 & FTA Guidelines")
console.log("=======================================================\n")

// ── Test 1: Statutory TRN Validation ──────────────────────────────────────────
console.log("▶ 1. TRN (Tax Registration Number) Validation:")
{
  // Valid 15-digit TRN starting with 100
  const v1 = validateUaeTrn("100123456789012")
  assert(v1.isValid === true, "Valid 15-digit TRN starting with 100 passes")
  assert(v1.formattedTrn === "100123456789012", "Formatted TRN correct")

  // Valid formatted with spaces and hyphens
  const v2 = validateUaeTrn("100 1234-5678-9012")
  assert(v2.isValid === true, "TRN with spaces and hyphens correctly sanitized")
  assert(v2.formattedTrn === "100123456789012", "Sanitized TRN is 15 digits")

  // Invalid: Does not start with 100
  const v3 = validateUaeTrn("200123456789012")
  assert(v3.isValid === false, "TRN not starting with '100' fails")
  assert(v3.error?.includes("100") === true, "Error message explains must start with 100")

  // Invalid: Too short
  const v4 = validateUaeTrn("100123456")
  assert(v4.isValid === false, "TRN with 9 digits fails")

  // Invalid: Too long
  const v5 = validateUaeTrn("10012345678901234")
  assert(v5.isValid === false, "TRN with 17 digits fails")

  // Invalid: Alphanumeric
  const v6 = validateUaeTrn("100ABC456789012")
  assert(v6.isValid === false, "Alphanumeric TRN fails digits-only test")

  // Invalid: Empty or null
  const v7 = validateUaeTrn("")
  assert(v7.isValid === false, "Empty TRN fails")
  const v8 = validateUaeTrn(null)
  assert(v8.isValid === false, "Null TRN fails")
}

// ── Test 2: The 7 Emirates Normalization ───────────────────────────────────────
console.log("\n▶ 2. The 7 Emirates Normalization:")
{
  assert(UAE_EMIRATES.length === 7, "Total 7 Emirates defined")
  assert(normalizeUaeEmirate("Abu Dhabi") === "Abu Dhabi", "Abu Dhabi exact match")
  assert(normalizeUaeEmirate("AUH International") === "Abu Dhabi", "AUH code maps to Abu Dhabi")
  assert(normalizeUaeEmirate("Al Ain Branch") === "Abu Dhabi", "Al Ain maps to Abu Dhabi")
  assert(normalizeUaeEmirate("Dubai Media City") === "Dubai", "Dubai recognized")
  assert(normalizeUaeEmirate("DXB Airport Freezone") === "Dubai", "DXB maps to Dubai")
  assert(normalizeUaeEmirate("SHJ Industrial") === "Sharjah", "SHJ maps to Sharjah")
  assert(normalizeUaeEmirate("Ajman Free Zone") === "Ajman", "Ajman recognized")
  assert(normalizeUaeEmirate("UAQ Free Trade Zone") === "Umm Al Quwain", "UAQ maps to Umm Al Quwain")
  assert(normalizeUaeEmirate("RAK Economic Zone") === "Ras Al Khaimah", "RAK maps to Ras Al Khaimah")
  assert(normalizeUaeEmirate("Fujairah Port") === "Fujairah", "Fujairah recognized")
  assert(normalizeUaeEmirate("Unknown Place") === "Dubai", "Unrecognized defaults to Dubai")
  assert(normalizeUaeEmirate(null) === "Dubai", "Null defaults to Dubai")
}

// ── Test 3: Tax Periods & Statutory Due Dates (28th of following month) ────────
console.log("\n▶ 3. Tax Periods & Statutory Filing Deadlines (28th):")
{
  const p1 = getUaeVatPeriod(2026, "Q1")
  assert(p1.startDate === "2026-01-01" && p1.endDate === "2026-03-31", "Q1 start & end dates")
  assert(p1.dueDate === "2026-04-28", "Q1 deadline is 28 April")

  const p2 = getUaeVatPeriod(2026, "Q2")
  assert(p2.dueDate === "2026-07-28", "Q2 deadline is 28 July")

  const p3 = getUaeVatPeriod(2026, "Q3")
  assert(p3.dueDate === "2026-10-28", "Q3 deadline is 28 October")

  const p4 = getUaeVatPeriod(2026, "Q4")
  assert(p4.dueDate === "2027-01-28", "Q4 deadline is 28 January of following year")
}

// ── Test 4: Form VAT201 Compilation & Box Calculations ─────────────────────────
console.log("\n▶ 4. Form VAT201 Full Aggregation Engine:")
{
  const period = getUaeVatPeriod(2026, "Q3")

  // Mock Outward Invoices
  const invoices: RawUaeInvoice[] = [
    // Invoice 1: Dubai Standard Rated (10,000 AED + 5% = 500 AED)
    {
      id: "inv-1",
      invoiceNumber: "INV-DXB-001",
      invoiceDate: "2026-07-15",
      type: "TAX_INVOICE",
      status: "PAID",
      subtotal: 10000,
      taxAmount: 500,
      total: 10500,
      placeOfSupply: "Dubai",
      contact: {
        companyName: "Emirates Retail LLC",
        trn: "100987654321001",
      },
      items: [
        {
          id: "it-1",
          description: "Consulting Services",
          quantity: 1,
          unitPrice: 10000,
          vatRate: 5,
          vatAmount: 500,
          lineTotal: 10000,
        },
      ],
    },
    // Invoice 2: Abu Dhabi Standard Rated (20,000 AED + 5% = 1,000 AED)
    {
      id: "inv-2",
      invoiceNumber: "INV-AUH-002",
      invoiceDate: "2026-08-10",
      type: "TAX_INVOICE",
      status: "SENT",
      subtotal: 20000,
      taxAmount: 1000,
      total: 21000,
      placeOfSupply: "Abu Dhabi",
      contact: {
        companyName: "Capital Supplies PJSC",
        trn: "100555444333222",
      },
      items: [
        {
          id: "it-2",
          description: "Hardware Infrastructure",
          quantity: 2,
          unitPrice: 10000,
          vatRate: 5,
          vatAmount: 1000,
          lineTotal: 20000,
        },
      ],
    },
    // Invoice 3: Zero-Rated Export to UK (15,000 AED @ 0% VAT = 0 AED) -> Box 4
    {
      id: "inv-3",
      invoiceNumber: "INV-EXP-003",
      invoiceDate: "2026-08-22",
      type: "EXPORT",
      status: "PAID",
      subtotal: 15000,
      taxAmount: 0,
      total: 15000,
      placeOfSupply: "United Kingdom",
      contact: {
        companyName: "London Tech Ltd",
        trn: null,
      },
      items: [
        {
          id: "it-3",
          description: "Export Software Engineering Services",
          quantity: 1,
          unitPrice: 15000,
          vatRate: 0,
          vatAmount: 0,
          lineTotal: 15000,
        },
      ],
    },
    // Invoice 4: Exempt Supply (Local Financial Services) (5,000 AED) -> Box 5
    {
      id: "inv-4",
      invoiceNumber: "INV-EXM-004",
      invoiceDate: "2026-09-05",
      type: "EXEMPT",
      status: "PAID",
      subtotal: 5000,
      taxAmount: 0,
      total: 5000,
      placeOfSupply: "Dubai",
      contact: {
        companyName: "Al Hilal Microfinance",
        trn: null,
      },
      items: [
        {
          id: "it-4",
          description: "Exempt Life Insurance / Financial Service",
          quantity: 1,
          unitPrice: 5000,
          vatRate: 0,
          vatAmount: 0,
          lineTotal: 5000,
        },
      ],
    },
  ]

  // Mock Inward Bills & Expenses
  const bills: RawUaeBill[] = [
    // Bill 1: Local standard-rated domestic expense (8,000 AED + 5% = 400 AED recoverable) -> Box 9
    {
      id: "bill-1",
      billNumber: "BILL-LOC-101",
      billDate: "2026-07-20",
      status: "PAID",
      subtotal: 8000,
      taxAmount: 400,
      total: 8400,
      contact: {
        companyName: "Etisalat / e& UAE",
        trn: "100111222333444",
      },
      items: [
        {
          id: "bi-1",
          description: "Telecom and Fiber Internet",
          quantity: 1,
          unitPrice: 8000,
          taxPercent: 5,
          taxAmount: 400,
          lineTotal: 8000,
        },
      ],
    },
    // Bill 2: Article 48 RCM Cross-Border Inward Supply (AWS US Cloud Hosting)
    // 6,000 AED taxable -> 5% = 300 AED. Must appear in Box 3 (Output) and Box 10 (Recoverable Input)
    {
      id: "bill-2",
      billNumber: "BILL-AWS-102",
      billDate: "2026-08-15",
      status: "PAID",
      subtotal: 6000,
      taxAmount: 0, // Not charged on foreign invoice, self-assessed under Article 48
      total: 6000,
      notes: "Subject to Article 48 Reverse Charge Mechanism (RCM)",
      contact: {
        companyName: "Amazon Web Services Inc.",
        trn: null, // Foreign supplier
      },
      items: [
        {
          id: "bi-2",
          description: "Cloud Compute & Server Hosting",
          quantity: 1,
          unitPrice: 6000,
          taxPercent: 0,
          taxAmount: 0,
          lineTotal: 6000,
        },
      ],
    },
  ]

  const report = compileFormVat201({
    year: 2026,
    quarter: "Q3",
    taxpayerTrn: "100111999888777",
    taxpayerLegalName: "Genesoft ERP Middle East FZ-LLC",
    taxpayerAddress: "Dubai Internet City, Dubai, UAE",
    invoices,
    bills,
  })

  // Verify Box 1 Emirate Apportionment
  const boxAbuDhabi = report.box1Emirates.find((e) => e.emirate === "Abu Dhabi")!
  const boxDubai = report.box1Emirates.find((e) => e.emirate === "Dubai")!

  assert(boxAbuDhabi.taxableAmount === 20000, "Box 1a (Abu Dhabi) Taxable is 20,000 AED")
  assert(boxAbuDhabi.vatAmount === 1000, "Box 1a (Abu Dhabi) VAT is 1,000 AED")
  assert(boxDubai.taxableAmount === 10000, "Box 1b (Dubai) Taxable is 10,000 AED")
  assert(boxDubai.vatAmount === 500, "Box 1b (Dubai) VAT is 500 AED")

  assert(report.box1TotalTaxable === 30000, "Box 1 Total Taxable is 30,000 AED (Abu Dhabi + Dubai)")
  assert(report.box1TotalVat === 1500, "Box 1 Total VAT is 1,500 AED (Abu Dhabi + Dubai)")

  // Verify Box 3 Reverse Charge Output
  assert(report.box3ReverseChargeOutput.taxableAmount === 6000, "Box 3 RCM Taxable Amount is 6,000 AED")
  assert(report.box3ReverseChargeOutput.vatAmount === 300, "Box 3 RCM Output VAT is 300 AED (5% of 6,000)")

  // Verify Box 4 Zero-Rated Supplies
  assert(report.box4ZeroRated.taxableAmount === 15000, "Box 4 Zero-rated export taxable is 15,000 AED")

  // Verify Box 5 Exempt Supplies
  assert(report.box5Exempt.taxableAmount === 5000, "Box 5 Exempt supplies taxable is 5,000 AED")

  // Verify Box 6 Total Output VAT (Box 1 VAT + Box 3 VAT = 1,500 + 300 = 1,800 AED)
  assert(report.box6TotalOutputTaxDue === 1800, `Box 6 Total Output VAT is 1,800 AED (got ${report.box6TotalOutputTaxDue})`)

  // Verify Box 9 Standard Rated Inward Recoverable Tax (8,000 AED @ 5% = 400 AED)
  assert(report.box9StandardRatedPurchases.taxableAmount === 8000, "Box 9 Taxable Expenses is 8,000 AED")
  assert(report.box9StandardRatedPurchases.recoverableVat === 400, "Box 9 Recoverable VAT is 400 AED")

  // Verify Box 10 Article 48 RCM Inward Recoverable Tax (6,000 AED @ 5% = 300 AED)
  assert(report.box10ReverseChargeInput.taxableAmount === 6000, "Box 10 RCM Taxable is 6,000 AED")
  assert(report.box10ReverseChargeInput.recoverableVat === 300, "Box 10 RCM Recoverable VAT is 300 AED")

  // Verify Box 12 Total Recoverable Input VAT (Box 9 + Box 10 = 400 + 300 = 700 AED)
  assert(report.box12TotalRecoverableTax === 700, `Box 12 Total Recoverable VAT is 700 AED (got ${report.box12TotalRecoverableTax})`)

  // Verify Box 13 Net VAT Payable (Box 6 - Box 12 = 1,800 - 700 = 1,100 AED Payable)
  assert(report.box13NetVatPayable === 1100, `Box 13 Net VAT Payable is 1,100 AED (got ${report.box13NetVatPayable})`)

  // ── Test 5: FTA EmaraTax Exporters ──────────────────────────────────────────
  console.log("\n▶ 5. FTA EmaraTax Portal JSON & CSV Formats:")
  const jsonExport = formatUaeVat201Json(report) as any

  assert(jsonExport.taxpayer_trn === "100111999888777", "JSON contains Taxpayer TRN")
  assert(jsonExport.tax_period === "2026-Q3", "JSON contains Tax Period")
  assert(jsonExport.form_vat_201.vat_on_sales.box_6_total_output_tax_due === 1800, "JSON contains Box 6 output VAT")
  assert(jsonExport.form_vat_201.vat_on_expenses.box_12_total_recoverable_tax === 700, "JSON contains Box 12 input VAT")
  assert(jsonExport.form_vat_201.net_vat_due.box_13_net_vat_payable_or_reclaimable === 1100, "JSON contains Box 13 net payable")

  const csvExport = formatUaeVat201Csv(report)
  assert(csvExport.includes("UAE FEDERAL TAX AUTHORITY - FORM VAT 201"), "CSV header present")
  assert(csvExport.includes("100111999888777"), "CSV contains TRN")
  assert(csvExport.includes('"Box 1b","Standard Rated Supplies in Dubai",10000.00,500.00'), "CSV contains Box 1b Dubai row")
  assert(csvExport.includes('"Box 13","Net VAT Payable / (Reclaimable)",-,1100.00'), "CSV contains Box 13 summary row")
}

console.log("\n=======================================================")
console.log("  ALL UAE VAT VERIFICATION TESTS PASSED SUCCESSFULLY!  ")
console.log("=======================================================\n")
