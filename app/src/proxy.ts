import { NextResponse, type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { clientIp, getPlatformGate } from '@/lib/platform-security'

export async function proxy(request: NextRequest) {
    const gate = await getPlatformGate()

    // Platform IP blocklist (Admin → Security)
    const ip = clientIp(request.headers)
    if (ip && gate.blockedIps.has(ip)) {
        return new NextResponse('Access denied', { status: 403 })
    }

    return await updateSession(request, gate)
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for:
         * - _next/static (static files)
         * - _next/image (image optimization)
         * - favicon.ico (browser icon)
         * - public assets (images, svgs, etc.)
         */
        '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
    ],
}
