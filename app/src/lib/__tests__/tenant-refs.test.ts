import { beforeEach, describe, expect, it, vi } from "vitest"

const counts = vi.hoisted(() => ({}) as Record<string, ReturnType<typeof vi.fn>>)
vi.mock("@/lib/prisma", () => ({
    prisma: new Proxy({}, {
        get: (_, model: string) => {
            counts[model] ??= vi.fn()
            return { count: counts[model] }
        },
    }),
}))

import { assertTenantRefs } from "@/lib/tenant-refs"

describe("assertTenantRefs", () => {
    beforeEach(() => {
        for (const fn of Object.values(counts)) fn.mockReset()
    })

    it("passes when every id belongs to the tenant", async () => {
        counts.contact = vi.fn().mockResolvedValue(1)
        counts.product = vi.fn().mockResolvedValue(2)
        await expect(assertTenantRefs("t1", { contact: "c1", product: ["p1", "p2", "p1"] })).resolves.toBeUndefined()
        expect(counts.product).toHaveBeenCalledWith({ where: { tenantId: "t1", id: { in: ["p1", "p2"] } } })
    })

    it("throws a friendly not-found error when an id belongs to another tenant", async () => {
        counts.warehouse = vi.fn().mockResolvedValue(0)
        await expect(assertTenantRefs("t1", { warehouse: "w-other" })).rejects.toThrow("Warehouse not found")
    })

    it("ignores empty optional references without querying", async () => {
        counts.deal = vi.fn()
        await expect(assertTenantRefs("t1", { deal: undefined, lead: null, contact: [] })).resolves.toBeUndefined()
        expect(counts.deal).not.toHaveBeenCalled()
    })
})
