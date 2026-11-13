/** A same-site path to return to after sign-in steps; anything else becomes `fallback`. */
export function safeNextPath(next: unknown, fallback = "/reports"): string {
    if (typeof next !== "string") return fallback
    // Browsers and the URL parser drop tabs/newlines and read "\\" as "/", so "/\t/evil.com"
    // or "/\\evil.com" would become another site: refuse any control character or backslash.
    if (!next.startsWith("/") || next.startsWith("//") || /[\u0000-\u001f\u007f\\]/.test(next)) return fallback
    if (next.startsWith("/two-factor") || next.startsWith("/login")) return fallback
    return next
}
