"use server"

import { cache } from "react"
import { createClient } from "@/lib/supabase/server"
import { readClosure } from "@/lib/workspace-closure"
import { prisma } from "@/lib/prisma"
import { redirect } from "next/navigation"

/**
 * Role ladder inside a workspace:
 *   VIEWER  – read only
 *   USER    – create and edit day-to-day records
 *   MANAGER – also delete/void/approve, finance controls, HR and payroll
 *   ADMIN   – also workspace settings and credentials
 * SUPER_ADMIN (platform) passes every check.
 */
const WRITER_ROLES = ["USER", "MANAGER", "ADMIN", "SUPER_ADMIN"]
const MANAGER_ROLES = ["MANAGER", "ADMIN", "SUPER_ADMIN"]
const TENANT_ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"]

// Cached per request: a page or action that checks several times hits the database once
const getTenantContext = cache(async (): Promise<{ tenantId: string; role: string }> => {
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

  // A workspace suspended by the platform admin (Admin → Tenants) loses access.
  // Platform admins keep theirs so they can still reach /admin.
  if (role !== "SUPER_ADMIN") {
    const tenant = await prisma.tenant.findUnique({
      where: { id: profile.tenantId },
      select: { isActive: true, settings: true },
    })
    if (tenant && !tenant.isActive) {
      await supabase.auth.signOut()
      if (readClosure(tenant.settings)) {
        redirect("/login?error=This+workspace+is+closed.+Contact+support+if+you+want+it+reopened.")
      }
      redirect("/login?error=This+workspace+has+been+suspended.+Please+contact+support.")
    }
  }

  return { tenantId: profile.tenantId, role }
})

/**
 * Returns the tenant_id for the currently authenticated user (any role).
 * Use it for reads and for self-service actions on the caller's own data.
 * Redirects to /login if the user is not authenticated or deactivated.
 */
export async function getTenantId(): Promise<string> {
  return (await getTenantContext()).tenantId
}

/** The caller's workspace role, for showing or hiding UI. */
export async function getTenantRole(): Promise<string> {
  return (await getTenantContext()).role
}

/**
 * Like getTenantId, but rejects VIEWER. Use it in actions that create or
 * change business records.
 */
export async function getTenantWriterId(): Promise<string> {
  const { tenantId, role } = await getTenantContext()
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
export async function getTenantManagerId(): Promise<string> {
  const { tenantId, role } = await getTenantContext()
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
