import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { compileSystemEmail, type SystemTemplateKey } from "@/lib/email-template-engine"

const LEFTOVER_TAG = /{{\s*[\w-]+\s*}}/g

/**
 * Sends a platform email from a system template (Admin → Email Templates),
 * using the super admin's latest saved version of it. Inactive templates are
 * skipped. Missing tags are left blank (no sample data in real emails).
 * Never throws: an email problem must not break the action that sent it.
 */
export async function sendSystemEmail(
    templateKey: SystemTemplateKey,
    to: string | null | undefined,
    variables: Record<string, string>
): Promise<{ sent: boolean; reason?: string }> {
    try {
        const apiKey = process.env.RESEND_API_KEY
        const domain = process.env.RESEND_DOMAIN
        if (!to) return { sent: false, reason: "No recipient" }
        if (!apiKey || !domain) return { sent: false, reason: "Email isn't configured (RESEND_API_KEY / RESEND_DOMAIN)" }

        // Saved customisations live in the admin audit log (latest wins)
        const override = await prisma.adminAuditLog.findFirst({
            where: { action: "EMAIL_TEMPLATE_UPDATE", targetType: "EMAIL_TEMPLATE", targetId: templateKey },
            orderBy: { createdAt: "desc" },
            select: { metadata: true },
        })
        const custom = (override?.metadata || {}) as { subject?: string; bodyHtml?: string; bodyText?: string; isActive?: boolean }
        if (custom.isActive === false) return { sent: false, reason: "Template is switched off" }

        const compiled = compileSystemEmail({
            templateKey,
            customSubject: custom.subject,
            customBodyHtml: custom.bodyHtml,
            customBodyText: custom.bodyText,
            variables,
            useSampleData: false,
        })

        const { error } = await new Resend(apiKey).emails.send({
            from: `Genesoft ERP <notifications@${domain}>`,
            to: [to],
            subject: compiled.subject.replace(LEFTOVER_TAG, "").replace(/[\r\n]+/g, " ").trim(),
            html: compiled.html.replace(LEFTOVER_TAG, ""),
            text: compiled.text.replace(LEFTOVER_TAG, ""),
        })
        if (error) {
            console.error(`sendSystemEmail(${templateKey}) failed:`, error.message)
            return { sent: false, reason: error.message }
        }
        return { sent: true }
    } catch (err) {
        console.error(`sendSystemEmail(${templateKey}) failed:`, err)
        return { sent: false, reason: err instanceof Error ? err.message : "Send failed" }
    }
}
