import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { applyPlanChange, quotePlanChange, RENEWAL_GRACE_DAYS } from "@/lib/plan-change"
import { executePlanChange } from "@/app/actions/saas/subscription"
import { expireLapsedPlans } from "@/lib/plan-expiry"
import { updateTeam, readTeam } from "@/lib/team-settings"
import { uniformAccess } from "@/lib/access"
import { actAs, createTestTenant } from "./helpers"

const subOf = async (tenantId: string) =>
    ((((await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } })).settings as Record<string, unknown>) || {}).subscription || {}) as Record<string, unknown>

describe("plan billing rules", () => {
    it("a downgrade to a yearly cycle followed by an upgrade is not free", async () => {
        const { tenant, user } = await createTestTenant({ plan: "FREE" })
        actAs(user)
        // The business really pays for one month of PRO
        await applyPlanChange(tenant.id, { targetPlan: "PRO", billingCycle: "MONTHLY", paymentRef: "pay_real_1", amountPaid: 999 })
        const paidRenewal = (await subOf(tenant.id)).renewalDate

        // Asking for an immediate downgrade "on a yearly cycle": it waits for the paid period to end,
        // and nothing about the period changes
        const down = await executePlanChange({ targetPlan: "BASIC", billingCycle: "ANNUAL", immediate: true })
        expect(down.success).toBe(true)
        const afterDown = await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })
        expect(afterDown.plan).toBe("PRO")
        expect(await subOf(tenant.id)).toMatchObject({ billingCycle: "MONTHLY", renewalDate: paidRenewal, scheduledDowngrade: { targetPlan: "BASIC", effectiveDate: paidRenewal } })

        // The upgrade still needs a payment; the only credit is from the month actually paid
        const { quote } = await quotePlanChange(tenant.id, "ENTERPRISE", "MONTHLY")
        expect(quote.unusedCredit).toBeLessThanOrEqual(999)
        expect(quote.netPayableToday).toBeGreaterThan(0)
        expect((await executePlanChange({ targetPlan: "ENTERPRISE", billingCycle: "MONTHLY" })).error).toMatch(/needs a payment/)
    })

    it("a period nobody paid for gives no credit", async () => {
        const { tenant, user } = await createTestTenant({ plan: "FREE" })
        const admin = await createTestTenant({ role: "SUPER_ADMIN" })
        // The platform gives the plan without a payment
        await applyPlanChange(tenant.id, { targetPlan: "BASIC", billingCycle: "ANNUAL", actor: { id: admin.user.id, email: admin.user.email }, actorIsSuperAdmin: true })
        expect(await subOf(tenant.id)).toMatchObject({ paidForCycle: 0, compedByPlatform: true })
        actAs(user)
        const { quote, pricing } = await quotePlanChange(tenant.id, "PRO", "MONTHLY")
        expect(quote.unusedCredit).toBe(0)
        expect(quote.netPayableToday).toBe(pricing.monthly.PRO)
    })

    it("the same payment applied twice at the same moment changes the plan once", async () => {
        const { tenant } = await createTestTenant({ plan: "FREE" })
        const change = { targetPlan: "PRO" as const, billingCycle: "MONTHLY" as const, paymentRef: "pay_twice", amountPaid: 999 }
        const results = await Promise.all([applyPlanChange(tenant.id, change), applyPlanChange(tenant.id, change)])
        expect(results.filter((r) => r.alreadyApplied)).toHaveLength(1)
        expect(((await subOf(tenant.id)).invoices as unknown[]).length).toBe(1)
    })

    it("a plan change keeps a team change saved at the same moment", async () => {
        const { tenant, user } = await createTestTenant({ plan: "FREE" })
        await Promise.all([
            applyPlanChange(tenant.id, { targetPlan: "BASIC", billingCycle: "MONTHLY", paymentRef: "pay_team", amountPaid: 499 }),
            updateTeam(tenant.id, (t) => ({ ...t, access: { ...t.access, [user.id]: uniformAccess("VIEW") } })),
        ])
        const after = await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })
        expect(after.plan).toBe("BASIC")
        expect(readTeam(after.settings).access[user.id]).toBeDefined()
    })

    it("an unpaid renewal ends the paid plan after the grace period; a scheduled downgrade applies on its date", async () => {
        const lapsed = await createTestTenant({ plan: "FREE" })
        const inGrace = await createTestTenant({ plan: "FREE" })
        const comped = await createTestTenant({ plan: "FREE" })
        const scheduled = await createTestTenant({ plan: "FREE" })
        const admin = await createTestTenant({ role: "SUPER_ADMIN" })
        for (const t of [lapsed, inGrace, scheduled]) await applyPlanChange(t.tenant.id, { targetPlan: "PRO", billingCycle: "MONTHLY", paymentRef: `pay_${t.tenant.id}`, amountPaid: 999 })
        await applyPlanChange(comped.tenant.id, { targetPlan: "PRO", billingCycle: "MONTHLY", actor: { id: admin.user.id, email: admin.user.email }, actorIsSuperAdmin: true })
        actAs(scheduled.user)
        await executePlanChange({ targetPlan: "BASIC", billingCycle: "MONTHLY", immediate: false })

        const renewal = new Date(String((await subOf(lapsed.tenant.id)).renewalDate)).getTime()
        const day = 86_400_000

        // One day after the renewal date: still inside the grace period, but the scheduled downgrade is due
        await expireLapsedPlans(new Date(renewal + day))
        const planOf = async (id: string) => (await prisma.tenant.findUniqueOrThrow({ where: { id } })).plan
        expect(await planOf(inGrace.tenant.id)).toBe("PRO")
        expect(await planOf(scheduled.tenant.id)).toBe("BASIC")

        // After the grace period: unpaid plans go to Free; the platform's gift stays
        const result = await expireLapsedPlans(new Date(renewal + (RENEWAL_GRACE_DAYS + 1) * day))
        expect(result.failed).toBe(0)
        expect(await planOf(lapsed.tenant.id)).toBe("FREE")
        expect(await planOf(comped.tenant.id)).toBe("PRO")
        expect(await prisma.tenantAuditLog.count({ where: { tenantId: lapsed.tenant.id, action: "TENANT_PLAN_EXPIRED" } })).toBe(1)
        // Its data and receipts are kept
        expect(((await subOf(lapsed.tenant.id)).invoices as unknown[]).length).toBe(1)
    })
})
