import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { lockTenantSettings } from "@/lib/tenant-settings-lock"
import { getEffectivePricing, type EffectivePricing } from "@/lib/plan-pricing"
import { BILLING_SYSTEM, logTenantAudit } from "@/lib/tenant-audit"
import {
    calculateSubscriptionProration,
    compileSaaSSubscriptionInvoice,
    type BillingCycle,
    type PlanTier,
    type ProrationQuote,
    type SaaSPlatformInvoice,
} from "@/lib/saas-subscription-engine"

type TenantSubscriptionRow = {
    id: string
    name: string
    plan: string
    currencyCode: string | null
    settings: unknown
}

/** Days after the renewal date before an unpaid plan goes back to Free */
export const RENEWAL_GRACE_DAYS = 3

/**
 * What the business really paid for the period it is in: the credit an
 * upgrade may use. A period nobody paid for (trial, free change, a plan set
 * by the platform) is worth nothing, whatever cycle is recorded.
 */
export function paidForCurrentCycle(subscription: Record<string, unknown>, currentPlan: string): number {
    if (!subscription.renewalDate) return 0
    if (typeof subscription.paidForCycle === "number") return Math.max(0, subscription.paidForCycle)
    // Subscriptions saved before paidForCycle existed: the newest receipt, if a gateway took the money
    const latest = (Array.isArray(subscription.invoices) ? subscription.invoices : [])[0] as Partial<SaaSPlatformInvoice> | undefined
    const ref = String(latest?.transactionRef || "")
    const paidAtGateway = /^(pay_|order_)/.test(ref)
    return latest && latest.tier === currentPlan && latest.status === "PAID" && paidAtGateway ? Math.max(0, Number(latest.totalAmount) || 0) : 0
}

async function loadTenant(tenantId: string, db: Prisma.TransactionClient | typeof prisma = prisma): Promise<TenantSubscriptionRow> {
    const tenant = await db.tenant.findUnique({
        where: { id: tenantId },
        select: { id: true, name: true, plan: true, currencyCode: true, settings: true },
    })
    if (!tenant) throw new Error("Tenant not found")
    return tenant
}

/**
 * Prices a plan change for a tenant with the live prices (Admin → Pricing):
 * prorated against the current plan until its renewal date.
 */
export async function quotePlanChange(
    tenantId: string,
    targetPlan: PlanTier,
    billingCycle: BillingCycle
): Promise<{ quote: ProrationQuote; pricing: EffectivePricing; tenant: TenantSubscriptionRow }> {
    const tenant = await loadTenant(tenantId)
    const pricing = await getEffectivePricing(tenant.currencyCode)
    return { quote: quoteFor(tenant, pricing, targetPlan, billingCycle), pricing, tenant }
}

function quoteFor(tenant: TenantSubscriptionRow, pricing: EffectivePricing, targetPlan: PlanTier, billingCycle: BillingCycle): ProrationQuote {
    const subscription = ((tenant.settings as Record<string, unknown>)?.subscription || {}) as Record<string, unknown>
    return calculateSubscriptionProration({
        currentPlan: (tenant.plan as PlanTier) || "FREE",
        targetPlan,
        currentBillingCycle: subscription.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
        targetBillingCycle: billingCycle,
        currencyCode: pricing.currency,
        cycleEndDate: (subscription.renewalDate as string | undefined) || undefined,
        // Credit comes only from money actually paid for this period
        currentPaidAmount: paidForCurrentCycle(subscription, tenant.plan),
        pricing,
    })
}

/**
 * Switches the tenant to the plan now: records the cycle and renewal date,
 * clears a scheduled downgrade, ends the trial and adds a receipt when the
 * plan is paid. With a paymentRef it is idempotent, so the checkout
 * verification and the gateway webhook can both call it for one payment.
 */
