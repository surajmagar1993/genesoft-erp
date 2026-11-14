import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { getPortalProfile } from "@/app/actions/portal/portal"
import { getPortalStatus, regeneratePortalToken, togglePortalAccess } from "@/app/actions/crm/portal-actions"
import { actAs, addUser, createCustomer, createTestTenant } from "./helpers"
import { unwrap } from "@/lib/action-result"

const DAY = 24 * 60 * 60 * 1000

describe("customer portal links", () => {
    it("are turned on from the contact, work for 30 days and are replaced by a new link", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)

        const on = unwrap(await togglePortalAccess(customer.id))
        const token = on.portalToken!
        expect(token).toMatch(/^[0-9a-f]{64}$/)
        expect(on.expired).toBe(false)
        const expires = new Date(on.expiresAt!).getTime()
        expect(Math.abs(expires - (Date.now() + 30 * DAY))).toBeLessThan(60_000)
        expect(await getPortalProfile(token)).toBeTruthy()

        // 31 days later the link no longer opens the portal
        await prisma.contact.update({ where: { id: customer.id }, data: { portalTokenIssuedAt: new Date(Date.now() - 31 * DAY) } })
        expect(await getPortalProfile(token)).toBeNull()
        expect((await getPortalStatus(customer.id))!.expired).toBe(true)

        // A new link works; the old one stays dead
        const newToken = unwrap(await regeneratePortalToken(customer.id)).portalToken!
        expect(newToken).not.toBe(token)
        expect(await getPortalProfile(newToken)).toBeTruthy()
        expect(await getPortalProfile(token)).toBeNull()

        // Turning it off closes the link; turning it on again keeps a link that still works
        await togglePortalAccess(customer.id)
        expect(await getPortalProfile(newToken)).toBeNull()
        expect(unwrap(await togglePortalAccess(customer.id)).portalToken).toBe(newToken)
    })

    it("turning an expired link back on issues a new one", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const first = unwrap(await togglePortalAccess(customer.id)).portalToken!
        await togglePortalAccess(customer.id)
        await prisma.contact.update({ where: { id: customer.id }, data: { portalTokenIssuedAt: new Date(Date.now() - 40 * DAY) } })
        const back = unwrap(await togglePortalAccess(customer.id))
        expect(back.portalToken).not.toBe(first)
        expect(back.expired).toBe(false)
    })

    it("can only be changed by Full-access members, and only for the member's own business", async () => {
        const a = await createTestTenant()
        const b = await createTestTenant()
        const customerB = await createCustomer(b.tenant.id)

        actAs(a.user)
        expect((await togglePortalAccess(customerB.id)).success).toBe(false)
        expect((await regeneratePortalToken(customerB.id)).success).toBe(false)
        expect(await getPortalStatus(customerB.id)).toBeNull()

        const staff = await addUser(b.tenant.id, "USER")
        actAs(staff)
        const denied = await togglePortalAccess(customerB.id)
        expect(denied.success).toBe(false)
        expect(denied.success ? "" : denied.error).toMatch(/access|permission/i)

        // Changes show in the business's activity log
        actAs(b.user)
        unwrap(await togglePortalAccess(customerB.id))
        unwrap(await regeneratePortalToken(customerB.id))
        const actions = (await prisma.tenantAuditLog.findMany({ where: { tenantId: b.tenant.id }, select: { action: true } })).map((r) => r.action)
        expect(actions).toEqual(expect.arrayContaining(["CUSTOMER_PORTAL_ENABLED", "CUSTOMER_PORTAL_LINK_RENEWED"]))
    })
})
