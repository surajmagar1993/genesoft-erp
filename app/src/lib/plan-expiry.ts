import { prisma } from "@/lib/prisma"
import { applyPlanChange, RENEWAL_GRACE_DAYS } from "@/lib/plan-change"
import { BILLING_SYSTEM, logTenantAudit } from "@/lib/tenant-audit"
import { reportCaught } from "@/lib/error-reporting"
import type { PlanTier } from "@/lib/saas-subscription-engine"

type Subscription = {
    renewalDate?: string | null
    billingCycle?: string
    compedByPlatform?: boolean
    scheduledDowngrade?: { targetPlan?: PlanTier; effectiveDate?: string } | null
}

/**
 * Daily: plans are paid for one period at a time and don't renew by
 * themselves, so a period that ended without a new payment ends the paid plan.
 *  - a downgrade the business scheduled takes effect on its date;
 *  - a paid plan whose renewal date passed RENEWAL_GRACE_DAYS ago goes to Free.
 * Data is kept; plan limits and modules follow the new plan. Plans given by
 * the platform without a payment are left alone.
 */
export async function expireLapsedPlans(now: Date = new Date()): Promise<{ downgraded: number; expired: number; failed: number }> {
    const tenants: { id: string; plan: string; settings: unknown }[] = await prisma.tenant.findMany({
        where: { isActive: true, plan: { not: "FREE" } },
        select: { id: true, plan: true, settings: true },
    })
    const graceMs = RENEWAL_GRACE_DAYS * 86_400_000
    let downgraded = 0
    let expired = 0
    let failed = 0

    for (const t of tenants) {
        const sub = (((t.settings as Record<string, unknown> | null) || {}).subscription || {}) as Subscription
        try {
            const scheduled = sub.scheduledDowngrade
            if (scheduled?.targetPlan && scheduled.effectiveDate && new Date(scheduled.effectiveDate).getTime() <= now.getTime()) {
                await applyPlanChange(t.id, { targetPlan: scheduled.targetPlan, billingCycle: sub.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY", amountPaid: 0, paymentMethod: "No charge" })
                downgraded++
                continue
            }
            if (sub.compedByPlatform || !sub.renewalDate) continue
            const renewal = new Date(sub.renewalDate).getTime()
            if (!Number.isFinite(renewal) || renewal + graceMs > now.getTime()) continue
            await applyPlanChange(t.id, { targetPlan: "FREE", billingCycle: "MONTHLY", amountPaid: 0, paymentMethod: "No charge" })
            await logTenantAudit(t.id, "TENANT_PLAN_EXPIRED", {
                target: { type: "TENANT_SUBSCRIPTION", id: t.id },
                actor: BILLING_SYSTEM,
                metadata: { fromPlan: t.plan, renewalDate: sub.renewalDate, graceDays: RENEWAL_GRACE_DAYS },
            })
            expired++
        } catch (err) {
            failed++
            await reportCaught(err, "expireLapsedPlans", { tenantId: t.id })
        }
    }
    return { downgraded, expired, failed }
}
