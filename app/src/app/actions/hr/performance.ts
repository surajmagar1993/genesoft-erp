"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    AppraisalCycleStatus,
    ReviewStatus,
    GoalCategory,
    GoalStatus,
    TrainingCategory,
    TrainingMode,
    TrainingProgramStatus,
    EnrollmentStatus,
} from "@prisma/client"

export interface AppraisalCycleRecord {
    id: string
    cycleCode: string
    title: string
    startDate: Date
    endDate: Date
    status: AppraisalCycleStatus
    description: string | null
    reviewsCount: number
    goalsCount: number
    createdAt: Date
}

export interface PerformanceReviewRecord {
    id: string
    reviewCode: string
    cycleId: string
    cycleTitle: string
    cycleCode: string
    employeeId: string
    employeeName: string
    employeeNumber: string
    departmentName: string | null
    designationTitle: string | null
    reviewerId: string | null
    reviewerName: string | null
    status: ReviewStatus
    selfRating: number | null
    managerRating: number | null
    finalRating: number | null
    selfFeedback: string | null
    managerFeedback: string | null
    strengths: string | null
    areasOfImprovement: string | null
    promotionRecommended: boolean
    competencies: Record<string, number> | null
    completedAt: Date | null
    createdAt: Date
}

export interface EmployeeGoalRecord {
    id: string
    goalCode: string
    employeeId: string
    employeeName: string
    employeeNumber: string
    cycleId: string | null
    cycleTitle: string | null
    title: string
    description: string | null
    category: GoalCategory
    targetMetric: string | null
    progress: number
    weightage: number
    status: GoalStatus
    dueDate: Date | null
    createdAt: Date
}

export interface TrainingProgramRecord {
    id: string
    programCode: string
    title: string
    category: TrainingCategory
    trainer: string | null
    durationHours: number | null
    mode: TrainingMode
    description: string | null
    syllabusUrl: string | null
    status: TrainingProgramStatus
    startDate: Date | null
    endDate: Date | null
    maxParticipants: number
    enrollmentsCount: number
    completedCount: number
    createdAt: Date
}

export interface TrainingEnrollmentRecord {
    id: string
    programId: string
    programCode: string
    programTitle: string
    programCategory: TrainingCategory
    employeeId: string
    employeeName: string
    employeeNumber: string
    departmentName: string | null
    status: EnrollmentStatus
    enrolledAt: Date
    completedAt: Date | null
    score: number | null
    feedback: string | null
    certificateUrl: string | null
}

export interface PerformanceTelemetry {
    activeCyclesCount: number
    totalReviewsCount: number
    completedReviewsCount: number
    reviewCompletionRate: number
    avgOrgRating: number
    activeGoalsCount: number
    avgGoalProgress: number
    activeProgramsCount: number
    totalEnrollmentsCount: number
    certifiedEmployeesCount: number
}

export interface PerformanceOverviewData {
    telemetry: PerformanceTelemetry
    cycles: AppraisalCycleRecord[]
    reviews: PerformanceReviewRecord[]
    goals: EmployeeGoalRecord[]
    programs: TrainingProgramRecord[]
    enrollments: TrainingEnrollmentRecord[]
    employees: {
        id: string
        displayName: string
        employeeNumber: string
        departmentName: string | null
        designationTitle: string | null
    }[]
}

/**
 * Fetch all Performance Reviews & Training overview data
 */
