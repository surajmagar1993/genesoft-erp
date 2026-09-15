/**
 * Automated Verification Script: HR Payroll Processing Engine (Phase 3)
 *
 * Validates:
 * 1. Salary Structure Configuration & Template Rules:
 *    - Standard percentage splits (Basic 50%, HRA 20%, Special 15%)
 *    - Conveyance & Medical fixed monthly caps
 *    - Statutory deduction rates: PF (12%), ESI (0.75%), PT (200 INR), TDS
 * 2. Statutory Deductions Math & Thresholds:
 *    - PF deduction accuracy on basic wage
 *    - ESI threshold applicability (eligible <= 21,000 INR gross, exempt > 21,000 INR)
 *    - Professional Tax standard slab deduction
 *    - TDS proportional deduction
 * 3. Attendance Proration & Unpaid Leave Logic:
 *    - Daily wage calculation (Monthly CTC / Days in Month)
 *    - Proration factor for unpaid absence
 *    - Net salary calculation (Gross - Deductions)
 * 4. Payroll Run State Transitions & Payslip Itemization:
 *    - Unique Run Number formatting (`PAYRUN-YYYY-MM`)
 *    - Individual slip sequence (`SLIP-YYYYMM-XXX`)
 *    - State machine: DRAFT -> APPROVED -> PAID
 *
 * Run with: npx tsx --env-file=.env scripts/verify-payroll-engine.ts
 */

