"use server"

import { createClient } from "@/lib/supabase/server"
import { toActionResult, type ActionResult } from "@/lib/action-result"

export interface EmailPreferences {
    marketingOptIn: boolean
    consentAt: string | null
}

/** The signed-in user's marketing email consent (stored in their auth metadata). */
export async function getEmailPreferences(): Promise<EmailPreferences> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    const meta = (data.user?.user_metadata || {}) as Record<string, unknown>
    return {
        marketingOptIn: meta.marketing_opt_in === true,
        consentAt: typeof meta.marketing_consent_at === "string" ? meta.marketing_consent_at : null,
    }
}

/** Give or withdraw marketing email consent. Takes effect immediately and records when. */
export async function setMarketingOptIn(optIn: boolean): Promise<ActionResult<EmailPreferences>> {
    return toActionResult(async () => {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) throw new Error("Please sign in again.")
        const consentAt = new Date().toISOString()
        const { error } = await supabase.auth.updateUser({
            data: { marketing_opt_in: optIn === true, marketing_consent_at: consentAt, marketing_consent_source: "settings" },
        })
        if (error) throw new Error("We couldn't save your email preference. Please try again.")
        return { marketingOptIn: optIn === true, consentAt }
    })
}
