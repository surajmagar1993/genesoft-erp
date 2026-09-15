import {
    ApplicantStage,
    JobStatus,
    InterviewStatus,
    InterviewRecommendation,
    EmploymentType,
    EmployeeStatus
} from "@prisma/client"

export function computeJobCode(year: number, count: number): string {
    return `JOB-${year}-${String(count + 1).padStart(3, "0")}`
}

export function computeApplicantNumber(year: number, count: number): string {
    return `APP-${year}-${String(count + 1).padStart(4, "0")}`
}

export function computeEmployeeNumber(year: number, count: number): string {
    return `EMP-${year}-${String(count + 1).padStart(4, "0")}`
}

export function computeOfferAcceptanceRate(hiredCount: number, offeredCount: number): number {
    if (offeredCount <= 0) return 100
    return Math.round((hiredCount / offeredCount) * 100)
}

export function computeFilledPercentage(hired: number, totalPositions: number): number {
    if (totalPositions <= 0) return 0
    return Math.min(100, Math.round((hired / totalPositions) * 100))
}

export function validateRating(rating: number): number {
    return Math.min(Math.max(Math.round(rating), 1), 5)
}

export function transformApplicantToEmployee(
    applicant: {
        id: string
        fullName: string
        email: string
        phone?: string | null
        jobOpening: {
            departmentId: string | null
            designationId: string | null
            employmentType: EmploymentType
            currencyCode: string
        }
    },
    overrides: {
        firstName?: string
        lastName?: string
        email?: string
        phone?: string
        basicSalary: number
        joiningDate?: string
        departmentId?: string
        designationId?: string
        employmentType?: EmploymentType
    },
    year: number,
    empCount: number
) {
    const nameParts = applicant.fullName.trim().split(" ")
    const defaultFirst = nameParts[0] || ""
    const defaultLast = nameParts.slice(1).join(" ")

    const firstName = overrides.firstName?.trim() || defaultFirst
    const lastName = overrides.lastName?.trim() || (defaultLast || null)
    const displayName = lastName ? `${firstName} ${lastName}` : firstName

    return {
        employeeNumber: computeEmployeeNumber(year, empCount),
        firstName,
        lastName,
        displayName,
        email: (overrides.email || applicant.email).trim().toLowerCase(),
        phone: overrides.phone || applicant.phone || null,
        departmentId: overrides.departmentId || applicant.jobOpening.departmentId,
        designationId: overrides.designationId || applicant.jobOpening.designationId,
        employmentType: overrides.employmentType || applicant.jobOpening.employmentType,
        basicSalary: overrides.basicSalary,
        currencyCode: applicant.jobOpening.currencyCode || "INR",
        joiningDate: overrides.joiningDate ? new Date(overrides.joiningDate) : new Date(),
        status: EmployeeStatus.ACTIVE
    }
}

