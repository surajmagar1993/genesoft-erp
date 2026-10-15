import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { createContact, importContacts } from "@/app/actions/crm/contacts"
import { createVendor } from "@/app/actions/purchase"
import { createWarehouse } from "@/app/actions/inventory"
import { inviteTeamMember, setTeamMemberActive } from "@/app/actions/settings/team"
import { createRentalAsset } from "@/app/actions/rental"
import { getPlanSettings, getPricingPlans, savePlanSettings, savePricingRegion } from "@/app/actions/saas/admin"
import { getMyAccess, getTenantId } from "@/lib/get-tenant-id"
import { createEmployee } from "@/app/actions/hr"
import { PLAN_CONFIG_ACTION, defaultPlanConfig } from "@/lib/plan-config"
import { createPlanCheckout } from "@/app/actions/saas/razorpay"
import { getEffectivePricing } from "@/lib/plan-pricing"
import { assertWithinLimit, effectivePlan } from "@/lib/plan-limits"
import { uniformAccess } from "@/lib/access"
import { actAs, addUser, createTestTenant } from "./helpers"

const contact = (name: string) => ({ display_name: name, type: "INDIVIDUAL" as const, email: null }) as never

describe("plan limits", () => {
    it("an active trial counts as Pro; after it the workspace's own plan applies", () => {
        const now = new Date()
        expect(effectivePlan({ plan: "FREE", isTrial: true, trialEndsAt: new Date(now.getTime() + 86400000) }, now)).toMatchObject({ tier: "PRO", onTrial: true })
        expect(effectivePlan({ plan: "FREE", isTrial: true, trialEndsAt: new Date(now.getTime() - 1) }, now)).toMatchObject({ tier: "FREE", onTrial: false })
        expect(effectivePlan({ plan: "ENTERPRISE", isTrial: true, trialEndsAt: new Date(now.getTime() + 86400000) }, now).tier).toBe("ENTERPRISE")
    })

    it("Free: 25 contacts, then the next one (form, supplier or import) is refused with an upgrade message", async () => {
        const { tenant, user } = await createTestTenant({ plan: "FREE" })
        actAs(user)
        await prisma.contact.createMany({ data: Array.from({ length: 24 }, (_, i) => ({ tenantId: tenant.id, displayName: `C${i}` })) })

        expect((await createContact(contact("Number 25"))).error).toBeNull()
        const over = await createContact(contact("Number 26"))
        expect(over.error).toMatch(/Free plan allows up to 25 contacts.*Upgrade/)

        const vendor = await createVendor({ displayName: "Supplier" })
        expect(vendor).toMatchObject({ success: false, error: expect.stringMatching(/25 contacts/) })
        expect((await importContacts([{ display_name: "Imported" }])).error).toMatch(/25 contacts/)
        expect(await prisma.contact.count({ where: { tenantId: tenant.id } })).toBe(25)
    })

    it("a trial gets Pro limits: unlimited contacts, 10 warehouses", async () => {
        const { tenant, user } = await createTestTenant({ plan: "FREE", trialDays: 5 })
        actAs(user)
        await prisma.contact.createMany({ data: Array.from({ length: 30 }, (_, i) => ({ tenantId: tenant.id, displayName: `C${i}` })) })
        expect((await createContact(contact("Number 31"))).error).toBeNull()
        await expect(assertWithinLimit(tenant.id, "warehouses", { adding: 10 })).resolves.toBeUndefined()
        await expect(assertWithinLimit(tenant.id, "warehouses", { adding: 11 })).rejects.toThrow(/trial allows up to 10 warehouses/)
    })

    it("Free: 1 warehouse; the second is refused with a readable error", async () => {
        const { user } = await createTestTenant({ plan: "FREE" })
        actAs(user)
        expect((await createWarehouse({ name: "Main", code: "MAIN" })).success).toBe(true)
        expect(await createWarehouse({ name: "Second", code: "SEC" })).toMatchObject({ success: false, error: expect.stringMatching(/1 warehouse\b/) })
    })

    it("Basic: 5 seats, counting pending invites; reactivating someone needs a free seat", async () => {
        const { tenant, user } = await createTestTenant({ plan: "BASIC" })
        actAs(user)
        const staff = await Promise.all([addUser(tenant.id, "USER"), addUser(tenant.id, "USER"), addUser(tenant.id, "USER")])
        const access = uniformAccess("VIEW")
        expect((await inviteTeamMember({ email: "five@example.test", fullName: "Five", role: "MEMBER", access })).success).toBe(true)
        // Re-inviting the same person replaces the invite, so it doesn't need another seat
        expect((await inviteTeamMember({ email: "five@example.test", fullName: "Five", role: "MEMBER", access })).success).toBe(true)
        const sixth = await inviteTeamMember({ email: "six@example.test", fullName: "Six", role: "MEMBER", access })
        expect(sixth).toMatchObject({ success: false, error: expect.stringMatching(/5 users \(pending invites count too\)/) })

        expect((await setTeamMemberActive(staff[0].id, false)).success).toBe(true)
        expect((await inviteTeamMember({ email: "six@example.test", fullName: "Six", role: "MEMBER", access })).success).toBe(true)
        expect(await setTeamMemberActive(staff[0].id, true)).toMatchObject({ success: false, error: expect.stringMatching(/5 users/) })
    })

    it("Rentals need Enterprise", async () => {
        const { user } = await createTestTenant({ plan: "PRO" })
        actAs(user)
        await expect(createRentalAsset({ name: "Drill", category: "Tools" } as never)).rejects.toThrow(/Enterprise/)
    })
})

