"use client"

import { useState, useTransition, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    EmailProvider,
    EmailTemplateCategory,
    EmailStatus,
    EmailDirection,
} from "@prisma/client"
import {
    EmailsOverview,
    EmailAccountRecord,
    EmailMessageRecord,
    EmailTemplateRecord,
    EmailThreadSummary,
    sendEmail,
    saveEmailDraft,
    toggleStarEmail,
    markEmailAsRead,
    deleteEmailMessage,
    syncMailbox,
    createEmailAccount,
    deleteEmailAccount,
    createEmailTemplate,
    deleteEmailTemplate,
} from "@/app/actions/crm/emails"
import {
    Mail,
    Inbox,
    Send,
    Star,
    Trash2,
    Archive,
    RefreshCw,
    Plus,
    Search,
    Filter,
    CheckCircle2,
    Clock,
    AlertCircle,
    Eye,
    MousePointerClick,
    FileText,
    Settings,
    User,
    Building2,
    Target,
    Handshake,
    ArrowUpRight,
    ArrowDownLeft,
    CornerUpLeft,
    Paperclip,
    ExternalLink,
    ShieldCheck,
    Sparkles,
    ChevronRight,
    Check,
    X,
    Layers,
    Calendar,
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

interface EmailsClientProps {
    initialData: EmailsOverview
}

export function EmailsClient({ initialData }: EmailsClientProps) {
    const router = useRouter()

    const [accounts, setAccounts] = useState<EmailAccountRecord[]>(initialData.accounts)
    const [messages, setMessages] = useState<EmailMessageRecord[]>(initialData.messages)
    const [templates, setTemplates] = useState<EmailTemplateRecord[]>(initialData.templates)
    const [contacts] = useState(initialData.contacts)
    const [leads] = useState(initialData.leads)
    const [deals] = useState(initialData.deals)
    const [kpis, setKpis] = useState(initialData.kpis)

    // Sync state with incoming server props when router.refresh() triggers
    useEffect(() => {
        setAccounts(initialData.accounts)
        setMessages(initialData.messages)
        setTemplates(initialData.templates)
        setKpis(initialData.kpis)
    }, [initialData])

    // Navigation and Filter States
    const [activeFolder, setActiveFolder] = useState<"inbox" | "unread" | "starred" | "sent" | "drafts" | "archived">("inbox")
    const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null)
    const [crmFilter, setCrmFilter] = useState<"ALL" | "CONTACT" | "LEAD" | "DEAL">("ALL")
    const [searchQuery, setSearchQuery] = useState("")
    const [selectedThreadId, setSelectedThreadId] = useState<string | null>(
        initialData.messages.length > 0 ? (initialData.messages[0].threadId || initialData.messages[0].id) : null
    )

    // Modals
    const [isComposeOpen, setIsComposeOpen] = useState(false)
    const [isAccountsModalOpen, setIsAccountsModalOpen] = useState(false)
    const [isTemplatesModalOpen, setIsTemplatesModalOpen] = useState(false)

    // Compose Form State
    const [composeFromAccount, setComposeFromAccount] = useState<string>(
        accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || ""
    )
    const [composeRecipientType, setComposeRecipientType] = useState<"contact" | "lead" | "custom">("contact")
    const [composeContactId, setComposeContactId] = useState<string>("")
    const [composeLeadId, setComposeLeadId] = useState<string>("")
    const [composeDealId, setComposeDealId] = useState<string>("")
    const [composeToEmail, setComposeToEmail] = useState("")
    const [composeToName, setComposeToName] = useState("")
    const [composeSubject, setComposeSubject] = useState("")
    const [composeBody, setComposeBody] = useState("")
    const [composeCc, setComposeCc] = useState("")

    // Inline Reply State
    const [replyBody, setReplyBody] = useState("")
    const [replyAccountId, setReplyAccountId] = useState(
        accounts.find((a) => a.isDefault)?.id || accounts[0]?.id || ""
    )

    // New Account Form State
    const [newAccountName, setNewAccountName] = useState("")
    const [newAccountEmail, setNewAccountEmail] = useState("")
    const [newAccountProvider, setNewAccountProvider] = useState<EmailProvider>(EmailProvider.GMAIL)
    const [newAccountHost, setNewAccountHost] = useState("")
    const [newAccountPort, setNewAccountPort] = useState(993)
    const [newAccountUser, setNewAccountUser] = useState("")

    // New Template Form State
    const [newTemplateName, setNewTemplateName] = useState("")
    const [newTemplateCategory, setNewTemplateCategory] = useState<EmailTemplateCategory>(EmailTemplateCategory.SALES)
    const [newTemplateSubject, setNewTemplateSubject] = useState("")
    const [newTemplateBody, setNewTemplateBody] = useState("")

    const [isPending, startTransition] = useTransition()

    // Filter Messages
    const filteredMessages = useMemo(() => {
        return messages.filter((msg) => {
            // Folder Filter
            if (activeFolder === "inbox" && (msg.isArchived || msg.direction !== EmailDirection.INBOUND)) return false
            if (activeFolder === "unread" && (msg.isRead || msg.isArchived)) return false
            if (activeFolder === "starred" && (!msg.isStarred || msg.isArchived)) return false
            if (activeFolder === "sent" && msg.direction !== EmailDirection.OUTBOUND) return false
            if (activeFolder === "drafts" && msg.status !== EmailStatus.DRAFT) return false
            if (activeFolder === "archived" && !msg.isArchived) return false

            // Account Filter
            if (selectedAccountId && msg.emailAccountId !== selectedAccountId) return false

            // CRM Filter
            if (crmFilter === "CONTACT" && !msg.contactId) return false
            if (crmFilter === "LEAD" && !msg.leadId) return false
            if (crmFilter === "DEAL" && !msg.dealId) return false

            // Search Query Filter
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const matchSubject = msg.subject?.toLowerCase().includes(q)
                const matchBody = msg.bodyText?.toLowerCase().includes(q)
                const matchFrom = msg.fromEmail?.toLowerCase().includes(q) || msg.fromName?.toLowerCase().includes(q)
                const matchTo = msg.toEmail?.toLowerCase().includes(q) || msg.toName?.toLowerCase().includes(q)
                const matchContact = msg.contact ? msg.contact.displayName?.toLowerCase().includes(q) : false
                const matchDeal = msg.deal ? msg.deal.title?.toLowerCase().includes(q) : false
                if (!matchSubject && !matchBody && !matchFrom && !matchTo && !matchContact && !matchDeal) {
                    return false
                }
            }

            return true
        })
    }, [messages, activeFolder, selectedAccountId, crmFilter, searchQuery])

    // Group filtered messages by Thread (unique latest message per thread)
    const threads = useMemo(() => {
        const threadMap = new Map<string, EmailMessageRecord>()
        for (const msg of filteredMessages) {
            const threadId = msg.threadId || msg.id
            if (!threadMap.has(threadId)) {
                threadMap.set(threadId, msg)
            } else {
                const existing = threadMap.get(threadId)!
                if (new Date(msg.createdAt) > new Date(existing.createdAt)) {
                    threadMap.set(threadId, msg)
                }
            }
        }
        return Array.from(threadMap.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
    }, [filteredMessages])

    // Messages in currently selected thread
    const activeThreadMessages = useMemo(() => {
        if (!selectedThreadId) return []
        return messages
            .filter((m) => m.threadId === selectedThreadId || m.id === selectedThreadId)
            .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    }, [messages, selectedThreadId])

    const activeThreadLeadMessage = activeThreadMessages[0] || null

    // Handler: Toggle Star
    const handleToggleStar = async (msgId: string, currentStarred: boolean, e?: React.MouseEvent) => {
        e?.stopPropagation()
        setMessages((prev) =>
            prev.map((m) => (m.id === msgId ? { ...m, isStarred: !currentStarred } : m))
        )
        try {
            await toggleStarEmail(msgId)
        } catch (err: any) {
            toast.error("Failed to star email")
            setMessages((prev) =>
                prev.map((m) => (m.id === msgId ? { ...m, isStarred: currentStarred } : m))
            )
        }
    }

    // Handler: Select Thread & Mark Read
    const handleSelectThread = async (threadId: string) => {
        setSelectedThreadId(threadId)
        const unreadInThread = messages.filter(
            (m) => (m.threadId === threadId || m.id === threadId) && !m.isRead
        )
        if (unreadInThread.length > 0) {
            setMessages((prev) =>
                prev.map((m) =>
                    m.threadId === threadId || m.id === threadId ? { ...m, isRead: true } : m
                )
            )
            setKpis((prev) => ({
                ...prev,
                unreadInbound: Math.max(0, prev.unreadInbound - unreadInThread.length),
            }))
            for (const msg of unreadInThread) {
                await markEmailAsRead(msg.id)
            }
        }
    }

    // Handler: Delete Email
    const handleDeleteMessage = async (msgId: string) => {
        startTransition(async () => {
            try {
                const res = await deleteEmailMessage(msgId)
                if (res.error) {
                    toast.error(res.error)
                    return
                }
                setMessages((prev) => prev.filter((m) => m.id !== msgId))
                toast.success("Email message deleted")
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to delete email")
            }
        })
    }

    // Handler: Sync Mailbox
    const handleSyncMailbox = async (accId?: string) => {
        startTransition(async () => {
            try {
                const targetAccId = accId || accounts[0]?.id
                if (!targetAccId) {
                    toast.error("No active mailbox configured to sync")
                    return
                }
                const res = await syncMailbox(targetAccId)
                if (res.error) {
                    toast.error(res.error)
                    return
                }
                toast.success(`Mailbox synchronized! ${res.syncedCount || 0} correspondence checked.`)
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Mailbox sync failed")
            }
        })
    }

    // Handler: Select CRM Entity in Composer
    const handleContactSelect = (contactId: string) => {
        setComposeContactId(contactId)
        const contact = contacts.find((c) => c.id === contactId)
        if (contact) {
            setComposeToEmail(contact.email || "")
            setComposeToName(contact.displayName || "")
        }
    }

    const handleLeadSelect = (leadId: string) => {
        setComposeLeadId(leadId)
        const lead = leads.find((l) => l.id === leadId)
        if (lead) {
            setComposeToName(lead.title)
        }
    }

    // Handler: Insert Template into Composer with Merge Tag replacement
    const handleInsertTemplate = (templateId: string) => {
        const tmpl = templates.find((t) => t.id === templateId)
        if (!tmpl) return

        let subject = tmpl.subject
        let body = tmpl.bodyText || tmpl.bodyHtml

        const selectedContact = contacts.find((c) => c.id === composeContactId)
        const selectedLead = leads.find((l) => l.id === composeLeadId)
        const selectedDeal = deals.find((d) => d.id === composeDealId)
        const senderAccount = accounts.find((a) => a.id === composeFromAccount)

        const recipientName =
            selectedContact?.displayName ||
            selectedLead?.title ||
            composeToName ||
            "Colleague"

        const firstName = recipientName.split(" ")[0] || "there"
        const companyName = selectedContact?.companyName || "your organization"
        const dealTitle = selectedDeal?.title || "our business discussion"
        const senderName = senderAccount?.name || "The CRM Team"

        const replacements: Record<string, string> = {
            "{{contact.name}}": recipientName,
            "{{contact.first_name}}": firstName,
            "{{company.name}}": companyName,
            "{{deal.name}}": dealTitle,
            "{{deal.title}}": dealTitle,
            "{{user.name}}": senderName,
            "{{sender.name}}": senderName,
        }

        for (const [tag, val] of Object.entries(replacements)) {
            subject = subject.replaceAll(tag, val)
            body = body.replaceAll(tag, val)
        }

        setComposeSubject(subject)
        setComposeBody(body)
        toast.success(`Template "${tmpl.name}" merged and loaded!`)
    }

    // Handler: Send Email from Compose Modal
    const handleSendEmail = async () => {
        if (!composeFromAccount) {
            toast.error("Please select a sending account")
            return
        }
        if (!composeToEmail.trim()) {
            toast.error("Please provide a recipient email address")
            return
        }
        if (!composeSubject.trim()) {
            toast.error("Please provide an email subject")
            return
        }
        if (!composeBody.trim()) {
            toast.error("Email body cannot be empty")
            return
        }

        startTransition(async () => {
            try {
                const res = await sendEmail({
                    emailAccountId: composeFromAccount,
                    toEmail: composeToEmail.trim(),
                    toName: composeToName.trim() || undefined,
                    subject: composeSubject.trim(),
                    bodyText: composeBody.trim(),
                    cc: composeCc.trim() || undefined,
                    contactId: composeContactId || undefined,
                    leadId: composeLeadId || undefined,
                    dealId: composeDealId || undefined,
                })

                if (!res.success) {
                    toast.error(res.error || "Failed to send email")
                    return
                }

                toast.success(`Email dispatched to ${composeToEmail} and logged to CRM!`)
                setIsComposeOpen(false)

                // Reset composer
                setComposeSubject("")
                setComposeBody("")
                setComposeToEmail("")
                setComposeToName("")
                setComposeContactId("")
                setComposeLeadId("")
                setComposeDealId("")
                setComposeCc("")

                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to send email")
            }
        })
    }

    // Handler: Send Quick Inline Reply
    const handleSendInlineReply = async () => {
        if (!replyBody.trim()) {
            toast.error("Reply content cannot be empty")
            return
        }
        if (!activeThreadLeadMessage) return

        startTransition(async () => {
            try {
                const recipientEmail =
                    activeThreadLeadMessage.direction === EmailDirection.INBOUND
                        ? activeThreadLeadMessage.fromEmail
                        : activeThreadLeadMessage.toEmail

                const recipientName =
                    activeThreadLeadMessage.direction === EmailDirection.INBOUND
                        ? activeThreadLeadMessage.fromName
                        : activeThreadLeadMessage.toName

                const replySubject = activeThreadLeadMessage.subject.startsWith("Re: ")
                    ? activeThreadLeadMessage.subject
                    : `Re: ${activeThreadLeadMessage.subject}`

                const res = await sendEmail({
                    emailAccountId: replyAccountId,
                    toEmail: recipientEmail,
                    toName: recipientName || undefined,
                    subject: replySubject,
                    bodyText: replyBody.trim(),
                    threadId: activeThreadLeadMessage.threadId || activeThreadLeadMessage.id,
                    inReplyTo: activeThreadLeadMessage.messageId || undefined,
                    contactId: activeThreadLeadMessage.contactId || undefined,
                    leadId: activeThreadLeadMessage.leadId || undefined,
                    dealId: activeThreadLeadMessage.dealId || undefined,
                })

                if (!res.success) {
                    toast.error(res.error || "Failed to send reply")
                    return
                }

                setReplyBody("")
                toast.success("Reply dispatched and thread updated!")
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to send reply")
            }
        })
    }

    // Handler: Create Corporate Mailbox Account
    const handleCreateAccount = async () => {
        if (!newAccountName || !newAccountEmail) {
            toast.error("Account name and email are required")
            return
        }

        startTransition(async () => {
            try {
                const res = await createEmailAccount({
                    name: newAccountName,
                    email: newAccountEmail,
                    provider: newAccountProvider,
                    imapHost: newAccountHost || "imap.mailserver.local",
                    imapPort: Number(newAccountPort) || 993,
                    imapUser: newAccountUser || newAccountEmail,
                    smtpHost: "smtp.mailserver.local",
                    smtpPort: 587,
                    smtpUser: newAccountEmail,
                    isDefault: accounts.length === 0,
                })

                if (!res.success) {
                    toast.error(res.error || "Failed to add account")
                    return
                }

                toast.success(`Mailbox "${newAccountName}" connected successfully!`)
                setIsAccountsModalOpen(false)
                setNewAccountName("")
                setNewAccountEmail("")
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to add account")
            }
        })
    }

    // Handler: Delete Mailbox Account
    const handleDeleteAccount = async (accId: string) => {
        startTransition(async () => {
            try {
                const res = await deleteEmailAccount(accId)
                if (res.error) {
                    toast.error(res.error)
                    return
                }
                toast.success("Mailbox disconnected")
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to remove mailbox")
            }
        })
    }

    // Handler: Create Email Template
    const handleCreateTemplate = async () => {
        if (!newTemplateName || !newTemplateSubject || !newTemplateBody) {
            toast.error("Template name, subject, and body are required")
            return
        }

        startTransition(async () => {
            try {
                const res = await createEmailTemplate({
                    name: newTemplateName,
                    category: newTemplateCategory,
                    subject: newTemplateSubject,
                    bodyHtml: `<p>${newTemplateBody.replace(/\n/g, "<br/>")}</p>`,
                    bodyText: newTemplateBody,
                })

                if (!res.success) {
                    toast.error(res.error || "Failed to create template")
                    return
                }

                toast.success(`Email template "${newTemplateName}" saved!`)
                setNewTemplateName("")
                setNewTemplateSubject("")
                setNewTemplateBody("")
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to create template")
            }
        })
    }

    // Handler: Delete Template
    const handleDeleteTemplate = async (tmplId: string) => {
        startTransition(async () => {
            try {
                const res = await deleteEmailTemplate(tmplId)
                if (res.error) {
                    toast.error(res.error)
                    return
                }
                toast.success("Template deleted")
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to delete template")
            }
        })
    }

    return (
        <div className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Mail className="h-6 w-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">CRM Email Hub & Mailboxes</h1>
                            <p className="text-sm text-muted-foreground">
                                Multi-account corporate inbox, CRM thread timeline sync, merge-tag templates, and real-time open tracking.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSyncMailbox()}
                        disabled={isPending}
                        className="gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin text-primary" : ""}`} />
                        Sync All
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsTemplatesModalOpen(true)}
                        className="gap-2"
                    >
                        <FileText className="h-4 w-4" />
                        Templates ({templates.length})
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsAccountsModalOpen(true)}
                        className="gap-2"
                    >
                        <Settings className="h-4 w-4" />
                        Mailboxes ({accounts.length})
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => setIsComposeOpen(true)}
                        className="gap-2 shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        Compose Email
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Active Conversations
                                </p>
                                <h3 className="mt-1 text-2xl font-bold">{kpis.totalThreads}</h3>
                                <p className="mt-1 text-xs text-muted-foreground">
                                    {messages.length} total messages tracked
                                </p>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400">
                                <Inbox className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Unread Inbound
                                </p>
                                <h3 className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                                    {kpis.unreadInbound}
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">Requires team response</p>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400">
                                <Clock className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Sent Outreach
                                </p>
                                <h3 className="mt-1 text-2xl font-bold">{kpis.sentCount}</h3>
                                <p className="mt-1 text-xs text-muted-foreground">Synchronized with CRM timeline</p>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-400">
                                <Send className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-emerald-500 shadow-sm">
                    <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    Email Open Rate
                                </p>
                                <h3 className="mt-1 text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {kpis.openRate}%
                                </h3>
                                <p className="mt-1 text-xs text-muted-foreground">Engagement pixel analytics</p>
                            </div>
                            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                                <Eye className="h-5 w-5" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* 3-Pane Email Hub */}
            <div className="grid grid-cols-12 gap-4 rounded-xl border bg-card shadow-sm min-h-[720px] overflow-hidden">
                {/* Pane 1: Left Folders & Mailboxes Sidebar */}
                <div className="col-span-12 md:col-span-3 lg:col-span-2 border-r p-4 flex flex-col justify-between bg-muted/20">
                    <div className="space-y-6">
                        {/* Folders */}
                        <div>
                            <p className="px-2 mb-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                                Folders
                            </p>
                            <nav className="space-y-1">
                                <button
                                    onClick={() => setActiveFolder("inbox")}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        activeFolder === "inbox"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Inbox className="h-4 w-4" />
                                        Inbox
                                    </span>
                                    <span className="text-xs">
                                        {messages.filter((m) => m.direction === EmailDirection.INBOUND && !m.isArchived).length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveFolder("unread")}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        activeFolder === "unread"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Clock className="h-4 w-4" />
                                        Unread
                                    </span>
                                    {kpis.unreadInbound > 0 && (
                                        <Badge
                                            variant={activeFolder === "unread" ? "secondary" : "default"}
                                            className="h-5 px-1.5 text-xs font-semibold"
                                        >
                                            {kpis.unreadInbound}
                                        </Badge>
                                    )}
                                </button>

                                <button
                                    onClick={() => setActiveFolder("starred")}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        activeFolder === "starred"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Star className="h-4 w-4" />
                                        Starred
                                    </span>
                                    <span className="text-xs">
                                        {messages.filter((m) => m.isStarred).length}
                                    </span>
                                </button>

                                <button
                                    onClick={() => setActiveFolder("sent")}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        activeFolder === "sent"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Send className="h-4 w-4" />
                                        Sent
                                    </span>
                                    <span className="text-xs">{kpis.sentCount}</span>
                                </button>

                                <button
                                    onClick={() => setActiveFolder("archived")}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        activeFolder === "archived"
                                            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
                                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Archive className="h-4 w-4" />
                                        Archive
                                    </span>
                                    <span className="text-xs">
                                        {messages.filter((m) => m.isArchived).length}
                                    </span>
                                </button>
                            </nav>
                        </div>

                        {/* CRM Filter */}
                        <div>
                            <p className="px-2 mb-2 text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                                CRM Linked Threads
                            </p>
                            <div className="space-y-1">
                                <button
                                    onClick={() => setCrmFilter("ALL")}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        crmFilter === "ALL"
                                            ? "bg-muted font-bold text-foreground"
                                            : "text-muted-foreground hover:bg-muted/60"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Layers className="h-3.5 w-3.5" />
                                        All Correspondence
                                    </span>
                                </button>
                                <button
                                    onClick={() => setCrmFilter("CONTACT")}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        crmFilter === "CONTACT"
                                            ? "bg-muted font-bold text-foreground"
                                            : "text-muted-foreground hover:bg-muted/60"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <User className="h-3.5 w-3.5 text-blue-500" />
                                        Linked to Contacts
                                    </span>
                                    <span className="text-xs">
                                        {messages.filter((m) => m.contactId).length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setCrmFilter("LEAD")}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        crmFilter === "LEAD"
                                            ? "bg-muted font-bold text-foreground"
                                            : "text-muted-foreground hover:bg-muted/60"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Target className="h-3.5 w-3.5 text-amber-500" />
                                        Linked to Leads
                                    </span>
                                    <span className="text-xs">
                                        {messages.filter((m) => m.leadId).length}
                                    </span>
                                </button>
                                <button
                                    onClick={() => setCrmFilter("DEAL")}
                                    className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                        crmFilter === "DEAL"
                                            ? "bg-muted font-bold text-foreground"
                                            : "text-muted-foreground hover:bg-muted/60"
                                    }`}
                                >
                                    <span className="flex items-center gap-2">
                                        <Handshake className="h-3.5 w-3.5 text-emerald-500" />
                                        Linked to Deals
                                    </span>
                                    <span className="text-xs">
                                        {messages.filter((m) => m.dealId).length}
                                    </span>
                                </button>
                            </div>
                        </div>

                        {/* Connected Mailboxes */}
                        <div>
                            <div className="flex items-center justify-between px-2 mb-2">
                                <p className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                                    Mailboxes
                                </p>
                                <button
                                    onClick={() => setIsAccountsModalOpen(true)}
                                    className="text-xs text-primary hover:underline flex items-center gap-1"
                                >
                                    <Plus className="h-3 w-3" />
                                    Add
                                </button>
                            </div>
                            <div className="space-y-1.5">
                                <button
                                    onClick={() => setSelectedAccountId(null)}
                                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                                        selectedAccountId === null
                                            ? "bg-muted font-bold text-foreground"
                                            : "text-muted-foreground hover:bg-muted/60"
                                    }`}
                                >
                                    <span>All Accounts</span>
                                    <span className="text-[10px] text-muted-foreground">
                                        {accounts.length} inboxes
                                    </span>
                                </button>
                                {accounts.map((acc) => (
                                    <button
                                        key={acc.id}
                                        onClick={() => setSelectedAccountId(acc.id)}
                                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-colors flex items-center justify-between ${
                                            selectedAccountId === acc.id
                                                ? "bg-muted font-bold text-foreground"
                                                : "text-muted-foreground hover:bg-muted/60"
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 truncate">
                                            <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0" />
                                            <span className="truncate">{acc.email}</span>
                                        </div>
                                        {acc.isDefault && (
                                            <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">
                                                Def
                                            </Badge>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="pt-4 border-t text-xs text-muted-foreground flex items-center justify-between">
                        <span className="flex items-center gap-1.5">
                            <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                            TLS Encrypted
                        </span>
                        <span className="text-[10px]">IMAP/SMTP</span>
                    </div>
                </div>

                {/* Pane 2: Middle Thread List Feed */}
                <div className="col-span-12 md:col-span-4 lg:col-span-4 border-r flex flex-col bg-card">
                    {/* Search & Header */}
                    <div className="p-3 border-b space-y-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search emails, contacts, subjects..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-8 h-9 text-sm"
                            />
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                            <span>
                                Showing {threads.length} conversation{threads.length === 1 ? "" : "s"}
                            </span>
                            {selectedAccountId && (
                                <button
                                    onClick={() => setSelectedAccountId(null)}
                                    className="text-primary hover:underline text-[11px]"
                                >
                                    Clear mailbox filter
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Thread Cards List */}
                    <div className="flex-1 overflow-y-auto divide-y divide-border/40">
                        {threads.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                <p className="text-sm font-medium">No conversations found</p>
                                <p className="text-xs mt-1">Try selecting another folder or sync mailboxes.</p>
                            </div>
                        ) : (
                            threads.map((threadMsg) => {
                                const isSelected = (threadMsg.threadId || threadMsg.id) === selectedThreadId
                                const senderDisplay =
                                    threadMsg.direction === EmailDirection.OUTBOUND
                                        ? `To: ${threadMsg.toName || threadMsg.toEmail}`
                                        : threadMsg.fromName || threadMsg.fromEmail

                                return (
                                    <div
                                        key={threadMsg.id}
                                        onClick={() => handleSelectThread(threadMsg.threadId || threadMsg.id)}
                                        className={`p-3.5 transition-colors cursor-pointer relative flex flex-col gap-1.5 hover:bg-muted/40 ${
                                            isSelected ? "bg-primary/5 border-l-4 border-l-primary" : ""
                                        } ${!threadMsg.isRead ? "font-semibold bg-blue-50/20 dark:bg-blue-950/20" : ""}`}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 truncate">
                                                {!threadMsg.isRead && (
                                                    <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0" />
                                                )}
                                                <span className="text-xs truncate font-medium">
                                                    {senderDisplay}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                                                <span>
                                                    {new Date(threadMsg.createdAt).toLocaleDateString([], {
                                                        month: "short",
                                                        day: "numeric",
                                                    })}
                                                </span>
                                                <button
                                                    onClick={(e) => handleToggleStar(threadMsg.id, threadMsg.isStarred, e)}
                                                    className="p-1 hover:text-amber-500 transition-colors"
                                                >
                                                    <Star
                                                        className={`h-3.5 w-3.5 ${
                                                            threadMsg.isStarred
                                                                ? "fill-amber-400 text-amber-500"
                                                                : "text-muted-foreground/50"
                                                        }`}
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="text-xs text-foreground truncate font-medium">
                                            {threadMsg.subject}
                                        </div>

                                        <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                            {threadMsg.bodyText || "No preview available"}
                                        </p>

                                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                            {threadMsg.direction === EmailDirection.OUTBOUND ? (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 text-purple-600 border-purple-200 dark:border-purple-800">
                                                    <ArrowUpRight className="h-2.5 w-2.5" />
                                                    Sent
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 text-blue-600 border-blue-200 dark:border-blue-800">
                                                    <ArrowDownLeft className="h-2.5 w-2.5" />
                                                    Inbound
                                                </Badge>
                                            )}

                                            {threadMsg.status === EmailStatus.OPENED && (
                                                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 gap-1 text-emerald-600 border-emerald-200 dark:border-emerald-800">
                                                    <Eye className="h-2.5 w-2.5" />
                                                    Opened
                                                </Badge>
                                            )}

                                            {threadMsg.contact && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1">
                                                    <User className="h-2.5 w-2.5" />
                                                    {threadMsg.contact.displayName}
                                                </Badge>
                                            )}

                                            {threadMsg.deal && (
                                                <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 gap-1 bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                                                    <Handshake className="h-2.5 w-2.5" />
                                                    {threadMsg.deal.title.substring(0, 18)}...
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* Pane 3: Right Thread Viewer & CRM 360° Inspector */}
                <div className="col-span-12 md:col-span-5 lg:col-span-6 flex flex-col bg-background">
                    {activeThreadMessages.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
                            <Mail className="h-12 w-12 mb-3 text-muted-foreground/30" />
                            <h3 className="text-lg font-semibold text-foreground">Select an Email Conversation</h3>
                            <p className="text-sm max-w-sm mt-1">
                                Choose a thread from the feed to review correspondence history, CRM profile linkages, and reply inline.
                            </p>
                            <Button
                                size="sm"
                                onClick={() => setIsComposeOpen(true)}
                                className="mt-4 gap-2"
                            >
                                <Plus className="h-4 w-4" />
                                Compose New Email
                            </Button>
                        </div>
                    ) : (
                        <div className="flex-1 flex flex-col h-full overflow-hidden">
                            {/* Thread Top Action Header */}
                            <div className="p-4 border-b flex items-center justify-between gap-4 bg-muted/10">
                                <div className="truncate">
                                    <h2 className="text-base font-bold text-foreground truncate">
                                        {activeThreadLeadMessage?.subject}
                                    </h2>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Thread: {activeThreadLeadMessage?.threadId?.substring(0, 20)}... • {activeThreadMessages.length} message{activeThreadMessages.length > 1 ? "s" : ""}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            activeThreadLeadMessage &&
                                            handleToggleStar(
                                                activeThreadLeadMessage.id,
                                                activeThreadLeadMessage.isStarred
                                            )
                                        }
                                    >
                                        <Star
                                            className={`h-4 w-4 ${
                                                activeThreadLeadMessage?.isStarred
                                                    ? "fill-amber-400 text-amber-500"
                                                    : "text-muted-foreground"
                                            }`}
                                        />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                            activeThreadLeadMessage &&
                                            handleDeleteMessage(activeThreadLeadMessage.id)
                                        }
                                        className="text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>

                            {/* CRM 360° Context Bar */}
                            {(activeThreadLeadMessage?.contact ||
                                activeThreadLeadMessage?.lead ||
                                activeThreadLeadMessage?.deal) && (
                                <div className="bg-muted/30 p-3 border-b flex flex-wrap items-center gap-3 text-xs">
                                    <span className="font-semibold text-muted-foreground uppercase text-[10px] tracking-wider flex items-center gap-1">
                                        <Sparkles className="h-3 w-3 text-primary" />
                                        CRM Context:
                                    </span>

                                    {activeThreadLeadMessage.contact && (
                                        <Link
                                            href={`/crm/contacts`}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 font-medium hover:underline"
                                        >
                                            <User className="h-3.5 w-3.5" />
                                            <span>
                                                {activeThreadLeadMessage.contact.displayName}
                                            </span>
                                            {activeThreadLeadMessage.contact.companyName && (
                                                <span className="text-muted-foreground">
                                                    ({activeThreadLeadMessage.contact.companyName})
                                                </span>
                                            )}
                                            <ExternalLink className="h-3 w-3 ml-0.5 opacity-60" />
                                        </Link>
                                    )}

                                    {activeThreadLeadMessage.lead && (
                                        <Link
                                            href={`/crm/leads`}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300 font-medium hover:underline"
                                        >
                                            <Target className="h-3.5 w-3.5" />
                                            <span>
                                                Lead: {activeThreadLeadMessage.lead.title}
                                            </span>
                                            <ExternalLink className="h-3 w-3 ml-0.5 opacity-60" />
                                        </Link>
                                    )}

                                    {activeThreadLeadMessage.deal && (
                                        <Link
                                            href={`/crm/deals`}
                                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 font-medium hover:underline"
                                        >
                                            <Handshake className="h-3.5 w-3.5" />
                                            <span>
                                                Deal: {activeThreadLeadMessage.deal.title}
                                                {activeThreadLeadMessage.deal.value ? ` ($${activeThreadLeadMessage.deal.value.toLocaleString()})` : ""}
                                            </span>
                                            <ExternalLink className="h-3 w-3 ml-0.5 opacity-60" />
                                        </Link>
                                    )}
                                </div>
                            )}

                            {/* Thread Message History */}
                            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                                {activeThreadMessages.map((msg) => {
                                    const isOutbound = msg.direction === EmailDirection.OUTBOUND
                                    return (
                                        <div
                                            key={msg.id}
                                            className={`rounded-xl border p-4 transition-all shadow-xs ${
                                                isOutbound
                                                    ? "bg-muted/15 border-border"
                                                    : "bg-card border-border"
                                            }`}
                                        >
                                            {/* Message Header */}
                                            <div className="flex items-start justify-between gap-3 mb-3">
                                                <div className="flex items-center gap-2.5">
                                                    <div
                                                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                                                            isOutbound
                                                                ? "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300"
                                                                : "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                                                        }`}
                                                    >
                                                        {isOutbound ? "ME" : msg.fromName?.substring(0, 2).toUpperCase() || "IN"}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-sm font-semibold text-foreground">
                                                                {msg.fromName || msg.fromEmail}
                                                            </span>
                                                            <span className="text-xs text-muted-foreground">
                                                                &lt;{msg.fromEmail}&gt;
                                                            </span>
                                                        </div>
                                                        <div className="text-xs text-muted-foreground">
                                                            to {msg.toName || msg.toEmail} &lt;{msg.toEmail}&gt;
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="flex flex-col items-end text-xs text-muted-foreground">
                                                    <span>
                                                        {new Date(msg.createdAt).toLocaleString([], {
                                                            dateStyle: "medium",
                                                            timeStyle: "short",
                                                        })}
                                                    </span>
                                                    {msg.status === EmailStatus.OPENED && msg.openedAt && (
                                                        <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 mt-0.5">
                                                            <Eye className="h-3 w-3" />
                                                            Opened at {new Date(msg.openedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Message Body */}
                                            <div className="text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                                                {msg.bodyText || msg.bodyHtml.replace(/<[^>]*>?/gm, "")}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Inline Reply Composer */}
                            <div className="p-4 border-t bg-muted/20 space-y-3">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <div className="flex items-center gap-2">
                                        <CornerUpLeft className="h-3.5 w-3.5 text-primary" />
                                        <span className="font-medium text-foreground">Quick Reply</span>
                                        <span>via</span>
                                        <select
                                            value={replyAccountId}
                                            onChange={(e) => setReplyAccountId(e.target.value)}
                                            className="h-7 rounded border bg-background px-2 text-xs font-medium"
                                        >
                                            {accounts.map((a) => (
                                                <option key={a.id} value={a.id}>
                                                    {a.name} ({a.email})
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {templates.length > 0 && (
                                            <select
                                                onChange={(e) => {
                                                    const tmpl = templates.find((t) => t.id === e.target.value)
                                                    if (tmpl) {
                                                        const text = tmpl.bodyText || tmpl.bodyHtml
                                                        setReplyBody((prev) => (prev ? `${prev}\n\n${text}` : text))
                                                    }
                                                }}
                                                defaultValue=""
                                                className="h-7 rounded border bg-background px-2 text-xs"
                                            >
                                                <option value="" disabled>
                                                    Insert Template...
                                                </option>
                                                {templates.map((t) => (
                                                    <option key={t.id} value={t.id}>
                                                        {t.name}
                                                    </option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                </div>

                                <Textarea
                                    placeholder="Write your reply to this conversation... (automatically logged to CRM activity feed)"
                                    value={replyBody}
                                    onChange={(e) => setReplyBody(e.target.value)}
                                    rows={3}
                                    className="resize-none text-sm bg-background"
                                />

                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground">
                                        Dispatches email and records to CommunicationLog in real time.
                                    </span>
                                    <Button
                                        size="sm"
                                        onClick={handleSendInlineReply}
                                        disabled={isPending || !replyBody.trim()}
                                        className="gap-2"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        Send Reply
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Compose Email Modal */}
            <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5 text-primary" />
                            Compose Corporate Email
                        </DialogTitle>
                        <DialogDescription>
                            Send customer outreach directly linked to CRM Contacts, Leads, and Deals with merge tags.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* From Account */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-xs font-semibold">Send From:</label>
                            <div className="col-span-3">
                                <select
                                    value={composeFromAccount}
                                    onChange={(e) => setComposeFromAccount(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                                >
                                    {accounts.map((acc) => (
                                        <option key={acc.id} value={acc.id}>
                                            {acc.name} &lt;{acc.email}&gt; ({acc.provider})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* CRM Linking Selection */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-xs font-semibold">CRM Recipient:</label>
                            <div className="col-span-3 flex gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={composeRecipientType === "contact" ? "default" : "outline"}
                                    onClick={() => setComposeRecipientType("contact")}
                                    className="text-xs h-8"
                                >
                                    Contact
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={composeRecipientType === "lead" ? "default" : "outline"}
                                    onClick={() => setComposeRecipientType("lead")}
                                    className="text-xs h-8"
                                >
                                    Lead
                                </Button>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant={composeRecipientType === "custom" ? "default" : "outline"}
                                    onClick={() => setComposeRecipientType("custom")}
                                    className="text-xs h-8"
                                >
                                    Custom Email
                                </Button>
                            </div>
                        </div>

                        {composeRecipientType === "contact" && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-xs font-semibold">Select Contact:</label>
                                <div className="col-span-3">
                                    <select
                                        value={composeContactId}
                                        onChange={(e) => handleContactSelect(e.target.value)}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                                    >
                                        <option value="">-- Choose Contact --</option>
                                        {contacts.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.displayName} ({c.email || "No email"}) {c.companyName ? `- ${c.companyName}` : ""}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {composeRecipientType === "lead" && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-xs font-semibold">Select Lead:</label>
                                <div className="col-span-3">
                                    <select
                                        value={composeLeadId}
                                        onChange={(e) => handleLeadSelect(e.target.value)}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                                    >
                                        <option value="">-- Choose Lead --</option>
                                        {leads.map((l) => (
                                            <option key={l.id} value={l.id}>
                                                {l.title}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Recipient Email & Name */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-xs font-semibold">To Email:</label>
                            <div className="col-span-3 grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="recipient@company.com"
                                    value={composeToEmail}
                                    onChange={(e) => setComposeToEmail(e.target.value)}
                                    className="text-sm h-9"
                                />
                                <Input
                                    placeholder="Recipient Name"
                                    value={composeToName}
                                    onChange={(e) => setComposeToName(e.target.value)}
                                    className="text-sm h-9"
                                />
                            </div>
                        </div>

                        {/* Deal Linking */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-xs font-semibold">Link to Deal:</label>
                            <div className="col-span-3">
                                <select
                                    value={composeDealId}
                                    onChange={(e) => setComposeDealId(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
                                >
                                    <option value="">-- Optional Deal Association --</option>
                                    {deals.map((d) => (
                                        <option key={d.id} value={d.id}>
                                            {d.title}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Template Quick Insert */}
                        {templates.length > 0 && (
                            <div className="grid grid-cols-4 items-center gap-4">
                                <label className="text-right text-xs font-semibold text-primary">
                                    Load Template:
                                </label>
                                <div className="col-span-3">
                                    <select
                                        onChange={(e) => handleInsertTemplate(e.target.value)}
                                        defaultValue=""
                                        className="w-full h-9 rounded-md border border-primary/30 bg-primary/5 px-3 py-1 text-sm font-medium text-primary shadow-xs"
                                    >
                                        <option value="" disabled>
                                            -- Select merge-tag template to apply --
                                        </option>
                                        {templates.map((t) => (
                                            <option key={t.id} value={t.id}>
                                                [{t.category}] {t.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* Subject */}
                        <div className="grid grid-cols-4 items-center gap-4">
                            <label className="text-right text-xs font-semibold">Subject:</label>
                            <div className="col-span-3">
                                <Input
                                    placeholder="e.g. Introduction & Discussion on Enterprise ERP"
                                    value={composeSubject}
                                    onChange={(e) => setComposeSubject(e.target.value)}
                                    className="text-sm h-9 font-medium"
                                />
                            </div>
                        </div>

                        {/* Body */}
                        <div className="grid grid-cols-4 items-start gap-4">
                            <label className="text-right text-xs font-semibold pt-2">Message Body:</label>
                            <div className="col-span-3">
                                <Textarea
                                    placeholder="Write your email body here... Supports merge tags like {{contact.name}}, {{deal.title}}, etc."
                                    value={composeBody}
                                    onChange={(e) => setComposeBody(e.target.value)}
                                    rows={8}
                                    className="text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="flex items-center justify-between sm:justify-between">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                            <ShieldCheck className="h-4 w-4 text-emerald-500" />
                            Synchronizes automatically with CRM Activity timeline
                        </span>
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsComposeOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={handleSendEmail}
                                disabled={isPending}
                                className="gap-2"
                            >
                                <Send className="h-4 w-4" />
                                {isPending ? "Sending..." : "Send Email"}
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manage Mailboxes Modal */}
            <Dialog open={isAccountsModalOpen} onOpenChange={setIsAccountsModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5 text-primary" />
                            Corporate Mailbox Accounts
                        </DialogTitle>
                        <DialogDescription>
                            Configure connected email accounts for corporate outreach and synchronized inbound delivery.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        {/* Current Accounts List */}
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Active Mailboxes ({accounts.length})
                            </h4>
                            <div className="space-y-2">
                                {accounts.map((acc) => (
                                    <div
                                        key={acc.id}
                                        className="flex items-center justify-between p-3 rounded-lg border bg-muted/20"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="h-3 w-3 rounded-full bg-blue-500 shrink-0" />
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-semibold text-sm">{acc.name}</span>
                                                    <Badge variant="outline" className="text-[10px]">
                                                        {acc.provider}
                                                    </Badge>
                                                    {acc.isDefault && (
                                                        <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-xs text-muted-foreground">{acc.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleSyncMailbox(acc.id)}
                                                className="text-xs h-7 gap-1"
                                            >
                                                <RefreshCw className="h-3 w-3" />
                                                Sync
                                            </Button>
                                            {accounts.length > 1 && (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeleteAccount(acc.id)}
                                                    className="text-destructive h-7 w-7 p-0"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add New Mailbox Form */}
                        <div className="rounded-xl border p-4 bg-card space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                <Plus className="h-4 w-4 text-primary" />
                                Connect New Corporate Mailbox
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium">Display Name</label>
                                    <Input
                                        placeholder="e.g. Sales Outreach Desk"
                                        value={newAccountName}
                                        onChange={(e) => setNewAccountName(e.target.value)}
                                        className="h-8 text-sm mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium">Corporate Email Address</label>
                                    <Input
                                        placeholder="sales@yourcompany.com"
                                        value={newAccountEmail}
                                        onChange={(e) => setNewAccountEmail(e.target.value)}
                                        className="h-8 text-sm mt-1"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium">Provider Service</label>
                                    <select
                                        value={newAccountProvider}
                                        onChange={(e) => setNewAccountProvider(e.target.value as EmailProvider)}
                                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                                    >
                                        <option value={EmailProvider.GMAIL}>Google Workspace (Gmail)</option>
                                        <option value={EmailProvider.OUTLOOK}>Microsoft Outlook / 365</option>
                                        <option value={EmailProvider.CUSTOM_SMTP_IMAP}>Custom Corporate IMAP & SMTP</option>
                                        <option value={EmailProvider.SENDGRID}>SendGrid Service</option>
                                        <option value={EmailProvider.RESEND}>Resend Service</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-medium">IMAP Host Server</label>
                                    <Input
                                        placeholder="imap.mailserver.com"
                                        value={newAccountHost}
                                        onChange={(e) => setNewAccountHost(e.target.value)}
                                        className="h-8 text-sm mt-1"
                                    />
                                </div>
                            </div>

                            <Button
                                size="sm"
                                onClick={handleCreateAccount}
                                disabled={isPending || !newAccountName || !newAccountEmail}
                                className="w-full gap-2 mt-2"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Save & Connect Mailbox
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Manage Templates Modal */}
            <Dialog open={isTemplatesModalOpen} onOpenChange={setIsTemplatesModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Email Templates & Merge Tags
                        </DialogTitle>
                        <DialogDescription>
                            Build standardized sales outreach templates with dynamic placeholders for Contacts and Deals.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-6 py-2">
                        {/* Current Templates */}
                        <div>
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                                Saved Templates ({templates.length})
                            </h4>
                            <div className="space-y-2">
                                {templates.map((tmpl) => (
                                    <div
                                        key={tmpl.id}
                                        className="p-3 rounded-lg border bg-muted/20 flex flex-col gap-1.5"
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-sm">{tmpl.name}</span>
                                                <Badge variant="outline" className="text-[10px]">
                                                    {tmpl.category}
                                                </Badge>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteTemplate(tmpl.id)}
                                                className="text-destructive h-6 w-6 p-0"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                        <p className="text-xs text-foreground font-medium">{tmpl.subject}</p>
                                        <p className="text-xs text-muted-foreground line-clamp-2">
                                            {tmpl.bodyText || tmpl.bodyHtml.replace(/<[^>]*>?/gm, "")}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Create Template Form */}
                        <div className="rounded-xl border p-4 bg-card space-y-3">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5">
                                <Plus className="h-4 w-4 text-primary" />
                                Create New Email Template
                            </h4>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-xs font-medium">Template Name</label>
                                    <Input
                                        placeholder="e.g. Enterprise Follow-up"
                                        value={newTemplateName}
                                        onChange={(e) => setNewTemplateName(e.target.value)}
                                        className="h-8 text-sm mt-1"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-medium">Category</label>
                                    <select
                                        value={newTemplateCategory}
                                        onChange={(e) => setNewTemplateCategory(e.target.value as EmailTemplateCategory)}
                                        className="w-full h-8 rounded-md border border-input bg-background px-2 text-xs mt-1"
                                    >
                                        <option value={EmailTemplateCategory.SALES}>Sales Outreach</option>
                                        <option value={EmailTemplateCategory.FOLLOW_UP}>Follow-Up</option>
                                        <option value={EmailTemplateCategory.ONBOARDING}>Onboarding</option>
                                        <option value={EmailTemplateCategory.SUPPORT}>Support / Success</option>
                                        <option value={EmailTemplateCategory.BILLING}>Billing & Contracts</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-medium">Subject Line</label>
                                <Input
                                    placeholder="e.g. Following up on {{deal.name}} for {{contact.name}}"
                                    value={newTemplateSubject}
                                    onChange={(e) => setNewTemplateSubject(e.target.value)}
                                    className="h-8 text-sm mt-1"
                                />
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-1">
                                    <label className="text-xs font-medium">Template Content</label>
                                    <span className="text-[10px] text-muted-foreground">
                                        Merge Tags: {"{{contact.name}}"}, {"{{deal.name}}"}, {"{{company.name}}"}
                                    </span>
                                </div>
                                <Textarea
                                    placeholder="Hi {{contact.first_name}},\n\nI wanted to share updates regarding our discussion..."
                                    value={newTemplateBody}
                                    onChange={(e) => setNewTemplateBody(e.target.value)}
                                    rows={5}
                                    className="text-sm"
                                />
                            </div>

                            <Button
                                size="sm"
                                onClick={handleCreateTemplate}
                                disabled={
                                    isPending ||
                                    !newTemplateName ||
                                    !newTemplateSubject ||
                                    !newTemplateBody
                                }
                                className="w-full gap-2 mt-2"
                            >
                                <CheckCircle2 className="h-4 w-4" />
                                Save Template
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
