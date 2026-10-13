import { afterEach, describe, expect, it, vi } from "vitest"
import type Stripe from "stripe"
import { planForSubscription, subscriptionStanding } from "@/lib/stripe-plans"

const subscription = (priceId: string, metadata: Record<string, string> = {}) =>
    ({ items: { data: [{ price: { id: priceId } }] }, metadata }) as unknown as Stripe.Subscription

describe("stripe plans", () => {
    afterEach(() => vi.unstubAllEnvs())

    it("maps the subscription price to the plan", () => {
        vi.stubEnv("STRIPE_PRICE_BASIC", "price_basic")
        vi.stubEnv("STRIPE_PRICE_ENTERPRISE", "price_ent")
        expect(planForSubscription(subscription("price_basic"))).toBe("BASIC")
        expect(planForSubscription(subscription("price_ent"))).toBe("ENTERPRISE")
    })

    it("falls back to the plan stored in metadata, and ignores unknown plans", () => {
        expect(planForSubscription(subscription("price_unknown", { plan: "PRO" }))).toBe("PRO")
        expect(planForSubscription(subscription("price_unknown", { plan: "SUPER_ADMIN" }))).toBeNull()
        expect(planForSubscription(subscription("price_unknown"))).toBeNull()
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
