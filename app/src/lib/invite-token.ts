import { createHmac, timingSafeEqual } from "crypto"

/**
 * Signed team-invite links: "<tenantId>.<inviteId>.<expiresAtMs>.<hmac>".
 * The invite itself lives in tenants.settings.team.invites, so cancelling it
 * there kills the link even before it expires. Key: ENCRYPTION_KEY (or
 * CRON_SECRET), domain-separated so the token reveals nothing about it.
 */
function signingKey(): string | null {
    const secret = process.env.ENCRYPTION_KEY || process.env.CRON_SECRET
    return secret ? `genesoft-team-invite-v1:${secret}` : null
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function sign(payload: string, key: string): string {
    return createHmac("sha256", key).update(`invite:${payload}`).digest("base64url")
}

export function createInviteToken(tenantId: string, inviteId: string, expiresAt: Date): string {
    const key = signingKey()
    if (!key) throw new Error("Set ENCRYPTION_KEY to send team invites.")
    if (!UUID_RE.test(tenantId) || !UUID_RE.test(inviteId)) throw new Error("Invalid invite")
    const payload = `${tenantId.toLowerCase()}.${inviteId.toLowerCase()}.${expiresAt.getTime()}`
    return `${payload}.${sign(payload, key)}`
}

/** The tenant and invite in a valid, unexpired token, else null. */
export function verifyInviteToken(token: string | null | undefined, now = Date.now()): { tenantId: string; inviteId: string; expiresAt: Date } | null {
    const key = signingKey()
    if (!key || !token || token.length > 300) return null
    const parts = token.split(".")
    if (parts.length !== 4) return null
    const [tenantId, inviteId, exp, sig] = parts
    if (!UUID_RE.test(tenantId) || !UUID_RE.test(inviteId) || !/^\d{10,16}$/.test(exp)) return null
    const expected = Buffer.from(sign(`${tenantId}.${inviteId}.${exp}`, key))
    const given = Buffer.from(sig)
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null
    if (Number(exp) < now) return null
    return { tenantId, inviteId, expiresAt: new Date(Number(exp)) }
}
