"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Briefcase,
    Users,
    Calendar,
    Award,
    Plus,
    Search,
    Filter,
    CheckCircle2,
    XCircle,
    Clock,
    UserCheck,
    Video,
    ExternalLink,
    Star,
    Sparkles,
    Building2,
    MapPin,
    DollarSign,
    FileText,
    MoreHorizontal,
    ArrowRight,
    ChevronRight,
    Loader2,
    CalendarDays,
    Phone,
    Mail,
    Kanban,
    ListFilter,
    AlertCircle,
    Eye
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import {
    JobStatus,
    ApplicantStage,
    InterviewStatus,
    InterviewRecommendation,
    EmploymentType
} from "@prisma/client"
import {
    RecruitmentOverviewData,
    JobOpeningRecord,
    JobApplicantRecord,
    ApplicantInterviewRecord,
    createJobOpening,
    updateJobOpeningStatus,
    createApplicant,
    updateApplicantStage,
    scheduleInterview,
    recordInterviewFeedback,
    hireApplicant
} from "@/app/actions/recruitment"

interface RecruitmentClientProps {
    initialData: RecruitmentOverviewData
}

export function RecruitmentClient({ initialData }: RecruitmentClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Active tab
    const [activeTab, setActiveTab] = useState<"pipeline" | "openings" | "interviews">("pipeline")
    const [pipelineView, setPipelineView] = useState<"kanban" | "table">("kanban")

    // Filter states
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedJobFilter, setSelectedJobFilter] = useState<string>("all")
    const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all")

    // Modals
    const [isCreateOpeningOpen, setIsCreateOpeningOpen] = useState(false)
    const [isAddCandidateOpen, setIsAddCandidateOpen] = useState(false)
    const [isScheduleInterviewOpen, setIsScheduleInterviewOpen] = useState(false)
    const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
    const [isHireModalOpen, setIsHireModalOpen] = useState(false)
    const [isCandidateDetailOpen, setIsCandidateDetailOpen] = useState(false)

    // Selected entities for actions
    const [selectedCandidate, setSelectedCandidate] = useState<JobApplicantRecord | null>(null)
    const [selectedInterview, setSelectedInterview] = useState<ApplicantInterviewRecord | null>(null)

    // Form states - Create Job Opening
    const [newJobTitle, setNewJobTitle] = useState("")
    const [newJobDeptId, setNewJobDeptId] = useState("")
    const [newJobDesigId, setNewJobDesigId] = useState("")
    const [newJobType, setNewJobType] = useState<EmploymentType>(EmploymentType.FULL_TIME)
    const [newJobLocation, setNewJobLocation] = useState("On-site")
    const [newJobPositions, setNewJobPositions] = useState(1)
    const [newJobSalaryMin, setNewJobSalaryMin] = useState("")
    const [newJobSalaryMax, setNewJobSalaryMax] = useState("")
    const [newJobTargetDate, setNewJobTargetDate] = useState("")
    const [newJobDescription, setNewJobDescription] = useState("")
    const [newJobRequirements, setNewJobRequirements] = useState("")

    // Form states - Add Candidate
    const [candJobId, setCandJobId] = useState("")
    const [candFullName, setCandFullName] = useState("")
    const [candEmail, setCandEmail] = useState("")
    const [candPhone, setCandPhone] = useState("")
    const [candRole, setCandRole] = useState("")
    const [candCompany, setCandCompany] = useState("")
    const [candExp, setCandExp] = useState("")
    const [candCurrentSal, setCandCurrentSal] = useState("")
    const [candExpectedSal, setCandExpectedSal] = useState("")
    const [candNoticeDays, setCandNoticeDays] = useState(30)
    const [candResumeUrl, setCandResumeUrl] = useState("")
    const [candNotes, setCandNotes] = useState("")

    // Form states - Schedule Interview
    const [intCandidateId, setIntCandidateId] = useState("")
    const [intRoundName, setIntRoundName] = useState("Technical Round 1")
    const [intInterviewerId, setIntInterviewerId] = useState("")
    const [intInterviewerName, setIntInterviewerName] = useState("")
    const [intScheduledAt, setIntScheduledAt] = useState("")
    const [intDuration, setIntDuration] = useState(45)
    const [intMeetingLink, setIntMeetingLink] = useState("")

    // Form states - Record Feedback
    const [fbRating, setFbRating] = useState(4)
    const [fbRecommendation, setFbRecommendation] = useState<InterviewRecommendation>(InterviewRecommendation.HIRE)
    const [fbNotes, setFbNotes] = useState("")

    // Form states - 1-Click Hire
    const [hireFirstName, setHireFirstName] = useState("")
    const [hireLastName, setHireLastName] = useState("")
    const [hireEmail, setHireEmail] = useState("")
    const [hirePhone, setHirePhone] = useState("")
    const [hireDeptId, setHireDeptId] = useState("")
    const [hireDesigId, setHireDesigId] = useState("")
    const [hireSalary, setHireSalary] = useState("")
    const [hireEmploymentType, setHireEmploymentType] = useState<EmploymentType>(EmploymentType.FULL_TIME)
    const [hireJoiningDate, setHireJoiningDate] = useState(new Date().toISOString().split("T")[0])

    // Filtered applicants
    const filteredApplicants = useMemo(() => {
        return initialData.applicants.filter(app => {
            const matchesSearch =
                app.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                app.applicantNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (app.currentRole && app.currentRole.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesJob = selectedJobFilter === "all" || app.jobOpeningId === selectedJobFilter
            const matchesStage = selectedStageFilter === "all" || app.stage === selectedStageFilter

            return matchesSearch && matchesJob && matchesStage
        })
    }, [initialData.applicants, searchQuery, selectedJobFilter, selectedStageFilter])

    // Filtered job openings
    const filteredOpenings = useMemo(() => {
        return initialData.jobOpenings.filter(job => {
            return (
                job.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                job.jobCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (job.departmentName && job.departmentName.toLowerCase().includes(searchQuery.toLowerCase()))
            )
        })
    }, [initialData.jobOpenings, searchQuery])

    // Filtered interviews
    const filteredInterviews = useMemo(() => {
        return initialData.interviews.filter(inv => {
            return (
                inv.applicantName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                inv.roundName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (inv.interviewerName && inv.interviewerName.toLowerCase().includes(searchQuery.toLowerCase()))
            )
        })
    }, [initialData.interviews, searchQuery])

    // Stage progression colors and labels
    const stageConfig: Record<ApplicantStage, { label: string; color: string; bg: string }> = {
        APPLIED: { label: "Applied", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900" },
        SCREENING: { label: "Screening", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900" },
        INTERVIEWING: { label: "Interviewing", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900" },
        OFFERED: { label: "Offered", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900" },
        HIRED: { label: "Hired", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900" },
        REJECTED: { label: "Rejected", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900" }
    }

    // Handlers
    const handleCreateJobOpening = () => {
        if (!newJobTitle.trim()) {
            toast.error("Job title is required.")
            return
        }

        startTransition(async () => {
            try {
                await createJobOpening({
                    title: newJobTitle,
                    departmentId: newJobDeptId || undefined,
                    designationId: newJobDesigId || undefined,
                    employmentType: newJobType,
                    location: newJobLocation,
                    positionsCount: Number(newJobPositions) || 1,
                    salaryMin: newJobSalaryMin ? Number(newJobSalaryMin) : undefined,
                    salaryMax: newJobSalaryMax ? Number(newJobSalaryMax) : undefined,
                    targetDate: newJobTargetDate || undefined,
                    description: newJobDescription,
                    requirements: newJobRequirements
                })
                toast.success("Job opening published successfully!")
                setIsCreateOpeningOpen(false)
                resetJobForm()
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to create job opening.")
            }
        })
    }

    const resetJobForm = () => {
        setNewJobTitle("")
        setNewJobDeptId("")
        setNewJobDesigId("")
        setNewJobType(EmploymentType.FULL_TIME)
        setNewJobLocation("On-site")
        setNewJobPositions(1)
        setNewJobSalaryMin("")
        setNewJobSalaryMax("")
        setNewJobTargetDate("")
        setNewJobDescription("")
        setNewJobRequirements("")
    }

    const handleCreateApplicant = () => {
        if (!candJobId) {
            toast.error("Please select a target job opening.")
            return
        }
        if (!candFullName.trim() || !candEmail.trim()) {
            toast.error("Candidate full name and email are required.")
            return
        }

        startTransition(async () => {
            try {
                await createApplicant({
                    jobOpeningId: candJobId,
                    fullName: candFullName,
                    email: candEmail,
                    phone: candPhone || undefined,
                    currentRole: candRole || undefined,
                    currentCompany: candCompany || undefined,
                    experienceYears: candExp ? Number(candExp) : undefined,
                    currentSalary: candCurrentSal ? Number(candCurrentSal) : undefined,
                    expectedSalary: candExpectedSal ? Number(candExpectedSal) : undefined,
                    noticePeriodDays: candNoticeDays ? Number(candNoticeDays) : 30,
                    resumeUrl: candResumeUrl || undefined,
                    notes: candNotes || undefined
                })
                toast.success("Candidate added to pipeline successfully!")
                setIsAddCandidateOpen(false)
                resetCandidateForm()
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to add candidate.")
            }
        })
    }

    const resetCandidateForm = () => {
        setCandJobId("")
        setCandFullName("")
        setCandEmail("")
        setCandPhone("")
        setCandRole("")
        setCandCompany("")
        setCandExp("")
        setCandCurrentSal("")
        setCandExpectedSal("")
        setCandNoticeDays(30)
        setCandResumeUrl("")
        setCandNotes("")
    }

    const handleStageAdvance = (candidate: JobApplicantRecord, newStage: ApplicantStage) => {
        startTransition(async () => {
            try {
                await updateApplicantStage(candidate.id, newStage)
                toast.success(`Candidate advanced to ${stageConfig[newStage].label}!`)
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to update candidate stage.")
            }
        })
    }

    const openScheduleModal = (candidate: JobApplicantRecord) => {
        setSelectedCandidate(candidate)
        setIntCandidateId(candidate.id)
        setIntRoundName("Technical Round 1")
        setIntScheduledAt(new Date(Date.now() + 86400000).toISOString().slice(0, 16))
        setIntDuration(45)
        setIntMeetingLink("https://meet.google.com/new")
        setIsScheduleInterviewOpen(true)
    }

    const handleScheduleInterview = () => {
        if (!intCandidateId) {
            toast.error("Candidate is required.")
            return
        }
        if (!intScheduledAt) {
            toast.error("Scheduled date and time are required.")
            return
        }

        startTransition(async () => {
            try {
                await scheduleInterview({
                    applicantId: intCandidateId,
                    roundName: intRoundName,
                    interviewerId: intInterviewerId || undefined,
                    interviewerName: intInterviewerName || undefined,
                    scheduledAt: intScheduledAt,
                    durationMinutes: Number(intDuration) || 45,
                    meetingLink: intMeetingLink || undefined
                })
                toast.success("Interview round scheduled! Candidate moved to Interviewing.")
                setIsScheduleInterviewOpen(false)
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to schedule interview.")
            }
        })
    }

    const openFeedbackModal = (interview: ApplicantInterviewRecord) => {
        setSelectedInterview(interview)
        setFbRating(interview.rating || 4)
        setFbRecommendation(interview.recommendation || InterviewRecommendation.HIRE)
        setFbNotes(interview.feedback || "")
        setIsFeedbackModalOpen(true)
    }

    const handleRecordFeedback = () => {
        if (!selectedInterview) return

        startTransition(async () => {
            try {
                await recordInterviewFeedback(
                    selectedInterview.id,
                    fbNotes,
                    fbRating,
                    fbRecommendation,
                    InterviewStatus.COMPLETED
                )
                toast.success("Interview feedback and rating submitted!")
                setIsFeedbackModalOpen(false)
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to submit feedback.")
            }
        })
    }

    const openHireModal = (candidate: JobApplicantRecord) => {
        setSelectedCandidate(candidate)
        const nameParts = candidate.fullName.trim().split(" ")
        const first = nameParts[0] || ""
        const last = nameParts.slice(1).join(" ")

        setHireFirstName(first)
        setHireLastName(last)
        setHireEmail(candidate.email)
        setHirePhone(candidate.phone || "")

        const job = initialData.jobOpenings.find(j => j.id === candidate.jobOpeningId)
        setHireDeptId(job?.departmentId || "")
        setHireDesigId(job?.designationId || "")
        setHireSalary(candidate.expectedSalary ? String(candidate.expectedSalary) : "50000")
        setHireEmploymentType(job?.employmentType || EmploymentType.FULL_TIME)
        setHireJoiningDate(new Date().toISOString().split("T")[0])

        setIsHireModalOpen(true)
    }

    const handleHireCandidate = () => {
        if (!selectedCandidate) return
        if (!hireFirstName.trim() || !hireEmail.trim()) {
            toast.error("First name and email are required.")
            return
        }
        if (!hireSalary || Number(hireSalary) <= 0) {
            toast.error("Valid starting salary is required.")
            return
        }

        startTransition(async () => {
            try {
                const res = await hireApplicant(selectedCandidate.id, {
                    firstName: hireFirstName,
                    lastName: hireLastName || undefined,
                    email: hireEmail,
                    phone: hirePhone || undefined,
                    departmentId: hireDeptId || undefined,
                    designationId: hireDesigId || undefined,
                    joiningDate: hireJoiningDate,
                    basicSalary: Number(hireSalary),
                    employmentType: hireEmploymentType
                })
                toast.success(`Candidate hired! Created Employee record ${res.employee.employeeNumber}.`)
                setIsHireModalOpen(false)
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to complete hire.")
            }
        })
    }

    const handleToggleJobStatus = (job: JobOpeningRecord, nextStatus: JobStatus) => {
        startTransition(async () => {
            try {
                await updateJobOpeningStatus(job.id, nextStatus)
                toast.success(`Job opening status updated to ${nextStatus}.`)
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to update job status.")
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header & Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Users className="h-7 w-7 text-primary" />
                        Recruitment & Applicant Tracking (ATS)
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Manage requisitions, track candidates through hiring stages, conduct structured interview rounds, and onboard new hires with 1-click conversion.
                    </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        variant="outline"
                        onClick={() => setIsAddCandidateOpen(true)}
                        className="gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        Add Candidate
                    </Button>
                    <Button
                        onClick={() => setIsCreateOpeningOpen(true)}
                        className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground shadow"
                    >
                        <Briefcase className="h-4 w-4" />
                        Post Job Opening
                    </Button>
                </div>
            </div>

            {/* Telemetry KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Active Openings
                        </CardTitle>
                        <Briefcase className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-foreground">
                            {initialData.stats.activeJobsCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {initialData.jobOpenings.length} total requisitions listed
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Pipeline Candidates
                        </CardTitle>
                        <Users className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-foreground">
                            {initialData.stats.candidatesInPipelineCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Active across all interview stages
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Scheduled Rounds
                        </CardTitle>
                        <Calendar className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-foreground">
                            {initialData.stats.scheduledInterviewsCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Pending evaluator feedback
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Hires & Acceptance
                        </CardTitle>
                        <Award className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-foreground flex items-center gap-2">
                            <span>{initialData.stats.hiredCount}</span>
                            <Badge variant="outline" className="text-xs font-normal border-emerald-200 text-emerald-700 dark:text-emerald-400">
                                {initialData.stats.offerAcceptanceRate}% rate
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Converted to active employees
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-72">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search candidate, role, or ID..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background h-9 text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <Select value={selectedJobFilter} onValueChange={setSelectedJobFilter}>
                        <SelectTrigger className="h-9 text-xs w-[180px] bg-background">
                            <SelectValue placeholder="All Job Openings" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Job Openings</SelectItem>
                            {initialData.jobOpenings.map(job => (
                                <SelectItem key={job.id} value={job.id}>
                                    {job.jobCode}: {job.title}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    {activeTab === "pipeline" && (
                        <>
                            <Select value={selectedStageFilter} onValueChange={setSelectedStageFilter}>
                                <SelectTrigger className="h-9 text-xs w-[140px] bg-background">
                                    <SelectValue placeholder="All Stages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stages</SelectItem>
                                    <SelectItem value="APPLIED">Applied</SelectItem>
                                    <SelectItem value="SCREENING">Screening</SelectItem>
                                    <SelectItem value="INTERVIEWING">Interviewing</SelectItem>
                                    <SelectItem value="OFFERED">Offered</SelectItem>
                                    <SelectItem value="HIRED">Hired</SelectItem>
                                    <SelectItem value="REJECTED">Rejected</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="flex items-center border rounded-md p-0.5 bg-muted/40">
                                <Button
                                    variant={pipelineView === "kanban" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setPipelineView("kanban")}
                                    className="h-7 px-2 text-xs"
                                >
                                    <Kanban className="h-3.5 w-3.5 mr-1" />
                                    Board
                                </Button>
                                <Button
                                    variant={pipelineView === "table" ? "secondary" : "ghost"}
                                    size="sm"
                                    onClick={() => setPipelineView("table")}
                                    className="h-7 px-2 text-xs"
                                >
                                    <ListFilter className="h-3.5 w-3.5 mr-1" />
                                    Table
                                </Button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Main Tabs Navigation */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
                <TabsList className="grid grid-cols-3 max-w-md">
                    <TabsTrigger value="pipeline" className="gap-1.5 text-xs sm:text-sm">
                        <Users className="h-4 w-4" />
                        Candidate Pipeline
                    </TabsTrigger>
                    <TabsTrigger value="openings" className="gap-1.5 text-xs sm:text-sm">
                        <Briefcase className="h-4 w-4" />
                        Job Openings ({initialData.jobOpenings.length})
                    </TabsTrigger>
                    <TabsTrigger value="interviews" className="gap-1.5 text-xs sm:text-sm">
                        <CalendarDays className="h-4 w-4" />
                        Interviews ({initialData.interviews.length})
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: CANDIDATE PIPELINE */}
                <TabsContent value="pipeline" className="space-y-4 pt-4">
                    {pipelineView === "kanban" ? (
                        /* KANBAN BOARD VIEW */
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 overflow-x-auto pb-4">
                            {(["APPLIED", "SCREENING", "INTERVIEWING", "OFFERED", "HIRED", "REJECTED"] as ApplicantStage[]).map(stage => {
                                const stageCandidates = filteredApplicants.filter(a => a.stage === stage)
                                const config = stageConfig[stage]

                                return (
                                    <div
                                        key={stage}
                                        className="flex flex-col rounded-lg border bg-muted/20 min-w-[240px] max-h-[750px] shadow-sm"
                                    >
                                        {/* Column Header */}
                                        <div className={`p-3 border-b flex items-center justify-between rounded-t-lg ${config.bg}`}>
                                            <span className={`text-xs font-semibold uppercase tracking-wider ${config.color}`}>
                                                {config.label}
                                            </span>
                                            <Badge variant="secondary" className="text-xs h-5 px-1.5">
                                                {stageCandidates.length}
                                            </Badge>
                                        </div>

                                        {/* Candidates Card Container */}
                                        <div className="p-2 space-y-2.5 overflow-y-auto flex-1">
                                            {stageCandidates.length === 0 ? (
                                                <div className="p-4 text-center text-xs text-muted-foreground italic">
                                                    No candidates
                                                </div>
                                            ) : (
                                                stageCandidates.map(cand => (
                                                    <Card
                                                        key={cand.id}
                                                        className="p-3 bg-card hover:border-primary/50 transition-all shadow-sm group relative"
                                                    >
                                                        <div className="flex items-start justify-between gap-1">
                                                            <div>
                                                                <h4 className="text-sm font-medium text-foreground leading-snug group-hover:text-primary transition-colors">
                                                                    {cand.fullName}
                                                                </h4>
                                                                <p className="text-xs text-muted-foreground truncate max-w-[170px]">
                                                                    {cand.currentRole || "Applicant"} {cand.currentCompany ? `at ${cand.currentCompany}` : ""}
                                                                </p>
                                                            </div>

                                                            <DropdownMenu>
                                                                <DropdownMenuTrigger asChild>
                                                                    <Button variant="ghost" size="icon" className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground">
                                                                        <MoreHorizontal className="h-3.5 w-3.5" />
                                                                    </Button>
                                                                </DropdownMenuTrigger>
                                                                <DropdownMenuContent align="end" className="w-48 text-xs">
                                                                    <DropdownMenuLabel>Stage Transitions</DropdownMenuLabel>
                                                                    {stage !== "APPLIED" && (
                                                                        <DropdownMenuItem onClick={() => handleStageAdvance(cand, ApplicantStage.APPLIED)}>
                                                                            Move to Applied
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {stage !== "SCREENING" && (
                                                                        <DropdownMenuItem onClick={() => handleStageAdvance(cand, ApplicantStage.SCREENING)}>
                                                                            Move to Screening
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {stage !== "INTERVIEWING" && (
                                                                        <DropdownMenuItem onClick={() => handleStageAdvance(cand, ApplicantStage.INTERVIEWING)}>
                                                                            Move to Interviewing
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {stage !== "OFFERED" && (
                                                                        <DropdownMenuItem onClick={() => handleStageAdvance(cand, ApplicantStage.OFFERED)}>
                                                                            Move to Offered
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    <DropdownMenuSeparator />
                                                                    <DropdownMenuItem onClick={() => openScheduleModal(cand)}>
                                                                        Schedule Interview
                                                                    </DropdownMenuItem>
                                                                    {cand.stage !== "HIRED" && (
                                                                        <DropdownMenuItem onClick={() => openHireModal(cand)} className="text-emerald-600 font-semibold">
                                                                            1-Click Hire Candidate
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                    {stage !== "REJECTED" && (
                                                                        <DropdownMenuItem onClick={() => handleStageAdvance(cand, ApplicantStage.REJECTED)} className="text-rose-600">
                                                                            Mark as Rejected
                                                                        </DropdownMenuItem>
                                                                    )}
                                                                </DropdownMenuContent>
                                                            </DropdownMenu>
                                                        </div>

                                                        {/* Target Role & Code */}
                                                        <div className="mt-2 text-[11px] text-muted-foreground flex items-center justify-between border-t pt-1.5">
                                                            <span className="truncate max-w-[130px] font-medium text-foreground/80">
                                                                {cand.jobOpeningTitle}
                                                            </span>
                                                            <span className="font-mono text-[10px] bg-muted px-1 rounded">
                                                                {cand.applicantNumber}
                                                            </span>
                                                        </div>

                                                        {/* Metadata badges */}
                                                        <div className="mt-2 flex flex-wrap gap-1 items-center">
                                                            {cand.experienceYears !== null && (
                                                                <Badge variant="outline" className="text-[10px] h-4.5 px-1 font-normal">
                                                                    {cand.experienceYears}y exp
                                                                </Badge>
                                                            )}
                                                            {cand.expectedSalary && (
                                                                <Badge variant="outline" className="text-[10px] h-4.5 px-1 font-normal text-emerald-700 dark:text-emerald-400">
                                                                    Exp: {formatCurrency(cand.expectedSalary)}
                                                                </Badge>
                                                            )}
                                                            {cand.interviewsCount > 0 && (
                                                                <Badge variant="secondary" className="text-[10px] h-4.5 px-1">
                                                                    {cand.interviewsCount} round{cand.interviewsCount > 1 ? "s" : ""}
                                                                </Badge>
                                                            )}
                                                        </div>

                                                        {/* Bottom Direct CTA */}
                                                        <div className="mt-2.5 pt-2 border-t flex items-center justify-between gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                onClick={() => {
                                                                    setSelectedCandidate(cand)
                                                                    setIsCandidateDetailOpen(true)
                                                                }}
                                                                className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground"
                                                            >
                                                                <Eye className="h-3 w-3 mr-1" />
                                                                Profile
                                                            </Button>

                                                            {stage === "OFFERED" || stage === "INTERVIEWING" ? (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => openHireModal(cand)}
                                                                    className="h-6 px-2 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                                                >
                                                                    <UserCheck className="h-3 w-3 mr-1" />
                                                                    Hire
                                                                </Button>
                                                            ) : stage === "APPLIED" || stage === "SCREENING" ? (
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => openScheduleModal(cand)}
                                                                    className="h-6 px-2 text-[11px]"
                                                                >
                                                                    <Calendar className="h-3 w-3 mr-1" />
                                                                    Interview
                                                                </Button>
                                                            ) : stage === "HIRED" && cand.convertedEmployeeNumber ? (
                                                                <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400 font-medium">
                                                                    {cand.convertedEmployeeNumber}
                                                                </span>
                                                            ) : null}
                                                        </div>
                                                    </Card>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        /* TABLE VIEW */
                        <Card className="shadow-sm">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="w-[120px]">Candidate ID</TableHead>
                                            <TableHead>Full Name & Role</TableHead>
                                            <TableHead>Target Position</TableHead>
                                            <TableHead>Experience & Comp</TableHead>
                                            <TableHead>Stage</TableHead>
                                            <TableHead>Interviews</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredApplicants.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                    No applicants found matching the current filters.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredApplicants.map(cand => (
                                                <TableRow key={cand.id}>
                                                    <TableCell className="font-mono text-xs font-semibold">
                                                        {cand.applicantNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-foreground">{cand.fullName}</div>
                                                        <div className="text-xs text-muted-foreground flex items-center gap-2 mt-0.5">
                                                            <span>{cand.email}</span>
                                                            {cand.phone && <span>• {cand.phone}</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs font-medium text-foreground">{cand.jobOpeningTitle}</div>
                                                        <div className="text-[11px] font-mono text-muted-foreground">{cand.jobCode}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs">
                                                            {cand.experienceYears !== null ? `${cand.experienceYears} yrs` : "N/A"}
                                                        </div>
                                                        {cand.expectedSalary && (
                                                            <div className="text-[11px] text-muted-foreground">
                                                                Exp: {formatCurrency(cand.expectedSalary)}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-xs font-medium ${stageConfig[cand.stage].bg} ${stageConfig[cand.stage].color}`}
                                                        >
                                                            {stageConfig[cand.stage].label}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-xs flex items-center gap-1">
                                                            <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                            <span>{cand.interviewsCount} round{cand.interviewsCount !== 1 ? "s" : ""}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1.5">
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                onClick={() => openScheduleModal(cand)}
                                                                className="h-8 text-xs"
                                                            >
                                                                Schedule
                                                            </Button>
                                                            {cand.stage !== "HIRED" ? (
                                                                <Button
                                                                    size="sm"
                                                                    onClick={() => openHireModal(cand)}
                                                                    className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                                                >
                                                                    1-Click Hire
                                                                </Button>
                                                            ) : (
                                                                <Badge variant="outline" className="border-emerald-200 text-emerald-700 text-xs">
                                                                    Hired ({cand.convertedEmployeeNumber})
                                                                </Badge>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </Card>
                    )}
                </TabsContent>

                {/* TAB 2: JOB OPENINGS */}
                <TabsContent value="openings" className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Active Job Requisitions</h3>
                            <p className="text-sm text-muted-foreground">Track open headcounts, target deadlines, and recruitment velocity.</p>
                        </div>
                        <Button onClick={() => setIsCreateOpeningOpen(true)} className="gap-1.5">
                            <Plus className="h-4 w-4" />
                            Create Opening
                        </Button>
                    </div>

                    <Card className="shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[120px]">Job Code</TableHead>
                                        <TableHead>Role Title</TableHead>
                                        <TableHead>Department & Level</TableHead>
                                        <TableHead>Location & Type</TableHead>
                                        <TableHead>Positions</TableHead>
                                        <TableHead>Compensation Bracket</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOpenings.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                                No job openings found. Click "Create Opening" to publish a requisition.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredOpenings.map(job => (
                                            <TableRow key={job.id}>
                                                <TableCell className="font-mono text-xs font-semibold">
                                                    {job.jobCode}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-medium text-foreground">{job.title}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {job.applicantsCount} candidate{job.applicantsCount !== 1 ? "s" : ""} applied
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-foreground font-medium">
                                                        {job.departmentName || "General Department"}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {job.designationTitle || "Unassigned Level"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs text-foreground flex items-center gap-1">
                                                        <MapPin className="h-3 w-3 text-muted-foreground" />
                                                        <span>{job.location}</span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground capitalize">
                                                        {job.employmentType.toLowerCase().replace("_", " ")}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-medium">
                                                        {job.hiredCount} / {job.positionsCount} filled
                                                    </div>
                                                    <div className="w-20 bg-muted rounded-full h-1.5 mt-1 overflow-hidden">
                                                        <div
                                                            className="bg-emerald-500 h-full rounded-full"
                                                            style={{
                                                                width: `${Math.min(100, Math.round((job.hiredCount / job.positionsCount) * 100))}%`
                                                            }}
                                                        />
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-medium">
                                                        {job.salaryMin && job.salaryMax
                                                            ? `${formatCurrency(job.salaryMin)} - ${formatCurrency(job.salaryMax)}`
                                                            : job.salaryMin
                                                                ? `From ${formatCurrency(job.salaryMin)}`
                                                                : "Not disclosed"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            job.status === "PUBLISHED"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : job.status === "ON_HOLD"
                                                                    ? "bg-amber-50 text-amber-700 border-amber-200"
                                                                    : job.status === "CLOSED"
                                                                        ? "bg-muted text-muted-foreground border-border"
                                                                        : "bg-blue-50 text-blue-700 border-blue-200"
                                                        }
                                                    >
                                                        {job.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="text-xs">
                                                            <DropdownMenuLabel>Requisition Status</DropdownMenuLabel>
                                                            {job.status !== "PUBLISHED" && (
                                                                <DropdownMenuItem onClick={() => handleToggleJobStatus(job, JobStatus.PUBLISHED)}>
                                                                    Publish Opening
                                                                </DropdownMenuItem>
                                                            )}
                                                            {job.status !== "ON_HOLD" && (
                                                                <DropdownMenuItem onClick={() => handleToggleJobStatus(job, JobStatus.ON_HOLD)}>
                                                                    Put On Hold
                                                                </DropdownMenuItem>
                                                            )}
                                                            {job.status !== "CLOSED" && (
                                                                <DropdownMenuItem onClick={() => handleToggleJobStatus(job, JobStatus.CLOSED)} className="text-rose-600">
                                                                    Close Requisition
                                                                </DropdownMenuItem>
                                                            )}
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>

                {/* TAB 3: INTERVIEW SCHEDULE DESK */}
                <TabsContent value="interviews" className="space-y-4 pt-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-lg font-semibold text-foreground">Scheduled Interviews & Assessments</h3>
                            <p className="text-sm text-muted-foreground">Evaluation rounds, meeting links, and interviewer scorecards.</p>
                        </div>
                    </div>

                    <Card className="shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Candidate & Position</TableHead>
                                        <TableHead>Interview Round</TableHead>
                                        <TableHead>Evaluator / Interviewer</TableHead>
                                        <TableHead>Date & Time</TableHead>
                                        <TableHead>Meeting Link</TableHead>
                                        <TableHead>Score & Recommendation</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredInterviews.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                                No interview rounds scheduled yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredInterviews.map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell>
                                                    <div className="font-medium text-foreground">{inv.applicantName}</div>
                                                    <div className="text-xs text-muted-foreground">{inv.jobOpeningTitle}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {inv.roundName}
                                                    </Badge>
                                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                                        {inv.durationMinutes} minutes
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-medium text-foreground">
                                                        {inv.interviewerName || "Unassigned"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="text-xs font-medium">
                                                        {format(new Date(inv.scheduledAt), "dd MMM yyyy")}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {format(new Date(inv.scheduledAt), "hh:mm a")}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {inv.meetingLink ? (
                                                        <a
                                                            href={inv.meetingLink}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                                                        >
                                                            <Video className="h-3.5 w-3.5" />
                                                            Join Call
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">In-person / Phone</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {inv.status === "COMPLETED" ? (
                                                        <div>
                                                            <div className="flex items-center gap-1 text-amber-500">
                                                                {Array.from({ length: inv.rating || 0 }).map((_, i) => (
                                                                    <Star key={i} className="h-3.5 w-3.5 fill-current" />
                                                                ))}
                                                                <span className="text-xs text-foreground font-semibold ml-1">
                                                                    {inv.rating}/5
                                                                </span>
                                                            </div>
                                                            {inv.recommendation && (
                                                                <div className="text-[11px] font-medium text-emerald-600 mt-0.5">
                                                                    {inv.recommendation.replace("_", " ")}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">Pending feedback</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={
                                                            inv.status === "COMPLETED"
                                                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                                                : inv.status === "CANCELLED" || inv.status === "NO_SHOW"
                                                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                                                    : "bg-blue-50 text-blue-700 border-blue-200"
                                                        }
                                                    >
                                                        {inv.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openFeedbackModal(inv)}
                                                        className="h-8 text-xs"
                                                    >
                                                        {inv.status === "COMPLETED" ? "Edit Feedback" : "Score Candidate"}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* MODAL 1: CREATE JOB OPENING */}
            <Dialog open={isCreateOpeningOpen} onOpenChange={setIsCreateOpeningOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Briefcase className="h-5 w-5 text-primary" />
                            Create & Publish Job Opening
                        </DialogTitle>
                        <DialogDescription>
                            Define the requisition requirements, targeted department, headcount, and compensation brackets.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label htmlFor="jobTitle" className="text-xs font-semibold">Job Title *</Label>
                            <Input
                                id="jobTitle"
                                placeholder="e.g. Senior Full-Stack Engineer"
                                value={newJobTitle}
                                onChange={(e) => setNewJobTitle(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Department</Label>
                            <Select value={newJobDeptId} onValueChange={setNewJobDeptId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select Department" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.departments.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Designation / Level</Label>
                            <Select value={newJobDesigId} onValueChange={setNewJobDesigId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select Designation" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.designations.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Employment Type</Label>
                            <Select value={newJobType} onValueChange={(v) => setNewJobType(v as EmploymentType)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={EmploymentType.FULL_TIME}>Full-Time</SelectItem>
                                    <SelectItem value={EmploymentType.PART_TIME}>Part-Time</SelectItem>
                                    <SelectItem value={EmploymentType.CONTRACT}>Contract</SelectItem>
                                    <SelectItem value={EmploymentType.INTERN}>Internship</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Work Location</Label>
                            <Input
                                placeholder="e.g. Remote / Bangalore / Hybrid"
                                value={newJobLocation}
                                onChange={(e) => setNewJobLocation(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Open Positions Count</Label>
                            <Input
                                type="number"
                                min={1}
                                value={newJobPositions}
                                onChange={(e) => setNewJobPositions(Number(e.target.value))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Target Hiring Date</Label>
                            <Input
                                type="date"
                                value={newJobTargetDate}
                                onChange={(e) => setNewJobTargetDate(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Salary Min (INR)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 600000"
                                value={newJobSalaryMin}
                                onChange={(e) => setNewJobSalaryMin(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Salary Max (INR)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 1200000"
                                value={newJobSalaryMax}
                                onChange={(e) => setNewJobSalaryMax(e.target.value)}
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold">Job Description & Responsibilities</Label>
                            <Textarea
                                rows={3}
                                placeholder="Outline core duties and mission of this role..."
                                value={newJobDescription}
                                onChange={(e) => setNewJobDescription(e.target.value)}
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold">Requirements & Qualifications</Label>
                            <Textarea
                                rows={2}
                                placeholder="Required tech stack, certifications, or years of domain experience..."
                                value={newJobRequirements}
                                onChange={(e) => setNewJobRequirements(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpeningOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateJobOpening} disabled={isPending} className="gap-2">
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Publish Job Opening
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: ADD CANDIDATE TO PIPELINE */}
            <Dialog open={isAddCandidateOpen} onOpenChange={setIsAddCandidateOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-primary" />
                            Add Candidate to Pipeline
                        </DialogTitle>
                        <DialogDescription>
                            Record candidate profile, current employer, compensation expectations, and resume details.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
                        <div className="sm:col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold">Target Job Opening *</Label>
                            <Select value={candJobId} onValueChange={setCandJobId}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select Open Requisition" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.jobOpenings.map(job => (
                                        <SelectItem key={job.id} value={job.id}>
                                            {job.jobCode}: {job.title} ({job.location})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Candidate Full Name *</Label>
                            <Input
                                placeholder="e.g. Vikram Malhotra"
                                value={candFullName}
                                onChange={(e) => setCandFullName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Email Address *</Label>
                            <Input
                                type="email"
                                placeholder="vikram@example.com"
                                value={candEmail}
                                onChange={(e) => setCandEmail(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Phone Number</Label>
                            <Input
                                placeholder="+91 98765 43210"
                                value={candPhone}
                                onChange={(e) => setCandPhone(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Years of Experience</Label>
                            <Input
                                type="number"
                                step="0.5"
                                placeholder="e.g. 5.5"
                                value={candExp}
                                onChange={(e) => setCandExp(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Current Designation / Role</Label>
                            <Input
                                placeholder="e.g. Software Engineer"
                                value={candRole}
                                onChange={(e) => setCandRole(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Current Employer</Label>
                            <Input
                                placeholder="e.g. Tech Corp"
                                value={candCompany}
                                onChange={(e) => setCandCompany(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Current Annual CTC (INR)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 800000"
                                value={candCurrentSal}
                                onChange={(e) => setCandCurrentSal(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Expected Annual CTC (INR)</Label>
                            <Input
                                type="number"
                                placeholder="e.g. 1100000"
                                value={candExpectedSal}
                                onChange={(e) => setCandExpectedSal(e.target.value)}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Notice Period (Days)</Label>
                            <Input
                                type="number"
                                value={candNoticeDays}
                                onChange={(e) => setCandNoticeDays(Number(e.target.value))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Resume Link / URL</Label>
                            <Input
                                placeholder="https://drive.google.com/..."
                                value={candResumeUrl}
                                onChange={(e) => setCandResumeUrl(e.target.value)}
                            />
                        </div>

                        <div className="sm:col-span-2 space-y-1.5">
                            <Label className="text-xs font-semibold">Recruiter Notes / Observations</Label>
                            <Textarea
                                rows={2}
                                placeholder="Initial impression, key strengths, referral source..."
                                value={candNotes}
                                onChange={(e) => setCandNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsAddCandidateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateApplicant} disabled={isPending} className="gap-2">
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Add to Pipeline
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 3: SCHEDULE INTERVIEW */}
            <Dialog open={isScheduleInterviewOpen} onOpenChange={setIsScheduleInterviewOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Calendar className="h-5 w-5 text-primary" />
                            Schedule Interview Round
                        </DialogTitle>
                        <DialogDescription>
                            Set assessment round, date & time, video meeting link, and evaluator assignment.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 py-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Candidate</Label>
                            <Input
                                disabled
                                value={selectedCandidate ? `${selectedCandidate.fullName} (${selectedCandidate.applicantNumber})` : ""}
                                className="bg-muted"
                            />
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Interview Round Name *</Label>
                            <Select value={intRoundName} onValueChange={setIntRoundName}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Screening Call">Screening Call</SelectItem>
                                    <SelectItem value="Technical Round 1">Technical Round 1</SelectItem>
                                    <SelectItem value="Technical Round 2">Technical Round 2</SelectItem>
                                    <SelectItem value="System Design">System Design</SelectItem>
                                    <SelectItem value="Cultural Fit / HR Round">Cultural Fit / HR Round</SelectItem>
                                    <SelectItem value="Executive Review">Executive Review</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Evaluator / Interviewer</Label>
                            <Select value={intInterviewerId} onValueChange={(val) => {
                                setIntInterviewerId(val)
                                const emp = initialData.employees.find(e => e.id === val)
                                if (emp) setIntInterviewerName(emp.displayName)
                            }}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue placeholder="Select internal interviewer" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.employees.map(emp => (
                                        <SelectItem key={emp.id} value={emp.id}>
                                            {emp.displayName} {emp.departmentName ? `(${emp.departmentName})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Date & Time *</Label>
                                <Input
                                    type="datetime-local"
                                    value={intScheduledAt}
                                    onChange={(e) => setIntScheduledAt(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Duration (Minutes)</Label>
                                <Input
                                    type="number"
                                    value={intDuration}
                                    onChange={(e) => setIntDuration(Number(e.target.value))}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Meeting URL (Google Meet / Zoom)</Label>
                            <Input
                                placeholder="https://meet.google.com/..."
                                value={intMeetingLink}
                                onChange={(e) => setIntMeetingLink(e.target.value)}
                                className="h-9 text-xs"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsScheduleInterviewOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleScheduleInterview} disabled={isPending} className="gap-2">
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Schedule Interview
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 4: RECORD INTERVIEW FEEDBACK */}
            <Dialog open={isFeedbackModalOpen} onOpenChange={setIsFeedbackModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Star className="h-5 w-5 text-amber-500 fill-amber-500" />
                            Submit Interview Feedback & Scorecard
                        </DialogTitle>
                        <DialogDescription>
                            Rate candidate technical competence, culture alignment, and hiring recommendation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 py-3">
                        <div className="p-3 bg-muted/50 rounded-lg text-xs space-y-1">
                            <div className="font-semibold text-foreground">
                                {selectedInterview?.applicantName} — {selectedInterview?.roundName}
                            </div>
                            <div className="text-muted-foreground">
                                Position: {selectedInterview?.jobOpeningTitle}
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Evaluation Rating (1 - 5 Stars)</Label>
                            <div className="flex items-center gap-2">
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        onClick={() => setFbRating(star)}
                                        className="p-1 text-amber-400 hover:scale-110 transition-transform"
                                    >
                                        <Star className={`h-6 w-6 ${star <= fbRating ? "fill-current" : "text-muted-foreground/30"}`} />
                                    </button>
                                ))}
                                <span className="text-xs font-bold text-foreground ml-2">
                                    {fbRating === 5 ? "Outstanding (5/5)" : fbRating === 4 ? "Good / Strong (4/5)" : fbRating === 3 ? "Meets Bar (3/5)" : "Below Bar"}
                                </span>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Recommendation</Label>
                            <Select value={fbRecommendation} onValueChange={(v) => setFbRecommendation(v as any)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={InterviewRecommendation.STRONG_HIRE}>Strong Hire</SelectItem>
                                    <SelectItem value={InterviewRecommendation.HIRE}>Hire</SelectItem>
                                    <SelectItem value={InterviewRecommendation.NEUTRAL}>Neutral / Borderline</SelectItem>
                                    <SelectItem value={InterviewRecommendation.NO_HIRE}>Do Not Hire</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Detailed Feedback & Notes</Label>
                            <Textarea
                                rows={4}
                                placeholder="Highlight technical problem solving, domain depth, communication, and areas for growth..."
                                value={fbNotes}
                                onChange={(e) => setFbNotes(e.target.value)}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsFeedbackModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRecordFeedback} disabled={isPending} className="gap-2">
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Submit Evaluation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 5: 1-CLICK HIRE & ONBOARD EMPLOYEE */}
            <Dialog open={isHireModalOpen} onOpenChange={setIsHireModalOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                            <UserCheck className="h-5 w-5" />
                            1-Click Hire & Onboard into HR Directory
                        </DialogTitle>
                        <DialogDescription>
                            Atomically converts this candidate into an active Employee record and updates requisition headcounts.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 py-3">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 rounded-lg text-xs space-y-1">
                            <div className="font-semibold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                <Sparkles className="h-4 w-4 text-emerald-600" />
                                Automated Employee Profile Generation
                            </div>
                            <p className="text-emerald-700 dark:text-emerald-400 text-[11px]">
                                This will generate an official Employee ID (EMP-YYYY-XXXX), activate attendance rosters, and link this candidate profile.
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">First Name *</Label>
                                <Input
                                    value={hireFirstName}
                                    onChange={(e) => setHireFirstName(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Last Name</Label>
                                <Input
                                    value={hireLastName}
                                    onChange={(e) => setHireLastName(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Official Email *</Label>
                                <Input
                                    type="email"
                                    value={hireEmail}
                                    onChange={(e) => setHireEmail(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Phone</Label>
                                <Input
                                    value={hirePhone}
                                    onChange={(e) => setHirePhone(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Department</Label>
                                <Select value={hireDeptId} onValueChange={setHireDeptId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Department" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.departments.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Designation</Label>
                                <Select value={hireDesigId} onValueChange={setHireDesigId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Designation" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.designations.map(d => (
                                            <SelectItem key={d.id} value={d.id}>{d.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Monthly Basic Salary (INR) *</Label>
                                <Input
                                    type="number"
                                    value={hireSalary}
                                    onChange={(e) => setHireSalary(e.target.value)}
                                    className="h-9 text-xs font-mono font-medium"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Joining Date *</Label>
                                <Input
                                    type="date"
                                    value={hireJoiningDate}
                                    onChange={(e) => setHireJoiningDate(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsHireModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleHireCandidate}
                            disabled={isPending}
                            className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Confirm & Hire Candidate
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 6: CANDIDATE DETAIL PROFILE DRAWER */}
            <Dialog open={isCandidateDetailOpen} onOpenChange={setIsCandidateDetailOpen}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center justify-between">
                            <span>{selectedCandidate?.fullName}</span>
                            <Badge variant="outline" className={`text-xs ${selectedCandidate ? stageConfig[selectedCandidate.stage].bg : ""} ${selectedCandidate ? stageConfig[selectedCandidate.stage].color : ""}`}>
                                {selectedCandidate ? stageConfig[selectedCandidate.stage].label : ""}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription>
                            Application {selectedCandidate?.applicantNumber} for {selectedCandidate?.jobOpeningTitle} ({selectedCandidate?.jobCode})
                        </DialogDescription>
                    </DialogHeader>

                    {selectedCandidate && (
                        <div className="space-y-4 py-2 text-xs">
                            <div className="grid grid-cols-2 gap-2 p-3 bg-muted/30 rounded-lg">
                                <div>
                                    <span className="text-muted-foreground">Email: </span>
                                    <span className="font-medium text-foreground">{selectedCandidate.email}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Phone: </span>
                                    <span className="font-medium text-foreground">{selectedCandidate.phone || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Current Company: </span>
                                    <span className="font-medium text-foreground">{selectedCandidate.currentCompany || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Current Role: </span>
                                    <span className="font-medium text-foreground">{selectedCandidate.currentRole || "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Experience: </span>
                                    <span className="font-medium text-foreground">{selectedCandidate.experienceYears ? `${selectedCandidate.experienceYears} Years` : "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Notice Period: </span>
                                    <span className="font-medium text-foreground">{selectedCandidate.noticePeriodDays} Days</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Current CTC: </span>
                                    <span className="font-medium text-foreground">{selectedCandidate.currentSalary ? formatCurrency(selectedCandidate.currentSalary) : "N/A"}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground">Expected CTC: </span>
                                    <span className="font-medium text-emerald-600 font-semibold">{selectedCandidate.expectedSalary ? formatCurrency(selectedCandidate.expectedSalary) : "N/A"}</span>
                                </div>
                            </div>

                            {selectedCandidate.resumeUrl && (
                                <div className="p-2 border rounded bg-card flex items-center justify-between">
                                    <span className="font-medium flex items-center gap-1.5 text-muted-foreground">
                                        <FileText className="h-4 w-4" />
                                        Resume Attachment
                                    </span>
                                    <a
                                        href={selectedCandidate.resumeUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-primary hover:underline font-semibold flex items-center gap-1"
                                    >
                                        Open Resume <ExternalLink className="h-3 w-3" />
                                    </a>
                                </div>
                            )}

                            {selectedCandidate.notes && (
                                <div className="space-y-1">
                                    <span className="font-semibold text-muted-foreground">Recruiter Notes:</span>
                                    <p className="p-2.5 bg-muted/40 rounded border text-foreground">
                                        {selectedCandidate.notes}
                                    </p>
                                </div>
                            )}

                            {selectedCandidate.convertedEmployeeNumber && (
                                <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 rounded flex items-center justify-between text-emerald-800 dark:text-emerald-300">
                                    <span>Hired into Directory as Employee:</span>
                                    <span className="font-mono font-bold">{selectedCandidate.convertedEmployeeNumber}</span>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCandidateDetailOpen(false)}>
                            Close
                        </Button>
                        {selectedCandidate && selectedCandidate.stage !== "HIRED" && (
                            <Button
                                onClick={() => {
                                    setIsCandidateDetailOpen(false)
                                    openHireModal(selectedCandidate)
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                            >
                                1-Click Hire
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
