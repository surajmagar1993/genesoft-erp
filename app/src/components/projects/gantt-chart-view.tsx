"use client"

import { useState, useMemo, useRef, useEffect } from "react"
import {
    Calendar as CalendarIcon,
    ChevronLeft,
    ChevronRight,
    Search,
    Filter,
    Download,
    ZoomIn,
    ZoomOut,
    CheckCircle2,
    Clock,
    AlertTriangle,
    Layers,
    Milestone as MilestoneIcon,
    Users,
    Sparkles,
    MoveRight,
    SlidersHorizontal,
    Flag,
    Check,
    X,
    CalendarDays,
    Flame,
    RefreshCw
} from "lucide-react"
import {
    format,
    addDays,
    differenceInDays,
    differenceInCalendarDays,
    startOfDay,
    endOfDay,
    isBefore,
    isAfter,
    isToday,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    eachWeekOfInterval,
    eachMonthOfInterval,
    startOfMonth,
    endOfMonth,
    addMonths,
    subDays
} from "date-fns"
import Papa from "papaparse"
import { toast } from "sonner"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import {
    ProjectRecord,
    ProjectTaskRecord,
    ProjectMilestoneRecord,
    ProjectMemberRecord
} from "@/app/actions/projects"
import { ProjectTaskStatus, ProjectPriority, MilestoneStatus } from "@prisma/client"

type ZoomScale = "DAY" | "WEEK" | "MONTH"

interface GanttChartViewProps {
    project?: ProjectRecord | null
    tasks: ProjectTaskRecord[]
    milestones: ProjectMilestoneRecord[]
    members: ProjectMemberRecord[]
    onUpdateTask?: (taskId: string, input: {
        startDate?: string
        dueDate?: string
        status?: ProjectTaskStatus
        priority?: ProjectPriority
        milestoneId?: string | null
    }) => Promise<{ success: boolean; error?: string }>
}

