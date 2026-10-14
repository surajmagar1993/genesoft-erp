import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { appUrl } from "@/lib/app-url"
import { PLATFORM } from "@/lib/constants/platform"
import { createUnsubscribeToken } from "@/lib/unsubscribe-token"

/**
 * Marketing emails (product news, tips, offers) to users who opted in.
 * Consent lives in Supabase auth user metadata (marketing_opt_in, set at
 * sign-up or in Settings → Email preferences), so it's read and written
 * here with SQL on auth.users (Prisma connects as the postgres role).
 * Server-only: never import this from a "use server" file's exports.
 */

export interface MarketingRecipient {
    id: string
    email: string
    name: string
}

/** Confirmed, active, not-banned users who opted in to marketing emails. */
export async function listMarketingRecipients(): Promise<MarketingRecipient[]> {
    // to_jsonb(p) so a database without profiles.is_active still works
    const rows: { id: string; email: string; name: string | null }[] = await prisma.$queryRaw`
        select u.id::text as id, u.email, to_jsonb(p)->>'full_name' as name
        from auth.users u
        left join public.profiles p on p.id = u.id
        where u.raw_user_meta_data->>'marketing_opt_in' = 'true'
          and u.email is not null
          and u.email_confirmed_at is not null
          and u.deleted_at is null
          and (u.banned_until is null or u.banned_until < now())
          and coalesce(to_jsonb(p)->>'is_active', 'true') <> 'false'
        order by u.created_at`
    return rows.map((r) => ({ id: r.id, email: r.email, name: r.name || "" }))
}

/** Withdraws marketing consent for one user. Returns false if the user doesn't exist. */
export async function optOutOfMarketing(userId: string, source: "email-link" | "one-click"): Promise<boolean> {
    const count: number = await prisma.$executeRaw`
        update auth.users
        set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
            'marketing_opt_in', false,
            'marketing_consent_at', ${new Date().toISOString()}::text,
            'marketing_consent_source', ${source}::text
        )
        where id = ${userId}::uuid`
    return count > 0
}


const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

/** Plain text → safe HTML paragraphs, with http(s) links made clickable. */
function textToHtml(text: string): string {
    return text
        .trim()
        .split(/\n\s*\n/)
        .map((para) => {
            const html = escapeHtml(para)
                .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#2563eb">$1</a>')
                .replace(/\n/g, "<br>")
            return `<p style="margin:0 0 16px">${html}</p>`
        })
        .join("\n")
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || ""

/** {{first_name}} / {{name}} merge tags; "Hi {{first_name}}," falls back to "Hi there,". */
function personalise(text: string, r: Pick<MarketingRecipient, "name">): string {
    const first = firstName(r.name)
    return text
        .replace(/{{\s*first_name\s*}}/g, first || "there")
        .replace(/{{\s*name\s*}}/g, r.name.trim() || "there")
}

export interface RenderedMarketingEmail {
    subject: string
    html: string
    text: string
    /** Page with a confirm button (safe from link scanners) */
    unsubscribe: string
    /** RFC 8058 one-click endpoint for the List-Unsubscribe header */
    oneClick: string
}

export function renderMarketingEmail(
    content: { subject: string; body: string },
    recipient: MarketingRecipient
): RenderedMarketingEmail {
    const token = encodeURIComponent(createUnsubscribeToken(recipient.id))
    const unsubscribe = `${appUrl()}/unsubscribe?t=${token}`
    const oneClick = `${appUrl()}/api/unsubscribe?t=${token}`
    const preferences = `${appUrl()}/settings?tab=account`
    const body = personalise(content.body, recipient)
    const subject = personalise(content.subject, recipient).replace(/[\r\n]+/g, " ").trim()
    const address = `${PLATFORM.legalName}, ${PLATFORM.address.line1}, ${PLATFORM.address.line2}, ${PLATFORM.address.country}`
    const why = `You're getting this because you chose to receive product news from ${PLATFORM.productName}.`

    const html = `<!doctype html>
<html><body style="margin:0;background:#f4f6fa;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2937">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6fa;padding:24px 12px">
<tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:8px;overflow:hidden">
<tr><td style="padding:20px 28px;border-bottom:1px solid #e5e7eb;font-weight:700;font-size:18px;color:#1d4ed8">${escapeHtml(PLATFORM.productName)}</td></tr>
<tr><td style="padding:28px;font-size:15px;line-height:1.6">${textToHtml(body)}</td></tr>
<tr><td style="padding:20px 28px;border-top:1px solid #e5e7eb;font-size:12px;line-height:1.6;color:#6b7280">
${escapeHtml(why)}<br>
<a href="${escapeHtml(unsubscribe)}" style="color:#6b7280">Unsubscribe</a> &middot;
<a href="${escapeHtml(preferences)}" style="color:#6b7280">Email preferences</a><br>
${escapeHtml(address)}
</td></tr>
</table>
</td></tr>
</table>
</body></html>`

    const text = `${body.trim()}

--
${why}
Unsubscribe: ${unsubscribe}
Email preferences: ${preferences}
${address}`

    return { subject, html, text, unsubscribe, oneClick }
}

function marketingSender(): { resend: Resend; from: string; replyTo: string } {
    const apiKey = process.env.RESEND_API_KEY
    const domain = process.env.RESEND_DOMAIN
    if (!apiKey || !domain) throw new Error("Email isn't configured (RESEND_API_KEY / RESEND_DOMAIN).")
    return { resend: new Resend(apiKey), from: `${PLATFORM.productName} <news@${domain}>`, replyTo: PLATFORM.email }
}

function toResendEmail(r: MarketingRecipient, m: RenderedMarketingEmail, from: string, replyTo: string) {
    return {
        from,
        to: [r.email],
        replyTo,
        subject: m.subject,
        html: m.html,
        text: m.text,
        // RFC 8058 one-click unsubscribe (Gmail / Yahoo bulk-sender rules)
        headers: {
            "List-Unsubscribe": `<${m.oneClick}>, <mailto:${replyTo}?subject=unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
    }
}

/** Sends one rendered marketing email (used for test sends). Throws on failure. */
export async function sendMarketingEmailTo(recipient: MarketingRecipient, content: { subject: string; body: string }) {
    const { resend, from, replyTo } = marketingSender()
    const { error } = await resend.emails.send(toResendEmail(recipient, renderMarketingEmail(content, recipient), from, replyTo))
    if (error) throw new Error(`Resend rejected the email: ${error.message}`)
}

const BATCH_SIZE = 100 // Resend batch limit

/** Sends to every given recipient in batches of 100. Never throws for a failed batch; counts it. */
export async function sendMarketingCampaign(
    recipients: MarketingRecipient[],
    content: { subject: string; body: string }
): Promise<{ sent: number; failed: number; errors: string[] }> {
    const { resend, from, replyTo } = marketingSender()
    let sent = 0
    let failed = 0
    const errors: string[] = []
    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        const chunk = recipients.slice(i, i + BATCH_SIZE)
        try {
            const { error } = await resend.batch.send(
                chunk.map((r) => toResendEmail(r, renderMarketingEmail(content, r), from, replyTo))
            )
            if (error) throw new Error(error.message)
            sent += chunk.length
        } catch (err) {
            failed += chunk.length
            errors.push(err instanceof Error ? err.message : "Batch failed")
        }
    }
    return { sent, failed, errors: errors.slice(0, 5) }
}
