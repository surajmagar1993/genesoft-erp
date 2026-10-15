"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { getTenantId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"
import { quotePlanChange, applyPlanChange } from "@/lib/plan-change"
import { getEffectivePricing, type EffectivePricing } from "@/lib/plan-pricing"
import {
    PlanTier,
    BillingCycle,
    compileSaaSSubscriptionInvoice,
    SaaSPlatformInvoice,
    ProrationQuote,
} from "@/lib/saas-subscription-engine"

/**
 * Resolves the signed-in caller. Super Admins may act on targetTenantId;
 * everyone else is confined to their own tenant.
 */
async function getCallerContext(targetTenantId?: string) {
    const user = await getCurrentUser()
    if (!user) throw new Error("Authentication required")

    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, tenantId: true, isActive: true } })
    if (profile?.isActive === false) throw new Error("Your account has been deactivated")

    const role: string | undefined = profile?.role
    const isSuperAdmin = role === "SUPER_ADMIN"
    const effectiveTenantId = targetTenantId && isSuperAdmin ? targetTenantId : profile?.tenantId

    return {
        userId: user.id,
        email: user.email || "unknown",
        isSuperAdmin,
        isTenantAdmin: isSuperAdmin || role === "ADMIN",
        tenantId: effectiveTenantId as string | undefined,
    }
}

async function logAudit(action: string, targetId: string, metadata: any = {}) {
    try {
        const caller = await getCallerContext()
        await prisma.adminAuditLog.create({
            data: {
                adminId: caller.userId,
                adminEmail: caller.email,
                action,
                targetId,
                targetType: "TENANT_SUBSCRIPTION",
                metadata,
            },
        })
    } catch (e) {
        console.error("Failed to log subscription audit:", e)
    }
}

export interface TenantSubscriptionDetails {
    tenantId: string
    tenantName: string
    currentPlan: PlanTier
    isTrial: boolean
    trialDaysRemaining: number
    trialEndsAt?: string | null
    billingCycle: BillingCycle
    currency: string
    renewalDate: string
    scheduledDowngrade?: {
        targetPlan: PlanTier
        effectiveDate: string
    } | null
    invoices: SaaSPlatformInvoice[]
}

/**
 * Fetch tenant subscription details including active tier, cycle, renewal date, and billing history.
 */
export async function getTenantSubscriptionDetails(targetTenantId?: string): Promise<TenantSubscriptionDetails> {
    const caller = await getCallerContext(targetTenantId)
    const tenantId = caller.tenantId

    if (!tenantId) throw new Error("Tenant ID required")

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: {
            id: true,
            name: true,
            plan: true,
            isTrial: true,
            trialEndsAt: true,
            currencyCode: true,
            settings: true,
            createdAt: true,
        },
    })

    if (!tenant) throw new Error("Tenant record not found")

    const settings = (tenant.settings as any) || {}
    const subMeta = settings.subscription || {}

    // Calculate trial days remaining
    let trialDays = 0
    if (tenant.isTrial && tenant.trialEndsAt) {
        const diff = new Date(tenant.trialEndsAt).getTime() - Date.now()
        trialDays = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
    }

    const billingCycle: BillingCycle = subMeta.billingCycle === "ANNUAL" ? "ANNUAL" : "MONTHLY"
    const renewalDate = subMeta.renewalDate || (
        tenant.trialEndsAt
            ? tenant.trialEndsAt.toISOString()
            : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    )

    const invoices: SaaSPlatformInvoice[] = Array.isArray(subMeta.invoices) ? subMeta.invoices : []

    return {
        tenantId: tenant.id,
        tenantName: tenant.name,
        currentPlan: (tenant.plan as PlanTier) || "FREE",
        isTrial: tenant.isTrial,
        trialDaysRemaining: trialDays,
        trialEndsAt: tenant.trialEndsAt ? tenant.trialEndsAt.toISOString() : null,
        billingCycle,
        currency: tenant.currencyCode || "INR",
        renewalDate,
        scheduledDowngrade: subMeta.scheduledDowngrade || null,
        invoices,
    }
}

/**
 * The caller's live plan prices (Admin → Pricing, falling back to the catalog)
 * and which gateway takes payment for their currency.
 */
export async function getBillingPricing(targetTenantId?: string): Promise<EffectivePricing> {
    const details = await getTenantSubscriptionDetails(targetTenantId)
    return getEffectivePricing(details.currency)
}

/**
 * Real-time proration quote for moving from current plan to target plan.
 */
export async function calculatePlanChangeQuote(params: {
    targetPlan: PlanTier
    billingCycle: BillingCycle
    targetTenantId?: string
}): Promise<ProrationQuote> {
    const { targetPlan, billingCycle, targetTenantId } = params
    const details = await getTenantSubscriptionDetails(targetTenantId)
    const { quote } = await quotePlanChange(details.tenantId, targetPlan, billingCycle)
    return quote
}

/**
 * Execute a plan upgrade or downgrade.
 */
