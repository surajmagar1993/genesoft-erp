"use server"

import { prisma } from "@/lib/prisma"
import { tenantTimeZone, zonedDateTime } from "@/lib/timezone"
import { nextSequence } from "@/lib/sequence"
import { assertCanActForEmployee, fireLeaveRequested } from "@/lib/employee-access"
import { fireWorkflowEvent } from "@/lib/workflow-engine"
import { isDemoSeedEnabled } from "@/lib/demo-seed"
import { getTenantRole, getTenantId, getTenantManagerId, getTenantWriterId } from "@/lib/get-tenant-id"
import { assertTenantRefs } from "@/lib/tenant-refs"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { safeAction } from "@/lib/safe-action"
import {
    EmployeeStatus,
    EmploymentType,
    AttendanceStatus,
    LeaveType,
    LeaveStatus
} from "@prisma/client"

/** Module access checked by the tenant helpers (src/lib/access.ts) */
const MODULE = "hr" as const

export interface DepartmentRecord {
    id: string
    name: string
    code: string | null
    description: string | null
    managerId: string | null
    managerName?: string | null
    employeeCount: number
    isActive: boolean
}

export interface DesignationRecord {
    id: string
    departmentId: string | null
    departmentName?: string | null
    title: string
    description: string | null
    employeeCount: number
}

export interface EmployeeRecord {
    id: string
    tenantId: string
    userId: string | null
    employeeNumber: string
    firstName: string
    lastName: string | null
    displayName: string
    email: string
    phone: string | null
    dateOfBirth: Date | null
    gender: string | null
    joiningDate: Date
    status: EmployeeStatus
    employmentType: EmploymentType
    departmentId: string | null
    departmentName?: string | null
    designationId: string | null
    designationTitle?: string | null
    managerId: string | null
    managerName?: string | null
    basicSalary: number | null
    currencyCode: string
    bankDetails: any
    address: any
    emergencyContact: any
    createdAt: Date
}

export interface AttendanceRecord {
    id: string
    employeeId: string
    employeeName: string
    employeeNumber: string
    departmentName: string | null
    date: Date
    checkIn: Date | null
    checkOut: Date | null
    status: AttendanceStatus
    workingHours: number | null
    notes: string | null
}

export interface LeaveRecord {
    id: string
    employeeId: string
    employeeName: string
    employeeNumber: string
    departmentName: string | null
    type: LeaveType
    startDate: Date
    endDate: Date
    days: number
    reason: string
    status: LeaveStatus
    approvedAt: Date | null
    rejectionReason: string | null
    createdAt: Date
}

export interface HROverviewData {
    telemetry: {
        totalEmployees: number
        activeEmployees: number
        presentToday: number
        attendanceRate: number
        pendingLeavesCount: number
        departmentsCount: number
    }
    employees: EmployeeRecord[]
    departments: DepartmentRecord[]
    designations: DesignationRecord[]
    todayAttendance: AttendanceRecord[]
    allLeaves: LeaveRecord[]
}

export interface CreateEmployeeInput {
    firstName: string
    lastName?: string
    email: string
    phone?: string
    joiningDate?: string
    status?: EmployeeStatus
    employmentType?: EmploymentType
    departmentId?: string
    designationId?: string
    managerId?: string
    basicSalary?: number
    currencyCode?: string
    country?: string
    state?: string
    city?: string
    emergencyContactName?: string
    emergencyContactPhone?: string
}

export interface UpdateEmployeeInput {
    firstName?: string
    lastName?: string
    email?: string
    phone?: string
    status?: EmployeeStatus
    employmentType?: EmploymentType
    departmentId?: string
    designationId?: string
    managerId?: string
    basicSalary?: number
    country?: string
    state?: string
    city?: string
}

/**
 * Standard starter departments and designations seeded if tenant has none.
 */
const DEFAULT_DEPARTMENTS = [
    {
        name: "Engineering & Technology",
        code: "ENG",
        description: "Software engineering, product development, infrastructure, and IT support.",
        designations: ["Engineering Lead", "Senior Full-Stack Developer", "QA Automation Engineer", "DevOps Engineer"]
    },
    {
        name: "Sales & Business Development",
        code: "SALES",
        description: "Direct sales, enterprise accounts, client relationship management, and partnerships.",
        designations: ["Sales Director", "Enterprise Account Executive", "Sales Development Representative"]
    },
    {
        name: "Finance & Accounts",
        code: "FIN",
        description: "Financial accounting, accounts receivable/payable, taxation, and treasury.",
        designations: ["Finance Controller", "Senior Accountant", "Billing Specialist"]
    },
    {
        name: "Operations & Logistics",
        code: "OPS",
        description: "Supply chain fulfillment, inventory warehousing, quality control, and procurement.",
        designations: ["Operations Manager", "Warehouse Supervisor", "Procurement Coordinator"]
    },
    {
        name: "Human Resources",
        code: "HR",
        description: "Workforce talent acquisition, employee relations, payroll compliance, and culture.",
        designations: ["HR Business Partner", "Talent Acquisition Specialist", "People Operations Associate"]
    }
]

