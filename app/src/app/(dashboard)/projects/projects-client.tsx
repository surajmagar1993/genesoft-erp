"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    FolderKanban,
    Plus,
    Search,
    CheckCircle2,
    Clock,
    DollarSign,
    Users,
    Calendar,
    ArrowUpRight,
    ArrowRight,
    Check,
    AlertCircle,
    Building2,
    Briefcase,
    Milestone,
    Layers,
    Timer,
    Pencil,
    Trash2,
    Filter,
    ChevronRight,
    Coins,
    UserCheck,
    ListTodo,
    Loader2,
    FileText,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { toast } from "sonner"
import {
    ProjectsOverviewData,
    ProjectRecord,
    ProjectMemberRecord,
    ProjectMilestoneRecord,
    ProjectTaskRecord,
    ProjectTimeEntryRecord,
    createProject,
    updateProject,
    deleteProject,
    createProjectTask,
    updateProjectTaskStatus,
    deleteProjectTask,
    createMilestone,
    updateMilestone,
    deleteMilestone,
    addProjectMember,
    removeProjectMember,
    logProjectTime,
    deleteProjectTime,
} from "@/app/actions/projects"
import {
    ProjectStatus,
    ProjectPriority,
    ProjectBillingType,
    MilestoneStatus,
    ProjectTaskStatus,
} from "@prisma/client"

interface ProjectsClientProps {
    initialData: ProjectsOverviewData
}

