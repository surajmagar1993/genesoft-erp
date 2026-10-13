import { prisma } from "@/lib/prisma"
import { getEffectivePricing, type EffectivePricing } from "@/lib/plan-pricing"
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

async function loadTenant(tenantId: string): Promise<TenantSubscriptionRow> {
    const tenant = await prisma.tenant.findUnique({
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
    const subscription = ((tenant.settings as Record<string, unknown>)?.subscription || {}) as Record<string, unknown>
    const pricing = await getEffectivePricing(tenant.currencyCode)
    const quote = calculateSubscriptionProration({
        currentPlan: (tenant.plan as PlanTier) || "FREE",
        targetPlan,
        currentBillingCycle: subscription.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY",
        targetBillingCycle: billingCycle,
        currencyCode: pricing.currency,
        cycleEndDate: (subscription.renewalDate as string | undefined) || undefined,
        pricing,
    })
    return { quote, pricing, tenant }
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
    }
): Promise<{ alreadyApplied: boolean; invoice?: SaaSPlatformInvoice; quote: ProrationQuote }> {
    const { quote, pricing, tenant } = await quotePlanChange(tenantId, params.targetPlan, params.billingCycle)
    const settings = ((tenant.settings as Record<string, unknown>) || {}) as Record<string, unknown>
    const subscription = (settings.subscription || {}) as Record<string, unknown>
    const invoices: SaaSPlatformInvoice[] = Array.isArray(subscription.invoices) ? subscription.invoices : []

    if (params.paymentRef && invoices.some((inv) => inv.transactionRef === params.paymentRef)) {
        return { alreadyApplied: true, quote }
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

    await prisma.tenant.update({
        where: { id: tenantId },
        data: {
            plan: params.targetPlan as never,
            isTrial: false,
            trialEndsAt: null,
            settings: {
                ...settings,
                subscription: {
                    ...subscription,
                    billingCycle: params.billingCycle,
                    renewalDate: quote.nextBillingDate,
                    lastPlanChange: new Date().toISOString(),
                    scheduledDowngrade: null,
                    invoices: invoice ? [invoice, ...invoices] : invoices,
                },
            } as never,
        },
    })

    try {
        await prisma.adminAuditLog.create({
            data: {
                adminId: params.actor?.id ?? "system",
                adminEmail: params.actor?.email ?? "billing@system",
                action: quote.isUpgrade ? "TENANT_PLAN_UPGRADE" : "TENANT_PLAN_DOWNGRADE",
                targetId: tenantId,
                targetType: "TENANT_SUBSCRIPTION",
                metadata: {
                    fromPlan: tenant.plan,
                    toPlan: params.targetPlan,
                    billingCycle: params.billingCycle,
                    amountPaid: params.amountPaid ?? null,
                    paymentRef: params.paymentRef ?? null,
                    invoiceNumber: invoice?.invoiceNumber ?? null,
                },
            },
        })
    } catch (err) {
        console.error("applyPlanChange: failed to write audit log", err)
    }

    return { alreadyApplied: false, invoice, quote }
}
