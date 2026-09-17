"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
    EmployeeStatus,
    EmploymentType,
    AttendanceStatus,
    LeaveType,
    LeaveStatus,
    ProjectTaskStatus,
    ProjectPriority,
    PayslipStatus
} from "@prisma/client"
import { differenceInBusinessDays, startOfDay, endOfDay, subDays, format } from "date-fns"

export interface EmployeeProfileRecord {
    id: string
    employeeNumber: string
    displayName: string
    email: string
    phone: string | null
    dateOfBirth: Date | null
    joiningDate: Date
    status: EmployeeStatus
    employmentType: EmploymentType
    departmentId: string | null
    departmentName: string | null
    designationId: string | null
    designationTitle: string | null
    managerName: string | null
    basicSalary: number | null
    currencyCode: string
    bankDetails: any
    emergencyContact: any
}

export interface TodayAttendanceRecord {
    id: string
    date: Date
    checkIn: Date | null
    checkOut: Date | null
    status: AttendanceStatus
    workingHours: number | null
    notes: string | null
}

export interface AttendanceHistoryRecord {
    id: string
    date: Date
    checkIn: Date | null
    checkOut: Date | null
    status: AttendanceStatus
    workingHours: number | null
    notes: string | null
}

export interface LeaveBalanceCategory {
    total: number
    used: number
    pending: number
    available: number
}

export interface LeaveBalancesRecord {
    casual: LeaveBalanceCategory
    sick: LeaveBalanceCategory
    earned: LeaveBalanceCategory
}

export interface LeaveRequestRecord {
    id: string
    type: LeaveType
    startDate: Date
    endDate: Date
    days: number
    reason: string
    status: LeaveStatus
    rejectionReason: string | null
    createdAt: Date
}

export interface PortalPayslipRecord {
    id: string
    slipNumber: string
    periodMonth: number
    periodYear: number
    status: PayslipStatus
    workingDays: number
    presentDays: number
    basicSalary: number
    hra: number
    specialAllowance: number
    totalGross: number
    pfEmployee: number
    esiEmployee: number
    professionalTax: number
    tdsDeduction: number
    totalDeductions: number
    netSalary: number
    paymentDate: Date | null
    paymentMethod: string | null
}

export interface PortalTaskRecord {
    id: string
    taskCode: string
    title: string
    status: ProjectTaskStatus
    priority: ProjectPriority
    dueDate: Date | null
    projectId: string
    projectCode: string
    projectName: string
}

export interface EmployeeSelectorItem {
    id: string
    displayName: string
    employeeNumber: string
    designationTitle: string | null
    departmentName: string | null
}

export interface EmployeePortalData {
    employee: EmployeeProfileRecord
    allEmployees: EmployeeSelectorItem[]
    todayAttendance: TodayAttendanceRecord | null
    monthlyStats: {
        presentDays: number
        lateDays: number
        leaveDays: number
        totalHours: number
    }
    attendanceHistory: AttendanceHistoryRecord[]
    leaveBalances: LeaveBalancesRecord
    leaveRequests: LeaveRequestRecord[]
    payslips: PortalPayslipRecord[]
    tasks: PortalTaskRecord[]
}

/**
 * Resolves current logged-in employee or target override for Employee Self-Service Portal.
 */
