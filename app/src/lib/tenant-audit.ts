import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

/**
 * A business's activity log (tenant_audit_logs): what its own people did, plus
 * the billing system acting on it. Super Admin actions go to AdminAuditLog
 * (src/lib/super-admin.ts) instead. Shown in Settings → Activity log (the
 * business's admins) and on the business's page in Super Admin.
 *
 * Never put secrets or personal message text in metadata: record that a
 * credential "changed", not its value. Never throws: logging must not break
 * the action it records.
 */
export type TenantActor = { id: string | null; email: string | null }

/** The billing system (payment gateway webhooks, scheduled plan changes). */
export const BILLING_SYSTEM: TenantActor = { id: null, email: "billing@system" }

export async function logTenantAudit(
    tenantId: string,
    action: string,
    opts: { target?: { type?: string; id?: string | null }; metadata?: Record<string, unknown>; actor?: TenantActor } = {},
): Promise<void> {
    try {
        let actor = opts.actor
        if (!actor) {
            const user = await getCurrentUser().catch(() => null)
            actor = { id: user?.id ?? null, email: user?.email ?? null }
        }
        await prisma.tenantAuditLog.create({
            data: {
                tenantId,
                actorId: actor.id,
                actorEmail: actor.email,
                action,
                targetType: opts.target?.type ?? null,
                targetId: opts.target?.id ?? null,
                metadata: (opts.metadata ?? {}) as object,
            },
        })
    } catch (err) {
        console.error(`logTenantAudit(${action}) failed:`, err)
    }
}

export { TENANT_ACTION_LABEL } from "@/lib/tenant-audit-labels"
