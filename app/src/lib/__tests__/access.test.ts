import { describe, expect, it } from "vitest"
import { levelFor, moduleForPath, resolveAccess, summarizeAccess, uniformAccess } from "@/lib/access"

describe("module access", () => {
    it("maps dashboard paths to modules; shared pages have none", () => {
        expect(moduleForPath("/crm/contacts/123")).toBe("crm")
        expect(moduleForPath("/sales/invoices")).toBe("sales")
        expect(moduleForPath("/hr/payroll")).toBe("payroll")
        expect(moduleForPath("/hr/performance")).toBe("hr")
        expect(moduleForPath("/hr")).toBe("hr")
        expect(moduleForPath("/hr/portal")).toBeNull() // self-service
        expect(moduleForPath("/reports")).toBeNull() // dashboard
        expect(moduleForPath("/reports/builder")).toBe("reports")
        expect(moduleForPath("/settings")).toBeNull()
        expect(moduleForPath("/support")).toBeNull()
    })

    it("admins get everything; older roles keep their level until edited; junk is ignored", () => {
        expect(resolveAccess("ADMIN", { crm: "NONE" })).toEqual(uniformAccess("FULL"))
        expect(resolveAccess("MANAGER", null)).toEqual(uniformAccess("FULL"))
        expect(resolveAccess("VIEWER", null)).toEqual(uniformAccess("VIEW"))
        const a = resolveAccess("USER", { crm: "FULL", sales: "NONE", bogus: "FULL", finance: "ROOT" })
        expect(a).toMatchObject({ crm: "FULL", sales: "NONE", finance: "EDIT" })
        expect(a).not.toHaveProperty("bogus")
        expect(levelFor(a, ["sales", "crm"])).toBe("FULL")
        expect(summarizeAccess("USER", { ...uniformAccess("NONE"), sales: "EDIT" })).toBe("Sales: Edit")
        expect(summarizeAccess("ADMIN", uniformAccess("FULL"))).toBe("Everything (admin)")
    })
})
