"use server"

import { prisma } from "@/lib/prisma"
import { getTenantAdminId } from "@/lib/get-tenant-id"
import { requireSuperAdmin } from "@/lib/super-admin"
import { isUuid } from "@/lib/utils"

/**
 * Reading business activity logs (tenant_audit_logs, written by
 * logTenantAudit in src/lib/tenant-audit.ts). A business's admins see their
 * own; the Super Admin sees any business's, or all of them.
 */
export interface ActivityRow {
    id: string
    createdAt: string
    actorEmail: string | null
    action: string
    targetType: string | null
    targetId: string | null
    metadata: Record<string, unknown>
    tenantId: string
    tenantName?: string
}

const toRow = (r: { id: string; createdAt: Date; actorEmail: string | null; action: string; targetType: string | null; targetId: string | null; metadata: unknown; tenantId: string; tenant?: { name: string } | null }): ActivityRow => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    actorEmail: r.actorEmail,
    action: r.action,
    targetType: r.targetType,
    targetId: r.targetId,
    metadata: r.metadata && typeof r.metadata === "object" ? (r.metadata as Record<string, unknown>) : {},
    tenantId: r.tenantId,
    tenantName: r.tenant?.name,
})

/** Settings → Activity log: the signed-in admin's own business. */
export async function getMyActivityLog(take = 200): Promise<ActivityRow[]> {
    const tenantId = await getTenantAdminId()
    const rows = await prisma.tenantAuditLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: Math.min(Math.max(1, take), 500) })
    return rows.map(toRow)
}

/** Super Admin: one business's activity, or every business's (newest first). */
export async function getClientActivity(opts: { tenantId?: string; take?: number } = {}): Promise<ActivityRow[]> {
    await requireSuperAdmin()
    const where = opts.tenantId && isUuid(opts.tenantId) ? { tenantId: opts.tenantId } : {}
    const rows = await prisma.tenantAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(1, opts.take ?? 200), 500),
        include: { tenant: { select: { name: true } } },
    })
    return rows.map(toRow)
}
