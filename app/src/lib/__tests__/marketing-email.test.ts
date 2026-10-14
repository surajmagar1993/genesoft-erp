import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/prisma", () => ({ prisma: {} }))

import { createUnsubscribeToken, verifyUnsubscribeToken, canSignUnsubscribeTokens } from "@/lib/unsubscribe-token"
import { renderMarketingEmail } from "@/lib/marketing-email"

const USER = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e"

describe("unsubscribe tokens", () => {
    beforeEach(() => {
        vi.stubEnv("MARKETING_UNSUBSCRIBE_SECRET", "")
        vi.stubEnv("ENCRYPTION_KEY", "test-key")
        vi.stubEnv("CRON_SECRET", "")
    })
    afterEach(() => vi.unstubAllEnvs())

    it("round-trips a user id", () => {
        expect(verifyUnsubscribeToken(createUnsubscribeToken(USER))).toBe(USER)
    })

    it("rejects tampered, swapped or malformed tokens", () => {
        const token = createUnsubscribeToken(USER)
        const other = "00000000-0000-4000-8000-000000000000"
        expect(verifyUnsubscribeToken(`${other}.${token.split(".")[1]}`)).toBeNull()
        expect(verifyUnsubscribeToken(token.slice(0, -2))).toBeNull()
        expect(verifyUnsubscribeToken("not-a-token")).toBeNull()
        expect(verifyUnsubscribeToken("")).toBeNull()
        expect(verifyUnsubscribeToken(null)).toBeNull()
    })

    it("tokens stop working when the secret changes", () => {
        const token = createUnsubscribeToken(USER)
        vi.stubEnv("MARKETING_UNSUBSCRIBE_SECRET", "a-new-secret")
        expect(verifyUnsubscribeToken(token)).toBeNull()
    })

    it("refuses to sign without a secret", () => {
        vi.stubEnv("ENCRYPTION_KEY", "")
        expect(canSignUnsubscribeTokens()).toBe(false)
        expect(() => createUnsubscribeToken(USER)).toThrow()
        expect(verifyUnsubscribeToken(`${USER}.abc`)).toBeNull()
    })
})

describe("renderMarketingEmail", () => {
    beforeEach(() => {
        vi.stubEnv("ENCRYPTION_KEY", "test-key")
        vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://app.example.test")
    })
    afterEach(() => vi.unstubAllEnvs())

    const recipient = { id: USER, email: "person@example.test", name: "Asha Rao" }

    it("adds unsubscribe links, address and merge tags", () => {
        const m = renderMarketingEmail({ subject: "News for {{first_name}}", body: "Hi {{first_name}},\n\nSee https://example.test/new." }, recipient)
        expect(m.subject).toBe("News for Asha")
        expect(m.unsubscribe).toMatch(/^https:\/\/app\.example\.test\/unsubscribe\?t=/)
        expect(m.oneClick).toMatch(/^https:\/\/app\.example\.test\/api\/unsubscribe\?t=/)
        expect(m.html).toContain("Hi Asha,")
        expect(m.html).toContain('href="https://example.test/new"')
        expect(m.html).toContain("Unsubscribe")
        expect(m.html).toContain("Lohegaon")
        expect(m.text).toContain(`Unsubscribe: ${m.unsubscribe}`)
    })

    it("escapes HTML in the message and falls back when there is no name", () => {
        const m = renderMarketingEmail({ subject: "Hello", body: "Hi {{first_name}} <script>alert(1)</script>" }, { ...recipient, name: "" })
        expect(m.html).toContain("Hi there &lt;script&gt;")
        expect(m.html).not.toContain("<script>")
    })
})
