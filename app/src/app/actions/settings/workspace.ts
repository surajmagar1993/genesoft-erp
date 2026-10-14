"use server"

import { redirect } from "next/navigation"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { getTenantAdminId } from "@/lib/get-tenant-id"
import { stripe } from "@/lib/stripe"
import { PLATFORM } from "@/lib/constants/platform"
import { CLOSURE_GRACE_DAYS, type WorkspaceClosure } from "@/lib/workspace-closure"
import type { ActionResult } from "@/lib/action-result"

/** Tells the Genesoft team a workspace was closed. Never throws. */
async function notifyPlatform(tenantName: string, tenantId: string, closure: WorkspaceClosure) {
    try {
        const apiKey = process.env.RESEND_API_KEY
        const domain = process.env.RESEND_DOMAIN
        if (!apiKey || !domain) return
        await new Resend(apiKey).emails.send({
            from: `${PLATFORM.productName} <notifications@${domain}>`,
            to: [PLATFORM.email],
            subject: `Workspace closed: ${tenantName}`.replace(/[\r\n]+/g, " "),
            text: [
                `${tenantName} (${tenantId}) was closed by ${closure.closedBy.email} on ${closure.closedAt}.`,
                closure.reason ? `Reason given: ${closure.reason}` : "No reason given.",
                `Its data can be permanently deleted from Admin → Tenants after ${closure.purgeAfter.slice(0, 10)}.`,
            ].join("\n\n"),
        })
    } catch (err) {
        console.error("closeWorkspace: notification failed", err)
    }
}

/**
 * The owner closes the workspace: everyone loses access now, any Stripe
 * subscription is cancelled, and the data is kept for CLOSURE_GRACE_DAYS
 * (reopen by contacting support) before the platform deletes it.
 * Ends by signing the caller out.
 */
export async function closeWorkspace(input: { confirmName: string; reason?: string }): Promise<ActionResult<never>> {
    const tenantId = await getTenantAdminId()
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { success: false, error: "Please sign in again." }

    const tenant = await prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { name: true, settings: true, stripeSubscriptionId: true },
    })
    if (!tenant) return { success: false, error: "Workspace not found." }
    if ((input.confirmName || "").trim().toLowerCase() !== tenant.name.trim().toLowerCase()) {
        return { success: false, error: "Type the workspace name exactly to confirm." }
    }
    if (await prisma.user.count({ where: { tenantId, role: "SUPER_ADMIN" } })) {
        return { success: false, error: "This workspace includes a platform administrator. Contact support to close it." }
    }

    if (tenant.stripeSubscriptionId && stripe) {
        try {
            await stripe.subscriptions.cancel(tenant.stripeSubscriptionId)
        } catch (err) {
            console.error("closeWorkspace: Stripe cancel failed", err)
            return { success: false, error: "We couldn't cancel your card subscription. Please try again or contact support." }
        }
    }

    const now = new Date()
    const closure: WorkspaceClosure = {
        status: "CLOSED",
        closedAt: now.toISOString(),
        closedBy: { id: user.id, email: user.email || "" },
        reason: (input.reason || "").trim().slice(0, 1000) || undefined,
        purgeAfter: new Date(now.getTime() + CLOSURE_GRACE_DAYS * 86_400_000).toISOString(),
    }
    const settings = (tenant.settings || {}) as Record<string, unknown>
    await prisma.tenant.update({
        where: { id: tenantId },
        data: { isActive: false, settings: { ...settings, closure } as never },
    })
    try {
        await prisma.adminAuditLog.create({
            data: {
                adminId: user.id,
                adminEmail: user.email || "unknown",
                action: "TENANT_CLOSED_BY_OWNER",
                targetId: tenantId,
                targetType: "TENANT",
                metadata: { reason: closure.reason ?? null, purgeAfter: closure.purgeAfter },
            },
        })
    } catch (err) {
        console.error("closeWorkspace: audit log failed", err)
    }
    await notifyPlatform(tenant.name, tenantId, closure)

    await supabase.auth.signOut()
    redirect("/login?message=Your+workspace+is+closed.+Contact+support+within+30+days+if+you+want+it+back.")
}
