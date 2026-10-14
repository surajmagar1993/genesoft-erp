/**
 * Rows inserted through the Supabase client must set updated_at themselves:
 * in the live database it is NOT NULL with no default (Prisma fills it in
 * automatically, PostgREST doesn't). Use stamped() on every such insert.
 */
export function stamped<T extends object>(row: T): T & { updated_at: string } {
    return { ...row, updated_at: new Date().toISOString() }
}