export function GanttChartView({
    project,
    tasks,
    milestones,
    members,
    onUpdateTask
}: GanttChartViewProps) {
    const timelineContainerRef = useRef<HTMLDivElement>(null)

    // View Options
    const [zoomScale, setZoomScale] = useState<ZoomScale>("WEEK")
    const [showCriticalPath, setShowCriticalPath] = useState(false)
    const [filterMilestone, setFilterMilestone] = useState<string>("all")
    const [filterStatus, setFilterStatus] = useState<string>("all")
    const [filterAssignee, setFilterAssignee] = useState<string>("all")
    const [searchQuery, setSearchQuery] = useState("")

    // Reschedule Task Modal
    const [rescheduleTask, setRescheduleTask] = useState<ProjectTaskRecord | null>(null)
    const [rescheduleForm, setRescheduleForm] = useState({
        startDate: "",
        dueDate: "",
        status: "TODO" as ProjectTaskStatus,
        priority: "MEDIUM" as ProjectPriority,
        milestoneId: ""
    })
    const [isSaving, setIsSaving] = useState(false)

    // -------------------------------------------------------------
    // Filtering Tasks
    // -------------------------------------------------------------
    const filteredTasks = useMemo(() => {
        return tasks.filter((t) => {
            const matchesSearch =
                !searchQuery.trim() ||
                t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.taskCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (t.assignedEmployeeName && t.assignedEmployeeName.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesMilestone =
                filterMilestone === "all" ||
                (filterMilestone === "none" ? !t.milestoneId : t.milestoneId === filterMilestone)

            const matchesStatus = filterStatus === "all" || t.status === filterStatus
            const matchesAssignee = filterAssignee === "all" || t.assignedEmployeeId === filterAssignee

            return matchesSearch && matchesMilestone && matchesStatus && matchesAssignee
        })
    }, [tasks, searchQuery, filterMilestone, filterStatus, filterAssignee])

    // Grouping / Sorting: By Milestone then start date
    const sortedTasks = useMemo(() => {
        return [...filteredTasks].sort((a, b) => {
            const aDate = a.startDate ? new Date(a.startDate).getTime() : 0
            const bDate = b.startDate ? new Date(b.startDate).getTime() : 0
            return aDate - bDate
        })
    }, [filteredTasks])

    // -------------------------------------------------------------
    // Timeline Horizon & Grid Calculations
    // -------------------------------------------------------------
    const { timelineStart, timelineEnd, totalDays } = useMemo(() => {
        const today = startOfDay(new Date())
        let minDate = subDays(today, 7)
        let maxDate = addDays(today, 30)

        // Check project dates
        if (project?.startDate) {
            const pStart = startOfDay(new Date(project.startDate))
            if (isBefore(pStart, minDate)) minDate = pStart
        }
        if (project?.targetEndDate) {
            const pEnd = endOfDay(new Date(project.targetEndDate))
            if (isAfter(pEnd, maxDate)) maxDate = pEnd
        }

        // Check tasks dates
        tasks.forEach((t) => {
            if (t.startDate) {
                const d = startOfDay(new Date(t.startDate))
                if (isBefore(d, minDate)) minDate = d
            }
            if (t.dueDate) {
                const d = endOfDay(new Date(t.dueDate))
                if (isAfter(d, maxDate)) maxDate = d
            }
        })

        // Check milestones
        milestones.forEach((m) => {
            if (m.dueDate) {
                const d = endOfDay(new Date(m.dueDate))
                if (isAfter(d, maxDate)) maxDate = d
                if (isBefore(d, minDate)) minDate = startOfDay(new Date(m.dueDate))
            }
        })

        // Pad dates for aesthetic breathing room
        minDate = subDays(minDate, 3)
        maxDate = addDays(maxDate, 7)

        const total = Math.max(differenceInCalendarDays(maxDate, minDate) + 1, 14)
        return { timelineStart: minDate, timelineEnd: maxDate, totalDays: total }
    }, [project, tasks, milestones])

    // Column width settings per zoom scale
    const dayColumnWidth = useMemo(() => {
        if (zoomScale === "DAY") return 44
        if (zoomScale === "WEEK") return 18
        return 6
    }, [zoomScale])

    const totalCanvasWidth = totalDays * dayColumnWidth

    // Column headers (Days or Weeks or Months)
    const headerIntervals = useMemo(() => {
        if (zoomScale === "DAY") {
            return eachDayOfInterval({ start: timelineStart, end: timelineEnd }).map((day) => ({
                date: day,
                label: format(day, "d"),
                subLabel: format(day, "EEE"),
                width: dayColumnWidth,
                isToday: isToday(day),
                isWeekend: day.getDay() === 0 || day.getDay() === 6
            }))
        } else if (zoomScale === "WEEK") {
            const weeks = eachWeekOfInterval({ start: timelineStart, end: timelineEnd }, { weekStartsOn: 1 })
            return weeks.map((wStart) => {
                const wEnd = addDays(wStart, 6)
                const isCurrentWeek = isBefore(wStart, new Date()) && isAfter(wEnd, new Date())
                return {
                    date: wStart,
                    label: `Wk ${format(wStart, "w")}`,
                    subLabel: format(wStart, "MMM d"),
                    width: dayColumnWidth * 7,
                    isToday: isCurrentWeek,
                    isWeekend: false
                }
            })
        } else {
            const months = eachMonthOfInterval({ start: timelineStart, end: timelineEnd })
            return months.map((mStart) => {
                const mEnd = endOfMonth(mStart)
                const daysInMonth = differenceInCalendarDays(mEnd, mStart) + 1
                return {
                    date: mStart,
                    label: format(mStart, "MMMM yyyy"),
                    subLabel: `${daysInMonth} days`,
                    width: dayColumnWidth * daysInMonth,
                    isToday: false,
                    isWeekend: false
                }
            })
        }
    }, [zoomScale, timelineStart, timelineEnd, dayColumnWidth])

    // Today marker position
    const todayOffset = useMemo(() => {
        const today = new Date()
        if (isBefore(today, timelineStart) || isAfter(today, timelineEnd)) return null
        const days = differenceInCalendarDays(today, timelineStart)
        return days * dayColumnWidth
    }, [timelineStart, timelineEnd, dayColumnWidth])

    // Scroll to today on mount
    useEffect(() => {
        if (todayOffset !== null && timelineContainerRef.current) {
            timelineContainerRef.current.scrollLeft = Math.max(0, todayOffset - 250)
        }
    }, [todayOffset, zoomScale])

    // Jump to today button
    const handleScrollToToday = () => {
        if (todayOffset !== null && timelineContainerRef.current) {
            timelineContainerRef.current.scrollTo({
                left: Math.max(0, todayOffset - 250),
                behavior: "smooth"
            })
        }
    }

    // -------------------------------------------------------------
    // Task Bar Position Math
    // -------------------------------------------------------------
    const getTaskBarLayout = (t: ProjectTaskRecord) => {
        const defaultStart = t.startDate ? new Date(t.startDate) : (t.dueDate ? subDays(new Date(t.dueDate), 2) : new Date())
        const defaultEnd = t.dueDate ? new Date(t.dueDate) : addDays(defaultStart, 2)

        const startDiff = differenceInCalendarDays(defaultStart, timelineStart)
        const duration = Math.max(differenceInCalendarDays(defaultEnd, defaultStart) + 1, 1)

        const left = Math.max(0, startDiff * dayColumnWidth)
        const width = Math.max(duration * dayColumnWidth, 34) // minimum 34px for clickability

        return { left, width, duration, defaultStart, defaultEnd }
    }

    // Critical Path Calculation: Identifies tasks that terminate near the project horizon
    const criticalTaskIds = useMemo(() => {
        if (!showCriticalPath) return new Set<string>()
        const set = new Set<string>()

        // Tasks that end within 3 days of the latest task end date and are not done
        const endDates = tasks
            .filter((t) => t.dueDate && t.status !== "DONE")
            .map((t) => new Date(t.dueDate!).getTime())

        if (endDates.length === 0) return set
        const maxEnd = Math.max(...endDates)

        tasks.forEach((t) => {
            if (t.dueDate && t.status !== "DONE") {
                const diff = Math.abs(maxEnd - new Date(t.dueDate).getTime()) / (1000 * 60 * 60 * 24)
                if (diff <= 3) {
                    set.add(t.id)
                }
            }
        })
        return set
    }, [tasks, showCriticalPath])

    // -------------------------------------------------------------
    // Quick Reschedule Handlers
    // -------------------------------------------------------------
    const handleOpenReschedule = (task: ProjectTaskRecord) => {
        setRescheduleTask(task)
        setRescheduleForm({
            startDate: task.startDate ? format(new Date(task.startDate), "yyyy-MM-dd") : "",
            dueDate: task.dueDate ? format(new Date(task.dueDate), "yyyy-MM-dd") : "",
            status: task.status,
            priority: task.priority,
            milestoneId: task.milestoneId || "none"
        })
    }

    const handleSaveReschedule = async () => {
        if (!rescheduleTask || !onUpdateTask) return
        setIsSaving(true)
        try {
            const res = await onUpdateTask(rescheduleTask.id, {
                startDate: rescheduleForm.startDate || undefined,
                dueDate: rescheduleForm.dueDate || undefined,
                status: rescheduleForm.status,
                priority: rescheduleForm.priority,
                milestoneId: rescheduleForm.milestoneId === "none" ? null : rescheduleForm.milestoneId
            })
            if (res.success) {
                toast.success(`Rescheduled task "${rescheduleTask.taskCode}"`)
                setRescheduleTask(null)
            } else {
                toast.error(res.error || "Failed to update task")
            }
        } catch (e: any) {
            toast.error(e.message || "Failed to update task")
        } finally {
            setIsSaving(false)
        }
    }

    const handleQuickPostpone = (daysToAdd: number) => {
        if (!rescheduleForm.dueDate) {
            const todayStr = format(new Date(), "yyyy-MM-dd")
            setRescheduleForm({
                ...rescheduleForm,
                startDate: todayStr,
                dueDate: format(addDays(new Date(), daysToAdd), "yyyy-MM-dd")
            })
            return
        }
        const currentDue = new Date(rescheduleForm.dueDate)
        const newDue = addDays(currentDue, daysToAdd)
        setRescheduleForm({
            ...rescheduleForm,
            dueDate: format(newDue, "yyyy-MM-dd")
        })
    }

    // -------------------------------------------------------------
    // CSV Schedule Export
    // -------------------------------------------------------------
    const exportScheduleCsv = () => {
        try {
            const rows = sortedTasks.map((t) => ({
                "Task Code": t.taskCode,
                "Title": t.title,
                "Project": t.projectName,
                "Milestone": t.milestoneTitle || "None",
                "Assignee": t.assignedEmployeeName || "Unassigned",
                "Status": t.status,
                "Priority": t.priority,
                "Start Date": t.startDate ? format(new Date(t.startDate), "yyyy-MM-dd") : "Not Set",
                "Due Date": t.dueDate ? format(new Date(t.dueDate), "yyyy-MM-dd") : "Not Set",
                "Estimated Hours": t.estimatedHours || 0,
                "Actual Hours": t.actualHours || 0
            }))
            const csv = Papa.unparse(rows)
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `gantt_schedule_${format(new Date(), "yyyyMMdd")}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success("Schedule exported to CSV")
        } catch (e) {
            toast.error("Failed to export schedule CSV")
        }
    }

    return (
        <div className="space-y-4">
            {/* Control Bar */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-sm">
                {/* Search & Filter Group */}
                <div className="flex flex-wrap items-center gap-2 flex-1">
                    <div className="relative w-full sm:w-60">
                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                        <Input
                            placeholder="Filter timeline tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-8 text-xs"
                        />
                    </div>

                    <Select value={filterMilestone} onValueChange={setFilterMilestone}>
                        <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
                            <SelectValue placeholder="All Milestones" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Milestones</SelectItem>
                            <SelectItem value="none">Unassigned</SelectItem>
                            {milestones.map((m) => (
                                <SelectItem key={m.id} value={m.id}>
                                    {m.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-full sm:w-32 h-8 text-xs">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="BACKLOG">Backlog</SelectItem>
                            <SelectItem value="TODO">To Do</SelectItem>
                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                            <SelectItem value="IN_REVIEW">In Review</SelectItem>
                            <SelectItem value="DONE">Done</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={filterAssignee} onValueChange={setFilterAssignee}>
                        <SelectTrigger className="w-full sm:w-36 h-8 text-xs">
                            <SelectValue placeholder="All Assignees" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Assignees</SelectItem>
                            {members.map((m) => (
                                <SelectItem key={m.employeeId} value={m.employeeId}>
                                    {m.employeeName}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* View Controls Group */}
                <div className="flex items-center gap-2 self-end lg:self-auto">
                    {/* Zoom Scales */}
                    <div className="flex items-center bg-muted p-0.5 rounded-lg border text-xs">
                        <Button
                            size="sm"
                            variant={zoomScale === "DAY" ? "default" : "ghost"}
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setZoomScale("DAY")}
                        >
                            Day
                        </Button>
                        <Button
                            size="sm"
                            variant={zoomScale === "WEEK" ? "default" : "ghost"}
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setZoomScale("WEEK")}
                        >
                            Week
                        </Button>
                        <Button
                            size="sm"
                            variant={zoomScale === "MONTH" ? "default" : "ghost"}
                            className="h-7 px-2.5 text-xs"
                            onClick={() => setZoomScale("MONTH")}
                        >
                            Month
                        </Button>
                    </div>

                    {/* Critical Path Toggle */}
                    <Button
                        size="sm"
                        variant={showCriticalPath ? "default" : "outline"}
                        className={`h-8 text-xs gap-1.5 ${
                            showCriticalPath ? "bg-amber-600 hover:bg-amber-700 text-white" : ""
                        }`}
                        onClick={() => setShowCriticalPath(!showCriticalPath)}
                        title="Highlight tasks determining project delivery date"
                    >
                        <Flame className="h-3.5 w-3.5" />
                        Critical Path
                    </Button>

                    {/* Jump to Today */}
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={handleScrollToToday}
                        className="h-8 text-xs gap-1"
                        title="Center timeline on today"
                    >
                        <CalendarDays className="h-3.5 w-3.5 text-indigo-500" />
                        Today
                    </Button>

                    {/* CSV Export */}
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={exportScheduleCsv}
                        className="h-8 px-2 text-xs"
                        title="Export timeline schedule"
                    >
                        <Download className="h-3.5 w-3.5" />
                    </Button>
                </div>
            </div>

            {/* Milestones Delivery Ribbon (if milestones exist) */}
            {milestones.length > 0 && (
                <div className="flex items-center gap-3 overflow-x-auto p-2 bg-muted/20 rounded-lg border text-xs">
                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider whitespace-nowrap flex items-center gap-1">
                        <MilestoneIcon className="h-3.5 w-3.5 text-indigo-500" />
                        Key Deliverables:
                    </span>
                    <div className="flex items-center gap-2">
                        {milestones.map((m) => (
                            <Badge
                                key={m.id}
                                variant="secondary"
                                className="gap-1.5 py-1 px-2.5 bg-card border font-normal shadow-2xs whitespace-nowrap cursor-pointer hover:border-indigo-400 transition-colors"
                                onClick={() => setFilterMilestone(m.id)}
                            >
                                <span className={`h-2 w-2 rounded-full ${
                                    m.status === "COMPLETED" ? "bg-emerald-500" : m.status === "IN_PROGRESS" ? "bg-blue-500" : "bg-amber-500"
                                }`} />
                                <span className="font-semibold text-foreground">{m.title}</span>
                                {m.dueDate && (
                                    <span className="text-[10px] text-muted-foreground">
                                        ({format(new Date(m.dueDate), "MMM d")})
                                    </span>
                                )}
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Main Split Gantt Canvas (Sticky WBS Table Left + Synchronized Timeline Grid Right) */}
            <Card className="shadow-sm overflow-hidden border">
                <div className="flex flex-row overflow-hidden max-h-[680px]">
                    {/* LEFT PANEL: Sticky Work Breakdown Structure (WBS) Table */}
                    <div className="w-[320px] flex-shrink-0 border-r bg-card z-10 flex flex-col shadow-xs">
                        {/* WBS Header */}
                        <div className="h-12 border-b px-4 flex items-center justify-between bg-muted/40 font-semibold text-xs text-muted-foreground">
                            <span>Task / Work Item</span>
                            <span>Assignee</span>
                        </div>

                        {/* WBS Body Rows */}
                        <div className="overflow-y-auto divide-y text-xs flex-1">
                            {sortedTasks.length === 0 ? (
                                <div className="p-8 text-center text-muted-foreground">
                                    No tasks match filters.
                                </div>
                            ) : (
                                sortedTasks.map((t) => {
                                    const isCritical = criticalTaskIds.has(t.id)
                                    return (
                                        <div
                                            key={t.id}
                                            className={`h-11 px-3 flex items-center justify-between hover:bg-muted/40 transition-colors group cursor-pointer ${
                                                isCritical ? "bg-amber-50/40 dark:bg-amber-950/20" : ""
                                            }`}
                                            onClick={() => handleOpenReschedule(t)}
                                            title="Click to reschedule task"
                                        >
                                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                                <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                                                    t.status === "DONE"
                                                        ? "bg-emerald-500"
                                                        : t.status === "IN_PROGRESS"
                                                        ? "bg-blue-500"
                                                        : t.status === "IN_REVIEW"
                                                        ? "bg-purple-500"
                                                        : t.status === "TODO"
                                                        ? "bg-amber-500"
                                                        : "bg-slate-400"
                                                }`} />
                                                <div className="truncate">
                                                    <span className="font-mono text-[10px] text-muted-foreground mr-1">
                                                        {t.taskCode}
                                                    </span>
                                                    <span className="font-medium text-foreground text-xs">
                                                        {t.title}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex-shrink-0 text-right">
                                                {t.assignedEmployeeName ? (
                                                    <Badge variant="outline" className="text-[10px] py-0 px-1 font-normal">
                                                        {t.assignedEmployeeName.split(" ")[0]}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-[10px] text-muted-foreground/60 italic">
                                                        Unassigned
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>

                    {/* RIGHT PANEL: Interactive Timeline View Canvas */}
                    <div
                        ref={timelineContainerRef}
                        className="flex-1 overflow-x-auto overflow-y-auto relative bg-background/50 select-none"
                    >
                        <div style={{ width: `${totalCanvasWidth}px`, minWidth: "100%" }} className="relative">
                            {/* Header: Dates / Weeks / Months Interval Strip */}
                            <div className="h-12 border-b bg-muted/30 sticky top-0 z-20 flex">
                                {headerIntervals.map((interval, idx) => (
                                    <div
                                        key={idx}
                                        style={{ width: `${interval.width}px` }}
                                        className={`flex-shrink-0 border-r px-1 flex flex-col items-center justify-center text-[10px] transition-colors ${
                                            interval.isToday
                                                ? "bg-indigo-500/10 font-bold text-indigo-600 dark:text-indigo-400"
                                                : interval.isWeekend
                                                ? "bg-muted/50 text-muted-foreground"
                                                : "text-muted-foreground"
                                        }`}
                                    >
                                        <span className="font-semibold leading-tight">{interval.label}</span>
                                        <span className="text-[9px] opacity-70 leading-tight">{interval.subLabel}</span>
                                    </div>
                                ))}
                            </div>

                            {/* Today Vertical Guide Line */}
                            {todayOffset !== null && (
                                <div
                                    style={{ left: `${todayOffset}px` }}
                                    className="absolute top-0 bottom-0 w-[2px] bg-indigo-500 z-10 pointer-events-none shadow-[0_0_8px_rgba(99,102,241,0.6)]"
                                >
                                    <div className="sticky top-12 -ml-3 px-1.5 py-0.5 rounded bg-indigo-600 text-white text-[9px] font-bold shadow-xs whitespace-nowrap">
                                        Today
                                    </div>
                                </div>
                            )}

                            {/* Timeline Rows (matching WBS rows 1:1) */}
                            <div className="divide-y relative">
                                {sortedTasks.map((t) => {
                                    const { left, width, duration, defaultStart, defaultEnd } = getTaskBarLayout(t)
                                    const isCritical = criticalTaskIds.has(t.id)

                                    return (
                                        <div
                                            key={t.id}
                                            className="h-11 relative flex items-center hover:bg-muted/20 transition-colors"
                                        >
                                            {/* Column Vertical Background Grid Lines */}
                                            <div className="absolute inset-0 flex pointer-events-none">
                                                {headerIntervals.map((interval, idx) => (
                                                    <div
                                                        key={idx}
                                                        style={{ width: `${interval.width}px` }}
                                                        className={`flex-shrink-0 border-r h-full ${
                                                            interval.isWeekend ? "bg-muted/15" : ""
                                                        }`}
                                                    />
                                                ))}
                                            </div>

                                            {/* Milestone Deliverable Diamond Marker (if task is tied to a milestone) */}
                                            {t.milestoneTitle && t.dueDate && (
                                                <div
                                                    style={{ left: `${left + width - 6}px` }}
                                                    className="absolute z-10 pointer-events-none -top-1"
                                                    title={`Milestone: ${t.milestoneTitle}`}
                                                >
                                                    <div className="h-3 w-3 rotate-45 bg-indigo-600 border border-white shadow-xs" />
                                                </div>
                                            )}

                                            {/* Task Bar Pill */}
                                            <div
                                                style={{ left: `${left}px`, width: `${width}px` }}
                                                className={`absolute h-7 rounded-md shadow-xs flex items-center px-2 z-1 cursor-pointer transition-all duration-150 hover:brightness-110 hover:shadow-md group ${
                                                    isCritical ? "ring-2 ring-amber-500 ring-offset-1" : ""
                                                } ${
                                                    t.status === "DONE"
                                                        ? "bg-emerald-600 text-white"
                                                        : t.status === "IN_PROGRESS"
                                                        ? "bg-blue-600 text-white"
                                                        : t.status === "IN_REVIEW"
                                                        ? "bg-purple-600 text-white"
                                                        : t.status === "TODO"
                                                        ? "bg-amber-600 text-white"
                                                        : "bg-slate-700 text-white dark:bg-slate-800"
                                                }`}
                                                onClick={() => handleOpenReschedule(t)}
                                                title={`${t.taskCode}: ${t.title} (${duration} days: ${format(defaultStart, "MMM d")} - ${format(defaultEnd, "MMM d")})`}
                                            >
                                                {/* Progress fill bar inside */}
                                                {t.status === "DONE" ? (
                                                    <div className="absolute inset-0 bg-white/15 rounded-md pointer-events-none" />
                                                ) : t.estimatedHours && Number(t.estimatedHours) > 0 ? (
                                                    <div
                                                        style={{
                                                            width: `${Math.min(
                                                                (Number(t.actualHours) / Number(t.estimatedHours)) * 100,
                                                                100
                                                            )}%`
                                                        }}
                                                        className="absolute inset-y-0 left-0 bg-white/20 rounded-l-md pointer-events-none"
                                                    />
                                                ) : null}

                                                {/* Bar content */}
                                                <div className="relative z-1 flex items-center justify-between w-full overflow-hidden gap-1 text-[11px]">
                                                    <span className="font-semibold truncate font-mono text-[10px]">
                                                        {t.taskCode} {width > 80 ? t.title : ""}
                                                    </span>

                                                    {width > 110 && (
                                                        <span className="text-[9px] opacity-80 whitespace-nowrap ml-1">
                                                            {duration}d
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Bottom Legend Ribbon */}
                <div className="p-3 border-t bg-muted/30 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-4 flex-wrap">
                        <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-emerald-600" />
                            <span className="text-muted-foreground">Done</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-blue-600" />
                            <span className="text-muted-foreground">In Progress</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-purple-600" />
                            <span className="text-muted-foreground">Review</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-slate-700 dark:bg-slate-800" />
                            <span className="text-muted-foreground">To Do</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <span className="h-3 w-3 rounded bg-rose-600" />
                            <span className="text-muted-foreground">Blocked</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="h-2.5 w-2.5 rotate-45 bg-indigo-600" />
                            <span className="text-muted-foreground">Milestone Target</span>
                        </div>
                        {showCriticalPath && (
                            <div className="flex items-center gap-1.5">
                                <span className="h-3 w-3 rounded ring-2 ring-amber-500 bg-transparent" />
                                <span className="text-amber-600 dark:text-amber-400 font-semibold">Critical Path</span>
                            </div>
                        )}
                    </div>

                    <div className="text-muted-foreground text-[11px]">
                        Showing <span className="font-semibold text-foreground">{sortedTasks.length}</span> scheduled tasks across <span className="font-semibold text-foreground">{totalDays}</span> days horizon
                    </div>
                </div>
            </Card>

            {/* ========================================================================= */}
            {/* DIALOG: Quick Reschedule Task */}
            {/* ========================================================================= */}
            <Dialog open={!!rescheduleTask} onOpenChange={(open) => !open && setRescheduleTask(null)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <CalendarIcon className="h-5 w-5 text-indigo-600" />
                            Reschedule Task ({rescheduleTask?.taskCode})
                        </DialogTitle>
                        <DialogDescription className="truncate">
                            {rescheduleTask?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {rescheduleTask && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Start Date</Label>
                                    <Input
                                        type="date"
                                        value={rescheduleForm.startDate}
                                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, startDate: e.target.value })}
                                        className="text-xs"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Due Date</Label>
                                    <Input
                                        type="date"
                                        value={rescheduleForm.dueDate}
                                        onChange={(e) => setRescheduleForm({ ...rescheduleForm, dueDate: e.target.value })}
                                        className="text-xs"
                                    />
                                </div>
                            </div>

                            {/* Quick 1-Click Postpone Buttons */}
                            <div className="space-y-1.5">
                                <Label className="text-[11px] text-muted-foreground">Quick Date Adjustments</Label>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs flex-1"
                                        onClick={() => handleQuickPostpone(3)}
                                    >
                                        +3 Days
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs flex-1"
                                        onClick={() => handleQuickPostpone(7)}
                                    >
                                        +1 Week
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        className="h-7 text-xs flex-1"
                                        onClick={() => handleQuickPostpone(14)}
                                    >
                                        +2 Weeks
                                    </Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Status</Label>
                                    <Select
                                        value={rescheduleForm.status}
                                        onValueChange={(val: ProjectTaskStatus) => setRescheduleForm({ ...rescheduleForm, status: val })}
                                    >
                                        <SelectTrigger className="text-xs">
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
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-xs font-semibold">Priority</Label>
                                    <Select
                                        value={rescheduleForm.priority}
                                        onValueChange={(val: ProjectPriority) => setRescheduleForm({ ...rescheduleForm, priority: val })}
                                    >
                                        <SelectTrigger className="text-xs">
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

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Linked Milestone</Label>
                                <Select
                                    value={rescheduleForm.milestoneId}
                                    onValueChange={(val) => setRescheduleForm({ ...rescheduleForm, milestoneId: val })}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Milestone</SelectItem>
                                        {milestones.map((m) => (
                                            <SelectItem key={m.id} value={m.id}>
                                                {m.title}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRescheduleTask(null)}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    onClick={handleSaveReschedule}
                                    disabled={isSaving}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Save Changes
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
