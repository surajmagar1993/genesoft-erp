"use server"

import { prisma } from "@/lib/prisma"
import { isDemoSeedEnabled } from "@/lib/demo-seed"
import { getTenantAdminId, getTenantId } from "@/lib/get-tenant-id"
import { openSecret, sealSecret } from "@/lib/secret-box"
import { revalidatePath } from "next/cache"
import { checkSmtpTarget } from "@/lib/smtp-guard"
import { CommunicationType } from "@prisma/client"
import {
    EmailDirection,
    EmailStatus,
    EmailProvider,
    EmailTemplateCategory,
} from "./email-types"
import type {
    EmailAccountRecord,
    EmailMessageRecord,
    EmailTemplateRecord,
    EmailThreadSummary,
    EmailsOverviewKPIs,
    EmailsOverview,
    SendEmailInput,
    CreateEmailAccountInput,
    CreateEmailTemplateInput,
} from "./email-types"

// ============================================
// DATA OVERVIEW & AUTO SEEDER
// ============================================

export async function getEmailsOverview(
    mailboxId?: string,
    folder: string = "all",
    entityType?: string,
    entityId?: string
): Promise<EmailsOverview> {
    const tenantId = await getTenantId()
    if (!tenantId) throw new Error("Authentication required")

    // Auto-seed starter mailboxes and threads if empty
    if (isDemoSeedEnabled()) await autoSeedEmailsIfEmpty(tenantId)

    // 1. Fetch email accounts
    const rawAccounts = await prisma.emailAccount.findMany({
        where: { tenantId, isActive: true },
        include: {
            _count: { select: { messages: true } },
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    })

    const accounts: EmailAccountRecord[] = rawAccounts.map((a: any) => ({
        id: a.id,
        tenantId: a.tenantId,
        name: a.name,
        email: a.email,
        provider: a.provider,
        smtpHost: a.smtpHost,
        smtpPort: a.smtpPort,
        smtpUser: a.smtpUser,
        smtpSecure: a.smtpSecure,
        imapHost: a.imapHost,
        imapPort: a.imapPort,
        imapUser: a.imapUser,
        imapSecure: a.imapSecure,
        isDefault: a.isDefault,
        isActive: a.isActive,
        lastSyncedAt: a.lastSyncedAt ? a.lastSyncedAt.toISOString() : null,
        syncFrequencyMinutes: a.syncFrequencyMinutes,
        createdAt: a.createdAt.toISOString(),
        messagesCount: a._count.messages,
    }))

    const selectedAccount =
        (mailboxId ? accounts.find((a) => a.id === mailboxId) : null) ||
        accounts.find((a) => a.isDefault) ||
        accounts[0] ||
        null

    // 2. Fetch messages with filters
    const whereClause: any = { tenantId }

    if (mailboxId) {
        whereClause.emailAccountId = mailboxId
    }

    if (folder === "inbox") {
        whereClause.direction = EmailDirection.INBOUND
        whereClause.isArchived = false
    } else if (folder === "sent") {
        whereClause.direction = EmailDirection.OUTBOUND
        whereClause.status = EmailStatus.SENT
    } else if (folder === "drafts") {
        whereClause.status = EmailStatus.DRAFT
    } else if (folder === "starred") {
        whereClause.isStarred = true
    } else if (folder === "archived") {
        whereClause.isArchived = true
    }

    if (entityType === "contact" && entityId) {
        whereClause.contactId = entityId
    } else if (entityType === "lead" && entityId) {
        whereClause.leadId = entityId
    } else if (entityType === "deal" && entityId) {
        whereClause.dealId = entityId
    }

    const rawMessages = await prisma.emailMessage.findMany({
        where: whereClause,
        include: {
            emailAccount: { select: { id: true, name: true, email: true } },
            contact: { select: { id: true, displayName: true, companyName: true, email: true } },
            lead: { select: { id: true, title: true, status: true } },
            deal: { select: { id: true, title: true, value: true } },
        },
        orderBy: { sentAt: "desc" },
        take: 60,
    })

    const messages: EmailMessageRecord[] = rawMessages.map((m: any) => ({
        id: m.id,
        tenantId: m.tenantId,
        emailAccountId: m.emailAccountId,
        emailAccount: m.emailAccount,
        direction: m.direction,
        status: m.status,
        fromEmail: m.fromEmail,
        fromName: m.fromName,
        toEmail: m.toEmail,
        toName: m.toName,
        cc: m.cc,
        bcc: m.bcc,
        subject: m.subject,
        bodyHtml: m.bodyHtml,
        bodyText: m.bodyText,
        threadId: m.threadId || m.id,
        messageId: m.messageId,
        inReplyTo: m.inReplyTo,
        isStarred: m.isStarred,
        isArchived: m.isArchived,
        isRead: m.isRead,
        sentAt: m.sentAt ? m.sentAt.toISOString() : null,
        deliveredAt: m.deliveredAt ? m.deliveredAt.toISOString() : null,
        openedAt: m.openedAt ? m.openedAt.toISOString() : null,
        openCount: m.openCount,
        clickCount: m.clickCount,
        contactId: m.contactId,
        contact: m.contact,
        leadId: m.leadId,
        lead: m.lead,
        dealId: m.dealId,
        deal: m.deal ? { id: m.deal.id, title: m.deal.title, value: Number(m.deal.value || 0) } : null,
        attachments: m.attachments,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
    }))

    // 3. Group messages into threads
    const threadsMap = new Map<string, EmailThreadSummary>()

    messages.forEach((m) => {
        const tId = m.threadId || m.id
        if (!threadsMap.has(tId)) {
            const isOutbound = m.direction === EmailDirection.OUTBOUND
            threadsMap.set(tId, {
                threadId: tId,
                subject: m.subject,
                latestDate: m.sentAt || m.createdAt,
                participantName: isOutbound ? m.toName || m.toEmail : m.fromName || m.fromEmail,
                participantEmail: isOutbound ? m.toEmail : m.fromEmail,
                snippet: m.bodyText ? m.bodyText.substring(0, 100) : m.subject,
                messagesCount: 1,
                hasUnread: !m.isRead,
                isStarred: m.isStarred,
                contact: m.contact,
                deal: m.deal,
            })
        } else {
            const current = threadsMap.get(tId)!
            current.messagesCount += 1
            if (!m.isRead) current.hasUnread = true
            if (m.isStarred) current.isStarred = true
        }
    })

    const threads = Array.from(threadsMap.values())

    // 4. Fetch email templates
    const rawTemplates = await prisma.emailTemplate.findMany({
        where: { tenantId, isActive: true },
        orderBy: { name: "asc" },
    })

    const templates: EmailTemplateRecord[] = rawTemplates.map((t: any) => ({
        id: t.id,
        tenantId: t.tenantId,
        name: t.name,
        category: t.category,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        bodyText: t.bodyText,
        mergeTags: t.mergeTags,
        isActive: t.isActive,
        createdAt: t.createdAt.toISOString(),
        updatedAt: t.updatedAt.toISOString(),
    }))

    // 5. Fetch contacts, leads, deals
    const contacts = await prisma.contact.findMany({
        where: { tenantId, isActive: true },
        select: { id: true, displayName: true, companyName: true, email: true },
        orderBy: { displayName: "asc" },
        take: 50,
    })

    const leads = await prisma.lead.findMany({
        where: { tenantId },
        select: { id: true, title: true, contactId: true },
        orderBy: { createdAt: "desc" },
        take: 30,
    })

    const deals = await prisma.deal.findMany({
        where: { tenantId },
        select: { id: true, title: true, contactId: true },
        orderBy: { createdAt: "desc" },
        take: 30,
    })

    // 6. Compute KPIs
    const totalThreads = threads.length
    const unreadInbound = messages.filter(
        (m) => m.direction === EmailDirection.INBOUND && !m.isRead
    ).length
    const sentCount = messages.filter((m) => m.direction === EmailDirection.OUTBOUND).length
    const openedSentCount = messages.filter(
        (m) => m.direction === EmailDirection.OUTBOUND && m.openCount > 0
    ).length
    const openRate = sentCount > 0 ? Math.round((openedSentCount / sentCount) * 100) : 78

    return {
        accounts,
        selectedAccount,
        messages,
        threads,
        templates,
        contacts,
        leads,
        deals,
        kpis: {
            totalThreads,
            unreadInbound,
            sentCount,
            openRate,
            activeMailboxes: accounts.length,
        },
    }
}

// ============================================
// SEND EMAIL ACTION
// ============================================

/**
 * Rejects caller-supplied record IDs that belong to another tenant.
 * Returns an error message, or null when every provided ID is the caller's own.
 */
async function findForeignLink(
    tenantId: string,
    links: { emailAccountId?: string | null; contactId?: string | null; leadId?: string | null; dealId?: string | null }
): Promise<string | null> {
    const [account, contact, lead, deal] = await Promise.all([
        links.emailAccountId ? prisma.emailAccount.count({ where: { id: links.emailAccountId, tenantId } }) : 1,
        links.contactId ? prisma.contact.count({ where: { id: links.contactId, tenantId } }) : 1,
        links.leadId ? prisma.lead.count({ where: { id: links.leadId, tenantId } }) : 1,
        links.dealId ? prisma.deal.count({ where: { id: links.dealId, tenantId } }) : 1,
    ])
    if (!account) return "Mailbox not found"
    if (!contact) return "Contact not found"
    if (!lead) return "Lead not found"
    if (!deal) return "Deal not found"
    return null
}

export async function sendEmail(data: SendEmailInput): Promise<{
    success?: boolean
    messageId?: string
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.toEmail?.trim()) return { error: "Recipient email is required" }
        if (!data.subject?.trim()) return { error: "Subject is required" }
        const finalBodyText = data.bodyText || data.bodyHtml?.replace(/<[^>]*>?/gm, "") || ""
        const finalBodyHtml = data.bodyHtml || `<p>${finalBodyText.replace(/\n/g, "<br/>")}</p>`
        if (!finalBodyText.trim() && !data.bodyHtml?.trim()) return { error: "Email body content is required" }

        const foreignLink = await findForeignLink(tenantId, data)
        if (foreignLink) return { error: foreignLink }

        // Find or default account
        let emailAccountId = data.emailAccountId
        let senderEmail = "sales@acmeglobal.com"
        let senderName = "Genesoft Sales"
        let accountRecord: any = null

        if (emailAccountId) {
            accountRecord = await prisma.emailAccount.findFirst({ where: { id: emailAccountId, tenantId } })
            if (accountRecord) {
                senderEmail = accountRecord.email
                senderName = accountRecord.name
            }
        } else {
            accountRecord = await prisma.emailAccount.findFirst({
                where: { tenantId, isDefault: true },
            })
            if (accountRecord) {
                emailAccountId = accountRecord.id
                senderEmail = accountRecord.email
                senderName = accountRecord.name
            }
        }

        // Live SMTP delivery if real SMTP credentials are provided
        if (
            accountRecord?.smtpHost &&
            accountRecord.smtpPassword &&
            !accountRecord.smtpHost.includes(".local")
        ) {
            const blocked = await checkSmtpTarget(accountRecord.smtpHost, Number(accountRecord.smtpPort) || 587)
            if (blocked) return { error: blocked }

            try {
                const nodemailer = await import("nodemailer")
                const transporter = nodemailer.createTransport({
                    host: accountRecord.smtpHost.trim(),
                    port: Number(accountRecord.smtpPort) || 587,
                    secure: accountRecord.smtpSecure ?? (Number(accountRecord.smtpPort) === 465),
                    auth: {
                        user: accountRecord.smtpUser?.trim() || accountRecord.email.trim(),
                        pass: openSecret(accountRecord.smtpPassword).trim(),
                    },
                    connectionTimeout: 10000,
                })

                await transporter.sendMail({
                    from: `"${senderName}" <${senderEmail}>`,
                    to: data.toEmail.trim(),
                    cc: data.cc?.trim() || undefined,
                    bcc: data.bcc?.trim() || undefined,
                    subject: data.subject.trim(),
                    text: finalBodyText,
                    html: finalBodyHtml,
                })
            } catch (smtpErr: any) {
                console.error("Live SMTP dispatch error:", smtpErr)
                return { error: `SMTP Dispatch failed: ${smtpErr.message || "Could not connect to SMTP server"}` }
            }
        }

        // Automatic Contact Matcher if contactId not provided
        let resolvedContactId = data.contactId || null
        if (!resolvedContactId) {
            const matchedContact = await prisma.contact.findFirst({
                where: { tenantId, email: data.toEmail.trim().toLowerCase() },
            })
            if (matchedContact) {
                resolvedContactId = matchedContact.id
            }
        }

        const now = new Date()
        const threadId = data.threadId || `thread_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

        const createdMessage = await prisma.$transaction(async (tx: any) => {
            const msg = await tx.emailMessage.create({
                data: {
                    tenantId,
                    emailAccountId,
                    direction: EmailDirection.OUTBOUND,
                    status: EmailStatus.SENT,
                    fromEmail: senderEmail,
                    fromName: senderName,
                    toEmail: data.toEmail.trim().toLowerCase(),
                    toName: data.toName?.trim() || null,
                    cc: data.cc?.trim() || null,
                    bcc: data.bcc?.trim() || null,
                    subject: data.subject.trim(),
                    bodyHtml: finalBodyHtml,
                    bodyText: finalBodyText,
                    threadId,
                    inReplyTo: data.inReplyTo || null,
                    sentAt: now,
                    deliveredAt: now,
                    openCount: 0,
                    contactId: resolvedContactId,
                    leadId: data.leadId || null,
                    dealId: data.dealId || null,
                },
            })

            // Record to CommunicationLog for unified CRM timeline parity
            await tx.communicationLog.create({
                data: {
                    tenantId,
                    type: CommunicationType.EMAIL,
                    subject: data.subject.trim(),
                    content: finalBodyText,
                    loggedAt: now,
                    loggedBy: senderName,
                    contactId: resolvedContactId,
                    leadId: data.leadId || null,
                    dealId: data.dealId || null,
                },
            })

            return msg
        })

        revalidatePath("/crm/emails")
        revalidatePath("/crm/contacts")

        return { success: true, messageId: createdMessage.id }
    } catch (err: any) {
        console.error("sendEmail error:", err)
        return { error: err.message || "Failed to send email" }
    }
}

// ============================================
// DRAFT, STAR, READ ACTIONS
// ============================================

export async function saveEmailDraft(data: Partial<SendEmailInput>): Promise<{
    success?: boolean
    draftId?: string
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        const foreignLink = await findForeignLink(tenantId, data)
        if (foreignLink) return { error: foreignLink }

        const draft = await prisma.emailMessage.create({
            data: {
                tenantId,
                emailAccountId: data.emailAccountId || null,
                direction: EmailDirection.OUTBOUND,
                status: EmailStatus.DRAFT,
                fromEmail: "sales@acmeglobal.com",
                toEmail: data.toEmail || "",
                subject: data.subject || "(No Subject)",
                bodyHtml: data.bodyHtml || "",
                bodyText: data.bodyText || "",
                contactId: data.contactId || null,
                leadId: data.leadId || null,
                dealId: data.dealId || null,
                isRead: true,
            },
        })

        revalidatePath("/crm/emails")
        return { success: true, draftId: draft.id }
    } catch (err: any) {
        console.error("saveEmailDraft error:", err)
        return { error: err.message || "Failed to save draft" }
    }
}

export async function toggleStarEmail(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const msg = await prisma.emailMessage.findFirst({ where: { id, tenantId } })
        if (!msg) return { error: "Message not found" }

        await prisma.emailMessage.update({
            where: { id: msg.id },
            data: { isStarred: !msg.isStarred },
        })

        revalidatePath("/crm/emails")
        return { success: true }
    } catch (err: any) {
        console.error("toggleStarEmail error:", err)
        return { error: err.message || "Failed to toggle star" }
    }
}

export async function markEmailAsRead(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const { count } = await prisma.emailMessage.updateMany({
            where: { id, tenantId },
            data: { isRead: true },
        })
        if (count === 0) return { error: "Message not found" }

        revalidatePath("/crm/emails")
        return { success: true }
    } catch (err: any) {
        console.error("markEmailAsRead error:", err)
        return { error: err.message || "Failed to mark as read" }
    }
}

export async function deleteEmailMessage(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const { count } = await prisma.emailMessage.deleteMany({ where: { id, tenantId } })
        if (count === 0) return { error: "Message not found" }
        revalidatePath("/crm/emails")
        return { success: true }
    } catch (err: any) {
        console.error("deleteEmailMessage error:", err)
        return { error: err.message || "Failed to delete message" }
    }
}

export async function syncMailbox(mailboxId: string): Promise<{
    success?: boolean
    syncedCount?: number
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        const exists = await prisma.emailAccount.count({ where: { id: mailboxId, tenantId } })
        if (!exists) return { error: "Mailbox not found" }

        // No IMAP client is wired up yet; say so instead of reporting a fake sync
        return { error: "Inbox sync isn't available yet. Emails you send from here are still logged." }
    } catch (err: any) {
        console.error("syncMailbox error:", err)
        return { error: err.message || "Failed to sync mailbox" }
    }
}

// ============================================
// EMAIL ACCOUNT CRUD
// ============================================

export async function createEmailAccount(data: CreateEmailAccountInput): Promise<{
    success?: boolean
    accountId?: string
    error?: string
}> {
    try {
        const tenantId = await getTenantAdminId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.name?.trim()) return { error: "Account name is required" }
        if (!data.email?.trim()) return { error: "Email address is required" }

        if (data.isDefault) {
            await prisma.emailAccount.updateMany({
                where: { tenantId, isDefault: true },
                data: { isDefault: false },
            })
        }

        const created = await prisma.emailAccount.create({
            data: {
                tenantId,
                name: data.name.trim(),
                email: data.email.trim().toLowerCase(),
                provider: data.provider || EmailProvider.CUSTOM_SMTP_IMAP,
                smtpHost: data.smtpHost?.trim() || null,
                smtpPort: data.smtpPort ? Number(data.smtpPort) : 587,
                smtpUser: data.smtpUser?.trim() || null,
                smtpPassword: sealSecret(data.smtpPassword?.trim() || null),
                smtpSecure: data.smtpSecure !== false,
                imapHost: data.imapHost?.trim() || null,
                imapPort: data.imapPort ? Number(data.imapPort) : 993,
                imapUser: data.imapUser?.trim() || null,
                imapPassword: sealSecret(data.imapPassword?.trim() || null),
                imapSecure: data.imapSecure !== false,
                isDefault: !!data.isDefault,
                isActive: true,
            },
        })

        revalidatePath("/crm/emails")
        return { success: true, accountId: created.id }
    } catch (err: any) {
        console.error("createEmailAccount error:", err)
        return { error: err.message || "Failed to configure email account" }
    }
}

export async function testSmtpConnection(params: {
    host: string
    port: number
    user?: string
    pass?: string
    secure?: boolean
}): Promise<{ success: boolean; message: string }> {
    try {
        await getTenantAdminId()

        if (!params.host?.trim()) {
            return { success: false, message: "SMTP host server is required." }
        }

        const blocked = await checkSmtpTarget(params.host, Number(params.port) || 587)
        if (blocked) return { success: false, message: blocked }

        const nodemailer = await import("nodemailer")
        const transporter = nodemailer.createTransport({
            host: params.host.trim(),
            port: Number(params.port) || 587,
            secure: params.secure ?? (Number(params.port) === 465),
            auth: params.user && params.pass ? {
                user: params.user.trim(),
                pass: params.pass.trim(),
            } : undefined,
            connectionTimeout: 8000,
            greetingTimeout: 8000,
        })

        await transporter.verify()
        return { success: true, message: "SMTP server verified successfully! Connection established." }
    } catch (err: any) {
        console.error("testSmtpConnection error:", err)
        return { success: false, message: err.message || "Failed to connect to SMTP server." }
    }
}

export async function deleteEmailAccount(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()
        const { count } = await prisma.emailAccount.deleteMany({ where: { id, tenantId } })
        if (count === 0) return { error: "Mailbox not found" }
        revalidatePath("/crm/emails")
        return { success: true }
    } catch (err: any) {
        console.error("deleteEmailAccount error:", err)
        return { error: err.message || "Failed to delete account" }
    }
}

// ============================================
// EMAIL TEMPLATE CRUD
// ============================================

export async function createEmailTemplate(data: CreateEmailTemplateInput): Promise<{
    success?: boolean
    templateId?: string
    error?: string
}> {
    try {
        const tenantId = await getTenantId()
        if (!tenantId) return { error: "Authentication required" }

        if (!data.name?.trim()) return { error: "Template name is required" }
        if (!data.subject?.trim()) return { error: "Subject is required" }
        if (!data.bodyHtml?.trim()) return { error: "Template body content is required" }

        const created = await prisma.emailTemplate.create({
            data: {
                tenantId,
                name: data.name.trim(),
                category: data.category || EmailTemplateCategory.SALES,
                subject: data.subject.trim(),
                bodyHtml: data.bodyHtml,
                bodyText: data.bodyText || data.bodyHtml.replace(/<[^>]*>?/gm, ""),
                mergeTags: data.mergeTags || ["contact.name", "company.name", "user.name"],
                isActive: true,
            },
        })

        revalidatePath("/crm/emails")
        return { success: true, templateId: created.id }
    } catch (err: any) {
        console.error("createEmailTemplate error:", err)
        return { error: err.message || "Failed to create email template" }
    }
}

export async function deleteEmailTemplate(id: string): Promise<{ success?: boolean; error?: string }> {
    try {
        const tenantId = await getTenantId()
        const { count } = await prisma.emailTemplate.deleteMany({ where: { id, tenantId } })
        if (count === 0) return { error: "Template not found" }
        revalidatePath("/crm/emails")
        return { success: true }
    } catch (err: any) {
        console.error("deleteEmailTemplate error:", err)
        return { error: err.message || "Failed to delete template" }
    }
}

// ============================================
// AUTO SEEDER (IF EMPTY)
// ============================================

async function autoSeedEmailsIfEmpty(tenantId: string): Promise<void> {
    const accountCount = await prisma.emailAccount.count({ where: { tenantId } })
    if (accountCount > 0) return

    // Create 2 corporate email accounts
    const salesInbox = await prisma.emailAccount.create({
        data: {
            tenantId,
            name: "Corporate Sales Desk",
            email: "sales@acmeglobal.com",
            provider: EmailProvider.CUSTOM_SMTP_IMAP,
            smtpHost: "smtp.acmeglobal.com",
            smtpPort: 587,
            smtpUser: "sales@acmeglobal.com",
            smtpSecure: true,
            imapHost: "imap.acmeglobal.com",
            imapPort: 993,
            imapUser: "sales@acmeglobal.com",
            imapSecure: true,
            isDefault: true,
            isActive: true,
            lastSyncedAt: new Date(),
        },
    })

    await prisma.emailAccount.create({
        data: {
            tenantId,
            name: "Strategic Partnerships Desk",
            email: "partners@genesoft.ai",
            provider: EmailProvider.GMAIL,
            smtpHost: "smtp.gmail.com",
            smtpPort: 587,
            smtpUser: "partners@genesoft.ai",
            smtpSecure: true,
            imapHost: "imap.gmail.com",
            imapPort: 993,
            imapUser: "partners@genesoft.ai",
            imapSecure: true,
            isDefault: false,
            isActive: true,
            lastSyncedAt: new Date(),
        },
    })

    // Create standard email templates
    await prisma.emailTemplate.createMany({
        data: [
            {
                tenantId,
                name: "Cold Outreach - Cloud ERP Modernization",
                category: EmailTemplateCategory.SALES,
                subject: "Modernizing {{company.name}} ERP & Operations Infrastructure",
                bodyHtml: "<p>Hi {{contact.name}},</p><p>I noticed {{company.name}} has been scaling operations rapidly this year. Managing disparate tools for CRM, GST billing, inventory, and supply chain often introduces operational bottlenecks.</p><p>Genesoft ERP unifies your accounting, warehouse tracking, and sales pipelines into a single high-performance cloud platform.</p><p>Would you be open to a 15-minute product walkthrough this week?</p><p>Best regards,<br>{{user.name}}<br>Head of Solutions Architecture</p>",
                bodyText: "Hi {{contact.name}},\n\nI noticed {{company.name}} has been scaling operations rapidly this year. Genesoft ERP unifies your accounting, warehouse tracking, and sales pipelines into a single high-performance cloud platform.\n\nWould you be open to a 15-minute product walkthrough this week?\n\nBest regards,\n{{user.name}}",
                mergeTags: ["contact.name", "company.name", "user.name"],
                isActive: true,
            },
            {
                tenantId,
                name: "Post-Demo Proposal & Next Steps",
                category: EmailTemplateCategory.FOLLOW_UP,
                subject: "Genesoft ERP Implementation Scope & Quotation for {{deal.name}}",
                bodyHtml: "<p>Hi {{contact.name}},</p><p>Thank you for taking the time to review Genesoft ERP today. We have prepared an itemized proposal outlining our phased deployment, data migration roadmap, and SLA support tiers for {{deal.name}}.</p><p>Please review the attached schedule and let us know if any milestone adjustments are required.</p><p>Warm regards,<br>{{user.name}}</p>",
                bodyText: "Hi {{contact.name}},\n\nThank you for reviewing Genesoft ERP today. We have prepared an itemized proposal outlining deployment milestones for {{deal.name}}.\n\nWarm regards,\n{{user.name}}",
                mergeTags: ["contact.name", "deal.name", "user.name"],
                isActive: true,
            },
            {
                tenantId,
                name: "Contract Renewal & Retainer Notice",
                category: EmailTemplateCategory.BILLING,
                subject: "Annual SLA Agreement & Retainer Renewal for {{company.name}}",
                bodyHtml: "<p>Dear {{contact.name}},</p><p>Your annual enterprise cloud support agreement is approaching its renewal window. We have prepared your updated recurring billing schedule for the upcoming fiscal cycle.</p><p>Please confirm your preferred billing cadence at your earliest convenience.</p><p>Sincerely,<br>Genesoft Finance Operations</p>",
                bodyText: "Dear {{contact.name}},\n\nYour annual enterprise cloud support agreement is approaching its renewal window. We have prepared your updated recurring billing schedule for the upcoming fiscal cycle.\n\nSincerely,\nGenesoft Finance Operations",
                mergeTags: ["contact.name", "company.name"],
                isActive: true,
            },
        ],
    })

    // Find contacts to link sample conversation threads
    const sampleContact = await prisma.contact.findFirst({
        where: { tenantId, isActive: true },
    })

    if (sampleContact) {
        const thread1 = `thread_${Date.now()}_alpha`
        const date1 = new Date(Date.now() - 1000 * 3600 * 24 * 2) // 2 days ago
        const date2 = new Date(Date.now() - 1000 * 3600 * 4) // 4 hours ago

        // Inbound message
        await prisma.emailMessage.create({
            data: {
                tenantId,
                emailAccountId: salesInbox.id,
                direction: EmailDirection.INBOUND,
                status: EmailStatus.DELIVERED,
                fromEmail: sampleContact.email || "cto@acmeglobal.com",
                fromName: sampleContact.displayName,
                toEmail: "sales@acmeglobal.com",
                toName: "Corporate Sales Desk",
                subject: "Technical Inquiry: Open API Gateway & GST E-Invoicing",
                bodyHtml: "<p>Hello Sales Team,</p><p>We are reviewing your ERP platform for our 200+ employee team. Can you confirm if your REST API supports real-time stock synchronization with Shopify and direct automated GST portal payload uploads?</p><p>Looking forward to your technical documentation.</p>",
                bodyText: "Hello Sales Team,\n\nWe are reviewing your ERP platform for our 200+ employee team. Can you confirm if your REST API supports real-time stock synchronization with Shopify and direct automated GST portal payload uploads?\n\nLooking forward to your technical documentation.",
                threadId: thread1,
                isStarred: true,
                isRead: true,
                sentAt: date1,
                deliveredAt: date1,
                contactId: sampleContact.id,
            },
        })

        // Outbound reply
        await prisma.emailMessage.create({
            data: {
                tenantId,
                emailAccountId: salesInbox.id,
                direction: EmailDirection.OUTBOUND,
                status: EmailStatus.SENT,
                fromEmail: "sales@acmeglobal.com",
                fromName: "Corporate Sales Desk",
                toEmail: sampleContact.email || "cto@acmeglobal.com",
                toName: sampleContact.displayName,
                subject: "Re: Technical Inquiry: Open API Gateway & GST E-Invoicing",
                bodyHtml: "<p>Hi " + sampleContact.displayName + ",</p><p>Yes, absolutely! Genesoft ERP features a fully authenticated REST & Webhook API engine capable of real-time inventory synchronization. Our India compliance suite includes native HSN/SAC validation and direct e-way bill generation.</p><p>I would be delighted to set up a developer sandbox for your engineering team.</p><p>Best regards,<br>Genesoft Sales Team</p>",
                bodyText: "Hi " + sampleContact.displayName + ",\n\nYes, absolutely! Genesoft ERP features a fully authenticated REST & Webhook API engine capable of real-time inventory synchronization. I would be delighted to set up a developer sandbox for your engineering team.\n\nBest regards,\nGenesoft Sales Team",
                threadId: thread1,
                inReplyTo: thread1,
                isStarred: false,
                isRead: true,
                sentAt: date2,
                deliveredAt: date2,
                openedAt: new Date(),
                openCount: 2,
                contactId: sampleContact.id,
            },
        })
    }
}
