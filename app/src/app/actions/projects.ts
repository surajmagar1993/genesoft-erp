"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import {
    ProjectStatus,
    ProjectPriority,
    ProjectBillingType,
    MilestoneStatus,
    ProjectTaskStatus
} from "@prisma/client"

export interface ProjectRecord {
    id: string
    tenantId: string
    projectCode: string
    name: string
    description: string | null
    status: ProjectStatus
    priority: ProjectPriority
    billingType: ProjectBillingType
    startDate: Date | null
    targetEndDate: Date | null
    actualEndDate: Date | null
    budget: number | null
    currencyCode: string
    clientId: string | null
    clientName: string | null
    managerId: string | null
    managerName: string | null
    tasksCount: number
    completedTasksCount: number
    completionPercentage: number
    totalEstimatedHours: number
    totalActualHours: number
    membersCount: number
    milestonesCount: number
    createdAt: Date
    updatedAt: Date
}

export interface ProjectMemberRecord {
    id: string
    projectId: string
    employeeId: string
    employeeName: string
    employeeNumber: string
    departmentName: string | null
    designationTitle: string | null
    role: string
    hourlyRate: number | null
    joinedAt: Date
}

export interface ProjectMilestoneRecord {
    id: string
    projectId: string
    title: string
    description: string | null
    dueDate: Date | null
    completedDate: Date | null
    status: MilestoneStatus
    deliverable: string | null
    tasksCount: number
}

export interface ProjectTaskRecord {
    id: string
    projectId: string
    projectCode: string
    projectName: string
    milestoneId: string | null
    milestoneTitle: string | null
    taskCode: string
    title: string
    description: string | null
    status: ProjectTaskStatus
    priority: ProjectPriority
    assignedEmployeeId: string | null
    assignedEmployeeName: string | null
    estimatedHours: number | null
    actualHours: number
    startDate: Date | null
    dueDate: Date | null
    completedAt: Date | null
    createdAt: Date
}

export interface ProjectTimeEntryRecord {
    id: string
    projectId: string
    projectName: string
    taskId: string | null
    taskCode: string | null
    taskTitle: string | null
    employeeId: string
    employeeName: string
    workDate: Date
    hours: number
    description: string
    isBillable: boolean
    isBilled: boolean
    createdAt: Date
}

export interface ProjectsOverviewData {
    telemetry: {
        totalProjects: number
        activeProjects: number
        completedProjects: number
        totalTasks: number
        completedTasks: number
        inProgressTasks: number
        backlogTasks: number
        totalTrackedHours: number
        totalBillableHours: number
        totalBudget: number
    }
    projects: ProjectRecord[]
    selectedProject: {
        project: ProjectRecord
        members: ProjectMemberRecord[]
        milestones: ProjectMilestoneRecord[]
        tasks: ProjectTaskRecord[]
        timeEntries: ProjectTimeEntryRecord[]
    } | null
    allTasks: ProjectTaskRecord[]
    allTimeEntries: ProjectTimeEntryRecord[]
    availableClients: Array<{ id: string; name: string }>
    availableEmployees: Array<{
        id: string
        name: string
        employeeNumber: string
        departmentName: string | null
        designationTitle: string | null
    }>
}

export interface CreateProjectInput {
    name: string
    description?: string
    priority?: ProjectPriority
    status?: ProjectStatus
    billingType?: ProjectBillingType
    startDate?: string
    targetEndDate?: string
    budget?: number
    currencyCode?: string
    clientId?: string
    managerId?: string
}

export interface UpdateProjectInput {
    name?: string
    description?: string
    status?: ProjectStatus
    priority?: ProjectPriority
    billingType?: ProjectBillingType
    startDate?: string
    targetEndDate?: string
    actualEndDate?: string
    budget?: number
    clientId?: string
    managerId?: string
}

export interface CreateProjectTaskInput {
    projectId: string
    milestoneId?: string
    title: string
    description?: string
    status?: ProjectTaskStatus
    priority?: ProjectPriority
    assignedEmployeeId?: string
    estimatedHours?: number
    startDate?: string
    dueDate?: string
}

export interface UpdateProjectTaskInput {
    title?: string
    description?: string
    milestoneId?: string
    status?: ProjectTaskStatus
    priority?: ProjectPriority
    assignedEmployeeId?: string
    estimatedHours?: number
    actualHours?: number
    startDate?: string
    dueDate?: string
}

