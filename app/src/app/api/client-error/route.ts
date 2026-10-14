import { NextRequest, NextResponse } from "next/server"
import { reportError } from "@/lib/error-reporting"

export const dynamic = "force-dynamic"

// Browser crashes reported by the error pages. Anyone can call this, so it is
// rate limited per IP, size limited, logged as WARN and never emailed.
const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 10
const hits = new Map<string, number[]>()

function limited(ip: string): boolean {
    const now = Date.now()
    const recent = (hits.get(ip) || []).filter((t) => now - t < WINDOW_MS)
    recent.push(now)
    hits.set(ip, recent)
    if (hits.size > 5000) hits.clear()
    return recent.length > MAX_PER_WINDOW
}

export async function POST(request: NextRequest) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
    if (limited(ip)) return new NextResponse(null, { status: 429 })

    const body = (await request.json().catch(() => null)) as { message?: unknown; stack?: unknown; path?: unknown } | null
    if (!body || typeof body.message !== "string") return new NextResponse(null, { status: 400 })

    await reportError({
        source: "browser",
        message: body.message.slice(0, 1000),
        stack: typeof body.stack === "string" ? body.stack.slice(0, 4000) : undefined,
        path: typeof body.path === "string" ? body.path.slice(0, 300) : undefined,
    })
    return new NextResponse(null, { status: 204 })
}
