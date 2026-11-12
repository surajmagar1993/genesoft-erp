import { describe, expect, it } from "vitest"
import { isParkedRoute, PARKED_MODULES_ENABLED } from "./features"

describe("switched-off modules", () => {
    it("are off unless the environment turns them on", () => {
        expect(PARKED_MODULES_ENABLED).toBe(false)
    })

    it("cover Emails, WhatsApp, Web Forms and Bank Reconciliation, with their sub-pages", () => {
        for (const path of ["/crm/emails", "/crm/whatsapp", "/crm/forms", "/finance/bank-reconciliation", "/crm/forms/new"]) {
            expect(isParkedRoute(path)).toBe(true)
        }
    })

    it("leave the rest of CRM and Finance alone", () => {
        for (const path of ["/crm/contacts", "/crm/formsx", "/finance/bills", "/finance/reports", "/forms/abc"]) {
            expect(isParkedRoute(path)).toBe(false)
        }
    })
})
