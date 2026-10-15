import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { assertTurnstile, verifyTurnstile } from "@/lib/turnstile"

const reply = (body: unknown) => vi.fn(async () => new Response(JSON.stringify(body)))

describe("Turnstile spam check", () => {
    beforeEach(() => {
        process.env.TURNSTILE_SECRET_KEY = "secret"
        process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY = "site"
    })
    afterEach(() => {
        delete process.env.TURNSTILE_SECRET_KEY
        delete process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        vi.unstubAllGlobals()
    })

    it("is off until both keys are set", async () => {
        delete process.env.TURNSTILE_SECRET_KEY
        const fetch = reply({ success: false })
        vi.stubGlobal("fetch", fetch)
        expect(await verifyTurnstile("")).toBe(true)
        expect(fetch).not.toHaveBeenCalled()
    })

    it("needs a token once on", async () => {
        vi.stubGlobal("fetch", reply({ success: true }))
        expect(await verifyTurnstile("")).toBe(false)
        await expect(assertTurnstile(undefined)).rejects.toThrow(/spam check/)
    })

    it("asks Cloudflare with the secret, token and visitor IP", async () => {
        const fetch = reply({ success: true })
        vi.stubGlobal("fetch", fetch)
        expect(await verifyTurnstile("tok", "203.0.113.5")).toBe(true)
        const body = (fetch.mock.calls[0] as unknown as [string, { body: URLSearchParams }])[1].body
        expect(Object.fromEntries(body)).toEqual({ secret: "secret", response: "tok", remoteip: "203.0.113.5" })
    })

    it("refuses tokens Cloudflare rejects", async () => {
        vi.stubGlobal("fetch", reply({ success: false, "error-codes": ["invalid-input-response"] }))
        expect(await verifyTurnstile("bad")).toBe(false)
    })

    it("lets people through if Cloudflare can't be reached", async () => {
        vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("network") }))
        expect(await verifyTurnstile("tok")).toBe(true)
    })
})
