/**
 * verify-ksa-zatca.ts
 * Comprehensive Verification Test Suite for Saudi Arabia (KSA) VAT (15%),
 * ZATCA E-Invoicing (Fatoora Phase 1 & 2), TLV Base64 QR Code, and Zakat Engine.
 * Run with: npx tsx scripts/verify-ksa-zatca.ts
 */

import {
  KSA_STANDARD_VAT_RATE,
  ZAKAT_RATE_HIJRI,
  ZAKAT_RATE_GREGORIAN,
  validateKsaVatNumber,
  encodeZatcaTlv,
  decodeZatcaTlv,
  generateZatcaUblXml,
  compileKsaVatReturn,
  getKsaVatPeriod,
  calculateZakatBase,
  formatKsaVatReturnJson,
  formatKsaVatReturnCsv,
  RawKsaInvoice,
  RawKsaBill,
} from "../src/lib/ksa-zatca-engine"

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`)
    process.exit(1)
  }
  console.log(`  ✓ ${message}`)
}

console.log("\n=======================================================")
console.log("  SAUDI ARABIA (KSA) VAT & ZATCA VERIFICATION SUITE")
console.log("  Royal Order A/638, ZATCA Resolution 19804 & Res. 2216")
console.log("=======================================================\n")

// ── Test 1: ZATCA 15-digit VAT Number Validation ──────────────────────────────
console.log("▶ 1. ZATCA VAT Registration Number Validation (15 digits, 3...3):")
{
  // Valid 15-digit starting and ending with 3
  const v1 = validateKsaVatNumber("300123456789003")
  assert(v1.isValid === true, "Valid 15-digit VAT number starting and ending with 3 passes")
  assert(v1.formattedVatNumber === "300123456789003", "Formatted VAT number correct")

  // Valid formatted with spaces and hyphens
  const v2 = validateKsaVatNumber("300-1234-5678-9003")
  assert(v2.isValid === true, "VAT number with hyphens and spaces cleansed properly")
  assert(v2.formattedVatNumber === "300123456789003", "Cleansed VAT number matches")

  // Invalid: Does not start with 3
  const v3 = validateKsaVatNumber("100123456789003")
  assert(v3.isValid === false, "VAT number not starting with 3 fails")
  assert(v3.error?.includes("start with digit '3'") === true, "Error states must start with 3")

  // Invalid: Does not end with 3
  const v4 = validateKsaVatNumber("300123456789001")
  assert(v4.isValid === false, "VAT number not ending with 3 fails")
  assert(v4.error?.includes("end with digit '3'") === true, "Error states must end with 3")

  // Invalid: Too short
  const v5 = validateKsaVatNumber("3001234563")
  assert(v5.isValid === false, "10-digit VAT number fails")

  // Invalid: Too long
  const v6 = validateKsaVatNumber("300123456789012343")
  assert(v6.isValid === false, "18-digit VAT number fails")

  // Invalid: Alphanumeric
  const v7 = validateKsaVatNumber("300ABC456789003")
  assert(v7.isValid === false, "Alphanumeric VAT number fails numeric test")

  // Invalid: Empty or null
  const v8 = validateKsaVatNumber("")
  assert(v8.isValid === false, "Empty VAT number fails")
  const v9 = validateKsaVatNumber(null)
  assert(v9.isValid === false, "Null VAT number fails")
}

// ── Test 2: ZATCA TLV Base64 QR Code Encoding & Decoding ──────────────────────
console.log("\n▶ 2. ZATCA TLV Base64 QR Code (Tags 1–5):")
{
  const testSeller = "شركة جينسوفت للتقنية المحدودة" // Arabic UTF-8 name
  const testVat = "310123456789003"
  const testTimestamp = "2026-09-12T14:30:00Z"
  const testTotal = 1150.0
  const testVatAmount = 150.0

  // Encode TLV
  const base64Qr = encodeZatcaTlv({
    sellerName: testSeller,
    vatNumber: testVat,
    invoiceTimestamp: testTimestamp,
    invoiceTotal: testTotal,
    vatTotal: testVatAmount,
  })

  assert(typeof base64Qr === "string" && base64Qr.length > 20, "Base64 TLV payload generated")

  // Decode TLV
  const decoded = decodeZatcaTlv(base64Qr)
  assert(decoded.isValid === true, "Decoded TLV payload passes statutory verification")
  assert(decoded.tags.length === 5, "Exactly 5 tags extracted")
  assert(decoded.sellerName === testSeller, "Tag 1: UTF-8 Arabic seller name matches exactly")
  assert(decoded.vatNumber === testVat, "Tag 2: VAT Registration Number matches")
  assert(decoded.invoiceTimestamp === testTimestamp, "Tag 3: ISO 8601 Timestamp matches")
  assert(decoded.invoiceTotal === 1150.0, "Tag 4: Invoice Total matches")
  assert(decoded.vatTotal === 150.0, "Tag 5: VAT Total matches")

  // Corrupted Buffer Handling
  const corrupted = decodeZatcaTlv("AQIDBAU=") // Truncated/corrupted
  assert(corrupted.isValid === false, "Corrupted TLV payload handled gracefully")
}

// ── Test 3: ZATCA UBL 2.1 E-Invoicing XML Generation ───────────────────────────
console.log("\n▶ 3. ZATCA UBL 2.1 XML Generator:")
{
  const xml = generateZatcaUblXml({
    invoiceNumber: "INV-KSA-2026-001",
    invoiceUuid: "9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d",
    invoiceDate: "2026-09-12",
    invoiceTime: "14:30:00",
    invoiceType: "STANDARD",
    seller: {
      legalName: "Genesoft Middle East KSA LLC",
      vatNumber: "310123456789003",
      street: "King Fahd Road",
      postalZone: "12211",
      city: "Riyadh",
    },
    buyer: {
      legalName: "Al Rajhi Enterprise Solutions",
      vatNumber: "300987654321003",
      city: "Riyadh",
    },
    subtotal: 10000,
    vatAmount: 1500,
    total: 11500,
    items: [
      {
        id: "1",
        name: "ERP Enterprise Cloud License",
        quantity: 1,
        unitPrice: 10000,
        vatRate: 15.0,
        vatAmount: 1500,
        lineTotal: 10000,
      },
    ],
  })

  assert(xml.includes("<Invoice xmlns="), "UBL 2.1 root Invoice element present")
  assert(xml.includes("<cbc:ProfileID>reporting:1.0</cbc:ProfileID>"), "ZATCA ProfileID reporting:1.0 present")
  assert(xml.includes('name="0100000">388</cbc:InvoiceTypeCode>'), "Standard B2B invoice subtype code 0100000 present")
  assert(xml.includes("310123456789003"), "Seller VAT Number present in PartyTaxScheme")
  assert(xml.includes("300987654321003"), "Buyer VAT Number present in PartyTaxScheme")
  assert(xml.includes("<cbc:Percent>15.00</cbc:Percent>"), "15.00% VAT rate in TaxCategory")
}

// ── Test 4: KSA VAT Return Compilation (15% Standard Rate) ────────────────────
console.log("\n▶ 4. KSA VAT Return Declaration Engine:")
{
  const period = getKsaVatPeriod(2026, "Q3")
  assert(period.dueDate === "2026-10-31", "Q3 filing deadline is 31 October")

  const invoices: RawKsaInvoice[] = [
    // Invoice 1: Standard B2B (50,000 SAR + 15% = 7,500 SAR VAT)
    {
      id: "inv-1",
      invoiceNumber: "INV-001",
      invoiceDate: "2026-07-20",
      type: "TAX_INVOICE",
      status: "PAID",
      subtotal: 50000,
      taxAmount: 7500,
      total: 57500,
      contact: {
        companyName: "Saudi Aramco Supplier",
        trn: "300555444333003",
      },
      items: [
        {
          id: "it-1",
          description: "Industrial Networking Equipment",
          quantity: 1,
          unitPrice: 50000,
          vatRate: 15,
          vatAmount: 7500,
          lineTotal: 50000,
        },
      ],
    },
    // Invoice 2: Export Outside GCC (20,000 SAR @ 0% VAT = 0 SAR)
    {
      id: "inv-2",
      invoiceNumber: "INV-EXP-002",
      invoiceDate: "2026-08-14",
      type: "EXPORT",
      status: "PAID",
      subtotal: 20000,
      taxAmount: 0,
      total: 20000,
      contact: {
        companyName: "Global Tech Inc.",
        trn: null,
      },
      items: [
        {
          id: "it-2",
          description: "Export Software Engineering",
          quantity: 1,
          unitPrice: 20000,
          vatRate: 0,
          vatAmount: 0,
          lineTotal: 20000,
        },
      ],
    },
    // Invoice 3: Exempt Supply (10,000 SAR)
    {
      id: "inv-3",
      invoiceNumber: "INV-EXM-003",
      invoiceDate: "2026-09-02",
      type: "EXEMPT",
      status: "PAID",
      subtotal: 10000,
      taxAmount: 0,
      total: 10000,
      contact: {
        companyName: "Al Rajhi Real Estate Lease",
        trn: null,
      },
      items: [
        {
          id: "it-3",
          description: "Exempt Residential Lease",
          quantity: 1,
          unitPrice: 10000,
          vatRate: 0,
          vatAmount: 0,
          lineTotal: 10000,
        },
      ],
    },
  ]

  const bills: RawKsaBill[] = [
    // Bill 1: Domestic standard purchases (30,000 SAR + 15% = 4,500 SAR recoverable)
    {
      id: "b-1",
      billNumber: "BILL-001",
      billDate: "2026-07-25",
      status: "PAID",
      subtotal: 30000,
      taxAmount: 4500,
      total: 34500,
      contact: {
        companyName: "STC Telecom KSA",
        trn: "300111222333003",
      },
      items: [
        {
          id: "bi-1",
          description: "Corporate Fiber Internet",
          quantity: 1,
          unitPrice: 30000,
          taxPercent: 15,
          taxAmount: 4500,
          lineTotal: 30000,
        },
      ],
    },
    // Bill 2: Imports subject to VAT at customs (10,000 SAR + 15% = 1,500 SAR recoverable)
    {
      id: "b-2",
      billNumber: "BILL-IMP-002",
      billDate: "2026-08-10",
      status: "PAID",
      subtotal: 10000,
      taxAmount: 1500,
      total: 11500,
      notes: "Customs Import Declaration Entry #44890",
      items: [
        {
          id: "bi-2",
          description: "Imported Server Hardware",
          quantity: 1,
          unitPrice: 10000,
          taxPercent: 15,
          taxAmount: 1500,
          lineTotal: 10000,
        },
      ],
    },
  ]

  const report = compileKsaVatReturn({
    year: 2026,
    quarter: "Q3",
    taxpayerVatNumber: "310123456789003",
    taxpayerLegalName: "Genesoft Technologies KSA LLC",
    invoices,
    bills,
  })

  assert(report.salesStandardRated.taxableAmount === 50000, "Standard Sales Taxable is 50,000 SAR")
  assert(report.salesStandardRated.vatAmount === 7500, "Standard Output VAT is 7,500 SAR (15%)")
  assert(report.salesZeroRatedExports.taxableAmount === 20000, "Zero-Rated Exports Taxable is 20,000 SAR")
  assert(report.salesExempt.taxableAmount === 10000, "Exempt Sales Taxable is 10,000 SAR")
  assert(report.totalOutputVat === 7500, "Total Output VAT is 7,500 SAR")

  assert(report.purchasesStandardRated.taxableAmount === 30000, "Standard Purchases Taxable is 30,000 SAR")
  assert(report.purchasesStandardRated.recoverableVat === 4500, "Standard Recoverable VAT is 4,500 SAR")
  assert(report.purchasesImports.taxableAmount === 10000, "Import Purchases Taxable is 10,000 SAR")
  assert(report.purchasesImports.recoverableVat === 1500, "Import Recoverable VAT is 1,500 SAR")
  assert(report.totalRecoverableInputVat === 6000, "Total Recoverable Input VAT is 6,000 SAR (4,500 + 1,500)")

  assert(report.netVatDue === 1500, "Net VAT Due to ZATCA is 1,500 SAR (7,500 - 6,000)")
}

// ── Test 5: Statutory Zakat Calculation Engine ─────────────────────────────────
console.log("\n▶ 5. Statutory Zakat Calculation Engine (Res. 2216):")
{
  const zakatInputs = {
    calendarType: "HIJRI" as const,
    paidUpCapital: 1000000,
    retainedEarnings: 200000,
    statutoryReserves: 100000,
    longTermLiabilities: 150000,
    adjustedNetProfit: 250000,
    netFixedAssets: 350000,
    longTermInvestments: 100000,
  }

  // Hijri calculation (2.5%)
  const zakatHijri = calculateZakatBase(zakatInputs)
  assert(zakatHijri.totalAdditions === 1700000, "Total Additions is 1,700,000 SAR")
  assert(zakatHijri.totalDeductions === 450000, "Total Deductions is 450,000 SAR")
  assert(zakatHijri.zakatBase === 1250000, "Zakat Base is 1,250,000 SAR (1,700,000 - 450,000)")
  assert(zakatHijri.calculatedZakat === 31250, "Hijri Zakat Due is 31,250 SAR (2.5% of 1,250,000)")

  // Gregorian calculation (2.5775%)
  const zakatGregorian = calculateZakatBase({
    ...zakatInputs,
    calendarType: "GREGORIAN",
  })
  assert(zakatGregorian.zakatRate === ZAKAT_RATE_GREGORIAN, "Gregorian rate 2.5775% applied")
  assert(zakatGregorian.calculatedZakat === 32218.75, "Gregorian Zakat Due is 32,218.75 SAR")
}

// ── Test 6: ZATCA Return Exporters (JSON & CSV) ────────────────────────────────
console.log("\n▶ 6. ZATCA Return Portal Exporters:")
{
  const report = compileKsaVatReturn({
    year: 2026,
    quarter: "Q3",
    taxpayerVatNumber: "310123456789003",
    taxpayerLegalName: "Genesoft Technologies KSA LLC",
    invoices: [],
    bills: [],
  })

  const jsonExport = formatKsaVatReturnJson(report) as any
  assert(jsonExport.authority === "ZATCA", "JSON authority is ZATCA")
  assert(jsonExport.taxpayer.vat_number === "310123456789003", "JSON has taxpayer VAT number")

  const csvExport = formatKsaVatReturnCsv(report)
  assert(csvExport.includes("ZATCA - KINGDOM OF SAUDI ARABIA VAT RETURN DECLARATION"), "CSV header present")
  assert(csvExport.includes("310123456789003"), "CSV contains VAT #")
}

console.log("\n=======================================================")
console.log("  ALL KSA VAT & ZATCA TESTS PASSED SUCCESSFULLY!       ")
console.log("=======================================================\n")
