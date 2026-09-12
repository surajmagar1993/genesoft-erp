"use client"

import React, { useState, useMemo } from "react"
import {
    SystemEmailTemplatesOverview,
    updateSystemEmailTemplate,
    resetSystemEmailTemplate,
    sendTestSystemEmail,
} from "@/app/actions/admin/email-templates"
import {
    SystemTemplateKey,
    EmailTemplateCategory,
    compileSystemEmail,
    SYSTEM_EMAIL_TEMPLATES,
} from "@/lib/email-template-engine"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
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
    Mail,
    CheckCircle2,
    Code2,
    Send,
    RotateCcw,
    Save,
    Search,
    Smartphone,
    Monitor,
    Copy,
    Check,
    AlertTriangle,
    Eye,
    Tag,
    FileText,
    Sparkles,
    ShieldAlert,
    ExternalLink,
} from "lucide-react"

interface Props {
    initialData: SystemEmailTemplatesOverview
}

export function EmailTemplatesClient({ initialData }: Props) {
    const [templates, setTemplates] = useState(initialData.templates)
    const [gatewayStatus] = useState(initialData.gatewayStatus)
    const [selectedKey, setSelectedKey] = useState<SystemTemplateKey>("INVOICE_SENT")

    // Filter states
    const [selectedCategory, setSelectedCategory] = useState<string>("ALL")
    const [searchQuery, setSearchQuery] = useState<string>("")

    // Active editing state for selected template
    const currentTemplate = useMemo(() => {
        return templates.find((t) => t.key === selectedKey) || templates[0]
    }, [templates, selectedKey])

    const [editSubject, setEditSubject] = useState<string>(currentTemplate.subject)
    const [editBodyHtml, setEditBodyHtml] = useState<string>(currentTemplate.bodyHtml)
    const [editBodyText, setEditBodyText] = useState<string>(currentTemplate.bodyText)
    const [editIsActive, setEditIsActive] = useState<boolean>(currentTemplate.isActive)

    // Sync editor fields when selection changes
    const handleSelectTemplate = (key: SystemTemplateKey) => {
        setSelectedKey(key)
        const target = templates.find((t) => t.key === key)
        if (target) {
            setEditSubject(target.subject)
            setEditBodyHtml(target.bodyHtml)
            setEditBodyText(target.bodyText)
            setEditIsActive(target.isActive)
        }
    }

    // Preview state
    const [previewViewport, setPreviewViewport] = useState<"desktop" | "mobile">("desktop")
    const [previewMode, setPreviewMode] = useState<"html" | "text">("html")

    // UI feedback
    const [isSaving, setIsSaving] = useState(false)
    const [isResetting, setIsResetting] = useState(false)
    const [copiedTag, setCopiedTag] = useState<string | null>(null)
    const [feedbackMessage, setFeedbackMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

    // Test send modal
    const [isTestModalOpen, setIsTestModalOpen] = useState(false)
    const [testRecipient, setTestRecipient] = useState("admin@genesoft.ai")
    const [isSendingTest, setIsSendingTest] = useState(false)
    const [testResult, setTestResult] = useState<{ success: boolean; message: string; simulated?: boolean } | null>(null)

    // Reset confirmation modal
    const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false)

    // Filtered templates list
    const filteredTemplates = useMemo(() => {
        return templates.filter((t) => {
            const matchesCategory = selectedCategory === "ALL" || t.category === selectedCategory
            const matchesSearch =
                t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                t.key.toLowerCase().includes(searchQuery.toLowerCase())
            return matchesCategory && matchesSearch
        })
    }, [templates, selectedCategory, searchQuery])

    // Live compiled preview object
    const liveCompiled = useMemo(() => {
        try {
            return compileSystemEmail({
                templateKey: currentTemplate.key,
                customSubject: editSubject,
                customBodyHtml: editBodyHtml,
                customBodyText: editBodyText,
            })
        } catch (err: any) {
            return {
                subject: editSubject,
                html: `<div style="padding:20px; color:red;">Template compilation error: ${err.message}</div>`,
                text: editBodyText,
                renderedVariables: {},
            }
        }
    }, [currentTemplate.key, editSubject, editBodyHtml, editBodyText])

    // Insert merge tag into subject
    const insertTagIntoSubject = (tag: string) => {
        const token = `{{${tag}}}`
        setEditSubject((prev) => `${prev} ${token}`)
    }

    // Copy tag token to clipboard
    const copyTagToClipboard = (tag: string) => {
        const token = `{{${tag}}}`
        navigator.clipboard.writeText(token)
        setCopiedTag(tag)
        setTimeout(() => setCopiedTag(null), 2000)
    }

    // Save current template
    const handleSave = async () => {
        setIsSaving(true)
        setFeedbackMessage(null)
        try {
            const res = await updateSystemEmailTemplate({
                templateKey: currentTemplate.key,
                subject: editSubject,
                bodyHtml: editBodyHtml,
                bodyText: editBodyText,
                isActive: editIsActive,
            })

            if (res.success) {
                setTemplates((prev) =>
                    prev.map((t) =>
                        t.key === currentTemplate.key
                            ? {
                                  ...t,
                                  subject: editSubject,
                                  bodyHtml: editBodyHtml,
                                  bodyText: editBodyText,
                                  isActive: editIsActive,
                                  isCustomized: true,
                                  lastUpdated: new Date().toISOString(),
                              }
                            : t
                    )
                )
                setFeedbackMessage({ type: "success", text: "Template customizations saved and versioned in Admin Audit." })
                setTimeout(() => setFeedbackMessage(null), 4000)
            } else {
                setFeedbackMessage({ type: "error", text: res.error || "Failed to save template" })
            }
        } catch (err: any) {
            setFeedbackMessage({ type: "error", text: err.message || "An unexpected error occurred" })
        } finally {
            setIsSaving(false)
        }
    }

    // Reset current template to factory default
    const handleReset = async () => {
        setIsResetting(true)
        setFeedbackMessage(null)
        try {
            const res = await resetSystemEmailTemplate(currentTemplate.key)
            if (res.success) {
                const factoryDefault = SYSTEM_EMAIL_TEMPLATES[currentTemplate.key]
                setTemplates((prev) =>
                    prev.map((t) =>
                        t.key === currentTemplate.key
                            ? {
                                  ...factoryDefault,
                                  isCustomized: false,
                              }
                            : t
                    )
                )
                setEditSubject(factoryDefault.subject)
                setEditBodyHtml(factoryDefault.bodyHtml)
                setEditBodyText(factoryDefault.bodyText)
                setEditIsActive(factoryDefault.isActive)
                setIsResetConfirmOpen(false)
                setFeedbackMessage({ type: "success", text: "Template successfully restored to factory defaults." })
                setTimeout(() => setFeedbackMessage(null), 4000)
            } else {
                setFeedbackMessage({ type: "error", text: res.error || "Failed to reset template" })
            }
        } catch (err: any) {
            setFeedbackMessage({ type: "error", text: err.message || "Reset failed" })
        } finally {
            setIsResetting(false)
        }
    }

    // Dispatch test email
    const handleSendTest = async () => {
        setIsSendingTest(true)
        setTestResult(null)
        try {
            const res = await sendTestSystemEmail({
                templateKey: currentTemplate.key,
                recipientEmail: testRecipient,
                customSubject: editSubject,
                customBodyHtml: editBodyHtml,
                customBodyText: editBodyText,
            })
            if (res.success) {
                setTestResult({
                    success: true,
                    message: res.message,
                    simulated: res.simulated,
                })
            } else {
                setTestResult({
                    success: false,
                    message: res.error || res.message || "Failed to dispatch test email",
                })
            }
        } catch (err: any) {
            setTestResult({
                success: false,
                message: err.message || "Test dispatch failed",
            })
        } finally {
            setIsSendingTest(false)
        }
    }

    const categoryBadgeVariant = (cat: EmailTemplateCategory) => {
        switch (cat) {
            case "BILLING":
                return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20"
            case "ONBOARDING":
                return "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
            case "DUNNING":
                return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20"
            case "SUPPORT":
                return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20"
            default:
                return "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/20"
        }
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-3xl font-bold tracking-tight">System Email Templates</h1>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs font-semibold">
                            Transactional Engine v2.0
                        </Badge>
                    </div>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Manage platform-wide automated notification templates, dynamic merge tags, and responsive HTML layouts.
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    <Button
                        variant="outline"
                        onClick={() => {
                            setTestResult(null)
                            setIsTestModalOpen(true)
                        }}
                        className="gap-2 shadow-sm"
                    >
                        <Send className="h-4 w-4 text-primary" />
                        Send Test Email
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="gap-2 shadow-sm font-semibold"
                    >
                        {isSaving ? <RotateCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                        Save Changes
                    </Button>
                </div>
            </div>

            {/* Feedback Alert Toast */}
            {feedbackMessage && (
                <div
                    className={`p-4 rounded-lg flex items-center justify-between border ${
                        feedbackMessage.type === "success"
                            ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
                            : "bg-rose-50 text-rose-800 dark:bg-rose-950/40 dark:text-rose-300 border-rose-200 dark:border-rose-800"
                    }`}
                >
                    <div className="flex items-center gap-2 text-sm font-medium">
                        {feedbackMessage.type === "success" ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                        ) : (
                            <AlertTriangle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                        )}
                        <span>{feedbackMessage.text}</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setFeedbackMessage(null)}
                        className="h-7 text-xs"
                    >
                        Dismiss
                    </Button>
                </div>
            )}

            {/* 4 Telemetry KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-primary/10 shadow-sm hover:border-primary/30 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            System Templates
                        </CardTitle>
                        <Mail className="h-4 w-4 text-primary" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{templates.length}</div>
                        <p className="text-xs text-muted-foreground mt-1">Core transactional presets</p>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm hover:border-primary/30 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Active Transports
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                            {templates.filter((t) => t.isActive).length} / {templates.length}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">100% operational dispatch</p>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm hover:border-primary/30 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Merge Tag Library
                        </CardTitle>
                        <Code2 className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                            {initialData.metrics.totalMergeTags} Tokens
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">Dynamic data variables</p>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm hover:border-primary/30 transition-all">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Outbound Gateway
                        </CardTitle>
                        <Sparkles className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center gap-2">
                            <span className="text-xl font-bold">
                                {gatewayStatus.provider === "RESEND" ? "Resend API" : "Simulated"}
                            </span>
                            <Badge
                                variant="outline"
                                className={`text-[10px] uppercase font-bold px-1.5 py-0 ${
                                    gatewayStatus.isConfigured
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }`}
                            >
                                {gatewayStatus.isConfigured ? "Connected" : "Test Mode"}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                            Domain: @{gatewayStatus.fromDomain}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Filter Bar */}
            <Card className="border-primary/10 shadow-sm">
                <CardContent className="p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                        <Button
                            variant={selectedCategory === "ALL" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("ALL")}
                            className="text-xs"
                        >
                            All ({templates.length})
                        </Button>
                        <Button
                            variant={selectedCategory === "BILLING" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("BILLING")}
                            className="text-xs"
                        >
                            Billing & Tax
                        </Button>
                        <Button
                            variant={selectedCategory === "ONBOARDING" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("ONBOARDING")}
                            className="text-xs"
                        >
                            Onboarding
                        </Button>
                        <Button
                            variant={selectedCategory === "DUNNING" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("DUNNING")}
                            className="text-xs"
                        >
                            Dunning
                        </Button>
                        <Button
                            variant={selectedCategory === "SUPPORT" ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedCategory("SUPPORT")}
                            className="text-xs"
                        >
                            Support
                        </Button>
                    </div>

                    <div className="relative w-full sm:w-72">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search templates..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 h-9 text-xs"
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Main Studio Split Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left Column: Template List (4 cols) */}
                <div className="lg:col-span-4 space-y-3">
                    <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground px-1">
                        System Transactional Presets ({filteredTemplates.length})
                    </div>

                    <div className="space-y-2">
                        {filteredTemplates.map((t) => {
                            const isSelected = t.key === selectedKey
                            return (
                                <div
                                    key={t.key}
                                    onClick={() => handleSelectTemplate(t.key)}
                                    className={`p-4 rounded-xl border transition-all cursor-pointer text-left ${
                                        isSelected
                                            ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/20"
                                            : "border-border hover:border-primary/40 bg-card hover:bg-muted/40"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="font-semibold text-sm text-foreground flex items-center gap-2">
                                            {t.name}
                                        </div>
                                        <Badge
                                            variant="outline"
                                            className={`text-[10px] font-bold px-2 py-0.5 border ${categoryBadgeVariant(t.category)}`}
                                        >
                                            {t.category}
                                        </Badge>
                                    </div>

                                    <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                        {t.description}
                                    </p>

                                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/50 text-[11px] text-muted-foreground">
                                        <span className="font-mono text-[10px] text-primary/80">
                                            {t.key}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            {t.isCustomized ? (
                                                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                                                    Customized
                                                </Badge>
                                            ) : (
                                                <span className="text-muted-foreground/70">Factory Default</span>
                                            )}
                                            <span
                                                className={`size-2 rounded-full ${
                                                    t.isActive ? "bg-emerald-500" : "bg-muted-foreground"
                                                }`}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                        {filteredTemplates.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground border rounded-xl bg-card text-sm">
                                No templates match your filter criteria.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Template Editor & Live Sandbox (8 cols) */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="border-primary/10 shadow-sm">
                        <CardHeader className="bg-muted/20 border-b pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg font-bold">
                                            {currentTemplate.name}
                                        </CardTitle>
                                        <Badge
                                            variant="outline"
                                            className={`text-xs border ${categoryBadgeVariant(currentTemplate.category)}`}
                                        >
                                            {currentTemplate.category}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs mt-1">
                                        {currentTemplate.description}
                                    </CardDescription>
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-xs font-semibold cursor-pointer">
                                            Status:
                                        </label>
                                        <Switch
                                            checked={editIsActive}
                                            onCheckedChange={setEditIsActive}
                                        />
                                        <span className="text-xs font-medium text-muted-foreground">
                                            {editIsActive ? "Active" : "Disabled"}
                                        </span>
                                    </div>

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setIsResetConfirmOpen(true)}
                                        className="h-8 text-xs text-muted-foreground hover:text-rose-600 gap-1.5"
                                    >
                                        <RotateCcw className="h-3.5 w-3.5" />
                                        Reset to Default
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-6 space-y-6">
                            {/* Subject Line Editor with Token Injectors */}
                            <div className="space-y-2">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                    <span>Subject Line</span>
                                    <span className="text-[11px] font-normal text-muted-foreground">
                                        Click a token to inject into subject
                                    </span>
                                </label>
                                <Input
                                    value={editSubject}
                                    onChange={(e) => setEditSubject(e.target.value)}
                                    placeholder="Enter email subject line with {{tags}}..."
                                    className="font-medium text-sm"
                                />

                                {/* Token pills */}
                                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                    <span className="text-[11px] text-muted-foreground font-semibold mr-1 flex items-center gap-1">
                                        <Tag className="h-3 w-3" /> Tokens:
                                    </span>
                                    {currentTemplate.mergeTags.slice(0, 6).map((mt) => (
                                        <button
                                            key={mt.tag}
                                            type="button"
                                            onClick={() => insertTagIntoSubject(mt.tag)}
                                            className="px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono hover:bg-primary/10 hover:text-primary transition-colors border border-border"
                                            title={mt.description}
                                        >
                                            +&#123;&#123;{mt.tag}&#125;&#125;
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Main Content Tabs: Editor vs Live Preview */}
                            <Tabs defaultValue="editor" className="w-full">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b pb-2">
                                    <TabsList className="bg-muted/60 p-1">
                                        <TabsTrigger value="editor" className="text-xs gap-1.5">
                                            <Code2 className="h-3.5 w-3.5" /> HTML Body
                                        </TabsTrigger>
                                        <TabsTrigger value="plaintext" className="text-xs gap-1.5">
                                            <FileText className="h-3.5 w-3.5" /> Plain Text
                                        </TabsTrigger>
                                        <TabsTrigger value="preview" className="text-xs gap-1.5">
                                            <Eye className="h-3.5 w-3.5" /> Live Rendered Preview
                                        </TabsTrigger>
                                    </TabsList>

                                    <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                        <span>Template Key:</span>
                                        <span className="font-mono font-bold text-foreground">
                                            {currentTemplate.key}
                                        </span>
                                    </div>
                                </div>

                                {/* Tab 1: HTML Source Editor */}
                                <TabsContent value="editor" className="space-y-3 pt-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Edit the inner HTML body content. Standard styling and tables are supported.
                                        </span>
                                        <span className="text-[11px] font-mono text-muted-foreground">
                                            {editBodyHtml.length} characters
                                        </span>
                                    </div>
                                    <Textarea
                                        value={editBodyHtml}
                                        onChange={(e) => setEditBodyHtml(e.target.value)}
                                        rows={14}
                                        className="font-mono text-xs leading-relaxed bg-muted/20 border-primary/10"
                                        placeholder="Enter HTML template content..."
                                    />
                                </TabsContent>

                                {/* Tab 2: Plain Text Fallback Editor */}
                                <TabsContent value="plaintext" className="space-y-3 pt-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Fallback plain text format for clients that do not render rich HTML.
                                        </span>
                                        <span className="text-[11px] font-mono text-muted-foreground">
                                            {editBodyText.length} characters
                                        </span>
                                    </div>
                                    <Textarea
                                        value={editBodyText}
                                        onChange={(e) => setEditBodyText(e.target.value)}
                                        rows={14}
                                        className="font-mono text-xs leading-relaxed bg-muted/20 border-primary/10"
                                        placeholder="Enter plain text template..."
                                    />
                                </TabsContent>

                                {/* Tab 3: Interactive Live Preview */}
                                <TabsContent value="preview" className="space-y-4 pt-3">
                                    <div className="flex items-center justify-between bg-muted/40 p-2.5 rounded-lg border">
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs font-semibold">Viewport:</span>
                                            <Button
                                                variant={previewViewport === "desktop" ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setPreviewViewport("desktop")}
                                                className="h-7 text-xs gap-1"
                                            >
                                                <Monitor className="h-3.5 w-3.5" /> Desktop (600px)
                                            </Button>
                                            <Button
                                                variant={previewViewport === "mobile" ? "default" : "outline"}
                                                size="sm"
                                                onClick={() => setPreviewViewport("mobile")}
                                                className="h-7 text-xs gap-1"
                                            >
                                                <Smartphone className="h-3.5 w-3.5" /> Mobile (375px)
                                            </Button>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant={previewMode === "html" ? "secondary" : "ghost"}
                                                size="sm"
                                                onClick={() => setPreviewMode("html")}
                                                className="h-7 text-xs"
                                            >
                                                HTML Render
                                            </Button>
                                            <Button
                                                variant={previewMode === "text" ? "secondary" : "ghost"}
                                                size="sm"
                                                onClick={() => setPreviewMode("text")}
                                                className="h-7 text-xs"
                                            >
                                                Text Fallback
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Preview container */}
                                    <div className="flex justify-center bg-slate-950/5 dark:bg-slate-900/40 p-6 rounded-xl border border-dashed min-h-[420px] overflow-auto">
                                        <div
                                            className={`transition-all bg-white dark:bg-slate-950 rounded-xl shadow-lg border overflow-hidden ${
                                                previewViewport === "mobile"
                                                    ? "w-[375px] max-w-full"
                                                    : "w-[620px] max-w-full"
                                            }`}
                                        >
                                            {/* Fake Email Client Bar */}
                                            <div className="bg-slate-100 dark:bg-slate-900 px-4 py-3 border-b text-xs space-y-1">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <span className="font-semibold text-foreground">Subject:</span>
                                                    <span className="font-medium text-foreground truncate">
                                                        {liveCompiled.subject}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                    <span>From:</span>
                                                    <span className="font-mono">
                                                        Platform &lt;notifications@{gatewayStatus.fromDomain}&gt;
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Email content rendering */}
                                            {previewMode === "html" ? (
                                                <div
                                                    className="p-1"
                                                    dangerouslySetInnerHTML={{ __html: liveCompiled.html }}
                                                />
                                            ) : (
                                                <pre className="p-6 text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground">
                                                    {liveCompiled.text}
                                                </pre>
                                            )}
                                        </div>
                                    </div>
                                </TabsContent>
                            </Tabs>

                            {/* Merge Tags Reference & Token Dictionary */}
                            <div className="space-y-3 pt-4 border-t">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                        <Code2 className="h-4 w-4 text-primary" />
                                        Supported Merge Tags for {currentTemplate.name} ({currentTemplate.mergeTags.length})
                                    </span>
                                    <span className="text-[11px] text-muted-foreground">
                                        Click any token to copy to clipboard
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                    {currentTemplate.mergeTags.map((mt) => {
                                        const isCopied = copiedTag === mt.tag
                                        return (
                                            <div
                                                key={mt.tag}
                                                onClick={() => copyTagToClipboard(mt.tag)}
                                                className="p-2.5 rounded-lg border border-border/80 bg-muted/10 hover:bg-muted/40 transition-colors cursor-pointer flex items-center justify-between text-left group"
                                            >
                                                <div className="min-w-0 pr-2">
                                                    <div className="flex items-center gap-2">
                                                        <code className="text-xs font-bold text-primary font-mono group-hover:underline">
                                                            &#123;&#123;{mt.tag}&#125;&#125;
                                                        </code>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            ({mt.label})
                                                        </span>
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground truncate mt-0.5">
                                                        {mt.description} &bull; <span className="italic font-mono">e.g. &quot;{mt.sampleValue}&quot;</span>
                                                    </div>
                                                </div>

                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-7 w-7 text-muted-foreground group-hover:text-primary shrink-0"
                                                >
                                                    {isCopied ? (
                                                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                                                    ) : (
                                                        <Copy className="h-3.5 w-3.5" />
                                                    )}
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* SEND TEST EMAIL MODAL */}
            <Dialog open={isTestModalOpen} onOpenChange={setIsTestModalOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-primary" />
                            Send Test Email: {currentTemplate.name}
                        </DialogTitle>
                        <DialogDescription>
                            Dispatch a sample email using the current subject, HTML, and realistic test variables.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-2">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Recipient Email Address
                            </label>
                            <Input
                                type="email"
                                placeholder="name@company.com"
                                value={testRecipient}
                                onChange={(e) => setTestRecipient(e.target.value)}
                                className="font-medium"
                            />
                        </div>

                        {/* Test Delivery Info */}
                        <div className="p-3.5 rounded-lg border bg-muted/30 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">Active Gateway:</span>
                                <Badge variant="outline" className="text-[10px] font-bold">
                                    {gatewayStatus.provider}
                                </Badge>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">Sender:</span>
                                <span className="font-mono text-muted-foreground">
                                    notifications@{gatewayStatus.fromDomain}
                                </span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="font-semibold text-foreground">Mode:</span>
                                <span className="text-muted-foreground">
                                    {gatewayStatus.isConfigured
                                        ? "Live Outbound via Resend API"
                                        : "Simulated Delivery (Payload & rendering verification)"}
                                </span>
                            </div>
                        </div>

                        {/* Test Result Toast/Alert */}
                        {testResult && (
                            <div
                                className={`p-3.5 rounded-lg border text-xs ${
                                    testResult.success
                                        ? "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800"
                                        : "bg-rose-50 text-rose-900 border-rose-200 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800"
                                }`}
                            >
                                <div className="flex items-center gap-2 font-semibold">
                                    {testResult.success ? (
                                        <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                    ) : (
                                        <AlertTriangle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
                                    )}
                                    <span>{testResult.success ? "Dispatch Successful" : "Dispatch Failed"}</span>
                                </div>
                                <p className="mt-1 leading-relaxed">{testResult.message}</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button
                            variant="outline"
                            onClick={() => setIsTestModalOpen(false)}
                            disabled={isSendingTest}
                        >
                            Close
                        </Button>
                        <Button
                            onClick={handleSendTest}
                            disabled={isSendingTest || !testRecipient.trim()}
                            className="gap-2"
                        >
                            {isSendingTest ? (
                                <>
                                    <RotateCcw className="h-4 w-4 animate-spin" />
                                    Dispatching...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Transmit Test
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* RESET CONFIRMATION MODAL */}
            <Dialog open={isResetConfirmOpen} onOpenChange={setIsResetConfirmOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600">
                            <ShieldAlert className="h-5 w-5" />
                            Reset to Factory Defaults?
                        </DialogTitle>
                        <DialogDescription>
                            Are you sure you want to discard all customizations for{" "}
                            <strong>{currentTemplate.name}</strong>? This will restore the pristine system default subject and HTML layout.
                        </DialogDescription>
                    </DialogHeader>

                    <DialogFooter className="gap-2 sm:gap-0 mt-4">
                        <Button
                            variant="outline"
                            onClick={() => setIsResetConfirmOpen(false)}
                            disabled={isResetting}
                        >
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleReset}
                            disabled={isResetting}
                            className="gap-2"
                        >
                            {isResetting ? (
                                <RotateCcw className="h-4 w-4 animate-spin" />
                            ) : (
                                <RotateCcw className="h-4 w-4" />
                            )}
                            Confirm Reset
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