export async function getEmployeePortalData(overrideEmployeeId?: string): Promise<EmployeePortalData | null> {
    try {
        const tenantId = await getTenantId()
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        // Fetch roster for manager switcher
        const allEmpList = await prisma.employee.findMany({
            where: { tenantId, status: EmployeeStatus.ACTIVE },
            select: {
                id: true,
                displayName: true,
                employeeNumber: true,
                designation: { select: { title: true } },
                department: { select: { name: true } }
            },
            orderBy: { displayName: "asc" }
        })

        const allEmployees: EmployeeSelectorItem[] = allEmpList.map((e: any) => ({
            id: e.id,
            displayName: e.displayName,
            employeeNumber: e.employeeNumber,
            designationTitle: e.designation?.title || null,
            departmentName: e.department?.name || null
        }))

        // Resolve active employee
        let targetEmployee = null
        if (overrideEmployeeId) {
            targetEmployee = await prisma.employee.findFirst({
                where: { id: overrideEmployeeId, tenantId },
                include: {
                    department: { select: { name: true } },
                    designation: { select: { title: true } },
                    manager: { select: { displayName: true } }
                }
            })
        }

        if (!targetEmployee && user) {
            targetEmployee = await prisma.employee.findFirst({
                where: {
                    tenantId,
                    OR: [
                        { userId: user.id },
                        { email: user.email }
                    ]
                },
                include: {
                    department: { select: { name: true } },
                    designation: { select: { title: true } },
                    manager: { select: { displayName: true } }
                }
            })
        }

        if (!targetEmployee) {
            // Fallback to first active employee
            targetEmployee = await prisma.employee.findFirst({
                where: { tenantId, status: EmployeeStatus.ACTIVE },
                include: {
                    department: { select: { name: true } },
                    designation: { select: { title: true } },
                    manager: { select: { displayName: true } }
                },
                orderBy: { joiningDate: "asc" }
            })
        }

        if (!targetEmployee) {
            return null
        }

        const employeeId = targetEmployee.id

        // 1. Today's Attendance
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        const todayRecord = await prisma.attendance.findFirst({
            where: {
                tenantId,
                employeeId,
                date: {
                    gte: todayStart,
                    lte: todayEnd
                }
            }
        })

        const todayAttendance: TodayAttendanceRecord | null = todayRecord ? {
            id: todayRecord.id,
            date: todayRecord.date,
            checkIn: todayRecord.checkIn,
            checkOut: todayRecord.checkOut,
            status: todayRecord.status,
            workingHours: todayRecord.workingHours ? Number(todayRecord.workingHours) : null,
            notes: todayRecord.notes
        } : null

        // 2. Recent Attendance (Last 30 Days)
        const past30DaysStart = subDays(todayStart, 30)
        const recentAttendances = await prisma.attendance.findMany({
            where: {
                tenantId,
                employeeId,
                date: {
                    gte: past30DaysStart,
                    lte: todayEnd
                }
            },
            orderBy: { date: "desc" }
        })

        const attendanceHistory: AttendanceHistoryRecord[] = recentAttendances.map((a: any) => ({
            id: a.id,
            date: a.date,
            checkIn: a.checkIn,
            checkOut: a.checkOut,
            status: a.status,
            workingHours: a.workingHours ? Number(a.workingHours) : null,
            notes: a.notes
        }))

        // Month-to-date stats
        const currentMonth = new Date().getMonth()
        const currentYear = new Date().getFullYear()
        const thisMonthRecords = recentAttendances.filter((a: any) => {
            const d = new Date(a.date)
            return d.getMonth() === currentMonth && d.getFullYear() === currentYear
        })

        const presentDays = thisMonthRecords.filter((a: any) => a.status === AttendanceStatus.PRESENT).length
        const lateDays = thisMonthRecords.filter((a: any) => a.status === AttendanceStatus.LATE).length
        const leaveDays = thisMonthRecords.filter((a: any) => a.status === AttendanceStatus.ON_LEAVE).length
        const totalHours = thisMonthRecords.reduce((acc: number, a: any) => acc + (a.workingHours ? Number(a.workingHours) : 0), 0)

        // 3. Leave Requests & Balances
        const allLeaves = await prisma.leave.findMany({
            where: { tenantId, employeeId },
            orderBy: { createdAt: "desc" }
        })

        const leaveRequests: LeaveRequestRecord[] = allLeaves.map((l: any) => ({
            id: l.id,
            type: l.type,
            startDate: l.startDate,
            endDate: l.endDate,
            days: Number(l.days),
            reason: l.reason,
            status: l.status,
            rejectionReason: l.rejectionReason,
            createdAt: l.createdAt
        }))

        // Leave Balances calculation (Standard annual quotas: Casual 12, Sick 12, Earned 18)
        const calculateCategory = (type: LeaveType, entitlement: number): LeaveBalanceCategory => {
            const used = allLeaves
                .filter((l: any) => l.type === type && l.status === LeaveStatus.APPROVED)
                .reduce((acc: number, l: any) => acc + Number(l.days), 0)

            const pending = allLeaves
                .filter((l: any) => l.type === type && l.status === LeaveStatus.PENDING)
                .reduce((acc: number, l: any) => acc + Number(l.days), 0)

            const available = Math.max(0, entitlement - used - pending)
            return { total: entitlement, used, pending, available }
        }

        const leaveBalances: LeaveBalancesRecord = {
            casual: calculateCategory(LeaveType.CASUAL, 12),
            sick: calculateCategory(LeaveType.SICK, 12),
            earned: calculateCategory(LeaveType.ANNUAL, 18)
        }

        // 4. Payslips
        const rawPayslips = await prisma.payslip.findMany({
            where: { tenantId, employeeId },
            orderBy: [{ periodYear: "desc" }, { periodMonth: "desc" }],
            take: 12
        })

        const payslips: PortalPayslipRecord[] = rawPayslips.map((p: any) => ({
            id: p.id,
            slipNumber: p.slipNumber,
            periodMonth: p.periodMonth,
            periodYear: p.periodYear,
            status: p.status,
            workingDays: Number(p.workingDays),
            presentDays: Number(p.presentDays),
            basicSalary: Number(p.basicSalary),
            hra: Number(p.hra),
            specialAllowance: Number(p.specialAllowance),
            totalGross: Number(p.totalGross),
            pfEmployee: Number(p.pfEmployee),
            esiEmployee: Number(p.esiEmployee),
            professionalTax: Number(p.professionalTax),
            tdsDeduction: Number(p.tdsDeduction),
            totalDeductions: Number(p.totalDeductions),
            netSalary: Number(p.netSalary),
            paymentDate: p.paymentDate,
            paymentMethod: p.paymentMethod
        }))

        // 5. Assigned Tasks
        const rawTasks = await prisma.projectTask.findMany({
            where: { tenantId, assignedEmployeeId: employeeId },
            include: {
                project: { select: { id: true, projectCode: true, name: true } }
            },
            orderBy: [{ status: "asc" }, { dueDate: "asc" }],
            take: 20
        })

        const tasks: PortalTaskRecord[] = rawTasks.map((t: any) => ({
            id: t.id,
            taskCode: t.taskCode,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate,
            projectId: t.projectId,
            projectCode: t.project.projectCode,
            projectName: t.project.name
        }))

        const employeeProfile: EmployeeProfileRecord = {
            id: targetEmployee.id,
            employeeNumber: targetEmployee.employeeNumber,
            displayName: targetEmployee.displayName,
            email: targetEmployee.email,
            phone: targetEmployee.phone,
            dateOfBirth: targetEmployee.dateOfBirth,
            joiningDate: targetEmployee.joiningDate,
            status: targetEmployee.status,
            employmentType: targetEmployee.employmentType,
            departmentId: targetEmployee.departmentId,
            departmentName: targetEmployee.department?.name || null,
            designationId: targetEmployee.designationId,
            designationTitle: targetEmployee.designation?.title || null,
            managerName: targetEmployee.manager?.displayName || null,
            basicSalary: targetEmployee.basicSalary ? Number(targetEmployee.basicSalary) : null,
            currencyCode: targetEmployee.currencyCode || "INR",
            bankDetails: targetEmployee.bankDetails,
            emergencyContact: targetEmployee.emergencyContact
        }

        return {
            employee: employeeProfile,
            allEmployees,
            todayAttendance,
            monthlyStats: {
                presentDays,
                lateDays,
                leaveDays,
                totalHours: Math.round(totalHours * 10) / 10
            },
            attendanceHistory,
            leaveBalances,
            leaveRequests,
            payslips,
            tasks
        }
    } catch (err: any) {
        console.error("Failed to load employee portal data:", err)
        return null
    }
}

