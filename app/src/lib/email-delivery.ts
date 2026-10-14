import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { openSecret } from "@/lib/secret-box"
import { checkSmtpTarget } from "@/lib/smtp-guard"
import { CommunicationType } from "@prisma/client"
import { EmailDirection, EmailStatus } from "@/app/actions/crm/email-types"
import type { SendEmailInput } from "@/app/actions/crm/email-types"

/**
 * Rejects caller-supplied record IDs that belong to another tenant.
 * Returns an error message, or null when every provided ID is the caller's own.
 */
export async function findForeignLink(
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

/**
 * Sends an email through the tenant's mailbox (the given one, or the default)
 * over SMTP and logs it to email_messages and the CRM timeline. Callers do
 * their own auth: the sendEmail action for signed-in users, public web
 * forms for their alert emails.
 */
export async function deliverTenantEmail(tenantId: string, data: SendEmailInput): Promise<{
    success?: boolean
    messageId?: string
    error?: string
}> {
    try {
        if (!data.toEmail?.trim()) return { error: "Recipient email is required" }
        if (!data.subject?.trim()) return { error: "Subject is required" }
        const finalBodyText = data.bodyText || data.bodyHtml?.replace(/<[^>]*>?/gm, "") || ""
        const finalBodyHtml = data.bodyHtml || `<p>${finalBodyText.replace(/\n/g, "<br/>")}</p>`
        if (!finalBodyText.trim() && !data.bodyHtml?.trim()) return { error: "Email body content is required" }

        const foreignLink = await findForeignLink(tenantId, data)
        if (foreignLink) return { error: foreignLink }

        // Find or default account
        let emailAccountId = data.emailAccountId
        let senderEmail = ""
        let senderName = ""
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

        // Deliver over the mailbox's SMTP server. Without one there is nothing to
        // send through, so say so instead of logging the email as sent.
        if (!accountRecord?.smtpHost || !accountRecord.smtpPassword) {
            return { error: "Connect a mailbox with SMTP settings (CRM → Emails → Mailboxes) before sending email." }
        }
        {
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

        const createdMessage = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
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

        return { success: true, messageId: createdMessage.id }
    } catch (err: any) {
        console.error("deliverTenantEmail error:", err)
        return { error: err.message || "Failed to send email" }
    }
}
