/**
 * Whether search engines may index this deployment. Only the real website
 * (NEXT_PUBLIC_SITE_URL on genesoftinfotech.com) is indexed; test and preview
 * copies (genesoftdev.vercel.app, *.vercel.app, localhost) ask not to be, so
 * they never compete with the real site. NEXT_PUBLIC_ALLOW_INDEXING=true/false
 * overrides it.
 */
export function indexingAllowed(): boolean {
    const forced = process.env.NEXT_PUBLIC_ALLOW_INDEXING
    if (forced === "true") return true
    if (forced === "false") return false
    const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL || ""
    try {
        const host = new URL(site).hostname.toLowerCase()
        return host === "genesoftinfotech.com" || host.endsWith(".genesoftinfotech.com")
    } catch {
        return false
    }
}
