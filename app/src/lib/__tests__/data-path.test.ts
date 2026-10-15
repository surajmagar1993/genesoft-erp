import { describe, expect, it } from "vitest"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

/** All table access goes through Prisma; the Supabase client is only for Auth (see CLAUDE.md). */
function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = path.join(dir, name)
        if (statSync(p).isDirectory()) return name === "test" || name === "__tests__" ? [] : sourceFiles(p)
        return /\.(ts|tsx)$/.test(name) ? [p] : []
    })
}

/**
 * Allowed: both read only the signed-in user's own role, under row-level
 * security. The request proxy shouldn't open a Prisma pool per request, and
 * the dashboard layout runs in the browser, where Prisma can't.
 */
const OWN_ROLE_LOOKUPS = ["src/lib/supabase/middleware.ts", "src/app/(dashboard)/layout.tsx"]

describe("data access", () => {
    it("no code queries tables through the Supabase client", () => {
        const offenders = sourceFiles(path.join(process.cwd(), "src")).filter((f) => /\.from\(["'`][a-z_]+["'`]\)/.test(readFileSync(f, "utf8").replace(/storage\s*\.from\(/g, "")))
        expect(offenders.map((f) => path.relative(process.cwd(), f)).filter((f) => !OWN_ROLE_LOOKUPS.includes(f))).toEqual([])
    })
})