export interface CreateMilestoneInput {
    projectId: string
    title: string
    description?: string
    dueDate?: string
    status?: MilestoneStatus
    deliverable?: string
}

export interface LogTimeInput {
    projectId: string
    taskId?: string
    employeeId: string
    workDate: string
    hours: number
    description: string
    isBillable?: boolean
}

/**
 * Auto-seeds starter sample projects with milestones, tasks, team allocation, and timesheets
 * if the tenant has zero projects.
 */
async function autoSeedProjectsIfEmpty(tenantId: string) {
    const existingCount = await prisma.project.count({
        where: { tenantId }
    })

    if (existingCount > 0) return

    // Find any existing client contact or employee to link
    const firstClient = await prisma.contact.findFirst({
        where: { tenantId }
    })

    const firstEmployee = await prisma.employee.findFirst({
        where: { tenantId },
        orderBy: { createdAt: "asc" }
    })

    const secondEmployee = await prisma.employee.findFirst({
        where: { tenantId },
        skip: 1,
        orderBy: { createdAt: "asc" }
    })

    // Project 1: Cloud & ERP Modernization
    const project1 = await prisma.project.create({
        data: {
            tenantId,
            projectCode: "PRJ-0001",
            name: "Enterprise ERP & Cloud Infrastructure Modernization",
            description: "High-availability multi-tenant cloud architecture, automated PostgreSQL indexing, and supply chain ledger integrations.",
            status: ProjectStatus.IN_PROGRESS,
            priority: ProjectPriority.HIGH,
            billingType: ProjectBillingType.FIXED_FEE,
            budget: 450000.00,
            currencyCode: "INR",
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            targetEndDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
            clientId: firstClient?.id || null,
            managerId: firstEmployee?.id || null,
        }
    })

    // Milestones for Project 1
    const m1 = await prisma.projectMilestone.create({
        data: {
            tenantId,
            projectId: project1.id,
            title: "Architecture Design & Schema Audit",
            description: "Comprehensive audit of relational schema constraints and Supabase RLS policies.",
            status: MilestoneStatus.COMPLETED,
            deliverable: "System Design Document & Multi-Tenant Blueprint",
            completedDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        }
    })

    const m2 = await prisma.projectMilestone.create({
        data: {
            tenantId,
            projectId: project1.id,
            title: "Agile Project & Work Tracker Deployment",
            description: "Production release of Kanban boards, milestone tracking, and staff time entries.",
            status: MilestoneStatus.IN_PROGRESS,
            deliverable: "Fully functional /projects dashboard module",
            dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        }
    })

    const m3 = await prisma.projectMilestone.create({
        data: {
            tenantId,
            projectId: project1.id,
            title: "User Acceptance Testing & Performance Hardening",
            description: "Stress test high-concurrency purchase receipts and stock inventory valuations.",
            status: MilestoneStatus.PENDING,
            deliverable: "UAT Sign-off & Performance Benchmark Report",
            dueDate: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
        }
    })

    // Team allocation
    if (firstEmployee) {
        await prisma.projectMember.create({
            data: {
                tenantId,
                projectId: project1.id,
                employeeId: firstEmployee.id,
                role: "Project Manager & Tech Lead",
                hourlyRate: 1500.00,
            }
        })
    }

    if (secondEmployee) {
        await prisma.projectMember.create({
            data: {
                tenantId,
                projectId: project1.id,
                employeeId: secondEmployee.id,
                role: "Senior Full-Stack Engineer",
                hourlyRate: 1200.00,
            }
        })
    }

    // Tasks for Project 1
    const t1 = await prisma.projectTask.create({
        data: {
            tenantId,
            projectId: project1.id,
            milestoneId: m1.id,
            taskCode: "TSK-1001",
            title: "Database schema normalization and RLS policy verification",
            description: "Audit all 5 projects tables and establish tenant-isolated row policies.",
            status: ProjectTaskStatus.DONE,
            priority: ProjectPriority.URGENT,
            assignedEmployeeId: firstEmployee?.id || null,
            estimatedHours: 16.0,
            actualHours: 16.0,
            completedAt: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
        }
    })

    const t2 = await prisma.projectTask.create({
        data: {
            tenantId,
            projectId: project1.id,
            milestoneId: m2.id,
            taskCode: "TSK-1002",
            title: "Construct responsive Kanban boards with stage status triggers",
            description: "Interactive 5-stage task board with inline priority indicators and assignee badges.",
            status: ProjectTaskStatus.IN_PROGRESS,
            priority: ProjectPriority.HIGH,
            assignedEmployeeId: secondEmployee?.id || firstEmployee?.id || null,
            estimatedHours: 24.0,
            actualHours: 14.0,
            dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        }
    })

    await prisma.projectTask.create({
        data: {
            tenantId,
            projectId: project1.id,
            milestoneId: m2.id,
            taskCode: "TSK-1003",
            title: "Connect employee time tracking with task hours accumulator",
            description: "Ensure hours logged in timesheet correctly roll up to the parent task.",
            status: ProjectTaskStatus.TODO,
            priority: ProjectPriority.MEDIUM,
            assignedEmployeeId: secondEmployee?.id || null,
            estimatedHours: 12.0,
            actualHours: 0,
            dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        }
    })

    await prisma.projectTask.create({
        data: {
            tenantId,
            projectId: project1.id,
            milestoneId: m3.id,
            taskCode: "TSK-1004",
            title: "Execute stress test suite across concurrent ERP sessions",
            description: "Simulate 500 simultaneous invoice generations and inventory movements.",
            status: ProjectTaskStatus.BACKLOG,
            priority: ProjectPriority.MEDIUM,
            assignedEmployeeId: firstEmployee?.id || null,
            estimatedHours: 20.0,
            actualHours: 0,
            dueDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
        }
    })

    // Time entries
    if (firstEmployee) {
        await prisma.projectTimeEntry.create({
            data: {
                tenantId,
                projectId: project1.id,
                taskId: t1.id,
                employeeId: firstEmployee.id,
                workDate: new Date(Date.now() - 17 * 24 * 60 * 60 * 1000),
                hours: 8.0,
                description: "Initial database RLS migration and security isolation tests.",
                isBillable: true,
            }
        })
        await prisma.projectTimeEntry.create({
            data: {
                tenantId,
                projectId: project1.id,
                taskId: t1.id,
                employeeId: firstEmployee.id,
                workDate: new Date(Date.now() - 16 * 24 * 60 * 60 * 1000),
                hours: 8.0,
                description: "Foreign key validation and unique index performance benchmarks.",
                isBillable: true,
            }
        })
    }

    if (secondEmployee) {
        await prisma.projectTimeEntry.create({
            data: {
                tenantId,
                projectId: project1.id,
                taskId: t2.id,
                employeeId: secondEmployee.id,
                workDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
                hours: 7.0,
                description: "Build interactive drag/click Kanban column status action controllers.",
                isBillable: true,
            }
        })
        await prisma.projectTimeEntry.create({
            data: {
                tenantId,
                projectId: project1.id,
                taskId: t2.id,
                employeeId: secondEmployee.id,
                workDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
                hours: 7.0,
                description: "Task filter bars and quick assignee selection dialogs.",
                isBillable: true,
            }
        })
    }

    // Project 2: Customer Mobile Portal
    await prisma.project.create({
        data: {
            tenantId,
            projectCode: "PRJ-0002",
            name: "B2B Customer Self-Service Mobile Portal",
            description: "Dedicated client portal for real-time order tracking, invoice downloads, and support ticket submissions.",
            status: ProjectStatus.PLANNING,
            priority: ProjectPriority.MEDIUM,
            billingType: ProjectBillingType.TIME_AND_MATERIALS,
            budget: 280000.00,
            currencyCode: "INR",
            startDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
            targetEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
            clientId: firstClient?.id || null,
            managerId: secondEmployee?.id || firstEmployee?.id || null,
        }
    })
}

