"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    JobStatus,
    ApplicantStage,
    InterviewStatus,
    InterviewRecommendation,
    EmploymentType,
    EmployeeStatus
} from "@prisma/client"

export interface JobOpeningRecord {
    id: string
    jobCode: string
    title: string
    departmentId: string | null
    departmentName: string | null
    designationId: string | null
    designationTitle: string | null
    employmentType: EmploymentType
    location: string
    positionsCount: number
    description: string | null
    requirements: string | null
    salaryMin: number | null
    salaryMax: number | null
    currencyCode: string
    status: JobStatus
    targetDate: Date | null
    applicantsCount: number
    hiredCount: number
    createdAt: Date
}

export interface JobApplicantRecord {
    id: string
    applicantNumber: string
    jobOpeningId: string
    jobOpeningTitle: string
    jobCode: string
    fullName: string
    email: string
    phone: string | null
    currentCompany: string | null
    currentRole: string | null
    experienceYears: number | null
    currentSalary: number | null
    expectedSalary: number | null
    noticePeriodDays: number | null
    resumeUrl: string | null
    portfolioUrl: string | null
    stage: ApplicantStage
    rating: number | null
    notes: string | null
    rejectionReason: string | null
    hiredDate: Date | null
    convertedEmployeeId: string | null
    convertedEmployeeNumber?: string | null
    interviewsCount: number
    createdAt: Date
}

export interface ApplicantInterviewRecord {
    id: string
    applicantId: string
    applicantName: string
    applicantNumber: string
    applicantEmail: string
    jobOpeningTitle: string
    roundName: string
    interviewerId: string | null
    interviewerName: string | null
    scheduledAt: Date
    durationMinutes: number
    meetingLink: string | null
    status: InterviewStatus
    rating: number | null
    feedback: string | null
    recommendation: InterviewRecommendation | null
    createdAt: Date
}

export interface RecruitmentOverviewData {
    stats: {
        activeJobsCount: number
        candidatesInPipelineCount: number
        scheduledInterviewsCount: number
        hiredCount: number
        offerAcceptanceRate: number
    }
    jobOpenings: JobOpeningRecord[]
    applicants: JobApplicantRecord[]
    interviews: ApplicantInterviewRecord[]
    departments: { id: string; name: string }[]
    designations: { id: string; title: string; departmentId: string | null }[]
    employees: { id: string; displayName: string; email: string; departmentName?: string | null }[]
}

/**
 * Fetch Recruitment & ATS overview telemetry, job openings, applicants, and interviews
 */
