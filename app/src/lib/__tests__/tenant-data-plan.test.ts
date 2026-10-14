import { describe, expect, it } from "vitest"
import { planTenantData, type FkEdge } from "@/lib/tenant-data-plan"

const fk = (child: string, childCol: string, parent: string, onDelete = "a", parentCol = "id"): FkEdge => ({ child, childCol, parent, parentCol, onDelete })

describe("planTenantData", () => {
    it("reaches child tables through their parent and deletes children first", () => {
        const plan = planTenantData(
            ["invoices", "contacts", "payments"],
            [fk("invoices", "contact_id", "contacts"), fk("invoice_items", "invoice_id", "invoices", "c"), fk("payments", "invoice_id", "invoices", "c")]
        )
        expect(plan.predicates.get("invoice_items")).toBe(`"invoice_id" in (select "id" from "invoices" where "tenant_id" = $1::uuid)`)
        const o = plan.deleteOrder
        // cascade edge, but the child is found through its parent, so it still goes first
        expect(o.indexOf("invoice_items")).toBeLessThan(o.indexOf("invoices"))
        expect(o.indexOf("invoices")).toBeLessThan(o.indexOf("contacts"))
    })

    it("a child of two tenant tables matches through either parent", () => {
        const plan = planTenantData(["bills", "orders"], [fk("lines", "bill_id", "bills"), fk("lines", "order_id", "orders")])
        expect(plan.predicates.get("lines")).toMatch(/^\(.+ or .+\)$/)
    })

    it("ignores SET NULL / CASCADE edges between tenant tables when ordering, and self references", () => {
        const plan = planTenantData(["a", "b"], [fk("a", "b_id", "b", "n"), fk("b", "a_id", "a", "n"), fk("a", "parent_id", "a", "a")])
        expect(plan.deleteOrder.sort()).toEqual(["a", "b"])
    })

    it("refuses a blocking cycle instead of half-deleting", () => {
        expect(() => planTenantData(["a", "b"], [fk("a", "b_id", "b", "r"), fk("b", "a_id", "a", "r")])).toThrow(/reference each other/)
    })

    it("never includes the tenants table, and links children of tenants directly", () => {
        const plan = planTenantData(["contacts"], [fk("contacts", "tenant_id", "tenants"), fk("brand_assets", "owner_tenant", "tenants")])
        expect(plan.predicates.has("tenants")).toBe(false)
        expect(plan.predicates.get("brand_assets")).toBe(`"owner_tenant" = $1::uuid`)
    })
})
