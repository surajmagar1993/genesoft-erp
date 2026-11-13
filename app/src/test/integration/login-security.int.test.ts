import { beforeEach, describe, expect, it, vi } from "vitest"
import { prisma } from "@/lib/prisma"
import { clearPlatformGateCache } from "@/lib/platform-security"
import { clearLoginFailures, loginLocked, recordLoginFailure } from "@/lib/login-lockout"

// The sign-in action talks to Supabase Auth, the request headers/cookies and the router
const auth = vi.hoisted(() => ({
    result: { data: { user: null as null | { id: string } }, error: null as null | { code: string; message: string } },
    aal: { currentLevel: "aal1", nextLevel: "aal1" },
    signInCalls: 0,
}))
const cookieJar = vi.hoisted(() => new Map<string, string>())

vi.mock("@/lib/supabase/server", () => ({
    createClient: async () => ({
        auth: {
            signInWithPassword: async () => { auth.signInCalls++; return auth.result },
            mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: auth.aal, error: null }) },
        },
    }),
}))
vi.mock("next/headers", () => ({
    headers: async () => new Headers({ "x-real-ip": "203.0.113.7" }),
    cookies: async () => ({ set: (name: string, value: string) => cookieJar.set(name, value), get: (name: string) => cookieJar.get(name) }),
}))
vi.mock("next/navigation", () => ({
    redirect: (url: string) => { throw Object.assign(new Error("NEXT_REDIRECT"), { url }) },
}))
vi.mock("next/server", async (orig) => ({ ...(await orig<typeof import("next/server")>()), after: () => {} }))

const { login } = await import("@/app/(auth)/actions")

async function tryLogin(email: string, password = "pw"): Promise<string> {
    const fd = new FormData()
    fd.set("email", email)
    fd.set("password", password)
    try {
        await login(fd)
    } catch (e) {
        return (e as { url?: string }).url ?? String(e)
    }
    return "(no redirect)"
}

const email = () => `lock-${Math.random().toString(36).slice(2, 8)}@example.test`

describe("failed-login lockout", () => {
    beforeEach(() => {
        clearPlatformGateCache()
        auth.signInCalls = 0
        auth.aal = { currentLevel: "aal1", nextLevel: "aal1" }
        cookieJar.clear()
    })

    it("locks an email after the policy's number of wrong passwords, without asking Supabase", async () => {
        const who = email()
        auth.result = { data: { user: null }, error: { code: "invalid_credentials", message: "Invalid login credentials" } }
        for (let i = 0; i < 5; i++) expect(await tryLogin(who)).toContain("Invalid%20login")
        const before = auth.signInCalls
        expect(decodeURIComponent(await tryLogin(who))).toContain("Too many failed sign-in attempts")
        expect(auth.signInCalls).toBe(before)
        // Another email from elsewhere isn't affected
        expect(await loginLocked(email(), "198.51.100.1", 5)).toBe(false)
    })

    it("follows the saved policy and a successful sign-in clears the count", async () => {
        await prisma.adminAuditLog.create({ data: { adminId: "test", adminEmail: "t@example.test", action: "SECURITY_POLICY_UPDATE", metadata: { authLockoutAttempts: 3 } } })
        clearPlatformGateCache()
        const who = email()
        await recordLoginFailure(who, "198.51.100.2")
        await recordLoginFailure(who, "198.51.100.2")
        expect(await loginLocked(who, null, 3)).toBe(false)
        await clearLoginFailures(who)
        await recordLoginFailure(who, null)
        await recordLoginFailure(who, null)
        expect(await loginLocked(who, null, 3)).toBe(false) // 2 since the reset
        await recordLoginFailure(who, null)
        expect(await loginLocked(who, null, 3)).toBe(true)
        await prisma.adminAuditLog.deleteMany({ where: { action: "SECURITY_POLICY_UPDATE" } })
    })

    it("doesn't count errors other than a wrong password", async () => {
        const who = email()
        auth.result = { data: { user: null }, error: { code: "email_not_confirmed", message: "Email not confirmed" } }
        for (let i = 0; i < 6; i++) await tryLogin(who)
        expect(await loginLocked(who, null, 5)).toBe(false)
    })

    it("starts the inactivity clock and sends accounts with an authenticator app to the code step", async () => {
        const user = await prisma.user.findFirst({ select: { id: true } }) ?? { id: "00000000-0000-4000-8000-000000000001" }
        auth.result = { data: { user: { id: user.id } }, error: null }
        auth.aal = { currentLevel: "aal1", nextLevel: "aal2" }
        const url = decodeURIComponent(await tryLogin(email()))
        expect(url).toMatch(/^\/two-factor\?next=\//)
        expect(cookieJar.get("gs_last_active")).toMatch(new RegExp(`^${user.id}\\.\\d+\\.`))

        auth.aal = { currentLevel: "aal1", nextLevel: "aal1" }
        expect(await tryLogin(email())).toMatch(/^\/(reports|admin\/dashboard)$/)
    })
})
