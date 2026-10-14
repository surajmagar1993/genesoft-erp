import { describe, expect, it } from "vitest"
import { unzipSync, strFromU8 } from "fflate"
import { prisma } from "@/lib/prisma"
import { sealSecret } from "@/lib/secret-box"
import { streamTenantExport, purgeTenantData, getTenantDataPlan } from "@/lib/tenant-data"
import { createInvoice } from "@/app/actions/sales/invoices"
import { createPayment } from "@/app/actions/finance/payments"
import { closeWorkspace } from "@/app/actions/settings/workspace"
import { getTenantById, purgeTenant, toggleTenantStatus, updateTenantDetails } from "@/app/actions/saas/admin"
import { getTenantId } from "@/lib/get-tenant-id"
import { actAs, addUser, createCustomer, createTestTenant } from "./helpers"

async function readZip(stream: ReadableStream<Uint8Array>): Promise<Record<string, string>> {
    const buf = new Uint8Array(await new Response(stream).arrayBuffer())
    return Object.fromEntries(Object.entries(unzipSync(buf)).map(([name, data]) => [name, strFromU8(data)]))
}

async function redirectOf(fn: () => Promise<unknown>): Promise<string> {
    try {
        await fn()
    } catch (err) {
        const digest = String((err as { digest?: string }).digest || "")
        if (digest.startsWith("NEXT_REDIRECT")) return decodeURIComponent((digest.split(";")[2] || "").replace(/\+/g, " "))
        throw err
    }
    throw new Error("expected a redirect")
}

/** A business with a customer, a paid invoice (+ line items, ledger) and stored credentials. */
async function seedBusiness(name: string) {
    const { tenant, user } = await createTestTenant({ name })
    await prisma.tenant.update({
        where: { id: tenant.id },
        data: { settings: { gstin: "27AAAAA0000A1Z5", paymentGateways: { stripeSecretKey: sealSecret("sk_test_secret"), paypalClientSecret: "plain-secret" } } },
    })
    actAs(user)
    const customer = await createCustomer(tenant.id, `${name} Customer`)
    const line = { product_name: "Work", description: "", qty: 1, unit_price: 1000, tax_percent: 18, hsn_sac: "", cgst_percent: 0, sgst_percent: 0, igst_percent: 0, cgst_amount: 0, sgst_amount: 0, igst_amount: 0 }
    const inv = await createInvoice({
        invoice_number: `INV-${name}`, customer_name: customer.displayName, customer_email: "", invoice_date: "2026-10-01", valid_until: "",
        reference: "", status: "SENT", discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", supplier_gstin: "",
        customer_gstin: "", supplier_state: "", place_of_supply: "Maharashtra", supply_type: "intra", contact_id: customer.id, line_items: [line],
    })
    await createPayment({ invoice_id: inv.id, contact_id: customer.id, amount: 1180, payment_date: "2026-10-02", payment_method: "UPI" })
    await prisma.emailAccount.create({
        data: { tenantId: tenant.id, name, email: `mail@${name.toLowerCase()}.test`, smtpPassword: sealSecret("smtp-pass"), imapPassword: "plain-imap-pass" },
    })
    return { tenant, user, customer, invoiceId: inv.id! }
}

const counts = async (tenantId: string) => ({
    contacts: await prisma.contact.count({ where: { tenantId } }),
    invoices: await prisma.invoice.count({ where: { tenantId } }),
    items: await prisma.invoiceItem.count({ where: { invoice: { tenantId } } }),
    payments: await prisma.payment.count({ where: { tenantId } }),
    ledger: await prisma.ledgerEntry.count({ where: { tenantId } }),
    users: await prisma.user.count({ where: { tenantId } }),
})

describe("tenant data plan", () => {
    it("finds child tables without tenant_id and orders children before parents", async () => {
        const plan = await getTenantDataPlan()
        expect(plan.predicates.has("invoices")).toBe(true)
        expect(plan.predicates.has("invoice_line_items")).toBe(true) // reached through invoices
        expect(plan.predicates.has("tenants")).toBe(false)
        const order = plan.deleteOrder
        expect(order.indexOf("invoice_line_items")).toBeLessThan(order.indexOf("invoices"))
        expect(order.indexOf("payments")).toBeLessThan(order.indexOf("contacts"))
    })
})

describe("export all data", () => {
    it("includes the business's own rows and child rows, never another business's, never secrets", async () => {
        const a = await seedBusiness("Alpha")
        await seedBusiness("Beta")

        const files = await readZip(streamTenantExport(a.tenant.id, "Alpha"))
        expect(files["README.txt"]).toContain("Business: Alpha")
        const invoices = JSON.parse(files["tables/invoices.json"])
        expect(invoices.map((i: { invoice_number: string }) => i.invoice_number)).toEqual(["INV-Alpha"])
        expect(JSON.parse(files["tables/invoice_line_items.json"])).toHaveLength(1)
        expect(JSON.parse(files["tables/contacts.json"]).map((c: { display_name: string }) => c.display_name)).toEqual(["Alpha Customer"])
        expect(files["tables/contacts.csv"].split("\n")[0]).toContain("display_name")

        const everything = Object.values(files).join("\n")
        expect(everything).not.toContain("Beta")
        expect(everything).not.toContain("enc:v1:")
        expect(everything).not.toContain("plain-secret")
        expect(everything).not.toContain("plain-imap-pass")
        expect(JSON.parse(files["tables/email_accounts.json"])[0].smtp_password).toBe("[removed for security]")
        expect(everything).toContain("[removed for security]")
    })
})

