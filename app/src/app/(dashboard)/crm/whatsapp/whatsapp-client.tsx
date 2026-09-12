"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
    MessageSquare,
    Send,
    CheckCheck,
    Check,
    ExternalLink,
    Clock,
    FileText,
    AlertCircle,
    CheckCircle2,
    Settings2,
    Search,
    User,
    Building2,
    Phone,
    RefreshCw,
    Shield,
    Sparkles,
    Copy,
    Receipt,
    Calendar,
    ArrowUpRight,
    Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { toast } from "sonner"
import {
    WhatsAppConfig,
    WhatsAppMessage,
    WhatsAppTemplateKey,
    WHATSAPP_TEMPLATES,
    normalizeE164Phone,
    generateWhatsAppDirectLink,
    interpolateWhatsAppTemplate,
} from "@/lib/whatsapp-engine"
import {
    saveWhatsAppConfig,
    sendWhatsAppMessage,
    sendInvoiceViaWhatsApp,
    testWhatsAppConnection,
} from "@/app/actions/crm/whatsapp"

interface Props {
    initialConfig: WhatsAppConfig
    initialMessages: WhatsAppMessage[]
    contacts: Array<{
        id: string
        name: string
        phone: string | null
        email: string | null
        type: string
        updatedAt: Date
    }>
    invoices: Array<{
        id: string
        invoice_number: string
        customer_name: string
        total_amount: any
        status: string
        due_date: Date | null
        contact?: { id: string; name: string; phone: string | null } | null
    }>
    companyName: string
    currencyCode: string
}

