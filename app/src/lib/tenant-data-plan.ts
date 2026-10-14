/**
 * Pure planning for tenant export/purge: which rows of which tables belong to
 * a tenant, and a safe delete order. Input comes from the live Postgres
 * catalog (see tenant-data.ts). No imports, so it can be unit tested and run
 * from scripts.
 */
export type FkEdge = { child: string; childCol: string; parent: string; parentCol: string; onDelete: string }

export interface TenantDataPlan {
    /** table → SQL condition selecting this tenant's rows ($1 = tenant id) */
    predicates: Map<string, string>
    /** Tables in a safe delete order (children first) */
    deleteOrder: string[]
}

export const q = (ident: string) => `"${ident.replace(/"/g, '""')}"`

/** The tenants table itself is handled separately (kept, anonymised). */
export const SKIP_TABLES = new Set(["tenants", "_prisma_migrations"])

/** Builds the per-table row conditions and a children-first delete order. */
export function planTenantData(tenantTables: string[], edges: FkEdge[]): TenantDataPlan {
    const predicates = new Map<string, string>()
    for (const t of tenantTables) predicates.set(t, `${q("tenant_id")} = $1::uuid`)

    // Child tables without tenant_id belong to the tenant through a parent row.
    // "membership" edges: child row is the tenant's if its parent row is.
    const membership: FkEdge[] = []
    let grew = true
    while (grew) {
        grew = false
        for (const e of edges) {
            if (SKIP_TABLES.has(e.child) || predicates.has(e.child) || e.child === e.parent) continue
            let pred: string | null = null
            if (e.parent === "tenants") pred = `${q(e.childCol)} = $1::uuid`
            else if (predicates.has(e.parent)) {
                pred = `${q(e.childCol)} in (select ${q(e.parentCol)} from ${q(e.parent)} where ${predicates.get(e.parent)})`
            }
            if (!pred) continue
            // A child of several tenant tables: any one of its parents makes it the tenant's
            const others = edges.filter(
                (o) => o !== e && o.child === e.child && o.parent !== e.child && (predicates.has(o.parent) || o.parent === "tenants")
            )
            const all = [pred, ...others.map((o) =>
                o.parent === "tenants"
                    ? `${q(o.childCol)} = $1::uuid`
                    : `${q(o.childCol)} in (select ${q(o.parentCol)} from ${q(o.parent)} where ${predicates.get(o.parent)})`
            )]
            predicates.set(e.child, all.length === 1 ? all[0] : `(${all.join(" or ")})`)
            membership.push(e, ...others)
            grew = true
        }
    }

    // Order: a child goes before its parent when the FK would block the parent's
    // delete (NO ACTION / RESTRICT), or when the child is found through that parent.
    const tables = [...predicates.keys()]
    const mustPrecede = new Map<string, Set<string>>(tables.map((t) => [t, new Set()])) // parent → children that go first
    for (const e of edges) {
        if (e.child === e.parent || !predicates.has(e.child) || !predicates.has(e.parent)) continue
        const blocking = e.onDelete === "a" || e.onDelete === "r"
        if (blocking || membership.includes(e)) mustPrecede.get(e.parent)!.add(e.child)
    }
    const order: string[] = []
    const done = new Set<string>()
    const visiting = new Set<string>()
    const visit = (t: string, path: string[]) => {
        if (done.has(t)) return
        if (visiting.has(t)) throw new Error(`Can't order the delete: tables reference each other (${[...path, t].join(" → ")})`)
        visiting.add(t)
        for (const child of mustPrecede.get(t)!) visit(child, [...path, t])
        visiting.delete(t)
        done.add(t)
        order.push(t)
    }
    for (const t of tables.sort()) visit(t, [])
    return { predicates, deleteOrder: order }
}
