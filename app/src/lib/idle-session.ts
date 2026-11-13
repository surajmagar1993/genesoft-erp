import { createHmac, timingSafeEqual } from "crypto"

/**
 * Session inactivity timeout (Admin → Security). The proxy keeps a signed
 * "last active" time in this cookie: page visits and real user activity (the
 * IdleWatcher's ping) move it forward; background polling doesn't. When it is
 * older than the timeout the user is signed out.
 */
export const IDLE_COOKIE = "gs_last_active"

function key(): string | null {
    const k = process.env.ENCRYPTION_KEY
    return k && k.length >= 16 ? k : null
}

function sign(payload: string, k: string): string {
    return createHmac("sha256", `idle:${k}`).update(payload).digest("base64url")
}

/** Cookie value for "active now", or null when ENCRYPTION_KEY isn't set (timeout then off). */
export function makeIdleCookie(userId: string, now = Date.now()): string | null {
    const k = key()
    if (!k) return null
    const payload = `${userId}.${now}`
    return `${payload}.${sign(payload, k)}`
}

/** The last-active time in the cookie, if it is genuine and belongs to this user. */
export function readIdleCookie(value: string | undefined, userId: string): number | null {
    const k = key()
    if (!k || !value) return null
    const parts = value.split(".")
    if (parts.length !== 3) return null
    const [uid, ts, sig] = parts
    if (uid !== userId || !/^\d{10,16}$/.test(ts)) return null
    const expected = Buffer.from(sign(`${uid}.${ts}`, k))
    const given = Buffer.from(sig)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
    return Number(ts)
}

export function idleTimeoutEnabled(timeoutMinutes: number): boolean {
    return timeoutMinutes > 0 && key() !== null
}

/** Milliseconds left before the session counts as idle (≤ 0 = expired). */
export function idleRemainingMs(lastActive: number, timeoutMinutes: number, now = Date.now()): number {
    return lastActive + timeoutMinutes * 60_000 - now
}

export const IDLE_COOKIE_OPTIONS = {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // Outlives any timeout; the time inside decides
    maxAge: 60 * 60 * 24 * 2,
}
