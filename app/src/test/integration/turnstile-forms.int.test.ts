import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.21" }) }))

import { sendContactMessage } from "@/app/actions/public/contact"
import { prisma } from "@/lib/prisma"

const visitor = { name: "Ravi Kulkarni", email: `ravi-${Date.now()}@example.test`, topic: "General", message: "We need help with our office network" }

describe("website forms with the Turnstile spam check on", () => {
    afterEach(() => {
        delete process.env.TURNSTILE_SECRET_KEY
        delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        vi.unstubAllGlobals()
    })

    it("refuses a form without a passing check and saves nothing; accepts one that passes", async () => {
        process.env.TURNSTILE_SECRET_KEY = "secret"
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site"
        vi.stubGlobal("fetch", vi.fn(async (_url: string, init: { body: URLSearchParams }) => new Response(JSON.stringify({ success: init.body.get("response") === "good" }))))

        expect(await sendContactMessage({ ...visitor })).toMatchObject({ success: false, error: expect.stringMatching(/spam check/) })
        expect(await sendContactMessage({ ...visitor, turnstileToken: "bad" })).toMatchObject({ success: false, error: expect.stringMatching(/spam check/) })
        expect(await prisma.siteLead.count({ where: { email: visitor.email } })).toBe(0)

        expect(await sendContactMessage({ ...visitor, turnstileToken: "good" })).toEqual({ success: true, data: { sent: true } })
        expect(await prisma.siteLead.count({ where: { email: visitor.email } })).toBe(1)
    })
})
