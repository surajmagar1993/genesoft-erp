import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createCompany, deleteCompany, getCompanies, updateCompany } from "@/app/actions/crm/companies"
import { createTask, deleteTask, getTasks, updateTask } from "@/app/actions/crm/tasks"
import { createQuote, getQuoteById, updateQuote } from "@/app/actions/sales/quotes"
import { createBill } from "@/app/actions/finance/bills"
import { createTaxGroup, deleteTaxGroup, getTaxGroups } from "@/app/actions/sales/tax"
import { createNotification } from "@/app/actions/notifications"
import { getTenantSettings, updateTenantSettings } from "@/app/actions/settings/tenant"
import { createProduct, getProducts } from "@/app/actions/sales/products"
import { actAs, createCustomer, createTestTenant } from "./helpers"

const line = { product_name: "Work", description: "", qty: 2, unit_price: 500, tax_percent: 18 }
const quotePayload = (contactId: string) => ({
    quote_number: `QT-${Math.random().toString(36).slice(2, 7)}`, customer_name: "Acme", customer_email: "", quote_date: "2026-10-01", valid_until: "", reference: "",
    status: "DRAFT", discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", contact_id: contactId, currency_code: "INR", line_items: [line],
}) as never

describe("M17 one data path (Prisma) with tenant isolation", () => {
    it("another business can't see, change or delete a company or task", async () => {
        const a = await createTestTenant()
        actAs(a.user)
        const company = (await createCompany({ name: "Acme Pvt", is_active: true } as never)).data!
        expect(company).toMatchObject({ name: "Acme Pvt", tenant_id: a.tenant.id, is_active: true })
        expect(company.created_at).toMatch(/\+00:00$/) // timestamptz, as Supabase returned it
        const task = (await createTask({ title: "Call", status: "TODO", priority: "LOW", due_date: "", assigned_to: "" } as never)).data!
        expect(task).toMatchObject({ title: "Call", due_date: null, assigned_to: null })

        const b = await createTestTenant()
        actAs(b.user)
        expect((await getCompanies()).total).toBe(0)
        expect((await updateCompany(company.id, { name: "Hacked" })).error).toBe("Company not found")
        expect((await deleteCompany(company.id)).error).toBe("Company not found")
        expect((await updateTask(task.id, { title: "Hacked" })).error).toBe("Task not found")
        expect((await deleteTask(task.id)).error).toBe("Task not found")
        expect((await createTask({ title: "x", status: "TODO", priority: "LOW", contact_id: (await createCustomer(a.tenant.id)).id } as never)).error).toMatch(/Contact not found/)
        expect((await getTasks(1, 10, { contact_id: "not-a-uuid" })).data).toEqual([])

        actAs(a.user)
        expect((await getCompanies(1, 10, "acme")).data.map((c) => c.name)).toEqual(["Acme Pvt"])
        expect((await prisma.company.findUniqueOrThrow({ where: { id: company.id } })).name).toBe("Acme Pvt")
    })

    it("a quote update can't touch another business's quote; totals come from the server", async () => {
        const a = await createTestTenant()
        actAs(a.user)
        const customer = await createCustomer(a.tenant.id)
        const q = await createQuote(quotePayload(customer.id))
        expect(q.error).toBeNull()
        const saved = await getQuoteById(q.id!)
        expect(saved).toMatchObject({ subtotal: 1000, tax_amount: 180, total: 1180 })
        expect(saved!.quote_items).toHaveLength(1)

        const b = await createTestTenant()
        actAs(b.user)
        const own = await createCustomer(b.tenant.id)
        expect((await updateQuote({ ...(quotePayload(own.id) as object), id: q.id!, line_items: [] } as never)).error).toBe("Quote not found")
        expect(await prisma.quoteItem.count({ where: { quoteId: q.id! } })).toBe(1) // lines untouched
    })

    it("bill totals are worked out on the server", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const vendor = await createCustomer(tenant.id, "Vendor")
        const bill = await createBill({
            contactId: vendor.id, billNumber: "B-9", status: "DRAFT", billDate: new Date("2026-10-02"), subtotal: 1, taxAmount: 0, discount: 0, total: 1, currencyCode: "INR",
            items: [{ description: "Repair", quantity: 2, unitPrice: 500, taxPercent: 18, taxAmount: 0, lineTotal: 1 }],
        } as never)
        expect(bill).toMatchObject({ subtotal: 1000, tax_amount: 180, total: 1180 })
        const item = await prisma.billItem.findFirstOrThrow({ where: { billId: bill.id } })
        expect(Number(item.lineTotal)).toBe(1180)
    })

    it("a tax group with rates can be deleted; products keep working", async () => {
        const { user } = await createTestTenant()
        actAs(user)
        const g = await createTaxGroup({ name: "GST 18", country_code: "IN", is_default: false, rates: [{ name: "CGST", rate: 9 }, { name: "SGST", rate: 9 }] })
        expect((await getTaxGroups())[0].tax_rates).toHaveLength(2)
        const p = await createProduct({ type: "PRODUCT", name: "Cable", unit_price: 10, tax_group_id: g.id })
        expect(p.error).toBeNull()
        await deleteTaxGroup(g.id)
        expect(await getTaxGroups()).toEqual([])
        expect((await getProducts()).data[0]).toMatchObject({ name: "Cable", unit_price: 10, tax_group_id: null })
    })

    it("notification links stay inside the app", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const base = { type: "system" as const, title: "Hi", userId: user.id, tenantId: tenant.id }
        await expect(createNotification({ ...base, link: "javascript:alert(1)" })).rejects.toThrow(/paths in this app/)
        await expect(createNotification({ ...base, link: "//evil.example" })).rejects.toThrow(/paths in this app/)
        await expect(createNotification({ ...base, link: "/\\evil.example" })).rejects.toThrow(/paths in this app/)
        await createNotification({ ...base, link: "/finance/bills" })
        expect(await prisma.notification.count({ where: { userId: user.id } })).toBe(1)
    })

    it("company settings can't overwrite the subscription", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        await prisma.tenant.update({ where: { id: tenant.id }, data: { settings: { subscription: { billingCycle: "MONTHLY" } } } })
        const res = await updateTenantSettings({ name: "Renamed Ltd", settings: { subscription: { billingCycle: "ANNUAL", plan: "ENTERPRISE" } }, gstin: "" } as never)
        expect(res.success).toBe(true)
        const s = await getTenantSettings()
        expect(s).toMatchObject({ name: "Renamed Ltd" })
        expect((s!.settings as { subscription: unknown }).subscription).toEqual({ billingCycle: "MONTHLY" })
    })
})
