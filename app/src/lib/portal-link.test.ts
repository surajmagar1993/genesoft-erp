import { describe, expect, it } from "vitest"
import { isPortalLinkExpired, portalLinkExpiresAt, PORTAL_LINK_DAYS } from "./portal-link"

describe("customer portal link expiry", () => {
    const issued = new Date("2026-11-01T10:00:00Z")

    it("lasts 30 days from when it was issued", () => {
        expect(PORTAL_LINK_DAYS).toBe(30)
        expect(portalLinkExpiresAt(issued)?.toISOString()).toBe("2026-12-01T10:00:00.000Z")
    })

    it("works until then and not after", () => {
        expect(isPortalLinkExpired(issued, new Date("2026-11-30T23:59:59Z"))).toBe(false)
        expect(isPortalLinkExpired(issued, new Date("2026-12-01T10:00:00Z"))).toBe(true)
    })

    it("treats a link without an issue date as expired", () => {
        expect(isPortalLinkExpired(null)).toBe(true)
        expect(portalLinkExpiresAt(null)).toBeNull()
    })
})
