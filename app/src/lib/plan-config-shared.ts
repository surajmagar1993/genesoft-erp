import { MODULES } from "@/lib/access"
import { PLAN_TIERS, type PlanTier } from "@/lib/saas-subscription-engine"

/**
 * What each plan includes, as edited in Admin → Pricing & Plans: its limits,
 * the modules it can use and the feature bullets shown on the pricing page.
 * Safe for the browser; the saved copy is read by src/lib/plan-config.ts.
 */
export const PLAN_ORDER: PlanTier[] = ["FREE", "BASIC", "PRO", "ENTERPRISE"]

export type LimitKind = "users" | "contacts" | "invoicesPerMonth" | "warehouses"

export const LIMIT_KINDS: { key: LimitKind; label: string; min: number }[] = [
    { key: "users", label: "Users (incl. pending invites)", min: 1 },
    { key: "contacts", label: "Contacts", min: 0 },
    { key: "invoicesPerMonth", label: "Invoices a month", min: 0 },
    { key: "warehouses", label: "Warehouses", min: 0 },
]

/** The ERP modules (src/lib/access.ts) plus parts of Sales sold separately. */
export const PLAN_MODULES: { key: string; label: string }[] = [
    ...MODULES.flatMap((m) =>
        m.key === "sales"
            ? [
                  { key: m.key, label: m.label },
                  { key: "pos", label: "Point of Sale" },
                  { key: "rentals", label: "Rentals" },
              ]
            : [{ key: m.key, label: m.label }]
    ),
]

export type PlanModuleKey = (typeof MODULES)[number]["key"] | "pos" | "rentals"

export interface PlanSettings {
    /** null = unlimited */
    limits: Record<LimitKind, number | null>
    modules: Record<string, boolean>
    /** Bullets on the pricing page and in Billing */
    features: string[]
}

export type PlanConfig = Record<PlanTier, PlanSettings>

const ENTERPRISE_ONLY = new Set(["pos", "rentals", "manufacturing"])

export function defaultPlanConfig(): PlanConfig {
    return Object.fromEntries(
        PLAN_ORDER.map((tier) => {
            const l = PLAN_TIERS[tier].limits
            return [
                tier,
                {
                    limits: { users: l.maxTeamMembers, contacts: l.maxContacts, invoicesPerMonth: l.maxInvoicesPerMonth, warehouses: l.maxWarehouses },
                    modules: Object.fromEntries(PLAN_MODULES.map((m) => [m.key, tier === "ENTERPRISE" || !ENTERPRISE_ONLY.has(m.key)])),
                    features: [...PLAN_TIERS[tier].features],
                },
            ]
        })
    ) as PlanConfig
}

function cleanLimit(v: unknown, fallback: number | null, min: number): number | null {
    if (v === null) return null
    if (v === undefined || v === "") return fallback
    const n = Math.floor(Number(v))
    return Number.isFinite(n) && n >= min ? n : fallback
}

/** A saved (or submitted) config over the defaults: unknown keys dropped, bad values replaced. */
export function normalizePlanConfig(raw: unknown): PlanConfig {
    const base = defaultPlanConfig()
    const saved = (raw && typeof raw === "object" ? raw : {}) as Record<string, Partial<PlanSettings> | undefined>
    for (const tier of PLAN_ORDER) {
        const s = saved[tier]
        if (!s || typeof s !== "object") continue
        for (const { key, min } of LIMIT_KINDS) {
            if (s.limits && key in s.limits) base[tier].limits[key] = cleanLimit(s.limits[key], base[tier].limits[key], min)
        }
        for (const m of PLAN_MODULES) {
            if (s.modules && typeof s.modules[m.key] === "boolean") base[tier].modules[m.key] = s.modules[m.key]
        }
        if (Array.isArray(s.features)) {
            base[tier].features = [...new Set(s.features.map((f) => String(f).trim().slice(0, 120)).filter(Boolean))].slice(0, 20)
        }
    }
    return base
}

/** The cheapest plan that includes a module, if any. */
export function lowestPlanWith(config: PlanConfig, module: string): PlanTier | null {
    return PLAN_ORDER.find((t) => config[t].modules[module]) ?? null
}

/** "Free", "Basic", "Pro", "Enterprise" */
export function planName(tier: PlanTier): string {
    return tier.charAt(0) + tier.slice(1).toLowerCase()
}
