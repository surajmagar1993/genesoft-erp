import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

type AuthClient = Awaited<ReturnType<typeof createClient>>

/**
 * True when the account has an authenticator app but this session hasn't
 * entered its code yet (aal1 of aal2). The request proxy already sends such
 * sessions to /two-factor; server code checks it too, so a password alone
 * never reaches data even through a request the proxy doesn't cover.
 * Reads the session only (no network call).
 */
export async function awaitingSecondFactor(supabase: AuthClient): Promise<boolean> {
  const mfa = supabase.auth.mfa as AuthClient["auth"]["mfa"] | undefined
  if (!mfa?.getAuthenticatorAssuranceLevel) return false
  const { data } = await mfa.getAuthenticatorAssuranceLevel()
  return data?.nextLevel === "aal2" && data.currentLevel !== "aal2"
}

/**
 * The signed-in Supabase Auth user (null when signed out, or still waiting
 * for the two-factor code). Cached per request.
 */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  if (await awaitingSecondFactor(supabase)) return null
  return user
})
