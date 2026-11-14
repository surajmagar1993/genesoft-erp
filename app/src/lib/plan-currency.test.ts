import { describe, expect, it } from "vitest"
import { compileSaaSSubscriptionInvoice, getRegionalPricing } from "./saas-subscription-engine"

const invoiceFor = (currency: string | undefined) =>
    compileSaaSSubscriptionInvoice({ tenantId: "t", tenantName: "Shop", plan: "PRO", billingCycle: "MONTHLY", currency })

describe("plan invoice currency", () => {
    it.each([["INR", 18], ["AED", 0], ["SAR", 0], ["GBP", 0], ["USD", 0], ["AUD", 0]])("%s region pays in its own currency, tax %s%% (GST for India only)", (code, tax) => {
        const inv = invoiceFor(code)
        expect(inv.currency).toBe(code)
        expect(inv.taxPercent).toBe(tax)
        if (tax === 0) expect(inv.subtotal).toBe(inv.totalAmount)
    })

    it.each(["CAD", "EUR", "KES", "", undefined])("everyone else (%s) pays USD with no tax, never INR", (code) => {
        expect(getRegionalPricing(code).currency).toBe("USD")
        const inv = invoiceFor(code)
        expect(inv.currency).toBe("USD")
        expect(inv.taxPercent).toBe(0)
        expect(inv.totalAmount).toBe(getRegionalPricing("USD").monthly.PRO)
    })
})
