"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Users,
    UserPlus,
    Building2,
    Briefcase,
    Calendar,
    Clock,
    CheckCircle2,
    XCircle,
    AlertCircle,
    Search,
    Plus,
    RefreshCw,
    Mail,
    Phone,
    MapPin,
    DollarSign,
    Check,
    X,
    Loader2,
    Eye,
    Pencil,
    Shield,
    BadgePercent,
    ArrowUpRight,
    UserCheck,
    CalendarDays,
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
    HROverviewData,
    EmployeeRecord,
    DepartmentRecord,
    DesignationRecord,
    AttendanceRecord,
    LeaveRecord,
    createEmployee,
    updateEmployee,
    createDepartment,
    createDesignation,
    recordAttendance,
    submitLeaveRequest,
    updateLeaveStatus,
    CreateEmployeeInput,
} from "@/app/actions/hr"
import { formatCurrency } from "@/lib/utils"
import {
    EmployeeStatus,
    EmploymentType,
    AttendanceStatus,
    LeaveType,
    LeaveStatus,
} from "@prisma/client"

interface HRClientProps {
    initialData: HROverviewData
}

export function HRClient({ initialData }: HRClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<"employees" | "attendance" | "leaves" | "org">("employees")

    // Filter states: Employees
    const [employeeSearch, setEmployeeSearch] = useState("")
    const [deptFilter, setDeptFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")

    // Filter states: Attendance
    const [attendanceDate, setAttendanceDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [attendanceSearch, setAttendanceSearch] = useState("")

    // Filter states: Leaves
    const [leaveStatusFilter, setLeaveStatusFilter] = useState<string>("all")

    // Modals
    const [isCreateEmployeeOpen, setIsCreateEmployeeOpen] = useState(false)
    const [isAttendanceDialogOpen, setIsAttendanceDialogOpen] = useState(false)
    const [isLeaveDialogOpen, setIsLeaveDialogOpen] = useState(false)
    const [isDepartmentDialogOpen, setIsDepartmentDialogOpen] = useState(false)
    const [isDesignationDialogOpen, setIsDesignationDialogOpen] = useState(false)
    const [isViewEmployeeOpen, setIsViewEmployeeOpen] = useState(false)
    const [isEditEmployeeOpen, setIsEditEmployeeOpen] = useState(false)

    // Selected items
    const [selectedEmployee, setSelectedEmployee] = useState<EmployeeRecord | null>(null)
    const [selectedLeave, setSelectedLeave] = useState<LeaveRecord | null>(null)

    // Form state: Employee
    const [empFirstName, setEmpFirstName] = useState("")
    const [empLastName, setEmpLastName] = useState("")
    const [empEmail, setEmpEmail] = useState("")
    const [empPhone, setEmpPhone] = useState("")
    const [empJoiningDate, setEmpJoiningDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [empStatus, setEmpStatus] = useState<EmployeeStatus>("ACTIVE")
    const [empType, setEmpType] = useState<EmploymentType>("FULL_TIME")
    const [empDeptId, setEmpDeptId] = useState("")
    const [empDesigId, setEmpDesigId] = useState("")
    const [empManagerId, setEmpManagerId] = useState("")
    const [empSalary, setEmpSalary] = useState("")
    const [empCity, setEmpCity] = useState("")
    const [empState, setEmpState] = useState("")
    const [empEmergencyName, setEmpEmergencyName] = useState("")
    const [empEmergencyPhone, setEmpEmergencyPhone] = useState("")
    const [isSubmittingEmployee, setIsSubmittingEmployee] = useState(false)

    // Form state: Attendance
    const [attEmployeeId, setAttEmployeeId] = useState("")
    const [attDate, setAttDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [attStatus, setAttStatus] = useState<AttendanceStatus>("PRESENT")
    const [attCheckIn, setAttCheckIn] = useState("09:00")
    const [attCheckOut, setAttCheckOut] = useState("17:30")
    const [attNotes, setAttNotes] = useState("")
    const [isSubmittingAttendance, setIsSubmittingAttendance] = useState(false)

    // Form state: Leave
    const [leaveEmployeeId, setLeaveEmployeeId] = useState("")
    const [leaveType, setLeaveType] = useState<LeaveType>("CASUAL")
    const [leaveStartDate, setLeaveStartDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [leaveEndDate, setLeaveEndDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [leaveReason, setLeaveReason] = useState("")
    const [isSubmittingLeave, setIsSubmittingLeave] = useState(false)

    // Form state: Department
    const [deptName, setDeptName] = useState("")
    const [deptCode, setDeptCode] = useState("")
    const [deptDescription, setDeptDescription] = useState("")
    const [deptManagerId, setDeptManagerId] = useState("")
    const [isSubmittingDept, setIsSubmittingDept] = useState(false)

    // Form state: Designation
    const [desigTitle, setDesigTitle] = useState("")
    const [desigDeptId, setDesigDeptId] = useState("")
    const [desigDescription, setDesigDescription] = useState("")
    const [isSubmittingDesig, setIsSubmittingDesig] = useState(false)

    // Filtered designations based on selected department in Employee form
    const availableDesignationsForEmp = useMemo(() => {
        if (!empDeptId) return initialData.designations
        return initialData.designations.filter(
            (d) => !d.departmentId || d.departmentId === empDeptId
        )
    }, [initialData.designations, empDeptId])

    // Filtered Employees
    const filteredEmployees = useMemo(() => {
        return initialData.employees.filter((emp) => {
            const query = employeeSearch.toLowerCase()
            const matchesSearch =
                emp.displayName.toLowerCase().includes(query) ||
                emp.email.toLowerCase().includes(query) ||
                emp.employeeNumber.toLowerCase().includes(query) ||
                (emp.departmentName?.toLowerCase() || "").includes(query) ||
                (emp.designationTitle?.toLowerCase() || "").includes(query)

            const matchesDept = deptFilter === "all" || emp.departmentId === deptFilter
            const matchesStatus = statusFilter === "all" || emp.status === statusFilter

            return matchesSearch && matchesDept && matchesStatus
        })
    }, [initialData.employees, employeeSearch, deptFilter, statusFilter])

    // Filtered Attendance for target date
    const filteredAttendance = useMemo(() => {
        return initialData.todayAttendance.filter((att) => {
            const query = attendanceSearch.toLowerCase()
            return (
                att.employeeName.toLowerCase().includes(query) ||
                att.employeeNumber.toLowerCase().includes(query) ||
                (att.departmentName?.toLowerCase() || "").includes(query)
            )
        })
    }, [initialData.todayAttendance, attendanceSearch])

    // Attendance breakdown for target date
    const attendanceStats = useMemo(() => {
        const totalMarked = initialData.todayAttendance.length
        const present = initialData.todayAttendance.filter((a) => a.status === "PRESENT").length
        const late = initialData.todayAttendance.filter((a) => a.status === "LATE").length
        const halfDay = initialData.todayAttendance.filter((a) => a.status === "HALF_DAY").length
        const absent = initialData.todayAttendance.filter((a) => a.status === "ABSENT").length
        const onLeave = initialData.todayAttendance.filter((a) => a.status === "ON_LEAVE").length

        return { totalMarked, present, late, halfDay, absent, onLeave }
    }, [initialData.todayAttendance])

    // Filtered Leaves
    const filteredLeaves = useMemo(() => {
        return initialData.allLeaves.filter((l) => {
            return leaveStatusFilter === "all" || l.status === leaveStatusFilter
        })
    }, [initialData.allLeaves, leaveStatusFilter])

    // Reset Employee Form
    const resetEmployeeForm = () => {
        setEmpFirstName("")
        setEmpLastName("")
        setEmpEmail("")
        setEmpPhone("")
        setEmpJoiningDate(format(new Date(), "yyyy-MM-dd"))
        setEmpStatus("ACTIVE")
        setEmpType("FULL_TIME")
        setEmpDeptId(initialData.departments[0]?.id || "")
        setEmpDesigId("")
        setEmpManagerId("")
        setEmpSalary("")
        setEmpCity("")
        setEmpState("")
        setEmpEmergencyName("")
        setEmpEmergencyPhone("")
    }

    // Handlers: Create Employee
    const handleCreateEmployeeSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!empFirstName.trim()) {
            toast.error("Employee first name is required")
            return
        }
        if (!empEmail.trim()) {
            toast.error("Work email address is required")
            return
        }

        setIsSubmittingEmployee(true)
        try {
            const res = await createEmployee({
                firstName: empFirstName.trim(),
                lastName: empLastName.trim() || undefined,
                email: empEmail.trim(),
                phone: empPhone.trim() || undefined,
                joiningDate: empJoiningDate || undefined,
                status: empStatus,
                employmentType: empType,
                departmentId: empDeptId || undefined,
                designationId: empDesigId || undefined,
                managerId: empManagerId || undefined,
                basicSalary: empSalary ? parseFloat(empSalary) : undefined,
                city: empCity.trim() || undefined,
                state: empState.trim() || undefined,
                emergencyContactName: empEmergencyName.trim() || undefined,
                emergencyContactPhone: empEmergencyPhone.trim() || undefined,
            })

            if (res.success) {
                toast.success(`Employee ${res.employee.employeeNumber} registered successfully`)
                setIsCreateEmployeeOpen(false)
                resetEmployeeForm()
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to register employee")
        } finally {
            setIsSubmittingEmployee(false)
        }
    }

    // Open Edit Employee
    const handleOpenEditEmployee = (emp: EmployeeRecord) => {
        setSelectedEmployee(emp)
        setEmpFirstName(emp.firstName)
        setEmpLastName(emp.lastName || "")
        setEmpEmail(emp.email)
        setEmpPhone(emp.phone || "")
        setEmpStatus(emp.status)
        setEmpType(emp.employmentType)
        setEmpDeptId(emp.departmentId || "")
        setEmpDesigId(emp.designationId || "")
        setEmpManagerId(emp.managerId || "")
        setEmpSalary(emp.basicSalary ? String(emp.basicSalary) : "")
        setEmpCity((emp.address as any)?.city || "")
        setEmpState((emp.address as any)?.state || "")
        setIsEditEmployeeOpen(true)
    }

    // Submit Edit Employee
    const handleEditEmployeeSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedEmployee) return

        setIsSubmittingEmployee(true)
        try {
            const res = await updateEmployee(selectedEmployee.id, {
                firstName: empFirstName.trim(),
                lastName: empLastName.trim() || undefined,
                email: empEmail.trim(),
                phone: empPhone.trim() || undefined,
                status: empStatus,
                employmentType: empType,
                departmentId: empDeptId || undefined,
                designationId: empDesigId || undefined,
                managerId: empManagerId || undefined,
                basicSalary: empSalary ? parseFloat(empSalary) : undefined,
                city: empCity.trim() || undefined,
                state: empState.trim() || undefined,
            })

            if (res.success) {
                toast.success("Employee updated successfully")
                setIsEditEmployeeOpen(false)
                setSelectedEmployee(null)
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to update employee")
        } finally {
            setIsSubmittingEmployee(false)
        }
    }

    // Open Attendance Dialog for employee
    const handleOpenAttendanceFor = (emp?: EmployeeRecord) => {
        if (emp) {
            setAttEmployeeId(emp.id)
        } else if (initialData.employees.length > 0) {
            setAttEmployeeId(initialData.employees[0].id)
        }
        setAttDate(attendanceDate)
        setAttStatus("PRESENT")
        setAttCheckIn("09:00")
        setAttCheckOut("17:30")
        setAttNotes("")
        setIsAttendanceDialogOpen(true)
    }

    // Submit Record Attendance
    const handleRecordAttendanceSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!attEmployeeId) {
            toast.error("Please select an employee")
            return
        }

        setIsSubmittingAttendance(true)
        try {
            const res = await recordAttendance({
                employeeId: attEmployeeId,
                date: attDate,
                status: attStatus,
                checkIn: attCheckIn || undefined,
                checkOut: attCheckOut || undefined,
                notes: attNotes.trim() || undefined,
            })

            if (res.success) {
                toast.success("Attendance recorded successfully")
                setIsAttendanceDialogOpen(false)
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to record attendance")
        } finally {
            setIsSubmittingAttendance(false)
        }
    }

    // Submit Apply Leave
    const handleApplyLeaveSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!leaveEmployeeId) {
            toast.error("Please select an employee")
            return
        }
        if (!leaveReason.trim()) {
            toast.error("Please provide a reason for leave")
            return
        }

        setIsSubmittingLeave(true)
        try {
            const res = await submitLeaveRequest({
                employeeId: leaveEmployeeId,
                type: leaveType,
                startDate: leaveStartDate,
                endDate: leaveEndDate,
                reason: leaveReason.trim(),
            })

            if (res.success) {
                toast.success("Leave request submitted for approval")
                setIsLeaveDialogOpen(false)
                setLeaveReason("")
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to submit leave request")
        } finally {
            setIsSubmittingLeave(false)
        }
    }

    // Handle Leave Decision (Approve / Reject)
    const handleLeaveDecision = async (leaveId: string, status: LeaveStatus) => {
        try {
            const res = await updateLeaveStatus({ leaveId, status })
            if (res.success) {
                toast.success(`Leave request ${status.toLowerCase()} successfully`)
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to update leave status")
        }
    }

    // Submit Create Department
    const handleCreateDeptSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!deptName.trim()) {
            toast.error("Department name is required")
            return
        }

        setIsSubmittingDept(true)
        try {
            const res = await createDepartment({
                name: deptName.trim(),
                code: deptCode.trim() || undefined,
                description: deptDescription.trim() || undefined,
                managerId: deptManagerId || undefined,
            })

            if (res.success) {
                toast.success("Department created successfully")
                setIsDepartmentDialogOpen(false)
                setDeptName("")
                setDeptCode("")
                setDeptDescription("")
                setDeptManagerId("")
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to create department")
        } finally {
            setIsSubmittingDept(false)
        }
    }

    // Submit Create Designation
    const handleCreateDesigSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!desigTitle.trim()) {
            toast.error("Designation title is required")
            return
        }

        setIsSubmittingDesig(true)
        try {
            const res = await createDesignation({
                title: desigTitle.trim(),
                departmentId: desigDeptId || undefined,
                description: desigDescription.trim() || undefined,
            })

            if (res.success) {
                toast.success("Designation created successfully")
                setIsDesignationDialogOpen(false)
                setDesigTitle("")
                setDesigDeptId("")
                setDesigDescription("")
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to create designation")
        } finally {
            setIsSubmittingDesig(false)
        }
    }

    // Status Badge Helpers
    const renderEmployeeStatusBadge = (status: EmployeeStatus) => {
        switch (status) {
            case "ACTIVE":
                return (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Active
                    </Badge>
                )
            case "PROBATION":
                return (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-50/50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        Probation
                    </Badge>
                )
            case "ON_LEAVE":
                return (
                    <Badge variant="outline" className="border-sky-500/40 bg-sky-50/50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                        On Leave
                    </Badge>
                )
            case "RESIGNED":
                return (
                    <Badge variant="outline" className="border-gray-500/40 text-gray-600 dark:text-gray-400">
                        Resigned
                    </Badge>
                )
            case "TERMINATED":
                return (
                    <Badge variant="outline" className="border-red-500/40 bg-red-50/50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                        Terminated
                    </Badge>
                )
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const renderAttendanceBadge = (status: AttendanceStatus) => {
        switch (status) {
            case "PRESENT":
                return (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Present
                    </Badge>
                )
            case "LATE":
                return (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-50/50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        Late
                    </Badge>
                )
            case "HALF_DAY":
                return (
                    <Badge variant="outline" className="border-purple-500/40 bg-purple-50/50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                        Half Day
                    </Badge>
                )
            case "ABSENT":
                return (
                    <Badge variant="outline" className="border-red-500/40 bg-red-50/50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                        Absent
                    </Badge>
                )
            case "ON_LEAVE":
                return (
                    <Badge variant="outline" className="border-sky-500/40 bg-sky-50/50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                        On Leave
                    </Badge>
                )
            case "HOLIDAY":
                return (
                    <Badge variant="outline" className="border-blue-500/40 bg-blue-50/50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        Holiday
                    </Badge>
                )
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const renderLeaveStatusBadge = (status: LeaveStatus) => {
        switch (status) {
            case "PENDING":
                return (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-50/50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        Pending
                    </Badge>
                )
            case "APPROVED":
                return (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Approved
                    </Badge>
                )
            case "REJECTED":
                return (
                    <Badge variant="outline" className="border-red-500/40 bg-red-50/50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                        Rejected
                    </Badge>
                )
            case "CANCELLED":
                return (
                    <Badge variant="outline" className="border-gray-500/40 text-gray-600 dark:text-gray-400">
                        Cancelled
                    </Badge>
                )
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    return (
        <div className="flex-1 space-y-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Users className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">HR & Workforce Management</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage employee profiles, departments, daily attendance rosters, and leave approvals.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            startTransition(() => {
                                router.refresh()
                            })
                        }}
                        disabled={isPending}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenAttendanceFor()}
                    >
                        <Clock className="mr-2 h-4 w-4" />
                        Mark Attendance
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (initialData.employees.length > 0) {
                                setLeaveEmployeeId(initialData.employees[0].id)
                            }
                            setIsLeaveDialogOpen(true)
                        }}
                    >
                        <Calendar className="mr-2 h-4 w-4" />
                        Apply Leave
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            resetEmployeeForm()
                            setIsCreateEmployeeOpen(true)
                        }}
                    >
                        <UserPlus className="mr-2 h-4 w-4" />
                        Add Employee
                    </Button>
                </div>
            </div>

            {/* Telemetry KPI Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Total Headcount
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <Users className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.totalEmployees}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {initialData.telemetry.activeEmployees} active / on probation
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Present Today
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <UserCheck className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.presentToday}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {initialData.telemetry.attendanceRate}% attendance rate today
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pending Leaves
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <CalendarDays className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.pendingLeavesCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Awaiting manager approval
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Departments & Teams
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Building2 className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.departmentsCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Active functional business units
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs Section */}
            <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as "employees" | "attendance" | "leaves" | "org")}
                className="space-y-4"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <TabsList className="grid w-full grid-cols-4 sm:w-auto">
                        <TabsTrigger value="employees" className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            <span>Directory</span>
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                                {initialData.employees.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="attendance" className="flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            <span>Attendance</span>
                        </TabsTrigger>
                        <TabsTrigger value="leaves" className="flex items-center gap-2">
                            <CalendarDays className="h-4 w-4" />
                            <span>Leaves</span>
                            {initialData.telemetry.pendingLeavesCount > 0 && (
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                    {initialData.telemetry.pendingLeavesCount}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="org" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>Organization</span>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Tab 1: Employee Directory */}
                <TabsContent value="employees" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Employee Roster</CardTitle>
                                    <CardDescription>
                                        Verified workforce profiles, reporting hierarchy, and job assignments.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative w-full sm:w-60">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by name, ID, email..."
                                            value={employeeSearch}
                                            onChange={(e) => setEmployeeSearch(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                    <Select value={deptFilter} onValueChange={setDeptFilter}>
                                        <SelectTrigger className="w-full sm:w-44">
                                            <SelectValue placeholder="Department" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Departments</SelectItem>
                                            {initialData.departments.map((d) => (
                                                <SelectItem key={d.id} value={d.id}>
                                                    {d.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full sm:w-36">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="PROBATION">Probation</SelectItem>
                                            <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                                            <SelectItem value="RESIGNED">Resigned</SelectItem>
                                            <SelectItem value="TERMINATED">Terminated</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredEmployees.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                                        <Users className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-medium">No employees found</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                                        {employeeSearch || deptFilter !== "all" || statusFilter !== "all"
                                            ? "Try adjusting your filters or search keywords."
                                            : "Add your first employee to initiate your company's workforce directory."}
                                    </p>
                                    <Button
                                        onClick={() => {
                                            resetEmployeeForm()
                                            setIsCreateEmployeeOpen(true)
                                        }}
                                        size="sm"
                                    >
                                        <UserPlus className="mr-2 h-4 w-4" />
                                        Register Employee
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Contact</TableHead>
                                                <TableHead>Department & Role</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Joined Date</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredEmployees.map((emp) => (
                                                <TableRow key={emp.id}>
                                                    <TableCell>
                                                        <div className="flex items-center gap-3">
                                                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                                                                {emp.firstName[0]}
                                                                {emp.lastName ? emp.lastName[0] : ""}
                                                            </div>
                                                            <div>
                                                                <div className="font-semibold text-foreground">
                                                                    {emp.displayName}
                                                                </div>
                                                                <span className="font-mono text-xs text-muted-foreground">
                                                                    {emp.employeeNumber}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-0.5 text-xs text-muted-foreground">
                                                            <div className="flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                <span>{emp.email}</span>
                                                            </div>
                                                            {emp.phone && (
                                                                <div className="flex items-center gap-1">
                                                                    <Phone className="h-3 w-3" />
                                                                    <span>{emp.phone}</span>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            {emp.departmentName ? (
                                                                <Badge variant="outline" className="text-xs">
                                                                    {emp.departmentName}
                                                                </Badge>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">
                                                                    No Department
                                                                </span>
                                                            )}
                                                            <div className="text-xs text-muted-foreground">
                                                                {emp.designationTitle || "Staff"}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <span className="text-xs font-medium">
                                                            {emp.employmentType.replace("_", " ")}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">
                                                        {format(new Date(emp.joiningDate), "dd MMM yyyy")}
                                                    </TableCell>
                                                    <TableCell>{renderEmployeeStatusBadge(emp.status)}</TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => {
                                                                    setSelectedEmployee(emp)
                                                                    setIsViewEmployeeOpen(true)
                                                                }}
                                                                title="View 360 Profile"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8"
                                                                onClick={() => handleOpenEditEmployee(emp)}
                                                                title="Edit Profile"
                                                            >
                                                                <Pencil className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="h-8 px-2 text-xs"
                                                                onClick={() => handleOpenAttendanceFor(emp)}
                                                            >
                                                                <Clock className="mr-1 h-3.5 w-3.5" />
                                                                Attendance
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Attendance Tracking */}
                <TabsContent value="attendance" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Attendance Register</CardTitle>
                                    <CardDescription>
                                        Daily presence tracking, shift hours, and punctuality monitoring.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <Input
                                        type="date"
                                        value={attendanceDate}
                                        onChange={(e) => setAttendanceDate(e.target.value)}
                                        className="w-40"
                                    />
                                    <div className="relative w-full sm:w-56">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search attendance..."
                                            value={attendanceSearch}
                                            onChange={(e) => setAttendanceSearch(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => handleOpenAttendanceFor()}
                                    >
                                        <Clock className="mr-2 h-4 w-4" />
                                        Record Entry
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {/* Daily Statistics Summary Bar */}
                            <div className="grid grid-cols-2 gap-2 sm:grid-cols-6 text-center">
                                <div className="rounded-lg border p-2.5 bg-muted/20">
                                    <div className="text-xs text-muted-foreground">Total Marked</div>
                                    <div className="text-lg font-bold">{attendanceStats.totalMarked}</div>
                                </div>
                                <div className="rounded-lg border p-2.5 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400">
                                    <div className="text-xs font-medium">Present</div>
                                    <div className="text-lg font-bold">{attendanceStats.present}</div>
                                </div>
                                <div className="rounded-lg border p-2.5 bg-amber-500/10 text-amber-700 dark:text-amber-400">
                                    <div className="text-xs font-medium">Late</div>
                                    <div className="text-lg font-bold">{attendanceStats.late}</div>
                                </div>
                                <div className="rounded-lg border p-2.5 bg-purple-500/10 text-purple-700 dark:text-purple-400">
                                    <div className="text-xs font-medium">Half Day</div>
                                    <div className="text-lg font-bold">{attendanceStats.halfDay}</div>
                                </div>
                                <div className="rounded-lg border p-2.5 bg-red-500/10 text-red-700 dark:text-red-400">
                                    <div className="text-xs font-medium">Absent</div>
                                    <div className="text-lg font-bold">{attendanceStats.absent}</div>
                                </div>
                                <div className="rounded-lg border p-2.5 bg-sky-500/10 text-sky-700 dark:text-sky-400">
                                    <div className="text-xs font-medium">On Leave</div>
                                    <div className="text-lg font-bold">{attendanceStats.onLeave}</div>
                                </div>
                            </div>

                            {filteredAttendance.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md">
                                    <Clock className="h-10 w-10 text-muted-foreground mb-3" />
                                    <h3 className="text-base font-medium">No attendance records for this date</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                                        Mark check-in/out records for your team to populate the attendance register.
                                    </p>
                                    <Button size="sm" onClick={() => handleOpenAttendanceFor()}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Record Attendance Now
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Department</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Check-In</TableHead>
                                                <TableHead>Check-Out</TableHead>
                                                <TableHead>Working Hours</TableHead>
                                                <TableHead>Notes</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredAttendance.map((att) => (
                                                <TableRow key={att.id}>
                                                    <TableCell className="font-medium">
                                                        <div>{att.employeeName}</div>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {att.employeeNumber}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {att.departmentName || "General"}
                                                    </TableCell>
                                                    <TableCell>{renderAttendanceBadge(att.status)}</TableCell>
                                                    <TableCell className="text-xs font-mono">
                                                        {att.checkIn ? format(new Date(att.checkIn), "hh:mm a") : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-mono">
                                                        {att.checkOut ? format(new Date(att.checkOut), "hh:mm a") : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-xs font-medium">
                                                        {att.workingHours !== null ? `${att.workingHours} hrs` : "—"}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                                                        {att.notes || "—"}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-8 text-xs"
                                                            onClick={() => {
                                                                setAttEmployeeId(att.employeeId)
                                                                setAttDate(attendanceDate)
                                                                setAttStatus(att.status)
                                                                setAttNotes(att.notes || "")
                                                                setIsAttendanceDialogOpen(true)
                                                            }}
                                                        >
                                                            Update
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 3: Leave Management */}
                <TabsContent value="leaves" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Leave Requests & Approvals</CardTitle>
                                    <CardDescription>
                                        Track vacation requests, sick leaves, and custom manager approval decisions.
                                    </CardDescription>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Select value={leaveStatusFilter} onValueChange={setLeaveStatusFilter}>
                                        <SelectTrigger className="w-40">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Requests</SelectItem>
                                            <SelectItem value="PENDING">Pending Only</SelectItem>
                                            <SelectItem value="APPROVED">Approved</SelectItem>
                                            <SelectItem value="REJECTED">Rejected</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            if (initialData.employees.length > 0) {
                                                setLeaveEmployeeId(initialData.employees[0].id)
                                            }
                                            setIsLeaveDialogOpen(true)
                                        }}
                                    >
                                        <Calendar className="mr-2 h-4 w-4" />
                                        Apply Leave
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredLeaves.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center border rounded-md">
                                    <CalendarDays className="h-10 w-10 text-muted-foreground mb-3" />
                                    <h3 className="text-base font-medium">No leave applications found</h3>
                                    <p className="text-xs text-muted-foreground max-w-sm mt-1 mb-4">
                                        Leave requests submitted by employees will appear here for manager review and approval.
                                    </p>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            if (initialData.employees.length > 0) {
                                                setLeaveEmployeeId(initialData.employees[0].id)
                                            }
                                            setIsLeaveDialogOpen(true)
                                        }}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Submit Leave Request
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Employee</TableHead>
                                                <TableHead>Leave Type</TableHead>
                                                <TableHead>Period</TableHead>
                                                <TableHead className="text-center">Days</TableHead>
                                                <TableHead>Reason</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredLeaves.map((leave) => (
                                                <TableRow key={leave.id}>
                                                    <TableCell className="font-medium">
                                                        <div>{leave.employeeName}</div>
                                                        <span className="font-mono text-xs text-muted-foreground">
                                                            {leave.employeeNumber}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline" className="text-xs">
                                                            {leave.type}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {format(new Date(leave.startDate), "dd MMM yyyy")} –{" "}
                                                        {format(new Date(leave.endDate), "dd MMM yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-center font-semibold">
                                                        {leave.days}
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground max-w-xs">
                                                        {leave.reason}
                                                    </TableCell>
                                                    <TableCell>{renderLeaveStatusBadge(leave.status)}</TableCell>
                                                    <TableCell className="text-right">
                                                        {leave.status === "PENDING" ? (
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 text-xs text-emerald-600 hover:text-emerald-700"
                                                                    onClick={() => handleLeaveDecision(leave.id, "APPROVED")}
                                                                >
                                                                    <Check className="mr-1 h-3.5 w-3.5" />
                                                                    Approve
                                                                </Button>
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    className="h-8 text-xs text-red-600 hover:text-red-700"
                                                                    onClick={() => handleLeaveDecision(leave.id, "REJECTED")}
                                                                >
                                                                    <X className="mr-1 h-3.5 w-3.5" />
                                                                    Reject
                                                                </Button>
                                                            </div>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground italic">
                                                                Resolved
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 4: Organization Structure */}
                <TabsContent value="org" className="space-y-6">
                    {/* Departments Header & Grid */}
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-lg font-bold tracking-tight">Departments</h3>
                                <p className="text-xs text-muted-foreground">
                                    Functional teams and administrative divisions across the company.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsDepartmentDialogOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Department
                            </Button>
                        </div>

                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {initialData.departments.map((dept) => (
                                <Card key={dept.id} className="border-border/60">
                                    <CardHeader className="pb-2">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-base font-semibold">
                                                {dept.name}
                                            </CardTitle>
                                            {dept.code && (
                                                <Badge variant="secondary" className="font-mono text-xs">
                                                    {dept.code}
                                                </Badge>
                                            )}
                                        </div>
                                        <CardDescription className="text-xs line-clamp-2">
                                            {dept.description || "Active business unit"}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="pt-2 border-t border-border/40 flex items-center justify-between text-xs">
                                        <div className="text-muted-foreground">
                                            Head:{" "}
                                            <span className="font-medium text-foreground">
                                                {dept.managerName || "Unassigned"}
                                            </span>
                                        </div>
                                        <Badge variant="outline" className="font-medium">
                                            {dept.employeeCount} {dept.employeeCount === 1 ? "Employee" : "Employees"}
                                        </Badge>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>

                    {/* Designations Section */}
                    <div className="space-y-4 pt-4 border-t border-border/40">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                                <h3 className="text-lg font-bold tracking-tight">Job Designations</h3>
                                <p className="text-xs text-muted-foreground">
                                    Standard job titles and role specifications mapped to departments.
                                </p>
                            </div>
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setIsDesignationDialogOpen(true)}
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Designation
                            </Button>
                        </div>

                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Designation Title</TableHead>
                                        <TableHead>Department</TableHead>
                                        <TableHead>Description</TableHead>
                                        <TableHead className="text-right">Headcount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {initialData.designations.map((des) => (
                                        <TableRow key={des.id}>
                                            <TableCell className="font-semibold text-sm">
                                                {des.title}
                                            </TableCell>
                                            <TableCell>
                                                {des.departmentName ? (
                                                    <Badge variant="outline" className="text-xs">
                                                        {des.departmentName}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground">—</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {des.description || "Standard role"}
                                            </TableCell>
                                            <TableCell className="text-right font-semibold">
                                                {des.employeeCount}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* Modal 1: Add Employee */}
            <Dialog open={isCreateEmployeeOpen} onOpenChange={setIsCreateEmployeeOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <UserPlus className="h-5 w-5 text-primary" />
                            Register New Employee
                        </DialogTitle>
                        <DialogDescription>
                            Create a verified employee record with organizational assignment and compensation structure.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateEmployeeSubmit} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor="emp-fn">
                                    First Name <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="emp-fn"
                                    placeholder="Enter employee first name"
                                    value={empFirstName}
                                    onChange={(e) => setEmpFirstName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="emp-ln">Last Name</Label>
                                <Input
                                    id="emp-ln"
                                    placeholder="Enter employee last name"
                                    value={empLastName}
                                    onChange={(e) => setEmpLastName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="emp-mail">
                                    Work Email <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="emp-mail"
                                    type="email"
                                    placeholder="employee@company.com"
                                    value={empEmail}
                                    onChange={(e) => setEmpEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="emp-tel">Phone Number</Label>
                                <Input
                                    id="emp-tel"
                                    placeholder="Contact phone number"
                                    value={empPhone}
                                    onChange={(e) => setEmpPhone(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="emp-dept">Department</Label>
                                <Select value={empDeptId} onValueChange={setEmpDeptId}>
                                    <SelectTrigger id="emp-dept">
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.departments.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="emp-desig">Designation</Label>
                                <Select value={empDesigId} onValueChange={setEmpDesigId}>
                                    <SelectTrigger id="emp-desig">
                                        <SelectValue placeholder="Select designation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDesignationsForEmp.map((des) => (
                                            <SelectItem key={des.id} value={des.id}>
                                                {des.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="emp-type">Employment Type</Label>
                                <Select
                                    value={empType}
                                    onValueChange={(val) => setEmpType(val as EmploymentType)}
                                >
                                    <SelectTrigger id="emp-type">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                                        <SelectItem value="CONTRACT">Contract</SelectItem>
                                        <SelectItem value="INTERN">Intern</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="emp-join">Joining Date</Label>
                                <Input
                                    id="emp-join"
                                    type="date"
                                    value={empJoiningDate}
                                    onChange={(e) => setEmpJoiningDate(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="emp-mgr">Reporting Manager</Label>
                                <Select value={empManagerId} onValueChange={setEmpManagerId}>
                                    <SelectTrigger id="emp-mgr">
                                        <SelectValue placeholder="Select reporting manager" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.employees.map((e) => (
                                            <SelectItem key={e.id} value={e.id}>
                                                {e.displayName} ({e.employeeNumber})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="emp-sal">Monthly Basic Salary</Label>
                                <Input
                                    id="emp-sal"
                                    type="number"
                                    placeholder="Enter monthly salary"
                                    value={empSalary}
                                    onChange={(e) => setEmpSalary(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="emp-city">City</Label>
                                <Input
                                    id="emp-city"
                                    placeholder="City"
                                    value={empCity}
                                    onChange={(e) => setEmpCity(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="emp-state">State / Province</Label>
                                <Input
                                    id="emp-state"
                                    placeholder="State"
                                    value={empState}
                                    onChange={(e) => setEmpState(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateEmployeeOpen(false)}
                                disabled={isSubmittingEmployee}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmittingEmployee}>
                                {isSubmittingEmployee ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Register Employee
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal 2: Edit Employee */}
            <Dialog open={isEditEmployeeOpen} onOpenChange={setIsEditEmployeeOpen}>
                <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Pencil className="h-5 w-5 text-primary" />
                            Edit Employee Profile
                        </DialogTitle>
                        <DialogDescription>
                            Update organizational details and job assignments for {selectedEmployee?.displayName}.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleEditEmployeeSubmit} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label>First Name</Label>
                                <Input
                                    value={empFirstName}
                                    onChange={(e) => setEmpFirstName(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Last Name</Label>
                                <Input
                                    value={empLastName}
                                    onChange={(e) => setEmpLastName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Work Email</Label>
                                <Input
                                    type="email"
                                    value={empEmail}
                                    onChange={(e) => setEmpEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label>Phone Number</Label>
                                <Input
                                    value={empPhone}
                                    onChange={(e) => setEmpPhone(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label>Status</Label>
                                <Select
                                    value={empStatus}
                                    onValueChange={(val) => setEmpStatus(val as EmployeeStatus)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ACTIVE">Active</SelectItem>
                                        <SelectItem value="PROBATION">Probation</SelectItem>
                                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                                        <SelectItem value="RESIGNED">Resigned</SelectItem>
                                        <SelectItem value="TERMINATED">Terminated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label>Department</Label>
                                <Select value={empDeptId} onValueChange={setEmpDeptId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.departments.map((d) => (
                                            <SelectItem key={d.id} value={d.id}>
                                                {d.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label>Designation</Label>
                                <Select value={empDesigId} onValueChange={setEmpDesigId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select designation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {availableDesignationsForEmp.map((des) => (
                                            <SelectItem key={des.id} value={des.id}>
                                                {des.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label>Monthly Salary</Label>
                                <Input
                                    type="number"
                                    value={empSalary}
                                    onChange={(e) => setEmpSalary(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsEditEmployeeOpen(false)}
                                disabled={isSubmittingEmployee}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmittingEmployee}>
                                {isSubmittingEmployee ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Updating...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal 3: Record Attendance */}
            <Dialog open={isAttendanceDialogOpen} onOpenChange={setIsAttendanceDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Clock className="h-5 w-5 text-primary" />
                            Record Attendance Log
                        </DialogTitle>
                        <DialogDescription>
                            Mark check-in/out timestamps and presence status for employee.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRecordAttendanceSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="att-emp">Employee</Label>
                            <Select value={attEmployeeId} onValueChange={setAttEmployeeId}>
                                <SelectTrigger id="att-emp">
                                    <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.employees.map((e) => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.displayName} ({e.employeeNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor="att-d">Date</Label>
                                <Input
                                    id="att-d"
                                    type="date"
                                    value={attDate}
                                    onChange={(e) => setAttDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="att-st">Status</Label>
                                <Select
                                    value={attStatus}
                                    onValueChange={(val) => setAttStatus(val as AttendanceStatus)}
                                >
                                    <SelectTrigger id="att-st">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PRESENT">Present</SelectItem>
                                        <SelectItem value="LATE">Late</SelectItem>
                                        <SelectItem value="HALF_DAY">Half Day</SelectItem>
                                        <SelectItem value="ABSENT">Absent</SelectItem>
                                        <SelectItem value="ON_LEAVE">On Leave</SelectItem>
                                        <SelectItem value="HOLIDAY">Holiday</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="att-cin">Check-In Time</Label>
                                <Input
                                    id="att-cin"
                                    type="time"
                                    value={attCheckIn}
                                    onChange={(e) => setAttCheckIn(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="att-cout">Check-Out Time</Label>
                                <Input
                                    id="att-cout"
                                    type="time"
                                    value={attCheckOut}
                                    onChange={(e) => setAttCheckOut(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="att-n">Notes / Remarks</Label>
                            <Input
                                id="att-n"
                                placeholder="Add notes (e.g., approved late arrival, remote shift)"
                                value={attNotes}
                                onChange={(e) => setAttNotes(e.target.value)}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAttendanceDialogOpen(false)}
                                disabled={isSubmittingAttendance}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmittingAttendance}>
                                {isSubmittingAttendance ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Recording...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Save Attendance
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal 4: Apply Leave */}
            <Dialog open={isLeaveDialogOpen} onOpenChange={setIsLeaveDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Submit Leave Application
                        </DialogTitle>
                        <DialogDescription>
                            Apply for time off or formal vacation leave for manager approval.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleApplyLeaveSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="lv-emp">Employee</Label>
                            <Select value={leaveEmployeeId} onValueChange={setLeaveEmployeeId}>
                                <SelectTrigger id="lv-emp">
                                    <SelectValue placeholder="Select employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.employees.map((e) => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.displayName} ({e.employeeNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="lv-tp">Leave Type</Label>
                            <Select
                                value={leaveType}
                                onValueChange={(val) => setLeaveType(val as LeaveType)}
                            >
                                <SelectTrigger id="lv-tp">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASUAL">Casual Leave</SelectItem>
                                    <SelectItem value="SICK">Sick / Medical Leave</SelectItem>
                                    <SelectItem value="ANNUAL">Annual Vacation</SelectItem>
                                    <SelectItem value="MATERNITY">Maternity Leave</SelectItem>
                                    <SelectItem value="PATERNITY">Paternity Leave</SelectItem>
                                    <SelectItem value="UNPAID">Unpaid Time Off</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1">
                                <Label htmlFor="lv-st">Start Date</Label>
                                <Input
                                    id="lv-st"
                                    type="date"
                                    value={leaveStartDate}
                                    onChange={(e) => setLeaveStartDate(e.target.value)}
                                    required
                                />
                            </div>
                            <div className="space-y-1">
                                <Label htmlFor="lv-ed">End Date</Label>
                                <Input
                                    id="lv-ed"
                                    type="date"
                                    value={leaveEndDate}
                                    onChange={(e) => setLeaveEndDate(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="lv-rsn">Reason for Leave</Label>
                            <Textarea
                                id="lv-rsn"
                                placeholder="Explain time-off requirements..."
                                value={leaveReason}
                                onChange={(e) => setLeaveReason(e.target.value)}
                                rows={3}
                                required
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsLeaveDialogOpen(false)}
                                disabled={isSubmittingLeave}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmittingLeave}>
                                {isSubmittingLeave ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Submit Request
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal 5: Add Department */}
            <Dialog open={isDepartmentDialogOpen} onOpenChange={setIsDepartmentDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            Create Department
                        </DialogTitle>
                        <DialogDescription>
                            Add an organizational functional division to categorize employees.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateDeptSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="d-name">Department Name</Label>
                            <Input
                                id="d-name"
                                placeholder="Enter department name"
                                value={deptName}
                                onChange={(e) => setDeptName(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="d-code">Department Code</Label>
                            <Input
                                id="d-code"
                                placeholder="Enter short code"
                                value={deptCode}
                                onChange={(e) => setDeptCode(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="d-mgr">Department Head / Manager</Label>
                            <Select value={deptManagerId} onValueChange={setDeptManagerId}>
                                <SelectTrigger id="d-mgr">
                                    <SelectValue placeholder="Select manager" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.employees.map((e) => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.displayName} ({e.employeeNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="d-desc">Description</Label>
                            <Textarea
                                id="d-desc"
                                placeholder="Enter department purpose and scope..."
                                value={deptDescription}
                                onChange={(e) => setDeptDescription(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDepartmentDialogOpen(false)}
                                disabled={isSubmittingDept}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmittingDept}>
                                {isSubmittingDept ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Create Department
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal 6: Add Designation */}
            <Dialog open={isDesignationDialogOpen} onOpenChange={setIsDesignationDialogOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" />
                            Create Designation
                        </DialogTitle>
                        <DialogDescription>
                            Define a standard job role or position title.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateDesigSubmit} className="space-y-4">
                        <div className="space-y-1">
                            <Label htmlFor="des-title">Job Title</Label>
                            <Input
                                id="des-title"
                                placeholder="Enter designation title"
                                value={desigTitle}
                                onChange={(e) => setDesigTitle(e.target.value)}
                                required
                            />
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="des-dept">Department</Label>
                            <Select value={desigDeptId} onValueChange={setDesigDeptId}>
                                <SelectTrigger id="des-dept">
                                    <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.departments.map((d) => (
                                        <SelectItem key={d.id} value={d.id}>
                                            {d.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label htmlFor="des-desc">Role Description</Label>
                            <Textarea
                                id="des-desc"
                                placeholder="Enter role responsibilities..."
                                value={desigDescription}
                                onChange={(e) => setDesigDescription(e.target.value)}
                                rows={2}
                            />
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsDesignationDialogOpen(false)}
                                disabled={isSubmittingDesig}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmittingDesig}>
                                {isSubmittingDesig ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Create Designation
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal 7: View Employee 360° Profile */}
            <Dialog open={isViewEmployeeOpen} onOpenChange={setIsViewEmployeeOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <Users className="h-5 w-5 text-primary" />
                                {selectedEmployee?.displayName}
                            </DialogTitle>
                            {selectedEmployee && renderEmployeeStatusBadge(selectedEmployee.status)}
                        </div>
                        <DialogDescription className="font-mono text-xs">
                            {selectedEmployee?.employeeNumber} • Joined{" "}
                            {selectedEmployee && format(new Date(selectedEmployee.joiningDate), "dd MMMM yyyy")}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedEmployee && (
                        <div className="space-y-6 text-sm">
                            {/* Department & Role Card */}
                            <div className="grid gap-4 sm:grid-cols-2 rounded-lg border p-4 bg-muted/20">
                                <div>
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Organizational Assignment
                                    </span>
                                    <div className="font-semibold text-base">
                                        {selectedEmployee.designationTitle || "Staff Role"}
                                    </div>
                                    <div className="text-muted-foreground text-xs mt-0.5">
                                        Department: {selectedEmployee.departmentName || "Unassigned"}
                                    </div>
                                    <div className="text-muted-foreground text-xs mt-0.5">
                                        Manager: {selectedEmployee.managerName || "None"}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1">
                                        Employment & Compensation
                                    </span>
                                    <div>
                                        Type:{" "}
                                        <span className="font-medium">
                                            {selectedEmployee.employmentType.replace("_", " ")}
                                        </span>
                                    </div>
                                    <div className="mt-1">
                                        Base Salary:{" "}
                                        <span className="font-bold text-primary">
                                            {selectedEmployee.basicSalary
                                                ? formatCurrency(selectedEmployee.basicSalary, selectedEmployee.currencyCode)
                                                : "Undisclosed"}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Contact Details */}
                            <div className="space-y-2 border-t pt-3">
                                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
                                    Contact & Location
                                </span>
                                <div className="grid gap-3 sm:grid-cols-2">
                                    <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedEmployee.email}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Phone className="h-4 w-4 text-muted-foreground" />
                                        <span>{selectedEmployee.phone || "No phone recorded"}</span>
                                    </div>
                                    {((selectedEmployee.address as any)?.city || (selectedEmployee.address as any)?.state) && (
                                        <div className="flex items-center gap-2 sm:col-span-2">
                                            <MapPin className="h-4 w-4 text-muted-foreground" />
                                            <span>
                                                {[(selectedEmployee.address as any)?.city, (selectedEmployee.address as any)?.state]
                                                    .filter(Boolean)
                                                    .join(", ")}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Emergency Contact */}
                            {(selectedEmployee.emergencyContact as any)?.name && (
                                <div className="space-y-1 border-t pt-3 text-xs">
                                    <span className="font-semibold text-muted-foreground uppercase tracking-wider block">
                                        Emergency Contact
                                    </span>
                                    <div>
                                        {(selectedEmployee.emergencyContact as any)?.name} •{" "}
                                        {(selectedEmployee.emergencyContact as any)?.phone || "No phone"}
                                    </div>
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsViewEmployeeOpen(false)}
                                >
                                    Close
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => {
                                        setIsViewEmployeeOpen(false)
                                        handleOpenEditEmployee(selectedEmployee)
                                    }}
                                >
                                    <Pencil className="mr-1 h-3.5 w-3.5" />
                                    Edit Profile
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