/**
 * Retrieves the complete Projects overview, active project details, tasks, milestones,
 * team allocations, and timesheets.
 */
export async function getProjectsOverview(selectedProjectId?: string): Promise<ProjectsOverviewData> {
    const tenantId = await getTenantId()

    // Auto seed starter data if workspace is empty
    await autoSeedProjectsIfEmpty(tenantId)

    // 1. Fetch all projects with aggregates
    const rawProjects = await prisma.project.findMany({
        where: { tenantId },
        include: {
            client: { select: { id: true, name: true } },
            manager: { select: { id: true, displayName: true } },
            tasks: {
                select: {
                    id: true,
                    status: true,
                    estimatedHours: true,
                    actualHours: true,
                }
            },
            members: { select: { id: true } },
            milestones: { select: { id: true } },
        },
        orderBy: { createdAt: "desc" }
    })

    const projects: ProjectRecord[] = (rawProjects as any[]).map((p: any) => {
        const totalTasks = p.tasks.length
        const completedTasks = p.tasks.filter((t: any) => t.status === ProjectTaskStatus.DONE).length
        const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

        const totalEstimatedHours = p.tasks.reduce((sum: number, t: any) => sum + (t.estimatedHours ? Number(t.estimatedHours) : 0), 0)
        const totalActualHours = p.tasks.reduce((sum: number, t: any) => sum + (t.actualHours ? Number(t.actualHours) : 0), 0)

        return {
            id: p.id,
            tenantId: p.tenantId,
            projectCode: p.projectCode,
            name: p.name,
            description: p.description,
            status: p.status,
            priority: p.priority,
            billingType: p.billingType,
            startDate: p.startDate,
            targetEndDate: p.targetEndDate,
            actualEndDate: p.actualEndDate,
            budget: p.budget ? Number(p.budget) : null,
            currencyCode: p.currencyCode,
            clientId: p.clientId,
            clientName: p.client?.name || null,
            managerId: p.managerId,
            managerName: p.manager?.displayName || null,
            tasksCount: totalTasks,
            completedTasksCount: completedTasks,
            completionPercentage,
            totalEstimatedHours,
            totalActualHours,
            membersCount: p.members.length,
            milestonesCount: p.milestones.length,
            createdAt: p.createdAt,
            updatedAt: p.updatedAt,
        }
    })

    // Determine selected project (either explicitly provided or default to the first active/created project)
    const targetProjectId = selectedProjectId || (projects.length > 0 ? projects[0].id : null)

    let selectedProject: ProjectsOverviewData["selectedProject"] = null

    if (targetProjectId) {
        const fullProj = await prisma.project.findUnique({
            where: { id: targetProjectId, tenantId },
            include: {
                client: { select: { id: true, name: true } },
                manager: { select: { id: true, displayName: true } },
                members: {
                    include: {
                        employee: {
                            select: {
                                id: true,
                                displayName: true,
                                employeeNumber: true,
                                department: { select: { name: true } },
                                designation: { select: { title: true } },
                            }
                        }
                    },
                    orderBy: { joinedAt: "asc" }
                },
                milestones: {
                    include: {
                        tasks: { select: { id: true } }
                    },
                    orderBy: { dueDate: "asc" }
                },
                tasks: {
                    include: {
                        milestone: { select: { id: true, title: true } },
                        assignedEmployee: { select: { id: true, displayName: true } },
                    },
                    orderBy: { createdAt: "desc" }
                },
                timeEntries: {
                    include: {
                        task: { select: { id: true, taskCode: true, title: true } },
                        employee: { select: { id: true, displayName: true } },
                    },
                    orderBy: { workDate: "desc" }
                }
            }
        })

        if (fullProj) {
            const projectSummary = projects.find(p => p.id === fullProj.id) || {
                id: fullProj.id,
                tenantId: fullProj.tenantId,
                projectCode: fullProj.projectCode,
                name: fullProj.name,
                description: fullProj.description,
                status: fullProj.status,
                priority: fullProj.priority,
                billingType: fullProj.billingType,
                startDate: fullProj.startDate,
                targetEndDate: fullProj.targetEndDate,
                actualEndDate: fullProj.actualEndDate,
                budget: fullProj.budget ? Number(fullProj.budget) : null,
                currencyCode: fullProj.currencyCode,
                clientId: fullProj.clientId,
                clientName: fullProj.client?.name || null,
                managerId: fullProj.managerId,
                managerName: fullProj.manager?.displayName || null,
                tasksCount: fullProj.tasks.length,
                completedTasksCount: (fullProj.tasks as any[]).filter((t: any) => t.status === ProjectTaskStatus.DONE).length,
                completionPercentage: fullProj.tasks.length > 0 ? Math.round(((fullProj.tasks as any[]).filter((t: any) => t.status === ProjectTaskStatus.DONE).length / fullProj.tasks.length) * 100) : 0,
                totalEstimatedHours: (fullProj.tasks as any[]).reduce((sum: number, t: any) => sum + (t.estimatedHours ? Number(t.estimatedHours) : 0), 0),
                totalActualHours: (fullProj.tasks as any[]).reduce((sum: number, t: any) => sum + (t.actualHours ? Number(t.actualHours) : 0), 0),
                membersCount: fullProj.members.length,
                milestonesCount: fullProj.milestones.length,
                createdAt: fullProj.createdAt,
                updatedAt: fullProj.updatedAt,
            }

            selectedProject = {
                project: projectSummary,
                members: (fullProj.members as any[]).map((m: any) => ({
                    id: m.id,
                    projectId: m.projectId,
                    employeeId: m.employeeId,
                    employeeName: m.employee.displayName,
                    employeeNumber: m.employee.employeeNumber,
                    departmentName: m.employee.department?.name || null,
                    designationTitle: m.employee.designation?.title || null,
                    role: m.role,
                    hourlyRate: m.hourlyRate ? Number(m.hourlyRate) : null,
                    joinedAt: m.joinedAt,
                })),
                milestones: (fullProj.milestones as any[]).map((ms: any) => ({
                    id: ms.id,
                    projectId: ms.projectId,
                    title: ms.title,
                    description: ms.description,
                    dueDate: ms.dueDate,
                    completedDate: ms.completedDate,
                    status: ms.status,
                    deliverable: ms.deliverable,
                    tasksCount: ms.tasks.length,
                })),
                tasks: (fullProj.tasks as any[]).map((t: any) => ({
                    id: t.id,
                    projectId: t.projectId,
                    projectCode: fullProj.projectCode,
                    projectName: fullProj.name,
                    milestoneId: t.milestoneId,
                    milestoneTitle: t.milestone?.title || null,
                    taskCode: t.taskCode,
                    title: t.title,
                    description: t.description,
                    status: t.status,
                    priority: t.priority,
                    assignedEmployeeId: t.assignedEmployeeId,
                    assignedEmployeeName: t.assignedEmployee?.displayName || null,
                    estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
                    actualHours: t.actualHours ? Number(t.actualHours) : 0,
                    startDate: t.startDate,
                    dueDate: t.dueDate,
                    completedAt: t.completedAt,
                    createdAt: t.createdAt,
                })),
                timeEntries: (fullProj.timeEntries as any[]).map((te: any) => ({
                    id: te.id,
                    projectId: te.projectId,
                    projectName: fullProj.name,
                    taskId: te.taskId,
                    taskCode: te.task?.taskCode || null,
                    taskTitle: te.task?.title || null,
                    employeeId: te.employeeId,
                    employeeName: te.employee.displayName,
                    workDate: te.workDate,
                    hours: Number(te.hours),
                    description: te.description,
                    isBillable: te.isBillable,
                    isBilled: te.isBilled,
                    createdAt: te.createdAt,
                })),
            }
        }
    }

    // 2. Fetch all tasks across projects for the global kanban/task list
    const allRawTasks = await prisma.projectTask.findMany({
        where: { tenantId },
        include: {
            project: { select: { projectCode: true, name: true } },
            milestone: { select: { id: true, title: true } },
            assignedEmployee: { select: { id: true, displayName: true } },
        },
        orderBy: { createdAt: "desc" }
    })

    const allTasks: ProjectTaskRecord[] = (allRawTasks as any[]).map((t: any) => ({
        id: t.id,
        projectId: t.projectId,
        projectCode: t.project.projectCode,
        projectName: t.project.name,
        milestoneId: t.milestoneId,
        milestoneTitle: t.milestone?.title || null,
        taskCode: t.taskCode,
        title: t.title,
        description: t.description,
        status: t.status,
        priority: t.priority,
        assignedEmployeeId: t.assignedEmployeeId,
        assignedEmployeeName: t.assignedEmployee?.displayName || null,
        estimatedHours: t.estimatedHours ? Number(t.estimatedHours) : null,
        actualHours: t.actualHours ? Number(t.actualHours) : 0,
        startDate: t.startDate,
        dueDate: t.dueDate,
        completedAt: t.completedAt,
        createdAt: t.createdAt,
    }))

    // 3. Fetch all time entries
    const allRawTime = await prisma.projectTimeEntry.findMany({
        where: { tenantId },
        include: {
            project: { select: { name: true } },
            task: { select: { id: true, taskCode: true, title: true } },
            employee: { select: { id: true, displayName: true } },
        },
        orderBy: { workDate: "desc" },
        take: 100,
    })

    const allTimeEntries: ProjectTimeEntryRecord[] = (allRawTime as any[]).map((te: any) => ({
        id: te.id,
        projectId: te.projectId,
        projectName: te.project.name,
        taskId: te.taskId,
        taskCode: te.task?.taskCode || null,
        taskTitle: te.task?.title || null,
        employeeId: te.employeeId,
        employeeName: te.employee.displayName,
        workDate: te.workDate,
        hours: Number(te.hours),
        description: te.description,
        isBillable: te.isBillable,
        isBilled: te.isBilled,
        createdAt: te.createdAt,
    }))

    // 4. Fetch available contacts (clients) and employees for selection dropdowns
    const availableClients = await prisma.contact.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, name: true },
        orderBy: { name: "asc" }
    })

    const availableEmployeesRaw = await prisma.employee.findMany({
        where: { tenantId, status: "ACTIVE" },
        select: {
            id: true,
            displayName: true,
            employeeNumber: true,
            department: { select: { name: true } },
            designation: { select: { title: true } },
        },
        orderBy: { displayName: "asc" }
    })

    const availableEmployees = (availableEmployeesRaw as any[]).map((e: any) => ({
        id: e.id,
        name: e.displayName,
        employeeNumber: e.employeeNumber,
        departmentName: e.department?.name || null,
        designationTitle: e.designation?.title || null,
    }))

    // 5. Compute global telemetry
    const totalProjects = projects.length
    const activeProjects = projects.filter(p => p.status === ProjectStatus.IN_PROGRESS || p.status === ProjectStatus.PLANNING).length
    const completedProjects = projects.filter(p => p.status === ProjectStatus.COMPLETED).length

    const totalTasks = allTasks.length
    const completedTasks = allTasks.filter(t => t.status === ProjectTaskStatus.DONE).length
    const inProgressTasks = allTasks.filter(t => t.status === ProjectTaskStatus.IN_PROGRESS || t.status === ProjectTaskStatus.IN_REVIEW).length
    const backlogTasks = allTasks.filter(t => t.status === ProjectTaskStatus.BACKLOG || t.status === ProjectTaskStatus.TODO).length

    const totalTrackedHours = allTimeEntries.reduce((sum, te) => sum + te.hours, 0)
    const totalBillableHours = allTimeEntries.filter(te => te.isBillable).reduce((sum, te) => sum + te.hours, 0)
    const totalBudget = projects.reduce((sum, p) => sum + (p.budget || 0), 0)

    return {
        telemetry: {
            totalProjects,
            activeProjects,
            completedProjects,
            totalTasks,
            completedTasks,
            inProgressTasks,
            backlogTasks,
            totalTrackedHours,
            totalBillableHours,
            totalBudget,
        },
        projects,
        selectedProject,
        allTasks,
        allTimeEntries,
        availableClients,
        availableEmployees,
    }
}

