import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createContact, importContacts, updateContact } from "@/app/actions/crm/contacts"
import { importProducts } from "@/app/actions/sales/products"
import { createBankAccount } from "@/app/actions/finance/bank-reconciliation"
import { actAs, createTestTenant } from "./helpers"

describe("new records follow the business's own country and currency", () => {
    it("a UAE business: contact, imported contact, imported product and bank account are AE / AED, not IN / INR", async () => {
        const { tenant, user } = await createTestTenant({ country: "AE", currency: "AED" })
        actAs(user)

        // The form left country and currency blank
        const made = await createContact({ display_name: "Gulf Trading", type: "COMPANY", country_code: "", currency_code: "" } as never)
        expect(made.error).toBeNull()
        expect(await prisma.contact.findUniqueOrThrow({ where: { id: made.id! } })).toMatchObject({ countryCode: "AE", currencyCode: "AED" })

        // A choice made on the form is kept
        const usd = await createContact({ display_name: "US Buyer", type: "COMPANY", country_code: "US", currency_code: "USD" } as never)
        expect(await prisma.contact.findUniqueOrThrow({ where: { id: usd.id! } })).toMatchObject({ countryCode: "US", currencyCode: "USD" })

        expect(await importContacts([{ name: "Imported Co", email: "imported@example.test" }])).toMatchObject({ error: null, count: 1 })
        expect(await prisma.contact.findFirstOrThrow({ where: { tenantId: tenant.id, displayName: "Imported Co" } })).toMatchObject({ countryCode: "AE", currencyCode: "AED" })

        // Editing with country and currency left blank keeps what was saved
        expect((await updateContact(usd.id!, { display_name: "US Buyer Inc", country_code: "", currency_code: "" } as never)).error).toBeNull()
        expect(await prisma.contact.findUniqueOrThrow({ where: { id: usd.id! } })).toMatchObject({ displayName: "US Buyer Inc", countryCode: "US", currencyCode: "USD" })

        expect(await importProducts([{ name: "Cable", unit_price: 20 }])).toEqual({ error: null, count: 1 })
        expect((await prisma.product.findFirstOrThrow({ where: { tenantId: tenant.id, name: "Cable" } })).currency).toBe("AED")

        const bank = await createBankAccount({ accountName: "Main", accountNumber: "0001", bankName: "Bank", currencyCode: "" })
        expect(bank).toMatchObject({ success: true })
        expect((await prisma.bankAccount.findFirstOrThrow({ where: { tenantId: tenant.id } })).currencyCode).toBe("AED")
    })

    it("a product row without a name is reported, not saved as a made-up product", async () => {
        const { tenant, user } = await createTestTenant({ country: "GB", currency: "GBP" })
        actAs(user)
        const res = await importProducts([{ name: "Kettle", unit_price: 15 }, { name: "   ", unit_price: 9 }])
        expect(res.count).toBe(0)
        expect(res.error).toMatch(/Row 2: the product name is missing/)
        expect(await prisma.product.count({ where: { tenantId: tenant.id } })).toBe(0)
    })
})
