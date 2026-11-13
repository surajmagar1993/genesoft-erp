import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }))
import { awaitingSecondFactor } from "@/lib/current-user"

const client = (level: { currentLevel: string; nextLevel: string } | null, withMfa = true) =>
    ({ auth: withMfa ? { mfa: { getAuthenticatorAssuranceLevel: async () => ({ data: level, error: null }) } } : {} }) as never

describe("awaitingSecondFactor", () => {
    it("blocks a password-only session on an account with an authenticator app", async () => {
        expect(await awaitingSecondFactor(client({ currentLevel: "aal1", nextLevel: "aal2" }))).toBe(true)
    })
    it("lets verified sessions and accounts without 2FA through", async () => {
        expect(await awaitingSecondFactor(client({ currentLevel: "aal2", nextLevel: "aal2" }))).toBe(false)
        expect(await awaitingSecondFactor(client({ currentLevel: "aal1", nextLevel: "aal1" }))).toBe(false)
        expect(await awaitingSecondFactor(client(null))).toBe(false)
        expect(await awaitingSecondFactor(client(null, false))).toBe(false)
    })
})