async function runTests() {
    console.log("================================================================")
    console.log("🧪 RUNNING HR RECRUITMENT & APPLICANT TRACKING (ATS) TEST SUITE")
    console.log("================================================================")

    let passed = 0
    let failed = 0

    function assert(condition: boolean, testName: string) {
        if (condition) {
            console.log(`  ✅ PASS: ${testName}`)
            passed++
        } else {
            console.error(`  ❌ FAIL: ${testName}`)
            failed++
        }
    }

    // 1. Job Code Formatting
    const jc1 = computeJobCode(2026, 0)
    assert(jc1 === "JOB-2026-001", "Job code first requisition format (JOB-2026-001)")

    const jc42 = computeJobCode(2026, 41)
    assert(jc42 === "JOB-2026-042", "Job code sequence increment format (JOB-2026-042)")

    // 2. Applicant Number Formatting
    const app1 = computeApplicantNumber(2026, 0)
    assert(app1 === "APP-2026-0001", "Applicant number initial index format (APP-2026-0001)")

    const app150 = computeApplicantNumber(2026, 149)
    assert(app150 === "APP-2026-0150", "Applicant number high index format (APP-2026-0150)")

    // 3. Employee Number Formatting
    const emp1 = computeEmployeeNumber(2026, 0)
    assert(emp1 === "EMP-2026-0001", "Employee number format (EMP-2026-0001)")

    // 4. Fill Percentage Math
    assert(computeFilledPercentage(0, 5) === 0, "Fill percentage 0/5 is 0%")
    assert(computeFilledPercentage(2, 4) === 50, "Fill percentage 2/4 is 50%")
    assert(computeFilledPercentage(3, 3) === 100, "Fill percentage 3/3 is 100%")
    assert(computeFilledPercentage(5, 3) === 100, "Fill percentage capped at 100% when over-hired")

    // 5. Offer Acceptance Rate
    assert(computeOfferAcceptanceRate(0, 0) === 100, "Acceptance rate with 0 offers defaults to 100%")
    assert(computeOfferAcceptanceRate(4, 5) === 80, "Acceptance rate 4 hired out of 5 offered is 80%")
    assert(computeOfferAcceptanceRate(10, 10) === 100, "Acceptance rate 10/10 is 100%")

    // 6. Rating Normalization
    assert(validateRating(5) === 5, "Rating 5 is valid 5")
    assert(validateRating(6) === 5, "Rating 6 is clamped to max 5")
    assert(validateRating(0) === 1, "Rating 0 is clamped to min 1")
    assert(validateRating(3.7) === 4, "Rating 3.7 rounds to 4")

    // 7. Pipeline Stage Progression Life-cycle
    const validStages: ApplicantStage[] = [
        ApplicantStage.APPLIED,
        ApplicantStage.SCREENING,
        ApplicantStage.INTERVIEWING,
        ApplicantStage.OFFERED,
        ApplicantStage.HIRED,
        ApplicantStage.REJECTED
    ]
    assert(validStages.length === 6, "ATS defines all 6 standard pipeline stages")
    assert(validStages.includes(ApplicantStage.HIRED), "Pipeline includes HIRED terminal state")
    assert(validStages.includes(ApplicantStage.REJECTED), "Pipeline includes REJECTED terminal state")

    // 8. Interview Recommendations
    const recs: InterviewRecommendation[] = [
        InterviewRecommendation.STRONG_HIRE,
        InterviewRecommendation.HIRE,
        InterviewRecommendation.NEUTRAL,
        InterviewRecommendation.NO_HIRE
    ]
    assert(recs.length === 4, "Interviews support 4 standardized recommendation levels")

    // 9. 1-Click Hire Transformation Logic
    const mockApplicant = {
        id: "app-uuid-1",
        fullName: "Vikram R Malhotra",
        email: "vikram@techcorp.com",
        phone: "+91 98765 43210",
        jobOpening: {
            departmentId: "dept-engineering",
            designationId: "desig-senior-dev",
            employmentType: EmploymentType.FULL_TIME,
            currencyCode: "INR"
        }
    }

    const employeeRecord = transformApplicantToEmployee(
        mockApplicant,
        {
            basicSalary: 75000,
            joiningDate: "2026-10-01"
        },
        2026,
        14
    )

    assert(employeeRecord.employeeNumber === "EMP-2026-0015", "1-Click Hire generates sequential employeeNumber EMP-2026-0015")
    assert(employeeRecord.firstName === "Vikram", "1-Click Hire extracts first name correctly")
    assert(employeeRecord.lastName === "R Malhotra", "1-Click Hire extracts multi-word last name correctly")
    assert(employeeRecord.displayName === "Vikram R Malhotra", "1-Click Hire sets displayName correctly")
    assert(employeeRecord.email === "vikram@techcorp.com", "1-Click Hire preserves normalized email")
    assert(employeeRecord.departmentId === "dept-engineering", "1-Click Hire carries over job opening departmentId")
    assert(employeeRecord.designationId === "desig-senior-dev", "1-Click Hire carries over job opening designationId")
    assert(employeeRecord.basicSalary === 75000, "1-Click Hire records basic salary correctly")
    assert(employeeRecord.status === EmployeeStatus.ACTIVE, "1-Click Hire marks new Employee as ACTIVE")

    // 10. Auto-Closing Requisition Check
    function shouldCloseOpening(hiredCount: number, positionsCount: number): boolean {
        return hiredCount >= positionsCount
    }
    assert(!shouldCloseOpening(1, 2), "Job stays open when 1/2 positions filled")
    assert(shouldCloseOpening(2, 2), "Job automatically closes when 2/2 positions filled")
    assert(shouldCloseOpening(3, 2), "Job automatically closes when overfilled (3/2)")

    console.log("================================================================")
    console.log(`Summary: ${passed} passed, ${failed} failed out of ${passed + failed} tests.`)
    console.log("================================================================")

    if (failed > 0) {
        process.exit(1)
    }
}

runTests().catch(err => {
    console.error("Test execution error:", err)
    process.exit(1)
})
