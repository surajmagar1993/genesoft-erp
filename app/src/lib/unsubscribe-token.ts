import { createHmac, timingSafeEqual } from "crypto"

/**
 * Signed unsubscribe tokens for marketing emails: "<userId>.<hmac>".
 * They never expire, so a link in an old email still works. The key is
 * MARKETING_UNSUBSCRIBE_SECRET, else derived from ENCRYPTION_KEY or
 * CRON_SECRET (domain-separated, so the token reveals nothing about them).
 */
function signingKey(): string | null {
    const secret =
        process.env.MARKETING_UNSUBSCRIBE_SECRET ||
        process.env.ENCRYPTION_KEY ||
        process.env.CRON_SECRET
    return secret ? `genesoft-unsubscribe-v1:${secret}` : null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sign(userId: string, key: string): string {
    return createHmac("sha256", key).update(`unsubscribe:${userId.toLowerCase()}`).digest("base64url")
}

/** True when tokens can be made (a secret is configured). */
export function canSignUnsubscribeTokens(): boolean {
    return signingKey() !== null
}

export function createUnsubscribeToken(userId: string): string {
    const key = signingKey()
    if (!key) throw new Error("Set MARKETING_UNSUBSCRIBE_SECRET (or ENCRYPTION_KEY) to send marketing emails.")
    if (!UUID_RE.test(userId)) throw new Error("Invalid user id")
    return `${userId.toLowerCase()}.${sign(userId, key)}`
}

/** The user id in a valid token, else null. */
export function verifyUnsubscribeToken(token: string | null | undefined): string | null {
    const key = signingKey()
    if (!key || !token || token.length > 200) return null
    const [userId, sig] = token.split(".")
    if (!userId || !sig || !UUID_RE.test(userId)) return null
    const expected = Buffer.from(sign(userId, key))
    const given = Buffer.from(sig)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
    return userId.toLowerCase()
}
