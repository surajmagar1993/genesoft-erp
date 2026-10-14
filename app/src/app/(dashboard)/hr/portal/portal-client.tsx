"use client"

import { useTaxRegime } from "@/hooks/use-tax-regime"
import React, { useState, useEffect, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    EmployeePortalData,
    clockInEmployee,
    clockOutEmployee,
    applyEmployeeLeave,
    updatePortalTaskStatus,
    getEmployeePortalData
} from "@/app/actions/hr/portal"
import { LeaveType, ProjectTaskStatus, ProjectPriority } from "@prisma/client"
import { format, differenceInBusinessDays } from "date-fns"
import {
    Clock,
    Calendar,
    User,
    CheckCircle2,
    CalendarDays,
    FileText,
    CheckSquare,
    DollarSign,
    LogOut,
    LogIn,
    AlertCircle,
    Building2,
    Briefcase,
    Mail,
    Phone,
    Download,
    Printer,
    Plus,
    Flame,
    Sparkles,
    Shield,
    Users,
    ChevronRight,
    Loader2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import { toast } from "sonner"

interface PortalClientProps {
    initialData: EmployeePortalData
}

export function PortalClient({ initialData }: PortalClientProps) {
    const { formatMoney, regime: moneyRegime } = useTaxRegime()
    const appLocale = moneyRegime?.locale
    const router = useRouter()
    const [data, setData] = useState<EmployeePortalData>(initialData)
    const [activeTab, setActiveTab] = useState("attendance")
    const [isPending, startTransition] = useTransition()

    // Live Digital Clock
    const [currentTime, setCurrentTime] = useState<string>("")
    const [currentDateString, setCurrentDateString] = useState<string>("")

    useEffect(() => {
        const updateClock = () => {
            const now = new Date()
            setCurrentTime(now.toLocaleTimeString(appLocale, { hour: "2-digit", minute: "2-digit", second: "2-digit" }))
            setCurrentDateString(now.toLocaleDateString(appLocale, { weekday: "long", day: "numeric", month: "long", year: "numeric" }))
        }
        updateClock()
        const interval = setInterval(updateClock, 1000)
        return () => clearInterval(interval)
    }, [])

    // Switch Employee (for managers/admins)
    const handleSwitchEmployee = (empId: string) => {
        startTransition(async () => {
            const newData = await getEmployeePortalData(empId)
            if (newData) {
                setData(newData)
                toast.success(`Viewing portal for ${newData.employee.displayName}`)
            }
        })
    }

    // Clock In / Clock Out Handlers
    const [clockNotes, setClockNotes] = useState("")

    const handleClockIn = () => {
        startTransition(async () => {
            const res = await clockInEmployee(data.employee.id, clockNotes || undefined)
            if (res.success) {
                toast.success("Successfully clocked in for today!")
                const updated = await getEmployeePortalData(data.employee.id)
                if (updated) setData(updated)
            } else {
                toast.error(res.error || "Clock In failed")
            }
        })
    }

    const handleClockOut = () => {
        startTransition(async () => {
            const res = await clockOutEmployee(data.employee.id, clockNotes || undefined)
            if (res.success) {
                toast.success("Successfully clocked out for today!")
                const updated = await getEmployeePortalData(data.employee.id)
                if (updated) setData(updated)
            } else {
                toast.error(res.error || "Clock Out failed")
            }
        })
    }

    // Apply Leave Modal State
    const [openLeaveModal, setOpenLeaveModal] = useState(false)
    const [leaveForm, setLeaveForm] = useState({
        type: "CASUAL" as LeaveType,
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(), "yyyy-MM-dd"),
        reason: ""
    })

    const calculatedLeaveDays = Math.max(
        differenceInBusinessDays(new Date(leaveForm.endDate), new Date(leaveForm.startDate)) + 1,
        1
    )

    const handleApplyLeave = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!leaveForm.reason.trim()) {
            toast.error("Please enter a reason for your leave request")
            return
        }

        startTransition(async () => {
            const res = await applyEmployeeLeave({
                employeeId: data.employee.id,
                type: leaveForm.type,
                startDate: leaveForm.startDate,
                endDate: leaveForm.endDate,
                reason: leaveForm.reason
            })

            if (res.success) {
                toast.success("Leave request submitted successfully!")
                setOpenLeaveModal(false)
                setLeaveForm({
                    type: "CASUAL",
                    startDate: format(new Date(), "yyyy-MM-dd"),
                    endDate: format(new Date(), "yyyy-MM-dd"),
                    reason: ""
                })
                const updated = await getEmployeePortalData(data.employee.id)
                if (updated) setData(updated)
            } else {
                toast.error(res.error || "Failed to submit leave request")
            }
        })
    }

    // View Payslip Modal
    const [selectedPayslip, setSelectedPayslip] = useState<EmployeePortalData["payslips"][0] | null>(null)

    // Task Status Change
    const handleTaskStatusChange = (taskId: string, newStatus: ProjectTaskStatus) => {
        startTransition(async () => {
            const res = await updatePortalTaskStatus(taskId, newStatus)
            if (res.success) {
                toast.success(`Task marked as ${newStatus.replace("_", " ")}`)
                const updated = await getEmployeePortalData(data.employee.id)
                if (updated) setData(updated)
            } else {
                toast.error(res.error || "Failed to update task")
            }
        })
    }

    const { employee, todayAttendance, monthlyStats, attendanceHistory, leaveBalances, leaveRequests, payslips, tasks } = data

    const isClockedInToday = Boolean(todayAttendance?.checkIn)
    const isClockedOutToday = Boolean(todayAttendance?.checkOut)

    return (
        <div className="space-y-6 p-6 max-w-7xl mx-auto">
            {/* Top Employee Profile Hero Header */}
            <div className="rounded-xl border bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white p-6 shadow-md relative overflow-hidden">
                <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
                    <Sparkles className="h-48 w-48 text-white" />
                </div>

                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-bold text-2xl shadow-inner">
                            {employee.displayName.charAt(0)}
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-2xl font-bold tracking-tight text-white">{employee.displayName}</h1>
                                <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs">
                                    {employee.status}
                                </Badge>
                                <Badge variant="outline" className="text-white/80 border-white/20 text-xs">
                                    {employee.employeeNumber}
                                </Badge>
                            </div>
                            <p className="text-xs text-indigo-200 mt-1 flex items-center gap-2">
                                <Briefcase className="h-3.5 w-3.5" />
                                <span>{employee.designationTitle || "Staff Member"}</span>
                                <span>•</span>
                                <Building2 className="h-3.5 w-3.5" />
                                <span>{employee.departmentName || "General Operations"}</span>
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-[11px] text-indigo-200/80">
                                <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {employee.email}</span>
                                {employee.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {employee.phone}</span>}
                                {employee.managerName && <span>Reporting to: <strong className="text-white">{employee.managerName}</strong></span>}
                            </div>
                        </div>
                    </div>

                    {/* Manager preview switcher */}
                    {data.allEmployees.length > 1 && (
                        <div className="bg-white/10 backdrop-blur-md rounded-lg p-2 border border-white/15 w-full md:w-auto min-w-[220px]">
                            <Label className="text-[10px] uppercase font-semibold text-indigo-200 tracking-wider block mb-1">
                                Manager View: Switch Employee
                            </Label>
                            <Select
                                value={employee.id}
                                onValueChange={handleSwitchEmployee}
                                disabled={isPending}
                            >
                                <SelectTrigger className="h-8 bg-white/10 border-white/20 text-white text-xs">
                                    <SelectValue placeholder="Select employee..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.allEmployees.map((emp) => (
                                        <SelectItem key={emp.id} value={emp.id} className="text-xs">
                                            {emp.displayName} ({emp.employeeNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}
                </div>
            </div>

            {/* Quick Telemetry Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-blue-500" /> Logged Hours (MTD)
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold font-mono text-foreground">
                            {monthlyStats.totalHours} hrs
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                        {monthlyStats.presentDays} days present this month
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs flex items-center gap-1">
                            <CalendarDays className="h-3.5 w-3.5 text-emerald-500" /> Available Leaves
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold font-mono text-emerald-600">
                            {leaveBalances.casual.available + leaveBalances.sick.available + leaveBalances.earned.available} days
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                        Casual, Sick &amp; Earned pool
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs flex items-center gap-1">
                            <CheckSquare className="h-3.5 w-3.5 text-purple-500" /> Active Tasks
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold font-mono text-foreground">
                            {tasks.filter(t => t.status !== "DONE").length}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                        {tasks.filter(t => t.status === "IN_PROGRESS").length} currently in progress
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="p-4 pb-2">
                        <CardDescription className="text-xs flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-amber-500" /> Last Take-Home
                        </CardDescription>
                        <CardTitle className="text-2xl font-bold font-mono text-foreground">
                            {payslips[0] ? `${formatMoney(Number(payslips[0].netSalary))}` : "—"}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 pt-0 text-[11px] text-muted-foreground">
                        {payslips[0] ? `Period ${payslips[0].periodMonth}/${payslips[0].periodYear}` : "No payslips issued yet"}
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Workspace Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/60 p-1">
                    <TabsTrigger value="attendance" className="flex items-center gap-1.5 text-xs">
                        <Clock className="h-3.5 w-3.5" /> Shift &amp; Clock Desk
                    </TabsTrigger>
                    <TabsTrigger value="leaves" className="flex items-center gap-1.5 text-xs">
                        <CalendarDays className="h-3.5 w-3.5" /> Leave Management ({leaveRequests.length})
                    </TabsTrigger>
                    <TabsTrigger value="payslips" className="flex items-center gap-1.5 text-xs">
                        <FileText className="h-3.5 w-3.5" /> Payslips &amp; Salary ({payslips.length})
                    </TabsTrigger>
                    <TabsTrigger value="tasks" className="flex items-center gap-1.5 text-xs">
                        <CheckSquare className="h-3.5 w-3.5" /> My Deliverables ({tasks.length})
                    </TabsTrigger>
                </TabsList>

                {/* ========================================================================= */}
                {/* TAB 1: ATTENDANCE & LIVE CLOCK DESK */}
                {/* ========================================================================= */}
                <TabsContent value="attendance" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Live Digital Timeclock Widget */}
                        <Card className="border-primary/20 bg-gradient-to-b from-card to-muted/20 shadow-xs">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Clock className="h-4 w-4 text-primary" /> Real-Time Web Timeclock
                                    </span>
                                    <Badge variant="outline" className="text-[10px] animate-pulse text-primary border-primary/30">
                                        LIVE
                                    </Badge>
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    {currentDateString}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                {/* Digital Digits */}
                                <div className="text-center py-4 bg-muted/40 rounded-xl border font-mono">
                                    <span className="text-4xl font-bold tracking-tight text-foreground">
                                        {currentTime || "--:--:--"}
                                    </span>
                                    <p className="text-[11px] text-muted-foreground mt-1">Indian Standard Time (IST)</p>
                                </div>

                                {/* Today's Status */}
                                <div className="space-y-2 text-xs">
                                    <div className="flex justify-between items-center py-1.5 border-b">
                                        <span className="text-muted-foreground">Clock-In Time:</span>
                                        <span className="font-mono font-semibold">
                                            {todayAttendance?.checkIn ? format(new Date(todayAttendance.checkIn), "hh:mm:ss a") : "Not Clocked In"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b">
                                        <span className="text-muted-foreground">Clock-Out Time:</span>
                                        <span className="font-mono font-semibold">
                                            {todayAttendance?.checkOut ? format(new Date(todayAttendance.checkOut), "hh:mm:ss a") : "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5 border-b">
                                        <span className="text-muted-foreground">Working Hours Today:</span>
                                        <span className="font-mono font-bold text-primary">
                                            {todayAttendance?.workingHours ? `${todayAttendance.workingHours} hrs` : "—"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center py-1.5">
                                        <span className="text-muted-foreground">Today&apos;s Status:</span>
                                        <Badge variant={isClockedInToday ? "default" : "outline"} className="text-xs">
                                            {todayAttendance?.status || "PENDING"}
                                        </Badge>
                                    </div>
                                </div>

                                {/* Clock Actions */}
                                <div className="space-y-2 pt-2">
                                    {!isClockedInToday ? (
                                        <Button
                                            onClick={handleClockIn}
                                            disabled={isPending}
                                            className="w-full h-11 text-sm bg-emerald-600 hover:bg-emerald-700 text-white font-semibold gap-2 shadow-xs"
                                        >
                                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogIn className="h-4 w-4" />}
                                            Clock In for Work
                                        </Button>
                                    ) : !isClockedOutToday ? (
                                        <Button
                                            onClick={handleClockOut}
                                            disabled={isPending}
                                            variant="destructive"
                                            className="w-full h-11 text-sm font-semibold gap-2 shadow-xs"
                                        >
                                            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
                                            Clock Out for the Day
                                        </Button>
                                    ) : (
                                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800 rounded-lg text-center text-xs text-emerald-800 dark:text-emerald-300 font-medium">
                                            ✓ Shift completed and logged for today
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Attendance Log */}
                        <div className="lg:col-span-2 space-y-4">
                            <Card>
                                <CardHeader className="p-4 pb-2">
                                    <CardTitle className="text-base flex items-center justify-between">
                                        <span>Attendance Record (Last 30 Days)</span>
                                        <Badge variant="secondary" className="text-xs">
                                            {attendanceHistory.length} Days Recorded
                                        </Badge>
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Daily check-in, check-out, and verified shift durations.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="p-0">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-xs text-left">
                                            <thead className="bg-muted/40 border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                                                <tr>
                                                    <th className="py-2.5 px-4">Date</th>
                                                    <th className="py-2.5 px-4">Clock In</th>
                                                    <th className="py-2.5 px-4">Clock Out</th>
                                                    <th className="py-2.5 px-4 text-center">Hours</th>
                                                    <th className="py-2.5 px-4 text-right">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border/60">
                                                {attendanceHistory.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                                                            No attendance logs found in the past 30 days.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    attendanceHistory.map((rec) => (
                                                        <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                                                            <td className="py-2.5 px-4 font-medium text-foreground">
                                                                {format(new Date(rec.date), "EEE, dd MMM yyyy")}
                                                            </td>
                                                            <td className="py-2.5 px-4 font-mono text-muted-foreground">
                                                                {rec.checkIn ? format(new Date(rec.checkIn), "hh:mm a") : "—"}
                                                            </td>
                                                            <td className="py-2.5 px-4 font-mono text-muted-foreground">
                                                                {rec.checkOut ? format(new Date(rec.checkOut), "hh:mm a") : "—"}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-center font-mono font-semibold">
                                                                {rec.workingHours ? `${rec.workingHours}h` : "—"}
                                                            </td>
                                                            <td className="py-2.5 px-4 text-right">
                                                                <Badge
                                                                    variant={
                                                                        rec.status === "PRESENT"
                                                                            ? "default"
                                                                            : rec.status === "LATE"
                                                                            ? "secondary"
                                                                            : "outline"
                                                                    }
                                                                    className="text-[10px]"
                                                                >
                                                                    {rec.status}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 2: LEAVE MANAGEMENT & BALANCES */}
                {/* ========================================================================= */}
                <TabsContent value="leaves" className="space-y-6">
                    {/* Leave Balances Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        {/* Casual Leave */}
                        <Card className="border-blue-200 dark:border-blue-900 bg-blue-50/40 dark:bg-blue-950/20">
                            <CardHeader className="p-4 pb-2">
                                <CardDescription className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                                    Casual Leave (CL)
                                </CardDescription>
                                <CardTitle className="text-2xl font-bold font-mono text-blue-950 dark:text-blue-100">
                                    {leaveBalances.casual.available} / {leaveBalances.casual.total} Days
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-2">
                                <Progress
                                    value={(leaveBalances.casual.used / leaveBalances.casual.total) * 100}
                                    className="h-2 bg-blue-200 dark:bg-blue-900"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>Used: {leaveBalances.casual.used}d</span>
                                    <span>Pending: {leaveBalances.casual.pending}d</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Sick Leave */}
                        <Card className="border-rose-200 dark:border-rose-900 bg-rose-50/40 dark:bg-rose-950/20">
                            <CardHeader className="p-4 pb-2">
                                <CardDescription className="text-xs text-rose-700 dark:text-rose-300 font-semibold">
                                    Sick / Medical Leave (SL)
                                </CardDescription>
                                <CardTitle className="text-2xl font-bold font-mono text-rose-950 dark:text-rose-100">
                                    {leaveBalances.sick.available} / {leaveBalances.sick.total} Days
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-2">
                                <Progress
                                    value={(leaveBalances.sick.used / leaveBalances.sick.total) * 100}
                                    className="h-2 bg-rose-200 dark:bg-rose-900"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>Used: {leaveBalances.sick.used}d</span>
                                    <span>Pending: {leaveBalances.sick.pending}d</span>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Earned / Privilege Leave */}
                        <Card className="border-purple-200 dark:border-purple-900 bg-purple-50/40 dark:bg-purple-950/20">
                            <CardHeader className="p-4 pb-2">
                                <CardDescription className="text-xs text-purple-700 dark:text-purple-300 font-semibold">
                                    Paid / Earned Leave (PL)
                                </CardDescription>
                                <CardTitle className="text-2xl font-bold font-mono text-purple-950 dark:text-purple-100">
                                    {leaveBalances.earned.available} / {leaveBalances.earned.total} Days
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 pt-1 space-y-2">
                                <Progress
                                    value={(leaveBalances.earned.used / leaveBalances.earned.total) * 100}
                                    className="h-2 bg-purple-200 dark:bg-purple-900"
                                />
                                <div className="flex justify-between text-[10px] text-muted-foreground">
                                    <span>Used: {leaveBalances.earned.used}d</span>
                                    <span>Pending: {leaveBalances.earned.pending}d</span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Leave History with Apply Button */}
                    <Card>
                        <CardHeader className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b">
                            <div>
                                <CardTitle className="text-base">Leave Applications &amp; History</CardTitle>
                                <CardDescription className="text-xs">
                                    Review submitted time-off requests and manager approval status.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setOpenLeaveModal(true)}
                                className="h-8 text-xs gap-1.5"
                            >
                                <Plus className="h-3.5 w-3.5" /> Apply for Leave
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-4">Leave Type</th>
                                            <th className="py-2.5 px-4">Dates</th>
                                            <th className="py-2.5 px-4 text-center">Days</th>
                                            <th className="py-2.5 px-4">Reason</th>
                                            <th className="py-2.5 px-4">Submitted</th>
                                            <th className="py-2.5 px-4 text-right">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {leaveRequests.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                                    No leave applications recorded.
                                                </td>
                                            </tr>
                                        ) : (
                                            leaveRequests.map((req) => (
                                                <tr key={req.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-2.5 px-4 font-semibold text-foreground">
                                                        {req.type}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-medium">
                                                        {format(new Date(req.startDate), "dd MMM yyyy")}
                                                        {req.startDate !== req.endDate && ` - ${format(new Date(req.endDate), "dd MMM yyyy")}`}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center font-mono font-bold">
                                                        {req.days}d
                                                    </td>
                                                    <td className="py-2.5 px-4 text-muted-foreground max-w-xs truncate">
                                                        {req.reason}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-muted-foreground text-[11px]">
                                                        {format(new Date(req.createdAt), "dd MMM yyyy")}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right">
                                                        <Badge
                                                            variant={
                                                                req.status === "APPROVED"
                                                                    ? "default"
                                                                    : req.status === "REJECTED"
                                                                    ? "destructive"
                                                                    : "secondary"
                                                            }
                                                            className="text-[10px]"
                                                        >
                                                            {req.status}
                                                        </Badge>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 3: PAYSLIPS & SALARY */}
                {/* ========================================================================= */}
                <TabsContent value="payslips" className="space-y-4">
                    <Card>
                        <CardHeader className="p-4 border-b">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>Monthly Payslips &amp; Tax Records</span>
                                <Badge variant="secondary" className="text-xs">
                                    {payslips.length} Slips Available
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                View official salary disbursement slips with statutory PF, ESI, and TDS breakdowns.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-4">Slip Number</th>
                                            <th className="py-2.5 px-4">Pay Period</th>
                                            <th className="py-2.5 px-4 text-right">Gross Pay</th>
                                            <th className="py-2.5 px-4 text-right">Total Deductions</th>
                                            <th className="py-2.5 px-4 text-right">Net Take-Home</th>
                                            <th className="py-2.5 px-4 text-center">Status</th>
                                            <th className="py-2.5 px-4 text-right">Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {payslips.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="py-8 text-center text-muted-foreground">
                                                    No monthly payslips issued yet. Once payroll is processed, slips will appear here.
                                                </td>
                                            </tr>
                                        ) : (
                                            payslips.map((slip) => (
                                                <tr key={slip.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-2.5 px-4 font-mono font-semibold text-primary">
                                                        {slip.slipNumber}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-medium text-foreground">
                                                        {format(new Date(slip.periodYear, slip.periodMonth - 1, 1), "MMMM yyyy")}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-mono">
                                                        {formatMoney(Number(slip.totalGross))}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-mono text-rose-600">
                                                        - {formatMoney(Number(slip.totalDeductions))}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right font-mono font-bold text-foreground">
                                                        {formatMoney(Number(slip.netSalary))}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        <Badge variant={slip.status === "PAID" ? "default" : "outline"} className="text-[10px]">
                                                            {slip.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1"
                                                            onClick={() => setSelectedPayslip(slip)}
                                                        >
                                                            <FileText className="h-3 w-3" /> View Slip
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ========================================================================= */}
                {/* TAB 4: MY DELIVERABLES & TASKS */}
                {/* ========================================================================= */}
                <TabsContent value="tasks" className="space-y-4">
                    <Card>
                        <CardHeader className="p-4 border-b">
                            <CardTitle className="text-base flex items-center justify-between">
                                <span>Assigned Project Deliverables</span>
                                <Badge variant="secondary" className="text-xs">
                                    {tasks.length} Total Tasks
                                </Badge>
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Deliverables and backlog items assigned to you across active client contracts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/40 border-b text-muted-foreground uppercase text-[10px] tracking-wider">
                                        <tr>
                                            <th className="py-2.5 px-4">Task Code</th>
                                            <th className="py-2.5 px-4">Title</th>
                                            <th className="py-2.5 px-4">Project</th>
                                            <th className="py-2.5 px-4">Due Date</th>
                                            <th className="py-2.5 px-4 text-center">Priority</th>
                                            <th className="py-2.5 px-4 text-right">Status Action</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/60">
                                        {tasks.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} className="py-8 text-center text-muted-foreground">
                                                    No project tasks currently assigned.
                                                </td>
                                            </tr>
                                        ) : (
                                            tasks.map((task) => (
                                                <tr key={task.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="py-2.5 px-4 font-mono font-semibold text-primary">
                                                        {task.taskCode}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-medium text-foreground">
                                                        {task.title}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-muted-foreground">
                                                        <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded mr-1.5">
                                                            {task.projectCode}
                                                        </span>
                                                        {task.projectName}
                                                    </td>
                                                    <td className="py-2.5 px-4 font-medium text-muted-foreground">
                                                        {task.dueDate ? format(new Date(task.dueDate), "dd MMM yyyy") : "—"}
                                                    </td>
                                                    <td className="py-2.5 px-4 text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] ${
                                                                task.priority === "HIGH" || task.priority === "URGENT"
                                                                    ? "border-rose-500 text-rose-600"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {task.priority}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-2.5 px-4 text-right">
                                                        <Select
                                                            value={task.status}
                                                            onValueChange={(val: ProjectTaskStatus) => handleTaskStatusChange(task.id, val)}
                                                            disabled={isPending}
                                                        >
                                                            <SelectTrigger className="h-7 w-28 text-[11px] ml-auto">
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
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Apply for Leave Modal */}
            <Dialog open={openLeaveModal} onOpenChange={setOpenLeaveModal}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarDays className="h-5 w-5 text-primary" /> Apply for Leave
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Submit a time-off request for manager approval.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleApplyLeave} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Leave Type</Label>
                            <Select
                                value={leaveForm.type}
                                onValueChange={(val: LeaveType) => setLeaveForm({ ...leaveForm, type: val })}
                            >
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CASUAL">Casual Leave (CL) — {leaveBalances.casual.available}d remaining</SelectItem>
                                    <SelectItem value="SICK">Sick Leave (SL) — {leaveBalances.sick.available}d remaining</SelectItem>
                                    <SelectItem value="ANNUAL">Earned / Annual Leave (EL) — {leaveBalances.earned.available}d remaining</SelectItem>
                                    <SelectItem value="UNPAID">Leave Without Pay (LWP)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Start Date</Label>
                                <Input
                                    type="date"
                                    value={leaveForm.startDate}
                                    onChange={(e) => setLeaveForm({ ...leaveForm, startDate: e.target.value })}
                                    className="text-xs h-9"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">End Date</Label>
                                <Input
                                    type="date"
                                    value={leaveForm.endDate}
                                    onChange={(e) => setLeaveForm({ ...leaveForm, endDate: e.target.value })}
                                    className="text-xs h-9"
                                    required
                                />
                            </div>
                        </div>

                        <div className="p-2.5 bg-muted/40 rounded-lg text-xs flex justify-between items-center text-muted-foreground">
                            <span>Calculated Business Days:</span>
                            <span className="font-bold text-foreground font-mono">{calculatedLeaveDays} Day(s)</span>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Reason for Leave</Label>
                            <Textarea
                                placeholder="State the reason for taking time off..."
                                value={leaveForm.reason}
                                onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                                className="text-xs min-h-[80px]"
                                required
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => setOpenLeaveModal(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                size="sm"
                                disabled={isPending}
                                className="gap-1.5"
                            >
                                {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Submit Application
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* View Payslip Dialog */}
            {selectedPayslip && (
                <Dialog open={Boolean(selectedPayslip)} onOpenChange={(open) => !open && setSelectedPayslip(null)}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader className="border-b pb-3">
                            <div className="flex justify-between items-center pr-6">
                                <div>
                                    <DialogTitle className="text-base font-bold">
                                        Salary Payslip #{selectedPayslip.slipNumber}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs">
                                        Pay Period: {format(new Date(selectedPayslip.periodYear, selectedPayslip.periodMonth - 1, 1), "MMMM yyyy")}
                                    </DialogDescription>
                                </div>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => window.print()}
                                    className="h-8 text-xs gap-1.5"
                                >
                                    <Printer className="h-3.5 w-3.5" /> Print
                                </Button>
                            </div>
                        </DialogHeader>

                        <div className="space-y-4 py-2 text-xs font-sans">
                            {/* Employee Info Header */}
                            <div className="grid grid-cols-2 p-3 bg-muted/40 rounded-lg gap-2 text-slate-700 dark:text-slate-300">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Employee Name</p>
                                    <p className="font-bold text-foreground text-sm">{employee.displayName}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">ID: {employee.employeeNumber}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Department &amp; Title</p>
                                    <p className="font-medium text-foreground">{employee.designationTitle}</p>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">{employee.departmentName}</p>
                                </div>
                            </div>

                            {/* Earnings & Deductions Split */}
                            <div className="grid grid-cols-2 gap-4">
                                {/* Earnings */}
                                <div className="p-3 border rounded-lg space-y-2">
                                    <p className="font-bold text-emerald-700 dark:text-emerald-400 uppercase text-[10px] tracking-wider border-b pb-1">
                                        Earnings
                                    </p>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Basic Salary</span>
                                            <span className="font-mono font-medium">{formatMoney(Number(selectedPayslip.basicSalary))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">House Rent (HRA)</span>
                                            <span className="font-mono font-medium">{formatMoney(Number(selectedPayslip.hra))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Special Allowance</span>
                                            <span className="font-mono font-medium">{formatMoney(Number(selectedPayslip.specialAllowance))}</span>
                                        </div>
                                        <div className="pt-2 border-t flex justify-between font-bold text-emerald-700 dark:text-emerald-400">
                                            <span>Total Gross</span>
                                            <span className="font-mono">{formatMoney(Number(selectedPayslip.totalGross))}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Deductions */}
                                <div className="p-3 border rounded-lg space-y-2">
                                    <p className="font-bold text-rose-700 dark:text-rose-400 uppercase text-[10px] tracking-wider border-b pb-1">
                                        Statutory Deductions
                                    </p>
                                    <div className="space-y-1.5 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Provident Fund (PF)</span>
                                            <span className="font-mono font-medium">{formatMoney(Number(selectedPayslip.pfEmployee))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Employee ESI</span>
                                            <span className="font-mono font-medium">{formatMoney(Number(selectedPayslip.esiEmployee))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Professional Tax</span>
                                            <span className="font-mono font-medium">{formatMoney(Number(selectedPayslip.professionalTax))}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Income Tax (TDS)</span>
                                            <span className="font-mono font-medium">{formatMoney(Number(selectedPayslip.tdsDeduction))}</span>
                                        </div>
                                        <div className="pt-2 border-t flex justify-between font-bold text-rose-700 dark:text-rose-400">
                                            <span>Total Deductions</span>
                                            <span className="font-mono">{formatMoney(Number(selectedPayslip.totalDeductions))}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Net Take-Home Callout */}
                            <div className="p-4 rounded-lg bg-primary/10 border border-primary/30 flex justify-between items-baseline">
                                <span className="font-bold text-sm text-foreground uppercase tracking-wider">Net Salary Payable</span>
                                <span className="text-2xl font-black font-mono text-primary">
                                    {formatMoney(Number(selectedPayslip.netSalary))}
                                </span>
                            </div>

                            <p className="text-[10px] text-muted-foreground italic text-center">
                                This is a computer-generated salary payslip authorized by the organization&apos;s payroll department.
                            </p>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