describe("close workspace → purge", () => {
    it("the owner closes it: access ends, data kept, platform can reopen", async () => {
        const a = await seedBusiness("Gamma")
        actAs(a.user)
        const wrong = await closeWorkspace({ confirmName: "nope" })
        expect(wrong.success).toBe(false)

        const to = await redirectOf(() => closeWorkspace({ confirmName: "gamma", reason: "Testing" }))
        expect(to).toMatch(/workspace is closed/)
        const t = await prisma.tenant.findUniqueOrThrow({ where: { id: a.tenant.id } })
        expect(t.isActive).toBe(false)
        expect((t.settings as { closure: { status: string } }).closure.status).toBe("CLOSED")
        expect(await counts(a.tenant.id)).toMatchObject({ invoices: 1, payments: 1 })

        // Members are turned away with the "closed" message
        actAs(a.user)
        expect(await redirectOf(() => getTenantId())).toMatch(/workspace is closed/)

        // Super admin reopens it by activating
        const { user: admin } = await createTestTenant({ role: "SUPER_ADMIN" })
        actAs(admin)
        expect((await toggleTenantStatus(a.tenant.id, true)).success).toBe(true)
        const reopened = await prisma.tenant.findUniqueOrThrow({ where: { id: a.tenant.id } })
        expect(reopened.isActive).toBe(true)
        expect((reopened.settings as { closure?: unknown }).closure).toBeUndefined()
    })

    it("purge deletes one business's data and logins only, keeps its Genesoft receipts", async () => {
        const a = await seedBusiness("Delta")
        await addUser(a.tenant.id, "USER")
        const b = await seedBusiness("Epsilon")
        const before = await counts(b.tenant.id)
        const aUserIds = (await prisma.user.findMany({ where: { tenantId: a.tenant.id }, select: { id: true } })).map((u: { id: string }) => u.id)
        await prisma.tenant.update({
            where: { id: a.tenant.id },
            data: { settings: { subscription: { invoices: [{ invoiceNumber: "SAAS-INV-2026-0001" }] }, gstin: "x" } },
        })

        actAs(a.user)
        await redirectOf(() => closeWorkspace({ confirmName: "Delta" }))

        const { user: admin } = await createTestTenant({ role: "SUPER_ADMIN" })
        actAs(admin)
        // Inside the 30 days the owner's explicit request is needed
        const early = await purgeTenant(a.tenant.id, "Delta", false)
        expect(early.success).toBe(false)
        const res = await purgeTenant(a.tenant.id, "Delta", true)
        expect(res.success).toBe(true)

        expect(await counts(a.tenant.id)).toEqual({ contacts: 0, invoices: 0, items: 0, payments: 0, ledger: 0, users: 0 })
        const left: { n: number }[] = await prisma.$queryRawUnsafe(`select count(*)::int as n from auth.users where id = any($1::uuid[])`, aUserIds)
        expect(left[0].n).toBe(0)
        expect(await counts(b.tenant.id)).toEqual(before)

        const t = await prisma.tenant.findUniqueOrThrow({ where: { id: a.tenant.id } })
        const settings = t.settings as { subscription: { invoices: unknown[] }; closure: { status: string }; gstin?: string }
        expect(settings.subscription.invoices).toHaveLength(1)
        expect(settings.closure.status).toBe("PURGED")
        expect(settings.gstin).toBeUndefined()
        expect(t.domain).toBeNull()

        // A purged workspace can't be brought back, by Activate or by Edit Profile
        expect((await toggleTenantStatus(a.tenant.id, true)).success).toBe(false)
        expect((await updateTenantDetails(a.tenant.id, { isActive: true })).success).toBe(false)
    })

    it("only workspace admins can close; purge refuses a workspace with a super admin", async () => {
        const a = await seedBusiness("Zeta")
        actAs(await addUser(a.tenant.id, "MANAGER"))
        await expect(closeWorkspace({ confirmName: "Zeta" })).rejects.toThrow()

        const { tenant } = await createTestTenant({ role: "SUPER_ADMIN" })
        await expect(purgeTenantData(tenant.id)).rejects.toThrow(/super admin/)
    })
})

describe("super admin tenant view", () => {
    it("doesn't send stored credentials to the browser", async () => {
        const a = await seedBusiness("Eta")
        const { user: admin } = await createTestTenant({ role: "SUPER_ADMIN" })
        actAs(admin)
        const view = await getTenantById(a.tenant.id)
        const json = JSON.stringify(view)
        expect(json).not.toContain("plain-secret")
        expect(json).not.toContain("enc:v1:")
        expect(json).toContain("27AAAAA0000A1Z5") // ordinary settings stay
    })
})

