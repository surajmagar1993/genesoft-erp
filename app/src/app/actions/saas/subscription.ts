"use server"

import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import {
    PlanTier,
    BillingCycle,
    calculateSubscriptionProration,
    compileSaaSSubscriptionInvoice,
    SaaSPlatformInvoice,
    ProrationQuote,
} from "@/lib/saas-subscription-engine"

/**
 * Checks if user has Super Admin or Tenant Admin permissions.
 */
async function getCallerContext(targetTenantId?: string) {
    try {
        const supabase = await createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
            // For testing or CLI environments
            if (process.env.NODE_ENV !== "production") {
                return { userId: "dev-admin", email: "admin@genesoft.ai", isSuperAdmin: true, tenantId: targetTenantId || "e55d1d95-a9b1-4201-a0ba-8c7a31f63af0" }
            }
            throw new Error("Unauthorized")
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("role, tenant_id")
            .eq("id", user.id)
            .single()

        const isSuperAdmin = profile?.role === "SUPER_ADMIN"
        const effectiveTenantId = targetTenantId && isSuperAdmin ? targetTenantId : profile?.tenant_id

        return {
            userId: user.id,
            email: user.email || "user@genesoft.ai",
            isSuperAdmin,
            tenantId: effectiveTenantId,
        }
    } catch {
        if (process.env.NODE_ENV !== "production") {
            return { userId: "dev-admin", email: "admin@genesoft.ai", isSuperAdmin: true, tenantId: targetTenantId || "e55d1d95-a9b1-4201-a0ba-8c7a31f63af0" }
        }
        throw new Error("Authentication required")
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
    const tenantId = targetTenantId || caller.tenantId

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
 * Real-time proration quote for moving from current plan to target plan.
 */
export async function calculatePlanChangeQuote(params: {
    targetPlan: PlanTier
    billingCycle: BillingCycle
    targetTenantId?: string
}): Promise<ProrationQuote> {
    const { targetPlan, billingCycle, targetTenantId } = params
    const details = await getTenantSubscriptionDetails(targetTenantId)

    const quote = calculateSubscriptionProration({
        currentPlan: details.currentPlan,
        targetPlan,
        currentBillingCycle: details.billingCycle,
        targetBillingCycle: billingCycle,
        currencyCode: details.currency,
        cycleEndDate: details.renewalDate,
    })

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
    const tenantId = targetTenantId || caller.tenantId

    if (!tenantId) {
        return { success: false, message: "", error: "Tenant authorization missing" }
    }

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, plan: true, currencyCode: true, settings: true },
        })

        if (!tenant) {
            return { success: false, message: "", error: "Tenant not found" }
        }

        const currentPlan = (tenant.plan as PlanTier) || "FREE"
        const settings = (tenant.settings as any) || {}
        const currentSub = settings.subscription || {}
        const existingInvoices: SaaSPlatformInvoice[] = Array.isArray(currentSub.invoices) ? currentSub.invoices : []

        const quote = calculateSubscriptionProration({
            currentPlan,
            targetPlan,
            currentBillingCycle: currentSub.billingCycle || "MONTHLY",
            targetBillingCycle: billingCycle,
            currencyCode: tenant.currencyCode,
        })

        let generatedInvoice: SaaSPlatformInvoice | undefined

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

        // Immediate upgrade or immediate downgrade
        if (targetPlan !== "FREE") {
            generatedInvoice = compileSaaSSubscriptionInvoice({
                tenantId: tenant.id,
                tenantName: tenant.name,
                plan: targetPlan,
                billingCycle,
                currency: tenant.currencyCode,
                transactionRef: paymentReference,
            })
        }

        const updatedInvoices = generatedInvoice
            ? [generatedInvoice, ...existingInvoices]
            : existingInvoices

        const updatedSubscription = {
            ...currentSub,
            billingCycle,
            renewalDate: quote.nextBillingDate,
            lastPlanChange: new Date().toISOString(),
            scheduledDowngrade: null, // Clear any pending downgrade
            invoices: updatedInvoices,
        }

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                plan: targetPlan as any,
                isTrial: false, // Transition out of trial upon active plan change
                trialEndsAt: null,
                settings: {
                    ...settings,
                    subscription: updatedSubscription,
                },
            },
        })

        const actionType = quote.isUpgrade ? "TENANT_PLAN_UPGRADE" : "TENANT_PLAN_DOWNGRADE"
        await logAudit(actionType, tenantId, {
            fromPlan: currentPlan,
            toPlan: targetPlan,
            billingCycle,
            netPaid: quote.netPayableToday,
            invoiceNumber: generatedInvoice?.invoiceNumber,
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
    const { tenantId, plan, billingCycle, paymentMethod, transactionRef } = params

    try {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { id: true, name: true, currencyCode: true, settings: true },
        })

        if (!tenant) return { success: false, error: "Tenant not found" }

        const invoice = compileSaaSSubscriptionInvoice({
            tenantId: tenant.id,
            tenantName: tenant.name,
            plan,
            billingCycle,
            currency: tenant.currencyCode,
            paymentMethod,
            transactionRef,
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
