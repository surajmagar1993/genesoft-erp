import { describe, expect, it } from "vitest"
import { Prisma } from "@prisma/client"
import { fromRow, pgTimestamp, toRow } from "@/lib/pg-row"

describe("pg-row", () => {
    it("prints timestamps the way PostgREST does", () => {
        expect(pgTimestamp(new Date("2026-09-14T21:57:31.530Z"))).toBe("2026-09-14T21:57:31.53")
        expect(pgTimestamp(new Date("2026-09-14T21:57:30.000Z"))).toBe("2026-09-14T21:57:30")
        expect(pgTimestamp(new Date("2026-09-14T21:50:00.100Z"))).toBe("2026-09-14T21:50:00.1")
        expect(pgTimestamp(new Date("2026-10-13T03:01:42.146Z"), true)).toBe("2026-10-13T03:01:42.146+00:00")
    })

    it("maps columns both ways and keeps unknown keys out", () => {
        const row = toRow("Account", { id: "a", tenantId: "t", code: "1000", balance: new Prisma.Decimal("12.50"), isGroup: true, createdAt: new Date("2026-01-01T00:00:00Z") })
        expect(row).toEqual({ id: "a", tenant_id: "t", code: "1000", balance: 12.5, is_group: true, created_at: "2026-01-01T00:00:00" })
        expect(fromRow("Account", { code: "2000", is_group: false, parent_id: "", tenant_id: "x", hacked: 1 })).toEqual({ code: "2000", isGroup: false, parentId: null })
    })
})