/**
 * Creates a new project with sequential PRJ-XXXX code.
 */
export async function createProject(input: CreateProjectInput): Promise<{ success: boolean; projectId?: string; error?: string }> {
    try {
        const tenantId = await getTenantId()

        // Auto-generate project code
        const count = await prisma.project.count({ where: { tenantId } })
        const projectCode = `PRJ-${String(count + 1).padStart(4, "0")}`

        const project = await prisma.project.create({
            data: {
                tenantId,
                projectCode,
                name: input.name,
                description: input.description || null,
                status: input.status || ProjectStatus.PLANNING,
                priority: input.priority || ProjectPriority.MEDIUM,
                billingType: input.billingType || ProjectBillingType.FIXED_FEE,
                startDate: input.startDate ? new Date(input.startDate) : null,
                targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : null,
                budget: input.budget !== undefined ? input.budget : null,
                currencyCode: input.currencyCode || "INR",
                clientId: input.clientId || null,
                managerId: input.managerId || null,
            }
        })

        // If manager is assigned, automatically add them as team member / lead
        if (input.managerId) {
            await prisma.projectMember.create({
                data: {
                    tenantId,
                    projectId: project.id,
                    employeeId: input.managerId,
                    role: "Project Lead",
                }
            })
        }

        revalidatePath("/projects")
        return { success: true, projectId: project.id }
    } catch (err: any) {
        console.error("Failed to create project:", err)
        return { success: false, error: err.message || "Failed to create project" }
    }
}