export async function getRecruitmentOverview(): Promise<RecruitmentOverviewData> {
    const tenantId = await getTenantId()

    const openings = await prisma.jobOpening.findMany({
        where: { tenantId },
        include: {
            department: { select: { name: true } },
            designation: { select: { title: true } },
            applicants: {
                select: { id: true, stage: true }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    const applicants = await prisma.jobApplicant.findMany({
        where: { tenantId },
        include: {
            jobOpening: {
                select: { title: true, jobCode: true }
            },
            convertedEmployee: {
                select: { employeeNumber: true, displayName: true }
            },
            interviews: {
                select: { id: true }
            }
        },
        orderBy: { createdAt: "desc" }
    })

    const interviews = await prisma.applicantInterview.findMany({
        where: { tenantId },
        include: {
            applicant: {
                select: {
                    fullName: true,
                    applicantNumber: true,
                    email: true,
                    jobOpening: { select: { title: true } }
                }
            },
            interviewer: {
                select: { displayName: true }
            }
        },
        orderBy: { scheduledAt: "desc" }
    })

    const departments = await prisma.department.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
    })

    const designations = await prisma.designation.findMany({
        where: { tenantId },
        select: { id: true, title: true, departmentId: true },
        orderBy: { title: "asc" }
    })

    const employees = await prisma.employee.findMany({
        where: { tenantId, status: EmployeeStatus.ACTIVE },
        select: {
            id: true,
            displayName: true,
            email: true,
            department: { select: { name: true } }
        },
        orderBy: { displayName: "asc" }
    })

    const jobOpeningRecords: JobOpeningRecord[] = (openings as any[]).map((job: any) => {
        const hired = job.applicants.filter((a: any) => a.stage === ApplicantStage.HIRED).length
        return {
            id: job.id,
            jobCode: job.jobCode,
            title: job.title,
            departmentId: job.departmentId,
            departmentName: job.department?.name ?? null,
            designationId: job.designationId,
            designationTitle: job.designation?.title ?? null,
            employmentType: job.employmentType,
            location: job.location,
            positionsCount: job.positionsCount,
            description: job.description,
            requirements: job.requirements,
            salaryMin: job.salaryMin ? Number(job.salaryMin) : null,
            salaryMax: job.salaryMax ? Number(job.salaryMax) : null,
            currencyCode: job.currencyCode,
            status: job.status,
            targetDate: job.targetDate,
            applicantsCount: job.applicants.length,
            hiredCount: hired,
            createdAt: job.createdAt
        }
    })

    const applicantRecords: JobApplicantRecord[] = (applicants as any[]).map((app: any) => ({
        id: app.id,
        applicantNumber: app.applicantNumber,
        jobOpeningId: app.jobOpeningId,
        jobOpeningTitle: app.jobOpening?.title ?? "General Application",
        jobCode: app.jobOpening?.jobCode ?? "N/A",
        fullName: app.fullName,
        email: app.email,
        phone: app.phone,
        currentCompany: app.currentCompany,
        currentRole: app.currentRole,
        experienceYears: app.experienceYears ? Number(app.experienceYears) : null,
        currentSalary: app.currentSalary ? Number(app.currentSalary) : null,
        expectedSalary: app.expectedSalary ? Number(app.expectedSalary) : null,
        noticePeriodDays: app.noticePeriodDays,
        resumeUrl: app.resumeUrl,
        portfolioUrl: app.portfolioUrl,
        stage: app.stage,
        rating: app.rating,
        notes: app.notes,
        rejectionReason: app.rejectionReason,
        hiredDate: app.hiredDate,
        convertedEmployeeId: app.convertedEmployeeId,
        convertedEmployeeNumber: app.convertedEmployee?.employeeNumber ?? null,
        interviewsCount: app.interviews.length,
        createdAt: app.createdAt
    }))

    const interviewRecords: ApplicantInterviewRecord[] = (interviews as any[]).map((inv: any) => ({
        id: inv.id,
        applicantId: inv.applicantId,
        applicantName: inv.applicant.fullName,
        applicantNumber: inv.applicant.applicantNumber,
        applicantEmail: inv.applicant.email,
        jobOpeningTitle: inv.applicant.jobOpening?.title ?? "Job Opening",
        roundName: inv.roundName,
        interviewerId: inv.interviewerId,
        interviewerName: inv.interviewer?.displayName || inv.interviewerName || "Unassigned",
        scheduledAt: inv.scheduledAt,
        durationMinutes: inv.durationMinutes,
        meetingLink: inv.meetingLink,
        status: inv.status,
        rating: inv.rating,
        feedback: inv.feedback,
        recommendation: inv.recommendation,
        createdAt: inv.createdAt
    }))

    // Calculate Telemetry stats
    const activeJobsCount = jobOpeningRecords.filter(j => j.status === JobStatus.PUBLISHED).length
    const candidatesInPipelineCount = applicantRecords.filter(
        a => a.stage !== ApplicantStage.REJECTED && a.stage !== ApplicantStage.HIRED
    ).length
    const scheduledInterviewsCount = interviewRecords.filter(i => i.status === InterviewStatus.SCHEDULED).length
    const hiredCount = applicantRecords.filter(a => a.stage === ApplicantStage.HIRED).length
    const offeredCount = applicantRecords.filter(a => a.stage === ApplicantStage.OFFERED || a.stage === ApplicantStage.HIRED).length
    const offerAcceptanceRate = offeredCount > 0 ? Math.round((hiredCount / offeredCount) * 100) : 100

    return {
        stats: {
            activeJobsCount,
            candidatesInPipelineCount,
            scheduledInterviewsCount,
            hiredCount,
            offerAcceptanceRate
        },
        jobOpenings: jobOpeningRecords,
        applicants: applicantRecords,
        interviews: interviewRecords,
        departments,
        designations,
        employees: (employees as any[]).map((e: any) => ({
            id: e.id,
            displayName: e.displayName,
            email: e.email,
            departmentName: e.department?.name ?? null
        }))
    }
}

export interface CreateJobOpeningInput {
    title: string
    departmentId?: string
    designationId?: string
    employmentType?: EmploymentType
    location?: string
    positionsCount?: number
    description?: string
    requirements?: string
    salaryMin?: number
    salaryMax?: number
    currencyCode?: string
    targetDate?: string
}

/**
 * Create a new Job Requisition with auto-generated JOB-YYYY-XXX code
 */
export async function createJobOpening(input: CreateJobOpeningInput) {
    const tenantId = await getTenantId()

    const currentYear = new Date().getFullYear()
    const count = await prisma.jobOpening.count({
        where: { tenantId }
    })
    const jobCode = `JOB-${currentYear}-${String(count + 1).padStart(3, "0")}`

    const opening = await prisma.jobOpening.create({
        data: {
            tenantId,
            jobCode,
            title: input.title.trim(),
            departmentId: input.departmentId || null,
            designationId: input.designationId || null,
            employmentType: input.employmentType || EmploymentType.FULL_TIME,
            location: input.location?.trim() || "On-site",
            positionsCount: input.positionsCount && input.positionsCount > 0 ? input.positionsCount : 1,
            description: input.description?.trim() || null,
            requirements: input.requirements?.trim() || null,
            salaryMin: input.salaryMin !== undefined ? input.salaryMin : null,
            salaryMax: input.salaryMax !== undefined ? input.salaryMax : null,
            currencyCode: input.currencyCode || "INR",
            status: JobStatus.PUBLISHED,
            targetDate: input.targetDate ? new Date(input.targetDate) : null
        }
    })

    revalidatePath("/hr")
    revalidatePath("/hr/recruitment")
    return { success: true, opening }
}

/**
 * Update Job Opening Status (PUBLISHED, ON_HOLD, CLOSED, DRAFT)
 */
export async function updateJobOpeningStatus(id: string, status: JobStatus) {
    const tenantId = await getTenantId()

    await prisma.jobOpening.update({
        where: { id, tenantId },
        data: { status }
    })

    revalidatePath("/hr")
    revalidatePath("/hr/recruitment")
    return { success: true }
}

export interface CreateApplicantInput {
    jobOpeningId: string
    fullName: string
    email: string
    phone?: string
    currentCompany?: string
    currentRole?: string
    experienceYears?: number
    currentSalary?: number
    expectedSalary?: number
    noticePeriodDays?: number
    resumeUrl?: string
    portfolioUrl?: string
    notes?: string
}

/**
 * Add a Candidate to a Job Opening with auto-generated APP-YYYY-XXXX number
 */
export async function createApplicant(input: CreateApplicantInput) {
    const tenantId = await getTenantId()

    const currentYear = new Date().getFullYear()
    const count = await prisma.jobApplicant.count({
        where: { tenantId }
    })
    const applicantNumber = `APP-${currentYear}-${String(count + 1).padStart(4, "0")}`

    const applicant = await prisma.jobApplicant.create({
        data: {
            tenantId,
            jobOpeningId: input.jobOpeningId,
            applicantNumber,
            fullName: input.fullName.trim(),
            email: input.email.trim().toLowerCase(),
            phone: input.phone?.trim() || null,
            currentCompany: input.currentCompany?.trim() || null,
            currentRole: input.currentRole?.trim() || null,
            experienceYears: input.experienceYears !== undefined ? input.experienceYears : null,
            currentSalary: input.currentSalary !== undefined ? input.currentSalary : null,
            expectedSalary: input.expectedSalary !== undefined ? input.expectedSalary : null,
            noticePeriodDays: input.noticePeriodDays !== undefined ? input.noticePeriodDays : 30,
            resumeUrl: input.resumeUrl?.trim() || null,
            portfolioUrl: input.portfolioUrl?.trim() || null,
            notes: input.notes?.trim() || null,
            stage: ApplicantStage.APPLIED
        }
    })

    revalidatePath("/hr")
    revalidatePath("/hr/recruitment")
    return { success: true, applicant }
}

/**
 * Progress candidate through pipeline stages or record rejection
 */
export async function updateApplicantStage(
    id: string,
    stage: ApplicantStage,
    notes?: string,
    rejectionReason?: string
) {
    const tenantId = await getTenantId()

    const updateData: {
        stage: ApplicantStage
        notes?: string
        rejectionReason?: string | null
    } = { stage }

    if (notes !== undefined) {
        updateData.notes = notes
    }
    if (stage === ApplicantStage.REJECTED && rejectionReason) {
        updateData.rejectionReason = rejectionReason
    } else if (stage !== ApplicantStage.REJECTED) {
        updateData.rejectionReason = null
    }

    await prisma.jobApplicant.update({
        where: { id, tenantId },
        data: updateData
    })

    revalidatePath("/hr")
    revalidatePath("/hr/recruitment")
    return { success: true }
}

export interface ScheduleInterviewInput {
    applicantId: string
    roundName: string
    interviewerId?: string
    interviewerName?: string
    scheduledAt: string
    durationMinutes?: number
    meetingLink?: string
}

/**
 * Schedule an interview round and advance candidate stage if currently applied/screening
 */
export async function scheduleInterview(input: ScheduleInterviewInput) {
    const tenantId = await getTenantId()

    const applicant = await prisma.jobApplicant.findUnique({
        where: { id: input.applicantId, tenantId },
        select: { id: true, stage: true }
    })

    if (!applicant) {
        throw new Error("Candidate not found.")
    }

    const interview = await prisma.applicantInterview.create({
        data: {
            tenantId,
            applicantId: input.applicantId,
            roundName: input.roundName.trim(),
            interviewerId: input.interviewerId || null,
            interviewerName: input.interviewerName?.trim() || null,
            scheduledAt: new Date(input.scheduledAt),
            durationMinutes: input.durationMinutes || 45,
            meetingLink: input.meetingLink?.trim() || null,
            status: InterviewStatus.SCHEDULED
        }
    })

    // Auto-advance candidate to INTERVIEWING if in APPLIED or SCREENING
    if (applicant.stage === ApplicantStage.APPLIED || applicant.stage === ApplicantStage.SCREENING) {
        await prisma.jobApplicant.update({
            where: { id: input.applicantId, tenantId },
            data: { stage: ApplicantStage.INTERVIEWING }
        })
    }

    revalidatePath("/hr")
    revalidatePath("/hr/recruitment")
    return { success: true, interview }
}

/**
 * Record interview feedback, rating (1-5), and recommendation
 */
export async function recordInterviewFeedback(
    id: string,
    feedback: string,
    rating: number,
    recommendation: InterviewRecommendation,
    status: InterviewStatus = InterviewStatus.COMPLETED
) {
    const tenantId = await getTenantId()

    await prisma.applicantInterview.update({
        where: { id, tenantId },
        data: {
            feedback: feedback.trim(),
            rating: Math.min(Math.max(rating, 1), 5),
            recommendation,
            status
        }
    })

    revalidatePath("/hr")
    revalidatePath("/hr/recruitment")
    return { success: true }
}

export interface HireApplicantInput {
    firstName: string
    lastName?: string
    email: string
    phone?: string
    departmentId?: string
    designationId?: string
    joiningDate?: string
    basicSalary: number
    currencyCode?: string
    employmentType?: EmploymentType
}

/**
 * 1-Click Hire: Convert Applicant into core HR Employee record atomically
 */
export async function hireApplicant(applicantId: string, employeeData: HireApplicantInput) {
    const tenantId = await getTenantId()

    return await prisma.$transaction(async (tx: any) => {
        const applicant = await tx.jobApplicant.findUnique({
            where: { id: applicantId, tenantId },
            include: { jobOpening: true }
        })

        if (!applicant) {
            throw new Error("Applicant record not found.")
        }

        if (applicant.convertedEmployeeId) {
            throw new Error("This candidate has already been hired into the Employee Directory.")
        }

        // Generate unique employee number e.g. EMP-YYYY-XXXX
        const currentYear = new Date().getFullYear()
        const count = await tx.employee.count({
            where: { tenantId }
        })
        const employeeNumber = `EMP-${currentYear}-${String(count + 1).padStart(4, "0")}`

        const displayName = employeeData.lastName
            ? `${employeeData.firstName.trim()} ${employeeData.lastName.trim()}`
            : employeeData.firstName.trim()

        // 1. Create active employee record
        const newEmployee = await tx.employee.create({
            data: {
                tenantId,
                employeeNumber,
                firstName: employeeData.firstName.trim(),
                lastName: employeeData.lastName?.trim() || null,
                displayName,
                email: employeeData.email.trim().toLowerCase(),
                phone: employeeData.phone?.trim() || applicant.phone || null,
                departmentId: employeeData.departmentId || applicant.jobOpening.departmentId || null,
                designationId: employeeData.designationId || applicant.jobOpening.designationId || null,
                joiningDate: employeeData.joiningDate ? new Date(employeeData.joiningDate) : new Date(),
                status: EmployeeStatus.ACTIVE,
                employmentType: employeeData.employmentType || applicant.jobOpening.employmentType || EmploymentType.FULL_TIME,
                basicSalary: employeeData.basicSalary,
                currencyCode: employeeData.currencyCode || applicant.jobOpening.currencyCode || "INR"
            }
        })

        // 2. Mark applicant as HIRED and link employee record
        const updatedApplicant = await tx.jobApplicant.update({
            where: { id: applicantId, tenantId },
            data: {
                stage: ApplicantStage.HIRED,
                hiredDate: new Date(),
                convertedEmployeeId: newEmployee.id
            }
        })

        // 3. Check if all target positions for the job are filled
        const totalHiredForJob = await tx.jobApplicant.count({
            where: {
                jobOpeningId: applicant.jobOpeningId,
                stage: ApplicantStage.HIRED,
                tenantId
            }
        })

        if (totalHiredForJob >= applicant.jobOpening.positionsCount) {
            await tx.jobOpening.update({
                where: { id: applicant.jobOpeningId, tenantId },
                data: { status: JobStatus.CLOSED }
            })
        }

        return {
            success: true,
            employee: newEmployee,
            applicant: updatedApplicant
        }
    }).then((res: any) => {
        revalidatePath("/hr")
        revalidatePath("/hr/recruitment")
        return res
    })
}
