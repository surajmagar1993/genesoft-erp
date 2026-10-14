import type { Instrumentation } from "next"

/**
 * Next.js calls this for every uncaught server error (pages, route handlers,
 * server actions, proxy). It goes to System Logs and, for a new error, an
 * email alert (see src/lib/error-reporting.ts).
 */
export const onRequestError: Instrumentation.onRequestError = async (err, request, context) => {
    if (process.env.NEXT_RUNTIME !== "nodejs") return
    const { reportError } = await import("@/lib/error-reporting")
    const error = err as Error & { digest?: string }
    await reportError({
        source: "server",
        message: error?.message || String(err),
        stack: error?.stack,
        digest: error?.digest,
        path: request.path,
        method: request.method,
        kind: context.routeType,
    })
}
