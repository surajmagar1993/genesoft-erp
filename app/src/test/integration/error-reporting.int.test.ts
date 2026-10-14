import { beforeEach, describe, expect, it, vi } from "vitest"

const sent: { subject: string; to: string[]; text: string }[] = []
vi.mock("resend", () => ({
    Resend: class {
        emails = { send: async (msg: { subject: string; to: string[]; text: string }) => (sent.push(msg), { data: { id: "x" }, error: null }) }
    },
}))

import { prisma } from "@/lib/prisma"
import { pruneSystemLogs, reportError } from "@/lib/error-reporting"

describe("built-in error monitoring", () => {
    beforeEach(async () => {
        sent.length = 0
        process.env.RESEND_API_KEY = "re_test_key_for_integration"
        process.env.RESEND_DOMAIN = "example.test"
        await prisma.systemLog.deleteMany({})
    })

    it("logs every server error and emails only the first of each kind in 24 hours", async () => {
        const id1 = "3f2b8c1e-4d5a-4b6c-8d7e-9f0a1b2c3d4e"
        const id2 = "00000000-0000-4000-8000-000000000000"
        await reportError({ source: "server", message: `Invoice ${id1} failed: postgresql://u:pw123@db/x`, path: `/sales/invoices/${id1}`, stack: "Error\n    at x", digest: "123" })
        await reportError({ source: "server", message: `Invoice ${id2} failed: postgresql://u:pw123@db/x`, path: `/sales/invoices/${id2}` })
        await reportError({ source: "server", message: "Something else broke", path: "/crm" })

        const logs = await prisma.systemLog.findMany({ orderBy: { timestamp: "asc" } })
        expect(logs).toHaveLength(3)
        expect(logs.every((l: { level: string }) => l.level === "ERROR")).toBe(true)
        expect(logs[0].stack).toContain("at x")
        expect(JSON.stringify(logs)).not.toContain("pw123")

        expect(sent).toHaveLength(2) // the repeat of the invoice error isn't emailed
        expect(sent[0].subject).toMatch(/^\[Error\] Invoice/)
        expect(sent[0].text).toContain("Reference shown to the user: 123")
        expect(sent[0].text).not.toContain("pw123")
    })

    it("browser reports are logged as warnings and never emailed", async () => {
        await reportError({ source: "browser", message: "ResizeObserver loop", path: "/dashboard" })
        const log = await prisma.systemLog.findFirstOrThrow({})
        expect(log.level).toBe("WARN")
        expect(log.message).toMatch(/^\[browser\]/)
        expect(sent).toHaveLength(0)
    })

    it("prunes logs past the retention period", async () => {
        await prisma.systemLog.create({ data: { level: "ERROR", message: "old", timestamp: new Date(Date.now() - 40 * 86_400_000) } })
        await prisma.systemLog.create({ data: { level: "ERROR", message: "recent" } })
        expect(await pruneSystemLogs()).toBe(1)
        expect((await prisma.systemLog.findMany({})).map((l: { message: string }) => l.message)).toEqual(["recent"])
    })
})
