import { prisma } from "@/lib/prisma"

/**
 * Just enough of the Supabase server client for the code under test:
 * auth.getUser / signUp / signOut / updateUser for the "signed-in" test user,
 * and from(table) reads and writes against the test DB. Like the real API
 * (PostgREST), writing a column the table doesn't have is an error, so tests
 * catch payloads that don't match the database.
 */
type TestUser = { id: string; email: string; user_metadata?: Record<string, unknown> } | null

let currentUser: TestUser = null
export const signUps: { email: string; password: string; options?: unknown }[] = []

export function signInAs(user: TestUser) {
    currentUser = user
}

// Through Prisma's pool: the test database takes one connection at a time
const db = () => ({
    query: async (sql: string, params: unknown[] = []) => ({ rows: (await prisma.$queryRawUnsafe(sql, ...params)) as Record<string, unknown>[] }),
})

const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/
const q = (id: string) => `"${id}"`

type ColType = { data_type: string; udt_name: string }
const typeCache = new Map<string, Map<string, ColType>>()
async function columnTypes(table: string): Promise<Map<string, ColType>> {
    if (!typeCache.has(table)) {
        const { rows } = await db().query(
            "select column_name::text as c, data_type::text as data_type, udt_name::text as udt_name from information_schema.columns where table_schema = 'public' and table_name = $1",
            [table]
        )
        typeCache.set(table, new Map(rows.map((r) => [String(r.c), { data_type: String(r.data_type), udt_name: String(r.udt_name) }])))
    }
    return typeCache.get(table)!
}

/** A typed placeholder for one value (PostgREST casts by column type). */
function placeholder(i: number, t: ColType): string {
    if (t.data_type === "jsonb" || t.data_type === "json") return `$${i}::jsonb`
    if (t.data_type === "USER-DEFINED") return `$${i}::"${t.udt_name}"`
    if (t.data_type === "ARRAY") return `$${i}::${t.udt_name.replace(/^_/, "")}[]`
    if (t.data_type.startsWith("timestamp")) return `$${i}::timestamp`
    return `$${i}::${t.udt_name}`
}
function paramValue(v: unknown, t: ColType): unknown {
    if (v === null || v === undefined) return null
    if (t.data_type === "jsonb" || t.data_type === "json") return JSON.stringify(v)
    if (v instanceof Date) return v.toISOString()
    if (typeof v === "number" || typeof v === "boolean") return String(v)
    return v
}