/**
 * Auto-seeds standard starter departments and designations if tenant has none.
 */
async function autoSeedHRIfEmpty(tenantId: string) {
    const existingCount = await prisma.department.count({
        where: { tenantId }
    })

    if (existingCount === 0) {
        for (const dept of DEFAULT_DEPARTMENTS) {
            const createdDept = await prisma.department.create({
                data: {
                    tenantId,
                    name: dept.name,
                    code: dept.code,
                    description: dept.description,
                    isActive: true
                }
            })

            for (const title of dept.designations) {
                await prisma.designation.create({
                    data: {
                        tenantId,
                        departmentId: createdDept.id,
                        title,
                        description: `Role in ${dept.name}`
                    }
                })
            }
        }
    }
}

/**
 * Retrieves the complete HR overview, employee roster, departments, designations,
 * attendance for the specified date, and leave management records.
 */
export async function getHROverview(selectedDateStr?: string): Promise<HROverviewData> {
    const tenantId = await getTenantId(MODULE)

    // 1. Ensure tenant has starter departments
    if (isDemoSeedEnabled()) await autoSeedHRIfEmpty(tenantId)

    // Normalize target date (defaults to today's start of day UTC)
    const targetDate = selectedDateStr ? new Date(selectedDateStr) : new Date()
    const startOfTargetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
    const endOfTargetDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999)

    // 2. Fetch Employees with relations
    const rawEmployees = await prisma.employee.findMany({
        where: { tenantId },
        include: {
            department: { select: { name: true } },
            designation: { select: { title: true } },
            manager: { select: { displayName: true } }
        },
        orderBy: [{ status: "asc" }, { employeeNumber: "asc" }]
    })

    const employees: EmployeeRecord[] = rawEmployees.map((e: any) => ({
        id: e.id,
        tenantId: e.tenantId,
        userId: e.userId,
        employeeNumber: e.employeeNumber,
        firstName: e.firstName,
        lastName: e.lastName,
        displayName: e.displayName,
        email: e.email,
        phone: e.phone,
        dateOfBirth: e.dateOfBirth,
        gender: e.gender,
        joiningDate: e.joiningDate,
        status: e.status,
        employmentType: e.employmentType,
        departmentId: e.departmentId,
        departmentName: e.department?.name || null,
        designationId: e.designationId,
        designationTitle: e.designation?.title || null,
        managerId: e.managerId,
        managerName: e.manager?.displayName || null,
        basicSalary: e.basicSalary ? Number(e.basicSalary) : null,
        currencyCode: e.currencyCode,
        bankDetails: e.bankDetails,
        address: e.address,
        emergencyContact: e.emergencyContact,
        createdAt: e.createdAt
    }))

    // 3. Fetch Departments with employee counts
    const rawDepartments = await prisma.department.findMany({
        where: { tenantId },
        include: {
            manager: { select: { displayName: true } },
            _count: { select: { employees: true } }
        },
        orderBy: { name: "asc" }
    })

    const departments: DepartmentRecord[] = rawDepartments.map((d: any) => ({
        id: d.id,
        name: d.name,
        code: d.code,
        description: d.description,
        managerId: d.managerId,
        managerName: d.manager?.displayName || null,
        employeeCount: d._count.employees,
        isActive: d.isActive
    }))

    // 4. Fetch Designations
    const rawDesignations = await prisma.designation.findMany({
        where: { tenantId },
        include: {
            department: { select: { name: true } },
            _count: { select: { employees: true } }
        },
        orderBy: { title: "asc" }
    })

    const designations: DesignationRecord[] = rawDesignations.map((des: any) => ({
        id: des.id,
        departmentId: des.departmentId,
        departmentName: des.department?.name || null,
        title: des.title,
        description: des.description,
        employeeCount: des._count.employees
    }))

    // 5. Fetch Attendance for Target Date
    const rawAttendance = await prisma.attendance.findMany({
        where: {
            tenantId,
            date: {
                gte: startOfTargetDate,
                lte: endOfTargetDate
            }
        },
        include: {
            employee: {
                select: {
                    displayName: true,
                    employeeNumber: true,
                    department: { select: { name: true } }
                }
            }
        }
    })

    const todayAttendance: AttendanceRecord[] = rawAttendance.map((a: any) => ({
        id: a.id,
        employeeId: a.employeeId,
        employeeName: a.employee.displayName,
        employeeNumber: a.employee.employeeNumber,
        departmentName: a.employee.department?.name || null,
        date: a.date,
        checkIn: a.checkIn,
        checkOut: a.checkOut,
        status: a.status,
        workingHours: a.workingHours ? Number(a.workingHours) : null,
        notes: a.notes
    }))

    // 6. Fetch Leaves
    const rawLeaves = await prisma.leave.findMany({
        where: { tenantId },
        include: {
            employee: {
                select: {
                    displayName: true,
                    employeeNumber: true,
                    department: { select: { name: true } }
                }
            }
        },
        orderBy: [{ status: "asc" }, { startDate: "desc" }]
    })

    const allLeaves: LeaveRecord[] = rawLeaves.map((l: any) => ({
        id: l.id,
        employeeId: l.employeeId,
        employeeName: l.employee.displayName,
        employeeNumber: l.employee.employeeNumber,
        departmentName: l.employee.department?.name || null,
        type: l.type,
        startDate: l.startDate,
        endDate: l.endDate,
        days: Number(l.days),
        reason: l.reason,
        status: l.status,
        approvedAt: l.approvedAt,
        rejectionReason: l.rejectionReason,
        createdAt: l.createdAt
    }))

    // 7. Calculate Telemetry
    const totalEmployees = employees.length
    const activeEmployees = employees.filter((e: any) => e.status === "ACTIVE" || e.status === "PROBATION").length
    const presentToday = todayAttendance.filter((a: any) => a.status === "PRESENT" || a.status === "LATE").length
    const attendanceRate = totalEmployees > 0 ? Math.round((presentToday / totalEmployees) * 100) : 0
    const pendingLeavesCount = allLeaves.filter((l: any) => l.status === "PENDING").length
    const departmentsCount = departments.length

    return {
        telemetry: {
            totalEmployees,
            activeEmployees,
            presentToday,
            attendanceRate,
            pendingLeavesCount,
            departmentsCount
        },
        employees,
        departments,
        designations,
        todayAttendance,
        allLeaves
    }
}

