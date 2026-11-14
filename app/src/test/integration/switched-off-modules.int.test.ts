import { describe, expect, it } from "vitest"
import { getMyAccess } from "@/lib/get-tenant-id"
import { getManufacturingOverview } from "@/app/actions/manufacturing"
import { actAs, createTestTenant } from "./helpers"

describe("switched-off modules", () => {
    it("close Manufacturing and the Report builder to everyone, admins on Enterprise included", async () => {
        const { user } = await createTestTenant({ plan: "ENTERPRISE" })
        actAs(user)
        const ctx = await getMyAccess()
        expect(ctx.access.manufacturing).toBe("NONE")
        expect(ctx.access.reports).toBe("NONE")
        expect(ctx.access.inventory).toBe("FULL")
        await expect(getManufacturingOverview()).rejects.toThrow(/access to Manufacturing/)
    })
})
