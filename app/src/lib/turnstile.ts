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

/** The forms that carry the check; each sends its own action and the server expects it back. */
export type TurnstileAction = "signup" | "enquiry" | "rental_quote" | "job_apply"

/**
 * Hostnames a token may come from. TURNSTILE_HOSTNAMES (comma-separated)
 * overrides; otherwise the live site, the test copy, local development and
 * the host of NEXT_PUBLIC_SITE_URL / NEXT_PUBLIC_APP_URL.
 */
export function turnstileHostnames(): string[] {
    const fromEnv = (process.env.TURNSTILE_HOSTNAMES || "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean)
    if (fromEnv.length) return fromEnv
    const hosts = new Set(["genesoftinfotech.com", "www.genesoftinfotech.com", "genesoftdev.vercel.app", "localhost", "127.0.0.1"])
    for (const url of [process.env.NEXT_PUBLIC_SITE_URL, process.env.NEXT_PUBLIC_APP_URL]) {
        try {
            if (url) hosts.add(new URL(url).hostname.toLowerCase())
        } catch {
            // not a URL
        }
    }
    return [...hosts]
}

/**
 * True when the visitor's token is valid for this form (or the check is off):
 * Cloudflare accepts it, it was made for `action`, on one of our hostnames.
 * Tokens are single-use; Cloudflare refuses a replayed one.
 */
export async function verifyTurnstile(token: string | null | undefined, ip: string | null | undefined, action: TurnstileAction): Promise<boolean> {
    if (!turnstileEnabled()) return true
    if (!token || token.length > 2048) return false
    try {
        const body = new URLSearchParams({ secret: process.env.TURNSTILE_SECRET_KEY!, response: token })
        if (ip && ip !== "unknown") body.set("remoteip", ip)
        const res = await fetch(VERIFY_URL, { method: "POST", body, signal: AbortSignal.timeout(10_000) })
        const data = (await res.json()) as { success?: boolean; action?: string; hostname?: string; "error-codes"?: string[] }
        if (data.success !== true) {
            console.warn("Turnstile rejected a form:", data["error-codes"]?.join(", "))
            return false
        }
        if (data.action !== action) {
            console.warn(`Turnstile token was for "${data.action}", not "${action}"`)
            return false
        }
        if (!data.hostname || !turnstileHostnames().includes(data.hostname.toLowerCase())) {
            console.warn(`Turnstile token came from an unexpected hostname: ${data.hostname}`)
            return false
        }
        return true
    } catch (err) {
        // Cloudflare unreachable: let the form through (honeypot and rate limits still apply) rather than block real people
        console.error("Turnstile check failed, letting the form through:", err)
        return true
    }
}

/** Throws a readable error when the check fails. */
export async function assertTurnstile(token: string | null | undefined, ip: string | null | undefined, action: TurnstileAction): Promise<void> {
    if (!(await verifyTurnstile(token, ip, action))) throw new Error(TURNSTILE_FAILED)
}
