"use server"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { readClosure } from "@/lib/workspace-closure"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"
import { MODULES, atLeast, levelFor, resolveAccess, type AccessLevel, type ModuleAccess, type ModuleKey } from "@/lib/access"
import { getPlanConfig, planName, lowestPlanWith, type PlanConfig } from "@/lib/plan-config"
import { effectivePlan } from "@/lib/plan-limits"

/**
 * Role ladder inside a workspace:
 *   VIEWER  – read only
 *   USER    – create and edit day-to-day records
 *   MANAGER – also delete/void/approve, finance controls, HR and payroll
 *   ADMIN   – also workspace settings and credentials
 * SUPER_ADMIN (platform) passes every check.
 *
 * Module access (src/lib/access.ts) refines this per module for members:
 * pass the action's module to getTenantId / getTenantWriterId /
 * getTenantManagerId and the caller needs VIEW / EDIT / FULL on it. Without
 * a module only the role is checked (shared things: notifications, support,
 * the self-service portal).
 */
const WRITER_ROLES = ["USER", "MANAGER", "ADMIN", "SUPER_ADMIN"]
const MANAGER_ROLES = ["MANAGER", "ADMIN", "SUPER_ADMIN"]
const TENANT_ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"]

// Cached per request: a page or action that checks several times hits the database once
type ModuleArg = ModuleKey | readonly ModuleKey[]

type TenantContext = {
  tenantId: string
  role: string
  access: ModuleAccess
  /** Modules (incl. "pos", "rentals") the workspace's plan includes */
  planModules: Record<string, boolean>
  /** Modules the plan leaves out: access to them is NONE for everyone */
  planBlocked: ModuleKey[]
  planConfig: PlanConfig | null
}

const getTenantContext = cache(async (): Promise<TenantContext> => {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // profiles links auth.users → tenants (Prisma model User)
  const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { tenantId: true, role: true, isActive: true } })

  if (!profile?.tenantId) {
    console.error("Critical: User has no profile or tenant_id", user.id)
    // In SaaS mode, we cannot continue without a tenantId
    redirect("/login?error=Session+configuration+error.+Please+contact+support.")
  }

  if (profile.isActive === false) {
    await supabase.auth.signOut()
    redirect("/login?error=Your+account+has+been+deactivated.+Please+contact+your+administrator.")
  }

  const role: string = profile.role ?? "USER"
  let savedAccess: unknown = null
  let planModules: Record<string, boolean> = {}
  let planConfig: PlanConfig | null = null

  // A workspace suspended by the platform admin (Admin → Tenants) loses access.
  // Platform admins keep theirs so they can still reach /admin.
  if (role !== "SUPER_ADMIN") {
    const [tenant, config] = await Promise.all([
      prisma.tenant.findUnique({
        where: { id: profile.tenantId },
        select: { isActive: true, settings: true, plan: true, isTrial: true, trialEndsAt: true },
      }),
      getPlanConfig(),
    ])
    savedAccess = readSavedAccess(tenant?.settings, user.id)
    planConfig = config
    planModules = config[effectivePlan(tenant ?? { plan: "FREE", isTrial: false, trialEndsAt: null }).tier].modules
    if (tenant && !tenant.isActive) {
      await supabase.auth.signOut()
      if (readClosure(tenant.settings)) {
        redirect("/login?error=This+workspace+is+closed.+Contact+support+if+you+want+it+reopened.")
      }
      redirect("/login?error=This+workspace+has+been+suspended.+Please+contact+support.")
    }
  }

  // A module the plan leaves out is closed to everyone, admins included
  const access = resolveAccess(role, savedAccess)
  const planBlocked = MODULES.map((m) => m.key).filter((k) => planModules[k] === false)
  for (const k of planBlocked) access[k] = "NONE"

  return { tenantId: profile.tenantId, role, access, planModules, planBlocked, planConfig }
})

/** Saved module access for one member: tenants.settings.team.access[userId]. */
function readSavedAccess(settings: unknown, userId: string): unknown {
  const team = (settings as { team?: { access?: Record<string, unknown> } } | null)?.team
  return team?.access?.[userId] ?? null
}

