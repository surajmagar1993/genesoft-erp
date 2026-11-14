import { describe, expect, it } from "vitest"
import { isParkedModule, isParkedRoute, parkedFallback, PARKED_MODULES_ENABLED } from "./features"

describe("switched-off modules", () => {
    it("are off unless the environment turns them on", () => {
        expect(PARKED_MODULES_ENABLED).toBe(false)
    })

    it("cover Emails, WhatsApp, Web Forms, Bank Reconciliation and the thin modules, with their sub-pages", () => {
        for (const path of [
            "/crm/emails", "/crm/whatsapp", "/crm/forms", "/finance/bank-reconciliation", "/crm/forms/new",
            "/manufacturing", "/hr/performance", "/hr/recruitment", "/purchase/rfq", "/purchase/rfq/new",
            "/finance/budgets", "/reports/builder",
        ]) {
            expect(isParkedRoute(path)).toBe(true)
        }
    })

    it("leave the rest of each area alone", () => {
        for (const path of [
            "/crm/contacts", "/crm/formsx", "/finance/bills", "/finance/reports", "/forms/abc",
            "/hr", "/hr/employees", "/hr/payroll", "/hr/portal", "/purchase", "/purchase/orders/new",
            "/inventory", "/reports", "/manufacturingx",
        ]) {
            expect(isParkedRoute(path)).toBe(false)
        }
    })

    it("send visitors to the nearest page that is on", () => {
        expect(parkedFallback("/manufacturing")).toBe("/reports")
        expect(parkedFallback("/hr/recruitment")).toBe("/hr")
        expect(parkedFallback("/purchase/rfq/new")).toBe("/purchase")
        expect(parkedFallback("/finance/budgets")).toBe("/finance/reports")
        expect(parkedFallback("/reports/builder")).toBe("/reports")
        expect(parkedFallback("/crm/whatsapp")).toBe("/crm/contacts")
    })

    it("close the Manufacturing and Report builder access modules", () => {
        expect(isParkedModule("manufacturing")).toBe(true)
        expect(isParkedModule("reports")).toBe(true)
        expect(isParkedModule("inventory")).toBe(false)
        expect(isParkedModule("hr")).toBe(false)
    })
})
