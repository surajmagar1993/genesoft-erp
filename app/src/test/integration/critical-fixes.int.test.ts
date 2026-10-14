import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { convertLeadToDeal, createLead, getLeadById, getLeads, updateLead } from "@/app/actions/crm/leads"
import { createDeal, getDealById, getDeals, updateDealStage } from "@/app/actions/crm/deals"
import { createProduct, getProductById, importProducts, updateProduct } from "@/app/actions/sales/products"
import { convertAgreementToInvoice } from "@/app/actions/rental"
import { convertChallanToInvoice } from "@/app/actions/sales/delivery-challan"
import type { InvoiceItem } from "@prisma/client"
import { actAs, createCustomer, createTestTenant } from "./helpers"

describe("C1 leads", () => {
    it("creates a lead with email/phone on a linked contact, edits, searches and converts it", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const created = await createLead({ title: "Website redesign", contact_name: "Asha Rao", email: "asha@example.test", phone: "+91 90000 00001", source: "referral", status: "NEW", score: 70, assigned_to: "", notes: "" })
        expect(created.error).toBeNull()

        const lead = await getLeadById(created.id!)
        expect(lead).toMatchObject({ title: "Website redesign", contact_name: "Asha Rao", email: "asha@example.test", phone: "+91 90000 00001", score: 70 })

        expect((await updateLead(created.id!, { phone: "+91 90000 00002", status: "QUALIFIED" })).error).toBeNull()
        expect(await getLeadById(created.id!)).toMatchObject({ phone: "+91 90000 00002", status: "QUALIFIED" })

        // A second lead with the same email reuses the contact
        const again = await createLead({ title: "Logo", contact_name: "Asha Rao", email: "ASHA@example.test", phone: "", source: "", status: "NEW", score: 10, assigned_to: "", notes: "" })
        const contacts = await prisma.contact.count({ where: { tenantId: tenant.id, email: { equals: "asha@example.test", mode: "insensitive" } } })
        expect(contacts).toBe(1)
        expect((await getLeadById(again.id!))?.email).toBe("asha@example.test")

        expect((await getLeads(1, 10, { search: "asha@" })).total).toBe(2)
        expect((await getLeads(1, 10, { search: "redesign" })).total).toBe(1)

        const res = await convertLeadToDeal(created.id!)
        const deal = await prisma.deal.findUniqueOrThrow({ where: { id: res.dealId }, include: { contact: true } })
        expect(deal.contact.displayName).toBe("Asha Rao")
        expect((await getLeadById(created.id!))?.status).toBe("CONVERTED")
    })

    it("rejects a lead without a title", async () => {
        const { user } = await createTestTenant()
        actAs(user)
        const res = await createLead({ title: " ", contact_name: "", email: "", phone: "", source: "", status: "NEW", score: 0, assigned_to: "", notes: "" })
        expect(res.error).toMatch(/title/)
    })
})

describe("C2 deals", () => {
    it("creates a deal from the form's names, shows contact/company, searches and moves stages", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const res = await createDeal({ title: "ERP rollout", contact_name: "Ravi Kumar", company: "Kumar Traders", value: 250000, stage: "PROSPECTING", probability: 20, expected_close: "2026-12-15", assigned_to: "", notes: "" })
        expect(res.error).toBeNull()

        const deal = await getDealById(res.id!)
        expect(deal).toMatchObject({ title: "ERP rollout", contact_name: "Ravi Kumar", company: "Kumar Traders", value: 250000, expected_close: "2026-12-15" })
        const row = await prisma.deal.findUniqueOrThrow({ where: { id: res.id! } })
        expect(row.currency).toBe(tenant.currencyCode)

        expect((await getDeals(1, 10, { search: "kumar traders" })).total).toBe(1)
        expect((await updateDealStage(res.id!, "NEGOTIATION")).error).toBeNull()
        expect((await getDealById(res.id!))?.probability).toBe(80)

        // Same customer name → same contact
        await createDeal({ title: "Support plan", contact_name: "ravi kumar", company: "", value: 0, stage: "PROSPECTING", probability: 20, expected_close: null, assigned_to: "", notes: "" })
        expect(await prisma.contact.count({ where: { tenantId: tenant.id, displayName: { equals: "Ravi Kumar", mode: "insensitive" } } })).toBe(1)
    })
})

