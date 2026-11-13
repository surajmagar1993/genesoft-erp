/** A same-site path to return to after sign-in steps; anything else becomes `fallback`. */
export function safeNextPath(next: unknown, fallback = "/reports"): string {
    if (typeof next !== "string") return fallback
    if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\") || /[\r\n]/.test(next)) return fallback
    if (next.startsWith("/two-factor") || next.startsWith("/login")) return fallback
    return next
}
