import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { getPendingInvites, getTeamMembers, inviteTeamMember, revokeInvite, setTeamMemberActive, updateTeamMember } from "@/app/actions/settings/team"
import { acceptInvite, getInviteDetails } from "@/app/actions/team-invite"
import { getTenantTeams, updateUserRole } from "@/app/actions/saas/admin"
import { createQuote } from "@/app/actions/sales/quotes"
import { createContact, getContacts } from "@/app/actions/crm/contacts"
import { createAccount, getAccounts } from "@/app/actions/finance/accounts"
import { getHROverview, submitLeaveRequest } from "@/app/actions/hr"
import { getMyAccess } from "@/lib/get-tenant-id"
import { uniformAccess, type ModuleAccess } from "@/lib/access"
import { actAs, addUser, createCustomer, createTestTenant } from "./helpers"

/** Runs a server action that ends in redirect() and returns where it redirected to. */
async function redirectOf(fn: () => Promise<unknown>): Promise<string> {
    try {
        await fn()
    } catch (err) {
        const digest = (err as { digest?: string }).digest || ""
        if (digest.startsWith("NEXT_REDIRECT")) return decodeURIComponent((digest.split(";")[2] || "").replace(/\+/g, " "))
        throw err
    }
    throw new Error("expected a redirect")
}

const tokenOf = (url: string) => decodeURIComponent(new URL(url).searchParams.get("token")!)
const form = (fields: Record<string, string>) => {
    const f = new FormData()
    for (const [k, v] of Object.entries(fields)) f.set(k, v)
    return f
}
const salesStaff: ModuleAccess = { ...uniformAccess("NONE"), sales: "EDIT", finance: "VIEW" }

async function inviteAndJoin(email: string, access: ModuleAccess, role: "ADMIN" | "MEMBER" = "MEMBER") {
    const res = await inviteTeamMember({ email, fullName: "Priya Sharma", role, access })
    expect(res.success).toBe(true)
    expect(res.emailSent).toBe(false) // no Resend key in tests: the admin gets the link to share
    const token = tokenOf(res.inviteUrl!)
    expect(await redirectOf(() => acceptInvite(form({ token, fullName: "Priya Sharma", password: "s3cret-pass", confirmPassword: "s3cret-pass" })))).toMatch(/joined the team/)
    return prisma.user.findFirstOrThrow({ where: { email } })
}

