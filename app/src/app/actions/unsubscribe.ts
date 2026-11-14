"use server"

import { redirect } from "next/navigation"
import { reportCaught } from "@/lib/error-reporting"
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token"
import { optOutOfMarketing } from "@/lib/marketing-email"
import { isMarketingTopic } from "@/lib/marketing-topics"

/**
 * Confirm buttons on /unsubscribe. Authorised by the signed token in the email link, no login needed.
 * scope = a topic (stop that kind only) or "all".
 */
export async function unsubscribeWithToken(formData: FormData) {
    const token = String(formData.get("t") || "")
    const userId = verifyUnsubscribeToken(token)
    if (!userId) redirect("/unsubscribe?status=invalid")
    const scope = String(formData.get("scope") || "all")
    const topic = isMarketingTopic(scope) ? scope : undefined
    let ok = false
    try {
        ok = await optOutOfMarketing(userId, "email-link", topic)
    } catch (err) {
        await reportCaught(err, "unsubscribe link", { userId })
        redirect(`/unsubscribe?status=error&t=${encodeURIComponent(token)}${topic ? `&topic=${topic}` : ""}`)
    }
    redirect(!ok ? "/unsubscribe?status=invalid" : topic ? `/unsubscribe?status=done&topic=${topic}` : "/unsubscribe?status=done")
}
