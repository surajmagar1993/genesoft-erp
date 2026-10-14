"use server"

import { redirect } from "next/navigation"
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token"
import { optOutOfMarketing } from "@/lib/marketing-email"

/** Confirm button on /unsubscribe. Authorised by the signed token in the email link, no login needed. */
export async function unsubscribeWithToken(formData: FormData) {
    const token = String(formData.get("t") || "")
    const userId = verifyUnsubscribeToken(token)
    if (!userId) redirect("/unsubscribe?status=invalid")
    let ok = false
    try {
        ok = await optOutOfMarketing(userId, "email-link")
    } catch (err) {
        console.error("unsubscribeWithToken failed:", err)
        redirect(`/unsubscribe?status=error&t=${encodeURIComponent(token)}`)
    }
    redirect(ok ? "/unsubscribe?status=done" : "/unsubscribe?status=invalid")
}
