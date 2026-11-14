import { describe, expect, it, vi } from "vitest"

vi.mock("@/lib/plan-pricing", () => ({
    getEffectivePricing: async () => ({ currency: "INR", monthly: { FREE: 0, BASIC: 499, PRO: 999, ENTERPRISE: 4999 }, annual: { FREE: 0, BASIC: 4790, PRO: 9590, ENTERPRISE: 47990 } }),
}))
vi.mock("@/lib/exchange-rates", () => ({ getExchangeRate: async () => 1 }))

import { calculatePlatformMrr } from "./platform-mrr"

const tenant = (over: object) => ({ plan: "PRO", isActive: true, isTrial: false, currencyCode: "INR", settings: null, ...over })

describe("platform MRR", () => {
    it("counts paying tenants only: not trials, free, suspended or plans the platform gave free", async () => {
        const { mrr, payingTenants } = await calculatePlatformMrr([
            tenant({}),
            tenant({ plan: "ENTERPRISE", settings: { subscription: { compedByPlatform: true } } }),
            tenant({ isTrial: true }),
            tenant({ plan: "FREE" }),
            tenant({ isActive: false }),
        ])
        expect(payingTenants).toBe(1)
        expect(mrr).toBe(999)
    })
})
