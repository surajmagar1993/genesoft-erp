import { describe, expect, it } from "vitest"
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"

/**
 * A server file that imports a plain value (defaults, constants, helpers) from a "use client"
 * file gets only a client reference, so its fields arrive undefined: this crashed the CRM edit
 * pages (2026-11-17). Components (PascalCase) are fine to import.
 */
const SRC = path.join(process.cwd(), "src")

function sourceFiles(dir: string): string[] {
    return readdirSync(dir).flatMap((name) => {
        const p = path.join(dir, name)
        if (statSync(p).isDirectory()) return name === "test" || name === "__tests__" ? [] : sourceFiles(p)
        return /\.(ts|tsx)$/.test(name) ? [p] : []
    })
}

const isClient = (s: string) => /^\s*(\/\/[^\n]*\n\s*)*["']use client["']/.test(s)
const isComponentName = (n: string) => /^[A-Z]/.test(n) && n !== n.toUpperCase()

function resolve(spec: string, from: string): string | undefined {
    const base = spec.startsWith("@/") ? path.join(SRC, spec.slice(2)) : spec.startsWith(".") ? path.resolve(path.dirname(from), spec) : null
    if (!base) return undefined
    return [".ts", ".tsx", "/index.ts", "/index.tsx"].map((e) => base + e).find(existsSync)
}

/** Plain values a "use client" file exports, by file. */
function clientValueExports(files: Map<string, string>): Map<string, Set<string>> {
    const out = new Map<string, Set<string>>()
    for (const [f, s] of files) {
        if (!isClient(s)) continue
        const names = [...s.matchAll(/^export\s+(?:const|let|var|function)\s+([A-Za-z_]\w*)/gm)].map((m) => m[1]).filter((n) => !isComponentName(n))
        if (names.length) out.set(f, new Set(names))
    }
    return out
}

function offenders(files: Map<string, string>): string[] {
    const values = clientValueExports(files)
    const bad: string[] = []
    for (const [f, s] of files) {
        if (isClient(s)) continue
        for (const m of s.matchAll(/import\s+(type\s+)?\{([^}]*)\}\s+from\s+["']([^"']+)["']/g)) {
            if (m[1]) continue
            const target = resolve(m[3], f)
            const exported = target && values.get(target)
            if (!exported) continue
            for (const raw of m[2].split(",")) {
                const name = raw.trim().split(/\s+as\s+/)[0]
                if (name && !name.startsWith("type ") && exported.has(name)) bad.push(`${path.relative(process.cwd(), f)} imports ${name}`)
            }
        }
    }
    return bad
}

describe("server/client boundary", () => {
    it("no server file imports a plain value from a \"use client\" file", () => {
        const files = new Map(sourceFiles(SRC).map((f) => [f, readFileSync(f, "utf8")]))
        expect(offenders(files)).toEqual([])
    })

    it("catches the CRM edit-page mistake", () => {
        const form = path.join(SRC, "components/crm/company-form.tsx")
        const page = path.join(SRC, "app/x/page.tsx")
        const files = new Map([
            [form, `"use client"\nexport const defaultCompanyForm = {}\nexport function CompanyForm() {}`],
            [page, `import { CompanyForm, defaultCompanyForm } from "@/components/crm/company-form"`],
        ])
        expect(offenders(files)).toEqual([`${path.relative(process.cwd(), page)} imports defaultCompanyForm`])
    })
})
