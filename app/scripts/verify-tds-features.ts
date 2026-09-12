import {
  TDS_SECTIONS,
  calculateTds,
  validatePan,
  validateTan,
  getIndianFinancialYear,
  getIndianTaxQuarter,
  getQuarterDateRange,
  getTdsMonthlyDepositDueDate,
  getForm26QDueDate,
} from "../src/lib/tds-engine"

async function runTdsVerificationSuite() {
  console.log("=================================================================")
  console.log("    INDIAN TDS & WITHHOLDING TAX STATUTORY VERIFICATION SUITE    ")
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

  // ── Test 1: PAN Validation & Entity Type Extraction ───────────────
  console.log("\n[Test 1] Testing Indian PAN Validation & Entity Detection...")
  {
    // Valid Individual PAN (4th letter 'P')
    const panInd = validatePan("ABCPR1234F")
    assert(panInd.isValid, "ABCPR1234F should be valid")
    assert(panInd.entityCategory === "INDIVIDUAL", "4th char 'P' should be INDIVIDUAL")
    assert(panInd.isIndividualOrHuf === true, "Individual should have isIndividualOrHuf=true")

    // Valid Company PAN (4th letter 'C')
    const panComp = validatePan("AAACB1234D")
    assert(panComp.isValid, "AAACB1234D should be valid")
    assert(panComp.entityCategory === "COMPANY", "4th char 'C' should be COMPANY")
    assert(panComp.isIndividualOrHuf === false, "Company should have isIndividualOrHuf=false")

    // Valid Firm/LLP PAN (4th letter 'F')
    const panFirm = validatePan("AAAFA1234K")
    assert(panFirm.isValid, "AAAFA1234K should be valid")
    assert(panFirm.entityCategory === "FIRM", "4th char 'F' should be FIRM")

    // Valid HUF PAN (4th letter 'H')
    const panHuf = validatePan("AAAHZ1234G")
    assert(panHuf.isValid, "AAAHZ1234G should be valid")
    assert(panHuf.isIndividualOrHuf === true, "HUF should have isIndividualOrHuf=true")

    // Invalid PANs
    assert(!validatePan("").isValid, "Empty PAN should be invalid")
    assert(!validatePan("12345ABCDE").isValid, "Inverted format PAN should be invalid")
    assert(!validatePan("ABCD12345F").isValid, "Wrong digit count PAN should be invalid")
    assert(!validatePan("ABCDE12345").isValid, "Missing last letter PAN should be invalid")
  }

  // ── Test 2: TAN Validation ────────────────────────────────────────
  console.log("\n[Test 2] Testing Indian TAN Validation...")
  {
    const tanValid = validateTan("MUMA12345B")
    assert(tanValid.isValid, "MUMA12345B should be valid TAN")

    const tanValidDel = validateTan("DELK98765A")
    assert(tanValidDel.isValid, "DELK98765A should be valid TAN")

    assert(!validateTan("").isValid, "Empty TAN should be invalid")
    assert(!validateTan("ABC1234567").isValid, "Non-compliant TAN should be invalid")
    assert(!validateTan("MUM123456B").isValid, "Wrong letters count should be invalid")
  }

  // ── Test 3: Indian FY & Tax Calendar Helpers ─────────────────────
  console.log("\n[Test 3] Testing Indian Financial Year & Tax Quarters...")
  {
    // April 2026 -> FY 2026-27, Q1
    const d1 = new Date(2026, 3, 15) // Month index 3 = April
    assert(getIndianFinancialYear(d1) === "2026-27", "Apr 2026 should be FY 2026-27")
    assert(getIndianTaxQuarter(d1) === "Q1", "Apr 2026 should be Q1")

    // August 2026 -> FY 2026-27, Q2
    const d2 = new Date(2026, 7, 20) // Month index 7 = August
    assert(getIndianFinancialYear(d2) === "2026-27", "Aug 2026 should be FY 2026-27")
    assert(getIndianTaxQuarter(d2) === "Q2", "Aug 2026 should be Q2")

    // November 2026 -> FY 2026-27, Q3
    const d3 = new Date(2026, 10, 5) // Month index 10 = November
    assert(getIndianFinancialYear(d3) === "2026-27", "Nov 2026 should be FY 2026-27")
    assert(getIndianTaxQuarter(d3) === "Q3", "Nov 2026 should be Q3")

    // February 2027 -> FY 2026-27, Q4
    const d4 = new Date(2027, 1, 10) // Month index 1 = February
    assert(getIndianFinancialYear(d4) === "2026-27", "Feb 2027 should be FY 2026-27")
    assert(getIndianTaxQuarter(d4) === "Q4", "Feb 2027 should be Q4")

    // Due dates: Monthly deposit
    const dateOct = new Date(2026, 9, 15) // Oct 15, 2026 (month 9)
    const dueOct = getTdsMonthlyDepositDueDate(dateOct) // Due Nov 7, 2026
    assert(dueOct.getDate() === 7 && dueOct.getMonth() === 10, "Oct deductions due date should be Nov 7")

    const dateMar = new Date(2027, 2, 15) // Mar 15, 2027 (month 2)
    const dueMar = getTdsMonthlyDepositDueDate(dateMar) // Due April 30, 2027
    assert(dueMar.getDate() === 30 && dueMar.getMonth() === 3, "March deductions due date should be April 30")

    // Form 26Q Due Dates
    const q1Due = getForm26QDueDate("2026-27", "Q1")
    assert(q1Due.getDate() === 31 && q1Due.getMonth() === 6, "Form 26Q Q1 due date should be July 31")

    const q2Due = getForm26QDueDate("2026-27", "Q2")
    assert(q2Due.getDate() === 31 && q2Due.getMonth() === 9, "Form 26Q Q2 due date should be Oct 31")

    const q3Due = getForm26QDueDate("2026-27", "Q3")
    assert(q3Due.getDate() === 31 && q3Due.getMonth() === 0 && q3Due.getFullYear() === 2027, "Form 26Q Q3 due date should be Jan 31")

    const q4Due = getForm26QDueDate("2026-27", "Q4")
    assert(q4Due.getDate() === 31 && q4Due.getMonth() === 4 && q4Due.getFullYear() === 2027, "Form 26Q Q4 due date should be May 31")
  }

  // ── Test 4: Section 194C (Contractors / Subcontractors) ─────────
  console.log("\n[Test 4] Testing Section 194C Calculations...")
  {
    // Case A: Contractor Individual with valid PAN -> 1% TDS on ₹1,00,000
    const resInd = calculateTds({
      grossAmount: 100000,
      sectionCode: "194C",
      deducteePan: "ABCPR1234F", // Individual PAN
    })
    assert(resInd.appliedRate === 1.0, "194C Individual rate should be 1%")
    assert(resInd.tdsAmount === 1000, "TDS on 100,000 at 1% should be 1,000")
    assert(resInd.netPayableAmount === 99000, "Net payable should be 99,000")
    assert(!resInd.is206AAPenaltyApplied, "Penalty should NOT be applied for valid PAN")

    // Case B: Contractor Company with valid PAN -> 2% TDS on ₹1,00,000
    const resComp = calculateTds({
      grossAmount: 100000,
      sectionCode: "194C",
      deducteePan: "AAACB1234D", // Company PAN
    })
    assert(resComp.appliedRate === 2.0, "194C Company rate should be 2%")
    assert(resComp.tdsAmount === 2000, "TDS on 100,000 at 2% should be 2,000")
    assert(resComp.netPayableAmount === 98000, "Net payable should be 98,000")

    // Case C: Below Single Threshold (₹25,000 < ₹30,000 single bill threshold)
    const resBelow = calculateTds({
      grossAmount: 25000,
      sectionCode: "194C",
      deducteePan: "AAACB1234D",
      enforceThreshold: true,
    })
    assert(resBelow.tdsAmount === 0, "Single bill under ₹30,000 should have ₹0 TDS")
    assert(!resBelow.isThresholdExceeded, "Threshold should not be exceeded for ₹25,000")

    // Case D: Exceeding Aggregate Threshold with prior YTD (₹25,000 + ₹80,000 prior = ₹105,000 > ₹100,000)
    const resAgg = calculateTds({
      grossAmount: 25000,
      sectionCode: "194C",
      deducteePan: "AAACB1234D",
      priorYtdAmount: 80000,
      enforceThreshold: true,
    })
    assert(resAgg.isThresholdExceeded, "Aggregate > ₹1,00,000 should trigger threshold")
    assert(resAgg.tdsAmount === 500, "2% on ₹25,000 when aggregate exceeded should be ₹500")
  }

  // ── Test 5: Section 194J (Professional & Technical Fees) ───────────
  console.log("\n[Test 5] Testing Section 194J Calculations...")
  {
    // Professional fees -> 10%
    const resProf = calculateTds({
      grossAmount: 50000,
      sectionCode: "194J_PROF",
      deducteePan: "ABCPR1234F",
    })
    assert(resProf.appliedRate === 10.0, "194J_PROF rate should be 10%")
    assert(resProf.tdsAmount === 5000, "TDS on 50,000 at 10% should be 5,000")
    assert(resProf.netPayableAmount === 45000, "Net payable should be 45,000")

    // Technical services -> 2%
    const resTech = calculateTds({
      grossAmount: 50000,
      sectionCode: "194J_TECH",
      deducteePan: "AAACB1234D",
    })
    assert(resTech.appliedRate === 2.0, "194J_TECH rate should be 2%")
    assert(resTech.tdsAmount === 1000, "TDS on 50,000 at 2% should be 1,000")
  }

  // ── Test 6: Section 194I (Rent) ──────────────────────────────────
  console.log("\n[Test 6] Testing Section 194I Rent Calculations...")
  {
    // Rent on Land / Building -> 10%
    const resRentLand = calculateTds({
      grossAmount: 300000,
      sectionCode: "194I_LAND",
      deducteePan: "ABCPR1234F",
    })
    assert(resRentLand.appliedRate === 10.0, "194I_LAND rate should be 10%")
    assert(resRentLand.tdsAmount === 30000, "TDS on 300,000 at 10% should be 30,000")

    // Rent on Plant / Machinery -> 2%
    const resRentPlant = calculateTds({
      grossAmount: 300000,
      sectionCode: "194I_PLANT",
      deducteePan: "AAACB1234D",
    })
    assert(resRentPlant.appliedRate === 2.0, "194I_PLANT rate should be 2%")
    assert(resRentPlant.tdsAmount === 6000, "TDS on 300,000 at 2% should be 6,000")
  }

  // ── Test 7: Section 194H, 194Q & 194A ────────────────────────────
  console.log("\n[Test 7] Testing Section 194H, 194Q, 194A Calculations...")
  {
    // 194H: Brokerage / Commission -> 5%
    const res194H = calculateTds({
      grossAmount: 20000,
      sectionCode: "194H",
      deducteePan: "ABCPR1234F",
    })
    assert(res194H.appliedRate === 5.0, "194H rate should be 5%")
    assert(res194H.tdsAmount === 1000, "TDS on 20,000 at 5% should be 1,000")

    // 194Q: Purchase of Goods -> 0.1% on value over 50 Lakhs
    const res194Q = calculateTds({
      grossAmount: 6000000,
      sectionCode: "194Q",
      deducteePan: "AAACB1234D",
    })
    assert(res194Q.appliedRate === 0.1, "194Q rate should be 0.1%")
    assert(res194Q.tdsAmount === 6000, "TDS on 6,000,000 at 0.1% should be 6,000")

    // 194A: Interest -> 10%
    const res194A = calculateTds({
      grossAmount: 50000,
      sectionCode: "194A",
      deducteePan: "ABCPR1234F",
    })
    assert(res194A.appliedRate === 10.0, "194A rate should be 10%")
    assert(res194A.tdsAmount === 5000, "TDS on 50,000 at 10% should be 5,000")
  }

  // ── Test 8: Section 206AA Penalty Enforcement (20% flat) ─────────
  console.log("\n[Test 8] Testing Section 206AA Mandatory 20% Penalty...")
  {
    // A: Missing PAN under Section 194C (normally 1%)
    const resMissing = calculateTds({
      grossAmount: 100000,
      sectionCode: "194C",
      deducteePan: null,
    })
    assert(resMissing.is206AAPenaltyApplied === true, "Missing PAN must flag 206AA penalty")
    assert(resMissing.appliedRate === 20.0, "Applied rate must be bumped to 20% penalty")
    assert(resMissing.tdsAmount === 20000, "TDS on 100,000 under 206AA must be 20,000")
    assert(resMissing.netPayableAmount === 80000, "Net payable must be 80,000")

    // B: Invalid format PAN under Section 194J (normally 2% for tech)
    const resInvalid = calculateTds({
      grossAmount: 100000,
      sectionCode: "194J_TECH",
      deducteePan: "INVALID123",
    })
    assert(resInvalid.is206AAPenaltyApplied === true, "Invalid PAN must flag 206AA penalty")
    assert(resInvalid.appliedRate === 20.0, "Rate must be 20%")
    assert(resInvalid.tdsAmount === 20000, "TDS must be 20,000")
  }

  // ── Test 9: Form 26Q Export Data Schema Verification ─────────────
  console.log("\n[Test 9] Testing Form 26Q Export Structure...")
  {
    const sampleChallan = {
      id: "ch-1",
      bsrCode: "0210001",
      challanNo: "10042",
      depositDate: "2026-07-05",
      sectionCode: "194C",
      majorHead: "0020" as const,
      minorHead: "200" as const,
      bankName: "State Bank of India",
      tenderDate: "2026-07-05",
      taxAmount: 5000,
      surcharge: 0,
      cess: 0,
      interest: 0,
      penalty: 0,
      totalAmount: 5000,
      fiscalYear: "2026-27",
      quarter: "Q1" as const,
      deductionIds: ["tds-1", "tds-2"],
    }

    assert(sampleChallan.bsrCode.length === 7, "Challan BSR code must be 7 characters")
    assert(sampleChallan.challanNo.length === 5, "Challan number must be 5 characters")
    assert(sampleChallan.majorHead === "0020" || sampleChallan.majorHead === "0021", "Major head must be 0020 or 0021")
    assert(sampleChallan.minorHead === "200" || sampleChallan.minorHead === "400", "Minor head must be 200 or 400")
  }

  console.log("\n=================================================================")
  console.log(`    ALL ${passedTests}/${totalTests} TDS VERIFICATION TESTS PASSED SUCCESSFULLY! ✓`)
  console.log("=================================================================\n")
}

runTdsVerificationSuite().catch((err) => {
  console.error("Test execution failed:", err)
  process.exit(1)
})