/**
 * Creates a new employee with an auto-generated sequential ID (EMP-0001).
 */
async function _createEmployee(data: CreateEmployeeInput) {
    const tenantId = await getTenantManagerId(MODULE)
    await assertTenantRefs(tenantId, { department: data.departmentId, designation: data.designationId, employee: data.managerId })

    if (!data.firstName?.trim()) throw new Error("First name is required")
    if (!data.email?.trim()) throw new Error("Work email is required")

    // Check duplicate email
    const existing = await prisma.employee.findFirst({
        where: { tenantId, email: data.email.trim().toLowerCase() }
    })
    if (existing) throw new Error(`An employee with email ${data.email} already exists`)

    // Sequential EMP-XXXX
    const employeeNumber = await nextSequence(prisma, "employee", tenantId, `EMP-`, 4)

    const displayName = data.lastName?.trim()
        ? `${data.firstName.trim()} ${data.lastName.trim()}`
        : data.firstName.trim()

    const newEmployee = await prisma.employee.create({
        data: {
            tenantId,
            employeeNumber,
            firstName: data.firstName.trim(),
            lastName: data.lastName?.trim() || null,
            displayName,
            email: data.email.trim().toLowerCase(),
            phone: data.phone?.trim() || null,
            joiningDate: data.joiningDate ? new Date(data.joiningDate) : new Date(),
            status: data.status || "ACTIVE",
            employmentType: data.employmentType || "FULL_TIME",
            departmentId: data.departmentId || null,
            designationId: data.designationId || null,
            managerId: data.managerId || null,
            basicSalary: data.basicSalary ? Number(data.basicSalary) : null,
            currencyCode: data.currencyCode || "INR",
            address: {
                country: data.country?.trim() || "India",
                state: data.state?.trim() || "",
                city: data.city?.trim() || ""
            },
            emergencyContact: {
                name: data.emergencyContactName?.trim() || "",
                phone: data.emergencyContactPhone?.trim() || ""
            }
        }
    })

    const [department, designation] = await Promise.all([
        newEmployee.departmentId ? prisma.department.findFirst({ where: { id: newEmployee.departmentId, tenantId }, select: { name: true } }) : null,
        newEmployee.designationId ? prisma.designation.findFirst({ where: { id: newEmployee.designationId, tenantId }, select: { title: true } }) : null,
    ])
    fireWorkflowEvent(tenantId, "EMPLOYEE_JOINED", {
        employeeName: newEmployee.displayName,
        department: department?.name ?? null,
        designation: designation?.title ?? null,
    }, newEmployee.id)

    revalidatePath("/hr")
    return { success: true, employee: newEmployee }
}

