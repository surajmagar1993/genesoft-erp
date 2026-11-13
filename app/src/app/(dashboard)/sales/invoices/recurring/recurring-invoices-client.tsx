"use client"

import { confirmAction } from "@/components/confirm-dialog"
import { useTaxRegime } from "@/hooks/use-tax-regime"
import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    RecurringInvoicesOverview,
    RecurringProfileRecord,
    deleteRecurringProfile,
    toggleRecurringProfileStatus,
    triggerGenerateInvoice,
    batchRunDueRecurringProfiles,
} from "@/app/actions/sales/recurring-invoices"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
    Repeat,
    Calendar,
    Clock,
    DollarSign,
    CheckCircle2,
    AlertTriangle,
    Plus,
    Play,
    Pause,
    Trash2,
    Search,
    FileText,
    Receipt,
    Building2,
    Sparkles,
    ExternalLink,
    PieChart,
    BarChart3
} from "lucide-react"
import { RequireRole } from "@/components/auth/role-context"

interface RecurringInvoicesClientProps {
    initialData: RecurringInvoicesOverview
}

export default function RecurringInvoicesClient({ initialData }: RecurringInvoicesClientProps) {
    const { regime: moneyRegime } = useTaxRegime()
    const appLocale = moneyRegime?.locale
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // State
    // Straight from the server, so router.refresh() after a change shows it
    const data: RecurringInvoicesOverview = initialData
    const [activeTab, setActiveTab] = useState("profiles")
    const [statusFilter, setStatusFilter] = useState<string>("ALL")
    const [searchQuery, setSearchQuery] = useState("")
    const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Modals
    const [inspectingProfile, setInspectingProfile] = useState<RecurringProfileRecord | null>(null)

    // Confirmation Run Modal
    const [runConfirmProfile, setRunConfirmProfile] = useState<RecurringProfileRecord | null>(null)

    // Helper: format currency
    const formatCurrency = (val: number, currency: string = "INR") => {
        return new Intl.NumberFormat(appLocale, {
            style: "currency",
            currency: currency || "INR",
            maximumFractionDigits: 2,
        }).format(val || 0)
    }

    // Helper: format date
    // Document dates are stored at midnight UTC: show that date for every viewer (no day shift, same on server and browser)
    const formatDate = (val: string | null | undefined) => {
        if (!val) return "N/A"
        try {
            return new Date(val).toLocaleDateString("en-US", { timeZone: "UTC",
                year: "numeric",
                month: "short",
                day: "numeric",
            })
        } catch {
            return val
        }
    }

    // Helper: Days until run
    const getDaysUntilRun = (nextRunDate: string) => {
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const target = new Date(nextRunDate)
        target.setHours(0, 0, 0, 0)
        const diffMs = target.getTime() - today.getTime()
        const days = Math.round(diffMs / (1000 * 3600 * 24))
        if (days === 0) return "Runs today"
        if (days === 1) return "Runs tomorrow"
        if (days > 1) return `Runs in ${days} days`
        return `Overdue by ${Math.abs(days)} day(s)`
    }


    const handleExecuteRun = (profile: RecurringProfileRecord) => {
        startTransition(async () => {
            const res = await triggerGenerateInvoice(profile.id)
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({
                    type: "success",
                    text: `Official sales invoice ${res.invoiceNumber} created and schedule updated!`,
                })
                setRunConfirmProfile(null)
                router.refresh()
            }
        })
    }

    // Batch run due profiles
    const handleBatchRun = () => {
        startTransition(async () => {
            const res = await batchRunDueRecurringProfiles()
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({
                    type: "success",
                    text: `Batch billing run completed: ${res.executedCount || 0} invoice(s) generated!`,
                })
                router.refresh()
            }
        })
    }

    // Toggle Status
    const handleToggleStatus = (profile: RecurringProfileRecord) => {
        const nextStatus = profile.status === "ACTIVE" ? "PAUSED" : "ACTIVE"
        startTransition(async () => {
            const res = await toggleRecurringProfileStatus(profile.id, nextStatus)
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({
                    type: "success",
                    text: `Subscription ${profile.profileNumber} status changed to ${nextStatus}.`,
                })
                router.refresh()
            }
        })
    }

    // Delete Profile
    const handleDeleteProfile = async (profile: RecurringProfileRecord) => {
        if (!(await confirmAction(`Are you sure you want to delete recurring profile "${profile.title}"?`))) return
        startTransition(async () => {
            const res = await deleteRecurringProfile(profile.id)
            if (res.error) {
                setActionMessage({ type: "error", text: res.error })
            } else {
                setActionMessage({ type: "success", text: "Recurring profile deleted." })
                router.refresh()
            }
        })
    }

    // Filter profiles
    const filteredProfiles = data.profiles.filter((p) => {
        if (statusFilter !== "ALL" && p.status !== statusFilter) return false
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase()
            const matchTitle = p.title.toLowerCase().includes(q)
            const matchNum = p.profileNumber.toLowerCase().includes(q)
            const matchCust =
                p.contact.displayName.toLowerCase().includes(q) ||
                p.contact.companyName?.toLowerCase().includes(q)
            if (!matchTitle && !matchNum && !matchCust) return false
        }
        return true
    })

    return (
        <div className="space-y-6">
            {/* Feedback Banner */}
            {actionMessage && (
                <div
                    className={`p-4 rounded-xl border flex items-center justify-between text-sm transition-all duration-200 ${
                        actionMessage.type === "success"
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                            : "bg-destructive/10 border-destructive/30 text-destructive"
                    }`}
                >
                    <div className="flex items-center gap-2">
                        {actionMessage.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        ) : (
                            <AlertTriangle className="h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <span>{actionMessage.text}</span>
                    </div>
                    <button
                        onClick={() => setActionMessage(null)}
                        className="text-xs opacity-70 hover:opacity-100 underline ml-4"
                    >
                        Dismiss
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
                            <Repeat className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground">
                                Recurring Invoices & Subscriptions
                            </h1>
                            <p className="text-sm text-muted-foreground">
                                Automate client retainer contracts, cyclical subscriptions, and scheduled billing schedules.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                    <RequireRole min="MANAGER"><Button
                        variant="outline"
                        size="sm"
                        onClick={handleBatchRun}
                        disabled={isPending}
                        className="gap-1.5 shadow-sm"
                    >
                        <Sparkles className="h-4 w-4 text-amber-400" />
                        Run All Due Profiles
                    </Button></RequireRole>

                    <Button variant="default" size="sm" className="gap-1.5 shadow-sm" asChild>
                        <Link href="/sales/invoices/recurring/new">
                            <Plus className="h-4 w-4" />
                            New Recurring Schedule
                        </Link>
                    </Button>
                </div>
            </div>

            {/* 4 KPI Telemetry Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* 1. Active Subscriptions */}
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Active Retainers
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
                            <Repeat className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                            {data.kpis.activeProfiles}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            out of {data.kpis.totalProfiles} configured profiles
                        </p>
                    </CardContent>
                </Card>

                {/* 2. Monthly Recurring Revenue (MRR) */}
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Monthly Run Rate (MRR)
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight text-emerald-400">
                            {formatCurrency(data.kpis.mrr)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            ARR Pipeline: <span className="font-semibold text-foreground">{formatCurrency(data.kpis.arr)}</span>
                        </p>
                    </CardContent>
                </Card>

                {/* 3. Soonest Run Scheduled */}
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Next Run Scheduled
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                            <Calendar className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                            {data.kpis.soonestNextRun ? formatDate(data.kpis.soonestNextRun) : "None"}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.kpis.soonestNextRun ? getDaysUntilRun(data.kpis.soonestNextRun) : "No active schedules"}
                        </p>
                    </CardContent>
                </Card>

                {/* 4. Lifetime Invoices Spawned */}
                <Card className="border-border/60 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-2xl pointer-events-none" />
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Invoices Generated
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                            <Receipt className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight text-foreground">
                            {data.kpis.lifetimeInvoicesGenerated}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total Pipeline Value: {formatCurrency(data.kpis.totalRecurringValue)}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/60 p-1 border border-border/50">
                    <TabsTrigger value="profiles" className="gap-2">
                        <Repeat className="h-4 w-4" />
                        Subscription Profiles ({data.profiles.length})
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        Billing Forecast Schedule
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Generation History & Audit Log ({data.executions.length})
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="gap-2">
                        <BarChart3 className="h-4 w-4" />
                        MRR & Subscription Breakdown
                    </TabsTrigger>
                </TabsList>

                {/* ========================================================= */}
                {/* TAB 1: SUBSCRIPTION PROFILES DIRECTORY */}
                {/* ========================================================= */}
                <TabsContent value="profiles" className="space-y-4">
                    {/* Search & Status Filters */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-card rounded-xl border border-border/60 shadow-sm">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search profile title, client, or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-sm"
                            />
                        </div>

                        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
                            <div className="flex items-center bg-muted/40 p-0.5 rounded-lg border border-border/50">
                                {(["ALL", "ACTIVE", "PAUSED", "COMPLETED"] as const).map((st) => (
                                    <button
                                        key={st}
                                        onClick={() => setStatusFilter(st)}
                                        className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                                            statusFilter === st
                                                ? "bg-primary text-primary-foreground shadow-xs"
                                                : "text-muted-foreground hover:text-foreground"
                                        }`}
                                    >
                                        {st}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    {/* Profiles Grid */}
                    {filteredProfiles.length === 0 ? (
                        <Card className="p-12 text-center border-dashed border-border/60">
                            <Repeat className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
                            <h3 className="font-semibold text-base text-foreground">No recurring profiles found</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                                Create an automated subscription profile to auto-generate invoices for recurring client retainers or contracts.
                            </p>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredProfiles.map((profile) => {
                                const daysRemaining = getDaysUntilRun(profile.nextRunDate)
                                const isOverdue = daysRemaining.includes("Overdue") || daysRemaining.includes("today")

                                return (
                                    <Card
                                        key={profile.id}
                                        className="border-border/60 shadow-sm hover:border-border transition-all duration-150 flex flex-col justify-between"
                                    >
                                        <CardHeader className="pb-3">
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <code className="text-xs font-bold text-primary px-1.5 py-0.5 rounded bg-primary/10 border border-primary/20">
                                                            {profile.profileNumber}
                                                        </code>
                                                        <Badge
                                                            variant="outline"
                                                            className="text-xs uppercase font-semibold tracking-wider"
                                                        >
                                                            {profile.frequency}
                                                        </Badge>
                                                        <Badge
                                                            className={`text-xs ${
                                                                profile.status === "ACTIVE"
                                                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                                    : profile.status === "PAUSED"
                                                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                                                    : "bg-muted text-muted-foreground"
                                                            }`}
                                                        >
                                                            {profile.status}
                                                        </Badge>
                                                    </div>
                                                    <CardTitle className="text-base font-bold leading-snug pt-1">
                                                        {profile.title}
                                                    </CardTitle>
                                                    <CardDescription className="text-xs flex items-center gap-1.5">
                                                        <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                                                        <span className="font-medium text-foreground">
                                                            {profile.contact.companyName || profile.contact.displayName}
                                                        </span>
                                                    </CardDescription>
                                                </div>

                                                <div className="text-right">
                                                    <span className="text-lg font-bold text-foreground block">
                                                        {formatCurrency(profile.totalAmount, profile.currencyCode)}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">
                                                        per {profile.frequency.toLowerCase()}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardHeader>

                                        <CardContent className="space-y-3 pt-0">
                                            {/* Schedule Info Box */}
                                            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 grid grid-cols-2 gap-2 text-xs">
                                                <div>
                                                    <span className="text-xs text-muted-foreground block">
                                                        Next Scheduled Run
                                                    </span>
                                                    <div className="flex items-center gap-1 font-semibold text-foreground mt-0.5">
                                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                        {formatDate(profile.nextRunDate)}
                                                    </div>
                                                    <span
                                                        className={`text-xs block mt-0.5 ${
                                                            isOverdue ? "text-amber-400 font-semibold" : "text-muted-foreground"
                                                        }`}
                                                    >
                                                        {daysRemaining}
                                                    </span>
                                                </div>

                                                <div>
                                                    <span className="text-xs text-muted-foreground block">
                                                        Cycles Completed
                                                    </span>
                                                    <span className="font-semibold text-foreground block mt-0.5">
                                                        {profile.cyclesCompleted}{" "}
                                                        {profile.maxCycles ? `/ ${profile.maxCycles}` : "cycles"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground block mt-0.5">
                                                        Last: {formatDate(profile.lastRunDate)}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex items-center justify-between pt-1 border-t border-border/40 text-xs">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                        onClick={() => setInspectingProfile(profile)}
                                                    >
                                                        Details
                                                    </Button>
                                                    <Button size="sm" variant="ghost" className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground" asChild>
                                                        <Link href={`/sales/invoices/recurring/${profile.id}/edit`}>Edit</Link>
                                                    </Button>
                                                    <Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleToggleStatus(profile)}
                                                        disabled={isPending}
                                                    >
                                                        {profile.status === "ACTIVE" ? (
                                                            <>
                                                                <Pause className="h-3 w-3 mr-1 text-amber-400" />
                                                                Pause
                                                            </>
                                                        ) : (
                                                            <>
                                                                <Play className="h-3 w-3 mr-1 text-emerald-400" />
                                                                Resume
                                                            </>
                                                        )}
                                                    </Button>
                                                    <RequireRole min="MANAGER"><Button
                                                        size="sm"
                                                        variant="ghost"
                                                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => handleDeleteProfile(profile)}
                                                        disabled={isPending}
                                                     aria-label="Delete">
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button></RequireRole>
                                                </div>

                                                {/* RUN NOW TRIGGER */}
                                                <Button
                                                    size="sm"
                                                    variant="default"
                                                    onClick={() => setRunConfirmProfile(profile)}
                                                    disabled={isPending || profile.status === "CANCELLED"}
                                                    className="h-8 text-xs gap-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-xs"
                                                >
                                                    <Play className="h-3 w-3 fill-current" />
                                                    Run Now
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* ========================================================= */}
                {/* TAB 2: UPCOMING BILLING SCHEDULE FORECAST */}
                {/* ========================================================= */}
                <TabsContent value="schedule" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-foreground">
                                90-Day Cyclical Billing Schedule
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Chronological timeline forecast of upcoming recurring invoice generation events.
                            </p>
                        </div>
                    </div>

                    <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 border-b border-border/50 text-muted-foreground font-medium uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="p-3.5 pl-4">Next Run Date</th>
                                    <th className="p-3.5">Schedule Title</th>
                                    <th className="p-3.5">Customer Contact</th>
                                    <th className="p-3.5">Frequency</th>
                                    <th className="p-3.5">Recurring Amount</th>
                                    <th className="p-3.5">Status</th>
                                    <th className="p-3.5 text-right pr-4">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {data.profiles.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="p-6 text-center text-muted-foreground">
                                            No recurring profiles scheduled.
                                        </td>
                                    </tr>
                                ) : (
                                    [...data.profiles]
                                        .sort((a, b) => new Date(a.nextRunDate).getTime() - new Date(b.nextRunDate).getTime())
                                        .map((p) => {
                                            const daysInfo = getDaysUntilRun(p.nextRunDate)
                                            return (
                                                <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                                                    <td className="p-3.5 pl-4 font-semibold text-foreground">
                                                        <div>{formatDate(p.nextRunDate)}</div>
                                                        <span className="text-xs text-muted-foreground font-normal">
                                                            {daysInfo}
                                                        </span>
                                                    </td>
                                                    <td className="p-3.5">
                                                        <div className="font-semibold text-foreground">{p.title}</div>
                                                        <code className="text-xs text-muted-foreground">{p.profileNumber}</code>
                                                    </td>
                                                    <td className="p-3.5 text-muted-foreground">
                                                        {p.contact.companyName || p.contact.displayName}
                                                    </td>
                                                    <td className="p-3.5">
                                                        <Badge variant="outline" className="text-xs">
                                                            {p.frequency}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3.5 font-bold text-foreground">
                                                        {formatCurrency(p.totalAmount, p.currencyCode)}
                                                    </td>
                                                    <td className="p-3.5">
                                                        <Badge
                                                            className={`text-xs ${
                                                                p.status === "ACTIVE"
                                                                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                                    : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                                            }`}
                                                        >
                                                            {p.status}
                                                        </Badge>
                                                    </td>
                                                    <td className="p-3.5 text-right pr-4">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs px-2.5 gap-1"
                                                            onClick={() => setRunConfirmProfile(p)}
                                                        >
                                                            <Play className="h-3 w-3" />
                                                            Run Now
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                )}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* ========================================================= */}
                {/* TAB 3: GENERATION HISTORY & AUDIT LOG */}
                {/* ========================================================= */}
                <TabsContent value="history" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="text-base font-semibold text-foreground">
                                Invoice Generation History & Run Log
                            </h3>
                            <p className="text-xs text-muted-foreground">
                                Audited log of all sales invoices created by automated subscription schedules.
                            </p>
                        </div>
                    </div>

                    <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
                        <table className="w-full text-left text-xs">
                            <thead className="bg-muted/50 border-b border-border/50 text-muted-foreground font-medium uppercase tracking-wider text-xs">
                                <tr>
                                    <th className="p-3.5 pl-4">Run Date</th>
                                    <th className="p-3.5">Generated Invoice #</th>
                                    <th className="p-3.5">Recurring Profile Code</th>
                                    <th className="p-3.5">Billed Amount</th>
                                    <th className="p-3.5">Execution Status</th>
                                    <th className="p-3.5 text-right pr-4">Invoice Record</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/40">
                                {data.executions.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="p-6 text-center text-muted-foreground">
                                            No automated recurring invoice executions logged yet. Use &quot;Run Now&quot; to test.
                                        </td>
                                    </tr>
                                ) : (
                                    data.executions.map((exec) => (
                                        <tr key={exec.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-3.5 pl-4 font-medium text-foreground">
                                                {formatDate(exec.executionDate)}
                                            </td>
                                            <td className="p-3.5 font-bold text-foreground">
                                                {exec.invoice?.invoiceNumber || "INV-NEW"}
                                            </td>
                                            <td className="p-3.5 text-muted-foreground">
                                                <code className="text-foreground font-semibold">
                                                    {exec.recurringProfileId.substring(0, 8)}
                                                </code>
                                            </td>
                                            <td className="p-3.5 font-bold text-foreground">
                                                {formatCurrency(exec.amount)}
                                            </td>
                                            <td className="p-3.5">
                                                <Badge
                                                    className={`text-xs ${
                                                        exec.status === "SUCCESS"
                                                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                                                            : "bg-destructive/20 text-destructive border-destructive/30"
                                                    }`}
                                                >
                                                    {exec.status}
                                                </Badge>
                                            </td>
                                            <td className="p-3.5 text-right pr-4">
                                                {exec.invoiceId && (
                                                    <Link
                                                        href={`/sales/invoices/${exec.invoiceId}`}
                                                        className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-semibold"
                                                    >
                                                        View Invoice
                                                        <ExternalLink className="h-3 w-3" />
                                                    </Link>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* ========================================================= */}
                {/* TAB 4: MRR & SUBSCRIPTION ANALYTICS */}
                {/* ========================================================= */}
                <TabsContent value="analytics" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Revenue by Cadence */}
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <PieChart className="h-4 w-4 text-primary" />
                                    Subscription Frequency Breakdown
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Recurring revenue distribution grouped by customer billing cadence.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                {["MONTHLY", "QUARTERLY", "ANNUALLY"].map((cadence) => {
                                    const matching = data.profiles.filter(
                                        (p) => p.status === "ACTIVE" && p.frequency === cadence
                                    )
                                    const cadenceSum = matching.reduce((sum, p) => sum + p.totalAmount, 0)
                                    const percent =
                                        data.kpis.totalRecurringValue > 0
                                            ? Math.round((cadenceSum / data.kpis.totalRecurringValue) * 100)
                                            : 0

                                    return (
                                        <div key={cadence} className="space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="font-semibold text-foreground">
                                                    {cadence} ({matching.length} contracts)
                                                </span>
                                                <span className="font-bold text-foreground">
                                                    {formatCurrency(cadenceSum)} ({percent}%)
                                                </span>
                                            </div>
                                            <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-primary rounded-full"
                                                    style={{ width: `${percent}%` }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                            </CardContent>
                        </Card>

                        {/* Top Recurring Accounts */}
                        <Card className="border-border/60 shadow-sm">
                            <CardHeader className="pb-3">
                                <CardTitle className="text-base font-semibold flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-emerald-400" />
                                    Top Recurring Accounts
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Largest subscription accounts sorted by gross annual recurring value.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3 text-xs">
                                {data.profiles.slice(0, 5).map((p) => (
                                    <div
                                        key={p.id}
                                        className="p-2.5 rounded-lg border border-border/50 flex items-center justify-between gap-3 bg-muted/20"
                                    >
                                        <div className="space-y-0.5">
                                            <span className="font-semibold text-foreground block">
                                                {p.contact.companyName || p.contact.displayName}
                                            </span>
                                            <span className="text-xs text-muted-foreground truncate block max-w-[220px]">
                                                {p.title}
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="font-bold text-foreground block">
                                                {formatCurrency(p.totalAmount, p.currencyCode)}
                                            </span>
                                            <Badge variant="outline" className="text-xs">
                                                {p.frequency}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>

            {/* ========================================================= */}
            {/* MODAL 2: CONFIRM RUN NOW */}
            {/* ========================================================= */}
            <Dialog open={!!runConfirmProfile} onOpenChange={() => setRunConfirmProfile(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Play className="h-5 w-5 text-primary fill-current" />
                            Trigger Immediate Invoice Generation
                        </DialogTitle>
                        <DialogDescription>
                            This will immediately spawn an official sales invoice from this schedule template and advance the schedule by one period.
                        </DialogDescription>
                    </DialogHeader>

                    {runConfirmProfile && (
                        <div className="space-y-3 text-xs">
                            <div className="p-3 rounded-lg bg-muted/40 border border-border/50 space-y-1.5">
                                <div className="font-semibold text-sm text-foreground">
                                    {runConfirmProfile.title}
                                </div>
                                <div className="text-muted-foreground">
                                    Customer:{" "}
                                    <span className="font-semibold text-foreground">
                                        {runConfirmProfile.contact.companyName || runConfirmProfile.contact.displayName}
                                    </span>
                                </div>
                                <div className="text-muted-foreground">
                                    Amount:{" "}
                                    <span className="font-bold text-foreground">
                                        {formatCurrency(runConfirmProfile.totalAmount, runConfirmProfile.currencyCode)}
                                    </span>
                                </div>
                                <div className="text-muted-foreground">
                                    Current Cycle: {runConfirmProfile.cyclesCompleted} completed
                                </div>
                            </div>

                            <p className="text-muted-foreground text-xs">
                                Once triggered, a new <code className="text-foreground font-semibold">INV-YYYY-XXXX</code> record will be registered in Sales Invoices with linked ledger entries.
                            </p>
                        </div>
                    )}

                    <DialogFooter className="pt-2">
                        <Button
                            variant="outline"
                            onClick={() => setRunConfirmProfile(null)}
                            disabled={isPending}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={() => runConfirmProfile && handleExecuteRun(runConfirmProfile)}
                            disabled={isPending}
                            className="bg-gradient-to-r from-blue-600 to-indigo-600"
                        >
                            Generate Invoice Now
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ========================================================= */}
            {/* MODAL 3: INSPECT PROFILE DETAILS */}
            {/* ========================================================= */}
            <Dialog open={!!inspectingProfile} onOpenChange={() => setInspectingProfile(null)}>
                <DialogContent className="sm:max-w-xl">
                    <DialogHeader>
                        <DialogTitle>Recurring Schedule Details</DialogTitle>
                        <DialogDescription>
                            {inspectingProfile?.profileNumber} — {inspectingProfile?.title}
                        </DialogDescription>
                    </DialogHeader>

                    {inspectingProfile && (
                        <div className="space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40 text-xs">
                                <div>
                                    <span className="text-muted-foreground block text-xs">Client</span>
                                    <span className="font-semibold text-foreground">
                                        {inspectingProfile.contact.companyName || inspectingProfile.contact.displayName}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Cadence</span>
                                    <span className="font-semibold text-foreground">
                                        {inspectingProfile.frequency}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Start Date</span>
                                    <span className="text-foreground">{formatDate(inspectingProfile.startDate)}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Next Scheduled Run</span>
                                    <span className="font-semibold text-primary">{formatDate(inspectingProfile.nextRunDate)}</span>
                                </div>
                            </div>

                            {/* Items */}
                            <div>
                                <span className="font-semibold text-foreground block mb-2">Itemized Schedule Template</span>
                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                    {inspectingProfile.items.map((i) => (
                                        <div
                                            key={i.id}
                                            className="p-2.5 rounded border border-border/50 flex items-center justify-between text-xs"
                                        >
                                            <div>
                                                <span className="font-medium text-foreground block">{i.description}</span>
                                                <span className="text-xs text-muted-foreground">
                                                    Qty: {i.quantity} × {formatCurrency(i.unitPrice)} • GST: {i.cgstRate + i.sgstRate}%
                                                </span>
                                            </div>
                                            <span className="font-bold text-foreground">
                                                {formatCurrency(i.lineTotal)}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {inspectingProfile.notes && (
                                <div>
                                    <span className="font-semibold text-foreground block">Notes</span>
                                    <p className="text-muted-foreground mt-0.5">{inspectingProfile.notes}</p>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
