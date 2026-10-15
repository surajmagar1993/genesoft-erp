import { createHash } from "node:crypto"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { appUrl } from "@/lib/app-url"
import { PLATFORM } from "@/lib/constants/platform"

/**
 * Built-in error monitoring (no third-party service): server errors go to
 * System Logs (Admin → System Logs) and the first occurrence of each new
 * error in 24 hours is emailed to ERROR_ALERT_EMAIL (default: the platform
 * email). Browser-reported errors are logged only. Never throws.
 * Server-only.
 */

export interface ErrorReport {
    message: string
    stack?: string
    path?: string
    method?: string
    source: "server" | "browser"
    /** Next.js error digest (shown to the user as "Reference") */
    digest?: string
    /** e.g. "render", "route", "action", "proxy" */
    kind?: string
}

const ALERT_WINDOW_MS = 24 * 60 * 60 * 1000
const MAX_ALERTS_PER_HOUR = 10
let alertTimes: number[] = []

/** Removes credentials that can appear in error text (DB URLs, bearer tokens, API keys). */
export function scrubSecrets(text: string): string {
    return text
        .replace(/(postgres(?:ql)?|mysql|redis|mongodb(?:\+srv)?):\/\/[^:\s/]+:[^@\s]+@/gi, "$1://***:***@")
        .replace(/\b(Bearer)\s+[A-Za-z0-9._~+/=-]{12,}/g, "$1 ***")
        .replace(/\b(sk|rk|pk)_(live|test)_[A-Za-z0-9]{8,}/g, "$1_$2_***")
        .replace(/\bre_[A-Za-z0-9_]{16,}/g, "re_***")
        .replace(/\brzp_(live|test)_[A-Za-z0-9]{8,}/g, "rzp_$1_***")
        .replace(/\benc:v1:[A-Za-z0-9+/=:._-]+/g, "enc:v1:***")
}

/** Prisma and others start messages with blank lines or "Invalid `x()` invocation:"; skip those. */
export function firstMeaningfulLine(message: string): string {
    const lines = message.split("\n").map((l) => l.trim()).filter(Boolean)
    const useful = lines.find((l) => !/^Invalid `.+` invocation/.test(l))
    return useful || lines[0] || ""
}

/**
 * Groups occurrences of "the same" error: the first line of the message with
 * ids, numbers and quoted values blanked, plus the route (dynamic segments blanked).
 */
export function errorFingerprint(message: string, path = ""): string {
    const firstLine = firstMeaningfulLine(message)
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, "<id>")
        .replace(/\b[a-z0-9]{24,}\b/gi, "<id>")
        .replace(/(["'`]).*?\1/g, "<v>")
        .replace(/\d+/g, "<n>")
        .trim()
    const route = path
        .split("?")[0]
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, ":id")
        .replace(/\/\d+(?=\/|$)/g, "/:n")
    return createHash("sha1").update(`${firstLine}|${route}`).digest("hex").slice(0, 12)
}

function canAlertNow(): boolean {
    const hourAgo = Date.now() - 60 * 60 * 1000
    alertTimes = alertTimes.filter((t) => t > hourAgo)
    if (alertTimes.length >= MAX_ALERTS_PER_HOUR) return false
    alertTimes.push(Date.now())
    return true
}

async function sendAlert(report: ErrorReport, fingerprint: string, message: string, stack: string) {
    const apiKey = process.env.RESEND_API_KEY
    const domain = process.env.RESEND_DOMAIN
    if (!apiKey || !domain || !canAlertNow()) return
    const to = process.env.ERROR_ALERT_EMAIL || PLATFORM.email
    const firstLine = firstMeaningfulLine(message).slice(0, 120)
    await new Resend(apiKey).emails.send({
        from: `${PLATFORM.productName} alerts <alerts@${domain}>`,
        to: [to],
        subject: `[Error] ${firstLine}`.replace(/[\r\n]+/g, " "),
        text: [
            `A new error happened on ${appUrl()}.`,
            "",
            `Where: ${report.method ? `${report.method} ` : ""}${report.path || "(unknown)"}${report.kind ? ` (${report.kind})` : ""}`,
            report.digest ? `Reference shown to the user: ${report.digest}` : "",
            `Error id: ${fingerprint} (repeats in the next 24 hours are logged, not emailed)`,
            "",
            message,
            "",
            stack ? stack.split("\n").slice(0, 15).join("\n") : "",
            "",
            `All errors: ${appUrl()}/admin/logs`,
        ]
            .filter((l, i, a) => l !== "" || a[i - 1] !== "")
            .join("\n"),
    })
}

/**
 * Errors that only mean the visitor went away while a page was still streaming
 * (closed the tab, clicked elsewhere). Logged as warnings, never emailed.
 */
const DISCONNECT_NOISE = [/destination stream errored while writing data/i, /\bECONNRESET\b/, /^aborted$/i, /The operation was aborted/i, /^Connection closed\.?$/i]
export function isDisconnectNoise(message: string): boolean {
    return DISCONNECT_NOISE.some((re) => re.test(message.trim()))
}

export async function reportError(report: ErrorReport): Promise<void> {
    try {
        const message = scrubSecrets(String(report.message || "Unknown error")).trim().slice(0, 2000) || "Unknown error"
        const stack = scrubSecrets(String(report.stack || "")).slice(0, 8000)
        const path = String(report.path || "").slice(0, 500)
        const fingerprint = errorFingerprint(message, path)
        const label = report.source === "browser" ? "[browser] " : ""
        const stored = `${label}${message}${report.digest ? `\n(reference ${report.digest})` : ""}\n[error id ${fingerprint}]`

        // Has this error been seen in the last 24 hours? (checked before logging this one)
        const seen = await prisma.systemLog.count({
            where: { message: { endsWith: `[error id ${fingerprint}]` }, timestamp: { gte: new Date(Date.now() - ALERT_WINDOW_MS) } },
        })
        await prisma.systemLog.create({
            data: {
                level: report.source === "browser" || isDisconnectNoise(message) ? "WARN" : "ERROR",
                message: stored,
                path: path || null,
                stack: stack || null,
            },
        })
        if (report.source === "server" && seen === 0 && !isDisconnectNoise(message)) await sendAlert(report, fingerprint, message, stack)
    } catch (err) {
        // Monitoring must never break the request that failed
        console.error("reportError failed:", err)
    }
}

/** Deletes logs older than the retention period (SYSTEM_LOG_RETENTION_DAYS, default 30). */
export async function pruneSystemLogs(): Promise<number> {
    const days = Math.max(1, Number(process.env.SYSTEM_LOG_RETENTION_DAYS) || 30)
    const { count } = await prisma.systemLog.deleteMany({ where: { timestamp: { lt: new Date(Date.now() - days * 86_400_000) } } })
    return count
}