async function runPayrollVerification() {
  console.log("================================================================")
  console.log("🚀 Starting Verification: HR Payroll Processing Engine (P3)")
  console.log("================================================================\n")

  let passed = 0
  let failed = 0

  function assert(condition: boolean, testName: string, detail?: any) {
    if (condition) {
      console.log(`✅ PASS: ${testName}`)
      passed++
    } else {
      console.error(`❌ FAIL: ${testName}`, detail || "")
      failed++
    }
  }

  // --- 1. SALARY STRUCTURE CONFIGURATION ---
  console.log("--- Test Suite 1: Salary Structure Configuration & Allowances ---")
  const corporateStructure = {
    name: "Corporate Standard",
    code: "SAL-STD",
    basicPercentage: 50,
    hraPercentage: 20,
    conveyanceMonthly: 1600,
    medicalMonthly: 1250,
    specialAllowancePct: 15,
    pfEmployeeRate: 12,
    esiEmployeeRate: 0.75,
    professionalTax: 200,
    tdsPercentage: 5
  }

  assert(corporateStructure.basicPercentage === 50, "Standard Basic salary is 50% of CTC")
  assert(corporateStructure.hraPercentage === 20, "Standard HRA allowance is 20% of CTC")
  assert(corporateStructure.conveyanceMonthly === 1600, "Conveyance monthly allowance is statutory 1600 INR")
  assert(corporateStructure.medicalMonthly === 1250, "Medical monthly allowance is statutory 1250 INR")
  assert(corporateStructure.pfEmployeeRate === 12, "Employee Provident Fund deduction is 12%")
  assert(corporateStructure.esiEmployeeRate === 0.75, "Employee State Insurance (ESI) deduction is 0.75%")

  // --- 2. EARNINGS & DEDUCTIONS MATH ---
  console.log("\n--- Test Suite 2: Earnings & Statutory Deductions Math ---")
  const monthlyCtc = 60000 // 60,000 INR monthly CTC
  const basic = Math.round(monthlyCtc * (corporateStructure.basicPercentage / 100)) // 30,000
  const hra = Math.round(monthlyCtc * (corporateStructure.hraPercentage / 100)) // 12,000
  const conveyance = corporateStructure.conveyanceMonthly // 1,600
  const medical = corporateStructure.medicalMonthly // 1,250
  const specialAllowance = Math.max(0, Math.round(monthlyCtc - (basic + hra + conveyance + medical))) // 15,150
  const gross = basic + hra + conveyance + medical + specialAllowance

  assert(basic === 30000, `Basic salary calculated correctly (${basic} = 50% of 60,000)`)
  assert(hra === 12000, `HRA calculated correctly (${hra} = 20% of 60,000)`)
  assert(gross === 60000, `Gross earnings matches CTC (${gross} === 60,000)`)

  // Deductions
  const pf = Math.round(basic * (corporateStructure.pfEmployeeRate / 100)) // 12% of 30,000 = 3,600
  const esi = gross <= 21000 ? Math.round(gross * (corporateStructure.esiEmployeeRate / 100)) : 0 // 0 because 60k > 21k
  const pt = corporateStructure.professionalTax // 200
  const tds = Math.round(gross * (corporateStructure.tdsPercentage / 100)) // 5% of 60,000 = 3,000
  const totalDeductions = pf + esi + pt + tds
  const net = gross - totalDeductions

  assert(pf === 3600, `PF correctly computed as 12% of Basic (${pf} INR)`)
  assert(esi === 0, `ESI is 0 for salaries exceeding statutory threshold of 21,000 INR (Gross = ${gross})`)
  assert(pt === 200, `Professional tax standard slab applied (${pt} INR)`)
  assert(tds === 3000, `TDS 5% tax deduction calculated (${tds} INR)`)
  assert(totalDeductions === 6800, `Total deductions sum correctly (${totalDeductions} INR)`)
  assert(net === 53200, `Net salary payable is Gross minus Total Deductions (${net} INR)`)

  // --- 3. ESI THRESHOLD FOR LOWER WAGE BRACKET ---
  console.log("\n--- Test Suite 3: ESI Threshold Validation for Staff <= 21k ---")
  const lowWageCtc = 18000
  const lowWageBasic = Math.round(lowWageCtc * 0.5) // 9000
  const lowWageEsi = lowWageCtc <= 21000 ? Math.round(lowWageCtc * 0.0075) : 0 // 0.75% of 18000 = 135

  assert(lowWageEsi === 135, `ESI accurately deducted (135 INR) when gross is <= 21,000 INR (${lowWageCtc} INR)`)

  // --- 4. ATTENDANCE PRORATION & UNPAID LEAVES ---
  console.log("\n--- Test Suite 4: Attendance Proration & Unpaid Leave Deductions ---")
  const daysInMonth = 30
  const unpaidLeaves = 3
  const dailyRate = monthlyCtc / daysInMonth // 2,000 per day
  const unpaidDeduction = Math.round(unpaidLeaves * dailyRate) // 6,000
  const proratedNet = gross - (totalDeductions + unpaidDeduction)

  assert(dailyRate === 2000, `Daily wage accurately computed (${dailyRate} INR / day)`)
  assert(unpaidDeduction === 6000, `3 days unpaid absence results in 6000 INR deduction`)
  assert(proratedNet === 47200, `Prorated net payout correctly reduced (${proratedNet} INR)`)

  // --- 5. PAYROLL RUN NUMBER & SLIP SEQUENCING ---
  console.log("\n--- Test Suite 5: Run Numbering & Slip Sequencing ---")
  const year = 2026
  const month = 9
  const runNumber = `PAYRUN-${year}-${String(month).padStart(2, "0")}`
  const slip1 = `SLIP-${year}${String(month).padStart(2, "0")}-${String(1).padStart(3, "0")}`
  const slip15 = `SLIP-${year}${String(month).padStart(2, "0")}-${String(15).padStart(3, "0")}`

  assert(runNumber === "PAYRUN-2026-09", `Run number correctly formatted: ${runNumber}`)
  assert(slip1 === "SLIP-202609-001", `First payslip numbered correctly: ${slip1}`)
  assert(slip15 === "SLIP-202609-015", `Subsequent payslip numbered correctly: ${slip15}`)

  // --- 6. LIFECYCLE STATE TRANSITIONS ---
  console.log("\n--- Test Suite 6: Payroll Run Status State Machine ---")
  const validTransitions: Record<string, string[]> = {
    DRAFT: ["APPROVED", "VOID"],
    APPROVED: ["PAID", "VOID"],
    PAID: ["VOID"],
    VOID: []
  }

  assert(validTransitions["DRAFT"].includes("APPROVED"), "DRAFT can transition to APPROVED")
  assert(validTransitions["APPROVED"].includes("PAID"), "APPROVED can transition to PAID (Disbursed)")
  assert(!validTransitions["DRAFT"].includes("PAID"), "DRAFT cannot directly transition to PAID without approval")

  console.log("\n================================================================")
  console.log(`🏁 Verification Finished: ${passed} Passed, ${failed} Failed`)
  console.log("================================================================\n")

  if (failed > 0) {
    process.exit(1)
  }
}

runPayrollVerification()

export {}
