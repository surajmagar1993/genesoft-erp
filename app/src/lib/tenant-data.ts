import { Zip, ZipDeflate, strToU8 } from "fflate"
import Papa from "papaparse"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { SKIP_TABLES, planTenantData, q, type FkEdge, type TenantDataPlan } from "@/lib/tenant-data-plan"

/**
 * Everything one business (tenant) owns in the database, found from the live
 * Postgres catalog rather than schema.prisma (the live schema has drifted):
 * every public table with a tenant_id column, plus child tables (invoice
 * lines, ticket messages…) linked to those by a foreign key. Used for the
 * "export all data" download and for permanently deleting a closed workspace.
 * Server-only.
 */

async function loadCatalog(): Promise<{ tenantTables: string[]; edges: FkEdge[] }> {
    const tenantTables: { table_name: string }[] = await prisma.$queryRawUnsafe(`
        select c.relname as table_name
        from pg_attribute a
        join pg_class c on c.oid = a.attrelid and c.relkind in ('r', 'p')
        join pg_namespace n on n.oid = c.relnamespace and n.nspname = 'public'
        where a.attname = 'tenant_id' and not a.attisdropped`)
    const edges: { child: string; child_col: string; parent: string; parent_col: string; on_delete: string }[] =
        await prisma.$queryRawUnsafe(`
        select cc.relname as child, a.attname as child_col, pc.relname as parent, af.attname as parent_col, c.confdeltype::text as on_delete
        from pg_constraint c
        join pg_class cc on cc.oid = c.conrelid
        join pg_namespace cn on cn.oid = cc.relnamespace and cn.nspname = 'public'
        join pg_class pc on pc.oid = c.confrelid
        join pg_namespace pn on pn.oid = pc.relnamespace and pn.nspname = 'public'
        join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
        join pg_attribute af on af.attrelid = c.confrelid and af.attnum = c.confkey[1]
        where c.contype = 'f' and array_length(c.conkey, 1) = 1`)
    return {
        tenantTables: tenantTables.map((t) => t.table_name).filter((t) => !SKIP_TABLES.has(t)),
        edges: edges.map((e) => ({ child: e.child, childCol: e.child_col, parent: e.parent, parentCol: e.parent_col, onDelete: e.on_delete })),
    }
}

export async function getTenantDataPlan(): Promise<TenantDataPlan> {
    const { tenantTables, edges } = await loadCatalog()
    return planTenantData(tenantTables, edges)
}

/* ───────────────────────── Export ───────────────────────── */

const SECRET_KEY = /(password|passwd|secret|token|api[_-]?key|access[_-]?key|private[_-]?key|signature|credential)/i
const REDACTED = "[removed for security]"

/** Removes credentials (by key name, or encrypted "enc:v1:" values) anywhere in a row. */
export function redactSecrets(value: unknown, key = ""): unknown {
    if (key && SECRET_KEY.test(key) && value !== null && value !== "") return REDACTED
    if (typeof value === "string") return value.startsWith("enc:v1:") ? REDACTED : value
    if (Array.isArray(value)) return value.map((v) => redactSecrets(v))
    if (value && typeof value === "object") {
        return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redactSecrets(v, k)]))
    }
    return value
}

const PAGE = 2000

async function tableRows(table: string, predicate: string, tenantId: string): Promise<Record<string, unknown>[]> {
    const rows: Record<string, unknown>[] = []
    for (let offset = 0; ; offset += PAGE) {
        // row_to_json gives plain JSON (numbers, ISO dates) for every column type
        const page: { j: string }[] = await prisma.$queryRawUnsafe(
            `select row_to_json(t)::text as j from (select * from ${q(table)} where ${predicate} order by 1 limit ${PAGE} offset ${offset}) t`,
            tenantId
        )
        for (const r of page) rows.push(redactSecrets(JSON.parse(r.j)) as Record<string, unknown>)
        if (page.length < PAGE) return rows
    }
}

function toCsv(rows: Record<string, unknown>[]): string {
    const flat = rows.map((r) =>
        Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v !== null && typeof v === "object" ? JSON.stringify(v) : v]))
    )
    return Papa.unparse(flat)
}

