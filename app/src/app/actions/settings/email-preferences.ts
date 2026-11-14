"use server"

import { createClient } from "@/lib/supabase/server"
import { toActionResult, type ActionResult } from "@/lib/action-result"
import { MARKETING_TOPICS, cleanTopicsOff, type MarketingTopic } from "@/lib/marketing-topics"

export interface EmailPreferences {
    marketingOptIn: boolean
    /** Kinds of marketing email switched off (the rest are sent while marketingOptIn is on) */
    topicsOff: MarketingTopic[]
    consentAt: string | null
}

/** The signed-in user's marketing email consent (stored in their auth metadata). */
export async function getEmailPreferences(): Promise<EmailPreferences> {
    const supabase = await createClient()
    const { data } = await supabase.auth.getUser()
    const meta = (data.user?.user_metadata || {}) as Record<string, unknown>
    const topicsOff = cleanTopicsOff(meta.marketing_topics_off)
    return {
        // Every kind switched off from email links = nothing is sent, so show it as off
        marketingOptIn: meta.marketing_opt_in === true && topicsOff.length < MARKETING_TOPICS.length,
        topicsOff,
        consentAt: typeof meta.marketing_consent_at === "string" ? meta.marketing_consent_at : null,
    }
}

/** Give or withdraw marketing email consent, and pick its kinds. Takes effect immediately and records when. */
export async function setMarketingOptIn(optIn: boolean, topicsOff: MarketingTopic[] = []): Promise<ActionResult<EmailPreferences>> {
    return toActionResult(async () => {
        const supabase = await createClient()
        const { data: auth } = await supabase.auth.getUser()
        if (!auth.user) throw new Error("Please sign in again.")
        const consentAt = new Date().toISOString()
        const off = cleanTopicsOff(topicsOff)
        const { error } = await supabase.auth.updateUser({
            data: { marketing_opt_in: optIn === true, marketing_topics_off: off, marketing_consent_at: consentAt, marketing_consent_source: "settings" },
        })
        if (error) throw new Error("We couldn't save your email preference. Please try again.")
        return { marketingOptIn: optIn === true, topicsOff: off, consentAt }
    })
}