export default function WhatsAppClient({
    initialConfig,
    initialMessages,
    contacts,
    invoices,
    companyName,
    currencyCode,
}: Props) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Active Navigation Tab
    const [activeTab, setActiveTab] = useState<"chat" | "dispatcher" | "templates" | "config">("chat")

    // Gateway Config State
    const [config, setConfig] = useState<WhatsAppConfig>(initialConfig)
    const [isTesting, setIsTesting] = useState(false)
    const [testResult, setTestResult] = useState<{ success?: boolean; message?: string } | null>(null)

    // Chat Desk State
    const [searchContact, setSearchContact] = useState("")
    const [selectedContact, setSelectedContact] = useState<typeof contacts[0] | null>(contacts[0] || null)
    const [selectedTemplateKey, setSelectedTemplateKey] = useState<WhatsAppTemplateKey | "CUSTOM">("CUSTOM")
    const [customText, setCustomText] = useState("")
    const [templateVars, setTemplateVars] = useState<Record<string, string>>({})
    const [messages, setMessages] = useState<WhatsAppMessage[]>(initialMessages)

    // Dispatcher Modal State
    const [dispatchModalOpen, setDispatchModalOpen] = useState(false)
    const [selectedInvoice, setSelectedInvoice] = useState<typeof invoices[0] | null>(null)
    const [dispatchType, setDispatchType] = useState<"INVOICE_DISPATCH" | "PAYMENT_OVERDUE_REMINDER">("INVOICE_DISPATCH")
    const [dispatchPhone, setDispatchPhone] = useState("")

    // Filter contacts
    const filteredContacts = contacts.filter((c) =>
        c.name.toLowerCase().includes(searchContact.toLowerCase()) ||
        (c.phone && c.phone.includes(searchContact))
    )

    // Filter messages for selected contact
    const activeContactMessages = selectedContact
        ? messages.filter(
            (m) =>
                m.contactId === selectedContact.id ||
                (selectedContact.phone && m.recipientPhone.includes(selectedContact.phone.replace(/\D/g, "")))
        )
        : messages

    // Computed Telemetry
    const totalSent = messages.filter((m) => m.direction === "OUTBOUND").length
    const totalDelivered = messages.filter((m) => m.status === "DELIVERED" || m.status === "READ").length
    const totalRead = messages.filter((m) => m.status === "READ").length
    const deliveryRate = totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 100
    const readRate = totalSent > 0 ? Math.round((totalRead / totalSent) * 100) : 0

    // Handle template switch in chat composer
    const handleSelectTemplate = (key: WhatsAppTemplateKey | "CUSTOM") => {
        setSelectedTemplateKey(key)
        if (key === "CUSTOM") {
            setCustomText("")
            setTemplateVars({})
        } else {
            const tmpl = WHATSAPP_TEMPLATES[key]
            const initialVars: Record<string, string> = {
                customer_name: selectedContact?.name || "Customer",
                company_name: companyName,
            }
            tmpl.variables.forEach((v) => {
                if (!initialVars[v]) {
                    initialVars[v] = tmpl.sampleVariables[v] || ""
                }
            })
            setTemplateVars(initialVars)
            setCustomText(interpolateWhatsAppTemplate(tmpl.bodyTemplate, initialVars))
        }
    }

    // Update variable in template
    const handleVarChange = (key: string, val: string) => {
        const nextVars = { ...templateVars, [key]: val }
        setTemplateVars(nextVars)
        if (selectedTemplateKey !== "CUSTOM") {
            const tmpl = WHATSAPP_TEMPLATES[selectedTemplateKey]
            setCustomText(interpolateWhatsAppTemplate(tmpl.bodyTemplate, nextVars))
        }
    }

    // Send Message
    const handleSendMessage = () => {
        if (!selectedContact?.phone) {
            toast.error("Contact does not have a phone number")
            return
        }
        if (!customText.trim()) {
            toast.error("Message content cannot be empty")
            return
        }

        startTransition(async () => {
            const res = await sendWhatsAppMessage({
                recipientPhone: selectedContact.phone!,
                contactId: selectedContact.id,
                contactName: selectedContact.name,
                templateKey: selectedTemplateKey === "CUSTOM" ? undefined : selectedTemplateKey,
                variables: templateVars,
                customText,
            })

            if (res.success) {
                toast.success(
                    res.simulated
                        ? "Message simulated & recorded in timeline!"
                        : "WhatsApp message dispatched successfully!"
                )
                if (res.message) {
                    setMessages((prev) => [res.message!, ...prev])
                }
                setCustomText("")
                setSelectedTemplateKey("CUSTOM")
            } else {
                toast.error(res.error || "Failed to dispatch message")
            }
        })
    }

    // Open WhatsApp Web
    const handleOpenWhatsAppWeb = (phone: string, text: string) => {
        const url = generateWhatsAppDirectLink(phone, text, config.defaultCountryCode || "91")
        window.open(url, "_blank")
    }

    // Handle Config Save
    const handleSaveConfig = async (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            const res = await saveWhatsAppConfig(config)
            if (res.success) {
                toast.success("WhatsApp configuration updated successfully!")
            } else {
                toast.error(res.error || "Failed to save configuration")
            }
        })
    }

    // Handle Connection Test
    const handleTestConnection = async () => {
        setIsTesting(true)
        setTestResult(null)
        try {
            const res = await testWhatsAppConnection()
            if (res.success) {
                setTestResult({ success: true, message: res.message })
                toast.success("WhatsApp Gateway connection verified!")
            } else {
                setTestResult({ success: false, message: res.error })
                toast.error(res.error || "Connection test failed")
            }
        } finally {
            setIsTesting(false)
        }
    }

    // Open Dispatcher Modal for Invoice
    const handleOpenDispatchModal = (inv: typeof invoices[0], type: "INVOICE_DISPATCH" | "PAYMENT_OVERDUE_REMINDER") => {
        setSelectedInvoice(inv)
        setDispatchType(type)
        setDispatchPhone(inv.contact?.phone || "")
        setDispatchModalOpen(true)
    }

    // Execute Invoice Dispatch
    const handleExecuteInvoiceDispatch = () => {
        if (!selectedInvoice) return
        if (!dispatchPhone) {
            toast.error("Please enter a valid recipient phone number")
            return
        }

        startTransition(async () => {
            const res = await sendInvoiceViaWhatsApp({
                invoiceId: selectedInvoice.id,
                recipientPhone: dispatchPhone,
                templateKey: dispatchType,
            })

            if (res.success) {
                toast.success(
                    res.simulated
                        ? `Invoice dispatch simulated for ${selectedInvoice.invoice_number}!`
                        : `Invoice ${selectedInvoice.invoice_number} shared on WhatsApp!`
                )
                if (res.message) {
                    setMessages((prev) => [res.message!, ...prev])
                }
                setDispatchModalOpen(false)
            } else {
                toast.error(res.error || "Failed to dispatch invoice via WhatsApp")
            }
        })
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
                        <div className="h-9 w-9 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                            <MessageSquare className="h-5 w-5" />
                        </div>
                        WhatsApp Business Hub
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Meta Cloud API gateway, statutory transactional templates, and customer chat console
                    </p>
                </div>

                {/* Gateway Mode Badge */}
                <div className="flex items-center gap-2">
                    <Badge
                        variant="outline"
                        className={`text-xs px-2.5 py-1 font-semibold flex items-center gap-1.5 ${
                            config.mode === "CLOUD_API"
                                ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30"
                                : config.mode === "DIRECT_LINK"
                                ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/30"
                                : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30"
                        }`}
                    >
                        <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                        Mode: {config.mode.replace("_", " ")}
                    </Badge>
                </div>
            </div>

            {/* Telemetry Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Messages Sent
                            </div>
                            <div className="text-2xl font-bold mt-1 text-foreground">{totalSent}</div>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <Send className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Delivery Rate
                            </div>
                            <div className="text-2xl font-bold mt-1 text-foreground">{deliveryRate}%</div>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <CheckCheck className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Read Receipts
                            </div>
                            <div className="text-2xl font-bold mt-1 text-foreground">{readRate}%</div>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-indigo-600 flex items-center justify-center">
                            <Check className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Connected Contacts
                            </div>
                            <div className="text-2xl font-bold mt-1 text-foreground">{contacts.length}</div>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                            <User className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b">
                <button
                    onClick={() => setActiveTab("chat")}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "chat"
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <MessageSquare className="h-4 w-4" />
                    Live Chat & Dispatch
                </button>
                <button
                    onClick={() => setActiveTab("dispatcher")}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "dispatcher"
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Receipt className="h-4 w-4" />
                    Invoices & Overdue Reminders ({invoices.length})
                </button>
                <button
                    onClick={() => setActiveTab("templates")}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "templates"
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Sparkles className="h-4 w-4" />
                    Message Templates (6)
                </button>
                <button
                    onClick={() => setActiveTab("config")}
                    className={`pb-3 px-4 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
                        activeTab === "config"
                            ? "border-emerald-500 text-emerald-600 dark:text-emerald-400"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    <Settings2 className="h-4 w-4" />
                    Meta Gateway Settings
                </button>
            </div>

            {/* ==================================================================== */}
            {/* TAB 1: LIVE CHAT & DISPATCH DESK */}
            {/* ==================================================================== */}
            {activeTab === "chat" && (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 h-[720px]">
                    {/* Left: Contact List */}
                    <Card className="md:col-span-4 border-primary/10 shadow-sm flex flex-col overflow-hidden">
                        <CardHeader className="p-3 border-b bg-muted/20 space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Customer Contacts
                                </span>
                                <Badge variant="secondary" className="text-[10px]">
                                    {filteredContacts.length}
                                </Badge>
                            </div>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                <Input
                                    placeholder="Search customer or phone..."
                                    value={searchContact}
                                    onChange={(e) => setSearchContact(e.target.value)}
                                    className="h-8 text-xs pl-8 bg-background"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="p-0 flex-1 overflow-y-auto divide-y divide-border/40">
                            {filteredContacts.length > 0 ? (
                                filteredContacts.map((c) => {
                                    const isSelected = selectedContact?.id === c.id
                                    return (
                                        <button
                                            key={c.id}
                                            onClick={() => {
                                                setSelectedContact(c)
                                                handleSelectTemplate("CUSTOM")
                                            }}
                                            className={`w-full text-left p-3 transition-colors flex items-start gap-3 hover:bg-muted/40 ${
                                                isSelected ? "bg-emerald-500/10 border-l-4 border-emerald-500" : ""
                                            }`}
                                        >
                                            <div className="h-9 w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                                {c.name.slice(0, 2).toUpperCase()}
                                            </div>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-semibold truncate text-foreground">
                                                        {c.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground uppercase">
                                                        {c.type}
                                                    </span>
                                                </div>
                                                <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5 font-mono">
                                                    <Phone className="h-2.5 w-2.5" />
                                                    {c.phone || "No phone"}
                                                </div>
                                            </div>
                                        </button>
                                    )
                                })
                            ) : (
                                <div className="p-8 text-center text-xs text-muted-foreground">
                                    No contacts found with a phone number.
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Right: WhatsApp Chat Viewport & Composer */}
                    <Card className="md:col-span-8 border-primary/10 shadow-sm flex flex-col overflow-hidden bg-muted/10">
                        {selectedContact ? (
                            <>
                                {/* Chat Header */}
                                <div className="p-3 bg-card border-b flex items-center justify-between shadow-xs">
                                    <div className="flex items-center gap-3">
                                        <div className="h-9 w-9 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                                            {selectedContact.name.slice(0, 2).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-foreground">
                                                {selectedContact.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground font-mono flex items-center gap-2">
                                                <span>+{normalizeE164Phone(selectedContact.phone || "", config.defaultCountryCode || "91")}</span>
                                                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                <span className="text-[11px] text-emerald-600">WhatsApp Verified</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        {selectedContact.phone && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleOpenWhatsAppWeb(selectedContact.phone!, customText || "Hello")}
                                                className="text-xs gap-1.5 h-8 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                                            >
                                                <ExternalLink className="h-3.5 w-3.5" />
                                                Open Web
                                            </Button>
                                        )}
                                    </div>
                                </div>

                                {/* Chat Message Stream */}
                                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#e5ddd5]/20 dark:bg-black/30">
                                    {activeContactMessages.length > 0 ? (
                                        activeContactMessages.map((msg) => {
                                            const isOutbound = msg.direction === "OUTBOUND"
                                            return (
                                                <div
                                                    key={msg.id}
                                                    className={`flex ${isOutbound ? "justify-end" : "justify-start"}`}
                                                >
                                                    <div
                                                        className={`max-w-[78%] rounded-2xl p-3 shadow-xs text-xs space-y-1 ${
                                                            isOutbound
                                                                ? "bg-[#d9fdd3] text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-100 rounded-tr-none border border-emerald-300/40"
                                                                : "bg-card text-foreground rounded-tl-none border border-border"
                                                        }`}
                                                    >
                                                        {msg.templateKey && (
                                                            <div className="text-[10px] font-bold uppercase tracking-wider opacity-75 border-b pb-1 mb-1 border-current/20">
                                                                Template: {msg.templateKey.replace(/_/g, " ")}
                                                            </div>
                                                        )}
                                                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                                                        <div className="flex items-center justify-end gap-1.5 text-[10px] opacity-60 pt-0.5">
                                                            <span>
                                                                {new Date(msg.timestamp).toLocaleTimeString([], {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                })}
                                                            </span>
                                                            {isOutbound && (
                                                                msg.status === "READ" ? (
                                                                    <CheckCheck className="h-3.5 w-3.5 text-blue-500 font-bold" />
                                                                ) : msg.status === "DELIVERED" ? (
                                                                    <CheckCheck className="h-3.5 w-3.5" />
                                                                ) : msg.status === "SENT" ? (
                                                                    <Check className="h-3.5 w-3.5" />
                                                                ) : (
                                                                    <Clock className="h-3 w-3" />
                                                                )
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            )
                                        })
                                    ) : (
                                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-center p-8 space-y-2">
                                            <MessageSquare className="h-10 w-10 opacity-30 text-emerald-500" />
                                            <p className="text-sm font-semibold text-foreground">
                                                No WhatsApp chat history yet
                                            </p>
                                            <p className="text-xs max-w-xs">
                                                Choose a template below or compose a custom message to begin conversations with {selectedContact.name}.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Composer Box */}
                                <div className="p-3 bg-card border-t space-y-3">
                                    {/* Template Selection Pill Bar */}
                                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                                        <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                                            Templates:
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => handleSelectTemplate("CUSTOM")}
                                            className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                                                selectedTemplateKey === "CUSTOM"
                                                    ? "bg-emerald-600 text-white"
                                                    : "bg-muted text-muted-foreground hover:text-foreground"
                                            }`}
                                        >
                                            Freeform
                                        </button>
                                        {Object.keys(WHATSAPP_TEMPLATES).map((key) => {
                                            const tmpl = WHATSAPP_TEMPLATES[key as WhatsAppTemplateKey]
                                            const isSelected = selectedTemplateKey === key
                                            return (
                                                <button
                                                    key={key}
                                                    type="button"
                                                    onClick={() => handleSelectTemplate(key as WhatsAppTemplateKey)}
                                                    className={`px-2.5 py-1 rounded-full text-xs font-semibold transition-colors shrink-0 ${
                                                        isSelected
                                                            ? "bg-emerald-600 text-white"
                                                            : "bg-muted text-muted-foreground hover:text-foreground"
                                                    }`}
                                                >
                                                    {tmpl.name}
                                                </button>
                                            )
                                        })}
                                    </div>

                                    {/* Template Variable Fillers (If template chosen) */}
                                    {selectedTemplateKey !== "CUSTOM" && (
                                        <div className="p-2.5 bg-muted/40 rounded-lg border border-border/60 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                            {WHATSAPP_TEMPLATES[selectedTemplateKey].variables.map((v) => (
                                                <div key={v} className="space-y-0.5">
                                                    <Label className="text-[10px] text-muted-foreground font-mono">
                                                        {`{{${v}}}`}
                                                    </Label>
                                                    <Input
                                                        value={templateVars[v] || ""}
                                                        onChange={(e) => handleVarChange(v, e.target.value)}
                                                        placeholder={v}
                                                        className="h-7 text-xs bg-background"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Textarea Composer */}
                                    <div className="flex gap-2">
                                        <Textarea
                                            value={customText}
                                            onChange={(e) => setCustomText(e.target.value)}
                                            placeholder={`Type WhatsApp message to ${selectedContact.name}...`}
                                            className="text-xs min-h-[64px] max-h-[140px] bg-background resize-y"
                                        />
                                        <div className="flex flex-col gap-1.5 shrink-0">
                                            <Button
                                                size="sm"
                                                onClick={handleSendMessage}
                                                disabled={isPending || !selectedContact.phone || !customText.trim()}
                                                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 h-9 font-semibold text-xs"
                                            >
                                                {isPending ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Send className="h-3.5 w-3.5" />
                                                )}
                                                Send API
                                            </Button>
                                            {selectedContact.phone && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => handleOpenWhatsAppWeb(selectedContact.phone!, customText)}
                                                    className="text-xs h-8 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                                                >
                                                    wa.me
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="h-full flex items-center justify-center p-8 text-muted-foreground text-center">
                                Select a contact from the left to view messages or compose.
                            </div>
                        )}
                    </Card>
                </div>
            )}

            {/* ==================================================================== */}
            {/* TAB 2: INVOICES & REMINDERS DISPATCHER */}
            {/* ==================================================================== */}
            {activeTab === "dispatcher" && (
                <Card className="border-primary/10 shadow-sm overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b pb-3">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-emerald-600" />
                                    One-Click Invoice & Payment Reminder Dispatcher
                                </CardTitle>
                                <CardDescription>
                                    Share tax invoices, download links, and trigger automated dunning reminders via WhatsApp
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        {invoices.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Phone</TableHead>
                                        <TableHead>Due Date</TableHead>
                                        <TableHead>Total Amount</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invoices.map((inv) => {
                                        const phone = inv.contact?.phone || ""
                                        const isOverdue = inv.due_date && new Date(inv.due_date) < new Date() && inv.status !== "PAID"
                                        return (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-mono text-xs font-bold">
                                                    {inv.invoice_number}
                                                </TableCell>
                                                <TableCell className="text-xs font-semibold">
                                                    {inv.customer_name}
                                                </TableCell>
                                                <TableCell className="text-xs font-mono">
                                                    {phone || <span className="text-muted-foreground italic">No phone</span>}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {inv.due_date ? new Date(inv.due_date).toLocaleDateString() : "Immediate"}
                                                </TableCell>
                                                <TableCell className="text-xs font-bold">
                                                    {currencyCode} {Number(inv.total_amount).toFixed(2)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge
                                                        variant="outline"
                                                        className={`text-[10px] font-bold uppercase ${
                                                            inv.status === "PAID"
                                                                ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                                                                : isOverdue
                                                                ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                                                                : "bg-amber-500/10 text-amber-600 border-amber-500/30"
                                                        }`}
                                                    >
                                                        {isOverdue ? "OVERDUE" : inv.status}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => handleOpenDispatchModal(inv, "INVOICE_DISPATCH")}
                                                            className="text-xs h-7 gap-1 border-emerald-500/40 text-emerald-700 dark:text-emerald-400"
                                                        >
                                                            <Send className="h-3 w-3" />
                                                            Send Bill
                                                        </Button>
                                                        {isOverdue && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => handleOpenDispatchModal(inv, "PAYMENT_OVERDUE_REMINDER")}
                                                                className="text-xs h-7 gap-1 border-amber-500/40 text-amber-700 dark:text-amber-400"
                                                            >
                                                                <Clock className="h-3 w-3" />
                                                                Reminder
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="p-8 text-center text-xs text-muted-foreground">
                                No outstanding sales invoices found.
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* ==================================================================== */}
            {/* TAB 3: MESSAGE TEMPLATES */}
            {/* ==================================================================== */}
            {activeTab === "templates" && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Object.keys(WHATSAPP_TEMPLATES).map((key) => {
                        const tmpl = WHATSAPP_TEMPLATES[key as WhatsAppTemplateKey]
                        const sampleRendered = interpolateWhatsAppTemplate(tmpl.bodyTemplate, tmpl.sampleVariables)
                        return (
                            <Card key={key} className="border-primary/10 shadow-sm flex flex-col justify-between">
                                <CardHeader className="pb-3 bg-muted/20 border-b">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="text-[10px] font-bold uppercase">
                                            {tmpl.category}
                                        </Badge>
                                        <span className="font-mono text-[10px] text-muted-foreground">
                                            {tmpl.key}
                                        </span>
                                    </div>
                                    <CardTitle className="text-sm font-bold mt-2">{tmpl.name}</CardTitle>
                                    <CardDescription className="text-xs">{tmpl.description}</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-4 space-y-3 flex-1 flex flex-col justify-between">
                                    {/* Preview WhatsApp Bubble */}
                                    <div className="p-3 rounded-xl bg-[#d9fdd3] text-emerald-950 dark:bg-emerald-900/40 dark:text-emerald-100 text-xs border border-emerald-300/40 space-y-1 shadow-xs">
                                        <p className="whitespace-pre-wrap">{sampleRendered}</p>
                                        <div className="flex items-center justify-end gap-1 text-[10px] opacity-60">
                                            <span>10:42 AM</span>
                                            <CheckCheck className="h-3 w-3 text-blue-500" />
                                        </div>
                                    </div>

                                    {/* Variables Pill List */}
                                    <div className="space-y-1 pt-2 border-t text-xs">
                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                            Interpolated Variables:
                                        </span>
                                        <div className="flex flex-wrap gap-1">
                                            {tmpl.variables.map((v) => (
                                                <Badge key={v} variant="secondary" className="text-[10px] font-mono">
                                                    {`{{${v}}}`}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* ==================================================================== */}
            {/* TAB 4: META GATEWAY SETTINGS */}
            {/* ==================================================================== */}
            {activeTab === "config" && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Left: Configuration Form */}
                    <Card className="border-primary/10 shadow-sm">
                        <CardHeader className="bg-muted/20 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Settings2 className="h-4 w-4 text-emerald-600" />
                                Meta Cloud API Credentials
                            </CardTitle>
                            <CardDescription>
                                Setup Meta Developer App credentials or configure fallback modes
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            <form onSubmit={handleSaveConfig} className="space-y-4 text-xs">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Gateway Mode</Label>
                                    <select
                                        value={config.mode}
                                        onChange={(e) => setConfig({ ...config, mode: e.target.value as any })}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                                    >
                                        <option value="SIMULATION">Simulation Gateway (Zero API Key required)</option>
                                        <option value="DIRECT_LINK">Direct wa.me Links Only (WhatsApp Web / App)</option>
                                        <option value="CLOUD_API">Meta Graph API v20.0 (Automated Server Delivery)</option>
                                    </select>
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Phone Number ID (Meta Graph API)</Label>
                                    <Input
                                        value={config.phoneNumberId || ""}
                                        onChange={(e) => setConfig({ ...config, phoneNumberId: e.target.value })}
                                        placeholder="e.g. 109283746501928"
                                        className="text-xs bg-background"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">WhatsApp Business Account ID (WABA ID)</Label>
                                    <Input
                                        value={config.wabaId || ""}
                                        onChange={(e) => setConfig({ ...config, wabaId: e.target.value })}
                                        placeholder="e.g. 293847561029384"
                                        className="text-xs bg-background"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <Label className="text-xs font-semibold">Permanent System User Access Token</Label>
                                    <Input
                                        type="password"
                                        value={config.accessToken || ""}
                                        onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
                                        placeholder="EAAG..."
                                        className="text-xs bg-background font-mono"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Default Country Code</Label>
                                        <Input
                                            value={config.defaultCountryCode || "91"}
                                            onChange={(e) => setConfig({ ...config, defaultCountryCode: e.target.value })}
                                            placeholder="e.g. 91, 1, 44, 971"
                                            className="text-xs bg-background"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <Label className="text-xs font-semibold">Sender Display Name</Label>
                                        <Input
                                            value={config.senderDisplayName || ""}
                                            onChange={(e) => setConfig({ ...config, senderDisplayName: e.target.value })}
                                            placeholder="e.g. Acme ERP Sales"
                                            className="text-xs bg-background"
                                        />
                                    </div>
                                </div>

                                <div className="pt-3 border-t flex items-center justify-end gap-2">
                                    <Button
                                        type="submit"
                                        disabled={isPending}
                                        className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                                    >
                                        {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />}
                                        Save Configuration
                                    </Button>
                                </div>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Right: Webhook Setup & Live Connection Test */}
                    <div className="space-y-6">
                        <Card className="border-primary/10 shadow-sm">
                            <CardHeader className="bg-muted/20 border-b pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-emerald-600" />
                                    Meta Webhook Configuration
                                </CardTitle>
                                <CardDescription>
                                    Configure this endpoint in your Meta App Dashboard for status callbacks
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-4 text-xs">
                                <div className="space-y-1.5">
                                    <span className="font-semibold text-muted-foreground">Webhook Callback URL</span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            readOnly
                                            value={`${typeof window !== "undefined" ? window.location.origin : "https://erp.genesoft.ai"}/api/webhooks/whatsapp`}
                                            className="text-xs bg-muted font-mono"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                const url = `${window.location.origin}/api/webhooks/whatsapp`
                                                navigator.clipboard.writeText(url)
                                                toast.success("Webhook URL copied to clipboard!")
                                            }}
                                            className="h-9 px-3"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <span className="font-semibold text-muted-foreground">Verify Token</span>
                                    <div className="flex items-center gap-2">
                                        <Input
                                            readOnly
                                            value={config.verifyToken || "genesoft_wa_verify_token"}
                                            className="text-xs bg-muted font-mono"
                                        />
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => {
                                                navigator.clipboard.writeText(config.verifyToken || "genesoft_wa_verify_token")
                                                toast.success("Verify token copied!")
                                            }}
                                            className="h-9 px-3"
                                        >
                                            <Copy className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>

                                <div className="p-3 bg-muted/40 rounded-lg text-muted-foreground text-[11px] space-y-1">
                                    <p className="font-semibold text-foreground">Webhook Subscriptions Needed:</p>
                                    <p>• <span className="font-mono text-emerald-600">messages</span> — Ingests inbound customer replies</p>
                                    <p>• <span className="font-mono text-emerald-600">message_deliveries</span> — Delivery receipts (sent, delivered, read)</p>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 shadow-sm">
                            <CardHeader className="bg-muted/20 border-b pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <RefreshCw className="h-4 w-4 text-primary" />
                                    Connection Health Test
                                </CardTitle>
                                <CardDescription>
                                    Test authentication against Meta Graph API
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3">
                                <Button
                                    onClick={handleTestConnection}
                                    disabled={isTesting}
                                    className="w-full text-xs font-semibold gap-1.5"
                                >
                                    {isTesting ? (
                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                    ) : (
                                        <CheckCircle2 className="h-3.5 w-3.5" />
                                    )}
                                    Test Meta API Connection
                                </Button>

                                {testResult && (
                                    <div
                                        className={`p-3 rounded-lg border text-xs ${
                                            testResult.success
                                                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                                                : "bg-rose-500/10 border-rose-500/30 text-rose-800 dark:text-rose-300"
                                        }`}
                                    >
                                        <div className="font-bold flex items-center gap-1.5">
                                            {testResult.success ? (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                            ) : (
                                                <AlertCircle className="h-4 w-4 text-rose-600" />
                                            )}
                                            {testResult.success ? "Connection Verified" : "Connection Failed"}
                                        </div>
                                        <p className="mt-1 text-[11px] leading-relaxed">{testResult.message}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ==================================================================== */}
            {/* MODAL: DISPATCH INVOICE VIA WHATSAPP */}
            {/* ==================================================================== */}
            {dispatchModalOpen && selectedInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border/80 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="text-base font-bold flex items-center gap-2">
                                <MessageSquare className="h-5 w-5 text-emerald-600" />
                                Share Invoice via WhatsApp
                            </h2>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDispatchModalOpen(false)}
                                className="h-7 w-7 p-0"
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="space-y-3 text-xs">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Recipient WhatsApp Number</Label>
                                <Input
                                    value={dispatchPhone}
                                    onChange={(e) => setDispatchPhone(e.target.value)}
                                    placeholder="+91 98765 43210"
                                    className="text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Message Template</Label>
                                <select
                                    value={dispatchType}
                                    onChange={(e) => setDispatchType(e.target.value as any)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-xs shadow-sm"
                                >
                                    <option value="INVOICE_DISPATCH">Standard Invoice Dispatch & Payment Link</option>
                                    <option value="PAYMENT_OVERDUE_REMINDER">Overdue Dunning Reminder</option>
                                </select>
                            </div>

                            {/* Live WhatsApp Bubble Preview */}
                            <div className="p-3 bg-muted/30 rounded-lg space-y-1.5 border">
                                <span className="font-semibold text-muted-foreground text-[11px]">
                                    Message Preview:
                                </span>
                                <div className="p-3 rounded-xl bg-[#d9fdd3] text-emerald-950 dark:bg-emerald-900/60 dark:text-emerald-100 text-xs shadow-xs">
                                    {dispatchType === "INVOICE_DISPATCH"
                                        ? `Hello ${selectedInvoice.customer_name}, your invoice ${selectedInvoice.invoice_number} for ${currencyCode} ${Number(selectedInvoice.total_amount).toFixed(2)} from ${companyName} is ready. Due Date: ${selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : "Immediate"}. View and pay online: https://erp.genesoft.ai/portal/${selectedInvoice.id}. Thank you for your business!`
                                        : `Dear ${selectedInvoice.customer_name}, a quick reminder that invoice ${selectedInvoice.invoice_number} for ${currencyCode} ${Number(selectedInvoice.total_amount).toFixed(2)} was due on ${selectedInvoice.due_date ? new Date(selectedInvoice.due_date).toLocaleDateString() : "Immediate"}. Please settle the balance at your earliest convenience. Contact ${companyName} if you have any questions.`}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    const previewMsg = `Hello ${selectedInvoice.customer_name}, your invoice ${selectedInvoice.invoice_number} is ready. Amount: ${currencyCode} ${Number(selectedInvoice.total_amount).toFixed(2)}.`
                                    handleOpenWhatsAppWeb(dispatchPhone, previewMsg)
                                }}
                                className="text-xs"
                            >
                                <ExternalLink className="h-3.5 w-3.5 mr-1" />
                                Open in WhatsApp Web
                            </Button>

                            <div className="flex items-center gap-2">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setDispatchModalOpen(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleExecuteInvoiceDispatch}
                                    disabled={isPending}
                                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs gap-1.5"
                                >
                                    {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Dispatch via API
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
