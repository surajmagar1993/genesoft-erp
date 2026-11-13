import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { nextSequence, peekSequence } from "@/lib/sequence"
import { createTestTenant } from "./helpers"

describe("document numbers (document_counters)", () => {
    it("never repeats under concurrent saves, never goes below an existing number, previews don't use a number", async () => {
        const { tenant } = await createTestTenant()
        const prefix = "SO-2026-"
        // an order saved before the counter existed (or typed by hand)
        await prisma.salesOrder.create({ data: { tenantId: tenant.id, orderNumber: "SO-2026-0007", customerName: "Old", customerEmail: "", orderDate: new Date() } as never })

        expect(await peekSequence(prisma, "salesOrder", tenant.id, prefix)).toBe("SO-2026-0008")
        expect(await peekSequence(prisma, "salesOrder", tenant.id, prefix)).toBe("SO-2026-0008")

        const taken = await Promise.all(Array.from({ length: 8 }, () => nextSequence(prisma, "salesOrder", tenant.id, prefix)))
        expect(new Set(taken).size).toBe(8)
        expect([...taken].sort()[0]).toBe("SO-2026-0008")
        expect(await peekSequence(prisma, "salesOrder", tenant.id, prefix)).toBe("SO-2026-0016")

        // a number typed far ahead pushes the series past it
        await prisma.salesOrder.create({ data: { tenantId: tenant.id, orderNumber: "SO-2026-0100", customerName: "Typed", customerEmail: "", orderDate: new Date() } as never })
        expect(await nextSequence(prisma, "salesOrder", tenant.id, prefix)).toBe("SO-2026-0101")

        // inside a rolled-back transaction the number is given back
        await expect(prisma.$transaction(async (tx) => {
            await nextSequence(tx, "salesOrder", tenant.id, prefix)
            throw new Error("save failed")
        })).rejects.toThrow("save failed")
        expect(await nextSequence(prisma, "salesOrder", tenant.id, prefix)).toBe("SO-2026-0102")

        // other businesses have their own series
        const other = await createTestTenant()
        expect(await nextSequence(prisma, "salesOrder", other.tenant.id, prefix)).toBe("SO-2026-0001")
    })
})
