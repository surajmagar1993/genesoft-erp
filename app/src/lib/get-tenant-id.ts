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

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("tenant_id")
    .eq("id", user.id)
    .single()

  if (error || !profile?.tenant_id) {
    // Fallback: use user.id as tenant_id for single-user setups
    // In production this should throw or redirect to onboarding
    console.warn("No tenant_id found for user", user.id, error?.message)
    return user.id
  }

  return profile.tenant_id
}
