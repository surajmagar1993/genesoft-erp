/** One business activity log entry as the screens show it (src/app/actions/activity.ts). Pure. */
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

export const toActivityRow = (r: { id: string; createdAt: Date; actorEmail: string | null; action: string; targetType: string | null; targetId: string | null; metadata: unknown; tenantId: string; tenant?: { name: string } | null }): ActivityRow => ({
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
