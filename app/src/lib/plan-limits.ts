import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { readTeam } from "@/lib/team-settings"
import { PLAN_TIERS, getTierRank, type PlanTier } from "@/lib/saas-subscription-engine"

import { PLAN_MODULES, getPlanConfig, lowestPlanWith, planName, type LimitKind, type PlanConfig, type PlanModuleKey } from "@/lib/plan-config"

/**
 * What a workspace's plan allows: the limits and modules set in Admin →
 * Pricing & Plans (src/lib/plan-config.ts). An active trial counts as Pro
 * (Billing shows "PRO Trial"); after it ends the workspace's own plan applies.
 *
 * Limits only stop new records: a workspace over a limit (e.g. after a
 * downgrade) keeps everything it has but can't add more.
 */
export type { LimitKind }
/** Modules that can be left out of a plan (incl. POS and Rentals inside Sales) */
export type PlanFeature = PlanModuleKey

const TRIAL_TIER: PlanTier = "PRO"

export class PlanLimitError extends Error {
    /** Shown to the user as it is (src/lib/safe-action.ts) */
    readonly userFacing = true
    constructor(message: string) {
        super(message)
        this.name = "PlanLimitError"
    }
}

export interface EffectivePlan {
    tier: PlanTier
    /** The plan the workspace pays for (FREE during a trial) */
    plan: PlanTier
    onTrial: boolean
}

type Db = Pick<typeof prisma, "user" | "contact" | "invoice" | "warehouse" | "tenant">

export function effectivePlan(
    t: { plan: string | null; isTrial: boolean | null; trialEndsAt: Date | null },
    now: Date = new Date()
): EffectivePlan {
    const plan = (t.plan && t.plan in PLAN_TIERS ? t.plan : "FREE") as PlanTier
    const onTrial = !!t.isTrial && !!t.trialEndsAt && t.trialEndsAt.getTime() > now.getTime()
    const tier = onTrial && getTierRank(plan) < getTierRank(TRIAL_TIER) ? TRIAL_TIER : plan
    return { tier, plan, onTrial }
}

export function limitFor(config: PlanConfig, tier: PlanTier, kind: LimitKind): number | null {
    return config[tier].limits[kind]
}

export function planAllows(config: PlanConfig, tier: PlanTier, feature: PlanFeature): boolean {
    return config[tier].modules[feature] !== false
}

const loadPlan = cache(async (tenantId: string): Promise<EffectivePlan> => {
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { plan: true, isTrial: true, trialEndsAt: true } })
    return effectivePlan(t ?? { plan: "FREE", isTrial: false, trialEndsAt: null })
})

export async function getEffectivePlan(tenantId: string): Promise<EffectivePlan> {
    return loadPlan(tenantId)
}

function startOfMonth(now = new Date()): Date {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
}

async function countUsage(db: Db, tenantId: string, kind: LimitKind, includePendingInvites: boolean): Promise<number> {
    switch (kind) {
        case "users": {
            const active = await db.user.count({ where: { tenantId, isActive: true } })
            if (!includePendingInvites) return active
            const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } })
            const now = Date.now()
            return active + readTeam(tenant?.settings).invites.filter((i) => new Date(i.expiresAt).getTime() > now).length
        }
        case "contacts":
            return db.contact.count({ where: { tenantId } })
        case "invoicesPerMonth":
            return db.invoice.count({ where: { tenantId, type: "TAX_INVOICE", createdAt: { gte: startOfMonth() } } })
        case "warehouses":
            return db.warehouse.count({ where: { tenantId } })
    }
}

const NOUN: Record<LimitKind, [string, string]> = {
    users: ["user", "users"],
    contacts: ["contact", "contacts"],
    invoicesPerMonth: ["invoice a month", "invoices a month"],
    warehouses: ["warehouse", "warehouses"],
}

function limitMessage(p: EffectivePlan, kind: LimitKind, max: number): string {
    const plan = p.onTrial ? "trial" : `${planName(p.tier)} plan`
    const noun = NOUN[kind][max === 1 ? 0 : 1]
    const extra = kind === "users" ? " (pending invites count too)" : ""
    return `Your ${plan} allows up to ${max} ${noun}${extra}. Upgrade in Settings → Billing to add more.`
}

/**
 * Throws a PlanLimitError when adding `adding` more would go past the plan's
 * limit. Pass `db` to count inside a transaction.
 */
export async function assertWithinLimit(
    tenantId: string,
    kind: LimitKind,
    opts: { adding?: number; db?: Db; includePendingInvites?: boolean } = {}
): Promise<void> {
    const adding = opts.adding ?? 1
    if (adding <= 0) return
    const [p, config] = await Promise.all([loadPlan(tenantId), getPlanConfig()])
    const max = limitFor(config, p.tier, kind)
    if (max === null) return
    const used = await countUsage(opts.db ?? prisma, tenantId, kind, opts.includePendingInvites ?? true)
    if (used + adding > max) throw new PlanLimitError(limitMessage(p, kind, max))
}

/** Same check, returned as a message (null when allowed) for actions that return { error }. */
export async function planLimitError(
    tenantId: string,
    kind: LimitKind,
    opts: { adding?: number; db?: Db; includePendingInvites?: boolean } = {}
): Promise<string | null> {
    try {
        await assertWithinLimit(tenantId, kind, opts)
        return null
    } catch (err) {
        if (err instanceof PlanLimitError) return err.message
        throw err
    }
}

export function featureMessage(config: PlanConfig, feature: PlanFeature): string {
    const label = PLAN_MODULES.find((m) => m.key === feature)?.label ?? feature
    const tier = lowestPlanWith(config, feature)
    return tier
        ? `${label} is on the ${planName(tier)} plan. Upgrade in Settings → Billing to use it.`
        : `${label} isn't included in your plan.`
}

/** Throws a PlanLimitError when the workspace's plan doesn't include the feature. */
export async function assertPlanFeature(tenantId: string, feature: PlanFeature): Promise<void> {
    const [p, config] = await Promise.all([loadPlan(tenantId), getPlanConfig()])
    if (!planAllows(config, p.tier, feature)) throw new PlanLimitError(featureMessage(config, feature))
}