/**
 * Clock In for today
 */
export async function clockInEmployee(
    employeeId: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        const existing = await prisma.attendance.findFirst({
            where: {
                tenantId,
                employeeId,
                date: { gte: todayStart, lte: todayEnd }
            }
        })

        const now = new Date()

        if (existing) {
            await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    checkIn: now,
                    status: AttendanceStatus.PRESENT,
                    notes: notes || existing.notes
                }
            })
        } else {
            await prisma.attendance.create({
                data: {
                    tenantId,
                    employeeId,
                    date: todayStart,
                    checkIn: now,
                    status: AttendanceStatus.PRESENT,
                    notes: notes || "Clocked in via Employee Self-Service Portal"
                }
            })
        }

        revalidatePath("/hr/portal")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Clock In failed:", err)
        return { success: false, error: err.message || "Failed to clock in" }
    }
}

/**
 * Clock Out for today and compute working hours
 */
export async function clockOutEmployee(
    employeeId: string,
    notes?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const todayStart = startOfDay(new Date())
        const todayEnd = endOfDay(new Date())

        const existing = await prisma.attendance.findFirst({
            where: {
                tenantId,
                employeeId,
                date: { gte: todayStart, lte: todayEnd }
            }
        })

        const now = new Date()

        if (!existing || !existing.checkIn) {
            // Clocked out without prior clock-in
            const defaultCheckIn = new Date(now.getTime() - 8 * 60 * 60 * 1000)
            await prisma.attendance.create({
                data: {
                    tenantId,
                    employeeId,
                    date: todayStart,
                    checkIn: defaultCheckIn,
                    checkOut: now,
                    workingHours: 8.0,
                    status: AttendanceStatus.PRESENT,
                    notes: notes || "Clocked out via Employee Self-Service Portal"
                }
            })
        } else {
            const durationMs = now.getTime() - new Date(existing.checkIn).getTime()
            const hours = Math.round((durationMs / (1000 * 60 * 60)) * 10) / 10

            await prisma.attendance.update({
                where: { id: existing.id },
                data: {
                    checkOut: now,
                    workingHours: Math.max(hours, 0.5),
                    status: hours >= 5 ? AttendanceStatus.PRESENT : AttendanceStatus.HALF_DAY,
                    notes: notes || existing.notes
                }
            })
        }

        revalidatePath("/hr/portal")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Clock Out failed:", err)
        return { success: false, error: err.message || "Failed to clock out" }
    }
}

