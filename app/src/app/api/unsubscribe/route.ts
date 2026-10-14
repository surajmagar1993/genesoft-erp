import { NextRequest, NextResponse } from "next/server"
import { verifyUnsubscribeToken } from "@/lib/unsubscribe-token"
import { optOutOfMarketing } from "@/lib/marketing-email"

export const dynamic = "force-dynamic"

/**
 * RFC 8058 one-click unsubscribe, called by mail providers (Gmail, Yahoo…)
 * from the List-Unsubscribe header with body "List-Unsubscribe=One-Click".
 * Authorised by the signed token; no login.
 */
export async function POST(request: NextRequest) {
    const userId = verifyUnsubscribeToken(request.nextUrl.searchParams.get("t"))
    if (!userId) return NextResponse.json({ error: "Invalid unsubscribe link" }, { status: 400 })
    try {
        await optOutOfMarketing(userId, "one-click")
        return NextResponse.json({ unsubscribed: true })
    } catch (err) {
        console.error("one-click unsubscribe failed:", err)
        return NextResponse.json({ error: "Could not unsubscribe" }, { status: 500 })
    }
}

/** A person who opens the link in a browser gets the confirm page instead. */
export async function GET(request: NextRequest) {
    const url = request.nextUrl.clone()
    url.pathname = "/unsubscribe"
    return NextResponse.redirect(url)
}