describe("team invitations and module access", () => {
    it("an admin invites a member who joins with exactly the access chosen", async () => {
        const { tenant, user: admin } = await createTestTenant()
        actAs(admin)
        const email = `priya-${crypto.randomUUID().slice(0, 6)}@example.test`
        const res = await inviteTeamMember({ email, fullName: "Priya Sharma", role: "MEMBER", access: salesStaff })
        const token = tokenOf(res.inviteUrl!)
        expect(await getInviteDetails(token)).toMatchObject({ ok: true, email, isAdmin: false })
        expect((await getPendingInvites()).map((i) => i.email)).toEqual([email])
        expect(await redirectOf(() => acceptInvite(form({ token, password: "short", confirmPassword: "short" })))).toMatch(/at least 8/)

        expect(await redirectOf(() => acceptInvite(form({ token, fullName: "Priya S", password: "s3cret-pass", confirmPassword: "s3cret-pass", email: "attacker@example.test" })))).toMatch(/joined/)
        const member = await prisma.user.findFirstOrThrow({ where: { email } }) // the invite's email, not the form's
        expect(member).toMatchObject({ tenantId: tenant.id, role: "USER", fullName: "Priya S" })
        expect(await getPendingInvites()).toEqual([])
        expect((await getInviteDetails(token)).ok).toBe(false) // single use

        const team = await getTeamMembers()
        expect(team.find((m) => m.id === member.id)?.access).toEqual(salesStaff)

        // What the member can do
        actAs({ id: member.id, email })
        expect((await getMyAccess()).access).toEqual(salesStaff)
        const customer = await createCustomer(tenant.id)
        expect((await getContacts()).total).toBe(1) // customers are a lookup for sales
        expect((await createContact({ display_name: "X", type: "INDIVIDUAL" } as never)).error).toMatch(/don't have access to CRM/)
        const q = await createQuote({ quote_number: "Q-1", customer_name: "C", customer_email: "", quote_date: "2026-10-01", valid_until: "", reference: "", status: "DRAFT", discount: 0, discount_type: "PERCENT", notes: "", terms_and_conditions: "", contact_id: customer.id, currency_code: "INR", line_items: [{ product_name: "Work", qty: 1, unit_price: 100, tax_percent: 0 }] } as never)
        expect(q.error).toBeNull()
        expect((await getAccounts()).data).toBeDefined()
        expect((await createAccount({ code: "9999", name: "X", type: "EXPENSE" } as never)).error).toMatch(/can only view Finance/)
        await expect(getHROverview()).rejects.toThrow(/don't have access to HR/)
        expect((await inviteTeamMember({ email: "x@example.test", fullName: "X", role: "MEMBER" })).error).toMatch(/workspace admins/)
    })

    it("self-service leave still works without HR access", async () => {
        const { tenant, user: admin } = await createTestTenant()
        actAs(admin)
        const email = `staff-${crypto.randomUUID().slice(0, 6)}@example.test`
        const member = await inviteAndJoin(email, uniformAccess("NONE"))
        const own = await prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: "E-1", firstName: "Staff", displayName: "Staff", email, userId: member.id } as never })
        const other = await prisma.employee.create({ data: { tenantId: tenant.id, employeeNumber: "E-2", firstName: "Other", displayName: "Other", email: "o@example.test" } as never })
        actAs({ id: member.id, email })
        expect((await submitLeaveRequest({ employeeId: own.id, type: "CASUAL" as never, startDate: "2026-11-02", endDate: "2026-11-03", reason: "Trip" })).leave).toBeTruthy()
        await expect(submitLeaveRequest({ employeeId: other.id, type: "CASUAL" as never, startDate: "2026-11-02", endDate: "2026-11-03", reason: "x" })).rejects.toThrow(/your own/)
    })

    it("cancelled invites stop working; admins edit access; the last admin is protected", async () => {
        const { tenant, user: admin } = await createTestTenant()
        actAs(admin)
        const res = await inviteTeamMember({ email: `c-${crypto.randomUUID().slice(0, 6)}@example.test`, fullName: "C", role: "MEMBER", access: salesStaff })
        const [invite] = await getPendingInvites()
        expect((await revokeInvite(invite.id)).success).toBe(true)
        expect(await getInviteDetails(tokenOf(res.inviteUrl!))).toMatchObject({ ok: false, error: expect.stringMatching(/cancelled/) })

        const viewer = await addUser(tenant.id, "VIEWER") // an older role: becomes view-everything by default
        expect((await getTeamMembers()).find((m) => m.id === viewer.id)?.access).toEqual(uniformAccess("VIEW"))
        expect((await updateTeamMember(viewer.id, { role: "MEMBER", access: { ...uniformAccess("VIEW"), crm: "FULL" } })).success).toBe(true)
        actAs(viewer)
        expect((await getMyAccess()).access.crm).toBe("FULL")
        actAs(admin)
        expect((await updateTeamMember(viewer.id, { role: "ADMIN" })).success).toBe(true)
        expect((await updateTeamMember(admin.id, { role: "MEMBER" })).error).toMatch(/your own/)
        expect((await updateTeamMember(viewer.id, { role: "MEMBER" })).success).toBe(true) // admin still left
        expect((await setTeamMemberActive(viewer.id, false)).success).toBe(true)

        // Another business can't touch these people
        const other = await createTestTenant()
        actAs(other.user)
        expect((await updateTeamMember(viewer.id, { role: "ADMIN" })).error).toMatch(/not found/)
        expect((await inviteTeamMember({ email: admin.email, fullName: "A", role: "MEMBER" })).error).toMatch(/another workspace/)
    })

    it("the Super Admin sees every business's users and access but can't change their roles", async () => {
        const { tenant, user: admin } = await createTestTenant({ name: "Visible Traders" })
        actAs(admin)
        const email = `m-${crypto.randomUUID().slice(0, 6)}@example.test`
        const member = await inviteAndJoin(email, salesStaff)
        await inviteTeamMember({ email: `p-${crypto.randomUUID().slice(0, 6)}@example.test`, fullName: "Pending Person", role: "MEMBER", access: salesStaff })

        const platform = await createTestTenant({ role: "SUPER_ADMIN", name: "Genesoft Platform" })
        actAs(platform.user)
        const { teams } = await getTenantTeams({ tenantId: tenant.id })
        expect(teams).toHaveLength(1)
        expect(teams[0].tenant.name).toBe("Visible Traders")
        expect(teams[0].members.map((m) => [m.email, m.isAdmin ? "admin" : "member"])).toEqual(expect.arrayContaining([[admin.email, "admin"], [email, "member"]]))
        expect(teams[0].members.find((m) => m.id === member.id)?.accessSummary).toBe("Sales: Edit · Finance: View")
        expect(teams[0].invites.map((i) => i.fullName)).toEqual(["Pending Person"])
        expect((await getTenantTeams({ search: "visible traders", role: "MEMBER" })).teams[0].members.map((m) => m.email)).toEqual([email])

        const res = await updateUserRole(member.id, "ADMIN")
        expect(res).toMatchObject({ success: false })
        expect(JSON.stringify(res)).toMatch(/Settings → Team/)
    })
})
