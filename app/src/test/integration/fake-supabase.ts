import { prisma } from "@/lib/prisma"

/**
 * Just enough of the Supabase server client for the code under test:
 * auth.getUser / signUp / signOut / updateUser for the "signed-in" test user,
 * and from(table).select().eq()…single() reads straight from the test DB.
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

const IDENT = /^[a-z_][a-z0-9_]*$/

function query(table: string) {
    if (!IDENT.test(table)) throw new Error(`fake supabase: bad table ${table}`)
    const filters: [string, unknown][] = []
    const run = async () => {
        const where = filters.map(([c], i) => `${c}::text = $${i + 1}::text`).join(" and ")
        const sql = `select * from public.${table}${where ? ` where ${where}` : ""}`
        const { rows } = await db().query(sql, filters.map(([, v]) => v))
        return rows
    }
    const builder = {
        select: () => builder,
        eq: (col: string, val: unknown) => {
            if (!IDENT.test(col)) throw new Error(`fake supabase: bad column ${col}`)
            filters.push([col, val])
            return builder
        },
        single: async () => {
            const rows = await run()
            return rows.length === 1 ? { data: rows[0], error: null } : { data: null, error: { message: "not found" } }
        },
        maybeSingle: async () => ({ data: (await run())[0] ?? null, error: null }),
        then: (resolve: (v: unknown) => void, reject: (e: unknown) => void) =>
            run().then((rows) => resolve({ data: rows, error: null }), reject),
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
