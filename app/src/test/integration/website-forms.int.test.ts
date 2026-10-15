import { describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.7" }) }))

import { sendContactMessage, sendRentalQuote } from "@/app/actions/public/contact"

const visitor = { name: "Asha Rao", email: "asha@example.test", company: "Rao Traders", phone: "+91 98765 43210" }

describe("website forms (contact, service enquiries, IT rental quotes)", () => {
    it("checks the visitor's details with readable messages", async () => {
        expect(await sendContactMessage({ ...visitor, name: "A", topic: "General", message: "We need a website" })).toMatchObject({ success: false, error: expect.stringMatching(/your name/) })
        expect(await sendContactMessage({ ...visitor, email: "not-an-email", topic: "General", message: "We need a website" })).toMatchObject({ success: false, error: expect.stringMatching(/valid email/) })
        expect(await sendContactMessage({ ...visitor, phone: "call me", topic: "General", message: "We need a website" })).toMatchObject({ success: false, error: expect.stringMatching(/phone number/) })
        expect(await sendContactMessage({ ...visitor, topic: "General", message: "Hi" })).toMatchObject({ success: false, error: expect.stringMatching(/a little more/) })
    })

    it("a filled hidden field (a bot) is quietly accepted and nothing is sent", async () => {
        expect(await sendContactMessage({ ...visitor, topic: "General", message: "Buy cheap stuff now", website: "spam.example" })).toEqual({ success: true, data: { sent: true } })
        expect(await sendRentalQuote({ ...visitor, items: [], period: "1 month", city: "", website: "spam.example" })).toEqual({ success: true, data: { sent: true } })
    })

    it("a rental quote needs at least one item with a quantity, and a delivery city", async () => {
        expect(await sendRentalQuote({ ...visitor, items: [], period: "1 month", city: "Pune" })).toMatchObject({ success: false, error: expect.stringMatching(/at least one item/) })
        expect(await sendRentalQuote({ ...visitor, items: [{ category: "Laptops", quantity: 0 }], period: "1 month", city: "Pune" })).toMatchObject({ success: false, error: expect.stringMatching(/quantity/) })
        expect(await sendRentalQuote({ ...visitor, items: [{ category: "Laptops", quantity: 10 }], period: "1 month", city: "" })).toMatchObject({ success: false, error: expect.stringMatching(/delivery city/) })
        expect(await sendRentalQuote({ ...visitor, items: [{ category: "Laptops", quantity: 10 }], startDate: "next week", period: "1 month", city: "Pune" })).toMatchObject({ success: false, error: expect.stringMatching(/start date/) })
    })

    it("a valid request with email not configured says how else to reach us", async () => {
        // Tests run without a Resend key: the visitor is pointed to info@ instead of losing the message silently
        const res = await sendRentalQuote({ ...visitor, items: [{ category: "Laptops", quantity: 10, specs: "i5, 16 GB" }], startDate: "2026-11-01", period: "3 months", city: "Pune" })
        expect(res).toMatchObject({ success: false, error: expect.stringMatching(/info@genesoftinfotech\.com/) })
    })
})
