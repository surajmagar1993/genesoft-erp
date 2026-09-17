"use client"

import { useState, useTransition } from "react"
import {
    Zap,
    Play,
    Plus,
    RotateCcw,
    CheckCircle2,
    XCircle,
    Clock,
    AlertCircle,
    Activity,
    Settings2,
    Sliders,
    Trash2,
    Edit,
    Search,
    Filter,
    ArrowRight,
    Mail,
    Bell,
    CheckSquare,
    Globe,
    RefreshCw,
    Sparkles,
    ShieldAlert,
    ExternalLink,
    ChevronRight,
    Layers,
    Terminal,
    Eye,
    Copy,
    Share2,
    FileText
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { format, formatDistanceToNow } from "date-fns"
import type {
    TriggerCategory,
    TriggerEventType,
    ActionType,
    WorkflowCondition,
    WorkflowAction,
    WorkflowRuleItem,
    WorkflowExecutionItem
} from "@/types/workflows"
import {
    TRIGGER_CATALOG,
    PREBUILT_RECIPES
} from "@/types/workflows"
import {
    createWorkflowRule,
    updateWorkflowRule,
    toggleWorkflowRuleActive,
    deleteWorkflowRule,
    installPrebuiltRecipe,
    runWorkflowSimulator
} from "@/app/actions/settings/workflows"

const CATEGORY_COLORS: Record<TriggerCategory, { badge: string; border: string; bg: string }> = {
    SALES: { badge: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30", border: "border-emerald-500/20", bg: "bg-emerald-500/5" },
    CRM: { badge: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/30", border: "border-violet-500/20", bg: "bg-violet-500/5" },
    INVENTORY: { badge: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30", border: "border-amber-500/20", bg: "bg-amber-500/5" },
    FINANCE: { badge: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30", border: "border-indigo-500/20", bg: "bg-indigo-500/5" },
    HR: { badge: "bg-pink-500/15 text-pink-600 dark:text-pink-400 border-pink-500/30", border: "border-pink-500/20", bg: "bg-pink-500/5" },
    SUPPORT: { badge: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30", border: "border-blue-500/20", bg: "bg-blue-500/5" },
}

interface WorkflowsClientProps {
    initialRules: WorkflowRuleItem[]
    initialExecutions: WorkflowExecutionItem[]
    initialStats: {
        totalRules: number
        activeRules: number
        totalExecutions: number
        successfulExecutions: number
        failedExecutions: number
        successRate: number
        latestExecution: WorkflowExecutionItem | null
    }
}

export function WorkflowsClient({
    initialRules,
    initialExecutions,
    initialStats
}: WorkflowsClientProps) {
    const [isPending, startTransition] = useTransition()
    const [rules, setRules] = useState<WorkflowRuleItem[]>(initialRules)
    const [executions, setExecutions] = useState<WorkflowExecutionItem[]>(initialExecutions)
    const [stats, setStats] = useState(initialStats)

    // Filters
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
    const [searchQuery, setSearchQuery] = useState<string>("")
    const [activeTab, setActiveTab] = useState<string>("rules")
    const [executionStatusFilter, setExecutionStatusFilter] = useState<string>("ALL")

    // Modals
    const [isBuilderOpen, setIsBuilderOpen] = useState<boolean>(false)
    const [isRecipesOpen, setIsRecipesOpen] = useState<boolean>(false)
    const [isInspectOpen, setIsInspectOpen] = useState<boolean>(false)
    const [inspectExecution, setInspectExecution] = useState<WorkflowExecutionItem | null>(null)
    const [editingRuleId, setEditingRuleId] = useState<string | null>(null)

    // Builder Form State
    const [formName, setFormName] = useState<string>("")
    const [formDescription, setFormDescription] = useState<string>("")
    const [formTrigger, setFormTrigger] = useState<TriggerEventType>("INVOICE_OVERDUE")
    const [formConditions, setFormConditions] = useState<WorkflowCondition[]>([
        { field: "daysOverdue", operator: "greater_than", value: 3 }
    ])
    const [formActions, setFormActions] = useState<WorkflowAction[]>([
        { actionType: "SEND_NOTIFICATION", params: { recipientRole: "ADMIN", message: "Automated workflow notification." } }
    ])
    const [formIsActive, setFormIsActive] = useState<boolean>(true)

    // Simulator State
    const [simSelectedWorkflowId, setSimSelectedWorkflowId] = useState<string>(
        initialRules.length > 0 ? initialRules[0].id : ""
    )
    const [simPayloadJson, setSimPayloadJson] = useState<string>(
        JSON.stringify(
            {
                id: "INV-2026-9041",
                customerName: "Acme Global Solutions",
                total: 85000,
                balanceDue: 85000,
                daysOverdue: 7,
                status: "OVERDUE"
            },
            null,
            2
        )
    )
    const [simResult, setSimResult] = useState<{
        success: boolean
        conditionMet: boolean
        status: string
        executedActions: any[]
        durationMs: number
        reason?: string
        error?: string
    } | null>(null)

    const selectedTriggerMeta = TRIGGER_CATALOG.find(t => t.event === formTrigger) || TRIGGER_CATALOG[0]

    // Filter rules
    const filteredRules = rules.filter(rule => {
        const matchesCategory = selectedCategory === "ALL" || (() => {
            const meta = TRIGGER_CATALOG.find(t => t.event === rule.triggerEvent)
            return meta?.category === selectedCategory
        })()
        const matchesSearch =
            searchQuery.trim() === "" ||
            rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            rule.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (rule.description && rule.description.toLowerCase().includes(searchQuery.toLowerCase()))

        return matchesCategory && matchesSearch
    })

    // Filter executions
    const filteredExecutions = executions.filter(exec => {
        if (executionStatusFilter === "ALL") return true
        return exec.status === executionStatusFilter
    })

    // Handler: Toggle Rule Active Status
    const handleToggleActive = (ruleId: string, currentStatus: boolean) => {
        const newStatus = !currentStatus
        setRules(prev =>
            prev.map(r => (r.id === ruleId ? { ...r, isActive: newStatus } : r))
        )
        setStats(prev => ({
            ...prev,
            activeRules: newStatus ? prev.activeRules + 1 : prev.activeRules - 1
        }))

        startTransition(async () => {
            const res = await toggleWorkflowRuleActive(ruleId, newStatus)
            if (res.success) {
                toast.success(newStatus ? "Workflow activated" : "Workflow paused")
            } else {
                toast.error(res.error || "Failed to update workflow state")
                // Revert
                setRules(prev =>
                    prev.map(r => (r.id === ruleId ? { ...r, isActive: currentStatus } : r))
                )
                setStats(prev => ({
                    ...prev,
                    activeRules: currentStatus ? prev.activeRules + 1 : prev.activeRules - 1
                }))
            }
        })
    }

    // Handler: Delete Rule
    const handleDeleteRule = (ruleId: string) => {
        if (!confirm("Are you sure you want to delete this workflow rule? This will also remove its execution logs.")) return

        const previousRules = [...rules]
        setRules(prev => prev.filter(r => r.id !== ruleId))
        setStats(prev => ({ ...prev, totalRules: prev.totalRules - 1 }))

        startTransition(async () => {
            const res = await deleteWorkflowRule(ruleId)
            if (res.success) {
                toast.success("Workflow rule deleted")
            } else {
                toast.error(res.error || "Failed to delete workflow rule")
                setRules(previousRules)
                setStats(prev => ({ ...prev, totalRules: prev.totalRules + 1 }))
            }
        })
    }

    // Handler: Open Builder for Edit
    const handleOpenEdit = (rule: WorkflowRuleItem) => {
        setEditingRuleId(rule.id)
        setFormName(rule.name)
        setFormDescription(rule.description || "")
        setFormTrigger(rule.triggerEvent)
        setFormConditions(rule.conditions.length > 0 ? rule.conditions : [{ field: "amount", operator: "greater_than", value: 1000 }])
        setFormActions(rule.actions.length > 0 ? rule.actions : [{ actionType: "SEND_NOTIFICATION", params: { recipientRole: "ADMIN", message: "Automated alert" } }])
        setFormIsActive(rule.isActive)
        setIsBuilderOpen(true)
    }

    // Handler: Open Builder for New
    const handleOpenNew = () => {
        setEditingRuleId(null)
        setFormName("")
        setFormDescription("")
        setFormTrigger("INVOICE_OVERDUE")
        setFormConditions([{ field: "daysOverdue", operator: "greater_than", value: 3 }])
        setFormActions([{ actionType: "SEND_NOTIFICATION", params: { recipientRole: "ADMIN", message: "Customer invoice is overdue." } }])
        setFormIsActive(true)
        setIsBuilderOpen(true)
    }

    // Handler: Save Rule (Create or Update)
    const handleSaveRule = () => {
        if (!formName.trim()) {
            toast.error("Please provide a workflow name")
            return
        }

        const triggerMeta = TRIGGER_CATALOG.find(t => t.event === formTrigger)
        const entityType = triggerMeta?.entityType || "GENERAL"

        startTransition(async () => {
            if (editingRuleId) {
                const res = await updateWorkflowRule(editingRuleId, {
                    name: formName,
                    description: formDescription,
                    triggerEvent: formTrigger,
                    entityType,
                    conditions: formConditions,
                    actions: formActions,
                    isActive: formIsActive
                })
                if (res.success && res.rule) {
                    setRules(prev => prev.map(r => r.id === editingRuleId ? res.rule! : r))
                    toast.success("Workflow rule updated successfully")
                    setIsBuilderOpen(false)
                } else {
                    toast.error(res.error || "Failed to update workflow rule")
                }
            } else {
                const res = await createWorkflowRule({
                    name: formName,
                    description: formDescription,
                    triggerEvent: formTrigger,
                    entityType,
                    conditions: formConditions,
                    actions: formActions,
                    isActive: formIsActive
                })
                if (res.success && res.rule) {
                    setRules(prev => [res.rule!, ...prev])
                    setStats(prev => ({
                        ...prev,
                        totalRules: prev.totalRules + 1,
                        activeRules: formIsActive ? prev.activeRules + 1 : prev.activeRules
                    }))
                    toast.success("Workflow rule created successfully")
                    setIsBuilderOpen(false)
                } else {
                    toast.error(res.error || "Failed to create workflow rule")
                }
            }
        })
    }

    // Handler: Install Recipe
    const handleInstallRecipe = (recipeName: string) => {
        startTransition(async () => {
            const res = await installPrebuiltRecipe(recipeName)
            if (res.success && res.rule) {
                setRules(prev => [res.rule!, ...prev])
                setStats(prev => ({
                    ...prev,
                    totalRules: prev.totalRules + 1,
                    activeRules: prev.activeRules + 1
                }))
                toast.success(`Installed recipe: "${recipeName}"`)
                setIsRecipesOpen(false)
            } else {
                toast.error(res.error || "Failed to install recipe")
            }
        })
    }

    // Handler: Condition helpers
    const addCondition = () => {
        const availableField = selectedTriggerMeta.fields[0]?.key || "amount"
        setFormConditions(prev => [
            ...prev,
            { field: availableField, operator: "greater_than", value: 0 }
        ])
    }

    const removeCondition = (index: number) => {
        setFormConditions(prev => prev.filter((_, i) => i !== index))
    }

    const updateCondition = (index: number, key: keyof WorkflowCondition, val: any) => {
        setFormConditions(prev =>
            prev.map((c, i) => (i === index ? { ...c, [key]: val } : c))
        )
    }

    // Handler: Action helpers
    const addAction = () => {
        setFormActions(prev => [
            ...prev,
            { actionType: "SEND_NOTIFICATION", params: { recipientRole: "ADMIN", message: "Automated workflow alert." } }
        ])
    }

    const removeAction = (index: number) => {
        setFormActions(prev => prev.filter((_, i) => i !== index))
    }

    const updateActionType = (index: number, type: ActionType) => {
        setFormActions(prev =>
            prev.map((a, i) => {
                if (i !== index) return a
                let defaultParams: any = {}
                if (type === "SEND_NOTIFICATION") defaultParams = { recipientRole: "ADMIN", message: "Workflow notification alert." }
                if (type === "SEND_EMAIL") defaultParams = { emailSubject: "Automated Notification", emailBody: "Please see attached update." }
                if (type === "CREATE_TASK") defaultParams = { taskTitle: "Follow up on automated workflow", taskPriority: "HIGH", taskDueDays: 2 }
                if (type === "CALL_WEBHOOK") defaultParams = { webhookUrl: "https://api.external.com/webhooks/listener" }
                if (type === "UPDATE_STATUS") defaultParams = { newStatus: "PROCESSED" }
                return { actionType: type, params: defaultParams }
            })
        )
    }

    const updateActionParam = (index: number, paramKey: string, val: any) => {
        setFormActions(prev =>
            prev.map((a, i) => (i === index ? { ...a, params: { ...a.params, [paramKey]: val } } : a))
        )
    }

    // Handler: Simulator Run
    const handleRunSimulation = () => {
        if (!simSelectedWorkflowId) {
            toast.error("Please select a workflow rule to simulate")
            return
        }

        let parsedPayload: any = {}
        try {
            parsedPayload = JSON.parse(simPayloadJson)
        } catch (e) {
            toast.error("Invalid JSON payload in simulator")
            return
        }

        startTransition(async () => {
            const res = await runWorkflowSimulator(simSelectedWorkflowId, parsedPayload)
            setSimResult(res)

            if (res.success) {
                if (res.conditionMet) {
                    toast.success("Simulation passed! Actions dispatched.")
                } else {
                    toast.warning("Simulation executed: conditions were not met (Skipped).")
                }

                // Add to executions feed
                const selectedRule = rules.find(r => r.id === simSelectedWorkflowId)
                const newExec: WorkflowExecutionItem = {
                    id: "sim-" + Date.now(),
                    workflowId: simSelectedWorkflowId,
                    workflowName: selectedRule?.name || "Simulated Rule",
                    triggerEvent: selectedRule?.triggerEvent || "EVENT",
                    entityId: parsedPayload.id || parsedPayload.code || "SIM-MOCK",
                    status: res.status as any,
                    executedActions: res.executedActions,
                    errorDetails: res.reason || null,
                    executionDurationMs: res.durationMs,
                    createdAt: new Date()
                }
                setExecutions(prev => [newExec, ...prev])
                setStats(prev => ({
                    ...prev,
                    totalExecutions: prev.totalExecutions + 1,
                    successfulExecutions: res.status === "SUCCESS" ? prev.successfulExecutions + 1 : prev.successfulExecutions
                }))
            } else {
                toast.error(res.error || "Simulation error")
            }
        })
    }

    // Helpers: Pre-fill payload for Simulator when changing workflow
    const handleSelectSimWorkflow = (workflowId: string) => {
        setSimSelectedWorkflowId(workflowId)
        const rule = rules.find(r => r.id === workflowId)
        if (!rule) return

        let mock: any = {}
        if (rule.triggerEvent === "INVOICE_OVERDUE") {
            mock = { id: "INV-2026-9041", customerName: "Acme Global Solutions", total: 85000, balanceDue: 85000, daysOverdue: 7, status: "OVERDUE" }
        } else if (rule.triggerEvent === "STOCK_LOW") {
            mock = { id: "ITM-902", sku: "IND-ROUTER-V2", category: "Hardware", stock: 3, reorderLevel: 10 }
        } else if (rule.triggerEvent === "DEAL_WON") {
            mock = { id: "OPP-5021", dealName: "Enterprise Tier Upgrade", amount: 150000, stage: "WON" }
        } else if (rule.triggerEvent === "LEAD_CREATED") {
            mock = { id: "LED-1092", company: "Omega Logistics Ltd", leadScore: 82, source: "Web Form" }
        } else if (rule.triggerEvent === "TICKET_CREATED") {
            mock = { id: "TCK-801", subject: "Critical Database Connection Latency", priority: "URGENT", category: "Infrastructure" }
        } else if (rule.triggerEvent === "EXPENSE_SUBMITTED") {
            mock = { id: "EXP-301", payee: "Cloud Computing Server Host", amount: 64000, category: "Hosting" }
        } else {
            mock = { id: "REC-100", amount: 25000, status: "PENDING" }
        }

        setSimPayloadJson(JSON.stringify(mock, null, 2))
        setSimResult(null)
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-16">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border/40 pb-5">
                <div>
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <Zap className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                                Workflow Automation
                                <Badge variant="outline" className="text-[10px] font-mono tracking-widest uppercase bg-primary/5 text-primary border-primary/20">
                                    Enterprise Engine
                                </Badge>
                            </h1>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Orchestrate event triggers, conditional business rules, and multi-channel actions across your workspace.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsRecipesOpen(true)}
                        className="gap-2 border-primary/30 hover:bg-primary/5 text-xs font-semibold"
                    >
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Browse Recipes
                    </Button>
                    <Button
                        size="sm"
                        onClick={handleOpenNew}
                        className="gap-2 text-xs font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                        <Plus className="h-3.5 w-3.5" />
                        New Workflow
                    </Button>
                </div>
            </div>

            {/* KPI Ribbon */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border border-border/60 shadow-sm bg-gradient-to-br from-card to-card/80">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Workflows</p>
                            <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalRules}</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                {stats.activeRules} active · {stats.totalRules - stats.activeRules} paused
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                            <Layers className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-gradient-to-br from-card to-card/80">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Automations</p>
                            <h3 className="text-2xl font-bold mt-1 text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                                {stats.activeRules}
                                <span className="relative flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                </span>
                            </h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                Live trigger listeners active
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                            <Zap className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-gradient-to-br from-card to-card/80">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Dispatched Runs</p>
                            <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.totalExecutions}</h3>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                                Last 30 days execution log
                            </p>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                            <Activity className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border border-border/60 shadow-sm bg-gradient-to-br from-card to-card/80">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Health & Success Rate</p>
                            <h3 className="text-2xl font-bold mt-1 text-foreground">{stats.successRate}%</h3>
                            <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden mt-1.5">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.successRate}%` }}></div>
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-xl bg-violet-500/10 flex items-center justify-center text-violet-600 dark:text-violet-400">
                            <CheckCircle2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/60 p-1 border border-border/50">
                    <TabsTrigger value="rules" className="gap-2 text-xs font-semibold">
                        <Layers className="h-3.5 w-3.5" />
                        Active Workflows ({rules.length})
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2 text-xs font-semibold">
                        <Activity className="h-3.5 w-3.5" />
                        Execution Audit Log ({executions.length})
                    </TabsTrigger>
                    <TabsTrigger value="simulator" className="gap-2 text-xs font-semibold">
                        <Terminal className="h-3.5 w-3.5" />
                        Rule Simulator & Dry Run
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: RULES */}
                <TabsContent value="rules" className="space-y-4">
                    {/* Filter & Search Bar */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card border border-border/60 p-3 rounded-xl shadow-sm">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search workflows by name or code..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                            {(["ALL", "SALES", "CRM", "INVENTORY", "FINANCE", "HR", "SUPPORT"] as const).map(cat => (
                                <Button
                                    key={cat}
                                    variant={selectedCategory === cat ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setSelectedCategory(cat)}
                                    className="h-8 px-2.5 text-[11px] font-semibold"
                                >
                                    {cat}
                                </Button>
                            ))}
                        </div>
                    </div>

                    {/* Rules Grid */}
                    {filteredRules.length === 0 ? (
                        <div className="p-12 text-center rounded-2xl border border-dashed border-border/70 bg-card/50">
                            <Zap className="h-10 w-10 text-muted-foreground/50 mx-auto mb-3" />
                            <h4 className="text-base font-semibold text-foreground">No workflow rules found</h4>
                            <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1 mb-4">
                                {searchQuery ? "No workflows match your search filters." : "Create your first workflow or install from our enterprise recipes gallery."}
                            </p>
                            <div className="flex items-center justify-center gap-2">
                                <Button size="sm" onClick={() => setIsRecipesOpen(true)} variant="outline" className="text-xs">
                                    <Sparkles className="h-3.5 w-3.5 mr-1 text-primary" /> Browse Recipes
                                </Button>
                                <Button size="sm" onClick={handleOpenNew} className="text-xs">
                                    <Plus className="h-3.5 w-3.5 mr-1" /> New Workflow
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredRules.map(rule => {
                                const meta = TRIGGER_CATALOG.find(t => t.event === rule.triggerEvent)
                                const catColor = meta ? CATEGORY_COLORS[meta.category] : CATEGORY_COLORS.SALES

                                return (
                                    <Card
                                        key={rule.id}
                                        className={`border transition-all duration-200 hover:shadow-md ${rule.isActive ? catColor.border : "border-border/60 opacity-80"}`}
                                    >
                                        <CardHeader className="p-4 pb-3">
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-[11px] font-bold text-muted-foreground px-1.5 py-0.5 rounded bg-muted">
                                                        {rule.code}
                                                    </span>
                                                    {meta && (
                                                        <Badge variant="outline" className={`text-[10px] font-medium border ${catColor.badge}`}>
                                                            {meta.category} · {meta.label}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1.5">
                                                    <Switch
                                                        checked={rule.isActive}
                                                        onCheckedChange={() => handleToggleActive(rule.id, rule.isActive)}
                                                        title={rule.isActive ? "Pause workflow" : "Activate workflow"}
                                                    />
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground">
                                                                <Settings2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="text-xs">
                                                            <DropdownMenuLabel>Workflow Actions</DropdownMenuLabel>
                                                            <DropdownMenuItem onClick={() => handleOpenEdit(rule)}>
                                                                <Edit className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Edit Configuration
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => {
                                                                    handleSelectSimWorkflow(rule.id)
                                                                    setActiveTab("simulator")
                                                                }}
                                                            >
                                                                <Terminal className="h-3.5 w-3.5 mr-2 text-muted-foreground" /> Test in Simulator
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteRule(rule.id)}
                                                                className="text-red-600 focus:text-red-600"
                                                            >
                                                                <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete Workflow
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>

                                            <CardTitle className="text-sm font-semibold mt-2.5 line-clamp-1">
                                                {rule.name}
                                            </CardTitle>
                                            {rule.description && (
                                                <CardDescription className="text-xs line-clamp-2 mt-0.5">
                                                    {rule.description}
                                                </CardDescription>
                                            )}
                                        </CardHeader>

                                        <CardContent className="p-4 pt-1 space-y-2.5 text-xs">
                                            {/* Conditions preview */}
                                            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    Criteria ({rule.conditions.length})
                                                </p>
                                                <div className="flex flex-wrap gap-1">
                                                    {rule.conditions.length === 0 ? (
                                                        <span className="text-muted-foreground italic text-[11px]">Always triggers</span>
                                                    ) : (
                                                        rule.conditions.map((cond, i) => (
                                                            <Badge key={i} variant="secondary" className="font-mono text-[10px] py-0 px-1.5 font-normal">
                                                                {cond.field} {cond.operator === "greater_than" ? ">" : cond.operator === "less_than" ? "<" : cond.operator === "equals" ? "==" : cond.operator} {String(cond.value)}
                                                            </Badge>
                                                        ))
                                                    )}
                                                </div>
                                            </div>

                                            {/* Actions preview */}
                                            <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 space-y-1">
                                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    Actions Pipeline ({rule.actions.length})
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {rule.actions.map((act, i) => (
                                                        <div
                                                            key={i}
                                                            className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded bg-background border border-border/60"
                                                        >
                                                            {act.actionType === "SEND_NOTIFICATION" && <Bell className="h-3 w-3 text-primary" />}
                                                            {act.actionType === "SEND_EMAIL" && <Mail className="h-3 w-3 text-emerald-500" />}
                                                            {act.actionType === "CREATE_TASK" && <CheckSquare className="h-3 w-3 text-amber-500" />}
                                                            {act.actionType === "CALL_WEBHOOK" && <Globe className="h-3 w-3 text-blue-500" />}
                                                            {act.actionType === "UPDATE_STATUS" && <RefreshCw className="h-3 w-3 text-violet-500" />}
                                                            <span>
                                                                {act.actionType === "SEND_NOTIFICATION" && "In-App Notice"}
                                                                {act.actionType === "SEND_EMAIL" && "Email"}
                                                                {act.actionType === "CREATE_TASK" && "Task"}
                                                                {act.actionType === "CALL_WEBHOOK" && "Webhook"}
                                                                {act.actionType === "UPDATE_STATUS" && "Status Transition"}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>

                                        <CardFooter className="p-4 pt-0 border-t border-border/40 flex items-center justify-between text-[11px] text-muted-foreground">
                                            <span>
                                                Runs: <strong className="text-foreground">{rule.executionCount}</strong>
                                            </span>
                                            <span>
                                                {rule.lastRunAt
                                                    ? `Ran ${formatDistanceToNow(new Date(rule.lastRunAt), { addSuffix: true })}`
                                                    : "Never executed"}
                                            </span>
                                        </CardFooter>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </TabsContent>

                {/* TAB 2: EXECUTION AUDIT LOG */}
                <TabsContent value="history" className="space-y-4">
                    <div className="flex items-center justify-between gap-3 bg-card border border-border/60 p-3 rounded-xl shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-muted-foreground">Filter Status:</span>
                            {(["ALL", "SUCCESS", "SKIPPED", "FAILED"] as const).map(st => (
                                <Button
                                    key={st}
                                    variant={executionStatusFilter === st ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => setExecutionStatusFilter(st)}
                                    className="h-7 px-2.5 text-[11px] font-semibold"
                                >
                                    {st}
                                </Button>
                            ))}
                        </div>

                        <span className="text-xs text-muted-foreground">
                            Showing {filteredExecutions.length} logs
                        </span>
                    </div>

                    {filteredExecutions.length === 0 ? (
                        <div className="p-12 text-center rounded-2xl border border-dashed border-border/70 bg-card/50">
                            <Activity className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
                            <h4 className="text-sm font-semibold">No execution records found</h4>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Run a test simulation or wait for live triggers to fire.
                            </p>
                        </div>
                    ) : (
                        <div className="border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs text-left">
                                    <thead className="bg-muted/50 text-muted-foreground border-b border-border/60 uppercase font-semibold text-[10px]">
                                        <tr>
                                            <th className="px-4 py-3">Timestamp</th>
                                            <th className="px-4 py-3">Workflow Rule</th>
                                            <th className="px-4 py-3">Trigger Event</th>
                                            <th className="px-4 py-3">Entity Ref</th>
                                            <th className="px-4 py-3">Duration</th>
                                            <th className="px-4 py-3">Status</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/40">
                                        {filteredExecutions.map(exec => (
                                            <tr key={exec.id} className="hover:bg-muted/20 transition-colors">
                                                <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(exec.createdAt), "yyyy-MM-dd HH:mm:ss")}
                                                </td>
                                                <td className="px-4 py-3 font-semibold text-foreground">
                                                    {exec.workflowName || "Automated Rule"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <Badge variant="outline" className="font-mono text-[10px]">
                                                        {exec.triggerEvent}
                                                    </Badge>
                                                </td>
                                                <td className="px-4 py-3 font-mono text-muted-foreground">
                                                    {exec.entityId || "N/A"}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground font-mono">
                                                    {exec.executionDurationMs ? `${exec.executionDurationMs}ms` : "—"}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {exec.status === "SUCCESS" && (
                                                        <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-[10px]">
                                                            SUCCESS
                                                        </Badge>
                                                    )}
                                                    {exec.status === "SKIPPED" && (
                                                        <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-[10px]">
                                                            SKIPPED
                                                        </Badge>
                                                    )}
                                                    {exec.status === "FAILED" && (
                                                        <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border border-red-500/30 text-[10px]">
                                                            FAILED
                                                        </Badge>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setInspectExecution(exec)
                                                            setIsInspectOpen(true)
                                                        }}
                                                        className="h-7 text-xs gap-1"
                                                    >
                                                        <Eye className="h-3 w-3" /> Inspect
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </TabsContent>

                {/* TAB 3: SIMULATOR & DRY RUN */}
                <TabsContent value="simulator" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                        {/* Left: Configuration & Mock Input */}
                        <div className="lg:col-span-6 space-y-4">
                            <Card className="border-border/60 shadow-sm">
                                <CardHeader className="p-4 pb-3 border-b border-border/50">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Sliders className="h-4 w-4 text-primary" />
                                        Simulation Setup
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Select a workflow and provide a mock payload to test rule evaluation without triggering live third-party services.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-4 space-y-4 text-xs">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Select Target Workflow</Label>
                                        <Select
                                            value={simSelectedWorkflowId}
                                            onValueChange={handleSelectSimWorkflow}
                                        >
                                            <SelectTrigger className="text-xs">
                                                <SelectValue placeholder="Choose a workflow rule to test" />
                                            </SelectTrigger>
                                            <SelectContent className="text-xs">
                                                {rules.map(r => (
                                                    <SelectItem key={r.id} value={r.id}>
                                                        {r.code} - {r.name} ({r.triggerEvent})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <Label className="text-xs font-semibold">Mock Entity JSON Payload</Label>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleSelectSimWorkflow(simSelectedWorkflowId)}
                                                className="h-6 text-[11px] gap-1 text-muted-foreground"
                                            >
                                                <RotateCcw className="h-3 w-3" /> Reset Mock
                                            </Button>
                                        </div>
                                        <Textarea
                                            value={simPayloadJson}
                                            onChange={e => setSimPayloadJson(e.target.value)}
                                            rows={9}
                                            className="font-mono text-xs bg-muted/40 resize-none"
                                        />
                                    </div>

                                    <Button
                                        onClick={handleRunSimulation}
                                        disabled={isPending || !simSelectedWorkflowId}
                                        className="w-full gap-2 text-xs font-semibold shadow-sm bg-primary text-primary-foreground hover:bg-primary/90"
                                    >
                                        <Play className="h-3.5 w-3.5" />
                                        {isPending ? "Evaluating Rule Engine..." : "Run Test Simulation"}
                                    </Button>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Right: Evaluation Output & Pipeline Trace */}
                        <div className="lg:col-span-6 space-y-4">
                            <Card className="border-border/60 shadow-sm bg-card/60 h-full flex flex-col">
                                <CardHeader className="p-4 pb-3 border-b border-border/50">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Terminal className="h-4 w-4 text-emerald-500" />
                                        Simulator Execution Trace
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Step-by-step diagnostic breakdown of condition checks and simulated action dispatches.
                                    </CardDescription>
                                </CardHeader>

                                <CardContent className="p-4 flex-1 flex flex-col justify-between text-xs space-y-4">
                                    {!simResult ? (
                                        <div className="p-12 text-center my-auto">
                                            <Terminal className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
                                            <p className="text-xs text-muted-foreground">
                                                Click <strong>"Run Test Simulation"</strong> to trace rule matching and action execution in real time.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {/* Status Banner */}
                                            <div
                                                className={`p-3 rounded-xl border flex items-center justify-between ${
                                                    simResult.status === "SUCCESS"
                                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                                                        : simResult.status === "SKIPPED"
                                                        ? "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-300"
                                                        : "bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-300"
                                                }`}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {simResult.status === "SUCCESS" && <CheckCircle2 className="h-5 w-5" />}
                                                    {simResult.status === "SKIPPED" && <AlertCircle className="h-5 w-5" />}
                                                    {simResult.status === "FAILED" && <XCircle className="h-5 w-5" />}
                                                    <div>
                                                        <h5 className="font-bold text-xs uppercase tracking-wide">
                                                            {simResult.status}: {simResult.conditionMet ? "All Conditions Satisfied" : "Conditions Not Met"}
                                                        </h5>
                                                        <p className="text-[11px] opacity-80">
                                                            {simResult.reason || "Dispatched simulated action handlers successfully."}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-background/50 border border-border/40">
                                                    {simResult.durationMs}ms
                                                </span>
                                            </div>

                                            {/* Dispatched Actions Breakdown */}
                                            <div className="space-y-2">
                                                <Label className="text-xs font-semibold">Simulated Action Pipeline:</Label>
                                                {simResult.executedActions.length === 0 ? (
                                                    <p className="text-[11px] text-muted-foreground italic p-3 rounded-lg bg-muted/30 border border-border/40">
                                                        No actions were executed because the criteria failed.
                                                    </p>
                                                ) : (
                                                    <div className="space-y-2">
                                                        {simResult.executedActions.map((act, i) => (
                                                            <div
                                                                key={i}
                                                                className="p-2.5 rounded-lg border border-border/60 bg-muted/20 flex items-start gap-2.5 text-xs"
                                                            >
                                                                <div className="p-1 rounded bg-emerald-500/10 text-emerald-600 mt-0.5">
                                                                    <CheckCircle2 className="h-3.5 w-3.5" />
                                                                </div>
                                                                <div className="space-y-0.5">
                                                                    <span className="font-mono font-bold text-[11px] text-foreground">
                                                                        {act.actionType}
                                                                    </span>
                                                                    <p className="text-[11px] text-muted-foreground">{act.summary}</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

            {/* MODAL: NEW / EDIT WORKFLOW RULE */}
            <Dialog open={isBuilderOpen} onOpenChange={setIsBuilderOpen}>
                <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Zap className="h-4 w-4 text-primary" />
                            {editingRuleId ? "Edit Workflow Rule" : "Create New Workflow Rule"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define the trigger event, conditions, and automated actions for this business rule.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        {/* Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Workflow Name *</Label>
                                <Input
                                    value={formName}
                                    onChange={e => setFormName(e.target.value)}
                                    placeholder="e.g. Overdue Invoice Escalation"
                                    className="h-8 text-xs"
                                />
                            </div>
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Description</Label>
                                <Input
                                    value={formDescription}
                                    onChange={e => setFormDescription(e.target.value)}
                                    placeholder="e.g. Alerts managers when invoices pass 7 days overdue"
                                    className="h-8 text-xs"
                                />
                            </div>
                        </div>

                        {/* Trigger Selection */}
                        <div className="space-y-1.5 p-3 rounded-xl bg-muted/40 border border-border/60">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Step 1: Select Event Trigger
                            </Label>
                            <Select
                                value={formTrigger}
                                onValueChange={(val: TriggerEventType) => {
                                    setFormTrigger(val)
                                    // Reset conditions to first field of new trigger
                                    const meta = TRIGGER_CATALOG.find(t => t.event === val)
                                    if (meta && meta.fields.length > 0) {
                                        setFormConditions([{ field: meta.fields[0].key, operator: "equals", value: "" }])
                                    }
                                }}
                            >
                                <SelectTrigger className="text-xs h-9 bg-background">
                                    <SelectValue placeholder="Choose an event trigger" />
                                </SelectTrigger>
                                <SelectContent className="text-xs max-h-60">
                                    {(["SALES", "CRM", "INVENTORY", "FINANCE", "HR", "SUPPORT"] as TriggerCategory[]).map(cat => (
                                        <div key={cat}>
                                            <div className="px-2 py-1 text-[10px] font-bold text-muted-foreground uppercase bg-muted/40 tracking-wider">
                                                {cat} Events
                                            </div>
                                            {TRIGGER_CATALOG.filter(t => t.category === cat).map(t => (
                                                <SelectItem key={t.event} value={t.event} className="text-xs">
                                                    {t.label} ({t.event})
                                                </SelectItem>
                                            ))}
                                        </div>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-[11px] text-muted-foreground mt-1">
                                {selectedTriggerMeta.description}
                            </p>
                        </div>

                        {/* Conditions Builder */}
                        <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Step 2: Rule Criteria / Conditions ({formConditions.length})
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addCondition}
                                    className="h-6 text-[11px] gap-1"
                                >
                                    <Plus className="h-3 w-3" /> Add Condition
                                </Button>
                            </div>

                            {formConditions.length === 0 ? (
                                <p className="text-[11px] text-muted-foreground italic">
                                    No criteria defined. Rule will trigger for every event.
                                </p>
                            ) : (
                                <div className="space-y-2">
                                    {formConditions.map((cond, i) => (
                                        <div key={i} className="flex items-center gap-2 bg-background p-2 rounded-lg border border-border/50">
                                            <Select
                                                value={cond.field}
                                                onValueChange={val => updateCondition(i, "field", val)}
                                            >
                                                <SelectTrigger className="w-36 h-7 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="text-xs">
                                                    {selectedTriggerMeta.fields.map(f => (
                                                        <SelectItem key={f.key} value={f.key}>
                                                            {f.label}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>

                                            <Select
                                                value={cond.operator}
                                                onValueChange={val => updateCondition(i, "operator", val)}
                                            >
                                                <SelectTrigger className="w-32 h-7 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="text-xs">
                                                    <SelectItem value="equals">Equals (==)</SelectItem>
                                                    <SelectItem value="not_equals">Not Equals (!=)</SelectItem>
                                                    <SelectItem value="greater_than">Greater than (&gt;)</SelectItem>
                                                    <SelectItem value="less_than">Less than (&lt;)</SelectItem>
                                                    <SelectItem value="contains">Contains</SelectItem>
                                                </SelectContent>
                                            </Select>

                                            <Input
                                                value={String(cond.value)}
                                                onChange={e => updateCondition(i, "value", e.target.value)}
                                                placeholder="Comparison value"
                                                className="h-7 text-xs flex-1"
                                            />

                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => removeCondition(i)}
                                                className="h-7 w-7 text-red-500 hover:text-red-600"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Actions Builder */}
                        <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border/60">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Step 3: Action Pipeline ({formActions.length})
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addAction}
                                    className="h-6 text-[11px] gap-1"
                                >
                                    <Plus className="h-3 w-3" /> Add Action
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {formActions.map((act, i) => (
                                    <div key={i} className="bg-background p-3 rounded-lg border border-border/60 space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="h-5 w-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center">
                                                    {i + 1}
                                                </span>
                                                <Select
                                                    value={act.actionType}
                                                    onValueChange={(val: ActionType) => updateActionType(i, val)}
                                                >
                                                    <SelectTrigger className="w-48 h-7 text-xs font-semibold">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent className="text-xs">
                                                        <SelectItem value="SEND_NOTIFICATION">In-App Notification</SelectItem>
                                                        <SelectItem value="SEND_EMAIL">Dispatch Email</SelectItem>
                                                        <SelectItem value="CREATE_TASK">Generate Task</SelectItem>
                                                        <SelectItem value="CALL_WEBHOOK">Webhook POST Call</SelectItem>
                                                        <SelectItem value="UPDATE_STATUS">Update Status</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {formActions.length > 1 && (
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => removeAction(i)}
                                                    className="h-6 w-6 text-red-500"
                                                >
                                                    <Trash2 className="h-3 w-3" />
                                                </Button>
                                            )}
                                        </div>

                                        {/* Action-Specific Inputs */}
                                        {act.actionType === "SEND_NOTIFICATION" && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Recipient Role</Label>
                                                    <Select
                                                        value={act.params.recipientRole || "ADMIN"}
                                                        onValueChange={val => updateActionParam(i, "recipientRole", val)}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="text-xs">
                                                            <SelectItem value="ADMIN">Administrators</SelectItem>
                                                            <SelectItem value="MANAGER">Operations Managers</SelectItem>
                                                            <SelectItem value="SALES">Sales Representatives</SelectItem>
                                                            <SelectItem value="SUPPORT">Customer Support</SelectItem>
                                                            <SelectItem value="INVENTORY">Warehouse Officers</SelectItem>
                                                            <SelectItem value="ALL">All Workspace Users</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Message Content</Label>
                                                    <Input
                                                        value={act.params.message || ""}
                                                        onChange={e => updateActionParam(i, "message", e.target.value)}
                                                        placeholder="Notification text"
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {act.actionType === "SEND_EMAIL" && (
                                            <div className="space-y-1.5 pt-1">
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Subject Line</Label>
                                                    <Input
                                                        value={act.params.emailSubject || ""}
                                                        onChange={e => updateActionParam(i, "emailSubject", e.target.value)}
                                                        placeholder="e.g. Urgent Notice: Payment Due"
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Email Message</Label>
                                                    <Textarea
                                                        value={act.params.emailBody || ""}
                                                        onChange={e => updateActionParam(i, "emailBody", e.target.value)}
                                                        placeholder="Email body text..."
                                                        rows={2}
                                                        className="text-xs resize-none"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        {act.actionType === "CREATE_TASK" && (
                                            <div className="grid grid-cols-3 gap-2 pt-1">
                                                <div className="col-span-2">
                                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Task Title</Label>
                                                    <Input
                                                        value={act.params.taskTitle || ""}
                                                        onChange={e => updateActionParam(i, "taskTitle", e.target.value)}
                                                        placeholder="Task title"
                                                        className="h-7 text-xs"
                                                    />
                                                </div>
                                                <div>
                                                    <Label className="text-[10px] text-muted-foreground uppercase font-bold">Priority</Label>
                                                    <Select
                                                        value={act.params.taskPriority || "MEDIUM"}
                                                        onValueChange={val => updateActionParam(i, "taskPriority", val)}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent className="text-xs">
                                                            <SelectItem value="LOW">Low</SelectItem>
                                                            <SelectItem value="MEDIUM">Medium</SelectItem>
                                                            <SelectItem value="HIGH">High</SelectItem>
                                                            <SelectItem value="URGENT">Urgent</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        )}

                                        {act.actionType === "CALL_WEBHOOK" && (
                                            <div className="pt-1">
                                                <Label className="text-[10px] text-muted-foreground uppercase font-bold">Endpoint Webhook URL</Label>
                                                <Input
                                                    value={act.params.webhookUrl || ""}
                                                    onChange={e => updateActionParam(i, "webhookUrl", e.target.value)}
                                                    placeholder="https://api.external.com/webhooks/listener"
                                                    className="h-7 text-xs font-mono"
                                                />
                                            </div>
                                        )}

                                        {act.actionType === "UPDATE_STATUS" && (
                                            <div className="pt-1">
                                                <Label className="text-[10px] text-muted-foreground uppercase font-bold">New Status Code</Label>
                                                <Input
                                                    value={act.params.newStatus || ""}
                                                    onChange={e => updateActionParam(i, "newStatus", e.target.value)}
                                                    placeholder="e.g. IN_PROGRESS, ESCALATED, RESOLVED"
                                                    className="h-7 text-xs font-mono"
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Active Toggle */}
                        <div className="flex items-center justify-between p-3 rounded-xl bg-muted/40 border border-border/60">
                            <div>
                                <Label className="text-xs font-semibold">Activate Immediately</Label>
                                <p className="text-[11px] text-muted-foreground">
                                    When enabled, this rule will actively evaluate on matching events.
                                </p>
                            </div>
                            <Switch checked={formIsActive} onCheckedChange={setFormIsActive} />
                        </div>
                    </div>

                    <DialogFooter className="border-t border-border/50 pt-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsBuilderOpen(false)}
                            className="text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSaveRule}
                            disabled={isPending}
                            className="text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {editingRuleId ? "Save Changes" : "Create Workflow"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: PRE-BUILT RECIPES */}
            <Dialog open={isRecipesOpen} onOpenChange={setIsRecipesOpen}>
                <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            Pre-built Automation Recipes
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            1-click install vetted enterprise operational and compliance automation workflows.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 py-2">
                        {PREBUILT_RECIPES.map((rec, i) => (
                            <Card key={i} className="border border-border/60 shadow-sm flex flex-col justify-between">
                                <CardHeader className="p-3.5 pb-2">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="text-[10px] font-mono">
                                            {rec.triggerEvent}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {rec.actions.length} Actions
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-xs font-bold mt-1.5">{rec.name}</CardTitle>
                                    <CardDescription className="text-[11px] line-clamp-2">
                                        {rec.description}
                                    </CardDescription>
                                </CardHeader>

                                <CardFooter className="p-3.5 pt-0 border-t border-border/40 flex items-center justify-end">
                                    <Button
                                        size="sm"
                                        onClick={() => handleInstallRecipe(rec.name)}
                                        disabled={isPending}
                                        className="h-7 text-xs font-semibold gap-1.5"
                                    >
                                        <Plus className="h-3.5 w-3.5" /> Install Recipe
                                    </Button>
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>

            {/* MODAL: INSPECT EXECUTION LOG */}
            <Dialog open={isInspectOpen} onOpenChange={setIsInspectOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Execution Audit Inspector
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Execution telemetry and dispatched action details.
                        </DialogDescription>
                    </DialogHeader>

                    {inspectExecution && (
                        <div className="space-y-3 py-2 text-xs">
                            <div className="grid grid-cols-2 gap-2 p-3 rounded-lg bg-muted/40 border border-border/50">
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Rule Name</p>
                                    <p className="font-semibold">{inspectExecution.workflowName}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Status</p>
                                    <p className="font-semibold">{inspectExecution.status}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Trigger Event</p>
                                    <p className="font-mono">{inspectExecution.triggerEvent}</p>
                                </div>
                                <div>
                                    <p className="text-[10px] text-muted-foreground uppercase font-bold">Duration</p>
                                    <p className="font-mono">{inspectExecution.executionDurationMs || 0}ms</p>
                                </div>
                            </div>

                            {inspectExecution.errorDetails && (
                                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                                    <p className="font-bold text-[11px]">Audit Diagnostic Note:</p>
                                    <p className="text-[11px] mt-0.5">{inspectExecution.errorDetails}</p>
                                </div>
                            )}

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Executed Pipeline Steps:</Label>
                                {inspectExecution.executedActions.length === 0 ? (
                                    <p className="text-[11px] text-muted-foreground italic">No actions were fired.</p>
                                ) : (
                                    inspectExecution.executedActions.map((act, i) => (
                                        <div key={i} className="p-2.5 rounded-lg border border-border/60 bg-muted/20 text-xs">
                                            <span className="font-mono font-bold text-[11px] text-primary">{act.actionType}</span>
                                            <p className="text-[11px] text-muted-foreground mt-0.5">{act.summary}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
