/**
 * Fixed-window request counter kept in this server instance's memory.
 * Used by the proxy for the per-IP limit in Admin → Security. Instances don't
 * share counts, so a very spread-out flood can get more through; a hard
 * platform-wide cap belongs in a Vercel Firewall rate-limit rule.
 */
const windows = new Map<string, { start: number; count: number }>()
const MAX_KEYS = 50_000

export function hitRateLimit(key: string, limit: number, windowMs = 60_000, now = Date.now()): { limited: boolean; retryAfterSec: number } {
    let w = windows.get(key)
    if (!w || now - w.start >= windowMs) {
        if (windows.size >= MAX_KEYS) prune(now, windowMs)
        w = { start: now, count: 0 }
        windows.set(key, w)
    }
    w.count++
    const retryAfterSec = Math.max(1, Math.ceil((w.start + windowMs - now) / 1000))
    return { limited: w.count > limit, retryAfterSec }
}

function prune(now: number, windowMs: number) {
    for (const [k, w] of windows) if (now - w.start >= windowMs) windows.delete(k)
    // Still full (a flood of distinct keys): start over rather than grow without bound
    if (windows.size >= MAX_KEYS) windows.clear()
}

/** For tests. */
export function resetRateLimits() {
    windows.clear()
}