describe("Admin → Pricing & Plans", () => {
    it("lists every region (Australia with default prices), saves a region and hides a plan", async () => {
        const { user } = await createTestTenant({ role: "SUPER_ADMIN" })
        actAs(user)
        const regions = await getPricingPlans()
        const au = regions.find((r) => r.code === "AU")!
        expect(au).toMatchObject({ currency: "AUD", gateway: "STRIPE" })
        expect(au.plans.every((p) => !p.saved)).toBe(true)

        const res = await savePricingRegion("AU", [
            { tier: "BASIC", amount: 25, isActive: true },
            { tier: "PRO", amount: 69, isActive: true },
            { tier: "ENTERPRISE", amount: 199, isActive: false },
        ])
        expect(res).toMatchObject({ success: true, data: { changed: 3 } })
        const rows = await prisma.pricingPlan.findMany({ where: { regionCode: "AU" } })
        expect(rows).toHaveLength(3)
        expect(rows.every((r) => r.currency === "AUD" && r.gateway === "STRIPE")).toBe(true)

        const pricing = await getEffectivePricing("AUD")
        expect(pricing.monthly.BASIC).toBe(25)
        expect(pricing.hidden).toEqual(["ENTERPRISE"])

        expect(await savePricingRegion("AU", [{ tier: "BASIC", amount: 0, isActive: true }])).toMatchObject({ success: false, error: expect.stringMatching(/above zero/) })
        expect(await savePricingRegion("XX", [])).toMatchObject({ success: false, error: "Unknown region" })
    })

    it("a hidden plan can't be bought", async () => {
        const { user } = await createTestTenant({ plan: "FREE" })
        await prisma.pricingPlan.upsert({
            where: { regionCode_tier: { regionCode: "IN", tier: "BASIC" } },
            update: { isActive: false },
            create: { regionCode: "IN", tier: "BASIC", amount: 499, currency: "INR", gateway: "RAZORPAY", isActive: false },
        })
        actAs(user)
        await expect(createPlanCheckout("BASIC", "MONTHLY")).rejects.toThrow(/isn't available/)
        await prisma.pricingPlan.deleteMany({ where: { regionCode: "IN", tier: "BASIC" } })
    })
})

describe("editable plan settings (Admin → Pricing & Plans → Limits & modules)", () => {
    it("the super admin changes a limit and a module; every business follows on its next request", async () => {
        const { tenant, user } = await createTestTenant({ plan: "BASIC" })
        const { user: admin } = await createTestTenant({ role: "SUPER_ADMIN" })

        actAs(admin)
        const config = await getPlanSettings()
        expect(config).toEqual(defaultPlanConfig())
        config.BASIC.limits.contacts = 2
        config.BASIC.modules.hr = false
        config.BASIC.modules.pos = true
        config.BASIC.features = ["Up to 2 contacts", "Point of Sale"]
        expect((await savePlanSettings(config)).success).toBe(true)
        expect(await prisma.adminAuditLog.count({ where: { action: PLAN_CONFIG_ACTION } })).toBe(1)

        actAs(user)
        await prisma.contact.createMany({ data: [{ tenantId: tenant.id, displayName: "A" }, { tenantId: tenant.id, displayName: "B" }] })
        expect((await createContact(contact("C"))).error).toMatch(/Basic plan allows up to 2 contacts/)

        // HR is closed even to the workspace admin, with an upgrade message naming the cheapest plan that has it
        const mine = await getMyAccess()
        expect(mine.access.hr).toBe("NONE")
        expect(mine.planModules).toMatchObject({ hr: false, pos: true, rentals: false })
        await expect(getTenantId("hr")).rejects.toThrow(/HR.* is on the Free plan\. Upgrade/)
        await expect(createEmployee({} as never)).rejects.toThrow(/Upgrade/)

        // Back to the defaults
        actAs(admin)
        expect((await savePlanSettings(defaultPlanConfig())).success).toBe(true)
        actAs(user)
        expect((await getMyAccess()).access.hr).toBe("FULL")
        await prisma.adminAuditLog.deleteMany({ where: { action: PLAN_CONFIG_ACTION } })
    })

    it("rejects bad input: negative limits are ignored, a plan needs a feature line, only the super admin can save", async () => {
        const { user: admin } = await createTestTenant({ role: "SUPER_ADMIN" })
        actAs(admin)
        const config = defaultPlanConfig()
        config.FREE.limits.users = -3 as never
        config.PRO.features = []
        expect(await savePlanSettings(config)).toMatchObject({ success: false, error: expect.stringMatching(/Pro plan/) })
        config.PRO.features = ["Everything"]
        const saved = await savePlanSettings(config)
        expect(saved.success && saved.data.FREE.limits.users).toBe(1)

        const { user } = await createTestTenant()
        actAs(user)
        expect((await savePlanSettings(defaultPlanConfig())).success).toBe(false)
        await prisma.adminAuditLog.deleteMany({ where: { action: PLAN_CONFIG_ACTION } })
    })
})