/**
 * Submit employee leave application
 */
export async function applyEmployeeLeave(input: {
    employeeId: string
    type: LeaveType
    startDate: string
    endDate: string
    reason: string
}): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        if (!input.reason.trim()) {
            return { success: false, error: "Please provide a reason for leave" }
        }

        const start = new Date(input.startDate)
        const end = new Date(input.endDate)

        if (end < start) {
            return { success: false, error: "End date cannot be prior to start date" }
        }

        // Calculate business days inclusive
        const diff = Math.max(differenceInBusinessDays(end, start) + 1, 1)

        await prisma.leave.create({
            data: {
                tenantId,
                employeeId: input.employeeId,
                type: input.type,
                startDate: start,
                endDate: end,
                days: diff,
                reason: input.reason.trim(),
                status: LeaveStatus.PENDING
            }
        })

        revalidatePath("/hr/portal")
        revalidatePath("/hr")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to apply for leave:", err)
        return { success: false, error: err.message || "Failed to submit leave request" }
    }
}

/**
 * Update project task status from portal
 */
export async function updatePortalTaskStatus(
    taskId: string,
    status: ProjectTaskStatus
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.projectTask.update({
            where: { id: taskId, tenantId },
            data: {
                status,
                completedAt: status === ProjectTaskStatus.DONE ? new Date() : undefined
            }
        })

        revalidatePath("/hr/portal")
        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to update task status:", err)
        return { success: false, error: err.message || "Failed to update task" }
    }
}
