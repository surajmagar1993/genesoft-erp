import { describe, expect, it, vi } from "vitest"
import type Stripe from "stripe"
import { ensureStripePrice, planForSubscription, stripeLookupKey, subscriptionStanding } from "@/lib/stripe-plans"

const subscription = (price: Partial<Stripe.Price>, metadata: Record<string, string> = {}) =>
    ({ items: { data: [{ price }] }, metadata }) as unknown as Stripe.Subscription

function fakeStripe(existing?: Partial<Stripe.Price>) {
    return {
        prices: {
            list: vi.fn().mockResolvedValue({ data: existing ? [existing] : [] }),
            create: vi.fn().mockResolvedValue({ id: "price_new" }),
            update: vi.fn().mockResolvedValue({}),
        },
        products: {
            retrieve: vi.fn().mockResolvedValue({ id: "genesoft_pro", active: true }),
            create: vi.fn(),
            update: vi.fn(),
        },
    }
}

describe("stripe plans", () => {
    it("builds stable lookup keys", () => {
        expect(stripeLookupKey("PRO", "MONTHLY", "INR")).toBe("genesoft_pro_monthly_inr")
        expect(stripeLookupKey("ENTERPRISE", "ANNUAL", "usd")).toBe("genesoft_enterprise_annual_usd")
    })

    it("finds the plan from the price metadata, its lookup key, or the subscription metadata", () => {
        expect(planForSubscription(subscription({ metadata: { plan: "BASIC" } }))).toBe("BASIC")
        expect(planForSubscription(subscription({ lookup_key: "genesoft_enterprise_annual_inr", metadata: {} }))).toBe("ENTERPRISE")
        expect(planForSubscription(subscription({ metadata: {} }, { plan: "PRO" }))).toBe("PRO")
        expect(planForSubscription(subscription({ metadata: {} }, { plan: "SUPER_ADMIN" }))).toBeNull()
    })

    it("keeps the plan during a failed renewal and only downgrades when the subscription ends", () => {
        expect(subscriptionStanding("active")).toBe("paid")
        expect(subscriptionStanding("trialing")).toBe("paid")
        expect(subscriptionStanding("past_due")).toBe("grace")
        expect(subscriptionStanding("unpaid")).toBe("grace")
        expect(subscriptionStanding("canceled")).toBe("ended")
        expect(subscriptionStanding("incomplete_expired")).toBe("ended")
    })
})

describe("ensureStripePrice", () => {
    it("reuses the current price when the amount hasn't changed", async () => {
        const stripe = fakeStripe({ id: "price_old", unit_amount: 249900, currency: "inr", recurring: { interval: "month" } as Stripe.Price.Recurring })
        const id = await ensureStripePrice(stripe as unknown as Stripe, { plan: "PRO", cycle: "MONTHLY", currency: "INR", amount: 2499 })
        expect(id).toBe("price_old")
        expect(stripe.prices.create).not.toHaveBeenCalled()
    })

    it("creates a new price that takes over the lookup key and archives the old one", async () => {
        const stripe = fakeStripe({ id: "price_old", unit_amount: 249900, currency: "inr", recurring: { interval: "month" } as Stripe.Price.Recurring })
        const id = await ensureStripePrice(stripe as unknown as Stripe, { plan: "PRO", cycle: "MONTHLY", currency: "INR", amount: 2999 })
        expect(id).toBe("price_new")
        expect(stripe.prices.create).toHaveBeenCalledWith(expect.objectContaining({
            product: "genesoft_pro",
            currency: "inr",
            unit_amount: 299900,
            recurring: { interval: "month" },
            lookup_key: "genesoft_pro_monthly_inr",
            transfer_lookup_key: true,
        }))
        expect(stripe.prices.update).toHaveBeenCalledWith("price_old", { active: false })
    })

    it("creates the product the first time and prices yearly plans per year", async () => {
        const stripe = fakeStripe()
        stripe.products.retrieve.mockRejectedValue(Object.assign(new Error("No such product"), { code: "resource_missing" }))
        await ensureStripePrice(stripe as unknown as Stripe, { plan: "BASIC", cycle: "ANNUAL", currency: "USD", amount: 182 })
        expect(stripe.products.create).toHaveBeenCalledWith(expect.objectContaining({ id: "genesoft_basic" }))
        expect(stripe.prices.create).toHaveBeenCalledWith(expect.objectContaining({ unit_amount: 18200, recurring: { interval: "year" } }))
        expect(stripe.prices.update).not.toHaveBeenCalled()
    })
})
