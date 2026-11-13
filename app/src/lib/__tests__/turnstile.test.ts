import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assertTurnstile, turnstileHostnames, verifyTurnstile } from "@/lib/turnstile"

const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body)))
const ok = (extra: Record<string, unknown> = {}) => reply({ success: true, action: "enquiry", hostname: "genesoftinfotech.com", ...extra })

describe("Turnstile spam check", () => {
    beforeEach(() => {
        process.env.TURNSTILE_SECRET_KEY = "secret"
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site"
    })
    afterEach(() => {
        delete process.env.TURNSTILE_SECRET_KEY
        delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        delete process.env.TURNSTILE_HOSTNAMES
        vi.unstubAllGlobals()
    })

    it("is off until both keys are set", async () => {
        delete process.env.TURNSTILE_SECRET_KEY
        const fetch = reply({ success: false })
        vi.stubGlobal("fetch", fetch)
        expect(await verifyTurnstile("", null, "enquiry")).toBe(true)
        expect(fetch).not.toHaveBeenCalled()
    })

    it("needs a token once on", async () => {
        vi.stubGlobal("fetch", ok())
        expect(await verifyTurnstile("", null, "enquiry")).toBe(false)
        await expect(assertTurnstile(undefined, null, "enquiry")).rejects.toThrow(/spam check/)
    })

    it("asks Cloudflare with the secret, token and visitor IP", async () => {
        const fetch = ok()
        vi.stubGlobal("fetch", fetch)
        expect(await verifyTurnstile("tok", "203.0.113.5", "enquiry")).toBe(true)
        const body = (fetch.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body
        expect(Object.fromEntries(body)).toEqual({ secret: "secret", response: "tok", remoteip: "203.0.113.5" })
    })

    it("refuses tokens Cloudflare rejects (bad or already used)", async () => {
        vi.stubGlobal("fetch", reply({ success: false, "error-codes": ["timeout-or-duplicate"] }))
        expect(await verifyTurnstile("used", null, "enquiry")).toBe(false)
    })

    it("refuses a token made for another form", async () => {
        vi.stubGlobal("fetch", ok({ action: "signup" }))
        expect(await verifyTurnstile("tok", null, "enquiry")).toBe(false)
    })

    it("refuses a token from a hostname that isn't ours", async () => {
        vi.stubGlobal("fetch", ok({ hostname: "evil.example" }))
        expect(await verifyTurnstile("tok", null, "enquiry")).toBe(false)
        vi.stubGlobal("fetch", ok({ hostname: undefined }))
        expect(await verifyTurnstile("tok", null, "enquiry")).toBe(false)
    })

    it("accepts the test copy and local development, or the TURNSTILE_HOSTNAMES list", async () => {
        expect(turnstileHostnames()).toEqual(expect.arrayContaining(["genesoftinfotech.com", "www.genesoftinfotech.com", "genesoftdev.vercel.app", "localhost"]))
        process.env.TURNSTILE_HOSTNAMES = "app.example, www.app.example"
        expect(turnstileHostnames()).toEqual(["app.example", "www.app.example"])
        vi.stubGlobal("fetch", ok({ hostname: "genesoftinfotech.com" }))
        expect(await verifyTurnstile("tok", null, "enquiry")).toBe(false)
    })

    it("lets people through if Cloudflare can't be reached", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network") }))
        expect(await verifyTurnstile("tok", null, "enquiry")).toBe(true)
    })
})
