// ============================================
// EMAIL ENUMS & VALUE CONSTANTS (Shared across Client & Server)
// ============================================

export type EmailDirection = "INBOUND" | "OUTBOUND"
export const EmailDirection = {
    INBOUND: "INBOUND" as const,
    OUTBOUND: "OUTBOUND" as const,
}

export type EmailStatus = "DRAFT" | "QUEUED" | "SENT" | "DELIVERED" | "OPENED" | "BOUNCED" | "FAILED"
export const EmailStatus = {
    DRAFT: "DRAFT" as const,
    QUEUED: "QUEUED" as const,
    SENT: "SENT" as const,
    DELIVERED: "DELIVERED" as const,
    OPENED: "OPENED" as const,
    BOUNCED: "BOUNCED" as const,
    FAILED: "FAILED" as const,
}

export type EmailProvider = "CUSTOM_SMTP_IMAP" | "GMAIL" | "OUTLOOK" | "RESEND" | "SENDGRID"
export const EmailProvider = {
    CUSTOM_SMTP_IMAP: "CUSTOM_SMTP_IMAP" as const,
    GMAIL: "GMAIL" as const,
    OUTLOOK: "OUTLOOK" as const,
    RESEND: "RESEND" as const,
    SENDGRID: "SENDGRID" as const,
}

export type EmailTemplateCategory = "SALES" | "FOLLOW_UP" | "ONBOARDING" | "SUPPORT" | "BILLING"
export const EmailTemplateCategory = {
    SALES: "SALES" as const,
    FOLLOW_UP: "FOLLOW_UP" as const,
    ONBOARDING: "ONBOARDING" as const,
    SUPPORT: "SUPPORT" as const,
    BILLING: "BILLING" as const,
}

// ============================================
// TYPES & INTERFACES
// ============================================

export interface EmailAccountRecord {
    id: string
    tenantId: string
    name: string
    email: string
    provider: EmailProvider
    smtpHost?: string | null
    smtpPort?: number | null
    smtpUser?: string | null
    smtpSecure: boolean
    imapHost?: string | null
    imapPort?: number | null
    imapUser?: string | null
    imapSecure: boolean
    isDefault: boolean
    isActive: boolean
    lastSyncedAt?: string | null
    syncFrequencyMinutes: number
    createdAt: string
    messagesCount?: number
}

export interface EmailMessageRecord {
    id: string
    tenantId: string
    emailAccountId?: string | null
    emailAccount?: {
        id: string
        name: string
        email: string
    } | null
    direction: EmailDirection
    status: EmailStatus
    fromEmail: string
    fromName?: string | null
    toEmail: string
    toName?: string | null
    cc?: string | null
    bcc?: string | null
    subject: string
    bodyHtml: string
    bodyText?: string | null
    threadId?: string | null
    messageId?: string | null
    inReplyTo?: string | null
    isStarred: boolean
    isArchived: boolean
    isRead: boolean
    sentAt?: string | null
    deliveredAt?: string | null
    openedAt?: string | null
    openCount: number
    clickCount: number
    contactId?: string | null
    contact?: {
        id: string
        displayName: string
        companyName?: string | null
        email?: string | null
    } | null
    leadId?: string | null
    lead?: {
        id: string
        title: string
        status?: string
    } | null
    dealId?: string | null
    deal?: {
        id: string
        title: string
        value?: number | null
    } | null
    attachments?: any
    createdAt: string
    updatedAt: string
}

export interface EmailTemplateRecord {
    id: string
    tenantId: string
    name: string
    category: EmailTemplateCategory
    subject: string
    bodyHtml: string
    bodyText?: string | null
    mergeTags?: any
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface EmailThreadSummary {
    threadId: string
    subject: string
    latestDate: string
    participantName: string
    participantEmail: string
    snippet: string
    messagesCount: number
    hasUnread: boolean
    isStarred: boolean
    contact?: {
        id: string
        displayName: string
        companyName?: string | null
    } | null
    deal?: {
        id: string
        title: string
    } | null
}

export interface EmailsOverviewKPIs {
    totalThreads: number
    unreadInbound: number
    sentCount: number
    openRate: number
    activeMailboxes: number
}

export interface EmailsOverview {
    accounts: EmailAccountRecord[]
    selectedAccount: EmailAccountRecord | null
    messages: EmailMessageRecord[]
    threads: EmailThreadSummary[]
    templates: EmailTemplateRecord[]
    contacts: Array<{
        id: string
        displayName: string
        companyName?: string | null
        email?: string | null
    }>
    leads: Array<{
        id: string
        title: string
        contactId?: string | null
    }>
    deals: Array<{
        id: string
        title: string
        contactId: string
    }>
    kpis: EmailsOverviewKPIs
}

export interface SendEmailInput {
    emailAccountId?: string
    toEmail: string
    toName?: string
    cc?: string
    bcc?: string
    subject: string
    bodyHtml?: string
    bodyText?: string
    threadId?: string
    inReplyTo?: string
    contactId?: string
    leadId?: string
    dealId?: string
    templateId?: string
}

export interface CreateEmailAccountInput {
    name: string
    email: string
    provider: EmailProvider
    smtpHost?: string
    smtpPort?: number
    smtpUser?: string
    smtpSecure?: boolean
    imapHost?: string
    imapPort?: number
    imapUser?: string
    imapSecure?: boolean
    isDefault?: boolean
}

export interface CreateEmailTemplateInput {
    name: string
    category: EmailTemplateCategory
    subject: string
    bodyHtml: string
    bodyText?: string
    mergeTags?: string[]
}
