import { cache } from "react"
import { createClient } from "@/lib/supabase/server"

/** The signed-in Supabase Auth user (null when signed out). Cached per request. */
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})