export function ProjectsClient({ initialData }: ProjectsClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [data, setData] = useState<ProjectsOverviewData>(initialData)

    // Active project filter ("all" or projectId)
    const [selectedProjectId, setSelectedProjectId] = useState<string>(
        initialData.selectedProject?.project.id || (initialData.projects[0]?.id ?? "all")
    )

    // Search and Status filters
    const [projectSearch, setProjectSearch] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [taskSearch, setTaskSearch] = useState("")
    const [taskPriorityFilter, setTaskPriorityFilter] = useState<string>("all")

    // Active Tab
    const [activeTab, setActiveTab] = useState("kanban")

    // Modal dialog states
    const [isCreateProjectOpen, setIsCreateProjectOpen] = useState(false)
    const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false)
    const [isCreateMilestoneOpen, setIsCreateMilestoneOpen] = useState(false)
    const [isLogTimeOpen, setIsLogTimeOpen] = useState(false)
    const [isAddMemberOpen, setIsAddMemberOpen] = useState(false)

    // Form inputs: Create Project
    const [newProject, setNewProject] = useState({
        name: "",
        description: "",
        priority: "MEDIUM" as ProjectPriority,
        status: "PLANNING" as ProjectStatus,
        billingType: "FIXED_FEE" as ProjectBillingType,
        startDate: "",
        targetEndDate: "",
        budget: "",
        currencyCode: "INR",
        clientId: "",
        managerId: "",
    })

    // Form inputs: Create Task
    const [newTask, setNewTask] = useState({
        projectId: initialData.projects[0]?.id || "",
        milestoneId: "",
        title: "",
        description: "",
        status: "TODO" as ProjectTaskStatus,
        priority: "MEDIUM" as ProjectPriority,
        assignedEmployeeId: "",
        estimatedHours: "",
        startDate: "",
        dueDate: "",
    })

    // Form inputs: Create Milestone
    const [newMilestone, setNewMilestone] = useState({
        projectId: initialData.projects[0]?.id || "",
        title: "",
        description: "",
        deliverable: "",
        dueDate: "",
        status: "PENDING" as MilestoneStatus,
    })

    // Form inputs: Log Time
    const [newTimeLog, setNewTimeLog] = useState({
        projectId: initialData.projects[0]?.id || "",
        taskId: "",
        employeeId: initialData.availableEmployees[0]?.id || "",
        workDate: new Date().toISOString().split("T")[0],
        hours: "4.0",
        description: "",
        isBillable: true,
    })

    // Form inputs: Add Member
    const [newMember, setNewMember] = useState({
        projectId: initialData.projects[0]?.id || "",
        employeeId: initialData.availableEmployees[0]?.id || "",
        role: "Team Member",
        hourlyRate: "",
    })

    // Filtered projects list
    const filteredProjects = useMemo(() => {
        return data.projects.filter(p => {
            const matchesSearch =
                p.name.toLowerCase().includes(projectSearch.toLowerCase()) ||
                p.projectCode.toLowerCase().includes(projectSearch.toLowerCase()) ||
                (p.clientName && p.clientName.toLowerCase().includes(projectSearch.toLowerCase()))
            const matchesStatus = statusFilter === "all" || p.status === statusFilter
            return matchesSearch && matchesStatus
        })
    }, [data.projects, projectSearch, statusFilter])

    // Tasks for Kanban and Task list
    const scopedTasks = useMemo(() => {
        let tasks = selectedProjectId === "all"
            ? data.allTasks
            : data.allTasks.filter(t => t.projectId === selectedProjectId)

        if (taskSearch) {
            tasks = tasks.filter(t =>
                t.title.toLowerCase().includes(taskSearch.toLowerCase()) ||
                t.taskCode.toLowerCase().includes(taskSearch.toLowerCase()) ||
                (t.assignedEmployeeName && t.assignedEmployeeName.toLowerCase().includes(taskSearch.toLowerCase()))
            )
        }

        if (taskPriorityFilter !== "all") {
            tasks = tasks.filter(t => t.priority === taskPriorityFilter)
        }

        return tasks
    }, [data.allTasks, selectedProjectId, taskSearch, taskPriorityFilter])

    // Milestones for active project
    const scopedMilestones = useMemo(() => {
        if (selectedProjectId === "all") {
            return data.selectedProject ? data.selectedProject.milestones : []
        }
        return data.selectedProject?.project.id === selectedProjectId
            ? data.selectedProject.milestones
            : []
    }, [data.selectedProject, selectedProjectId])

    // Team members for active project
    const scopedMembers = useMemo(() => {
        if (selectedProjectId === "all") {
            return data.selectedProject ? data.selectedProject.members : []
        }
        return data.selectedProject?.project.id === selectedProjectId
            ? data.selectedProject.members
            : []
    }, [data.selectedProject, selectedProjectId])

    // Time entries scoped
    const scopedTimeEntries = useMemo(() => {
        if (selectedProjectId === "all") return data.allTimeEntries
        return data.allTimeEntries.filter(te => te.projectId === selectedProjectId)
    }, [data.allTimeEntries, selectedProjectId])

    // Tasks grouped by Kanban status
    const kanbanColumns: Record<ProjectTaskStatus, ProjectTaskRecord[]> = useMemo(() => {
        return {
            BACKLOG: scopedTasks.filter(t => t.status === "BACKLOG"),
            TODO: scopedTasks.filter(t => t.status === "TODO"),
            IN_PROGRESS: scopedTasks.filter(t => t.status === "IN_PROGRESS"),
            IN_REVIEW: scopedTasks.filter(t => t.status === "IN_REVIEW"),
            DONE: scopedTasks.filter(t => t.status === "DONE"),
        }
    }, [scopedTasks])

    // Status styling helper
    const getProjectStatusBadge = (status: ProjectStatus) => {
        switch (status) {
            case "PLANNING":
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800">Planning</Badge>
            case "IN_PROGRESS":
                return <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800">In Progress</Badge>
            case "ON_HOLD":
                return <Badge variant="outline" className="bg-zinc-100 text-zinc-700 border-zinc-300 dark:bg-zinc-800 dark:text-zinc-300">On Hold</Badge>
            case "COMPLETED":
                return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800">Completed</Badge>
            case "CANCELLED":
                return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800">Cancelled</Badge>
        }
    }

    const getPriorityBadge = (priority: ProjectPriority) => {
        switch (priority) {
            case "URGENT":
                return <Badge variant="destructive" className="font-semibold text-xs">Urgent</Badge>
            case "HIGH":
                return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-400 text-xs font-semibold">High</Badge>
            case "MEDIUM":
                return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 text-xs">Medium</Badge>
            case "LOW":
                return <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 text-xs">Low</Badge>
        }
    }

    // Refresh action
    const handleRefresh = () => {
        startTransition(() => {
            router.refresh()
        })
    }

    // Handlers
    const handleCreateProject = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newProject.name.trim()) {
            toast.error("Project name is required")
            return
        }

        startTransition(async () => {
            const res = await createProject({
                name: newProject.name,
                description: newProject.description || undefined,
                priority: newProject.priority,
                status: newProject.status,
                billingType: newProject.billingType,
                startDate: newProject.startDate || undefined,
                targetEndDate: newProject.targetEndDate || undefined,
                budget: newProject.budget ? parseFloat(newProject.budget) : undefined,
                currencyCode: newProject.currencyCode,
                clientId: newProject.clientId || undefined,
                managerId: newProject.managerId || undefined,
            })

            if (res.success) {
                toast.success("Project created successfully")
                setIsCreateProjectOpen(false)
                setNewProject({
                    name: "",
                    description: "",
                    priority: "MEDIUM",
                    status: "PLANNING",
                    billingType: "FIXED_FEE",
                    startDate: "",
                    targetEndDate: "",
                    budget: "",
                    currencyCode: "INR",
                    clientId: "",
                    managerId: "",
                })
                router.refresh()
            } else {
                toast.error(res.error || "Failed to create project")
            }
        })
    }

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTask.title.trim()) {
            toast.error("Task title is required")
            return
        }
        if (!newTask.projectId) {
            toast.error("Please select a target project")
            return
        }

        startTransition(async () => {
            const res = await createProjectTask({
                projectId: newTask.projectId,
                milestoneId: newTask.milestoneId || undefined,
                title: newTask.title,
                description: newTask.description || undefined,
                status: newTask.status,
                priority: newTask.priority,
                assignedEmployeeId: newTask.assignedEmployeeId || undefined,
                estimatedHours: newTask.estimatedHours ? parseFloat(newTask.estimatedHours) : undefined,
                startDate: newTask.startDate || undefined,
                dueDate: newTask.dueDate || undefined,
            })

            if (res.success) {
                toast.success("Task created successfully")
                setIsCreateTaskOpen(false)
                setNewTask({
                    projectId: selectedProjectId !== "all" ? selectedProjectId : (data.projects[0]?.id || ""),
                    milestoneId: "",
                    title: "",
                    description: "",
                    status: "TODO",
                    priority: "MEDIUM",
                    assignedEmployeeId: "",
                    estimatedHours: "",
                    startDate: "",
                    dueDate: "",
                })
                router.refresh()
            } else {
                toast.error(res.error || "Failed to create task")
            }
        })
    }

    const handleTaskStatusChange = async (taskId: string, newStatus: ProjectTaskStatus) => {
        startTransition(async () => {
            const res = await updateProjectTaskStatus(taskId, newStatus)
            if (res.success) {
                toast.success(`Task moved to ${newStatus.replace("_", " ")}`)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to update task status")
            }
        })
    }

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("Are you sure you want to delete this task?")) return
        startTransition(async () => {
            const res = await deleteProjectTask(taskId)
            if (res.success) {
                toast.success("Task deleted")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to delete task")
            }
        })
    }

    const handleCreateMilestone = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMilestone.title.trim()) {
            toast.error("Milestone title is required")
            return
        }
        if (!newMilestone.projectId) {
            toast.error("Please select a project")
            return
        }

        startTransition(async () => {
            const res = await createMilestone({
                projectId: newMilestone.projectId,
                title: newMilestone.title,
                description: newMilestone.description || undefined,
                deliverable: newMilestone.deliverable || undefined,
                dueDate: newMilestone.dueDate || undefined,
                status: newMilestone.status,
            })

            if (res.success) {
                toast.success("Milestone created successfully")
                setIsCreateMilestoneOpen(false)
                setNewMilestone({
                    projectId: selectedProjectId !== "all" ? selectedProjectId : (data.projects[0]?.id || ""),
                    title: "",
                    description: "",
                    deliverable: "",
                    dueDate: "",
                    status: "PENDING",
                })
                router.refresh()
            } else {
                toast.error(res.error || "Failed to create milestone")
            }
        })
    }

    const handleMilestoneStatusToggle = async (milestone: ProjectMilestoneRecord) => {
        const nextStatus = milestone.status === "COMPLETED" ? "IN_PROGRESS" : "COMPLETED"
        startTransition(async () => {
            const res = await updateMilestone(milestone.id, {
                status: nextStatus as MilestoneStatus,
                completedDate: nextStatus === "COMPLETED" ? new Date().toISOString() : undefined,
            })
            if (res.success) {
                toast.success(`Milestone updated to ${nextStatus}`)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to update milestone")
            }
        })
    }

    const handleDeleteMilestone = async (id: string) => {
        if (!confirm("Delete this milestone?")) return
        startTransition(async () => {
            const res = await deleteMilestone(id)
            if (res.success) {
                toast.success("Milestone removed")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to delete milestone")
            }
        })
    }

    const handleAddMember = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newMember.projectId || !newMember.employeeId) {
            toast.error("Please select project and employee")
            return
        }

        startTransition(async () => {
            const res = await addProjectMember(
                newMember.projectId,
                newMember.employeeId,
                newMember.role || "Team Member",
                newMember.hourlyRate ? parseFloat(newMember.hourlyRate) : undefined
            )
            if (res.success) {
                toast.success("Team member allocated to project")
                setIsAddMemberOpen(false)
                setNewMember({
                    projectId: selectedProjectId !== "all" ? selectedProjectId : (data.projects[0]?.id || ""),
                    employeeId: data.availableEmployees[0]?.id || "",
                    role: "Team Member",
                    hourlyRate: "",
                })
                router.refresh()
            } else {
                toast.error(res.error || "Failed to add team member")
            }
        })
    }

    const handleRemoveMember = async (memberId: string) => {
        if (!confirm("Remove this member from the project?")) return
        startTransition(async () => {
            const res = await removeProjectMember(memberId)
            if (res.success) {
                toast.success("Member removed from project")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to remove member")
            }
        })
    }

    const handleLogTime = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newTimeLog.hours || parseFloat(newTimeLog.hours) <= 0) {
            toast.error("Please enter a valid duration in hours")
            return
        }
        if (!newTimeLog.description.trim()) {
            toast.error("Work description is required")
            return
        }

        startTransition(async () => {
            const res = await logProjectTime({
                projectId: newTimeLog.projectId,
                taskId: newTimeLog.taskId || undefined,
                employeeId: newTimeLog.employeeId,
                workDate: newTimeLog.workDate,
                hours: parseFloat(newTimeLog.hours),
                description: newTimeLog.description,
                isBillable: newTimeLog.isBillable,
            })

            if (res.success) {
                toast.success("Time logged successfully")
                setIsLogTimeOpen(false)
                setNewTimeLog({
                    projectId: selectedProjectId !== "all" ? selectedProjectId : (data.projects[0]?.id || ""),
                    taskId: "",
                    employeeId: data.availableEmployees[0]?.id || "",
                    workDate: new Date().toISOString().split("T")[0],
                    hours: "4.0",
                    description: "",
                    isBillable: true,
                })
                router.refresh()
            } else {
                toast.error(res.error || "Failed to log time")
            }
        })
    }

    const handleDeleteTime = async (id: string) => {
        if (!confirm("Delete this timesheet log?")) return
        startTransition(async () => {
            const res = await deleteProjectTime(id)
            if (res.success) {
                toast.success("Time log removed")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to delete time log")
            }
        })
    }

    const handleDeleteProject = async (id: string) => {
        if (!confirm("Are you sure? This will delete the project, all its tasks, milestones, and time records.")) return
        startTransition(async () => {
            const res = await deleteProject(id)
            if (res.success) {
                toast.success("Project deleted")
                if (selectedProjectId === id) setSelectedProjectId("all")
                router.refresh()
            } else {
                toast.error(res.error || "Failed to delete project")
            }
        })
    }

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <FolderKanban className="h-7 w-7 text-primary" />
                        Projects & Task Delivery
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Agile sprint boards, deliverable milestones, team resource allocation, and billable timesheets.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Project Scoper Selector */}
                    <div className="w-56">
                        <Select
                            value={selectedProjectId}
                            onValueChange={(val) => {
                                setSelectedProjectId(val)
                                setNewTask(prev => ({ ...prev, projectId: val === "all" ? (data.projects[0]?.id || "") : val }))
                                setNewMilestone(prev => ({ ...prev, projectId: val === "all" ? (data.projects[0]?.id || "") : val }))
                                setNewTimeLog(prev => ({ ...prev, projectId: val === "all" ? (data.projects[0]?.id || "") : val }))
                                setNewMember(prev => ({ ...prev, projectId: val === "all" ? (data.projects[0]?.id || "") : val }))
                            }}
                        >
                            <SelectTrigger className="h-9 bg-card">
                                <SelectValue placeholder="Scope: All Projects" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Global (All Projects)</SelectItem>
                                {data.projects.map(p => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.projectCode} • {p.name.length > 20 ? p.name.substring(0, 20) + "..." : p.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={() => setIsLogTimeOpen(true)}
                    >
                        <Clock className="h-4 w-4 mr-1.5" />
                        Log Hours
                    </Button>

                    <Button
                        variant="outline"
                        size="sm"
                        className="h-9"
                        onClick={() => setIsCreateTaskOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Add Task
                    </Button>

                    <Button
                        size="sm"
                        className="h-9"
                        onClick={() => setIsCreateProjectOpen(true)}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        New Project
                    </Button>
                </div>
            </div>

            {/* 4 Telemetry KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Projects</CardTitle>
                        <FolderKanban className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {data.telemetry.activeProjects}
                            <span className="text-xs font-normal text-muted-foreground ml-2">
                                / {data.telemetry.totalProjects} total
                            </span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.telemetry.completedProjects} delivered successfully
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Task Velocity</CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {data.telemetry.completedTasks}
                            <span className="text-xs font-normal text-muted-foreground ml-2">
                                / {data.telemetry.totalTasks} completed
                            </span>
                        </div>
                        <div className="mt-2 space-y-1">
                            <Progress
                                value={data.telemetry.totalTasks > 0 ? (data.telemetry.completedTasks / data.telemetry.totalTasks) * 100 : 0}
                                className="h-1.5"
                            />
                            <p className="text-xs text-muted-foreground">
                                {data.telemetry.inProgressTasks} active in flight • {data.telemetry.backlogTasks} queued
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Tracked Effort</CardTitle>
                        <Clock className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {data.telemetry.totalTrackedHours.toFixed(1)} hrs
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.telemetry.totalBillableHours.toFixed(1)} billable ({data.telemetry.totalTrackedHours > 0 ? Math.round((data.telemetry.totalBillableHours / data.telemetry.totalTrackedHours) * 100) : 0}% ratio)
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Portfolio Budget</CardTitle>
                        <Coins className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            ₹{data.telemetry.totalBudget.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Across active client contracts
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/60 p-1">
                    <TabsTrigger value="kanban" className="flex items-center gap-1.5">
                        <FolderKanban className="h-4 w-4" />
                        Kanban Board
                    </TabsTrigger>
                    <TabsTrigger value="projects" className="flex items-center gap-1.5">
                        <Layers className="h-4 w-4" />
                        Projects Directory ({data.projects.length})
                    </TabsTrigger>
                    <TabsTrigger value="milestones" className="flex items-center gap-1.5">
                        <Milestone className="h-4 w-4" />
                        Milestones
                    </TabsTrigger>
                    <TabsTrigger value="team" className="flex items-center gap-1.5">
                        <Users className="h-4 w-4" />
                        Resource Allocation
                    </TabsTrigger>
                    <TabsTrigger value="timesheet" className="flex items-center gap-1.5">
                        <Timer className="h-4 w-4" />
                        Time Tracking & Logs ({scopedTimeEntries.length})
                    </TabsTrigger>
                </TabsList>

                {/* ========================================================================= */}
                {/* TAB 1: KANBAN BOARD */}
                {/* ========================================================================= */}
                <TabsContent value="kanban" className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border">
                        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Filter tasks or assignees..."
                                    value={taskSearch}
                                    onChange={(e) => setTaskSearch(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>

                            <Select value={taskPriorityFilter} onValueChange={setTaskPriorityFilter}>
                                <SelectTrigger className="w-36 h-9">
                                    <SelectValue placeholder="Priority" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Priorities</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="LOW">Low</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span>Showing {scopedTasks.length} tasks</span>
                            {selectedProjectId !== "all" && (
                                <Badge variant="secondary" className="font-mono text-[10px]">
                                    {data.projects.find(p => p.id === selectedProjectId)?.projectCode}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* 5 Kanban Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        {(["BACKLOG", "TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"] as ProjectTaskStatus[]).map((colKey) => {
                            const tasksInCol = kanbanColumns[colKey] || []
                            const colTitles: Record<ProjectTaskStatus, { title: string; color: string; border: string }> = {
                                BACKLOG: { title: "Backlog", color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", border: "border-zinc-200 dark:border-zinc-800" },
                                TODO: { title: "To Do", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-300", border: "border-blue-200 dark:border-blue-900" },
                                IN_PROGRESS: { title: "In Progress", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300", border: "border-amber-200 dark:border-amber-900" },
                                IN_REVIEW: { title: "In Review", color: "bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300", border: "border-purple-200 dark:border-purple-900" },
                                DONE: { title: "Done", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300", border: "border-emerald-200 dark:border-emerald-900" },
                            }

                            const meta = colTitles[colKey]

                            return (
                                <div key={colKey} className={`flex flex-col rounded-lg border ${meta.border} bg-card/60 p-3 min-h-[520px]`}>
                                    <div className="flex items-center justify-between pb-3 border-b mb-3">
                                        <div className="flex items-center gap-2">
                                            <span className="font-semibold text-sm">{meta.title}</span>
                                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${meta.color}`}>
                                                {tasksInCol.length}
                                            </span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-6 w-6 p-0 hover:bg-muted"
                                            onClick={() => {
                                                setNewTask(prev => ({ ...prev, status: colKey }))
                                                setIsCreateTaskOpen(true)
                                            }}
                                        >
                                            <Plus className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>

                                    {/* Task Cards */}
                                    <div className="flex-1 space-y-2.5 overflow-y-auto max-h-[600px] pr-1">
                                        {tasksInCol.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center h-36 border border-dashed rounded-md text-xs text-muted-foreground p-3 text-center">
                                                <span>No tasks in {meta.title.toLowerCase()}</span>
                                            </div>
                                        ) : (
                                            tasksInCol.map((task) => (
                                                <Card key={task.id} className="p-3 shadow-xs hover:border-primary/50 transition-all group">
                                                    <div className="flex items-start justify-between gap-1.5 mb-1.5">
                                                        <span className="font-mono text-[11px] font-semibold text-primary">
                                                            {task.taskCode}
                                                        </span>
                                                        {getPriorityBadge(task.priority)}
                                                    </div>

                                                    <h4 className="text-xs font-semibold leading-snug line-clamp-2 mb-1 text-foreground">
                                                        {task.title}
                                                    </h4>

                                                    {task.description && (
                                                        <p className="text-[11px] text-muted-foreground line-clamp-2 mb-2">
                                                            {task.description}
                                                        </p>
                                                    )}

                                                    <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground mb-2">
                                                        <span className="font-mono px-1 py-0.5 bg-muted rounded">
                                                            {task.projectCode}
                                                        </span>
                                                        {task.milestoneTitle && (
                                                            <span className="px-1 py-0.5 bg-muted rounded truncate max-w-[110px]" title={task.milestoneTitle}>
                                                                🎯 {task.milestoneTitle}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between text-[11px] pt-2 border-t text-muted-foreground">
                                                        <div className="flex items-center gap-1 truncate max-w-[120px]">
                                                            <UserCheck className="h-3 w-3 text-muted-foreground" />
                                                            <span className="truncate">{task.assignedEmployeeName || "Unassigned"}</span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-[10px] font-mono">
                                                            <Clock className="h-3 w-3" />
                                                            <span>{task.actualHours}h{task.estimatedHours ? `/${task.estimatedHours}h` : ""}</span>
                                                        </div>
                                                    </div>

                                                    {/* Quick stage mover controls */}
                                                    <div className="flex items-center justify-between pt-2 mt-2 border-t border-dashed">
                                                        <Select
                                                            value={task.status}
                                                            onValueChange={(newStatus) => handleTaskStatusChange(task.id, newStatus as ProjectTaskStatus)}
                                                        >
                                                            <SelectTrigger className="h-6 text-[10px] px-1.5 w-28 bg-background">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="BACKLOG">Backlog</SelectItem>
                                                                <SelectItem value="TODO">To Do</SelectItem>
                                                                <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                                                <SelectItem value="IN_REVIEW">In Review</SelectItem>
                                                                <SelectItem value="DONE">Done</SelectItem>
                                                            </SelectContent>
                                                        </Select>

                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => handleDeleteTask(task.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </div>
                                                </Card>
                                            ))
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 2: PROJECTS DIRECTORY */}
                {/* ========================================================================= */}
                <TabsContent value="projects" className="space-y-4">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 rounded-lg border">
                        <div className="flex items-center gap-2 flex-1 w-full sm:w-auto">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search project code, name, client..."
                                    value={projectSearch}
                                    onChange={(e) => setProjectSearch(e.target.value)}
                                    className="pl-9 h-9"
                                />
                            </div>

                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-36 h-9">
                                    <SelectValue placeholder="All Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="PLANNING">Planning</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="ON_HOLD">On Hold</SelectItem>
                                    <SelectItem value="COMPLETED">Completed</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            size="sm"
                            className="h-9"
                            onClick={() => setIsCreateProjectOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Create Project
                        </Button>
                    </div>

                    {/* Projects Table */}
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[110px]">Code</TableHead>
                                    <TableHead>Project & Scope</TableHead>
                                    <TableHead>Client</TableHead>
                                    <TableHead>Lead Manager</TableHead>
                                    <TableHead>Priority</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="w-40">Progress</TableHead>
                                    <TableHead className="text-right">Budget</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProjects.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="h-32 text-center text-muted-foreground">
                                            No projects found matching your search.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProjects.map((p) => (
                                        <TableRow key={p.id} className="hover:bg-muted/50 cursor-pointer" onClick={() => setSelectedProjectId(p.id)}>
                                            <TableCell className="font-mono font-semibold text-primary">
                                                {p.projectCode}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-medium text-foreground">{p.name}</div>
                                                {p.description && (
                                                    <div className="text-xs text-muted-foreground line-clamp-1 max-w-sm">
                                                        {p.description}
                                                    </div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {p.clientName ? (
                                                    <span className="text-xs font-medium">{p.clientName}</span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">Internal</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5 text-xs">
                                                    <UserCheck className="h-3.5 w-3.5 text-muted-foreground" />
                                                    <span>{p.managerName || "Unassigned"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>{getPriorityBadge(p.priority)}</TableCell>
                                            <TableCell>{getProjectStatusBadge(p.status)}</TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                        <span>{p.completedTasksCount}/{p.tasksCount} tasks</span>
                                                        <span className="font-semibold">{p.completionPercentage}%</span>
                                                    </div>
                                                    <Progress value={p.completionPercentage} className="h-1.5" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-medium">
                                                {p.budget ? `₹${p.budget.toLocaleString("en-IN")}` : "—"}
                                            </TableCell>
                                            <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDeleteProject(p.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 3: MILESTONES & DELIVERABLES */}
                {/* ========================================================================= */}
                <TabsContent value="milestones" className="space-y-4">
                    <div className="flex items-center justify-between bg-card p-3 rounded-lg border">
                        <div>
                            <h3 className="text-sm font-semibold">Project Milestones & Key Results</h3>
                            <p className="text-xs text-muted-foreground">
                                High-level deliverable deadlines and client phase acceptance markers.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            className="h-9"
                            onClick={() => setIsCreateMilestoneOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Add Milestone
                        </Button>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {scopedMilestones.length === 0 ? (
                            <div className="col-span-full py-12 text-center text-muted-foreground border border-dashed rounded-lg">
                                <Milestone className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm">No milestones configured for the selected scope.</p>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="mt-3"
                                    onClick={() => setIsCreateMilestoneOpen(true)}
                                >
                                    <Plus className="h-4 w-4 mr-1.5" />
                                    Define First Milestone
                                </Button>
                            </div>
                        ) : (
                            scopedMilestones.map((m) => (
                                <Card key={m.id} className="p-4 shadow-sm hover:border-primary/50 transition-all flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-start justify-between gap-2 mb-2">
                                            <h4 className="font-semibold text-sm text-foreground">{m.title}</h4>
                                            <Badge
                                                variant="outline"
                                                className={
                                                    m.status === "COMPLETED"
                                                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                                                        : m.status === "IN_PROGRESS"
                                                            ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                                                            : "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                                }
                                            >
                                                {m.status.replace("_", " ")}
                                            </Badge>
                                        </div>

                                        {m.description && (
                                            <p className="text-xs text-muted-foreground mb-3">{m.description}</p>
                                        )}

                                        {m.deliverable && (
                                            <div className="p-2 bg-muted/60 rounded text-xs text-foreground mb-3 flex items-center gap-1.5">
                                                <FileText className="h-3.5 w-3.5 text-primary shrink-0" />
                                                <span className="truncate">Deliverable: {m.deliverable}</span>
                                            </div>
                                        )}

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-4">
                                            <Calendar className="h-3.5 w-3.5" />
                                            <span>
                                                Due: {m.dueDate ? format(new Date(m.dueDate), "dd MMM yyyy") : "Open-ended"}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between pt-3 border-t">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => handleMilestoneStatusToggle(m)}
                                        >
                                            <Check className="h-3.5 w-3.5 mr-1" />
                                            {m.status === "COMPLETED" ? "Reopen" : "Mark Done"}
                                        </Button>

                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => handleDeleteMilestone(m.id)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </Card>
                            ))
                        )}
                    </div>
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 4: RESOURCE ALLOCATION & TEAM */}
                {/* ========================================================================= */}
                <TabsContent value="team" className="space-y-4">
                    <div className="flex items-center justify-between bg-card p-3 rounded-lg border">
                        <div>
                            <h3 className="text-sm font-semibold">Staff Resource Allocation</h3>
                            <p className="text-xs text-muted-foreground">
                                Manage team members, project roles, and hourly charge-out rates from the employee directory.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            className="h-9"
                            onClick={() => setIsAddMemberOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-1.5" />
                            Allocate Team Member
                        </Button>
                    </div>

                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Staff Number</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Project Role</TableHead>
                                    <TableHead className="text-right">Hourly Rate</TableHead>
                                    <TableHead>Allocation Date</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {scopedMembers.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                            No team members currently allocated to this scope.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    scopedMembers.map((m) => (
                                        <TableRow key={m.id}>
                                            <TableCell className="font-medium">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-7 w-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                                                        {m.employeeName.charAt(0)}
                                                    </div>
                                                    <span>{m.employeeName}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="font-mono text-xs">{m.employeeNumber}</TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{m.departmentName || "—"}</TableCell>
                                            <TableCell>
                                                <Badge variant="secondary" className="font-medium text-xs">
                                                    {m.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold">
                                                {m.hourlyRate ? `₹${m.hourlyRate.toFixed(2)}/hr` : "—"}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(m.joinedAt), "dd MMM yyyy")}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleRemoveMember(m.id)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 5: TIMESHEET & LOGS */}
                {/* ========================================================================= */}
                <TabsContent value="timesheet" className="space-y-4">
                    <div className="flex items-center justify-between bg-card p-3 rounded-lg border">
                        <div>
                            <h3 className="text-sm font-semibold">Timesheet Ledger</h3>
                            <p className="text-xs text-muted-foreground">
                                Detailed log of hours invested by team members on project deliverables.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            className="h-9"
                            onClick={() => setIsLogTimeOpen(true)}
                        >
                            <Clock className="h-4 w-4 mr-1.5" />
                            Log Work Hours
                        </Button>
                    </div>

                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-28">Date</TableHead>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Project</TableHead>
                                    <TableHead>Task Ref</TableHead>
                                    <TableHead>Work Summary</TableHead>
                                    <TableHead className="text-right">Hours</TableHead>
                                    <TableHead>Billing</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {scopedTimeEntries.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                            No time entries logged yet.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    scopedTimeEntries.map((te) => (
                                        <TableRow key={te.id}>
                                            <TableCell className="text-xs font-mono text-muted-foreground">
                                                {format(new Date(te.workDate), "dd MMM yyyy")}
                                            </TableCell>
                                            <TableCell className="font-medium text-xs">
                                                {te.employeeName}
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-muted-foreground max-w-[140px] truncate">
                                                {te.projectName}
                                            </TableCell>
                                            <TableCell>
                                                {te.taskCode ? (
                                                    <span className="font-mono text-xs text-primary font-semibold">
                                                        {te.taskCode}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">General</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-md truncate">
                                                {te.description}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-bold text-xs">
                                                {te.hours.toFixed(1)}h
                                            </TableCell>
                                            <TableCell>
                                                {te.isBillable ? (
                                                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 text-[10px]">
                                                        Billable
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="bg-zinc-100 text-zinc-600 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-400 text-[10px]">
                                                        Non-billable
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleDeleteTime(te.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ========================================================================= */}
            {/* DIALOG: CREATE PROJECT */}
            {/* ========================================================================= */}
            <Dialog open={isCreateProjectOpen} onOpenChange={setIsCreateProjectOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle>Create New Project</DialogTitle>
                        <DialogDescription>
                            Set up a new client engagement or internal project with milestones and budget.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateProject} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-name">Project Title *</Label>
                            <Input
                                id="proj-name"
                                placeholder="e.g. Supply Chain Optimization & Cloud Integration"
                                value={newProject.name}
                                onChange={(e) => setNewProject(p => ({ ...p, name: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="proj-desc">Description & Objectives</Label>
                            <Textarea
                                id="proj-desc"
                                placeholder="e.g. Migration of 4 regional warehouse systems to automated ERP inventory..."
                                value={newProject.description}
                                onChange={(e) => setNewProject(p => ({ ...p, description: e.target.value }))}
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Client / Account</Label>
                                <Select
                                    value={newProject.clientId}
                                    onValueChange={(val) => setNewProject(p => ({ ...p, clientId: val === "internal" ? "" : val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Internal / None" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="internal">Internal / None</SelectItem>
                                        {data.availableClients.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Project Lead / Manager</Label>
                                <Select
                                    value={newProject.managerId}
                                    onValueChange={(val) => setNewProject(p => ({ ...p, managerId: val === "unassigned" ? "" : val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select manager" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {data.availableEmployees.map(e => (
                                            <SelectItem key={e.id} value={e.id}>
                                                {e.name} ({e.designationTitle || "Staff"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label>Priority</Label>
                                <Select
                                    value={newProject.priority}
                                    onValueChange={(val) => setNewProject(p => ({ ...p, priority: val as ProjectPriority }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Billing Type</Label>
                                <Select
                                    value={newProject.billingType}
                                    onValueChange={(val) => setNewProject(p => ({ ...p, billingType: val as ProjectBillingType }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FIXED_FEE">Fixed Fee</SelectItem>
                                        <SelectItem value="TIME_AND_MATERIALS">T&M</SelectItem>
                                        <SelectItem value="NON_BILLABLE">Non-Billable</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="proj-budget">Budget (INR)</Label>
                                <Input
                                    id="proj-budget"
                                    type="number"
                                    placeholder="e.g. 350000"
                                    value={newProject.budget}
                                    onChange={(e) => setNewProject(p => ({ ...p, budget: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="proj-start">Start Date</Label>
                                <Input
                                    id="proj-start"
                                    type="date"
                                    value={newProject.startDate}
                                    onChange={(e) => setNewProject(p => ({ ...p, startDate: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="proj-end">Target Completion Date</Label>
                                <Input
                                    id="proj-end"
                                    type="date"
                                    value={newProject.targetEndDate}
                                    onChange={(e) => setNewProject(p => ({ ...p, targetEndDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateProjectOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Create Project
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* DIALOG: CREATE TASK */}
            {/* ========================================================================= */}
            <Dialog open={isCreateTaskOpen} onOpenChange={setIsCreateTaskOpen}>
                <DialogContent className="sm:max-w-[520px]">
                    <DialogHeader>
                        <DialogTitle>Create Task</DialogTitle>
                        <DialogDescription>
                            Add a deliverable item to a project board with priority and assignee.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateTask} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Project *</Label>
                            <Select
                                value={newTask.projectId}
                                onValueChange={(val) => setNewTask(t => ({ ...t, projectId: val, milestoneId: "" }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.projectCode} — {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="task-title">Task Title *</Label>
                            <Input
                                id="task-title"
                                placeholder="e.g. Configure database connection pool and failover"
                                value={newTask.title}
                                onChange={(e) => setNewTask(t => ({ ...t, title: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="task-desc">Description</Label>
                            <Textarea
                                id="task-desc"
                                placeholder="e.g. Verify read replica lag and configure pgBouncer thresholds..."
                                value={newTask.description}
                                onChange={(e) => setNewTask(t => ({ ...t, description: e.target.value }))}
                                rows={2}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Assignee</Label>
                                <Select
                                    value={newTask.assignedEmployeeId}
                                    onValueChange={(val) => setNewTask(t => ({ ...t, assignedEmployeeId: val === "unassigned" ? "" : val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select employee" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {data.availableEmployees.map(e => (
                                            <SelectItem key={e.id} value={e.id}>
                                                {e.name} ({e.departmentName || "Staff"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Priority</Label>
                                <Select
                                    value={newTask.priority}
                                    onValueChange={(val) => setNewTask(t => ({ ...t, priority: val as ProjectPriority }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="task-est">Estimated Hours</Label>
                                <Input
                                    id="task-est"
                                    type="number"
                                    placeholder="e.g. 16.0"
                                    value={newTask.estimatedHours}
                                    onChange={(e) => setNewTask(t => ({ ...t, estimatedHours: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="task-due">Due Date</Label>
                                <Input
                                    id="task-due"
                                    type="date"
                                    value={newTask.dueDate}
                                    onChange={(e) => setNewTask(t => ({ ...t, dueDate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateTaskOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Add Task
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* DIALOG: CREATE MILESTONE */}
            {/* ========================================================================= */}
            <Dialog open={isCreateMilestoneOpen} onOpenChange={setIsCreateMilestoneOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Define Project Milestone</DialogTitle>
                        <DialogDescription>
                            Mark key deliverable deadlines and phase sign-offs.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateMilestone} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Project *</Label>
                            <Select
                                value={newMilestone.projectId}
                                onValueChange={(val) => setNewMilestone(m => ({ ...m, projectId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.projectCode} — {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="ms-title">Milestone Title *</Label>
                            <Input
                                id="ms-title"
                                placeholder="e.g. Alpha System Architecture Sign-off"
                                value={newMilestone.title}
                                onChange={(e) => setNewMilestone(m => ({ ...m, title: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="ms-deliverable">Key Deliverable</Label>
                            <Input
                                id="ms-deliverable"
                                placeholder="e.g. Signed UAT Test Results & Benchmark Report"
                                value={newMilestone.deliverable}
                                onChange={(e) => setNewMilestone(m => ({ ...m, deliverable: e.target.value }))}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="ms-due">Due Date</Label>
                                <Input
                                    id="ms-due"
                                    type="date"
                                    value={newMilestone.dueDate}
                                    onChange={(e) => setNewMilestone(m => ({ ...m, dueDate: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label>Status</Label>
                                <Select
                                    value={newMilestone.status}
                                    onValueChange={(val) => setNewMilestone(m => ({ ...m, status: val as MilestoneStatus }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PENDING">Pending</SelectItem>
                                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                        <SelectItem value="COMPLETED">Completed</SelectItem>
                                        <SelectItem value="DELAYED">Delayed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsCreateMilestoneOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Milestone
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* DIALOG: ALLOCATE TEAM MEMBER */}
            {/* ========================================================================= */}
            <Dialog open={isAddMemberOpen} onOpenChange={setIsAddMemberOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Allocate Team Member</DialogTitle>
                        <DialogDescription>
                            Assign a staff employee from HR to this project with a designated role.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAddMember} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Project *</Label>
                            <Select
                                value={newMember.projectId}
                                onValueChange={(val) => setNewMember(m => ({ ...m, projectId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.projectCode} — {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Employee *</Label>
                            <Select
                                value={newMember.employeeId}
                                onValueChange={(val) => setNewMember(m => ({ ...m, employeeId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.availableEmployees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.name} ({e.employeeNumber}) — {e.designationTitle || "Staff"}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="member-role">Project Role</Label>
                                <Input
                                    id="member-role"
                                    placeholder="e.g. Lead Full-Stack Dev"
                                    value={newMember.role}
                                    onChange={(e) => setNewMember(m => ({ ...m, role: e.target.value }))}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="member-rate">Hourly Rate (INR)</Label>
                                <Input
                                    id="member-rate"
                                    type="number"
                                    placeholder="e.g. 1200"
                                    value={newMember.hourlyRate}
                                    onChange={(e) => setNewMember(m => ({ ...m, hourlyRate: e.target.value }))}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsAddMemberOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Allocate Member
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* DIALOG: LOG TIME */}
            {/* ========================================================================= */}
            <Dialog open={isLogTimeOpen} onOpenChange={setIsLogTimeOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>Log Work Hours</DialogTitle>
                        <DialogDescription>
                            Record time invested on a project task for billing and effort tracking.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleLogTime} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label>Project *</Label>
                            <Select
                                value={newTimeLog.projectId}
                                onValueChange={(val) => setNewTimeLog(t => ({ ...t, projectId: val, taskId: "" }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select project" />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.projects.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.projectCode} — {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label>Linked Task</Label>
                            <Select
                                value={newTimeLog.taskId}
                                onValueChange={(val) => setNewTimeLog(t => ({ ...t, taskId: val === "general" ? "" : val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="General (No specific task)" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="general">General (No specific task)</SelectItem>
                                    {data.allTasks
                                        .filter(t => t.projectId === newTimeLog.projectId)
                                        .map(t => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.taskCode} — {t.title.substring(0, 30)}
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Employee *</Label>
                                <Select
                                    value={newTimeLog.employeeId}
                                    onValueChange={(val) => setNewTimeLog(t => ({ ...t, employeeId: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select staff" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.availableEmployees.map(e => (
                                            <SelectItem key={e.id} value={e.id}>
                                                {e.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="log-hours">Duration (Hours) *</Label>
                                <Input
                                    id="log-hours"
                                    type="number"
                                    step="0.25"
                                    min="0.25"
                                    max="24"
                                    placeholder="e.g. 4.0"
                                    value={newTimeLog.hours}
                                    onChange={(e) => setNewTimeLog(t => ({ ...t, hours: e.target.value }))}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="log-date">Work Date</Label>
                            <Input
                                id="log-date"
                                type="date"
                                value={newTimeLog.workDate}
                                onChange={(e) => setNewTimeLog(t => ({ ...t, workDate: e.target.value }))}
                                required
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label htmlFor="log-desc">Work Description *</Label>
                            <Textarea
                                id="log-desc"
                                placeholder="e.g. Built responsive Kanban drag cards and wired status updater actions..."
                                value={newTimeLog.description}
                                onChange={(e) => setNewTimeLog(t => ({ ...t, description: e.target.value }))}
                                rows={2}
                                required
                            />
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input
                                type="checkbox"
                                id="is-billable"
                                checked={newTimeLog.isBillable}
                                onChange={(e) => setNewTimeLog(t => ({ ...t, isBillable: e.target.checked }))}
                                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                            />
                            <Label htmlFor="is-billable" className="text-xs font-normal cursor-pointer">
                                Mark as Billable to Client
                            </Label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" onClick={() => setIsLogTimeOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Submit Hours
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
