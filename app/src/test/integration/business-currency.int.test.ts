import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createVendor, createPurchaseOrder } from "@/app/actions/purchase"
import { createCompany } from "@/app/actions/crm/companies"
import { createLead } from "@/app/actions/crm/leads"
import { actAs, createTestTenant } from "./helpers"

/**
 * Records created without a country or currency take the business's own
 * (never the database default of IN / INR).
 */
describe("a UAE business: new records default to AE / AED", () => {
    it("vendor, purchase order, company and a lead's new contact", async () => {
        const { tenant, user } = await createTestTenant({ country: "AE", currency: "AED" })
        actAs(user)

        const vendor = await createVendor({ displayName: "Gulf Supplies" })
        expect(vendor).toMatchObject({ success: true })
        const v = await prisma.contact.findFirstOrThrow({ where: { tenantId: tenant.id, displayName: "Gulf Supplies" } })
        expect(v.countryCode).toBe("AE")
        expect(v.currencyCode).toBe("AED")

        const po = await createPurchaseOrder({ vendorId: v.id, items: [{ description: "Paper", quantity: 10, unitPrice: 5, taxPercent: 5 }] })
        expect(po).toMatchObject({ success: true })
        const order = await prisma.purchaseOrder.findFirstOrThrow({ where: { tenantId: tenant.id } })
        expect(order.currencyCode).toBe("AED")

        const company = await createCompany({ name: "Desert Trading LLC" } as never)
        expect(company.error).toBeNull()
        const c = await prisma.company.findFirstOrThrow({ where: { tenantId: tenant.id } })
        expect(c.countryCode).toBe("AE")

        const lead = await createLead({ title: "Website enquiry", contact_name: "Omar", email: "omar@example.test", phone: "", status: "NEW" } as never)
        expect(lead.error).toBeNull()
        const contact = await prisma.contact.findFirstOrThrow({ where: { tenantId: tenant.id, displayName: "Omar" } })
        expect(contact.countryCode).toBe("AE")
        expect(contact.currencyCode).toBe("AED")
    })
})
