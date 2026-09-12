import {
  EWAY_BILL_CONSIGNMENT_THRESHOLD,
  validateVehicleNumber,
  validateTransporterId,
  validatePinCode,
  calculateEwayBillValidity,
  generateEwayBillNumber,
  formatEwayBillQrPayload,
  buildNicBulkUploadJson,
  EwayBillInput,
} from "../src/lib/eway-bill-engine"

async function runEwayVerificationSuite() {
  console.log("=================================================================")
  console.log("    INDIAN E-WAY BILL (RULE 138 CGST) VERIFICATION SUITE       ")
  console.log("=================================================================")

  let passedTests = 0
  let totalTests = 0

  function assert(condition: boolean, message: string) {
    totalTests++
    if (condition) {
      console.log(`  ✓ ${message}`)
      passedTests++
    } else {
      console.error(`  ✗ FAIL: ${message}`)
      throw new Error(`Assertion failed: ${message}`)
    }
  }

  // ── Test 1: Vehicle Registration Number Validation ─────────────────
  console.log("\n[Test 1] Testing Indian Vehicle Registration Validation...")
  {
    // Valid standard vehicles
    assert(validateVehicleNumber("MH12AB1234").isValid, "MH12AB1234 should be valid (Maharashtra)")
    assert(validateVehicleNumber("DL1AA1234").isValid, "DL1AA1234 should be valid (Delhi)")
    assert(validateVehicleNumber("KA01F1234").isValid, "KA01F1234 should be valid (Karnataka)")
    assert(validateVehicleNumber("GJ01AA1234").isValid, "GJ01AA1234 should be valid (Gujarat)")
    assert(validateVehicleNumber("HR26DQ5551").isValid, "HR26DQ5551 should be valid (Haryana)")
    assert(validateVehicleNumber("mh-12-ab-1234").isValid, "Dashed lowercase format should be normalized and valid")
    assert(validateVehicleNumber("KA 04 E 9999").isValid, "Spaced format should be normalized and valid")

    // Valid Bharat (BH) Series
    assert(validateVehicleNumber("22BH1234AA").isValid, "22BH1234AA Bharat Series should be valid")

    // Invalid vehicles
    assert(!validateVehicleNumber("").isValid, "Empty vehicle number should be invalid")
    assert(!validateVehicleNumber("12345").isValid, "Digits only should be invalid")
    assert(!validateVehicleNumber("INVALIDVEHICLE").isValid, "Random letters should be invalid")
    assert(!validateVehicleNumber("M12AB1234").isValid, "Single letter state code should be invalid")
  }

  // ── Test 2: Transporter ID Validation (GSTIN / TRANSIN) ───────────
  console.log("\n[Test 2] Testing Transporter ID (GSTIN / TRANSIN) Validation...")
  {
    assert(validateTransporterId("29AABCV1234F1Z1").isValid, "29AABCV1234F1Z1 (VRL) should be valid")
    assert(validateTransporterId("27AAACB1234D1Z2").isValid, "27AAACB1234D1Z2 (Blue Dart) should be valid")
    assert(validateTransporterId("").isValid, "Empty Transporter ID should be allowed (self transport)")
    assert(validateTransporterId(undefined).isValid, "Undefined Transporter ID should be allowed")

    // Invalid formats
    assert(!validateTransporterId("INVALID").isValid, "Short invalid string should be invalid")
    assert(!validateTransporterId("ABCDE1234F").isValid, "10-character PAN should be invalid as Transporter ID")
    assert(!validateTransporterId("27AAACB1234D1Z").isValid, "14-char truncated GSTIN should be invalid")
  }

  // ── Test 3: Indian Postal PIN Code Validation ──────────────────────
  console.log("\n[Test 3] Testing 6-Digit Indian Postal PIN Code Validation...")
  {
    assert(validatePinCode("411045").isValid, "411045 (Pune) should be valid")
    assert(validatePinCode(411045).isValid, "Numeric 411045 should be valid")
    assert(validatePinCode("110001").isValid, "110001 (New Delhi) should be valid")
    assert(validatePinCode("560001").isValid, "560001 (Bengaluru) should be valid")

    // Invalid PIN codes
    assert(!validatePinCode("").isValid, "Empty PIN should be invalid")
    assert(!validatePinCode("011001").isValid, "PIN starting with 0 should be invalid in India")
    assert(!validatePinCode("41104").isValid, "5-digit PIN should be invalid")
    assert(!validatePinCode("4110455").isValid, "7-digit PIN should be invalid")
    assert(!validatePinCode("41104A").isValid, "Alphanumeric PIN should be invalid")
  }

  // ── Test 4: Distance-to-Validity Calculation (Rule 138(10)) ───────
  console.log("\n[Test 4] Testing Distance-to-Validity Rules (CBIC Notif 94/2020)...")
  {
    const baseDate = new Date(2026, 8, 12, 10, 0, 0) // 12-Sep-2026 10:00 AM

    // Regular Cargo: 1 day per 200 km
    const reg100 = calculateEwayBillValidity(100, "R", baseDate)
    assert(reg100.validityDays === 1, "100 km regular cargo should have 1 day validity")
    assert(reg100.validUntil.getDate() === 13, "1 day validity from Sep 12 should expire on Sep 13")
    assert(reg100.validUntil.getHours() === 23 && reg100.validUntil.getMinutes() === 59, "Validity must expire at 23:59:59")

    const reg200 = calculateEwayBillValidity(200, "R", baseDate)
    assert(reg200.validityDays === 1, "Exactly 200 km should have 1 day validity")

    const reg201 = calculateEwayBillValidity(201, "R", baseDate)
    assert(reg201.validityDays === 2, "201 km should roll over to 2 days validity")
    assert(reg201.validUntil.getDate() === 14, "2 days validity from Sep 12 should expire on Sep 14")

    const reg450 = calculateEwayBillValidity(450, "R", baseDate)
    assert(reg450.validityDays === 3, "450 km should have 3 days validity")

    const reg1050 = calculateEwayBillValidity(1050, "R", baseDate)
    assert(reg1050.validityDays === 6, "1050 km should have 6 days validity")

    // Over Dimensional Cargo (ODC): 1 day per 20 km
    const odc15 = calculateEwayBillValidity(15, "O", baseDate)
    assert(odc15.validityDays === 1, "15 km ODC should have 1 day validity")

    const odc20 = calculateEwayBillValidity(20, "O", baseDate)
    assert(odc20.validityDays === 1, "20 km ODC should have 1 day validity")

    const odc25 = calculateEwayBillValidity(25, "O", baseDate)
    assert(odc25.validityDays === 2, "25 km ODC should roll over to 2 days validity")

    const odc100 = calculateEwayBillValidity(100, "O", baseDate)
    assert(odc100.validityDays === 5, "100 km ODC should have 5 days validity")
  }

  // ── Test 5: 12-Digit E-Way Bill Number Generator ──────────────────
  console.log("\n[Test 5] Testing 12-Digit E-Way Bill Number Generator...")
  {
    const ewbNo1 = generateEwayBillNumber("27")
    assert(ewbNo1.length === 12, "EWB Number must be exactly 12 digits")
    assert(ewbNo1.startsWith("27"), "EWB Number must start with 2-digit state code (27 for Maharashtra)")
    assert(/^\d{12}$/.test(ewbNo1), "EWB Number must contain only digits")

    const ewbNo2 = generateEwayBillNumber("29") // Karnataka
    assert(ewbNo2.startsWith("29"), "EWB Number for Karnataka must start with 29")
    assert(ewbNo1 !== ewbNo2, "Consecutively generated EWB numbers must be distinct")
  }

  // ── Test 6: QR Code Payload Formatter ─────────────────────────────
  console.log("\n[Test 6] Testing Digital QR Code Payload Formatter...")
  {
    const qrPayload = formatEwayBillQrPayload({
      ewayBillNo: "272612345678",
      docNo: "INV-2026-0042",
      docDate: "2026-09-12",
      genGstin: "27AAACG1234F1Z5",
      fromGstin: "27AAACG1234F1Z5",
      toGstin: "27AABCA1234A1Z5",
      totalValue: 125000,
      mainHsn: "8471",
    })

    assert(qrPayload.includes("EWB:272612345678"), "QR payload must contain EWB No")
    assert(qrPayload.includes("DOC:INV-2026-0042"), "QR payload must contain Doc No")
    assert(qrPayload.includes("FROM:27AAACG1234F1Z5"), "QR payload must contain Supplier GSTIN")
    assert(qrPayload.includes("TO:27AABCA1234A1Z5"), "QR payload must contain Recipient GSTIN")
    assert(qrPayload.includes("VAL:125000"), "QR payload must contain Total Value")
    assert(qrPayload.includes("HSN:8471"), "QR payload must contain HSN Code")
  }

  // ── Test 7: NIC Bulk Upload JSON Schema Compliance ─────────────────
  console.log("\n[Test 7] Testing NIC Bulk Upload JSON Schema Compliance...")
  {
    const mockInput: EwayBillInput = {
      supplyType: "O",
      subSupplyType: "1",
      docType: "INV",
      docNo: "INV-2026-0099",
      docDate: "2026-09-12",
      fromGstin: "27AAACG1234F1Z5",
      fromTrdName: "Genesoft Technologies Pvt Ltd",
      fromAddr1: "101 Cyber Heights",
      fromPlace: "Pune",
      fromPincode: 411045,
      fromStateCode: 27,
      toGstin: "27AABCA1234A1Z5",
      toTrdName: "Apex Retail Solutions Ltd",
      toAddr1: "Shop 12 Phoenix Marketcity",
      toPlace: "Pune",
      toPincode: 411014,
      toStateCode: 27,
      totalValue: 100000,
      cgstValue: 9000,
      sgstValue: 9000,
      igstValue: 0,
      cessValue: 0,
      transMode: "1",
      transDistance: 80,
      transporterId: "29AABCV1234F1Z1",
      transporterName: "VRL Logistics Ltd",
      transDocNo: "GR-98765",
      transDocDate: "2026-09-12",
      vehicleNo: "MH12AB1234",
      vehicleType: "R",
      itemList: [
        {
          productName: "Industrial Network Gateway Switch",
          hsnCode: "8471",
          quantity: 2,
          qtyUnit: "NOS",
          cgstRate: 9,
          sgstRate: 9,
          igstRate: 0,
          taxableAmount: 100000,
        },
      ],
    }

    const nicResult = buildNicBulkUploadJson([mockInput])
    assert(nicResult.version === "1.0.0123", "NIC schema version must be 1.0.0123")
    assert(Array.isArray(nicResult.billLists), "NIC payload must contain billLists array")
    assert(nicResult.billLists.length === 1, "billLists array must contain 1 entry")

    const bill = nicResult.billLists[0]
    assert(bill.userGstin === "27AAACG1234F1Z5", "User GSTIN must match fromGstin")
    assert(bill.docDate === "12/09/2026", "Document date must be DD/MM/YYYY per NIC format")
    assert(bill.totInvValue === 118000, "Total invoice value must include taxes (100k + 9k + 9k = 118,000)")
    assert(bill.transDistance === "80", "Trans distance must be string integer")
    assert(bill.vehicleNo === "MH12AB1234", "Vehicle number must be uppercase without spaces/dashes")
    assert(bill.itemList[0].hsnCode === 8471, "HSN code in NIC schema must be numeric")
    assert(bill.itemList[0].taxableAmount === 100000, "Taxable amount must be 100000")
  }

  // ── Test 8: Statutory Consignment Threshold Constant ───────────────
  console.log("\n[Test 8] Testing Statutory Consignment Threshold...")
  {
    assert(EWAY_BILL_CONSIGNMENT_THRESHOLD === 50000, "Statutory Rule 138 threshold must be ₹50,000")
  }

  console.log("\n=================================================================")
  console.log(`    ALL ${passedTests}/${totalTests} E-WAY BILL TESTS PASSED SUCCESSFULLY! ✓`)
  console.log("=================================================================\n")
}

runEwayVerificationSuite().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