export async function getPerformanceOverview(): Promise<PerformanceOverviewData> {
    const tenantId = await getTenantId()

    // 1. Fetch Appraisal Cycles
    const rawCycles = await prisma.appraisalCycle.findMany({
        where: { tenantId },
        include: {
            _count: {
                select: {
                    reviews: true,
                    goals: true
                }
            }
        },
        orderBy: { startDate: "desc" }
    })

    const cycles: AppraisalCycleRecord[] = rawCycles.map((c: any) => ({
        id: c.id,
        cycleCode: c.cycleCode,
        title: c.title,
        startDate: c.startDate,
        endDate: c.endDate,
        status: c.status,
        description: c.description,
        reviewsCount: c._count.reviews,
        goalsCount: c._count.goals,
        createdAt: c.createdAt
    }))

    // 2. Fetch Performance Reviews
    const rawReviews = await prisma.performanceReview.findMany({
        where: { tenantId },
        include: {
            cycle: { select: { title: true, cycleCode: true } },
            employee: {
                select: {
                    displayName: true,
                    employeeNumber: true,
                    department: { select: { name: true } },
                    designation: { select: { title: true } }
                }
            },
            reviewer: { select: { displayName: true } }
        },
        orderBy: { createdAt: "desc" }
    })

    const reviews: PerformanceReviewRecord[] = rawReviews.map((r: any) => ({
        id: r.id,
        reviewCode: r.reviewCode,
        cycleId: r.cycleId,
        cycleTitle: r.cycle.title,
        cycleCode: r.cycle.cycleCode,
        employeeId: r.employeeId,
        employeeName: r.employee.displayName,
        employeeNumber: r.employee.employeeNumber,
        departmentName: r.employee.department?.name || null,
        designationTitle: r.employee.designation?.title || null,
        reviewerId: r.reviewerId,
        reviewerName: r.reviewer?.displayName || null,
        status: r.status,
        selfRating: r.selfRating ? Number(r.selfRating) : null,
        managerRating: r.managerRating ? Number(r.managerRating) : null,
        finalRating: r.finalRating ? Number(r.finalRating) : null,
        selfFeedback: r.selfFeedback,
        managerFeedback: r.managerFeedback,
        strengths: r.strengths,
        areasOfImprovement: r.areasOfImprovement,
        promotionRecommended: r.promotionRecommended,
        competencies: (r.competencies as Record<string, number>) || null,
        completedAt: r.completedAt,
        createdAt: r.createdAt
    }))

    // 3. Fetch Goals (OKRs)
    const rawGoals = await prisma.employeeGoal.findMany({
        where: { tenantId },
        include: {
            employee: { select: { displayName: true, employeeNumber: true } },
            cycle: { select: { title: true } }
        },
        orderBy: [{ progress: "asc" }, { createdAt: "desc" }]
    })

    const goals: EmployeeGoalRecord[] = rawGoals.map((g: any) => ({
        id: g.id,
        goalCode: g.goalCode,
        employeeId: g.employeeId,
        employeeName: g.employee.displayName,
        employeeNumber: g.employee.employeeNumber,
        cycleId: g.cycleId,
        cycleTitle: g.cycle?.title || null,
        title: g.title,
        description: g.description,
        category: g.category,
        targetMetric: g.targetMetric,
        progress: g.progress,
        weightage: g.weightage,
        status: g.status,
        dueDate: g.dueDate,
        createdAt: g.createdAt
    }))

    // 4. Fetch Training Programs
    const rawPrograms = await prisma.trainingProgram.findMany({
        where: { tenantId },
        include: {
            enrollments: {
                select: { id: true, status: true }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    const programs: TrainingProgramRecord[] = rawPrograms.map((p: any) => ({
        id: p.id,
        programCode: p.programCode,
        title: p.title,
        category: p.category,
        trainer: p.trainer,
        durationHours: p.durationHours ? Number(p.durationHours) : null,
        mode: p.mode,
        description: p.description,
        syllabusUrl: p.syllabusUrl,
        status: p.status,
        startDate: p.startDate,
        endDate: p.endDate,
        maxParticipants: p.maxParticipants,
        enrollmentsCount: p.enrollments.length,
        completedCount: p.enrollments.filter((e: any) => e.status === EnrollmentStatus.COMPLETED).length,
        createdAt: p.createdAt
    }))

    // 5. Fetch Training Enrollments
    const rawEnrollments = await prisma.trainingEnrollment.findMany({
        where: { tenantId },
        include: {
            program: { select: { programCode: true, title: true, category: true } },
            employee: {
                select: {
                    displayName: true,
                    employeeNumber: true,
                    department: { select: { name: true } }
                }
            }
        },
        orderBy: { enrolledAt: "desc" }
    })

    const enrollments: TrainingEnrollmentRecord[] = rawEnrollments.map((e: any) => ({
        id: e.id,
        programId: e.programId,
        programCode: e.program.programCode,
        programTitle: e.program.title,
        programCategory: e.program.category,
        employeeId: e.employeeId,
        employeeName: e.employee.displayName,
        employeeNumber: e.employee.employeeNumber,
        departmentName: e.employee.department?.name || null,
        status: e.status,
        enrolledAt: e.enrolledAt,
        completedAt: e.completedAt,
        score: e.score ? Number(e.score) : null,
        feedback: e.feedback,
        certificateUrl: e.certificateUrl
    }))

    // 6. Fetch Employee Roster
    const rawEmployees = await prisma.employee.findMany({
        where: { tenantId },
        select: {
            id: true,
            displayName: true,
            employeeNumber: true,
            department: { select: { name: true } },
            designation: { select: { title: true } }
        },
        orderBy: { displayName: "asc" }
    })

    const employees = rawEmployees.map((e: any) => ({
        id: e.id,
        displayName: e.displayName,
        employeeNumber: e.employeeNumber,
        departmentName: e.department?.name || null,
        designationTitle: e.designation?.title || null
    }))

    // 7. Calculate Telemetry KPIs
    const activeCyclesCount = cycles.filter(c => c.status === AppraisalCycleStatus.ACTIVE || c.status === AppraisalCycleStatus.EVALUATION).length
    const totalReviewsCount = reviews.length
    const completedReviewsCount = reviews.filter(r => r.status === ReviewStatus.COMPLETED).length
    const reviewCompletionRate = totalReviewsCount > 0 ? Math.round((completedReviewsCount / totalReviewsCount) * 100) : 0

    const ratedReviews = reviews.filter(r => r.finalRating !== null || r.managerRating !== null)
    const avgOrgRating = ratedReviews.length > 0
        ? Math.round((ratedReviews.reduce((sum, r) => sum + (r.finalRating || r.managerRating || 0), 0) / ratedReviews.length) * 10) / 10
        : 0

    const activeGoals = goals.filter(g => g.status !== GoalStatus.CANCELLED)
    const activeGoalsCount = activeGoals.length
    const avgGoalProgress = activeGoalsCount > 0
        ? Math.round(activeGoals.reduce((sum, g) => sum + g.progress, 0) / activeGoalsCount)
        : 0

    const activeProgramsCount = programs.filter(p => p.status === TrainingProgramStatus.ACTIVE || p.status === TrainingProgramStatus.UPCOMING).length
    const totalEnrollmentsCount = enrollments.length
    const certifiedEmployeesCount = enrollments.filter(e => e.status === EnrollmentStatus.COMPLETED).length

    return {
        telemetry: {
            activeCyclesCount,
            totalReviewsCount,
            completedReviewsCount,
            reviewCompletionRate,
            avgOrgRating,
            activeGoalsCount,
            avgGoalProgress,
            activeProgramsCount,
            totalEnrollmentsCount,
            certifiedEmployeesCount
        },
        cycles,
        reviews,
        goals,
        programs,
        enrollments,
        employees
    }
}

/**
 * Create a new Appraisal Cycle
 */
export async function createAppraisalCycle(input: {
    title: string
    startDate: string
    endDate: string
    description?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const count = await prisma.appraisalCycle.count({ where: { tenantId } })
        const cycleCode = `CYC-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`

        await prisma.appraisalCycle.create({
            data: {
                tenantId,
                cycleCode,
                title: input.title.trim(),
                startDate: new Date(input.startDate),
                endDate: new Date(input.endDate),
                description: input.description?.trim() || null,
                status: AppraisalCycleStatus.PLANNING
            }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Create appraisal cycle failed:", err)
        return { success: false, error: err.message || "Failed to create appraisal cycle" }
    }
}

/**
 * Update Appraisal Cycle Status
 */
export async function updateAppraisalCycleStatus(
    id: string,
    status: AppraisalCycleStatus
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        await prisma.appraisalCycle.update({
            where: { id, tenantId },
            data: { status }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Update appraisal cycle status failed:", err)
        return { success: false, error: err.message || "Failed to update cycle status" }
    }
}

/**
 * Initiate Performance Review for an Employee
 */
export async function createPerformanceReview(input: {
    cycleId: string
    employeeId: string
    reviewerId?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        // Check if review already exists for employee in this cycle
        const existing = await prisma.performanceReview.findFirst({
            where: { tenantId, cycleId: input.cycleId, employeeId: input.employeeId }
        })

        if (existing) {
            return { success: false, error: "A performance review already exists for this employee in this cycle" }
        }

        const count = await prisma.performanceReview.count({ where: { tenantId } })
        const reviewCode = `REV-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`

        // Auto-assign employee's reporting manager if reviewer not specified
        let reviewerId = input.reviewerId
        if (!reviewerId) {
            const emp = await prisma.employee.findUnique({
                where: { id: input.employeeId },
                select: { managerId: true }
            })
            reviewerId = emp?.managerId || undefined
        }

        await prisma.performanceReview.create({
            data: {
                tenantId,
                reviewCode,
                cycleId: input.cycleId,
                employeeId: input.employeeId,
                reviewerId: reviewerId || null,
                status: ReviewStatus.DRAFT,
                competencies: {
                    jobKnowledge: 3,
                    workQuality: 3,
                    initiative: 3,
                    communication: 3,
                    teamwork: 3
                }
            }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Create performance review failed:", err)
        return { success: false, error: err.message || "Failed to create performance review" }
    }
}

/**
 * Submit Employee Self-Review Evaluation
 */
export async function submitReviewSelfEvaluation(input: {
    reviewId: string
    selfRating: number
    selfFeedback: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.performanceReview.update({
            where: { id: input.reviewId, tenantId },
            data: {
                selfRating: input.selfRating,
                selfFeedback: input.selfFeedback.trim(),
                status: ReviewStatus.MANAGER_REVIEW
            }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Submit self review failed:", err)
        return { success: false, error: err.message || "Failed to submit self evaluation" }
    }
}

/**
 * Submit Manager Evaluation & Finalize Review
 */
export async function submitReviewManagerEvaluation(input: {
    reviewId: string
    managerRating: number
    finalRating: number
    managerFeedback: string
    strengths?: string
    areasOfImprovement?: string
    promotionRecommended: boolean
    competencies?: Record<string, number>
}): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.performanceReview.update({
            where: { id: input.reviewId, tenantId },
            data: {
                managerRating: input.managerRating,
                finalRating: input.finalRating,
                managerFeedback: input.managerFeedback.trim(),
                strengths: input.strengths?.trim() || null,
                areasOfImprovement: input.areasOfImprovement?.trim() || null,
                promotionRecommended: input.promotionRecommended,
                competencies: input.competencies || undefined,
                status: ReviewStatus.COMPLETED,
                completedAt: new Date()
            }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Submit manager review failed:", err)
        return { success: false, error: err.message || "Failed to submit manager evaluation" }
    }
}

/**
 * Create an Employee Goal (OKR)
 */
export async function createEmployeeGoal(input: {
    employeeId: string
    cycleId?: string
    title: string
    description?: string
    category: GoalCategory
    targetMetric?: string
    weightage?: number
    dueDate?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const count = await prisma.employeeGoal.count({ where: { tenantId } })
        const goalCode = `GOL-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`

        await prisma.employeeGoal.create({
            data: {
                tenantId,
                goalCode,
                employeeId: input.employeeId,
                cycleId: input.cycleId || null,
                title: input.title.trim(),
                description: input.description?.trim() || null,
                category: input.category,
                targetMetric: input.targetMetric?.trim() || null,
                weightage: input.weightage || 25,
                progress: 0,
                status: GoalStatus.NOT_STARTED,
                dueDate: input.dueDate ? new Date(input.dueDate) : null
            }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Create goal failed:", err)
        return { success: false, error: err.message || "Failed to create goal" }
    }
}

/**
 * Update Goal Progress
 */
export async function updateGoalProgress(
    id: string,
    progress: number,
    status?: GoalStatus
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const boundedProgress = Math.min(100, Math.max(0, progress))

        let targetStatus = status
        if (!targetStatus) {
            if (boundedProgress === 100) targetStatus = GoalStatus.ACHIEVED
            else if (boundedProgress > 0) targetStatus = GoalStatus.IN_PROGRESS
            else targetStatus = GoalStatus.NOT_STARTED
        }

        await prisma.employeeGoal.update({
            where: { id, tenantId },
            data: {
                progress: boundedProgress,
                status: targetStatus
            }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Update goal progress failed:", err)
        return { success: false, error: err.message || "Failed to update goal progress" }
    }
}

/**
 * Create a Training Program
 */
export async function createTrainingProgram(input: {
    title: string
    category: TrainingCategory
    trainer?: string
    durationHours?: number
    mode: TrainingMode
    description?: string
    syllabusUrl?: string
    startDate?: string
    endDate?: string
    maxParticipants?: number
}): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const count = await prisma.trainingProgram.count({ where: { tenantId } })
        const programCode = `TRN-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`

        await prisma.trainingProgram.create({
            data: {
                tenantId,
                programCode,
                title: input.title.trim(),
                category: input.category,
                trainer: input.trainer?.trim() || null,
                durationHours: input.durationHours || null,
                mode: input.mode,
                description: input.description?.trim() || null,
                syllabusUrl: input.syllabusUrl?.trim() || null,
                startDate: input.startDate ? new Date(input.startDate) : null,
                endDate: input.endDate ? new Date(input.endDate) : null,
                maxParticipants: input.maxParticipants || 20,
                status: TrainingProgramStatus.UPCOMING
            }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Create training program failed:", err)
        return { success: false, error: err.message || "Failed to create training program" }
    }
}

/**
 * Update Training Program Status
 */
export async function updateTrainingProgramStatus(
    id: string,
    status: TrainingProgramStatus
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        await prisma.trainingProgram.update({
            where: { id, tenantId },
            data: { status }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Update training program status failed:", err)
        return { success: false, error: err.message || "Failed to update program status" }
    }
}

/**
 * Enroll Employee in Training Program
 */
export async function enrollEmployeeInTraining(
    programId: string,
    employeeId: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        // Check if already enrolled
        const existing = await prisma.trainingEnrollment.findUnique({
            where: {
                tenantId_programId_employeeId: {
                    tenantId,
                    programId,
                    employeeId
                }
            }
        })

        if (existing) {
            return { success: false, error: "Employee is already enrolled in this training program" }
        }

        // Check program capacity
        const program = await prisma.trainingProgram.findUnique({
            where: { id: programId, tenantId },
            include: { _count: { select: { enrollments: true } } }
        })

        if (!program) {
            return { success: false, error: "Training program not found" }
        }

        if (program._count.enrollments >= program.maxParticipants) {
            return { success: false, error: `Program has reached maximum capacity (${program.maxParticipants} participants)` }
        }

        await prisma.trainingEnrollment.create({
            data: {
                tenantId,
                programId,
                employeeId,
                status: EnrollmentStatus.ENROLLED
            }
        })

        // Auto transition program to ACTIVE if UPCOMING
        if (program.status === TrainingProgramStatus.UPCOMING) {
            await prisma.trainingProgram.update({
                where: { id: programId },
                data: { status: TrainingProgramStatus.ACTIVE }
            })
        }

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Enroll in training failed:", err)
        return { success: false, error: err.message || "Failed to enroll employee in training" }
    }
}

/**
 * Update Training Enrollment Outcome (Grade, Status, Certificate)
 */
export async function updateEnrollmentStatus(input: {
    enrollmentId: string
    status: EnrollmentStatus
    score?: number
    feedback?: string
    certificateUrl?: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.trainingEnrollment.update({
            where: { id: input.enrollmentId, tenantId },
            data: {
                status: input.status,
                score: input.score !== undefined ? input.score : undefined,
                feedback: input.feedback?.trim() || undefined,
                certificateUrl: input.certificateUrl?.trim() || undefined,
                completedAt: input.status === EnrollmentStatus.COMPLETED ? new Date() : undefined
            }
        })

        revalidatePath("/hr/performance")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Update enrollment status failed:", err)
        return { success: false, error: err.message || "Failed to update enrollment outcome" }
    }
}
