"use server"

import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"

/**
 * Returns the tenant_id for the currently authenticated user.
 * Reads from the profiles table which links auth.users → tenants.
 * Redirects to /login if the user is not authenticated.
 * Throws if the user has no profile row yet (should never happen post-setup).
 */
export async function getTenantId(): Promise<string> {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  // Use id to link to our Prisma-managed Profile
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single()

  if (error || !profile?.tenant_id) {
    console.error("Critical: User has no profile or tenant_id", user.id, error?.message)
    // In SaaS mode, we cannot continue without a tenantId
    redirect("/login?error=Session+configuration+error.+Please+contact+support.")
  }

  return profile.tenant_id
}
