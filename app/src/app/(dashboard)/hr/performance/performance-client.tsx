"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    Award,
    Star,
    Target,
    GraduationCap,
    TrendingUp,
    CheckCircle2,
    Clock,
    Calendar,
    Users,
    BookOpen,
    Plus,
    Search,
    SlidersHorizontal,
    Filter,
    ExternalLink,
    ShieldCheck,
    Sparkles,
    BadgeCheck,
    RefreshCw,
    UserCheck,
    ChevronRight,
    FileText,
    MoreHorizontal,
    PlayCircle,
    Check,
    X,
    AlertCircle,
    BarChart3,
    ArrowUpRight,
    Lightbulb,
    Smile,
    Briefcase
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
    PerformanceOverviewData,
    AppraisalCycleRecord,
    PerformanceReviewRecord,
    EmployeeGoalRecord,
    TrainingProgramRecord,
    TrainingEnrollmentRecord,
    createAppraisalCycle,
    updateAppraisalCycleStatus,
    createPerformanceReview,
    submitReviewSelfEvaluation,
    submitReviewManagerEvaluation,
    createEmployeeGoal,
    updateGoalProgress,
    createTrainingProgram,
    updateTrainingProgramStatus,
    enrollEmployeeInTraining,
    updateEnrollmentStatus
} from "@/app/actions/hr/performance"
import {
    AppraisalCycleStatus,
    ReviewStatus,
    GoalCategory,
    GoalStatus,
    TrainingCategory,
    TrainingMode,
    TrainingProgramStatus,
    EnrollmentStatus
} from "@prisma/client"

interface PerformanceClientProps {
    initialData: PerformanceOverviewData
}