const README = (name: string, when: string, tables: { name: string; rows: number }[]) => `Genesoft ERP data export
Business: ${name}
Exported: ${when}

tables/<name>.json  every row, as JSON (best for importing elsewhere)
tables/<name>.csv   the same rows for spreadsheets (nested values as JSON text)

Passwords, API keys, tokens and other credentials are removed for security.
Empty tables are left out.

Tables (rows):
${tables.map((t) => `  ${t.name} (${t.rows})`).join("\n")}
`

/**
 * Streams a ZIP of all the tenant's data. Tables are read one at a time so a
 * large workspace doesn't have to fit in memory as one file.
 */
export function streamTenantExport(tenantId: string, tenantName: string): ReadableStream<Uint8Array> {
    return new ReadableStream<Uint8Array>({
        async start(controller) {
            const zip = new Zip((err, chunk, final) => {
                if (err) return controller.error(err)
                controller.enqueue(chunk)
                if (final) controller.close()
            })
            const add = (name: string, text: string) => {
                const file = new ZipDeflate(name, { level: 6 })
                zip.add(file)
                file.push(strToU8(text), true)
            }
            try {
                const plan = await getTenantDataPlan()
                const summary: { name: string; rows: number }[] = []

                const tenantRow: { j: string }[] = await prisma.$queryRawUnsafe(
                    `select row_to_json(t)::text as j from (select * from tenants where id = $1::uuid) t`,
                    tenantId
                )
                add("tables/tenants.json", JSON.stringify(tenantRow.map((r) => redactSecrets(JSON.parse(r.j))), null, 2))
                summary.push({ name: "tenants", rows: tenantRow.length })

                for (const table of [...plan.predicates.keys()].sort()) {
                    const rows = await tableRows(table, plan.predicates.get(table)!, tenantId)
                    if (rows.length === 0) continue
                    add(`tables/${table}.json`, JSON.stringify(rows, null, 2))
                    add(`tables/${table}.csv`, toCsv(rows))
                    summary.push({ name: table, rows: rows.length })
                }
                add("README.txt", README(tenantName, new Date().toISOString(), summary))
                zip.end()
            } catch (err) {
                console.error("streamTenantExport failed:", err)
                controller.error(err)
            }
        },
    })
}

/* ───────────────────────── Permanent delete ───────────────────────── */

export interface PurgeResult {
    tables: number
    rows: number
    users: number
}

/**
 * Permanently deletes a workspace's business data and its users' logins, in
 * one transaction (all or nothing). The tenants row stays, anonymised, with
 * its Genesoft subscription receipts (kept for tax law) and the closure record.
 * Refuses a workspace that has a platform super admin in it.
 */
export async function purgeTenantData(tenantId: string): Promise<PurgeResult> {
    const plan = await getTenantDataPlan()
    return prisma.$transaction(
        async (tx: Prisma.TransactionClient) => {
            const tenant = await tx.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } })
            if (!tenant) throw new Error("Tenant not found")
            const supers = await tx.user.count({ where: { tenantId, role: "SUPER_ADMIN" } })
            if (supers > 0) throw new Error("This workspace has a platform super admin. Move or demote them first.")

            const userIds = (await tx.user.findMany({ where: { tenantId }, select: { id: true } })).map((u: { id: string }) => u.id)

            let rows = 0
            for (const table of plan.deleteOrder) {
                rows += await tx.$executeRawUnsafe(`delete from ${q(table)} where ${plan.predicates.get(table)}`, tenantId)
            }

            let users = 0
            if (userIds.length > 0) {
                users = await tx.$executeRawUnsafe(`delete from auth.users where id = any($1::uuid[])`, userIds)
            }

            const settings = (tenant.settings || {}) as Record<string, unknown>
            const subscription = (settings.subscription || {}) as Record<string, unknown>
            const closure = (settings.closure || {}) as Record<string, unknown>
            await tx.tenant.update({
                where: { id: tenantId },
                data: {
                    isActive: false,
                    domain: null,
                    logoUrl: null,
                    phone: null,
                    email: null,
                    website: null,
                    stripeCustomerId: null,
                    stripeSubscriptionId: null,
                    settings: {
                        subscription: { invoices: Array.isArray(subscription.invoices) ? subscription.invoices : [] },
                        closure: { ...closure, status: "PURGED", purgedAt: new Date().toISOString() },
                    } as never,
                },
            })
            await tx.$executeRawUnsafe(`update tenants set address = null where id = $1::uuid`, tenantId)
            return { tables: plan.deleteOrder.length, rows, users }
        },
        { timeout: 240_000, maxWait: 20_000 }
    )
}
