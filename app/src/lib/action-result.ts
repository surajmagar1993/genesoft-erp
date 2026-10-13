/**
 * Server actions return errors instead of throwing them: in production Next.js
 * replaces a thrown error's message with a generic one, so the user would never
 * see "Domain is already taken". Call the action, then unwrap() on the client
 * to get the data or an Error with the real message.
 */
export type ActionResult<T> = { success: true; data: T } | { success: false; error: string }

export async function toActionResult<T>(fn: () => Promise<T>): Promise<ActionResult<T>> {
    try {
        return { success: true, data: await fn() }
    } catch (err) {
        // Let Next.js redirects / notFound through
        if (err && typeof err === "object" && "digest" in err && String((err as { digest: unknown }).digest).startsWith("NEXT_")) throw err
        return { success: false, error: err instanceof Error ? err.message : "Something went wrong" }
    }
}

export function unwrap<T>(result: ActionResult<T>): T {
    if (!result.success) throw new Error(result.error)
    return result.data
}
