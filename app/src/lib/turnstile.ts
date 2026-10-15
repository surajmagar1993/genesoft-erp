/**
 * Cloudflare Turnstile: the spam check on the website forms and sign-up.
 * Keys: NEXT_PUBLIC_TURNSTILE_SITE_KEY (browser) and TURNSTILE_SECRET_KEY
 * (server). Until both are set the check is off and forms rely on the
 * honeypot field and rate limits, as before. Server only.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

export const TURNSTILE_FAILED = "The spam check didn't pass. Please wait a moment and try again."

export function turnstileEnabled(): boolean {
    return !!(process.env.TURNSTILE_SECRET_KEY && process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY)
}

/** True when the visitor's token is valid (or the check is off). */
export async function verifyTurnstile(token: string | null | undefined, ip?: string | null): Promise<boolean> {
    if (!turnstileEnabled()) return true
    if (!token || token.length > 2048) return false
    try {
        const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token })
        if (ip && ip !== "unknown") body.set("remoteip", ip)
        const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(8000) })
        const data = (await res.json()) as { success?: boolean; "error-codes"?: string[] }
        if (!data.success) console.warn("Turnstile rejected a form:", data["error-codes"]?.join(", "))
        return data.success === true
    } catch (err) {
        // Cloudflare unreachable: let the form through (honeypot and rate limits still apply) rather than block real people
        console.error("Turnstile check failed, letting the form through:", err)
        return true
    }
}

/** Throws a readable error when the check fails. */
export async function assertTurnstile(token: string | null | undefined, ip?: string | null): Promise<void> {
    if (!(await verifyTurnstile(token, ip))) throw new Error(TURNSTILE_FAILED)
}
