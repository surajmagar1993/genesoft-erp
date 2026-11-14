import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { appUrl } from "@/lib/app-url"
import { PLATFORM } from "@/lib/constants/platform"
import { createUnsubscribeToken } from "@/lib/unsubscribe-token"
import { wrapEmailHtml } from "@/lib/email-template-engine"
import { cleanTopicsOff, topicLabel, type MarketingTopic, type SubscriberFacts } from "@/lib/marketing-topics"

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

export type MarketingSubscriber = MarketingRecipient & SubscriberFacts & { tenantName: string | null }

/** Confirmed, active, not-banned users who opted in to marketing emails, in businesses that aren't suspended. */
export async function listMarketingRecipients(): Promise<MarketingSubscriber[]> {
    // to_jsonb(p) so a database without profiles.is_active still works
    const rows: {
        id: string; email: string; name: string | null; topics_off: unknown
        tenant_id: string | null; tenant_name: string | null; plan: string | null; country_code: string | null
        is_trial: boolean | null; trial_ends_at: Date | null
    }[] = await prisma.$queryRaw`
        select u.id::text as id, u.email, to_jsonb(p)->>'full_name' as name,
               u.raw_user_meta_data->'marketing_topics_off' as topics_off,
               t.id::text as tenant_id, t.name as tenant_name, t.plan::text as plan, t.country_code,
               t.is_trial, t.trial_ends_at
        from auth.users u
        left join public.profiles p on p.id = u.id
        left join public.tenants t on t.id = p.tenant_id
        where u.raw_user_meta_data->>'marketing_opt_in' = 'true'
          and u.email is not null
          and u.email_confirmed_at is not null
          and u.deleted_at is null
          and (u.banned_until is null or u.banned_until < now())
          and coalesce(to_jsonb(p)->>'is_active', 'true') <> 'false'
          and coalesce(t.is_active, true)
        order by u.created_at`
    return rows.map((r) => ({
        id: r.id, email: r.email, name: r.name || "",
        topicsOff: cleanTopicsOff(r.topics_off),
        tenantId: r.tenant_id, tenantName: r.tenant_name, plan: r.plan, countryCode: r.country_code,
        isTrial: r.is_trial, trialEndsAt: r.trial_ends_at,
    }))
}

/**
 * Withdraws marketing consent for one user: all of it, or one topic only.
 * Returns false if the user doesn't exist.
 */
export async function optOutOfMarketing(userId: string, source: "email-link" | "one-click", topic?: MarketingTopic): Promise<boolean> {
    const at = new Date().toISOString()
    const count: number = topic
        ? await prisma.$executeRaw`
        update auth.users
        set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
            'marketing_topics_off', (
                select coalesce(jsonb_agg(distinct x), '[]'::jsonb)
                from jsonb_array_elements_text(
                    case when jsonb_typeof(raw_user_meta_data->'marketing_topics_off') = 'array'
                         then raw_user_meta_data->'marketing_topics_off' else '[]'::jsonb end || to_jsonb(${topic}::text)
                ) as x
            ),
            'marketing_consent_at', ${at}::text,
            'marketing_consent_source', ${source}::text
        )
        where id = ${userId}::uuid`
        : await prisma.$executeRaw`
        update auth.users
        set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object(
            'marketing_opt_in', false,
            'marketing_consent_at', ${at}::text,
            'marketing_consent_source', ${source}::text
        )
        where id = ${userId}::uuid`
    return count > 0
}


const escapeHtml = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;")

const P = 'style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#1C1917"'

/** Escaped text with **bold** and clickable http(s) links. */
const inline = (text: string) =>
    escapeHtml(text)
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/(https?:\/\/[^\s<]+[^\s<.,;:!?)])/g, '<a href="$1" style="color:#C2410C;text-decoration:underline">$1</a>')

/**
 * Plain text → safe email HTML. Blank line = new paragraph; "## " starts a
 * heading; lines starting "- " are a bulleted list; **bold**; links clickable.
 */
export function textToHtml(text: string): string {
    return text
        .trim()
        .split(/\n\s*\n/)
        .map((block) => {
            const lines = block.split("\n")
            if (/^##\s+/.test(block)) {
                const [head, ...rest] = lines
                const h = `<h2 style="margin:8px 0 10px;font-size:17px;line-height:1.35;color:#1C1917">${inline(head.replace(/^##\s+/, ""))}</h2>`
                return rest.length ? h + textToHtml(rest.join("\n")) : h
            }
            if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
                const items = lines.map((l) => `<li style="margin:0 0 6px">${inline(l.replace(/^\s*[-*]\s+/, ""))}</li>`).join("")
                return `<ul style="margin:0 0 16px;padding-left:22px;font-size:15px;line-height:1.6;color:#1C1917">${items}</ul>`
            }
            return `<p ${P}>${lines.map(inline).join("<br>")}</p>`
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

export interface MarketingContent {
    subject: string
    body: string
    topic: MarketingTopic
    /** Optional button under the message (https link) */
    button?: { label: string; url: string } | null
}

export function renderMarketingEmail(content: MarketingContent, recipient: MarketingRecipient): RenderedMarketingEmail {
    const query = `t=${encodeURIComponent(createUnsubscribeToken(recipient.id))}&topic=${content.topic}`
    const unsubscribe = `${appUrl()}/unsubscribe?${query}`
    // One-click (mail providers' button) stops this kind of email only
    const oneClick = `${appUrl()}/api/unsubscribe?${query}`
    const preferences = `${appUrl()}/settings?tab=account`
    const body = personalise(content.body, recipient)
    const subject = personalise(content.subject, recipient).replace(/[\r\n]+/g, " ").trim()
    const address = `${PLATFORM.legalName}, ${PLATFORM.address.line1}, ${PLATFORM.address.line2}, ${PLATFORM.address.country}`
    const why = `You're getting this because you chose to receive ${topicLabel(content.topic).toLowerCase()} emails from ${PLATFORM.productName}.`

    const footerHtml = `${escapeHtml(why)}<br>
<a href="${escapeHtml(unsubscribe)}" style="color:#6B6560">Unsubscribe</a> &middot;
<a href="${escapeHtml(preferences)}" style="color:#6B6560">Email preferences</a><br>
${escapeHtml(address)}`
    const html = wrapEmailHtml({
        title: subject,
        previewText: body.replace(/[#*]/g, "").replace(/\s+/g, " ").trim().slice(0, 140),
        bodyContent: textToHtml(body),
        actionButton: content.button || undefined,
        footerHtml,
    })

    const text = `${body.trim()}${content.button ? `\n\n${content.button.label}: ${content.button.url}` : ""}

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
export async function sendMarketingEmailTo(recipient: MarketingRecipient, content: MarketingContent) {
    const { resend, from, replyTo } = marketingSender()
    const { error } = await resend.emails.send(toResendEmail(recipient, renderMarketingEmail(content, recipient), from, replyTo))
    if (error) throw new Error(`Resend rejected the email: ${error.message}`)
}

const BATCH_SIZE = 100 // Resend batch limit

/** Sends to every given recipient in batches of 100. Never throws for a failed batch; counts it. */
export async function sendMarketingCampaign(
    recipients: MarketingRecipient[],
    content: MarketingContent
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
