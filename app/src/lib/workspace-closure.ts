/**
 * Workspace closure record, kept in tenants.settings.closure.
 * CLOSED: the owner closed it; nobody can sign in. The data is kept for
 * CLOSURE_GRACE_DAYS so it can be reopened, then the super admin purges it.
 * PURGED: business data and logins deleted (see purgeTenantData).
 */
export const CLOSURE_GRACE_DAYS = 30

export interface WorkspaceClosure {
    status: "CLOSED" | "PURGED"
    closedAt: string
    closedBy: { id: string; email: string }
    reason?: string
    /** Earliest date the data may be permanently deleted */
    purgeAfter: string
    purgedAt?: string
}

export function readClosure(settings: unknown): WorkspaceClosure | null {
    const c = (settings as { closure?: WorkspaceClosure } | null)?.closure
    return c && (c.status === "CLOSED" || c.status === "PURGED") ? c : null
}