export function PerformanceClient({ initialData }: PerformanceClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<"reviews" | "goals" | "training" | "enrollments">("reviews")

    // Filter states
    const [reviewSearch, setReviewSearch] = useState("")
    const [cycleFilter, setCycleFilter] = useState<string>("all")
    const [reviewStatusFilter, setReviewStatusFilter] = useState<string>("all")

    const [goalSearch, setGoalSearch] = useState("")
    const [goalCategoryFilter, setGoalCategoryFilter] = useState<string>("all")
    const [goalStatusFilter, setGoalStatusFilter] = useState<string>("all")

    const [trainingSearch, setTrainingSearch] = useState("")
    const [trainingCategoryFilter, setTrainingCategoryFilter] = useState<string>("all")

    // Modals
    const [isNewCycleOpen, setIsNewCycleOpen] = useState(false)
    const [isNewReviewOpen, setIsNewReviewOpen] = useState(false)
    const [isConductReviewOpen, setIsConductReviewOpen] = useState(false)
    const [isNewGoalOpen, setIsNewGoalOpen] = useState(false)
    const [isNewProgramOpen, setIsNewProgramOpen] = useState(false)
    const [isEnrollOpen, setIsEnrollOpen] = useState(false)
    const [isGradeOpen, setIsGradeOpen] = useState(false)

    // Form States: New Appraisal Cycle
    const [cycleForm, setCycleForm] = useState({
        title: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        description: ""
    })

    // Form States: Initiate Review
    const [reviewForm, setReviewForm] = useState({
        cycleId: initialData.cycles[0]?.id || "",
        employeeId: initialData.employees[0]?.id || "",
        reviewerId: ""
    })

    // Form States: Conduct Review
    const [selectedReview, setSelectedReview] = useState<PerformanceReviewRecord | null>(null)
    const [evalMode, setEvalMode] = useState<"self" | "manager">("manager")
    const [selfEvalForm, setSelfEvalForm] = useState({
        selfRating: 4,
        selfFeedback: ""
    })
    const [mgrEvalForm, setMgrEvalForm] = useState({
        managerRating: 4,
        finalRating: 4,
        managerFeedback: "",
        strengths: "",
        areasOfImprovement: "",
        promotionRecommended: false,
        competencies: {
            jobKnowledge: 4,
            workQuality: 4,
            initiative: 4,
            communication: 4,
            teamwork: 4
        }
    })

    // Form States: New Goal
    const [goalForm, setGoalForm] = useState({
        employeeId: initialData.employees[0]?.id || "",
        cycleId: initialData.cycles[0]?.id || "",
        title: "",
        description: "",
        category: "PERFORMANCE" as GoalCategory,
        targetMetric: "",
        weightage: 25,
        dueDate: format(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
    })

    // Form States: New Training Program
    const [programForm, setProgramForm] = useState({
        title: "",
        category: "TECHNICAL" as TrainingCategory,
        trainer: "",
        durationHours: 8,
        mode: "ONLINE" as TrainingMode,
        description: "",
        syllabusUrl: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        maxParticipants: 20
    })

    // Form States: Enroll
    const [enrollProgramId, setEnrollProgramId] = useState(initialData.programs[0]?.id || "")
    const [enrollEmployeeId, setEnrollEmployeeId] = useState(initialData.employees[0]?.id || "")

    // Form States: Grade Enrollment
    const [selectedEnrollment, setSelectedEnrollment] = useState<TrainingEnrollmentRecord | null>(null)
    const [gradeForm, setGradeForm] = useState({
        status: "COMPLETED" as EnrollmentStatus,
        score: 90,
        feedback: "",
        certificateUrl: ""
    })

    // Filtered lists
    const filteredReviews = useMemo(() => {
        return initialData.reviews.filter(r => {
            const matchesSearch =
                reviewSearch === "" ||
                r.employeeName.toLowerCase().includes(reviewSearch.toLowerCase()) ||
                r.employeeNumber.toLowerCase().includes(reviewSearch.toLowerCase()) ||
                r.reviewCode.toLowerCase().includes(reviewSearch.toLowerCase())
            const matchesCycle = cycleFilter === "all" || r.cycleId === cycleFilter
            const matchesStatus = reviewStatusFilter === "all" || r.status === reviewStatusFilter
            return matchesSearch && matchesCycle && matchesStatus
        })
    }, [initialData.reviews, reviewSearch, cycleFilter, reviewStatusFilter])

    const filteredGoals = useMemo(() => {
        return initialData.goals.filter(g => {
            const matchesSearch =
                goalSearch === "" ||
                g.title.toLowerCase().includes(goalSearch.toLowerCase()) ||
                g.employeeName.toLowerCase().includes(goalSearch.toLowerCase())
            const matchesCategory = goalCategoryFilter === "all" || g.category === goalCategoryFilter
            const matchesStatus = goalStatusFilter === "all" || g.status === goalStatusFilter
            return matchesSearch && matchesCategory && matchesStatus
        })
    }, [initialData.goals, goalSearch, goalCategoryFilter, goalStatusFilter])

    const filteredPrograms = useMemo(() => {
        return initialData.programs.filter(p => {
            const matchesSearch =
                trainingSearch === "" ||
                p.title.toLowerCase().includes(trainingSearch.toLowerCase()) ||
                p.programCode.toLowerCase().includes(trainingSearch.toLowerCase())
            const matchesCategory = trainingCategoryFilter === "all" || p.category === trainingCategoryFilter
            return matchesSearch && matchesCategory
        })
    }, [initialData.programs, trainingSearch, trainingCategoryFilter])

    // Handlers
    const handleCreateCycle = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!cycleForm.title.trim()) return toast.error("Please enter a cycle title")

        startTransition(async () => {
            const res = await createAppraisalCycle(cycleForm)
            if (res.success) {
                toast.success("Appraisal cycle created successfully")
                setIsNewCycleOpen(false)
                setCycleForm({
                    title: "",
                    startDate: format(new Date(), "yyyy-MM-dd"),
                    endDate: format(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
                    description: ""
                })
                router.refresh()
            } else {
                toast.error(res.error || "Failed to create cycle")
            }
        })
    }

    const handleCreateReview = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!reviewForm.cycleId) return toast.error("Please select an appraisal cycle")
        if (!reviewForm.employeeId) return toast.error("Please select an employee")

        startTransition(async () => {
            const res = await createPerformanceReview(reviewForm)
            if (res.success) {
                toast.success("Performance review initiated")
                setIsNewReviewOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to create review")
            }
        })
    }

    const handleOpenConductReview = (review: PerformanceReviewRecord) => {
        setSelectedReview(review)
        setSelfEvalForm({
            selfRating: review.selfRating || 4,
            selfFeedback: review.selfFeedback || ""
        })
        setMgrEvalForm({
            managerRating: review.managerRating || 4,
            finalRating: review.finalRating || review.managerRating || 4,
            managerFeedback: review.managerFeedback || "",
            strengths: review.strengths || "",
            areasOfImprovement: review.areasOfImprovement || "",
            promotionRecommended: review.promotionRecommended,
            competencies: {
                jobKnowledge: review.competencies?.jobKnowledge || 4,
                workQuality: review.competencies?.workQuality || 4,
                initiative: review.competencies?.initiative || 4,
                communication: review.competencies?.communication || 4,
                teamwork: review.competencies?.teamwork || 4
            }
        })
        setEvalMode(review.status === ReviewStatus.SELF_REVIEW ? "self" : "manager")
        setIsConductReviewOpen(true)
    }

    const handleSubmitSelfEvaluation = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedReview) return

        startTransition(async () => {
            const res = await submitReviewSelfEvaluation({
                reviewId: selectedReview.id,
                selfRating: selfEvalForm.selfRating,
                selfFeedback: selfEvalForm.selfFeedback
            })
            if (res.success) {
                toast.success("Self evaluation submitted to manager for review")
                setIsConductReviewOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to submit self evaluation")
            }
        })
    }

    const handleSubmitManagerEvaluation = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedReview) return

        startTransition(async () => {
            const res = await submitReviewManagerEvaluation({
                reviewId: selectedReview.id,
                managerRating: mgrEvalForm.managerRating,
                finalRating: mgrEvalForm.finalRating,
                managerFeedback: mgrEvalForm.managerFeedback,
                strengths: mgrEvalForm.strengths,
                areasOfImprovement: mgrEvalForm.areasOfImprovement,
                promotionRecommended: mgrEvalForm.promotionRecommended,
                competencies: mgrEvalForm.competencies
            })
            if (res.success) {
                toast.success("Appraisal completed and calibrated score recorded")
                setIsConductReviewOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to finalize review")
            }
        })
    }

    const handleCreateGoal = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!goalForm.title.trim()) return toast.error("Please enter a goal title")

        startTransition(async () => {
            const res = await createEmployeeGoal(goalForm)
            if (res.success) {
                toast.success("Employee goal created")
                setIsNewGoalOpen(false)
                setGoalForm({
                    employeeId: initialData.employees[0]?.id || "",
                    cycleId: initialData.cycles[0]?.id || "",
                    title: "",
                    description: "",
                    category: "PERFORMANCE",
                    targetMetric: "",
                    weightage: 25,
                    dueDate: format(new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), "yyyy-MM-dd")
                })
                router.refresh()
            } else {
                toast.error(res.error || "Failed to create goal")
            }
        })
    }

    const handleQuickGoalProgress = async (goalId: string, currentProgress: number, delta: number) => {
        const nextProgress = Math.min(100, Math.max(0, currentProgress + delta))
        startTransition(async () => {
            const res = await updateGoalProgress(goalId, nextProgress)
            if (res.success) {
                toast.success(`Progress updated to ${nextProgress}%`)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to update progress")
            }
        })
    }

    const handleCreateProgram = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!programForm.title.trim()) return toast.error("Please enter course title")

        startTransition(async () => {
            const res = await createTrainingProgram(programForm)
            if (res.success) {
                toast.success("Training program created")
                setIsNewProgramOpen(false)
                setProgramForm({
                    title: "",
                    category: "TECHNICAL",
                    trainer: "",
                    durationHours: 8,
                    mode: "ONLINE",
                    description: "",
                    syllabusUrl: "",
                    startDate: format(new Date(), "yyyy-MM-dd"),
                    endDate: format(new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
                    maxParticipants: 20
                })
                router.refresh()
            } else {
                toast.error(res.error || "Failed to create program")
            }
        })
    }

    const handleEnroll = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!enrollProgramId || !enrollEmployeeId) return toast.error("Please select program and employee")

        startTransition(async () => {
            const res = await enrollEmployeeInTraining(enrollProgramId, enrollEmployeeId)
            if (res.success) {
                toast.success("Employee enrolled in training")
                setIsEnrollOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to enroll")
            }
        })
    }

    const handleOpenGrade = (enrollment: TrainingEnrollmentRecord) => {
        setSelectedEnrollment(enrollment)
        setGradeForm({
            status: enrollment.status,
            score: enrollment.score || 90,
            feedback: enrollment.feedback || "",
            certificateUrl: enrollment.certificateUrl || ""
        })
        setIsGradeOpen(true)
    }

    const handleSubmitGrade = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedEnrollment) return

        startTransition(async () => {
            const res = await updateEnrollmentStatus({
                enrollmentId: selectedEnrollment.id,
                status: gradeForm.status,
                score: gradeForm.score,
                feedback: gradeForm.feedback,
                certificateUrl: gradeForm.certificateUrl
            })
            if (res.success) {
                toast.success("Training outcome and certification updated")
                setIsGradeOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to update grade")
            }
        })
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-600/10 text-indigo-600 dark:text-indigo-400">
                            <Award className="h-5 w-5" />
                        </div>
                        <h1 className="text-2xl font-bold tracking-tight">Performance & Training</h1>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        360 appraisal cycles, employee OKRs & goals, competency scoring, and corporate learning certifications.
                    </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => startTransition(() => router.refresh())}
                        disabled={isPending}
                    >
                        <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                        <Link href="/hr/portal">
                            <UserCheck className="mr-1.5 h-3.5 w-3.5 text-primary" />
                            Employee Portal
                        </Link>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsNewCycleOpen(true)}
                    >
                        <Calendar className="mr-1.5 h-3.5 w-3.5" />
                        New Cycle
                    </Button>
                    <Button
                        size="sm"
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                        onClick={() => setIsNewReviewOpen(true)}
                    >
                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                        Conduct Appraisal
                    </Button>
                </div>
            </div>

            {/* KPI Telemetry Grid */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Appraisal Completion
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                            <Award className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.completedReviewsCount} / {initialData.telemetry.totalReviewsCount}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <Progress value={initialData.telemetry.reviewCompletionRate} className="h-2 flex-1" />
                            <span className="text-xs font-semibold text-muted-foreground">
                                {initialData.telemetry.reviewCompletionRate}%
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Average Org Rating
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Star className="h-4 w-4 fill-amber-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-baseline gap-2">
                            <span className="text-2xl font-bold">
                                {initialData.telemetry.avgOrgRating > 0 ? initialData.telemetry.avgOrgRating : "—"}
                            </span>
                            <span className="text-xs text-muted-foreground">/ 5.0 Rating</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Calibrated across {initialData.telemetry.totalReviewsCount} employee reviews
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Goals & OKRs
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <Target className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.activeGoalsCount}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                            <Progress value={initialData.telemetry.avgGoalProgress} className="h-2 flex-1 bg-emerald-100 dark:bg-emerald-950 [&>div]:bg-emerald-600" />
                            <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                                {initialData.telemetry.avgGoalProgress}% avg
                            </span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Corporate Training
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <GraduationCap className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.certifiedEmployeesCount} Certified
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {initialData.telemetry.activeProgramsCount} courses • {initialData.telemetry.totalEnrollmentsCount} total enrollments
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as any)} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 sm:flex sm:w-auto h-auto p-1 gap-1">
                    <TabsTrigger value="reviews" className="flex items-center gap-2">
                        <Award className="h-4 w-4 text-indigo-600" />
                        <span>Appraisals & Reviews</span>
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                            {initialData.reviews.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="goals" className="flex items-center gap-2">
                        <Target className="h-4 w-4 text-emerald-600" />
                        <span>Goals & OKRs</span>
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                            {initialData.goals.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="training" className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4 text-blue-600" />
                        <span>Training Catalog</span>
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                            {initialData.programs.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="enrollments" className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4 text-purple-600" />
                        <span>Certifications & Enrollments</span>
                        <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                            {initialData.enrollments.length}
                        </Badge>
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: Appraisals & Reviews */}
                <TabsContent value="reviews" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Performance Review Roster</CardTitle>
                                    <CardDescription>
                                        Manager evaluations, employee self-reviews, and calibrated final scores.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative w-full sm:w-56">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search review / employee..."
                                            value={reviewSearch}
                                            onChange={(e) => setReviewSearch(e.target.value)}
                                            className="pl-8 text-xs h-9"
                                        />
                                    </div>
                                    <Select value={cycleFilter} onValueChange={setCycleFilter}>
                                        <SelectTrigger className="w-full sm:w-44 text-xs h-9">
                                            <SelectValue placeholder="All Cycles" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Cycles</SelectItem>
                                            {initialData.cycles.map(c => (
                                                <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <Select value={reviewStatusFilter} onValueChange={setReviewStatusFilter}>
                                        <SelectTrigger className="w-full sm:w-36 text-xs h-9">
                                            <SelectValue placeholder="All Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Status</SelectItem>
                                            <SelectItem value="DRAFT">Draft</SelectItem>
                                            <SelectItem value="SELF_REVIEW">Self Review</SelectItem>
                                            <SelectItem value="MANAGER_REVIEW">Manager Review</SelectItem>
                                            <SelectItem value="COMPLETED">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="rounded-md border-t overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="font-semibold text-xs">Review Code</TableHead>
                                            <TableHead className="font-semibold text-xs">Employee</TableHead>
                                            <TableHead className="font-semibold text-xs">Cycle</TableHead>
                                            <TableHead className="font-semibold text-xs">Reviewer</TableHead>
                                            <TableHead className="font-semibold text-xs text-center">Self Rating</TableHead>
                                            <TableHead className="font-semibold text-xs text-center">Manager Rating</TableHead>
                                            <TableHead className="font-semibold text-xs text-center">Final Rating</TableHead>
                                            <TableHead className="font-semibold text-xs">Status</TableHead>
                                            <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredReviews.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="h-32 text-center text-muted-foreground text-sm">
                                                    No performance reviews found. Click &quot;Conduct Appraisal&quot; to initiate a review.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredReviews.map((r) => (
                                                <TableRow key={r.id} className="hover:bg-muted/40 transition-colors">
                                                    <TableCell className="font-mono text-xs font-semibold text-indigo-600">
                                                        {r.reviewCode}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-xs">{r.employeeName}</div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {r.employeeNumber} {r.departmentName ? `• ${r.departmentName}` : ""}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-medium">{r.cycleTitle}</div>
                                                        <div className="text-[10px] font-mono text-muted-foreground">{r.cycleCode}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {r.reviewerName || "Unassigned"}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        {r.selfRating ? (
                                                            <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 dark:bg-slate-900">
                                                                ⭐ {r.selfRating}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[11px]">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        {r.managerRating ? (
                                                            <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 dark:bg-slate-900">
                                                                ⭐ {r.managerRating}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[11px]">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        {r.finalRating ? (
                                                            <Badge className="font-mono text-[11px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300">
                                                                ⭐ {r.finalRating}
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[11px]">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-[10px] font-medium ${
                                                                r.status === "COMPLETED"
                                                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                                    : r.status === "MANAGER_REVIEW"
                                                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                                    : r.status === "SELF_REVIEW"
                                                                    ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                                                    : "bg-slate-500/10 text-slate-700 dark:text-slate-400"
                                                            }`}
                                                        >
                                                            {r.status.replace("_", " ")}
                                                        </Badge>
                                                        {r.promotionRecommended && (
                                                            <Badge variant="outline" className="ml-1 text-[9px] border-purple-400 text-purple-600">
                                                                PROMO
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-7 px-2"
                                                            onClick={() => handleOpenConductReview(r)}
                                                        >
                                                            <SlidersHorizontal className="mr-1 h-3 w-3" />
                                                            {r.status === "COMPLETED" ? "View / Calibrate" : "Evaluate"}
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: Goals & OKRs */}
                <TabsContent value="goals" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Employee Goals & Objectives (OKRs)</CardTitle>
                                    <CardDescription>
                                        Track weighted key results, progress completion, and target milestones.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative w-full sm:w-56">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search goals..."
                                            value={goalSearch}
                                            onChange={(e) => setGoalSearch(e.target.value)}
                                            className="pl-8 text-xs h-9"
                                        />
                                    </div>
                                    <Select value={goalCategoryFilter} onValueChange={setGoalCategoryFilter}>
                                        <SelectTrigger className="w-full sm:w-36 text-xs h-9">
                                            <SelectValue placeholder="All Categories" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Categories</SelectItem>
                                            <SelectItem value="PERFORMANCE">Performance</SelectItem>
                                            <SelectItem value="DEVELOPMENT">Development</SelectItem>
                                            <SelectItem value="LEADERSHIP">Leadership</SelectItem>
                                            <SelectItem value="PROJECT">Project</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Button size="sm" onClick={() => setIsNewGoalOpen(true)} className="text-xs h-9">
                                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                                        New Goal
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {filteredGoals.length === 0 ? (
                                    <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground text-sm">
                                        No goals found. Click &quot;New Goal&quot; to set an OKR.
                                    </div>
                                ) : (
                                    filteredGoals.map((g) => (
                                        <Card key={g.id} className="border-border/60 shadow-xs flex flex-col justify-between">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Badge variant="outline" className="text-[10px] font-mono">
                                                        {g.goalCode}
                                                    </Badge>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[10px] ${
                                                            g.category === "PERFORMANCE"
                                                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                                                : g.category === "DEVELOPMENT"
                                                                ? "bg-purple-500/10 text-purple-700 dark:text-purple-400"
                                                                : g.category === "LEADERSHIP"
                                                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                                : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                        }`}
                                                    >
                                                        {g.category}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-sm font-semibold mt-2 line-clamp-1">
                                                    {g.title}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {g.description || "No description provided."}
                                                </p>
                                            </CardHeader>
                                            <CardContent className="space-y-3 pt-0">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span className="font-medium text-foreground">{g.employeeName}</span>
                                                    <span>Weight: {g.weightage}%</span>
                                                </div>

                                                {g.targetMetric && (
                                                    <div className="bg-muted/40 p-2 rounded text-[11px] text-muted-foreground border">
                                                        🎯 <span className="font-medium text-foreground">Target:</span> {g.targetMetric}
                                                    </div>
                                                )}

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs font-semibold">
                                                        <span>Progress</span>
                                                        <span className={g.progress === 100 ? "text-emerald-600" : ""}>
                                                            {g.progress}%
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={g.progress}
                                                        className={`h-2 ${g.progress === 100 ? "[&>div]:bg-emerald-600" : ""}`}
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between pt-1 border-t text-xs">
                                                    <span className="text-muted-foreground text-[10px]">
                                                        {g.dueDate ? `Due ${format(new Date(g.dueDate), "dd MMM yyyy")}` : "No due date"}
                                                    </span>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 px-1.5 text-[10px]"
                                                            onClick={() => handleQuickGoalProgress(g.id, g.progress, -10)}
                                                            disabled={g.progress <= 0 || isPending}
                                                        >
                                                            -10%
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-6 px-1.5 text-[10px]"
                                                            onClick={() => handleQuickGoalProgress(g.id, g.progress, 10)}
                                                            disabled={g.progress >= 100 || isPending}
                                                        >
                                                            +10%
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            className="h-6 px-2 text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white"
                                                            onClick={() => handleQuickGoalProgress(g.id, g.progress, 100 - g.progress)}
                                                            disabled={g.progress === 100 || isPending}
                                                        >
                                                            Done
                                                        </Button>
                                                    </div>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: Training Catalog */}
                <TabsContent value="training" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Training Catalog & Courses</CardTitle>
                                    <CardDescription>
                                        Corporate training programs, skill workshops, and compliance modules.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative w-full sm:w-56">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search courses..."
                                            value={trainingSearch}
                                            onChange={(e) => setTrainingSearch(e.target.value)}
                                            className="pl-8 text-xs h-9"
                                        />
                                    </div>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-xs h-9"
                                        onClick={() => setIsEnrollOpen(true)}
                                    >
                                        <Users className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                        Enroll Employee
                                    </Button>
                                    <Button size="sm" onClick={() => setIsNewProgramOpen(true)} className="text-xs h-9">
                                        <Plus className="mr-1.5 h-3.5 w-3.5" />
                                        New Program
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {filteredPrograms.length === 0 ? (
                                    <div className="col-span-full h-32 flex items-center justify-center text-muted-foreground text-sm">
                                        No training programs found. Click &quot;New Program&quot; to publish a course.
                                    </div>
                                ) : (
                                    filteredPrograms.map((p) => (
                                        <Card key={p.id} className="border-border/60 shadow-xs flex flex-col justify-between">
                                            <CardHeader className="pb-2">
                                                <div className="flex items-center justify-between gap-2">
                                                    <Badge variant="outline" className="text-[10px] font-mono">
                                                        {p.programCode}
                                                    </Badge>
                                                    <Badge
                                                        variant="secondary"
                                                        className={`text-[10px] ${
                                                            p.status === "ACTIVE"
                                                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                                : p.status === "UPCOMING"
                                                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                                                : "bg-slate-500/10 text-slate-700 dark:text-slate-400"
                                                        }`}
                                                    >
                                                        {p.status}
                                                    </Badge>
                                                </div>
                                                <CardTitle className="text-base font-semibold mt-2 line-clamp-1">
                                                    {p.title}
                                                </CardTitle>
                                                <p className="text-xs text-muted-foreground line-clamp-2">
                                                    {p.description || "No course description provided."}
                                                </p>
                                            </CardHeader>
                                            <CardContent className="space-y-3 pt-0">
                                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                    <span>Trainer: {p.trainer || "Internal Faculty"}</span>
                                                    <span>{p.durationHours ? `${p.durationHours} hrs` : "Self-paced"}</span>
                                                </div>

                                                <div className="flex items-center gap-2">
                                                    <Badge variant="outline" className="text-[10px] bg-slate-50 dark:bg-slate-900">
                                                        {p.mode}
                                                    </Badge>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {p.category}
                                                    </Badge>
                                                </div>

                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-xs">
                                                        <span className="text-muted-foreground">Capacity</span>
                                                        <span className="font-semibold">
                                                            {p.enrollmentsCount} / {p.maxParticipants} enrolled
                                                        </span>
                                                    </div>
                                                    <Progress
                                                        value={(p.enrollmentsCount / p.maxParticipants) * 100}
                                                        className="h-1.5"
                                                    />
                                                </div>

                                                <div className="flex items-center justify-between pt-2 border-t">
                                                    <span className="text-xs text-emerald-600 font-medium">
                                                        {p.completedCount} completed
                                                    </span>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-7 text-xs"
                                                        onClick={() => {
                                                            setEnrollProgramId(p.id)
                                                            setIsEnrollOpen(true)
                                                        }}
                                                    >
                                                        Enroll Staff
                                                    </Button>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: Certifications & Enrollments */}
                <TabsContent value="enrollments" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Staff Training Enrollments & Certifications</CardTitle>
                                    <CardDescription>
                                        Track employee enrollment progress, assessment scores, and completion certificates.
                                    </CardDescription>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="rounded-md border-t overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/30">
                                            <TableHead className="font-semibold text-xs">Employee</TableHead>
                                            <TableHead className="font-semibold text-xs">Course</TableHead>
                                            <TableHead className="font-semibold text-xs">Enrolled Date</TableHead>
                                            <TableHead className="font-semibold text-xs">Status</TableHead>
                                            <TableHead className="font-semibold text-xs text-center">Score</TableHead>
                                            <TableHead className="font-semibold text-xs">Certification</TableHead>
                                            <TableHead className="font-semibold text-xs text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {initialData.enrollments.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={7} className="h-32 text-center text-muted-foreground text-sm">
                                                    No employee enrollments found. Go to the Training Catalog tab to enroll staff.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            initialData.enrollments.map((e) => (
                                                <TableRow key={e.id} className="hover:bg-muted/40 transition-colors">
                                                    <TableCell>
                                                        <div className="font-medium text-xs">{e.employeeName}</div>
                                                        <div className="text-[10px] text-muted-foreground">
                                                            {e.employeeNumber} {e.departmentName ? `• ${e.departmentName}` : ""}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        <div className="font-medium">{e.programTitle}</div>
                                                        <div className="text-[10px] font-mono text-muted-foreground">{e.programCode}</div>
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {format(new Date(e.enrolledAt), "dd MMM yyyy")}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge
                                                            variant="secondary"
                                                            className={`text-[10px] font-medium ${
                                                                e.status === "COMPLETED"
                                                                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                                                                    : e.status === "IN_PROGRESS"
                                                                    ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                                                                    : e.status === "DROPPED"
                                                                    ? "bg-rose-500/10 text-rose-700 dark:text-rose-400"
                                                                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                                                            }`}
                                                        >
                                                            {e.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center text-xs">
                                                        {e.score !== null ? (
                                                            <Badge variant="outline" className="font-mono text-[11px] bg-slate-50 dark:bg-slate-900">
                                                                {e.score}%
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[11px]">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {e.status === "COMPLETED" ? (
                                                            <div className="flex items-center gap-1 text-emerald-600 font-medium">
                                                                <BadgeCheck className="h-4 w-4" />
                                                                <span>Certified</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[11px]">Pending Completion</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-xs h-7 px-2"
                                                            onClick={() => handleOpenGrade(e)}
                                                        >
                                                            <GraduationCap className="mr-1 h-3.5 w-3.5" />
                                                            Grade / Complete
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* DIALOG 1: New Appraisal Cycle */}
            <Dialog open={isNewCycleOpen} onOpenChange={setIsNewCycleOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Appraisal Cycle</DialogTitle>
                        <DialogDescription>
                            Initiate a performance evaluation cycle for your organization.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateCycle} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Cycle Title</Label>
                            <Input
                                placeholder="e.g. Q1 2026 Performance Appraisal"
                                value={cycleForm.title}
                                onChange={(e) => setCycleForm({ ...cycleForm, title: e.target.value })}
                                className="text-xs h-9"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Start Date</Label>
                                <Input
                                    type="date"
                                    value={cycleForm.startDate}
                                    onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                                    className="text-xs h-9"
                                    required
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">End Date</Label>
                                <Input
                                    type="date"
                                    value={cycleForm.endDate}
                                    onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                                    className="text-xs h-9"
                                    required
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Description / Guidelines</Label>
                            <Textarea
                                placeholder="Instructions for employees and evaluating managers..."
                                value={cycleForm.description}
                                onChange={(e) => setCycleForm({ ...cycleForm, description: e.target.value })}
                                className="text-xs h-20"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewCycleOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={isPending}>
                                Create Cycle
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DIALOG 2: Initiate Review */}
            <Dialog open={isNewReviewOpen} onOpenChange={setIsNewReviewOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Initiate Performance Review</DialogTitle>
                        <DialogDescription>
                            Assign an employee and reviewer to an active appraisal cycle.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateReview} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Appraisal Cycle</Label>
                            <Select
                                value={reviewForm.cycleId}
                                onValueChange={(val) => setReviewForm({ ...reviewForm, cycleId: val })}
                            >
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue placeholder="Select Cycle" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.cycles.map(c => (
                                        <SelectItem key={c.id} value={c.id}>{c.title} ({c.cycleCode})</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Employee</Label>
                            <Select
                                value={reviewForm.employeeId}
                                onValueChange={(val) => setReviewForm({ ...reviewForm, employeeId: val })}
                            >
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue placeholder="Select Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.displayName} ({e.employeeNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Reviewer / Manager (Optional)</Label>
                            <Select
                                value={reviewForm.reviewerId}
                                onValueChange={(val) => setReviewForm({ ...reviewForm, reviewerId: val })}
                            >
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue placeholder="Auto-assign reporting manager" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">Auto-assign reporting manager</SelectItem>
                                    {initialData.employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.displayName} ({e.employeeNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewReviewOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={isPending}>
                                Initiate Review
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DIALOG 3: Conduct Review (Dual Mode: Self vs Manager) */}
            <Dialog open={isConductReviewOpen} onOpenChange={setIsConductReviewOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <div>
                                <DialogTitle>Conduct Appraisal: {selectedReview?.employeeName}</DialogTitle>
                                <DialogDescription>
                                    {selectedReview?.reviewCode} • {selectedReview?.cycleTitle}
                                </DialogDescription>
                            </div>
                            <div className="flex items-center gap-1 bg-muted p-1 rounded-lg">
                                <Button
                                    type="button"
                                    variant={evalMode === "self" ? "default" : "ghost"}
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setEvalMode("self")}
                                >
                                    Self Review
                                </Button>
                                <Button
                                    type="button"
                                    variant={evalMode === "manager" ? "default" : "ghost"}
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setEvalMode("manager")}
                                >
                                    Manager Evaluation
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {evalMode === "self" ? (
                        <form onSubmit={handleSubmitSelfEvaluation} className="space-y-4 py-2">
                            <div className="bg-blue-500/10 p-3 rounded-lg border border-blue-500/20 text-xs text-blue-900 dark:text-blue-300">
                                💡 <span className="font-semibold">Self Assessment:</span> Reflect on your key accomplishments, challenges faced, and rate your overall delivery during this review cycle.
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Self Rating (1.0 to 5.0 Stars)</Label>
                                <div className="flex items-center gap-3">
                                    <input
                                        type="range"
                                        min="1"
                                        max="5"
                                        step="0.5"
                                        value={selfEvalForm.selfRating}
                                        onChange={(e) => setSelfEvalForm({ ...selfEvalForm, selfRating: parseFloat(e.target.value) })}
                                        className="w-full accent-indigo-600"
                                    />
                                    <span className="font-mono text-sm font-bold w-12 text-center bg-muted py-1 rounded">
                                        ⭐ {selfEvalForm.selfRating}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Self Feedback & Deliverables Completed</Label>
                                <Textarea
                                    placeholder="Describe your achievements, completed milestones, and skills enhanced..."
                                    value={selfEvalForm.selfFeedback}
                                    onChange={(e) => setSelfEvalForm({ ...selfEvalForm, selfFeedback: e.target.value })}
                                    className="text-xs h-28"
                                    required
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsConductReviewOpen(false)}>
                                    Close
                                </Button>
                                <Button type="submit" size="sm" disabled={isPending}>
                                    Submit Self Evaluation
                                </Button>
                            </DialogFooter>
                        </form>
                    ) : (
                        <form onSubmit={handleSubmitManagerEvaluation} className="space-y-4 py-2">
                            <div className="bg-indigo-500/10 p-3 rounded-lg border border-indigo-500/20 text-xs text-indigo-900 dark:text-indigo-300">
                                🔍 <span className="font-semibold">Manager Scoring & Calibration:</span> Review self-evaluation, score key competencies, recommend promotions, and calibrate the final performance rating.
                            </div>

                            {selectedReview?.selfRating && (
                                <div className="bg-muted/40 p-3 rounded border space-y-1 text-xs">
                                    <div className="flex justify-between font-medium">
                                        <span>Employee Self Rating: ⭐ {selectedReview.selfRating} / 5.0</span>
                                    </div>
                                    {selectedReview.selfFeedback && (
                                        <p className="text-muted-foreground italic text-[11px]">
                                            &ldquo;{selectedReview.selfFeedback}&rdquo;
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Competency Ratings */}
                            <div className="space-y-2 border rounded-lg p-3 bg-muted/20">
                                <Label className="text-xs font-semibold">Core Competencies Scoring (1-5)</Label>
                                <div className="grid grid-cols-2 gap-3 text-xs">
                                    {Object.entries(mgrEvalForm.competencies).map(([key, val]) => (
                                        <div key={key} className="space-y-1">
                                            <div className="flex justify-between text-[11px] font-medium capitalize">
                                                <span>{key.replace(/([A-Z])/g, " $1")}</span>
                                                <span className="font-mono">{val} ★</span>
                                            </div>
                                            <input
                                                type="range"
                                                min="1"
                                                max="5"
                                                value={val}
                                                onChange={(e) =>
                                                    setMgrEvalForm({
                                                        ...mgrEvalForm,
                                                        competencies: {
                                                            ...mgrEvalForm.competencies,
                                                            [key]: parseInt(e.target.value)
                                                        }
                                                    })
                                                }
                                                className="w-full accent-indigo-600 h-1.5"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Manager Rating (1-5)</Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            step="0.5"
                                            value={mgrEvalForm.managerRating}
                                            onChange={(e) => setMgrEvalForm({ ...mgrEvalForm, managerRating: parseFloat(e.target.value) })}
                                            className="w-full accent-indigo-600"
                                        />
                                        <span className="font-mono text-xs font-bold w-10 text-center bg-muted py-1 rounded">
                                            ⭐ {mgrEvalForm.managerRating}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Final Calibrated Rating</Label>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            step="0.5"
                                            value={mgrEvalForm.finalRating}
                                            onChange={(e) => setMgrEvalForm({ ...mgrEvalForm, finalRating: parseFloat(e.target.value) })}
                                            className="w-full accent-amber-600"
                                        />
                                        <span className="font-mono text-xs font-bold w-10 text-center bg-amber-500/20 text-amber-800 dark:text-amber-400 py-1 rounded border border-amber-300">
                                            ⭐ {mgrEvalForm.finalRating}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Key Strengths</Label>
                                    <Textarea
                                        placeholder="Excellence in delivery, mentor to peers..."
                                        value={mgrEvalForm.strengths}
                                        onChange={(e) => setMgrEvalForm({ ...mgrEvalForm, strengths: e.target.value })}
                                        className="text-xs h-16"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Areas of Improvement</Label>
                                    <Textarea
                                        placeholder="Target areas for Q2 growth..."
                                        value={mgrEvalForm.areasOfImprovement}
                                        onChange={(e) => setMgrEvalForm({ ...mgrEvalForm, areasOfImprovement: e.target.value })}
                                        className="text-xs h-16"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Manager Feedback & Development Plan</Label>
                                <Textarea
                                    placeholder="Comprehensive evaluation summary and recommended milestones..."
                                    value={mgrEvalForm.managerFeedback}
                                    onChange={(e) => setMgrEvalForm({ ...mgrEvalForm, managerFeedback: e.target.value })}
                                    className="text-xs h-20"
                                    required
                                />
                            </div>

                            <div className="flex items-center space-x-2 pt-1">
                                <input
                                    type="checkbox"
                                    id="promotion"
                                    checked={mgrEvalForm.promotionRecommended}
                                    onChange={(e) => setMgrEvalForm({ ...mgrEvalForm, promotionRecommended: e.target.checked })}
                                    className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <Label htmlFor="promotion" className="text-xs font-medium cursor-pointer">
                                    Recommend employee for promotion / salary band increment
                                </Label>
                            </div>

                            <DialogFooter className="pt-2">
                                <Button type="button" variant="outline" size="sm" onClick={() => setIsConductReviewOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white" disabled={isPending}>
                                    Finalize Appraisal
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* DIALOG 4: New Goal / OKR */}
            <Dialog open={isNewGoalOpen} onOpenChange={setIsNewGoalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Set Employee Goal (OKR)</DialogTitle>
                        <DialogDescription>
                            Create a measurable objective with progress tracking and weightage.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateGoal} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Employee</Label>
                            <Select
                                value={goalForm.employeeId}
                                onValueChange={(val) => setGoalForm({ ...goalForm, employeeId: val })}
                            >
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue placeholder="Select Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.displayName} ({e.employeeNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Goal Title</Label>
                            <Input
                                placeholder="e.g. Implement automated test coverage >= 85%"
                                value={goalForm.title}
                                onChange={(e) => setGoalForm({ ...goalForm, title: e.target.value })}
                                className="text-xs h-9"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Category</Label>
                                <Select
                                    value={goalForm.category}
                                    onValueChange={(val: GoalCategory) => setGoalForm({ ...goalForm, category: val })}
                                >
                                    <SelectTrigger className="text-xs h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PERFORMANCE">Performance</SelectItem>
                                        <SelectItem value="DEVELOPMENT">Development</SelectItem>
                                        <SelectItem value="LEADERSHIP">Leadership</SelectItem>
                                        <SelectItem value="PROJECT">Project</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Weightage (%)</Label>
                                <Input
                                    type="number"
                                    min="5"
                                    max="100"
                                    value={goalForm.weightage}
                                    onChange={(e) => setGoalForm({ ...goalForm, weightage: parseInt(e.target.value) || 25 })}
                                    className="text-xs h-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Target Metric / Measurable Outcome</Label>
                            <Input
                                placeholder="e.g. Zero critical bugs in release & 100% on-time delivery"
                                value={goalForm.targetMetric}
                                onChange={(e) => setGoalForm({ ...goalForm, targetMetric: e.target.value })}
                                className="text-xs h-9"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Appraisal Cycle (Optional)</Label>
                                <Select
                                    value={goalForm.cycleId}
                                    onValueChange={(val) => setGoalForm({ ...goalForm, cycleId: val })}
                                >
                                    <SelectTrigger className="text-xs h-9">
                                        <SelectValue placeholder="Link cycle" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">Standalone Goal</SelectItem>
                                        {initialData.cycles.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Due Date</Label>
                                <Input
                                    type="date"
                                    value={goalForm.dueDate}
                                    onChange={(e) => setGoalForm({ ...goalForm, dueDate: e.target.value })}
                                    className="text-xs h-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Description</Label>
                            <Textarea
                                placeholder="Key results and execution steps..."
                                value={goalForm.description}
                                onChange={(e) => setGoalForm({ ...goalForm, description: e.target.value })}
                                className="text-xs h-16"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewGoalOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={isPending}>
                                Set Goal
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DIALOG 5: New Training Program */}
            <Dialog open={isNewProgramOpen} onOpenChange={setIsNewProgramOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Training Course</DialogTitle>
                        <DialogDescription>
                            Publish a corporate training course or technical workshop.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateProgram} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Course Title</Label>
                            <Input
                                placeholder="e.g. Cloud Architecture & Microservices Masterclass"
                                value={programForm.title}
                                onChange={(e) => setProgramForm({ ...programForm, title: e.target.value })}
                                className="text-xs h-9"
                                required
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Category</Label>
                                <Select
                                    value={programForm.category}
                                    onValueChange={(val: TrainingCategory) => setProgramForm({ ...programForm, category: val })}
                                >
                                    <SelectTrigger className="text-xs h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="TECHNICAL">Technical</SelectItem>
                                        <SelectItem value="COMPLIANCE">Compliance</SelectItem>
                                        <SelectItem value="LEADERSHIP">Leadership</SelectItem>
                                        <SelectItem value="SOFT_SKILLS">Soft Skills</SelectItem>
                                        <SelectItem value="PRODUCT">Product</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Delivery Mode</Label>
                                <Select
                                    value={programForm.mode}
                                    onValueChange={(val: TrainingMode) => setProgramForm({ ...programForm, mode: val })}
                                >
                                    <SelectTrigger className="text-xs h-9">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="ONLINE">Online (Virtual)</SelectItem>
                                        <SelectItem value="CLASSROOM">Classroom (Onsite)</SelectItem>
                                        <SelectItem value="HYBRID">Hybrid</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Trainer / Faculty</Label>
                                <Input
                                    placeholder="e.g. Lead Architect"
                                    value={programForm.trainer}
                                    onChange={(e) => setProgramForm({ ...programForm, trainer: e.target.value })}
                                    className="text-xs h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Duration (Hours)</Label>
                                <Input
                                    type="number"
                                    step="0.5"
                                    value={programForm.durationHours}
                                    onChange={(e) => setProgramForm({ ...programForm, durationHours: parseFloat(e.target.value) || 8 })}
                                    className="text-xs h-9"
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Max Participants</Label>
                                <Input
                                    type="number"
                                    value={programForm.maxParticipants}
                                    onChange={(e) => setProgramForm({ ...programForm, maxParticipants: parseInt(e.target.value) || 20 })}
                                    className="text-xs h-9"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Start Date</Label>
                                <Input
                                    type="date"
                                    value={programForm.startDate}
                                    onChange={(e) => setProgramForm({ ...programForm, startDate: e.target.value })}
                                    className="text-xs h-9"
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Course Description</Label>
                            <Textarea
                                placeholder="Syllabus, prerequisites, and learning objectives..."
                                value={programForm.description}
                                onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                                className="text-xs h-16"
                            />
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsNewProgramOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={isPending}>
                                Publish Program
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DIALOG 6: Enroll Staff */}
            <Dialog open={isEnrollOpen} onOpenChange={setIsEnrollOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Enroll Employee in Training</DialogTitle>
                        <DialogDescription>
                            Assign staff member to an active corporate training program.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleEnroll} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Training Course</Label>
                            <Select
                                value={enrollProgramId}
                                onValueChange={setEnrollProgramId}
                            >
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue placeholder="Select Course" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.programs.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.title} ({p.enrollmentsCount}/{p.maxParticipants})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Employee</Label>
                            <Select
                                value={enrollEmployeeId}
                                onValueChange={setEnrollEmployeeId}
                            >
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue placeholder="Select Employee" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.employees.map(e => (
                                        <SelectItem key={e.id} value={e.id}>
                                            {e.displayName} ({e.employeeNumber})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsEnrollOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" disabled={isPending}>
                                Enroll Now
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* DIALOG 7: Grade & Certification */}
            <Dialog open={isGradeOpen} onOpenChange={setIsGradeOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Grade & Certification: {selectedEnrollment?.employeeName}</DialogTitle>
                        <DialogDescription>
                            {selectedEnrollment?.programTitle} ({selectedEnrollment?.programCode})
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmitGrade} className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Enrollment Status</Label>
                            <Select
                                value={gradeForm.status}
                                onValueChange={(val: EnrollmentStatus) => setGradeForm({ ...gradeForm, status: val })}
                            >
                                <SelectTrigger className="text-xs h-9">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ENROLLED">Enrolled</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                    <SelectItem value="COMPLETED">Completed (Pass & Certified)</SelectItem>
                                    <SelectItem value="DROPPED">Dropped</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Assessment Score (%)</Label>
                            <Input
                                type="number"
                                min="0"
                                max="100"
                                value={gradeForm.score}
                                onChange={(e) => setGradeForm({ ...gradeForm, score: parseFloat(e.target.value) || 0 })}
                                className="text-xs h-9 font-mono"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Instructor Feedback / Remarks</Label>
                            <Textarea
                                placeholder="Student performance, practical lab results..."
                                value={gradeForm.feedback}
                                onChange={(e) => setGradeForm({ ...gradeForm, feedback: e.target.value })}
                                className="text-xs h-20"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => setIsGradeOpen(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700 text-white" disabled={isPending}>
                                Record Outcome
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
