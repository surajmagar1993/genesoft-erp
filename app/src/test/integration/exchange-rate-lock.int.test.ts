import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { syncLedger } from "@/lib/ledger"
import { createTestTenant } from "./helpers"

const setRate = (from: string, to: string, rate: number) =>
    prisma.exchangeRateCache.upsert({
        where: { fromCurrency_toCurrency: { fromCurrency: from, toCurrency: to } },
        update: { rate, updatedAt: new Date() },
        create: { fromCurrency: from, toCurrency: to, rate, updatedAt: new Date() },
    })

describe("foreign-currency documents keep the rate they were posted at", () => {
    it("a USD bill for an Indian business: rebuilding the ledger after the rate moves gives the same journal", async () => {
        const { tenant } = await createTestTenant({ country: "IN", currency: "INR" })
        const supplier = await prisma.contact.create({ data: { tenantId: tenant.id, displayName: "US Supplier" } })
        const bill = await prisma.bill.create({
            data: { tenantId: tenant.id, contactId: supplier.id, billNumber: "B-USD-1", status: "OPEN", billDate: new Date("2026-10-01"), subtotal: 100, taxAmount: 0, total: 100, currencyCode: "USD" } as never,
        })

        await setRate("USD", "INR", 80)
        await syncLedger(tenant.id, { kind: "bill", id: bill.id })
        const journal = () => prisma.journalEntry.findFirstOrThrow({ where: { tenantId: tenant.id, sourceId: bill.id, status: "POSTED" }, include: { lines: true } })
        const credit = async () => (await journal()).lines.reduce((s, l) => s + Number(l.credit), 0)
        expect(await credit()).toBe(8000)
        expect(Number((await prisma.bill.findUniqueOrThrow({ where: { id: bill.id } })).exchangeRate)).toBe(80)

        // the rate moves; a rebuild keeps the bill at 80
        await setRate("USD", "INR", 90)
        await syncLedger(tenant.id, { kind: "bill", id: bill.id })
        expect(await credit()).toBe(8000)
    })
})
