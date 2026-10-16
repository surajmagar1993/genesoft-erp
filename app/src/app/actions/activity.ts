"use server"

import { prisma } from "@/lib/prisma"
import { getTenantAdminId } from "@/lib/get-tenant-id"
import { requireSuperAdmin } from "@/lib/super-admin"
import { isUuid } from "@/lib/utils"
import { tenantTimeZone } from "@/lib/timezone"
import { toActivityRow, type ActivityRow } from "@/lib/activity-row"

/**
 * Reading business activity logs (tenant_audit_logs, written by
 * logTenantAudit in src/lib/tenant-audit.ts). A business's admins see their
 * own; the Super Admin sees any business's, or all of them.
 */
/** Settings → Activity log: the signed-in admin's own business, with its time zone. */
export async function getMyActivityLog(take = 200): Promise<{ rows: ActivityRow[]; timeZone: string }> {
    const tenantId = await getTenantAdminId()
    const [rows, timeZone] = await Promise.all([
        prisma.tenantAuditLog.findMany({ where: { tenantId }, orderBy: { createdAt: "desc" }, take: Math.min(Math.max(1, take), 500) }),
        tenantTimeZone(tenantId),
    ])
    return { rows: rows.map(toActivityRow), timeZone }
}

/** Super Admin: one business's activity, or every business's (newest first). */
export async function getClientActivity(opts: { tenantId?: string; take?: number } = {}): Promise<ActivityRow[]> {
    await requireSuperAdmin()
    // A malformed id must not fall back to every business's log
    if (opts.tenantId !== undefined && !isUuid(opts.tenantId)) return []
    const where = opts.tenantId ? { tenantId: opts.tenantId } : {}
    const rows = await prisma.tenantAuditLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: Math.min(Math.max(1, opts.take ?? 200), 500),
        include: { tenant: { select: { name: true } } },
    })
    return rows.map(toActivityRow)
}