/**
 * Updates an existing project.
 */
export async function updateProject(id: string, input: UpdateProjectInput): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.project.update({
            where: { id, tenantId },
            data: {
                name: input.name,
                description: input.description,
                status: input.status,
                priority: input.priority,
                billingType: input.billingType,
                startDate: input.startDate ? new Date(input.startDate) : undefined,
                targetEndDate: input.targetEndDate ? new Date(input.targetEndDate) : undefined,
                actualEndDate: input.actualEndDate ? new Date(input.actualEndDate) : undefined,
                budget: input.budget !== undefined ? input.budget : undefined,
                clientId: input.clientId,
                managerId: input.managerId,
            }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to update project:", err)
        return { success: false, error: err.message || "Failed to update project" }
    }
}

/**
 * Deletes a project and cascades to members, tasks, and timesheets.
 */
export async function deleteProject(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.project.delete({
            where: { id, tenantId }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to delete project:", err)
        return { success: false, error: err.message || "Failed to delete project" }
    }
}

/**
 * Creates a new project task with sequential TSK-XXXX code.
 */
export async function createProjectTask(input: CreateProjectTaskInput): Promise<{ success: boolean; taskId?: string; error?: string }> {
    try {
        const tenantId = await getTenantId()

        const taskCount = await prisma.projectTask.count({ where: { tenantId } })
        const taskCode = `TSK-${String(taskCount + 1001).padStart(4, "0")}`

        const task = await prisma.projectTask.create({
            data: {
                tenantId,
                projectId: input.projectId,
                milestoneId: input.milestoneId || null,
                taskCode,
                title: input.title,
                description: input.description || null,
                status: input.status || ProjectTaskStatus.TODO,
                priority: input.priority || ProjectPriority.MEDIUM,
                assignedEmployeeId: input.assignedEmployeeId || null,
                estimatedHours: input.estimatedHours !== undefined ? input.estimatedHours : null,
                startDate: input.startDate ? new Date(input.startDate) : null,
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
            }
        })

        revalidatePath("/projects")
        return { success: true, taskId: task.id }
    } catch (err: any) {
        console.error("Failed to create project task:", err)
        return { success: false, error: err.message || "Failed to create task" }
    }
}

/**
 * Updates task status (ideal for Kanban column transitions).
 */
export async function updateProjectTaskStatus(id: string, newStatus: ProjectTaskStatus): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.projectTask.update({
            where: { id, tenantId },
            data: {
                status: newStatus,
                completedAt: newStatus === ProjectTaskStatus.DONE ? new Date() : null,
            }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to update task status:", err)
        return { success: false, error: err.message || "Failed to update task status" }
    }
}

/**
 * Updates full project task fields.
 */
export async function updateProjectTask(id: string, input: UpdateProjectTaskInput): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.projectTask.update({
            where: { id, tenantId },
            data: {
                title: input.title,
                description: input.description,
                milestoneId: input.milestoneId,
                status: input.status,
                priority: input.priority,
                assignedEmployeeId: input.assignedEmployeeId,
                estimatedHours: input.estimatedHours,
                actualHours: input.actualHours,
                startDate: input.startDate ? new Date(input.startDate) : undefined,
                dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
                completedAt: input.status === ProjectTaskStatus.DONE ? new Date() : undefined,
            }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to update task:", err)
        return { success: false, error: err.message || "Failed to update task" }
    }
}

/**
 * Deletes a project task.
 */
export async function deleteProjectTask(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.projectTask.delete({
            where: { id, tenantId }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to delete task:", err)
        return { success: false, error: err.message || "Failed to delete task" }
    }
}

/**
 * Creates a new milestone for a project.
 */
export async function createMilestone(input: CreateMilestoneInput): Promise<{ success: boolean; milestoneId?: string; error?: string }> {
    try {
        const tenantId = await getTenantId()

        const milestone = await prisma.projectMilestone.create({
            data: {
                tenantId,
                projectId: input.projectId,
                title: input.title,
                description: input.description || null,
                dueDate: input.dueDate ? new Date(input.dueDate) : null,
                status: input.status || MilestoneStatus.PENDING,
                deliverable: input.deliverable || null,
            }
        })

        revalidatePath("/projects")
        return { success: true, milestoneId: milestone.id }
    } catch (err: any) {
        console.error("Failed to create milestone:", err)
        return { success: false, error: err.message || "Failed to create milestone" }
    }
}

/**
 * Updates milestone status or details.
 */
export async function updateMilestone(id: string, input: Partial<CreateMilestoneInput> & { completedDate?: string }): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.projectMilestone.update({
            where: { id, tenantId },
            data: {
                title: input.title,
                description: input.description,
                dueDate: input.dueDate ? new Date(input.dueDate) : undefined,
                status: input.status,
                deliverable: input.deliverable,
                completedDate: input.completedDate ? new Date(input.completedDate) : (input.status === MilestoneStatus.COMPLETED ? new Date() : undefined),
            }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to update milestone:", err)
        return { success: false, error: err.message || "Failed to update milestone" }
    }
}

/**
 * Deletes a milestone.
 */
export async function deleteMilestone(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.projectMilestone.delete({
            where: { id, tenantId }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to delete milestone:", err)
        return { success: false, error: err.message || "Failed to delete milestone" }
    }
}

/**
 * Adds a team member to a project.
 */
export async function addProjectMember(projectId: string, employeeId: string, role: string = "Team Member", hourlyRate?: number): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.projectMember.create({
            data: {
                tenantId,
                projectId,
                employeeId,
                role,
                hourlyRate: hourlyRate !== undefined ? hourlyRate : null,
            }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to add project member:", err)
        return { success: false, error: err.message || "Failed to allocate team member" }
    }
}

/**
 * Removes a member from a project.
 */
export async function removeProjectMember(memberId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.projectMember.delete({
            where: { id: memberId, tenantId }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to remove project member:", err)
        return { success: false, error: err.message || "Failed to remove member" }
    }
}

/**
 * Logs work hours on a project/task and updates the parent task actualHours accumulator.
 */
export async function logProjectTime(input: LogTimeInput): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        await prisma.$transaction(async (tx: any) => {
            await tx.projectTimeEntry.create({
                data: {
                    tenantId,
                    projectId: input.projectId,
                    taskId: input.taskId || null,
                    employeeId: input.employeeId,
                    workDate: new Date(input.workDate),
                    hours: input.hours,
                    description: input.description,
                    isBillable: input.isBillable ?? true,
                }
            })

            // If a specific task was logged, recalculate total actual hours for that task
            if (input.taskId) {
                const aggregate = await tx.projectTimeEntry.aggregate({
                    where: { tenantId, taskId: input.taskId },
                    _sum: { hours: true }
                })
                const totalHours = aggregate._sum.hours ? Number(aggregate._sum.hours) : input.hours

                await tx.projectTask.update({
                    where: { id: input.taskId, tenantId },
                    data: { actualHours: totalHours }
                })
            }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to log work time:", err)
        return { success: false, error: err.message || "Failed to log time" }
    }
}

/**
 * Deletes a time entry.
 */
export async function deleteProjectTime(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()

        const entry = await prisma.projectTimeEntry.findUnique({
            where: { id, tenantId }
        })

        if (!entry) return { success: false, error: "Time entry not found" }

        await prisma.$transaction(async (tx: any) => {
            await tx.projectTimeEntry.delete({
                where: { id, tenantId }
            })

            if (entry.taskId) {
                const aggregate = await tx.projectTimeEntry.aggregate({
                    where: { tenantId, taskId: entry.taskId },
                    _sum: { hours: true }
                })
                const totalHours = aggregate._sum.hours ? Number(aggregate._sum.hours) : 0

                await tx.projectTask.update({
                    where: { id: entry.taskId, tenantId },
                    data: { actualHours: totalHours }
                })
            }
        })

        revalidatePath("/projects")
        return { success: true }
    } catch (err: any) {
        console.error("Failed to delete time entry:", err)
        return { success: false, error: err.message || "Failed to delete time entry" }
    }
}
