import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { DEFAULT_SECURITY_POLICY, clientIp, type PlatformGate } from '@/lib/platform-security'
import { IDLE_COOKIE, IDLE_COOKIE_OPTIONS, idleRemainingMs, idleTimeoutEnabled, makeIdleCookie, readIdleCookie } from '@/lib/idle-session'
import { hitRateLimit } from '@/lib/rate-limit'
import { APP_AREAS } from '@/lib/app-areas'
import { COMPLIANCE_MODULES_ENABLED, isComplianceRoute, PARKED_MODULES_ENABLED, isParkedRoute } from '@/lib/features'

export async function updateSession(request: NextRequest, gate?: PlatformGate) {
    let supabaseResponse = NextResponse.next({
        request,
    })

    // Skip auth if Supabase is not configured (dev mode without credentials)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!supabaseUrl || !supabaseAnonKey || supabaseUrl === 'your-supabase-url') {
        return supabaseResponse
    }

    const supabase = createServerClient(
        supabaseUrl,
        supabaseAnonKey,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll()
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    )
                    supabaseResponse = NextResponse.next({
                        request,
                    })
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    )
                },
            },
        }
    )

    // Refresh session — IMPORTANT for keeping auth active
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const pathname = request.nextUrl.pathname
    const policy = gate?.policy ?? DEFAULT_SECURITY_POLICY

    // A redirect that keeps any session cookies Supabase just refreshed or cleared
    const redirectTo = (path: string, search = '') => {
        const url = request.nextUrl.clone()
        url.pathname = path
        url.search = search
        const res = NextResponse.redirect(url)
        supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
        return res
    }

    // Rate limit (Admin → Security): API calls and form/action submissions, per
    // signed-in user (or per IP when signed out), plus a wider cap per IP.
    // Gateway webhooks and the cron job are exempt.
    const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(request.method)
    const isApi = pathname.startsWith('/api/')
    if ((isWrite || isApi) && !pathname.startsWith('/api/webhooks/') && !pathname.startsWith('/api/cron/')) {
        const ip = clientIp(request.headers) ?? 'unknown'
        const own = hitRateLimit(user ? `u:${user.id}` : `ip:${ip}`, policy.rateLimitPerMin)
        const wide = hitRateLimit(`ipall:${ip}`, policy.rateLimitPerMin * 10)
        if (own.limited || wide.limited) {
            return new NextResponse('Too many requests. Please wait a moment and try again.', {
                status: 429,
                headers: { 'Retry-After': String(Math.max(own.retryAfterSec, wide.limited ? wide.retryAfterSec : 0)) },
            })
        }
    }

    // Signed-in areas that the session rules below apply to: the app itself and
    // the API routes that act for the signed-in user
    const isTwoFactorPage = pathname === '/two-factor'
    const isSessionApi = ['/api/invoices/', '/api/settings/', '/api/session/'].some((p) => pathname.startsWith(p))
    const isGuardedArea = APP_AREAS.some((p) => pathname === p || pathname.startsWith(`${p}/`)) || isSessionApi

    if (!user && isTwoFactorPage) return redirectTo('/login')

    let roleLookup: Promise<string | null> | null = null
    const ownRole = () => {
        roleLookup ??= Promise.resolve(
            supabase.from('profiles').select('role').eq('id', user!.id).single()
        ).then(({ data }) => (data?.role as string | undefined) ?? null, () => null)
        return roleLookup
    }

    if (user && (isGuardedArea || isTwoFactorPage)) {
        // Session inactivity timeout. /api/session/activity handles the timer itself.
        if (idleTimeoutEnabled(policy.sessionTimeoutMinutes) && pathname !== '/api/session/activity') {
            const lastActive = readIdleCookie(request.cookies.get(IDLE_COOKIE)?.value, user.id)
            if (lastActive !== null && idleRemainingMs(lastActive, policy.sessionTimeoutMinutes) <= 0) {
                await supabase.auth.signOut({ scope: 'local' })
                if (isApi) {
                    const res = NextResponse.json({ error: 'Signed out after inactivity' }, { status: 401 })
                    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
                    return res
                }
                return redirectTo('/login', `?message=${encodeURIComponent(`You were signed out after ${policy.sessionTimeoutMinutes} minutes without activity. Please sign in again.`)}`)
            }
            // Page visits count as activity; prefetches and background calls don't.
            // No cookie yet (a session from before this rule): start the clock now.
            const prefetch = request.headers.has('next-router-prefetch') || request.headers.has('next-router-segment-prefetch') ||
                request.headers.get('sec-purpose')?.includes('prefetch') || request.headers.get('purpose') === 'prefetch'
            if (lastActive === null || (request.method === 'GET' && !isApi && !prefetch)) {
                const value = makeIdleCookie(user.id)
                if (value) supabaseResponse.cookies.set(IDLE_COOKIE, value, IDLE_COOKIE_OPTIONS)
            }
        }

        // Two-factor sign-in: an account with an authenticator app must enter its code;
        // when the Super Admin enforces 2FA, admin accounts must set one up first.
        if (!isTwoFactorPage) {
            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
            const hasFactor = aal?.nextLevel === 'aal2'
            const needsCode = hasFactor && aal?.currentLevel !== 'aal2'
            const needsSetup = !hasFactor && policy.enforce2FA && ['SUPER_ADMIN', 'ADMIN'].includes((await ownRole()) ?? '')
            if (needsCode || needsSetup) {
                if (isApi) return NextResponse.json({ error: 'Two-factor verification required' }, { status: 401 })
                return redirectTo('/two-factor', `?next=${encodeURIComponent(pathname + request.nextUrl.search)}`)
            }
        }
    }

    // Protected routes: redirect to login if not authenticated
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/register') ||
        request.nextUrl.pathname.startsWith('/forgot-password')

    // Website sections with sub-pages (company site + the Genesoft ERP product pages)
    const isWebsiteSection = ['/erp', '/services', '/portfolio', '/careers'].some(
        (p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(`${p}/`)
    )

    const isPublicPage = request.nextUrl.pathname === '/' ||
        isWebsiteSection ||
        request.nextUrl.pathname === '/pricing' || // redirects to /erp/pricing
        request.nextUrl.pathname === '/contact' ||
        request.nextUrl.pathname === '/privacy' ||
        request.nextUrl.pathname === '/terms' ||
        request.nextUrl.pathname === '/sitemap' ||
        request.nextUrl.pathname === '/refund-policy' ||
        request.nextUrl.pathname === '/delivery-policy' ||
        request.nextUrl.pathname === '/cookie-policy' ||
        request.nextUrl.pathname === '/dpa' ||
        request.nextUrl.pathname === '/rental-terms' || // 404 until published in Super Admin → Website
        request.nextUrl.pathname === '/about' ||
        request.nextUrl.pathname === '/robots.txt' || // for search engines
        request.nextUrl.pathname === '/sitemap.xml' ||
        request.nextUrl.pathname === '/unsubscribe' || // marketing email link, authorised by its signed token
        request.nextUrl.pathname === '/join' || // team invitation link, authorised by its signed token
        request.nextUrl.pathname === '/maintenance' ||
        request.nextUrl.pathname === '/reset-password' || // needs the recovery session from /auth/confirm, shows its own message without one
        request.nextUrl.pathname.startsWith('/auth/') || // email link handler (/auth/confirm)
        request.nextUrl.pathname.startsWith('/portal/') || // Customer portal, authorised by portal token
        request.nextUrl.pathname.startsWith('/forms/') || // Public web forms, embeddable on external sites
        request.nextUrl.pathname.startsWith('/api') // Allow API for and from Supabase

    const isAdminPage = request.nextUrl.pathname.startsWith('/admin')

    // Only the app's own areas send signed-out visitors to the sign-in page. Any other
    // address that doesn't exist gets the real "page not found" (a 404 for search engines)
    // instead of a login form.
    const isAppArea = APP_AREAS.some(
        (p) => request.nextUrl.pathname === p || request.nextUrl.pathname.startsWith(`${p}/`)
    )

    if (!user && !isAuthPage && !isPublicPage && isAppArea) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect logged-in users away from auth pages
    if (user && isAuthPage) {
        const { data: userData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        const url = request.nextUrl.clone()
        if (userData?.role === 'SUPER_ADMIN') {
            url.pathname = '/admin/dashboard'
        } else {
            url.pathname = '/reports'
        }
        return NextResponse.redirect(url)
    }

    // Government-filing modules are hidden until they're connected to the official APIs
    if (!COMPLIANCE_MODULES_ENABLED && isComplianceRoute(request.nextUrl.pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = '/finance/tax-summary'
        url.search = ''
        return NextResponse.redirect(url)
    }

    // Emails, WhatsApp, Web Forms and Bank Reconciliation are switched off
    if (!PARKED_MODULES_ENABLED && isParkedRoute(request.nextUrl.pathname)) {
        const url = request.nextUrl.clone()
        url.pathname = request.nextUrl.pathname.startsWith('/finance/') ? '/finance/reports' : '/crm/contacts'
        url.search = ''
        return NextResponse.redirect(url)
    }

    // Maintenance mode: only platform admins can use the app; webhooks, cron,
    // the customer portal and public forms keep working.
    if (gate?.maintenanceMode && user && !isPublicPage && !isAuthPage) {
        const { data: userData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (userData?.role !== 'SUPER_ADMIN') {
            const url = request.nextUrl.clone()
            url.pathname = '/maintenance'
            url.search = ''
            return NextResponse.redirect(url)
        }
    }

    // Admin role check (Platform level)
    if (user && isAdminPage) {
        const { data: userData } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()

        if (!userData || userData.role !== 'SUPER_ADMIN') {
            const url = request.nextUrl.clone()
            url.pathname = '/reports' // the business's dashboard
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