describe("C3 products", () => {
    it("creates, edits and imports products with their price", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const res = await createProduct({ type: "PRODUCT", name: "Router", unit_price: 2499, unit: "Nos", stock_qty: 5 })
        expect(res.error).toBeNull()
        expect((await getProductById(res.id!))?.unit_price).toBe(2499)

        expect((await updateProduct({ id: res.id!, type: "PRODUCT", name: "Router AX", unit_price: 2799 })).error).toBeNull()
        expect(await getProductById(res.id!)).toMatchObject({ name: "Router AX", unit_price: 2799 })

        // Extra spreadsheet columns are ignored; prices come through
        const imp = await importProducts([
            { name: "Cable", unit_price: "199", type: "product", Notes: "ignore me", id: "not-a-real-id" },
            { name: "Install", unit_price: 500, type: "SERVICE" },
        ])
        expect(imp).toEqual({ error: null, count: 2 })
        const cable = await prisma.product.findFirstOrThrow({ where: { tenantId: tenant.id, name: "Cable" } })
        expect(Number(cable.unitPrice)).toBe(199)

        expect((await createProduct({ type: "PRODUCT", name: "Bad", unit_price: -5 })).error).toMatch(/price/i)
    })
})

describe("C4 rental → invoice", () => {
    async function rental(tenantId: string, contactId: string) {
        const asset = await prisma.rentalAsset.create({ data: { tenantId, assetCode: `A-${Math.random().toString(36).slice(2, 6)}`, name: "Generator", category: "Power", dailyRate: 1000 } as never })
        return prisma.rentalAgreement.create({
            data: {
                tenantId, contactId, agreementNumber: `RA-${Math.random().toString(36).slice(2, 6)}`, startDate: new Date("2026-10-01"), endDate: new Date("2026-10-05"),
                rentalRate: 1000, totalRentalAmount: 5000,
                items: { create: [{ tenantId, assetId: asset.id, quantity: 1, rentalDays: 5, rate: 1000, totalAmount: 5000 }] },
            } as never,
        })
    }

    it("India: 18% split CGST/SGST in-state, normal number series, once only, on the customer statement", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const ag = await rental(tenant.id, customer.id)
        const inv = await convertAgreementToInvoice(ag.id)
        const full = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id }, include: { items: true } })
        expect(full.invoiceNumber).toMatch(/^INV-\d{4}-\d{2}-0001$/)
        expect(Number(full.subtotal)).toBe(5000)
        expect(Number(full.total)).toBe(5900)
        expect(full.items.every((i: InvoiceItem) => Number(i.cgstRate) === 9 && Number(i.sgstRate) === 9)).toBe(true)
        expect(Number((await prisma.contact.findUniqueOrThrow({ where: { id: customer.id } })).balance)).toBe(5900)
        await expect(convertAgreementToInvoice(ag.id)).rejects.toThrow(/already/)
    })

    it("UAE: 5% VAT in AED (no Indian GST)", async () => {
        const { tenant, user } = await createTestTenant({ country: "AE", currency: "AED" })
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const inv = await convertAgreementToInvoice((await rental(tenant.id, customer.id)).id)
        const full = await prisma.invoice.findUniqueOrThrow({ where: { id: inv.id }, include: { items: true } })
        expect(full.currencyCode).toBe("AED")
        expect(Number(full.total)).toBe(5250)
        expect(Number(full.items[0].vatRate)).toBe(5)
        expect(Number(full.items[0].cgstRate ?? 0)).toBe(0)
    })
})

describe("C5 delivery challan → invoice", () => {
    it("creates a correct invoice from the challan's lines, with the customer's details", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id, "Mehta Stores")
        const challan = await prisma.deliveryChallan.create({
            data: {
                tenantId: tenant.id, contactId: customer.id, challanNumber: "DC-1", recipientName: "Mehta Stores", dispatchAddress: {}, deliveryAddress: { line1: "Shop 4" },
                placeOfSupply: "Karnataka",
                items: { create: [{ productName: "Steel rods", description: "12mm", hsnCode: "7214", quantity: 10, unitPrice: 100, taxRate: 18 }] },
            } as never,
        })
        const res = await convertChallanToInvoice(challan.id)
        const inv = await prisma.invoice.findUniqueOrThrow({ where: { id: res.invoice.id }, include: { items: true } })
        expect((inv.billTo as { name: string }).name).toBe("Mehta Stores")
        expect(inv.currencyCode).toBe("INR")
        expect(Number(inv.total)).toBe(1180)
        expect(Number(inv.items[0].igstRate)).toBe(18) // Maharashtra → Karnataka
        expect(inv.items[0].description).toBe("Steel rods — 12mm")
        await expect(convertChallanToInvoice(challan.id)).rejects.toThrow(/already/)
    })
})