export async function executePlanChange(params: {
    targetPlan: PlanTier
    billingCycle: BillingCycle
    immediate?: boolean
    paymentReference?: string
    targetTenantId?: string
}): Promise<{
    success: boolean
    message: string
    invoice?: SaaSPlatformInvoice
    error?: string
}> {
    const {
        targetPlan,
        billingCycle,
        immediate = true,
        paymentReference,
        targetTenantId,
    } = params

    const caller = await getCallerContext(targetTenantId)
    const tenantId = caller.tenantId

    if (!tenantId) {
        return { success: false, message: "", error: "Tenant authorization missing" }
    }
    if (!caller.isTenantAdmin) {
        return { success: false, message: "", error: "Only workspace admins can change the subscription plan" }
    }

    try {
        const { quote, tenant } = await quotePlanChange(tenantId, targetPlan, billingCycle)
        const currentPlan = (tenant.plan as PlanTier) || "FREE"
        const settings = (tenant.settings as any) || {}
        const currentSub = settings.subscription || {}

        // Anything that costs money goes through checkout (createPlanCheckout),
        // which applies the plan only after the gateway confirms payment.
        // Platform admins can still change a plan directly (comp / manual billing).
        if (quote.netPayableToday > 0 && !caller.isSuperAdmin) {
            return {
                success: false,
                message: "",
                error: "This change needs a payment. Use Upgrade to pay at checkout.",
            }
        }

        if (quote.isDowngrade && !immediate) {
            // Schedule downgrade at the end of current cycle
            const updatedSubscription = {
                ...currentSub,
                scheduledDowngrade: {
                    targetPlan,
                    effectiveDate: quote.nextBillingDate,
                },
            }

            await prisma.tenant.update({
                where: { id: tenantId },
                data: {
                    settings: {
                        ...settings,
                        subscription: updatedSubscription,
                    },
                },
            })

            await logAudit("TENANT_PLAN_DOWNGRADE_SCHEDULED", tenantId, {
                fromPlan: currentPlan,
                toPlan: targetPlan,
                effectiveDate: quote.nextBillingDate,
            })

            revalidatePath("/settings")
            revalidatePath(`/admin/tenants/${tenantId}`)

            return {
                success: true,
                message: `Downgrade to ${targetPlan} scheduled for your next renewal date (${new Date(quote.nextBillingDate).toLocaleDateString()}). You will retain ${currentPlan} features until then.`,
            }
        }

        // Immediate downgrade, free change, or a platform admin's manual change
        const { invoice: generatedInvoice } = await applyPlanChange(tenantId, {
            targetPlan,
            billingCycle,
            paymentRef: caller.isSuperAdmin ? paymentReference : undefined,
            amountPaid: caller.isSuperAdmin ? undefined : 0,
            paymentMethod: caller.isSuperAdmin ? "Manual (platform admin)" : "No charge",
            actor: { id: caller.userId, email: caller.email },
        })

        revalidatePath("/settings")
        revalidatePath(`/admin/tenants/${tenantId}`)
        revalidatePath("/pricing")
        revalidatePath("/admin/pricing")

        return {
            success: true,
            message: quote.isUpgrade
                ? `Successfully upgraded to ${targetPlan} (${billingCycle})!`
                : `Successfully updated plan to ${targetPlan}.`,
            invoice: generatedInvoice,
        }
    } catch (err: any) {
        console.error("executePlanChange error:", err)
        return { success: false, message: "", error: err.message || "Failed to execute plan change" }
    }
}

/**
 * Issues a platform subscription invoice for a tenant (used by Super Admin or billing webhooks).
 */
export async function generateSaaSInvoice(params: {
    tenantId: string
    plan: PlanTier
    billingCycle: BillingCycle
    paymentMethod?: string
    transactionRef?: string
}): Promise<{ success: boolean; invoice?: SaaSPlatformInvoice; error?: string }> {
    const { plan, billingCycle, paymentMethod, transactionRef } = params

    try {
        // Non-admins are confined to their own tenant; Super Admins may target any tenant
        // Platform invoices are issued by the SaaS operator only
        const caller = await getCallerContext(params.tenantId)
        const tenantId = caller.tenantId
        if (!caller.isSuperAdmin || !tenantId || tenantId !== params.tenantId) {
            return { success: false, error: "Unauthorized" }
        }

        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, currencyCode: true, settings: true },
        })

        if (!tenant) return { success: false, error: "Tenant not found" }
        if (plan === "FREE") return { success: false, error: "Free plan has nothing to invoice" }

        // Bill at the live price for the tenant's currency (Admin → Pricing)
        const pricing = await getEffectivePricing(tenant.currencyCode)
        const invoice = compileSaaSSubscriptionInvoice({
            tenantId: tenant.id,
            tenantName: tenant.name,
            plan,
            billingCycle,
            currency: pricing.currency,
            paymentMethod,
            transactionRef,
            pricing,
        })

        const settings = (tenant.settings as any) || {}
        const currentSub = settings.subscription || {}
        const existingInvoices = Array.isArray(currentSub.invoices) ? currentSub.invoices : []

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                settings: {
                    ...settings,
                    subscription: {
                        ...currentSub,
                        invoices: [invoice, ...existingInvoices],
                    },
                },
            },
        })

        await logAudit("SAAS_INVOICE_ISSUED", tenantId, {
            invoiceNumber: invoice.invoiceNumber,
            plan,
            totalAmount: invoice.totalAmount,
            currency: invoice.currency,
        })

        revalidatePath(`/admin/tenants/${tenantId}`)
        revalidatePath("/settings")

        return { success: true, invoice }
    } catch (err: any) {
        console.error("generateSaaSInvoice error:", err)
        return { success: false, error: err.message || "Failed to generate invoice" }
    }
}
