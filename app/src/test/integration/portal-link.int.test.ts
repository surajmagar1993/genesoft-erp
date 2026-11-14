import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { getPortalProfile } from "@/app/actions/portal/portal"
import { getPortalStatus, regeneratePortalToken, togglePortalAccess } from "@/app/actions/crm/portal-actions"
import { actAs, addUser, createCustomer, createTestTenant } from "./helpers"

const DAY = 24 * 60 * 60 * 1000

describe("customer portal links", () => {
    it("are turned on from the contact, work for 30 days and are replaced by a new link", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)

        const on = await togglePortalAccess(customer.id)
        expect(on.success).toBe(true)
        const token = on.status!.portalToken!
        expect(token).toMatch(/^[0-9a-f]{64}$/)
        expect(on.status!.expired).toBe(false)
        const expires = new Date(on.status!.expiresAt!).getTime()
        expect(Math.abs(expires - (Date.now() + 30 * DAY))).toBeLessThan(60_000)
        expect(await getPortalProfile(token)).toBeTruthy()

        // 31 days later the link no longer opens the portal
        await prisma.contact.update({ where: { id: customer.id }, data: { portalTokenIssuedAt: new Date(Date.now() - 31 * DAY) } })
        expect(await getPortalProfile(token)).toBeNull()
        expect((await getPortalStatus(customer.id))!.expired).toBe(true)

        // A new link works; the old one stays dead
        const fresh = await regeneratePortalToken(customer.id)
        const newToken = fresh.status!.portalToken!
        expect(newToken).not.toBe(token)
        expect(await getPortalProfile(newToken)).toBeTruthy()
        expect(await getPortalProfile(token)).toBeNull()

        // Turning it off closes the link; turning it on again keeps a link that still works
        await togglePortalAccess(customer.id)
        expect(await getPortalProfile(newToken)).toBeNull()
        const again = await togglePortalAccess(customer.id)
        expect(again.status!.portalToken).toBe(newToken)
    })

    it("turning an expired link back on issues a new one", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        const customer = await createCustomer(tenant.id)
        const first = (await togglePortalAccess(customer.id)).status!.portalToken!
        await togglePortalAccess(customer.id)
        await prisma.contact.update({ where: { id: customer.id }, data: { portalTokenIssuedAt: new Date(Date.now() - 40 * DAY) } })
        const back = await togglePortalAccess(customer.id)
        expect(back.status!.portalToken).not.toBe(first)
        expect(back.status!.expired).toBe(false)
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
        await expect(togglePortalAccess(customerB.id)).rejects.toThrow()
    })
})
