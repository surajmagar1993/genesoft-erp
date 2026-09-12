"use client"

import { useState, useTransition, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    WebFormsOverview,
    WebFormRecord,
    FormSubmissionRecord,
    FormFieldConfig,
    WebFormType,
    WebFormStatus,
    FormSubmissionStatus,
    CreateWebFormInput,
    UpdateWebFormInput,
} from "@/app/actions/crm/form-types"
import {
    createWebForm,
    updateWebForm,
    deleteWebForm,
    toggleWebFormStatus,
    submitPublicForm,
} from "@/app/actions/crm/forms"
import {
    Globe,
    Plus,
    Search,
    Filter,
    Sparkles,
    Code2,
    CheckCircle2,
    AlertCircle,
    Copy,
    Trash2,
    Edit3,
    Eye,
    RefreshCw,
    Play,
    Send,
    Layers,
    Settings2,
    Check,
    X,
    ArrowUpRight,
    ShieldCheck,
    Inbox,
    UserPlus,
    FileCode,
    Terminal,
    Sliders,
    ArrowUp,
    ArrowDown,
    Link2,
    Laptop,
    Activity,
    FileSpreadsheet,
    EyeOff,
    Flame,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

// Default blueprint templates
const DEFAULT_CONTACT_FIELDS: FormFieldConfig[] = [
    { id: "c1", name: "name", label: "Full Name", type: "text", required: true, placeholder: "Your full name" },
    { id: "c2", name: "email", label: "Email Address", type: "email", required: true, placeholder: "you@example.com" },
    { id: "c3", name: "phone", label: "Phone Number", type: "tel", required: false, placeholder: "+1 (555) 000-0000" },
    { id: "c4", name: "company", label: "Company Name", type: "text", required: false, placeholder: "Organization name" },
    { id: "c5", name: "message", label: "Message", type: "textarea", required: true, placeholder: "How can we assist you?" },
]

const DEFAULT_QUOTE_FIELDS: FormFieldConfig[] = [
    { id: "q1", name: "name", label: "Contact Name", type: "text", required: true, placeholder: "Full name" },
    { id: "q2", name: "email", label: "Business Email", type: "email", required: true, placeholder: "work@company.com" },
    { id: "q3", name: "company", label: "Company Name", type: "text", required: true, placeholder: "Company / Org" },
    { id: "q4", name: "budget", label: "Estimated Budget", type: "select", required: false, options: ["< $5,000", "$5,000 - $25,000", "$25,000 - $100,000", "$100,000+"] },
    { id: "q5", name: "requirements", label: "Project Requirements", type: "textarea", required: true, placeholder: "Describe the scope of your project..." },
]

const DEFAULT_DEMO_FIELDS: FormFieldConfig[] = [
    { id: "d1", name: "first_name", label: "First Name", type: "text", required: true, placeholder: "First name" },
    { id: "d2", name: "last_name", label: "Last Name", type: "text", required: true, placeholder: "Last name" },
    { id: "d3", name: "work_email", label: "Corporate Email", type: "email", required: true, placeholder: "name@enterprise.com" },
    { id: "d4", name: "company", label: "Organization", type: "text", required: true, placeholder: "Enterprise Ltd" },
    { id: "d5", name: "team_size", label: "Team Size", type: "select", required: false, options: ["1-20", "21-100", "101-500", "500+"] },
    { id: "d6", name: "notes", label: "Timeline / Goals", type: "textarea", required: false, placeholder: "What specific features would you like to see?" },
]

interface FormsClientProps {
    initialData: WebFormsOverview
}

export function FormsClient({ initialData }: FormsClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Data states
    const [forms, setForms] = useState<WebFormRecord[]>(initialData.forms)
    const [submissions, setSubmissions] = useState<FormSubmissionRecord[]>(initialData.submissions)
    const [kpis, setKpis] = useState(initialData.kpis)

    // Sync state with incoming server props when router.refresh() triggers
    useEffect(() => {
        setForms(initialData.forms)
        setSubmissions(initialData.submissions)
        setKpis(initialData.kpis)
    }, [initialData])

    // Active Navigation Workspace Tab
    const [activeTab, setActiveTab] = useState<"directory" | "studio" | "submissions" | "integrations">("directory")

    // Filter & Search states
    const [searchQuery, setSearchQuery] = useState("")
    const [typeFilter, setTypeFilter] = useState<string>("ALL")
    const [statusFilter, setStatusFilter] = useState<string>("ALL")
    const [submissionFormFilter, setSubmissionFormFilter] = useState<string>("ALL")

    // Selected Form for Studio editing
    const [studioFormId, setStudioFormId] = useState<string | null>(
        initialData.forms.length > 0 ? initialData.forms[0].id : null
    )

    // Studio Editing State
    const [studioTitle, setStudioTitle] = useState("")
    const [studioDescription, setStudioDescription] = useState("")
    const [studioType, setStudioType] = useState<WebFormType>(WebFormType.CONTACT)
    const [studioButtonText, setStudioButtonText] = useState("Submit Request")
    const [studioButtonColor, setStudioButtonColor] = useState("#2563eb")
    const [studioSuccessMsg, setStudioSuccessMsg] = useState("Thank you! Your submission has been received.")
    const [studioRedirectUrl, setStudioRedirectUrl] = useState("")
    const [studioNotifyEmail, setStudioNotifyEmail] = useState("")
    const [studioFields, setStudioFields] = useState<FormFieldConfig[]>([])
    const [studioIsNew, setStudioIsNew] = useState(false)

    // Modals
    const [showNewFormDialog, setShowNewFormDialog] = useState(false)
    const [showEmbedDialog, setShowEmbedDialog] = useState(false)
    const [selectedEmbedForm, setSelectedEmbedForm] = useState<WebFormRecord | null>(
        initialData.forms.length > 0 ? initialData.forms[0] : null
    )
    const [embedTab, setEmbedTab] = useState<"iframe" | "widget" | "url" | "curl">("iframe")
    const [copiedSnippet, setCopiedSnippet] = useState<string | null>(null)

    // Live Simulator & Test Modal
    const [showSimulatorModal, setShowSimulatorModal] = useState(false)
    const [simulatingForm, setSimulatingForm] = useState<WebFormRecord | null>(null)
    const [simulatedFormData, setSimulatedFormData] = useState<Record<string, any>>({})
    const [simulatorSubmitted, setSimulatorSubmitted] = useState(false)

    // Submission Detail Modal
    const [selectedSubmission, setSelectedSubmission] = useState<FormSubmissionRecord | null>(null)

    // Initialize Studio fields when selected form changes
    useEffect(() => {
        if (!studioIsNew && studioFormId) {
            const form = forms.find((f) => f.id === studioFormId)
            if (form) {
                setStudioTitle(form.title)
                setStudioDescription(form.description || "")
                setStudioType(form.type)
                setStudioButtonText(form.submitButtonText)
                setStudioButtonColor(form.primaryColor)
                setStudioSuccessMsg(form.successMessage)
                setStudioRedirectUrl(form.redirectUrl || "")
                setStudioNotifyEmail(form.notifyEmail || "")
                setStudioFields(form.fields || [])
            }
        }
    }, [studioFormId, forms, studioIsNew])

    // Filtered Forms Directory
    const filteredForms = useMemo(() => {
        return forms.filter((f) => {
            const matchesSearch =
                f.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                f.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (f.description && f.description.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesType = typeFilter === "ALL" || f.type === typeFilter
            const matchesStatus = statusFilter === "ALL" || f.status === statusFilter

            return matchesSearch && matchesType && matchesStatus
        })
    }, [forms, searchQuery, typeFilter, statusFilter])

    // Filtered Submissions Feed
    const filteredSubmissions = useMemo(() => {
        return submissions.filter((s) => {
            const matchesForm = submissionFormFilter === "ALL" || s.webFormId === submissionFormFilter
            const formTitle = s.webForm?.title || ""
            const leadTitle = s.lead?.title || ""
            const contactName = s.contact?.displayName || ""
            const dataStr = JSON.stringify(s.data).toLowerCase()

            const matchesSearch =
                searchQuery === "" ||
                formTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                leadTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
                contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                dataStr.includes(searchQuery.toLowerCase())

            return matchesForm && matchesSearch
        })
    }, [submissions, submissionFormFilter, searchQuery])

    // Template Presets for New Form creation
    const handleSelectTemplate = (templateType: WebFormType) => {
        setStudioIsNew(true)
        setStudioType(templateType)

        if (templateType === WebFormType.CONTACT) {
            setStudioTitle("General Inbound Contact")
            setStudioDescription("Inbound customer inquiry form for general questions and business inquiries.")
            setStudioButtonText("Send Inquiry")
            setStudioButtonColor("#059669")
            setStudioFields(DEFAULT_CONTACT_FIELDS)
        } else if (templateType === WebFormType.QUOTE_REQUEST) {
            setStudioTitle("Request for Quotation (RFQ)")
            setStudioDescription("Collect project requirements, estimated budgets, and delivery timelines.")
            setStudioButtonText("Request Formal Quote")
            setStudioButtonColor("#2563eb")
            setStudioFields(DEFAULT_QUOTE_FIELDS)
        } else if (templateType === WebFormType.DEMO_REQUEST) {
            setStudioTitle("Product Demo & Walkthrough")
            setStudioDescription("Book live software walkthroughs and qualify sales prospects.")
            setStudioButtonText("Schedule 30-Min Demo")
            setStudioButtonColor("#4f46e5")
            setStudioFields(DEFAULT_DEMO_FIELDS)
        } else {
            setStudioTitle("Custom Inbound Form")
            setStudioDescription("Customized intake form tailored to unique CRM workflows.")
            setStudioButtonText("Submit Details")
            setStudioButtonColor("#7c3aed")
            setStudioFields(DEFAULT_CONTACT_FIELDS)
        }

        setShowNewFormDialog(false)
        setActiveTab("studio")
    }

    // Save or Update Form in Studio
    const handleSaveStudioForm = () => {
        if (!studioTitle.trim()) {
            toast.error("Form title is required")
            return
        }
        if (studioFields.length === 0) {
            toast.error("Form must contain at least one input field")
            return
        }

        startTransition(async () => {
            if (studioIsNew) {
                const res = await createWebForm({
                    title: studioTitle,
                    description: studioDescription,
                    type: studioType,
                    submitButtonText: studioButtonText,
                    primaryColor: studioButtonColor,
                    successMessage: studioSuccessMsg,
                    redirectUrl: studioRedirectUrl || undefined,
                    notifyEmail: studioNotifyEmail || undefined,
                    fields: studioFields,
                })

                if (res.success && res.form) {
                    toast.success("Web Form created successfully")
                    setStudioIsNew(false)
                    setStudioFormId(res.form.id)
                    setSelectedEmbedForm(res.form)
                    router.refresh()
                } else {
                    toast.error(res.error || "Failed to create web form")
                }
            } else if (studioFormId) {
                const res = await updateWebForm(studioFormId, {
                    title: studioTitle,
                    description: studioDescription,
                    type: studioType,
                    submitButtonText: studioButtonText,
                    primaryColor: studioButtonColor,
                    successMessage: studioSuccessMsg,
                    redirectUrl: studioRedirectUrl || undefined,
                    notifyEmail: studioNotifyEmail || undefined,
                    fields: studioFields,
                })

                if (res.success) {
                    toast.success("Form configurations updated successfully")
                    router.refresh()
                } else {
                    toast.error(res.error || "Failed to update web form")
                }
            }
        })
    }

    // Toggle Form Active / Paused Status
    const handleToggleStatus = (formId: string, currentStatus: WebFormStatus) => {
        const nextStatus = currentStatus === WebFormStatus.ACTIVE ? WebFormStatus.PAUSED : WebFormStatus.ACTIVE
        startTransition(async () => {
            const res = await toggleWebFormStatus(formId, nextStatus)
            if (res.success) {
                toast.success(
                    nextStatus === WebFormStatus.ACTIVE
                        ? "Form activated. Ready for public inbound traffic."
                        : "Form paused. Public submissions temporarily held."
                )
                router.refresh()
            } else {
                toast.error(res.error || "Failed to toggle form status")
            }
        })
    }

    // Delete Form
    const handleDeleteForm = (formId: string, title: string) => {
        if (!confirm(`Are you sure you want to delete form "${title}"? This will also remove submission records.`)) {
            return
        }

        startTransition(async () => {
            const res = await deleteWebForm(formId)
            if (res.success) {
                toast.success("Web form deleted successfully")
                if (studioFormId === formId) {
                    const remaining = forms.filter((f) => f.id !== formId)
                    setStudioFormId(remaining.length > 0 ? remaining[0].id : null)
                }
                router.refresh()
            } else {
                toast.error(res.error || "Failed to delete web form")
            }
        })
    }

    // Studio Field Manipulations
    const handleAddField = () => {
        const fieldCount = studioFields.length + 1
        const newField: FormFieldConfig = {
            id: `field_${Date.now()}`,
            name: `custom_field_${fieldCount}`,
            label: `New Field ${fieldCount}`,
            type: "text",
            required: false,
            placeholder: `Enter info...`,
        }
        setStudioFields([...studioFields, newField])
    }

    const handleUpdateField = (index: number, updates: Partial<FormFieldConfig>) => {
        const next = [...studioFields]
        next[index] = { ...next[index], ...updates }
        setStudioFields(next)
    }

    const handleRemoveField = (index: number) => {
        if (studioFields.length <= 1) {
            toast.error("A web form must have at least one field")
            return
        }
        setStudioFields(studioFields.filter((_, i) => i !== index))
    }

    const handleMoveField = (index: number, direction: "up" | "down") => {
        if (direction === "up" && index === 0) return
        if (direction === "down" && index === studioFields.length - 1) return

        const next = [...studioFields]
        const targetIndex = direction === "up" ? index - 1 : index + 1
        const temp = next[index]
        next[index] = next[targetIndex]
        next[targetIndex] = temp
        setStudioFields(next)
    }

    // Open Simulator
    const handleOpenSimulator = (form: WebFormRecord) => {
        setSimulatingForm(form)
        setSimulatedFormData({})
        setSimulatorSubmitted(false)
        setShowSimulatorModal(true)
    }

    // Submit Simulation
    const handleExecuteSimulation = () => {
        if (!simulatingForm) return

        // Verify required fields
        for (const field of simulatingForm.fields) {
            if (field.required && !simulatedFormData[field.name || field.id]) {
                toast.error(`Please provide a value for required field: ${field.label}`)
                return
            }
        }

        startTransition(async () => {
            const res = await submitPublicForm({
                formIdOrCode: simulatingForm.id,
                data: simulatedFormData,
            })
            if (res.success) {
                setSimulatorSubmitted(true)
                toast.success("Simulation complete! Lead created in CRM.")
                router.refresh()
            } else {
                toast.error(res.error || "Simulation submission failed")
            }
        })
    }

    // Open Embed Modal
    const handleOpenEmbedModal = (form: WebFormRecord) => {
        setSelectedEmbedForm(form)
        setShowEmbedDialog(true)
    }

    // Copy to clipboard helper
    const handleCopySnippet = (text: string, label: string) => {
        navigator.clipboard.writeText(text)
        setCopiedSnippet(label)
        toast.success(`${label} copied to clipboard`)
        setTimeout(() => setCopiedSnippet(null), 2500)
    }

    // Pre-calculate base public URL
    const activeTargetForm = selectedEmbedForm || (forms.length > 0 ? forms[0] : null)
    const publicOrigin = typeof window !== "undefined" ? window.location.origin : "https://app.yourdomain.com"
    const publicSubmitEndpoint = activeTargetForm
        ? `${publicOrigin}/api/forms/${activeTargetForm.id}/submit`
        : `${publicOrigin}/api/forms/{formId}/submit`

    const iframeCodeSnippet = activeTargetForm
        ? `<iframe
  src="${publicOrigin}/forms/${activeTargetForm.code}"
  width="100%"
  height="620"
  frameborder="0"
  style="border: none; max-width: 680px; width: 100%; border-radius: 12px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);"
  title="${activeTargetForm.title}"
></iframe>`
        : ""

    const widgetScriptSnippet = activeTargetForm
        ? `<!-- ERP Cloud Lead Capture Widget -->
<div id="erp-form-${activeTargetForm.code}"></div>
<script>
  (function(w,d,s,o,f,js,fjs){
    w['ERPForm']=o;w[o]=w[o]||function(){(w[o].q=w[o].q||[]).push(arguments)};
    js=d.createElement(s);fjs=d.getElementsByTagName(s)[0];
    js.id=o;js.src='${publicOrigin}/widgets/lead-capture.js';js.async=1;
    fjs.parentNode.insertBefore(js,fjs);
  }(window,document,'script','erpForm'));

  erpForm('init', {
    formId: '${activeTargetForm.id}',
    containerId: 'erp-form-${activeTargetForm.code}',
    themeColor: '${activeTargetForm.primaryColor}'
  });
</script>`
        : ""

    const curlApiSnippet = activeTargetForm
        ? `curl -X POST "${publicSubmitEndpoint}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Alexander Vance",
    "email": "alexander.vance@techcorp.io",
    "company": "Vance Technologies",
    "phone": "+1 (555) 234-5678",
    "message": "Interested in enterprise ERP implementation for our 50-person team."
  }'`
        : ""

    const directShareUrl = activeTargetForm
        ? `${publicOrigin}/forms/${activeTargetForm.code}`
        : ""

    // Format badge colors for FormType
    const getTypeBadge = (type: WebFormType) => {
        switch (type) {
            case WebFormType.CONTACT:
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-medium">Contact</Badge>
            case WebFormType.QUOTE_REQUEST:
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-medium">Quote / RFQ</Badge>
            case WebFormType.DEMO_REQUEST:
                return <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 font-medium">Demo Request</Badge>
            case WebFormType.FEEDBACK:
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-medium">Feedback</Badge>
            case WebFormType.SUPPORT:
                return <Badge className="bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 font-medium">Support</Badge>
            default:
                return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-medium">Custom</Badge>
        }
    }

    return (
        <div className="flex flex-col min-h-screen bg-slate-50/50 dark:bg-slate-950/50 p-4 md:p-8 space-y-6">
            {/* Header Title and Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6 dark:border-slate-800">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-indigo-600 text-white rounded-xl shadow-md shadow-indigo-500/20">
                            <Globe className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                                Web Forms & Inbound Lead Capture
                            </h1>
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                                Embed branded intake forms on external websites, capture inbound leads, and synchronize with CRM pipelines.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2.5 flex-wrap">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.refresh()}
                        disabled={isPending}
                        className="gap-1.5"
                    >
                        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            if (forms.length > 0) {
                                handleOpenSimulator(forms[0])
                            } else {
                                toast.error("Create at least one form first to simulate submissions")
                            }
                        }}
                        className="gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50 dark:border-indigo-800 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                    >
                        <Play className="h-4 w-4 text-indigo-600" />
                        Test Simulator
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setShowNewFormDialog(true)}
                        className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm shadow-indigo-600/20"
                    >
                        <Plus className="h-4 w-4" />
                        Create Form
                    </Button>
                </div>
            </div>

            {/* KPI Metrics Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border shadow-xs bg-white dark:bg-slate-900/80">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Active Web Forms
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                                    {kpis.activeForms}
                                </span>
                                <span className="text-xs text-slate-500">
                                    of {kpis.totalForms} configured
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                            <ShieldCheck className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-xs bg-white dark:bg-slate-900/80">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Total Submissions
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                                    {kpis.totalSubmissions}
                                </span>
                                <span className="text-xs text-slate-500">
                                    inbound responses
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl">
                            <Inbox className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-xs bg-white dark:bg-slate-900/80">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Inbound Leads Captured
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                                    {kpis.leadsCaptured}
                                </span>
                                <Link
                                    href="/crm/leads"
                                    className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
                                >
                                    View in CRM <ArrowUpRight className="h-3 w-3" />
                                </Link>
                            </div>
                        </div>
                        <div className="p-3 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                            <UserPlus className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border shadow-xs bg-white dark:bg-slate-900/80">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                Avg. Conversion Rate
                            </p>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                                    {kpis.conversionRate}%
                                </span>
                                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                    Top-funnel
                                </span>
                            </div>
                        </div>
                        <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                            <Activity className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs Bar */}
            <div className="flex items-center justify-between border-b dark:border-slate-800 gap-4 flex-wrap">
                <div className="flex gap-2">
                    <button
                        onClick={() => setActiveTab("directory")}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === "directory"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                        <Layers className="h-4 w-4" />
                        Forms Directory ({forms.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("studio")}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === "studio"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                        <Sliders className="h-4 w-4" />
                        Form Studio & Builder
                    </button>
                    <button
                        onClick={() => setActiveTab("submissions")}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === "submissions"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                        <FileSpreadsheet className="h-4 w-4" />
                        Submissions Feed ({submissions.length})
                    </button>
                    <button
                        onClick={() => setActiveTab("integrations")}
                        className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                            activeTab === "integrations"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
                        }`}
                    >
                        <Code2 className="h-4 w-4" />
                        Embed & Integration Hub
                    </button>
                </div>
            </div>

            {/* TAB 1: FORMS DIRECTORY */}
            {activeTab === "directory" && (
                <div className="space-y-4">
                    {/* Filters & Search Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by title or code..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto overflow-x-auto">
                            <select
                                value={typeFilter}
                                onChange={(e) => setTypeFilter(e.target.value)}
                                className="h-9 px-3 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                            >
                                <option value="ALL">All Form Types</option>
                                <option value={WebFormType.CONTACT}>Contact</option>
                                <option value={WebFormType.QUOTE_REQUEST}>Quote / RFQ</option>
                                <option value={WebFormType.DEMO_REQUEST}>Demo Request</option>
                                <option value={WebFormType.FEEDBACK}>Feedback</option>
                                <option value={WebFormType.SUPPORT}>Support</option>
                                <option value={WebFormType.PARTNERSHIP}>Partnership</option>
                            </select>

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="h-9 px-3 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                            >
                                <option value="ALL">All Statuses</option>
                                <option value={WebFormStatus.ACTIVE}>Active</option>
                                <option value={WebFormStatus.PAUSED}>Paused</option>
                                <option value={WebFormStatus.DRAFT}>Draft</option>
                                <option value={WebFormStatus.ARCHIVED}>Archived</option>
                            </select>
                        </div>
                    </div>

                    {/* Forms Cards Grid */}
                    {filteredForms.length === 0 ? (
                        <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
                            <Globe className="h-10 w-10 text-slate-400 mx-auto mb-3 opacity-50" />
                            <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">No Web Forms Found</h3>
                            <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
                                No forms match the current search or filters. Create a new lead intake form to get started.
                            </p>
                            <Button onClick={() => setShowNewFormDialog(true)} size="sm" className="gap-2">
                                <Plus className="h-4 w-4" /> Create Form
                            </Button>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                            {filteredForms.map((form) => {
                                const isActive = form.status === WebFormStatus.ACTIVE
                                return (
                                    <Card
                                        key={form.id}
                                        className="border shadow-xs hover:shadow-md transition-shadow bg-white dark:bg-slate-900/80 flex flex-col justify-between"
                                    >
                                        <CardContent className="p-5 space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start justify-between gap-2">
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span
                                                            className="w-3 h-3 rounded-full shrink-0"
                                                            style={{ backgroundColor: form.primaryColor }}
                                                        />
                                                        <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-1">
                                                            {form.title}
                                                        </h3>
                                                    </div>
                                                    <p className="text-xs font-mono text-slate-500 dark:text-slate-400">
                                                        {form.code}
                                                    </p>
                                                </div>
                                                <div className="flex flex-col items-end gap-1.5">
                                                    {getTypeBadge(form.type)}
                                                    <span
                                                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                            isActive
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                                                                : "bg-slate-500/10 text-slate-500 border border-slate-500/20"
                                                        }`}
                                                    >
                                                        {form.status}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Description */}
                                            <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 min-h-[32px]">
                                                {form.description || "No description provided."}
                                            </p>

                                            {/* Fields & Stats overview */}
                                            <div className="grid grid-cols-2 gap-2 pt-2 border-t text-xs dark:border-slate-800">
                                                <div>
                                                    <span className="text-slate-400 block">Submissions</span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {form.submissionsCount} leads
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-slate-400 block">Fields</span>
                                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                        {form.fields.length} inputs
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="pt-3 border-t dark:border-slate-800 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenSimulator(form)}
                                                        title="Test live form simulator"
                                                        className="h-8 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-xs gap-1"
                                                    >
                                                        <Play className="h-3.5 w-3.5" />
                                                        Preview
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleOpenEmbedModal(form)}
                                                        title="View embed codes & snippets"
                                                        className="h-8 px-2 text-slate-600 hover:text-slate-900 text-xs gap-1"
                                                    >
                                                        <Code2 className="h-3.5 w-3.5" />
                                                        Embed
                                                    </Button>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => {
                                                            setStudioFormId(form.id)
                                                            setStudioIsNew(false)
                                                            setActiveTab("studio")
                                                        }}
                                                        title="Open in Form Studio"
                                                        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                                                    >
                                                        <Edit3 className="h-3.5 w-3.5" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleToggleStatus(form.id, form.status)}
                                                        title={isActive ? "Pause form" : "Activate form"}
                                                        className="h-8 w-8 p-0 text-slate-600 hover:text-slate-900"
                                                    >
                                                        {isActive ? (
                                                            <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                                                        ) : (
                                                            <Eye className="h-3.5 w-3.5 text-emerald-600" />
                                                        )}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleDeleteForm(form.id, form.title)}
                                                        title="Delete form"
                                                        className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: FORM STUDIO & VISUAL BUILDER */}
            {activeTab === "studio" && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Configuration & Fields Designer (7 cols) */}
                    <div className="lg:col-span-7 space-y-6">
                        {/* Selector & Actions */}
                        <div className="flex items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                            <div className="flex items-center gap-3">
                                <span className="text-xs font-semibold text-slate-500">Editing:</span>
                                {studioIsNew ? (
                                    <Badge className="bg-indigo-600 text-white">New Form Draft</Badge>
                                ) : (
                                    <select
                                        value={studioFormId || ""}
                                        onChange={(e) => {
                                            setStudioIsNew(false)
                                            setStudioFormId(e.target.value)
                                        }}
                                        className="h-9 px-3 text-xs border rounded-md bg-white dark:bg-slate-900 font-semibold"
                                    >
                                        {forms.map((f) => (
                                            <option key={f.id} value={f.id}>
                                                {f.title} ({f.code})
                                            </option>
                                        ))}
                                    </select>
                                )}
                            </div>

                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleSelectTemplate(WebFormType.CONTACT)}
                                    className="text-xs"
                                >
                                    New Draft
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleSaveStudioForm}
                                    disabled={isPending}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5 shadow-sm"
                                >
                                    <Check className="h-3.5 w-3.5" />
                                    {studioIsNew ? "Create Form" : "Save Changes"}
                                </Button>
                            </div>
                        </div>

                        {/* Basic Form Metadata */}
                        <Card className="border shadow-xs bg-white dark:bg-slate-900">
                            <CardContent className="p-5 space-y-4">
                                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                    <Settings2 className="h-4 w-4 text-indigo-600" />
                                    Form Settings & Branding
                                </h3>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        Form Title *
                                    </label>
                                    <Input
                                        value={studioTitle}
                                        onChange={(e) => setStudioTitle(e.target.value)}
                                        className="h-9 text-xs"
                                        placeholder="e.g. Enterprise Solution Inquiry"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                        Description / Headline
                                    </label>
                                    <Input
                                        value={studioDescription}
                                        onChange={(e) => setStudioDescription(e.target.value)}
                                        className="h-9 text-xs"
                                        placeholder="Brief text shown above inputs"
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Form Category
                                        </label>
                                        <select
                                            value={studioType}
                                            onChange={(e) => setStudioType(e.target.value as WebFormType)}
                                            className="w-full h-9 px-3 text-xs border rounded-md bg-white dark:bg-slate-900"
                                        >
                                            <option value={WebFormType.CONTACT}>Contact</option>
                                            <option value={WebFormType.QUOTE_REQUEST}>Quote / RFQ</option>
                                            <option value={WebFormType.DEMO_REQUEST}>Demo Request</option>
                                            <option value={WebFormType.FEEDBACK}>Feedback</option>
                                            <option value={WebFormType.SUPPORT}>Support</option>
                                            <option value={WebFormType.PARTNERSHIP}>Partnership</option>
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Button CTA Text
                                        </label>
                                        <Input
                                            value={studioButtonText}
                                            onChange={(e) => setStudioButtonText(e.target.value)}
                                            className="h-9 text-xs"
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Brand Primary Color
                                        </label>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="color"
                                                value={studioButtonColor}
                                                onChange={(e) => setStudioButtonColor(e.target.value)}
                                                className="w-9 h-9 p-0.5 rounded border cursor-pointer shrink-0"
                                            />
                                            <Input
                                                value={studioButtonColor}
                                                onChange={(e) => setStudioButtonColor(e.target.value)}
                                                className="h-9 text-xs font-mono"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Success Message Display
                                        </label>
                                        <Input
                                            value={studioSuccessMsg}
                                            onChange={(e) => setStudioSuccessMsg(e.target.value)}
                                            className="h-9 text-xs"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                            Optional Redirect URL
                                        </label>
                                        <Input
                                            value={studioRedirectUrl}
                                            onChange={(e) => setStudioRedirectUrl(e.target.value)}
                                            className="h-9 text-xs"
                                            placeholder="https://yourdomain.com/thank-you"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Form Fields Designer */}
                        <Card className="border shadow-xs bg-white dark:bg-slate-900">
                            <CardContent className="p-5 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                                        <Sliders className="h-4 w-4 text-indigo-600" />
                                        Input Fields Schema ({studioFields.length})
                                    </h3>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={handleAddField}
                                        className="text-xs gap-1.5 h-8 text-indigo-600 border-indigo-200 dark:border-indigo-800"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        Add Custom Field
                                    </Button>
                                </div>

                                <div className="space-y-3">
                                    {studioFields.map((field, idx) => (
                                        <div
                                            key={field.id || idx}
                                            className="p-3.5 border rounded-lg bg-slate-50/50 dark:bg-slate-950/40 dark:border-slate-800 space-y-3"
                                        >
                                            <div className="flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs font-mono bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded">
                                                        #{idx + 1}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                                                        {field.label}
                                                    </span>
                                                    {field.required && (
                                                        <span className="text-rose-500 text-xs font-bold">*</span>
                                                    )}
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={idx === 0}
                                                        onClick={() => handleMoveField(idx, "up")}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <ArrowUp className="h-3.5 w-3.5 text-slate-500" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        disabled={idx === studioFields.length - 1}
                                                        onClick={() => handleMoveField(idx, "down")}
                                                        className="h-7 w-7 p-0"
                                                    >
                                                        <ArrowDown className="h-3.5 w-3.5 text-slate-500" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveField(idx)}
                                                        className="h-7 w-7 p-0 text-rose-500 hover:text-rose-700"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-medium text-slate-500">
                                                        Field Label
                                                    </label>
                                                    <Input
                                                        value={field.label}
                                                        onChange={(e) =>
                                                            handleUpdateField(idx, { label: e.target.value })
                                                        }
                                                        className="h-8 text-xs"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-medium text-slate-500">
                                                        Key / Name
                                                    </label>
                                                    <Input
                                                        value={field.name || field.id}
                                                        onChange={(e) =>
                                                            handleUpdateField(idx, { name: e.target.value })
                                                        }
                                                        className="h-8 text-xs font-mono"
                                                    />
                                                </div>

                                                <div className="space-y-1">
                                                    <label className="text-[11px] font-medium text-slate-500">
                                                        Input Type
                                                    </label>
                                                    <select
                                                        value={field.type}
                                                        onChange={(e) =>
                                                            handleUpdateField(idx, {
                                                                type: e.target.value as any,
                                                            })
                                                        }
                                                        className="w-full h-8 px-2 text-xs border rounded-md bg-white dark:bg-slate-900"
                                                    >
                                                        <option value="text">Text (Single Line)</option>
                                                        <option value="email">Email Address</option>
                                                        <option value="tel">Phone / Tel</option>
                                                        <option value="textarea">Textarea (Multiline)</option>
                                                        <option value="select">Dropdown Select</option>
                                                        <option value="number">Number</option>
                                                    </select>
                                                </div>

                                                <div className="flex items-center gap-2 pt-5">
                                                    <label className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={!!field.required}
                                                            onChange={(e) =>
                                                                handleUpdateField(idx, {
                                                                    required: e.target.checked,
                                                                })
                                                            }
                                                            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        />
                                                        Required
                                                    </label>
                                                </div>
                                            </div>

                                            {/* Dropdown Options if select type */}
                                            {field.type === "select" && (
                                                <div className="space-y-1 pt-1">
                                                    <label className="text-[11px] font-medium text-slate-500">
                                                        Options (comma-separated)
                                                    </label>
                                                    <Input
                                                        value={(field.options || []).join(", ")}
                                                        onChange={(e) =>
                                                            handleUpdateField(idx, {
                                                                options: e.target.value
                                                                    .split(",")
                                                                    .map((s) => s.trim())
                                                                    .filter(Boolean),
                                                            })
                                                        }
                                                        placeholder="Option 1, Option 2, Option 3"
                                                        className="h-8 text-xs"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right: Live Interactive Visual Preview (5 cols) */}
                    <div className="lg:col-span-5 space-y-4">
                        <div className="sticky top-6">
                            <div className="flex items-center justify-between pb-2">
                                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                    <Laptop className="h-4 w-4 text-indigo-600" />
                                    Live Preview & Styling
                                </h3>
                                <span className="text-[11px] text-slate-400">Updates in real time</span>
                            </div>

                            {/* Rendered Mock Form */}
                            <div className="border rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-lg shadow-slate-200/50 dark:shadow-none space-y-5">
                                <div className="border-b pb-4 dark:border-slate-800">
                                    <h2 className="text-lg font-bold text-slate-900 dark:text-slate-50">
                                        {studioTitle || "Untitled Inbound Form"}
                                    </h2>
                                    {studioDescription && (
                                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                            {studioDescription}
                                        </p>
                                    )}
                                </div>

                                <div className="space-y-4">
                                    {studioFields.map((field) => (
                                        <div key={field.id} className="space-y-1.5">
                                            <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                {field.label}
                                                {field.required && (
                                                    <span className="text-rose-500">*</span>
                                                )}
                                            </label>

                                            {field.type === "textarea" ? (
                                                <Textarea
                                                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                                                    rows={3}
                                                    className="text-xs"
                                                    disabled
                                                />
                                            ) : field.type === "select" ? (
                                                <select
                                                    disabled
                                                    className="w-full h-9 px-3 text-xs border rounded-md bg-slate-50 dark:bg-slate-800 text-slate-500"
                                                >
                                                    <option>Select an option...</option>
                                                    {(field.options || []).map((opt, oIdx) => (
                                                        <option key={oIdx}>{opt}</option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <Input
                                                    type={field.type}
                                                    placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}...`}
                                                    className="h-9 text-xs"
                                                    disabled
                                                />
                                            )}
                                        </div>
                                    ))}

                                    <Button
                                        className="w-full text-white font-medium text-xs h-10 shadow-sm mt-2"
                                        style={{ backgroundColor: studioButtonColor }}
                                        disabled
                                    >
                                        {studioButtonText || "Submit"}
                                    </Button>

                                    <p className="text-[11px] text-center text-slate-400 flex items-center justify-center gap-1 pt-1">
                                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                        Spam protected by Honeypot & CRM Lead Gateway
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: SUBMISSIONS FEED */}
            {activeTab === "submissions" && (
                <div className="space-y-4">
                    {/* Filters & Search Toolbar */}
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Search by name, email, company..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9"
                            />
                        </div>

                        <div className="flex items-center gap-2.5 w-full sm:w-auto">
                            <select
                                value={submissionFormFilter}
                                onChange={(e) => setSubmissionFormFilter(e.target.value)}
                                className="h-9 px-3 py-1 text-xs border rounded-md bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
                            >
                                <option value="ALL">All Web Forms ({submissions.length})</option>
                                {forms.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Submissions Feed Table */}
                    <Card className="border shadow-xs bg-white dark:bg-slate-900 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                                <thead>
                                    <tr className="border-b bg-slate-50/75 dark:bg-slate-950/50 text-slate-500 dark:text-slate-400 font-semibold">
                                        <th className="py-3 px-4">Date & Time</th>
                                        <th className="py-3 px-4">Origin Web Form</th>
                                        <th className="py-3 px-4">Submitter Contact</th>
                                        <th className="py-3 px-4">CRM Lead Link</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredSubmissions.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400">
                                                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                                <p className="font-medium">No form submissions received yet</p>
                                                <p className="text-[11px] text-slate-500 mt-0.5">
                                                    Submissions from embedded forms or the test simulator will show up here.
                                                </p>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredSubmissions.map((sub) => {
                                            const subDate = new Date(sub.createdAt).toLocaleString("en-US", {
                                                month: "short",
                                                day: "numeric",
                                                year: "numeric",
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })
                                            const submitterName =
                                                sub.data?.fullName ||
                                                sub.data?.full_name ||
                                                sub.data?.name ||
                                                sub.contact?.displayName ||
                                                sub.lead?.title ||
                                                "Anonymous Visitor"
                                            const submitterEmail =
                                                sub.data?.email ||
                                                sub.data?.work_email ||
                                                sub.contact?.email ||
                                                "—"
                                            const formTitle = sub.webForm?.title || "Unknown Form"
                                            const formCode = sub.webForm?.code || ""

                                            return (
                                                <tr
                                                    key={sub.id}
                                                    className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors"
                                                >
                                                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                                                        {subDate}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <div>
                                                            <span className="font-semibold text-slate-800 dark:text-slate-200">
                                                                {formTitle}
                                                            </span>
                                                            <span className="block text-[10px] font-mono text-slate-400">
                                                                {formCode}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <div className="font-medium text-slate-900 dark:text-slate-100">
                                                            {submitterName}
                                                        </div>
                                                        <div className="text-[11px] text-slate-500 font-mono">
                                                            {submitterEmail}
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        {sub.lead ? (
                                                            <Link
                                                                href="/crm/leads"
                                                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800"
                                                            >
                                                                <UserPlus className="h-3 w-3" />
                                                                {sub.lead.title || "Lead Created"}
                                                                <ArrowUpRight className="h-3 w-3" />
                                                            </Link>
                                                        ) : (
                                                            <span className="text-slate-400 text-[11px]">Unlinked</span>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 whitespace-nowrap">
                                                        <span
                                                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                                                sub.status === FormSubmissionStatus.PROCESSED
                                                                    ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                                                    : sub.status === FormSubmissionStatus.SPAM
                                                                    ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                                                    : "bg-blue-500/10 text-blue-600 border border-blue-500/20"
                                                            }`}
                                                        >
                                                            {sub.status}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-right whitespace-nowrap">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => setSelectedSubmission(sub)}
                                                            className="h-7 text-xs text-slate-600 hover:text-slate-900 gap-1"
                                                        >
                                                            <Eye className="h-3.5 w-3.5" />
                                                            Inspect
                                                        </Button>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </Card>
                </div>
            )}

            {/* TAB 4: EMBED & INTEGRATION HUB */}
            {activeTab === "integrations" && (
                <div className="space-y-6">
                    {/* Choose Form Header */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                <Code2 className="h-4 w-4 text-indigo-600" />
                                Embed Code & API Generator
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                Select any web form to generate production-ready HTML embeds, JavaScript widget tags, or REST API endpoints.
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <span className="text-xs font-semibold text-slate-500">Target Form:</span>
                            <select
                                value={activeTargetForm?.id || ""}
                                onChange={(e) => {
                                    const found = forms.find((f) => f.id === e.target.value)
                                    if (found) setSelectedEmbedForm(found)
                                }}
                                className="h-9 px-3 text-xs border rounded-md bg-white dark:bg-slate-900 font-semibold"
                            >
                                {forms.map((f) => (
                                    <option key={f.id} value={f.id}>
                                        {f.title} ({f.code})
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {activeTargetForm ? (
                        <div className="space-y-4">
                            {/* Embed Types Tabs */}
                            <div className="flex items-center gap-2 border-b dark:border-slate-800">
                                <button
                                    onClick={() => setEmbedTab("iframe")}
                                    className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                        embedTab === "iframe"
                                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                            : "border-transparent text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    <FileCode className="h-3.5 w-3.5" />
                                    Responsive HTML iFrame
                                </button>
                                <button
                                    onClick={() => setEmbedTab("widget")}
                                    className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                        embedTab === "widget"
                                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                            : "border-transparent text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    <Sparkles className="h-3.5 w-3.5" />
                                    JavaScript Widget Script
                                </button>
                                <button
                                    onClick={() => setEmbedTab("url")}
                                    className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                        embedTab === "url"
                                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                            : "border-transparent text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    <Link2 className="h-3.5 w-3.5" />
                                    Direct Shareable URL
                                </button>
                                <button
                                    onClick={() => setEmbedTab("curl")}
                                    className={`pb-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
                                        embedTab === "curl"
                                            ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                            : "border-transparent text-slate-500 hover:text-slate-800"
                                    }`}
                                >
                                    <Terminal className="h-3.5 w-3.5" />
                                    Public REST API & cURL
                                </button>
                            </div>

                            {/* Embed Code Viewer Content */}
                            {embedTab === "iframe" && (
                                <Card className="border bg-white dark:bg-slate-900 shadow-xs">
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Paste this iframe directly into WordPress, Webflow, Squarespace, or any custom HTML page:
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCopySnippet(iframeCodeSnippet, "iFrame Snippet")}
                                                className="text-xs h-8 gap-1.5"
                                            >
                                                {copiedSnippet === "iFrame Snippet" ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                                Copy Snippet
                                            </Button>
                                        </div>
                                        <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                                            {iframeCodeSnippet}
                                        </pre>
                                    </CardContent>
                                </Card>
                            )}

                            {embedTab === "widget" && (
                                <Card className="border bg-white dark:bg-slate-900 shadow-xs">
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                Self-contained asynchronous script tag for dynamic client-side widget injection:
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCopySnippet(widgetScriptSnippet, "Widget Script")}
                                                className="text-xs h-8 gap-1.5"
                                            >
                                                {copiedSnippet === "Widget Script" ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                                Copy Script
                                            </Button>
                                        </div>
                                        <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                                            {widgetScriptSnippet}
                                        </pre>
                                    </CardContent>
                                </Card>
                            )}

                            {embedTab === "url" && (
                                <Card className="border bg-white dark:bg-slate-900 shadow-xs">
                                    <CardContent className="p-5 space-y-4">
                                        <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                            Direct hosted landing page URL. Share via email campaigns, social media, or customer support chats:
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                readOnly
                                                value={directShareUrl}
                                                className="h-10 text-xs font-mono bg-slate-50 dark:bg-slate-950"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={() => handleCopySnippet(directShareUrl, "Direct URL")}
                                                className="h-10 px-4 text-xs gap-1.5 shrink-0"
                                            >
                                                {copiedSnippet === "Direct URL" ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                                Copy Link
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {embedTab === "curl" && (
                                <Card className="border bg-white dark:bg-slate-900 shadow-xs">
                                    <CardContent className="p-5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
                                                CORS-enabled public intake API route (<code className="text-indigo-600">POST</code>). Honeypot anti-spam protected:
                                            </p>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleCopySnippet(curlApiSnippet, "cURL Request")}
                                                className="text-xs h-8 gap-1.5"
                                            >
                                                {copiedSnippet === "cURL Request" ? (
                                                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                                                ) : (
                                                    <Copy className="h-3.5 w-3.5" />
                                                )}
                                                Copy cURL
                                            </Button>
                                        </div>
                                        <pre className="p-4 rounded-lg bg-slate-950 text-slate-100 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed">
                                            {curlApiSnippet}
                                        </pre>
                                    </CardContent>
                                </Card>
                            )}
                        </div>
                    ) : null}
                </div>
            )}

            {/* MODAL 1: CREATE NEW FORM TEMPLATE PICKER */}
            <Dialog open={showNewFormDialog} onOpenChange={setShowNewFormDialog}>
                <DialogContent className="sm:max-w-[620px]">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Plus className="h-4 w-4 text-indigo-600" />
                            Choose Form Blueprint Template
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Select a battle-tested inbound form template to bootstrap your capture schema.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3">
                        <div
                            onClick={() => handleSelectTemplate(WebFormType.CONTACT)}
                            className="p-4 border rounded-xl hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer transition-all space-y-1.5"
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-emerald-500/10 text-emerald-600 rounded-md">
                                    <Globe className="h-4 w-4" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    General Inbound Contact
                                </h4>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Full Name, Email, Phone, Company, and Inquiry message.
                            </p>
                        </div>

                        <div
                            onClick={() => handleSelectTemplate(WebFormType.QUOTE_REQUEST)}
                            className="p-4 border rounded-xl hover:border-blue-600 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 cursor-pointer transition-all space-y-1.5"
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-blue-500/10 text-blue-600 rounded-md">
                                    <Flame className="h-4 w-4" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    Request for Quote (RFQ)
                                </h4>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Project Scope, Estimated Budget, Timeline, and Requirements.
                            </p>
                        </div>

                        <div
                            onClick={() => handleSelectTemplate(WebFormType.DEMO_REQUEST)}
                            className="p-4 border rounded-xl hover:border-indigo-600 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/20 cursor-pointer transition-all space-y-1.5"
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-indigo-500/10 text-indigo-600 rounded-md">
                                    <Laptop className="h-4 w-4" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    Enterprise Demo Booking
                                </h4>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Work Email, Job Title, Team Size, and Platform interests.
                            </p>
                        </div>

                        <div
                            onClick={() => handleSelectTemplate(WebFormType.PARTNERSHIP)}
                            className="p-4 border rounded-xl hover:border-purple-600 hover:bg-purple-50/50 dark:hover:bg-purple-950/20 cursor-pointer transition-all space-y-1.5"
                        >
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-purple-500/10 text-purple-600 rounded-md">
                                    <Sliders className="h-4 w-4" />
                                </div>
                                <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    Partnership & Integrations
                                </h4>
                            </div>
                            <p className="text-[11px] text-slate-500 leading-relaxed">
                                Inbound partner requests, ecosystem alliances, and custom integrations.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setShowNewFormDialog(false)}>
                            Cancel
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: LIVE SIMULATOR & TEST SUBMISSION */}
            <Dialog open={showSimulatorModal} onOpenChange={setShowSimulatorModal}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Play className="h-4 w-4 text-indigo-600" />
                            Live Form Submission Simulator
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Test the end-to-end inbound submission pipeline and verify automated CRM Lead creation.
                        </DialogDescription>
                    </DialogHeader>

                    {simulatingForm && (
                        <div className="space-y-4 py-2">
                            {simulatorSubmitted ? (
                                <div className="p-6 text-center bg-emerald-500/10 rounded-xl border border-emerald-500/20 space-y-3">
                                    <div className="w-12 h-12 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-md shadow-emerald-500/30">
                                        <Check className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-base font-bold text-emerald-900 dark:text-emerald-300">
                                        {simulatingForm.successMessage || "Submission Received!"}
                                    </h3>
                                    <p className="text-xs text-emerald-700 dark:text-emerald-400 max-w-sm mx-auto">
                                        A new lead has been automatically synthesized in the CRM database, linked to this form submission.
                                    </p>
                                    <div className="pt-2 flex justify-center gap-2">
                                        <Link href="/crm/leads">
                                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                                                <UserPlus className="h-3.5 w-3.5" />
                                                View In CRM Leads
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => {
                                                setSimulatorSubmitted(false)
                                                setSimulatedFormData({})
                                            }}
                                            className="text-xs"
                                        >
                                            Submit Another Test
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3.5">
                                    <div className="border-b pb-2">
                                        <h4 className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                                            {simulatingForm.title}
                                        </h4>
                                        <p className="text-xs text-slate-500">
                                            {simulatingForm.description}
                                        </p>
                                    </div>

                                    {simulatingForm.fields.map((field) => {
                                        const fieldKey = field.name || field.id
                                        return (
                                            <div key={field.id} className="space-y-1">
                                                <label className="text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                    {field.label}
                                                    {field.required && (
                                                        <span className="text-rose-500">*</span>
                                                    )}
                                                </label>

                                                {field.type === "textarea" ? (
                                                    <Textarea
                                                        placeholder={field.placeholder}
                                                        value={simulatedFormData[fieldKey] || ""}
                                                        onChange={(e) =>
                                                            setSimulatedFormData({
                                                                ...simulatedFormData,
                                                                [fieldKey]: e.target.value,
                                                            })
                                                        }
                                                        rows={3}
                                                        className="text-xs"
                                                    />
                                                ) : field.type === "select" ? (
                                                    <select
                                                        value={simulatedFormData[fieldKey] || ""}
                                                        onChange={(e) =>
                                                            setSimulatedFormData({
                                                                ...simulatedFormData,
                                                                [fieldKey]: e.target.value,
                                                            })
                                                        }
                                                        className="w-full h-9 px-3 text-xs border rounded-md bg-white dark:bg-slate-900"
                                                    >
                                                        <option value="">Select an option...</option>
                                                        {(field.options || []).map((opt, oIdx) => (
                                                            <option key={oIdx} value={opt}>
                                                                {opt}
                                                            </option>
                                                        ))}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        type={field.type === "tel" ? "tel" : field.type}
                                                        placeholder={field.placeholder}
                                                        value={simulatedFormData[fieldKey] || ""}
                                                        onChange={(e) =>
                                                            setSimulatedFormData({
                                                                ...simulatedFormData,
                                                                [fieldKey]: e.target.value,
                                                            })
                                                        }
                                                        className="h-9 text-xs"
                                                    />
                                                )}
                                            </div>
                                        )
                                    })}

                                    <Button
                                        onClick={handleExecuteSimulation}
                                        disabled={isPending}
                                        className="w-full text-white font-semibold text-xs h-10 shadow-sm mt-3"
                                        style={{ backgroundColor: simulatingForm.primaryColor }}
                                    >
                                        <Send className="h-3.5 w-3.5 mr-1.5" />
                                        {simulatingForm.submitButtonText || "Submit Request"}
                                    </Button>
                                </div>
                            )}
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* MODAL 3: EMBED DIALOG (SHORTCUT FROM DIRECTORY) */}
            <Dialog open={showEmbedDialog} onOpenChange={setShowEmbedDialog}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Code2 className="h-4 w-4 text-indigo-600" />
                            Embed Form: {activeTargetForm?.title}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Copy embed snippets to deploy this form onto external websites.
                        </DialogDescription>
                    </DialogHeader>

                    {activeTargetForm && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-2 border-b text-xs pb-2">
                                <button
                                    onClick={() => setEmbedTab("iframe")}
                                    className={`font-semibold pb-1 border-b-2 ${
                                        embedTab === "iframe"
                                            ? "border-indigo-600 text-indigo-600"
                                            : "border-transparent text-slate-500"
                                    }`}
                                >
                                    iFrame
                                </button>
                                <button
                                    onClick={() => setEmbedTab("widget")}
                                    className={`font-semibold pb-1 border-b-2 ${
                                        embedTab === "widget"
                                            ? "border-indigo-600 text-indigo-600"
                                            : "border-transparent text-slate-500"
                                    }`}
                                >
                                    JS Widget
                                </button>
                                <button
                                    onClick={() => setEmbedTab("url")}
                                    className={`font-semibold pb-1 border-b-2 ${
                                        embedTab === "url"
                                            ? "border-indigo-600 text-indigo-600"
                                            : "border-transparent text-slate-500"
                                    }`}
                                >
                                    Direct URL
                                </button>
                                <button
                                    onClick={() => setEmbedTab("curl")}
                                    className={`font-semibold pb-1 border-b-2 ${
                                        embedTab === "curl"
                                            ? "border-indigo-600 text-indigo-600"
                                            : "border-transparent text-slate-500"
                                    }`}
                                >
                                    cURL API
                                </button>
                            </div>

                            {embedTab === "iframe" && (
                                <pre className="p-3 bg-slate-950 text-slate-100 rounded-md font-mono text-xs overflow-x-auto">
                                    {iframeCodeSnippet}
                                </pre>
                            )}

                            {embedTab === "widget" && (
                                <pre className="p-3 bg-slate-950 text-slate-100 rounded-md font-mono text-xs overflow-x-auto">
                                    {widgetScriptSnippet}
                                </pre>
                            )}

                            {embedTab === "url" && (
                                <Input readOnly value={directShareUrl} className="h-9 text-xs font-mono" />
                            )}

                            {embedTab === "curl" && (
                                <pre className="p-3 bg-slate-950 text-slate-100 rounded-md font-mono text-xs overflow-x-auto">
                                    {curlApiSnippet}
                                </pre>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            size="sm"
                            onClick={() => {
                                const snippet =
                                    embedTab === "iframe"
                                        ? iframeCodeSnippet
                                        : embedTab === "widget"
                                        ? widgetScriptSnippet
                                        : embedTab === "url"
                                        ? directShareUrl
                                        : curlApiSnippet
                                handleCopySnippet(snippet, "Code")
                            }}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs gap-1.5"
                        >
                            <Copy className="h-3.5 w-3.5" />
                            Copy Snippet
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 4: SUBMISSION PAYLOAD INSPECTOR */}
            <Dialog open={!!selectedSubmission} onOpenChange={(open) => !open && setSelectedSubmission(null)}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <Eye className="h-4 w-4 text-indigo-600" />
                            Form Submission Inspector
                        </DialogTitle>
                        <DialogDescription className="text-xs text-slate-500">
                            Raw payload and mapped CRM lead attributes for this inbound response.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedSubmission && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-2 gap-3 text-xs bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border">
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Origin Form:</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                                        {selectedSubmission.webForm?.title || "Web Form"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Submitted At:</span>
                                    <span className="font-mono text-slate-600 dark:text-slate-300">
                                        {new Date(selectedSubmission.createdAt).toLocaleString()}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">Client IP:</span>
                                    <span className="font-mono text-slate-600 dark:text-slate-300">
                                        {selectedSubmission.ipAddress || "127.0.0.1"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-slate-400 block text-[11px]">CRM Lead:</span>
                                    {selectedSubmission.lead ? (
                                        <Link
                                            href="/crm/leads"
                                            className="text-indigo-600 hover:underline font-semibold flex items-center gap-1"
                                        >
                                            {selectedSubmission.lead.title}
                                            <ArrowUpRight className="h-3 w-3" />
                                        </Link>
                                    ) : (
                                        <span className="text-slate-400">None</span>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                                    Raw JSON Form Payload
                                </label>
                                <pre className="p-3.5 rounded-lg bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto border border-slate-800 leading-relaxed max-h-60">
                                    {JSON.stringify(selectedSubmission.data, null, 2)}
                                </pre>
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedSubmission(null)}
                            className="text-xs"
                        >
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