function moduleLabel(module: ModuleArg): string {
  const keys = (Array.isArray(module) ? module : [module]) as ModuleKey[]
  return keys.map((k) => MODULES.find((m) => m.key === k)?.label ?? k).join(" or ")
}

function requireLevel(ctx: TenantContext, module: ModuleArg, min: AccessLevel): void {
  const { access } = ctx
  const level = levelFor(access, module)
  if (atLeast(level, min)) return
  const what = moduleLabel(module)
  const keys = (Array.isArray(module) ? module : [module]) as ModuleKey[]
  if (ctx.planConfig && keys.every((k) => ctx.planBlocked.includes(k))) {
    const tier = lowestPlanWith(ctx.planConfig, keys[0])
    throw new Error(tier ? `${what} is on the ${planName(tier)} plan. Upgrade in Settings → Billing to use it.` : `${what} isn't included in your plan.`)
  }
  if (level === "NONE") throw new Error(`You don't have access to ${what}. Ask a workspace admin.`)
  if (level === "VIEW") throw new Error(`You can only view ${what}. Ask a workspace admin for edit access.`)
  throw new Error(`Only people with full access to ${what} can do this.`)
}

/**
 * Returns the tenant_id for the currently authenticated user (any role).
 * Use it for reads and for self-service actions on the caller's own data.
 * Redirects to /login if the user is not authenticated or deactivated.
 */
export async function getTenantId(module?: ModuleArg): Promise<string> {
  const ctx = await getTenantContext()
  if (module) requireLevel(ctx, module, "VIEW")
  const { tenantId } = ctx
  return tenantId
}

/** The caller's workspace role, for showing or hiding UI. */
export async function getTenantRole(): Promise<string> {
  return (await getTenantContext()).role
}

/**
 * The caller's role and module access, for showing or hiding menus and
 * buttons, plus which modules the workspace's plan includes (e.g. "pos").
 */
export async function getMyAccess(): Promise<{ role: string; access: ModuleAccess; planModules: Record<string, boolean> }> {
  const { role, access, planModules } = await getTenantContext()
  return { role, access, planModules }
}

/** True when the workspace's plan includes the module (POS and Rentals included). */
export async function isInPlan(module: string): Promise<boolean> {
  return (await getTenantContext()).planModules[module] !== false
}

/** True when the caller has at least `min` on the module (no throw), e.g. for self-service "act for others". */
export async function hasModuleAccess(module: ModuleArg, min: AccessLevel): Promise<boolean> {
  return atLeast(levelFor((await getTenantContext()).access, module), min)
}

/**
 * Like getTenantId, but rejects VIEWER. Use it in actions that create or
 * change business records.
 */
export async function getTenantWriterId(module?: ModuleArg): Promise<string> {
  const ctx = await getTenantContext()
  const { tenantId, role } = ctx
  if (module) {
    requireLevel(ctx, module, "EDIT")
    return tenantId
  }
  if (!WRITER_ROLES.includes(role)) {
    throw new Error("Your role is read-only. Ask a workspace admin for edit access.")
  }
  return tenantId
}

/**
 * Like getTenantId, but only for MANAGER and above. Use it for deletes,
 * voids, approvals, finance controls (accounts, bank reconciliation,
 * budgets, pricing, credit notes) and HR/payroll records.
 */
export async function getTenantManagerId(module?: ModuleArg): Promise<string> {
  const ctx = await getTenantContext()
  const { tenantId, role } = ctx
  if (module) {
    requireLevel(ctx, module, "FULL")
    return tenantId
  }
  if (!MANAGER_ROLES.includes(role)) {
    throw new Error("Only managers and admins can do this.")
  }
  return tenantId
}

/**
 * Like getTenantId, but only for workspace admins. Use it in actions that
 * change workspace-wide settings or credentials (gateways, SMTP, WhatsApp,
 * company profile, workflows). Throws for MANAGER / USER / VIEWER.
 */
export async function getTenantAdminId(): Promise<string> {
  const { tenantId, role } = await getTenantContext()
  if (!TENANT_ADMIN_ROLES.includes(role)) {
    throw new Error("Only workspace admins can change these settings.")
  }
  return tenantId
}
