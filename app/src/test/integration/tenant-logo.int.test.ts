import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { removeTenantLogo, updateTenantSettings, uploadTenantLogo } from "@/app/actions/settings/tenant"
import { actAs, addUser, createTestTenant } from "./helpers"

const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13])
const form = (bytes: Buffer | Uint8Array, name = "logo.png", type = "image/png") => {
    const f = new FormData()
    f.set("logo", new File([new Uint8Array(bytes)], name, { type }))
    return f
}

describe("business logo (Settings → Organization & Branding)", () => {
    it("only PNG or JPEG up to 1 MB, checked by the file's bytes", async () => {
        const { user } = await createTestTenant()
        actAs(user)
        expect(await uploadTenantLogo(form(Buffer.from("<svg></svg>"), "logo.png"))).toMatchObject({ success: false, error: expect.stringMatching(/PNG or JPG/) })
        expect(await uploadTenantLogo(form(Buffer.alloc(1024 * 1024 + 1, 1)))).toMatchObject({ success: false, error: expect.stringMatching(/1 MB/) })
        expect(await uploadTenantLogo(new FormData())).toMatchObject({ success: false, error: expect.stringMatching(/Choose an image/) })
    })

    it("a valid file without the storage key gives a clear message", async () => {
        const { user } = await createTestTenant()
        actAs(user)
        expect(await uploadTenantLogo(form(PNG))).toMatchObject({ success: false, error: expect.stringMatching(/SUPABASE_SERVICE_ROLE_KEY/) })
    })

    it("only workspace admins can change the logo", async () => {
        const { tenant } = await createTestTenant()
        actAs(await addUser(tenant.id, "MANAGER"))
        expect(await uploadTenantLogo(form(PNG))).toMatchObject({ success: false, error: expect.stringMatching(/admins/) })
        expect(await removeTenantLogo()).toMatchObject({ success: false })
    })

    it("a logo URL can't be set through the general settings save, and remove clears it", async () => {
        const { tenant, user } = await createTestTenant()
        actAs(user)
        await updateTenantSettings({ name: "Logo Test Ltd", logo_url: "https://evil.example/x.png" })
        expect((await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })).logoUrl).toBeNull()

        await prisma.tenant.update({ where: { id: tenant.id }, data: { logoUrl: "data:image/png;base64,AAAA" } })
        expect(await removeTenantLogo()).toEqual({ success: true, data: { removed: true } })
        expect((await prisma.tenant.findUniqueOrThrow({ where: { id: tenant.id } })).logoUrl).toBeNull()
    })
})
