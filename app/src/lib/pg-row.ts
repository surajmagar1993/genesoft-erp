import { Prisma } from "@prisma/client"

/**
 * Prisma record → the row shape the Supabase client (PostgREST) returns:
 * snake_case column names, numerics as numbers and timestamps as PostgREST
 * prints them. Screens written against Supabase rows keep working unchanged
 * when their action moves to Prisma. Only the model's own columns are
 * included; callers add related records themselves.
 */

type ModelName = Prisma.ModelName
type Field = (typeof Prisma.dmmf.datamodel.models)[number]["fields"][number]

const MODELS = new Map(Prisma.dmmf.datamodel.models.map((m) => [m.name, m.fields.filter((f) => f.kind === "scalar" || f.kind === "enum")]))

/** Models whose timestamps are `timestamptz` in the database (the rest are `timestamp`). */
const TIMESTAMPTZ: ReadonlySet<string> = new Set<ModelName>(["Company"])

/** "2026-10-14T09:30:00.5" for `timestamp`, "…+00:00" for `timestamptz` (trailing zeros dropped, as PostgREST does). */
export function pgTimestamp(d: Date, withTimeZone = false): string {
    const iso = d.toISOString().replace(/\.?0+Z$/, "Z")
    return withTimeZone ? iso.replace(/Z$/, "+00:00") : iso.replace(/Z$/, "")
}

function value(v: unknown, f: Field, tz: boolean): unknown {
    if (v === null || v === undefined) return null
    if (Array.isArray(v)) return v.map((x) => value(x, f, tz))
    if (v instanceof Date) return pgTimestamp(v, tz)
    if (Prisma.Decimal.isDecimal(v)) return (v as Prisma.Decimal).toNumber()
    if (typeof v === "bigint") return Number(v)
    return v
}

export function toRow<T = Record<string, unknown>>(model: ModelName, record: object): T {
    const fields = MODELS.get(model)
    if (!fields) throw new Error(`Unknown model ${model}`)
    const tz = TIMESTAMPTZ.has(model)
    const src = record as Record<string, unknown>
    const row: Record<string, unknown> = {}
    for (const f of fields) {
        if (f.name in src) row[f.dbName ?? f.name] = value(src[f.name], f, tz)
    }
    return row as T
}

export function toRows<T = Record<string, unknown>>(model: ModelName, records: object[]): T[] {
    return records.map((r) => toRow<T>(model, r))
}

/**
 * The reverse, for writes: a snake_case patch from a form → Prisma data,
 * keeping only real columns of the model (unknown keys are dropped, never
 * written). `id`, `tenant_id` and timestamps are never taken from the input.
 */
export function fromRow(model: ModelName, input: object): Record<string, unknown> {
    const fields = MODELS.get(model)
    if (!fields) throw new Error(`Unknown model ${model}`)
    const src = input as Record<string, unknown>
    const data: Record<string, unknown> = {}
    for (const f of fields) {
        const col = f.dbName ?? f.name
        if (["id", "tenant_id", "created_at", "updated_at"].includes(col)) continue
        const v = col in src ? src[col] : f.name in src ? src[f.name] : undefined
        if (v === undefined) continue
        // Forms send "" for "not set": that's null for optional ids, dates and numbers
        if (v === "" && !f.isRequired && (f.type !== "String" || col.endsWith("_id") || col === "assigned_to")) {
            data[f.name] = null
            continue
        }
        if (v === null && f.type === "Json") {
            data[f.name] = Prisma.DbNull // Prisma needs this for a SQL NULL in a JSON column
            continue
        }
        data[f.name] = f.type === "DateTime" && typeof v === "string" ? (v ? new Date(v) : null) : v
    }
    return data
}

/** An untyped row, as the Supabase client returned for pages that read loosely. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type PgRow = Record<string, any>

/** Only the listed columns, like a Supabase `select("a, b")`. */
export function pick<K extends string>(row: Record<string, unknown>, cols: readonly K[]): Record<K, unknown> {
    return Object.fromEntries(cols.map((c) => [c, row[c] ?? null])) as Record<K, unknown>
}