function query(table: string) {
    if (!IDENT.test(table)) throw new Error(`fake supabase: bad table ${table}`)
    const filters: [string, unknown][] = []
    let mode: "select" | "insert" | "update" | "delete" = "select"
    let payload: Record<string, unknown>[] = []
    let returning = false
    let order: { col: string; asc: boolean } | null = null
    let limit: number | null = null
    let offset = 0

    const missingColumn = (col: string) => ({ data: null, error: { message: `Could not find the '${col}' column of '${table}' in the schema cache`, code: "PGRST204" } })

    const run = async (): Promise<{ data: Record<string, unknown>[] | null; error: { message: string; code?: string } | null }> => {
        const types = await columnTypes(table)
        for (const [c] of filters) if (!types.has(c)) return { data: null, error: { message: `column ${table}.${c} does not exist` } }
        const params: unknown[] = []
        const where = filters.map(([c, v]) => {
            params.push(v === null ? null : String(v))
            return `${q(c)}::text = $${params.length}::text`
        }).join(" and ")
        try {
            if (mode === "select") {
                let sql = `select * from public.${q(table)}${where ? ` where ${where}` : ""}`
                if (order && types.has(order.col)) sql += ` order by ${q(order.col)} ${order.asc ? "asc" : "desc"}`
                if (limit !== null) sql += ` limit ${limit}`
                if (offset) sql += ` offset ${offset}`
                return { data: (await db().query(sql, params)).rows, error: null }
            }
            if (mode === "insert") {
                const out: Record<string, unknown>[] = []
                for (const row of payload) {
                    const cols = Object.keys(row).filter((k) => row[k] !== undefined)
                    for (const c of cols) if (!types.has(c)) return missingColumn(c)
                    const vals = cols.map((c, i) => placeholder(i + 1, types.get(c)!))
                    const sql = `insert into public.${q(table)} (${cols.map(q).join(", ")}) values (${vals.join(", ")}) returning *`
                    out.push(...(await db().query(sql, cols.map((c) => paramValue(row[c], types.get(c)!)))).rows)
                }
                return { data: returning ? out : null, error: null }
            }
            if (mode === "update") {
                const row = payload[0]
                const cols = Object.keys(row).filter((k) => row[k] !== undefined)
                for (const c of cols) if (!types.has(c)) return missingColumn(c)
                const sets = cols.map((c, i) => `${q(c)} = ${placeholder(params.length + i + 1, types.get(c)!)}`)
                const sql = `update public.${q(table)} set ${sets.join(", ")}${where ? ` where ${where}` : ""} returning *`
                const rows = (await db().query(sql, [...params, ...cols.map((c) => paramValue(row[c], types.get(c)!))])).rows
                return { data: returning ? rows : null, error: null }
            }
            const rows = (await db().query(`delete from public.${q(table)}${where ? ` where ${where}` : ""} returning *`, params)).rows
            return { data: returning ? rows : null, error: null }
        } catch (err) {
            return { data: null, error: { message: err instanceof Error ? err.message : String(err) } }
        }
    }

    const builder = {
        select: () => {
            if (mode !== "select") returning = true
            return builder
        },
        insert: (rows: Record<string, unknown> | Record<string, unknown>[]) => {
            mode = "insert"
            payload = Array.isArray(rows) ? rows : [rows]
            return builder
        },
        update: (row: Record<string, unknown>) => {
            mode = "update"
            payload = [row]
            return builder
        },
        delete: () => {
            mode = "delete"
            return builder
        },
        eq: (col: string, val: unknown) => {
            if (!IDENT.test(col)) throw new Error(`fake supabase: bad column ${col}`)
            filters.push([col, val])
            return builder
        },
        order: (col: string, opts?: { ascending?: boolean }) => {
            order = { col, asc: opts?.ascending !== false }
            return builder
        },
        limit: (n: number) => {
            limit = n
            return builder
        },
        range: (from: number, to: number) => {
            offset = from
            limit = to - from + 1
            return builder
        },
        single: async () => {
            returning = true
            const res = await run()
            if (res.error) return { data: null, error: res.error }
            const rows = res.data ?? []
            return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: "not found" } }
        },
        maybeSingle: async () => {
            returning = true
            const res = await run()
            return res.error ? { data: null, error: res.error } : { data: (res.data ?? [])[0] ?? null, error: null }
        },
        then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            run().then((res) => resolve({ ...res, count: res.data?.length ?? 0 }), reject),
    }
    return builder
}

export function fakeSupabaseClient() {
    return {
        auth: {
            getUser: async () => ({ data: { user: currentUser }, error: null }),
            signOut: async () => {
                currentUser = null
                return { error: null }
            },
            signUp: async (params: { email: string; password: string; options?: { data?: Record<string, unknown> } }) => {
                signUps.push(params)
                const id = crypto.randomUUID()
                await db().query(
                    "insert into auth.users (id, email, raw_user_meta_data) values ($1::uuid, $2, $3::jsonb)",
                    [id, params.email, JSON.stringify(params.options?.data ?? {})]
                )
                return { data: { user: { id, email: params.email } }, error: null }
            },
            updateUser: async ({ data }: { data: Record<string, unknown> }) => {
                if (!currentUser) return { data: null, error: { message: "not signed in" } }
                await db().query(
                    "update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $2::jsonb where id = $1::uuid",
                    [currentUser.id, JSON.stringify(data)]
                )
                currentUser = { ...currentUser, user_metadata: { ...currentUser.user_metadata, ...data } }
                return { data: { user: currentUser }, error: null }
            },
        },
        from: (table: string) => query(table),
    }
}
