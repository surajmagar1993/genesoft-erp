/**
 * Sends a browser-side crash to System Logs. Errors with a digest came from
 * the server and were already logged there, so they're skipped. Never throws.
 */
export function reportClientError(error: Error & { digest?: string }) {
    if (error.digest || typeof window === "undefined") return
    try {
        void fetch("/api/client-error", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ message: error.message, stack: error.stack, path: window.location.pathname }),
            keepalive: true,
        }).catch(() => undefined)
    } catch {
        // ignore
    }
}