/**
 * Updates an employee's profile and organizational assignments.
 */
async function _updateEmployee(employeeId: string, data: UpdateEmployeeInput) {
    const tenantId = await getTenantManagerId(MODULE)
    await assertTenantRefs(tenantId, { employee: [employeeId, data.managerId], department: data.departmentId, designation: data.designationId })

    const existing = await prisma.employee.findFirst({
        where: { id: employeeId, tenantId }
    })
    if (!existing) throw new Error("Employee not found")

    const firstName = data.firstName !== undefined ? data.firstName.trim() : existing.firstName
    const lastName = data.lastName !== undefined ? data.lastName.trim() : existing.lastName
    const displayName = lastName ? `${firstName} ${lastName}` : firstName

    const updated = await prisma.employee.update({
        where: { id: employeeId },
        data: {
            firstName: data.firstName !== undefined ? data.firstName.trim() : undefined,
            lastName: data.lastName !== undefined ? data.lastName.trim() : undefined,
            displayName,
            email: data.email !== undefined ? data.email.trim().toLowerCase() : undefined,
            phone: data.phone !== undefined ? data.phone.trim() : undefined,
            status: data.status,
            employmentType: data.employmentType,
            departmentId: data.departmentId,
            designationId: data.designationId,
            managerId: data.managerId,
            basicSalary: data.basicSalary !== undefined ? (data.basicSalary ? Number(data.basicSalary) : null) : undefined,
            address: {
                ...(existing.address as any || {}),
                country: data.country !== undefined ? data.country.trim() : ((existing.address as any)?.country || "India"),
                state: data.state !== undefined ? data.state.trim() : (existing.address as any)?.state,
                city: data.city !== undefined ? data.city.trim() : (existing.address as any)?.city
            }
        }
    })

    revalidatePath("/hr")
    return { success: true, employee: updated }
}

/**
 * Creates a department.
 */
async function _createDepartment(data: {
    name: string
    code?: string
    description?: string
    managerId?: string
}) {
    const tenantId = await getTenantManagerId(MODULE)
    await assertTenantRefs(tenantId, { employee: data.managerId })

    if (!data.name?.trim()) throw new Error("Department name is required")

    const newDept = await prisma.department.create({
        data: {
            tenantId,
            name: data.name.trim(),
            code: data.code?.trim()?.toUpperCase() || null,
            description: data.description?.trim() || null,
            managerId: data.managerId || null,
            isActive: true
        }
    })

    revalidatePath("/hr")
    return { success: true, department: newDept }
}

/**
 * Creates a designation / job title linked to a department.
 */
async function _createDesignation(data: {
    title: string
    departmentId?: string
    description?: string
}) {
    const tenantId = await getTenantManagerId(MODULE)
    await assertTenantRefs(tenantId, { department: data.departmentId })

    if (!data.title?.trim()) throw new Error("Designation title is required")

    const newDes = await prisma.designation.create({
        data: {
            tenantId,
            title: data.title.trim(),
            departmentId: data.departmentId || null,
            description: data.description?.trim() || null
        }
    })

    revalidatePath("/hr")
    return { success: true, designation: newDes }
}

/**
 * Records or updates attendance for an employee on a given date.
 */
export async function recordAttendance(data: {
    employeeId: string
    date: string
    status: AttendanceStatus
    checkIn?: string
    checkOut?: string
    notes?: string
}) {
    const tenantId = await getTenantManagerId(MODULE)
    await assertTenantRefs(tenantId, { employee: data.employeeId })

    const targetDate = new Date(data.date)
    const normalizedDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())

    let checkInDate: Date | null = null
    let checkOutDate: Date | null = null
    let workingHours: number | null = null

    // Times are typed in the business's local time
    const tz = data.checkIn || data.checkOut ? await tenantTimeZone(tenantId) : "UTC"
    if (data.checkIn) {
        checkInDate = zonedDateTime(data.date, data.checkIn, tz)
    }
    if (data.checkOut) {
        checkOutDate = zonedDateTime(data.date, data.checkOut, tz)
    }
    if (checkInDate && checkOutDate) {
        const diffMs = checkOutDate.getTime() - checkInDate.getTime()
        if (diffMs > 0) {
            workingHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100
        }
    } else if (data.status === "PRESENT") {
        workingHours = 8.0
    } else if (data.status === "HALF_DAY") {
        workingHours = 4.0
    }

    const attendance = await prisma.attendance.upsert({
        where: {
            tenantId_employeeId_date: {
                tenantId,
                employeeId: data.employeeId,
                date: normalizedDate
            }
        },
        create: {
            tenantId,
            employeeId: data.employeeId,
            date: normalizedDate,
            status: data.status,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            workingHours,
            notes: data.notes?.trim() || null
        },
        update: {
            status: data.status,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            workingHours,
            notes: data.notes?.trim() || null
        }
    })

    revalidatePath("/hr")
    return { success: true, attendance }
}

