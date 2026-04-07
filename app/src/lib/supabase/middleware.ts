import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
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

    // Protected routes: redirect to login if not authenticated
    const isAuthPage = request.nextUrl.pathname.startsWith('/login') ||
        request.nextUrl.pathname.startsWith('/register') ||
        request.nextUrl.pathname.startsWith('/forgot-password')

    const isPublicPage = request.nextUrl.pathname === '/' ||
        request.nextUrl.pathname.startsWith('/api') // Allow API for and from Supabase

    const isAdminPage = request.nextUrl.pathname.startsWith('/admin')

    if (!user && !isAuthPage && !isPublicPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
    }

    // Redirect logged-in users away from auth pages
    if (user && isAuthPage) {
        const url = request.nextUrl.clone()
        url.pathname = '/crm/contacts'
        return NextResponse.redirect(url)
    }

    // Admin role check (Platform level)
    if (user && isAdminPage) {
        const { data: userData } = await supabase
            .from('profiles')
            .select('role')
            .eq('auth_id', user.id)
            .single()

        if (!userData || userData.role !== 'SUPER_ADMIN') {
            const url = request.nextUrl.clone()
            url.pathname = '/crm/contacts' // Standard dashboard if not platform admin
            return NextResponse.redirect(url)
        }
    }

    return supabaseResponse
}