export async function applyPlanChange(
    tenantId: string,
    params: {
        targetPlan: PlanTier
        billingCycle: BillingCycle
        paymentRef?: string
        amountPaid?: number
        paymentMethod?: string
        actor?: { id: string; email: string }
        /** A Super Admin's manual change: also recorded in the Super Admin log */
        actorIsSuperAdmin?: boolean
        /**
         * A change nobody paid for (a business's own downgrade): the period and
         * renewal date stay as they are, so it can't be used to start a "new" period for free.
         */
        keepCycle?: boolean
    }
): Promise<{ alreadyApplied: boolean; invoice?: SaaSPlatformInvoice; quote: ProrationQuote }> {
    // One transaction with the settings row locked: the checkout verification and the gateway
    // webhook arriving together can't both apply the payment, and a team or credential save
    // made at the same moment isn't overwritten.
    // Prices are read before the transaction (they don't depend on the locked row)
    const pricing = await getEffectivePricing((await loadTenant(tenantId)).currencyCode)
    const outcome = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const settings = await lockTenantSettings(tx, tenantId)
        const tenant = { ...(await loadTenant(tenantId, tx)), settings }
        const quote = quoteFor(tenant, pricing, params.targetPlan, params.billingCycle)
        const subscription = (settings.subscription || {}) as Record<string, unknown>
        const invoices: SaaSPlatformInvoice[] = Array.isArray(subscription.invoices) ? subscription.invoices : []

        if (params.paymentRef && invoices.some((inv) => inv.transactionRef === params.paymentRef)) {
            return { alreadyApplied: true as const, quote, tenant, invoice: undefined }
        }

        const invoice =
            params.targetPlan !== "FREE"
                ? compileSaaSSubscriptionInvoice({
                      tenantId: tenant.id,
                      tenantName: tenant.name,
                      plan: params.targetPlan,
                      billingCycle: params.billingCycle,
                      currency: pricing.currency,
                      paymentMethod: params.paymentMethod,
                      transactionRef: params.paymentRef,
                      pricing,
                      amountPaid: params.amountPaid,
                  })
                : undefined

        const paidNow = params.paymentRef && (params.amountPaid ?? 0) > 0 ? Number(params.amountPaid) : 0
        const keepCycle = Boolean(params.keepCycle) && Boolean(subscription.renewalDate)
        // The value of the new period: what was paid now plus the credit it used up (never more than the plan's price)
        const paidForCycle = keepCycle
            ? 0
            : paidNow > 0
              ? Math.min(quote.targetPlanGross, Math.round((paidNow + (quote.isUpgrade ? quote.unusedCredit : 0)) * 100) / 100)
              : 0

        await tx.tenant.update({
            where: { id: tenantId },
            data: {
                plan: params.targetPlan as never,
                isTrial: false,
                trialEndsAt: null,
                settings: {
                    ...settings,
                    subscription: {
                        ...subscription,
                        billingCycle: keepCycle ? (subscription.billingCycle ?? params.billingCycle) : params.billingCycle,
                        renewalDate: params.targetPlan === "FREE" ? null : keepCycle ? subscription.renewalDate : quote.nextBillingDate,
                        paidForCycle,
                        // A plan the platform gave without a payment stays until the platform changes it
                        compedByPlatform: Boolean(params.actorIsSuperAdmin) && paidNow === 0 && params.targetPlan !== "FREE",
                        lastPlanChange: new Date().toISOString(),
                        scheduledDowngrade: null,
                        invoices: invoice ? [invoice, ...invoices] : invoices,
                    },
                } as never,
            },
        })
        return { alreadyApplied: false as const, quote, tenant, invoice }
    })
    if (outcome.alreadyApplied) return { alreadyApplied: true, quote: outcome.quote }
    const { quote, tenant, invoice } = outcome

    // Same plan again (renewal or a switch between monthly and yearly) isn't a downgrade
    const action = quote.isUpgrade ? "TENANT_PLAN_UPGRADE" : tenant.plan === params.targetPlan ? "TENANT_PLAN_RENEWED" : "TENANT_PLAN_DOWNGRADE"
    const metadata = {
        fromPlan: tenant.plan,
        toPlan: params.targetPlan,
        billingCycle: params.billingCycle,
        amountPaid: params.amountPaid ?? null,
        paymentRef: params.paymentRef ?? null,
        invoiceNumber: invoice?.invoiceNumber ?? null,
        ...(params.actorIsSuperAdmin ? { byPlatformAdmin: true } : {}),
    }
    // The business's activity log: who changed the plan, or the payment gateway
    await logTenantAudit(tenantId, action, {
        target: { type: "TENANT_SUBSCRIPTION", id: tenantId },
        actor: params.actor ? { id: params.actor.id, email: params.actor.email ?? null } : BILLING_SYSTEM,
        metadata,
    })
    // A Super Admin's manual change (possibly free) also goes to the Super Admin log
    if (params.actorIsSuperAdmin && params.actor) {
        await prisma.adminAuditLog
            .create({ data: { adminId: params.actor.id, adminEmail: params.actor.email, action, targetId: tenantId, targetType: "TENANT_SUBSCRIPTION", metadata } })
            .catch((err: unknown) => console.error("applyPlanChange: Super Admin audit failed", err))
    }

    return { alreadyApplied: false, invoice, quote }
}
