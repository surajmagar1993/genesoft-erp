import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))
import { DEFAULT_SECURITY_POLICY, cleanSecurityPolicy, mergeSecurityPolicy } from "@/lib/platform-security"
import { idleRemainingMs, idleTimeoutEnabled, makeIdleCookie, readIdleCookie } from "@/lib/idle-session"
import { hitRateLimit, resetRateLimits } from "@/lib/rate-limit"
import { safeNextPath } from "@/lib/safe-next"

describe("security policy", () => {
    it("merges partial saved entries oldest first over the defaults", () => {
        const policy = mergeSecurityPolicy([
            { enforce2FA: true, sessionTimeoutMinutes: 60 },
            { maintenanceMode: true }, // not a policy field: ignored
            { sessionTimeoutMinutes: 15, rateLimitPerMin: 300 },
        ])
        expect(policy).toEqual({ ...DEFAULT_SECURITY_POLICY, enforce2FA: true, sessionTimeoutMinutes: 15, rateLimitPerMin: 300 })
    })

    it("clamps numbers and drops junk", () => {
        expect(cleanSecurityPolicy({ authLockoutAttempts: 1, rateLimitPerMin: 99999, sessionTimeoutMinutes: "abc", enforce2FA: "yes" }))
            .toEqual({ authLockoutAttempts: 3, rateLimitPerMin: 1000 })
        expect(cleanSecurityPolicy({ sessionTimeoutMinutes: 0 })).toEqual({ sessionTimeoutMinutes: 0 })
        expect(cleanSecurityPolicy(null)).toEqual({})
    })
})

describe("idle session cookie", () => {
    const saved = process.env.ENCRYPTION_KEY
    beforeEach(() => { process.env.ENCRYPTION_KEY = "unit-test-key-0123456789" })
    afterEach(() => { process.env.ENCRYPTION_KEY = saved })

    it("round-trips for the same user and rejects tampering or another user", () => {
        const now = 1_800_000_000_000
        const value = makeIdleCookie("user-a", now)!
        expect(readIdleCookie(value, "user-a")).toBe(now)
        expect(readIdleCookie(value, "user-b")).toBeNull()
        const [uid, , sig] = value.split(".")
        expect(readIdleCookie(`${uid}.${now + 3_600_000}.${sig}`, "user-a")).toBeNull() // moved the clock forward
        expect(readIdleCookie("garbage", "user-a")).toBeNull()
        expect(readIdleCookie(undefined, "user-a")).toBeNull()
    })

    it("expires after the timeout and is off at 0 or without a key", () => {
        expect(idleRemainingMs(0, 30, 29 * 60_000)).toBeGreaterThan(0)
        expect(idleRemainingMs(0, 30, 30 * 60_000)).toBeLessThanOrEqual(0)
        expect(idleTimeoutEnabled(30)).toBe(true)
        expect(idleTimeoutEnabled(0)).toBe(false)
        delete process.env.ENCRYPTION_KEY
        expect(idleTimeoutEnabled(30)).toBe(false)
        expect(makeIdleCookie("user-a")).toBeNull()
    })
})

describe("rate limit", () => {
    beforeEach(() => resetRateLimits())

    it("allows up to the limit per window, then refuses until the window passes", () => {
        const t = 1_000_000
        for (let i = 0; i < 3; i++) expect(hitRateLimit("k", 3, 60_000, t + i).limited).toBe(false)
        const blocked = hitRateLimit("k", 3, 60_000, t + 10)
        expect(blocked.limited).toBe(true)
        expect(blocked.retryAfterSec).toBe(60)
        expect(hitRateLimit("other", 3, 60_000, t + 10).limited).toBe(false)
        expect(hitRateLimit("k", 3, 60_000, t + 60_000).limited).toBe(false)
    })
})

describe("safeNextPath", () => {
    it("keeps same-site paths only", () => {
        expect(safeNextPath("/sales/invoices?x=1")).toBe("/sales/invoices?x=1")
        expect(safeNextPath("//evil.example")).toBe("/reports")
        expect(safeNextPath("/\\evil.example")).toBe("/reports")
        expect(safeNextPath("https://evil.example")).toBe("/reports")
        expect(safeNextPath("/two-factor?next=/x")).toBe("/reports")
        expect(safeNextPath(undefined, "/admin/dashboard")).toBe("/admin/dashboard")
    })
})
