"use server"

import type { AdminAuditLog } from "@prisma/client"
import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { toActionResult, type ActionResult } from "@/lib/action-result"
import { canSignUnsubscribeTokens } from "@/lib/unsubscribe-token"
import {
    listMarketingRecipients,
    renderMarketingEmail,
    sendMarketingCampaign,
    sendMarketingEmailTo,
} from "@/lib/marketing-email"

async function ensureSuperAdmin() {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")
    const row = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, isActive: true } })
    if (!row || row.role !== "SUPER_ADMIN" || row.isActive === false) {
        throw new Error("Forbidden: Super Admin access required")
    }
    return user
}

export interface MarketingCampaignLog {
    id: string
    subject: string
    sent: number
    failed: number
    adminEmail: string
    createdAt: string
}

export interface MarketingOverview {
    subscriberCount: number
    /** Why sending is blocked, or null when it's ready */
    setupProblem: string | null
    campaigns: MarketingCampaignLog[]
}

function setupProblem(): string | null {
    if (!process.env.RESEND_API_KEY || !process.env.RESEND_DOMAIN) return "Email isn't configured: set RESEND_API_KEY and RESEND_DOMAIN."
    if (!canSignUnsubscribeTokens()) return "Set MARKETING_UNSUBSCRIBE_SECRET (or ENCRYPTION_KEY) so emails can carry an unsubscribe link."
    return null
}

const MAX_SUBJECT = 150
const MAX_BODY = 20000

function cleanContent(input: { subject?: unknown; body?: unknown }) {
    const subject = typeof input.subject === "string" ? input.subject.trim() : ""
    const body = typeof input.body === "string" ? input.body.trim() : ""
    if (!subject) throw new Error("Add a subject.")
    if (!body) throw new Error("Write the email.")
    if (subject.length > MAX_SUBJECT) throw new Error(`Keep the subject under ${MAX_SUBJECT} characters.`)
    if (body.length > MAX_BODY) throw new Error("The email is too long.")
    return { subject, body }
}

export async function getMarketingOverview(): Promise<MarketingOverview> {
    await ensureSuperAdmin()
    const [recipients, logs] = await Promise.all([
        listMarketingRecipients(),
        prisma.adminAuditLog.findMany({
            where: { action: "MARKETING_EMAIL_SEND" },
            orderBy: { createdAt: "desc" },
            take: 20,
        }),
    ])
    return {
        subscriberCount: recipients.length,
        setupProblem: setupProblem(),
        campaigns: logs.map((l: AdminAuditLog) => {
            const m = (l.metadata || {}) as { subject?: string; sent?: number; failed?: number }
            return {
                id: l.id,
                subject: m.subject || "",
                sent: m.sent ?? 0,
                failed: m.failed ?? 0,
                adminEmail: l.adminEmail,
                createdAt: l.createdAt.toISOString(),
            }
        }),
    }
}

/** Preview as it will look for the signed-in admin (unsubscribe link included). */
export async function previewMarketingEmail(input: { subject: string; body: string }): Promise<ActionResult<{ subject: string; html: string }>> {
    return toActionResult(async () => {
        const user = await ensureSuperAdmin()
        const content = cleanContent(input)
        const name = String(user.user_metadata?.full_name || "")
        const { subject, html } = renderMarketingEmail(content, { id: user.id, email: user.email || "", name })
        return { subject, html }
    })
}

/** Sends one copy to the signed-in super admin. Its unsubscribe link works, for the admin's own account. */
export async function sendMarketingTest(input: { subject: string; body: string }): Promise<ActionResult<{ to: string }>> {
    return toActionResult(async () => {
        const user = await ensureSuperAdmin()
        const problem = setupProblem()
        if (problem) throw new Error(problem)
        if (!user.email) throw new Error("Your account has no email address.")
        const content = cleanContent(input)
        await sendMarketingEmailTo(
            { id: user.id, email: user.email, name: String(user.user_metadata?.full_name || "") },
            { ...content, subject: `[Test] ${content.subject}` }
        )
        return { to: user.email }
    })
}

/**
 * Sends to everyone who has opted in right now. expectedCount must match the
 * current subscriber count (the number the admin confirmed), so a stale
 * screen can't send to a different list than the one shown.
 */
export async function sendMarketingEmail(
    input: { subject: string; body: string; expectedCount: number }
): Promise<ActionResult<{ sent: number; failed: number; errors: string[] }>> {
    return toActionResult(async () => {
        const user = await ensureSuperAdmin()
        const problem = setupProblem()
        if (problem) throw new Error(problem)
        const content = cleanContent(input)
        const recipients = await listMarketingRecipients()
        if (recipients.length === 0) throw new Error("Nobody has opted in to marketing emails yet.")
        if (recipients.length !== input.expectedCount) {
            throw new Error(`The subscriber list changed (now ${recipients.length}). Reload the page and check before sending.`)
        }

        const result = await sendMarketingCampaign(recipients, content)
        await prisma.adminAuditLog.create({
            data: {
                adminId: user.id,
                adminEmail: user.email || "unknown",
                action: "MARKETING_EMAIL_SEND",
                targetType: "MARKETING_EMAIL",
                metadata: { subject: content.subject, recipients: recipients.length, sent: result.sent, failed: result.failed, errors: result.errors },
            },
        })
        return result
    })
}
