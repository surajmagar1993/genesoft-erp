/**
 * Customer portal links (/portal/<token>) work for PORTAL_LINK_DAYS after they
 * are issued (owner's decision 2026-11-14). The business issues a new link from
 * the contact page (CRM → Contacts → a contact → Customer portal); the old one
 * stops working at once. Shared by the portal page, its actions and the PDF route.
 */
export const PORTAL_LINK_DAYS = 30

const DAY_MS = 24 * 60 * 60 * 1000

export function portalLinkExpiresAt(issuedAt: Date | null | undefined): Date | null {
    return issuedAt ? new Date(issuedAt.getTime() + PORTAL_LINK_DAYS * DAY_MS) : null
}

/** A link with no issue date (from before expiry existed) counts as expired. */
export function isPortalLinkExpired(issuedAt: Date | null | undefined, now: Date = new Date()): boolean {
    const expires = portalLinkExpiresAt(issuedAt)
    return !expires || expires.getTime() <= now.getTime()
}
