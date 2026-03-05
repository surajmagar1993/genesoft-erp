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

    const isPublicPage = request.nextUrl.pathname === '/'

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

    return supabaseResponse
}
