import type { ActionResult } from "@/lib/action-result"
import { reportError } from "@/lib/error-reporting"

/**
 * Runs a server action body and returns its result as ActionResult, so the
 * screen can show the real message (Next.js hides a thrown error's text in
 * production). The client calls unwrap() (src/lib/action-result.ts), which
 * throws an Error with that message, so existing try/catch + toast keeps
 * working.
 *
 * Messages the code means for the user (a plain `throw new Error("…")`) are
 * returned as they are and aren't alerts. Anything else (database errors,
 * TypeErrors, bugs) is still reported to System Logs / the alert email, and
 * the user gets a generic message. Server only.
 */
export function isUserMessage(err: unknown): err is Error {
    if (!(err instanceof Error)) return false
    // Errors written for the user: a plain Error, or one marked with userFacing (e.g. PlanLimitError)
    const meant = err.constructor === Error || (err as { userFacing?: unknown }).userFacing === true
    return meant && !/prisma|invocation|ECONN|timeout/i.test(err.message)
}

export async function safeAction<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
    try {
        return { success: true, data: await fn() }
    } catch (err) {
        // Let Next.js redirects / notFound through
        if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err
        if (isUserMessage(err)) return { success: false, error: err.message }
        await reportError({
            source: "server",
            kind: "action",
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
        })
        return { success: false, error: "Something went wrong. It has been reported to the Genesoft team; please try again." }
    }
}
