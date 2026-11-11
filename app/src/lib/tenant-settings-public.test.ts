import { describe, expect, it } from "vitest"
import { settingsForScreens } from "./tenant-settings-public"

describe("settingsForScreens", () => {
    it("keeps only what the settings screens read", () => {
        const out = settingsForScreens({
            gstin: "TAXID",
            state: "State",
            tax: { label: "VAT", rates: [5] },
            enable_multijurisdiction: true,
            team: { access: { u1: {} }, invites: [{ email: "someone@example.test" }] },
            whatsapp: { accessToken: "sealed", messages: [{ content: "hi" }] },
            paymentGateways: { stripeSecretKey: "sealed" },
            subscription: { billingCycle: "ANNUAL", invoices: [{ invoiceNumber: "R1" }], gatewayOrderId: "order_1" },
        })
        expect(out).toEqual({
            gstin: "TAXID",
            state: "State",
            tax: { label: "VAT", rates: [5] },
            enable_multijurisdiction: true,
            subscription: { billingCycle: "ANNUAL", invoices: [{ invoiceNumber: "R1" }] },
        })
    })

    it("returns an empty object for missing or odd settings", () => {
        expect(settingsForScreens(null)).toEqual({})
        expect(settingsForScreens("text")).toEqual({})
        expect(settingsForScreens({ subscription: "x" })).toEqual({})
    })
})
