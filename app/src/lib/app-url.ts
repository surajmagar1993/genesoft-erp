/**
 * Public base URL of the app for links in emails, gateway redirects and
 * webhooks. NEXT_PUBLIC_SITE_URL is set on every Vercel environment;
 * NEXT_PUBLIC_APP_URL is the older name. No trailing slash.
 */
export function appUrl(): string {
    const url =
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
    return url.replace(/\/+$/, "")
}