/**
 * Submits a new leave request.
 */
async function _submitLeaveRequest(data: {
    employeeId: string
    type: LeaveType
    startDate: string
    endDate: string
    reason: string
}) {
    // Self-service: anyone may request their own leave (HR access is checked for others)
    const tenantId = await getTenantWriterId()
    await assertCanActForEmployee(tenantId, data.employeeId)

    if (!data.employeeId) throw new Error("Employee is required")
    if (!data.startDate || !data.endDate) throw new Error("Start and end dates are required")
    if (!data.reason?.trim()) throw new Error("Reason for leave is required")

    const start = new Date(data.startDate)
    const end = new Date(data.endDate)

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) throw new Error("Choose valid dates")
    if (end < start) throw new Error("End date cannot be before start date")

    // No overlapping requests for the same person
    const overlapping = await prisma.leave.findFirst({
        where: { tenantId, employeeId: data.employeeId, status: { in: ["PENDING", "APPROVED"] }, startDate: { lte: end }, endDate: { gte: start } },
        select: { startDate: true, endDate: true },
    })
    if (overlapping) {
        throw new Error(`There's already a leave request from ${overlapping.startDate.toISOString().slice(0, 10)} to ${overlapping.endDate.toISOString().slice(0, 10)}`)
    }

    const diffDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    const newLeave = await prisma.leave.create({
        data: {
            tenantId,
            employeeId: data.employeeId,
            type: data.type,
            startDate: start,
            endDate: end,
            days: diffDays,
            reason: data.reason.trim(),
            status: "PENDING"
        }
    })

    await fireLeaveRequested(tenantId, newLeave.id, data.employeeId, data.type, diffDays)

    revalidatePath("/hr")
    return { success: true, leave: newLeave }
}

/**
 * Updates leave request status (Approve / Reject).
 */
async function _updateLeaveStatus(data: {
    leaveId: string
    status: LeaveStatus
    rejectionReason?: string
}) {
    const tenantId = await getTenantManagerId(MODULE)
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const leave = await prisma.leave.findFirst({
        where: { id: data.leaveId, tenantId },
        include: { employee: { select: { userId: true } } },
    })
    if (!leave) throw new Error("Leave request not found")
    if (!["APPROVED", "REJECTED", "CANCELLED", "PENDING"].includes(data.status)) throw new Error("Invalid leave status")
    // Managers can't approve or reject their own leave (an admin can)
    if (user && leave.employee?.userId === user.id) {
        const role = await getTenantRole()
        if (role !== "ADMIN" && role !== "SUPER_ADMIN") throw new Error("Ask another manager or an admin to decide on your own leave")
    }

    const updated = await prisma.leave.update({
        where: { id: data.leaveId, tenantId },
        data: {
            status: data.status,
            approvedById: user?.id || null,
            approvedAt: new Date(),
            rejectionReason: data.rejectionReason?.trim() || null
        }
    })

    revalidatePath("/hr")
    return { success: true, leave: updated }
}

/* Exported as ActionResult (safeAction): the screen shows the real message; the client calls unwrap() */
export async function createEmployee(...args: Parameters<typeof _createEmployee>) {
    return safeAction(() => _createEmployee(...args))
}
export async function updateEmployee(...args: Parameters<typeof _updateEmployee>) {
    return safeAction(() => _updateEmployee(...args))
}
export async function createDepartment(...args: Parameters<typeof _createDepartment>) {
    return safeAction(() => _createDepartment(...args))
}
export async function createDesignation(...args: Parameters<typeof _createDesignation>) {
    return safeAction(() => _createDesignation(...args))
}
export async function submitLeaveRequest(...args: Parameters<typeof _submitLeaveRequest>) {
    return safeAction(() => _submitLeaveRequest(...args))
}
export async function updateLeaveStatus(...args: Parameters<typeof _updateLeaveStatus>) {
    return safeAction(() => _updateLeaveStatus(...args))
}
