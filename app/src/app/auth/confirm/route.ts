import { NextResponse, type NextRequest } from "next/server"
import type { EmailOtpType } from "@supabase/supabase-js"
import { createClient } from "@/lib/supabase/server"

export const dynamic = "force-dynamic"

const OTP_TYPES: EmailOtpType[] = ["signup", "invite", "magiclink", "recovery", "email_change", "email"]

/** Only same-site paths, so the link can't be used to redirect anywhere else. */
function safeNext(next: string | null, fallback: string): string {
    return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback
}

/**
 * Target of every Supabase auth email (signup confirmation, password reset,
 * invites, email change). Turns the link into a session cookie and sends the
 * user on: email templates link here with ?token_hash=…&type=…; the default
 * {{ .ConfirmationURL }} flow arrives with ?code=… instead.
 */
export async function GET(request: NextRequest) {
    const { searchParams, origin } = request.nextUrl
    const tokenHash = searchParams.get("token_hash")
    const type = searchParams.get("type") as EmailOtpType | null
    const code = searchParams.get("code")
    const next = safeNext(searchParams.get("next"), type === "recovery" ? "/reset-password" : "/crm/contacts")

    const supabase = await createClient()
    let error: { message: string } | null = null

    if (tokenHash && type && OTP_TYPES.includes(type)) {
        ;({ error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash }))
    } else if (code) {
        ;({ error } = await supabase.auth.exchangeCodeForSession(code))
    } else {
        error = { message: "This link is incomplete." }
    }

    if (error) {
        const target = type === "recovery" || next === "/reset-password" ? "/forgot-password" : "/login"
        const message = `${error.message.replace(/\.?$/, ".")} Please request a new link.`
        return NextResponse.redirect(new URL(`${target}?error=${encodeURIComponent(message)}`, origin))
    }

    return NextResponse.redirect(new URL(next, origin))
}
