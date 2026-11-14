import { describe, expect, it } from "vitest"
import { compileSaaSSubscriptionInvoice, getRegionalPricing } from "./saas-subscription-engine"

const invoiceFor = (currency: string | undefined) =>
    compileSaaSSubscriptionInvoice({ tenantId: "t", tenantName: "Shop", plan: "PRO", billingCycle: "MONTHLY", currency })

describe("plan invoice currency", () => {
    it.each([["INR", 18], ["AED", 5], ["SAR", 15], ["GBP", 20], ["USD", 0], ["AUD", 10]])("%s region pays in %s with its own tax", (code, tax) => {
        const inv = invoiceFor(code)
        expect(inv.currency).toBe(code)
        expect(inv.taxPercent).toBe(tax)
    })

    it.each(["CAD", "EUR", "KES", "", undefined])("everyone else (%s) pays USD with no tax, never INR", (code) => {
        expect(getRegionalPricing(code).currency).toBe("USD")
        const inv = invoiceFor(code)
        expect(inv.currency).toBe("USD")
        expect(inv.taxPercent).toBe(0)
        expect(inv.totalAmount).toBe(getRegionalPricing("USD").monthly.PRO)
    })
})
