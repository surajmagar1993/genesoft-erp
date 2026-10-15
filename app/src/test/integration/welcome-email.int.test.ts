import { beforeEach, describe, expect, it, vi } from "vitest"

const sent: { from: string; replyTo?: string; to: string[]; subject: string; html: string }[] = []
let failSend = false
vi.mock("resend", () => ({
    Resend: class {
        emails = {
            send: async (msg: (typeof sent)[number]) => {
                if (failSend) return { error: { message: "Resend is down" } }
                sent.push(msg)
                return { error: null }
            },
        }
    },
}))

import { prisma } from "@/lib/prisma"
import { isWelcomeDue, sendWelcomeEmailOnce } from "@/lib/welcome-email"
import { addUser, createTestTenant } from "./helpers"

const settingsOf = async (id: string) => ((await prisma.tenant.findUniqueOrThrow({ where: { id } })).settings ?? {}) as Record<string, unknown>

describe("welcome email", () => {
    beforeEach(() => {
        sent.length = 0
        failSend = false
        process.env.RESEND_API_KEY = "re_test"
        process.env.RESEND_DOMAIN = "genesoftinfotech.com"
    })

    it("goes once to a new business owner, from and reply-to hello@", async () => {
        const { tenant, user } = await createTestTenant({ trialDays: 15, name: "Sharma Traders" })
        const [a, b] = await Promise.all([sendWelcomeEmailOnce(user.id), sendWelcomeEmailOnce(user.id)])
        expect([a.sent, b.sent].filter(Boolean)).toHaveLength(1)
        expect((await sendWelcomeEmailOnce(user.id)).sent).toBe(false)
        expect(sent).toHaveLength(1)
        expect(sent[0]).toMatchObject({ from: "Genesoft Infotech <hello@genesoftinfotech.com>", replyTo: "hello@genesoftinfotech.com", to: [user.email] })
        expect(sent[0].html).toContain("Sharma Traders")
        expect(sent[0].html).toContain("Open your workspace")
        expect(sent[0].html).not.toMatch(/{{\s*\w+\s*}}/)
        expect(await settingsOf(tenant.id)).toMatchObject({ gstin: "27AAAAA0000A1Z5", welcomeEmail: { to: user.email } })
    })

    it("skips team members and older businesses", async () => {
        const { tenant } = await createTestTenant({ trialDays: 15 })
        const member = await addUser(tenant.id, "ADMIN")
        expect((await sendWelcomeEmailOnce(member.id)).sent).toBe(false)

        const old = await createTestTenant()
        await prisma.tenant.update({ where: { id: old.tenant.id }, data: { createdAt: new Date(Date.now() - 30 * 86400000) } })
        expect((await sendWelcomeEmailOnce(old.user.id)).sent).toBe(false)
        expect(sent).toHaveLength(0)
    })

    it("tries again on the next sign-in when sending fails", async () => {
        const { tenant, user } = await createTestTenant({ trialDays: 15 })
        failSend = true
        expect((await sendWelcomeEmailOnce(user.id)).sent).toBe(false)
        expect((await settingsOf(tenant.id)).welcomeEmail).toBeUndefined()
        failSend = false
        expect((await sendWelcomeEmailOnce(user.id)).sent).toBe(true)
    })

    it("rules", () => {
        const now = new Date("2026-10-15T00:00:00Z")
        const base = { userId: "u", role: "ADMIN", firstUserId: "u", alreadySent: false, tenantCreatedAt: new Date("2026-10-14T00:00:00Z") }
        expect(isWelcomeDue(base, now)).toBe(true)
        expect(isWelcomeDue({ ...base, role: "USER" }, now)).toBe(false)
        expect(isWelcomeDue({ ...base, alreadySent: true }, now)).toBe(false)
        expect(isWelcomeDue({ ...base, tenantCreatedAt: new Date("2026-10-01T00:00:00Z") }, now)).toBe(false)
    })
})
