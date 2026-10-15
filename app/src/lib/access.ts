/**
 * Per-module access inside a workspace. Pure (no server imports), so the
 * browser can use it to hide menus and buttons; the server enforces it in
 * src/lib/get-tenant-id.ts.
 *
 * Admins (and platform super admins) always have FULL access everywhere and
 * manage the team and settings. Every other member has one level per module:
 *   NONE – hidden and blocked
 *   VIEW – read only
 *   EDIT – create and edit records
 *   FULL – also delete, void, approve
 * Members without saved access get levels from their old role (MANAGER →
 * FULL, USER → EDIT, VIEWER → VIEW), so nothing changes until an admin edits it.
 */

export const MODULES = [
    { key: "crm", label: "CRM", description: "Contacts, companies, leads, deals, emails, WhatsApp, forms, tasks" },
    { key: "sales", label: "Sales", description: "Products, quotes, orders, invoices, challans, credit notes, rental, POS" },
    { key: "finance", label: "Finance", description: "Accounts, ledger, expenses, bank, budgets, bills, payments, tax" },
    { key: "purchase", label: "Purchase", description: "Purchase orders, RFQs, vendors" },
    { key: "inventory", label: "Inventory", description: "Warehouses, stock, batches and serials" },
    { key: "manufacturing", label: "Manufacturing", description: "Bills of materials, work orders, quality checks" },
    { key: "hr", label: "HR", description: "Employees, attendance, leave, recruitment, performance" },
    { key: "payroll", label: "Payroll", description: "Salary structures, pay runs, payslips" },
    { key: "projects", label: "Projects", description: "Projects, tasks, milestones, timesheets" },
    { key: "reports", label: "Report Builder", description: "Custom reports across the workspace" },
] as const

export type ModuleKey = (typeof MODULES)[number]["key"]
export type AccessLevel = "NONE" | "VIEW" | "EDIT" | "FULL"
export type ModuleAccess = Record<ModuleKey, AccessLevel>

export const ACCESS_LEVELS: { value: AccessLevel; label: string }[] = [
    { value: "NONE", label: "No access" },
    { value: "VIEW", label: "View" },
    { value: "EDIT", label: "Edit" },
    { value: "FULL", label: "Full" },
]

const RANK: Record<AccessLevel, number> = { NONE: 0, VIEW: 1, EDIT: 2, FULL: 3 }
const MODULE_KEYS = MODULES.map((m) => m.key) as ModuleKey[]

export function isModuleKey(v: unknown): v is ModuleKey {
    return typeof v === "string" && (MODULE_KEYS as string[]).includes(v)
}

export function atLeast(level: AccessLevel, min: AccessLevel): boolean {
    return RANK[level] >= RANK[min]
}

export function uniformAccess(level: AccessLevel): ModuleAccess {
    return Object.fromEntries(MODULE_KEYS.map((k) => [k, level])) as ModuleAccess
}

const ROLE_DEFAULT: Record<string, AccessLevel> = { SUPER_ADMIN: "FULL", ADMIN: "FULL", MANAGER: "FULL", USER: "EDIT", VIEWER: "VIEW" }

export const isAdminRole = (role: string | null | undefined) => role === "ADMIN" || role === "SUPER_ADMIN"

/** A clean access map from saved data (unknown modules/levels dropped, missing ones from the role). */
export function resolveAccess(role: string | null | undefined, saved: unknown): ModuleAccess {
    if (isAdminRole(role)) return uniformAccess("FULL")
    const base = uniformAccess(ROLE_DEFAULT[role ?? "USER"] ?? "VIEW")
    if (saved && typeof saved === "object") {
        for (const [k, v] of Object.entries(saved as Record<string, unknown>)) {
            if (isModuleKey(k) && typeof v === "string" && v in RANK) base[k] = v as AccessLevel
        }
    }
    return base
}

/** The level that satisfies a check for any of the given modules (the highest of them). */
export function levelFor(access: ModuleAccess, module: ModuleKey | readonly ModuleKey[]): AccessLevel {
    const keys = (Array.isArray(module) ? module : [module]) as ModuleKey[]
    return keys.reduce<AccessLevel>((best, k) => (RANK[access[k]] > RANK[best] ? access[k] : best), "NONE")
}

/**
 * The module a dashboard path belongs to, or null for pages everyone can
 * open (the dashboard, the employee self-service portal, support, settings).
 */
export function moduleForPath(pathname: string): ModuleKey | null {
    const p = pathname.replace(/\/+$/, "") || "/"
    if (p === "/hr/portal" || p.startsWith("/hr/portal/")) return null
    if (p === "/hr/payroll" || p.startsWith("/hr/payroll/")) return "payroll"
    if (p === "/reports/builder" || p.startsWith("/reports/builder/")) return "reports"
    const first = p.split("/")[1]
    return first && first !== "reports" && isModuleKey(first) ? first : null
}

/** Short summary for lists, e.g. "CRM: Edit · Sales: Edit · Finance: View" (modules with no access left out). */
export function summarizeAccess(role: string | null | undefined, access: ModuleAccess): string {
    if (isAdminRole(role)) return "Everything (admin)"
    const parts = MODULES.filter((m) => access[m.key] !== "NONE").map((m) => `${m.label}: ${ACCESS_LEVELS.find((l) => l.value === access[m.key])!.label}`)
    return parts.length ? parts.join(" · ") : "No modules"
}
