import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { applyPlanChange } from "@/lib/plan-change"
import { inviteTeamMember } from "@/app/actions/settings/team"
import { saveTenantPaymentGateways } from "@/app/actions/finance/gateways"
import { getClientActivity, getMyActivityLog } from "@/app/actions/activity"
import { updateTenantSettings } from "@/app/actions/settings/tenant"
import { purgeTenantData } from "@/lib/tenant-data"
import { logTenantAudit } from "@/lib/tenant-audit"
import { actAs, createTestTenant } from "./helpers"

describe("client activity log (separate from the Super Admin log)", () => {
    it("a business's plan change goes to its own log, not the Super Admin's", async () => {
        const { tenant, user } = await createTestTenant({ plan: "FREE" })
        actAs(user)
        const before = await prisma.adminAuditLog.count()
        await applyPlanChange(tenant.id, { targetPlan: "BASIC", billingCycle: "MONTHLY", paymentRef: "pay_test_1", amountPaid: 999, actor: { id: user.id, email: user.email } })
        expect(await prisma.adminAuditLog.count()).toBe(before)
        const rows = await prisma.tenantAuditLog.findMany({ where: { tenantId: tenant.id } })
        expect(rows).toMatchObject([{ action: "TENANT_PLAN_UPGRADE", actorEmail: user.email, metadata: { fromPlan: "FREE", toPlan: "BASIC" } }])
    })

    it("team invites and credential changes are recorded without secrets; each business sees only its own log", async () => {
        const a = await createTestTenant()
        const b = await createTestTenant()
        actAs(a.user)
        await inviteTeamMember({ email: "new.person@example.test", fullName: "New Person", role: "MEMBER" })
        await saveTenantPaymentGateways({ stripeSecretKey: "sk_test_SUPERSECRET123" } as never)
        actAs(b.user)
        await inviteTeamMember({ email: "other@example.test", fullName: "Other", role: "MEMBER" })

        actAs(a.user)
        const mine = (await getMyActivityLog()).rows
        expect(mine.map((r) => r.action).sort()).toEqual(["PAYMENT_GATEWAY_UPDATED", "TEAM_INVITE_SENT"])
        expect(mine.every((r) => r.tenantId === a.tenant.id)).toBe(true)
        expect(JSON.stringify(mine)).not.toContain("SUPERSECRET")
        expect(mine.find((r) => r.action === "PAYMENT_GATEWAY_UPDATED")?.metadata).toEqual({ fields: ["stripeSecretKey"] })
    })

    it("only the Super Admin can read every business's log", async () => {
        const { user } = await createTestTenant()
        actAs(user)
        await expect(getClientActivity()).rejects.toThrow()
    })

    it("the Super Admin sees each business's entries with its name", async () => {
        const biz = await createTestTenant({ name: "Audit Test Co" })
        actAs(biz.user)
        await inviteTeamMember({ email: "x.person@example.test", fullName: "X", role: "MEMBER" })
        const admin = await createTestTenant({ role: "SUPER_ADMIN" })
        actAs(admin.user)
        const rows = await getClientActivity({ tenantId: biz.tenant.id })
        expect(rows).toMatchObject([{ action: "TEAM_INVITE_SENT", tenantName: "Audit Test Co" }])
    })

    it("a Super Admin's plan change is in both logs; paying for the same plan again is a renewal", async () => {
        const { tenant } = await createTestTenant({ plan: "FREE" })
        const admin = await createTestTenant({ role: "SUPER_ADMIN" })
        actAs(admin.user)
        await applyPlanChange(tenant.id, { targetPlan: "PRO", billingCycle: "MONTHLY", actor: { id: admin.user.id, email: admin.user.email }, actorIsSuperAdmin: true })
        expect(await prisma.adminAuditLog.count({ where: { targetId: tenant.id, action: "TENANT_PLAN_UPGRADE" } })).toBe(1)
        expect(await prisma.tenantAuditLog.findFirst({ where: { tenantId: tenant.id } })).toMatchObject({ action: "TENANT_PLAN_UPGRADE", metadata: { byPlatformAdmin: true } })
        await applyPlanChange(tenant.id, { targetPlan: "PRO", billingCycle: "ANNUAL", paymentRef: "pay_x", amountPaid: 1 })
        expect((await prisma.tenantAuditLog.findFirst({ where: { tenantId: tenant.id }, orderBy: { createdAt: "desc" } }))?.action).toBe("TENANT_PLAN_RENEWED")
    })

    it("settings saves log only what changed (and nothing when nothing did)", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const current = await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })
        await updateTenantSettings({ name: current.name, phone: "+91 99999 00000" } as never)
        await updateTenantSettings({ name: current.name, phone: "+91 99999 00000" } as never)
        const rows = await prisma.tenantAuditLog.findMany({ where: { tenantId: tenant.id, action: "SETTINGS_UPDATED" } })
        expect(rows).toHaveLength(1)
        expect(rows[0].metadata).toEqual({ fields: ["phone"] })
    })

    it("an unchanged masked secret isn't logged as a credential change", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        await saveTenantPaymentGateways({ stripeSecretKey: "sk_test_ONE" } as never)
        await saveTenantPaymentGateways({ stripeSecretKey: "••••ONE", stripePublishableKey: "pk_test_NEW" } as never)
        const rows = await prisma.tenantAuditLog.findMany({ where: { tenantId: tenant.id, action: "PAYMENT_GATEWAY_UPDATED" }, orderBy: { createdAt: "asc" } })
        expect(rows.map((r) => r.metadata)).toEqual([{ fields: ["stripeSecretKey"] }, { fields: ["stripePublishableKey"] }])
    })

    it("purging a closed workspace keeps its activity log", async () => {
        const { tenant } = await createTestTenant()
        await logTenantAudit(tenant.id, "TENANT_CLOSED_BY_OWNER", { actor: { id: null, email: "owner@example.test" } })
        await purgeTenantData(tenant.id)
        expect(await prisma.tenantAuditLog.count({ where: { tenantId: tenant.id } })).toBe(1)
    })

    it("a malformed business id returns nothing, not every business's log", async () => {
        const admin = await createTestTenant({ role: "SUPER_ADMIN" })
        actAs(admin.user)
        expect(await getClientActivity({ tenantId: "not-an-id" })).toEqual([])
    })
})
