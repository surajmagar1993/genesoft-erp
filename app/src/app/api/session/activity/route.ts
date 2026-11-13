import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getPlatformGate } from "@/lib/platform-security"
import { IDLE_COOKIE, IDLE_COOKIE_OPTIONS, idleRemainingMs, idleTimeoutEnabled, makeIdleCookie, readIdleCookie } from "@/lib/idle-session"

export const dynamic = "force-dynamic"

/**
 * Session inactivity timer for the IdleWatcher in the app shells.
 * POST { active: true }  — the user did something: move "last active" to now.
 * POST { active: false } — just checking: how long is left?
 * Signs the session out and answers { expired: true } once the timeout has passed.
 */
export async function POST(request: NextRequest) {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ expired: true })

    const { policy } = await getPlatformGate()
    const timeoutMinutes = policy.sessionTimeoutMinutes
    if (!idleTimeoutEnabled(timeoutMinutes)) return NextResponse.json({ enabled: false })

    const body = (await request.json().catch(() => ({}))) as { active?: unknown }
    const lastActive = readIdleCookie(request.cookies.get(IDLE_COOKIE)?.value, user.id)

    if (lastActive !== null && idleRemainingMs(lastActive, timeoutMinutes) <= 0) {
        await supabase.auth.signOut({ scope: "local" })
        return NextResponse.json({ expired: true, timeoutMinutes })
    }

    const res = NextResponse.json({
        enabled: true,
        timeoutMinutes,
        remainingMs: body.active === true || lastActive === null ? timeoutMinutes * 60_000 : idleRemainingMs(lastActive, timeoutMinutes),
    })
    if (body.active === true || lastActive === null) {
        const value = makeIdleCookie(user.id)
        if (value) res.cookies.set(IDLE_COOKIE, value, IDLE_COOKIE_OPTIONS)
    }
    return res
}
