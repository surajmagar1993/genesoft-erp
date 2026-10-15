"use server"

import { prisma } from "@/lib/prisma"
import { getTenantAdminId } from "@/lib/get-tenant-id"
import { getCurrentUser } from "@/lib/current-user"
import { revalidatePath } from "next/cache"
import { appUrl } from "@/lib/app-url"
import { sendSystemEmail } from "@/lib/system-email"
import { createInviteToken } from "@/lib/invite-token"
import { INVITE_DAYS, readTeam, updateTeam, type InviteRole } from "@/lib/team-settings"
import { planLimitError } from "@/lib/plan-limits"
import { isAdminRole, resolveAccess, uniformAccess, type ModuleAccess } from "@/lib/access"
import { logTenantAudit } from "@/lib/tenant-audit"

/** Admin: everything incl. team and settings. Member: what their module access allows. */
export type TeamRole = InviteRole

export interface TeamMember {
    id: string
    fullName: string | null
    email: string
    /** The stored role (ADMIN, MANAGER, USER, VIEWER, SUPER_ADMIN) */
    role: string
    isAdmin: boolean
    access: ModuleAccess
    isActive: boolean
    isSelf: boolean
    createdAt: string
}

export interface PendingInvite {
    id: string
    email: string
    fullName: string
    role: InviteRole
    access: ModuleAccess
    invitedByName: string
    createdAt: string
    expiresAt: string
    expired: boolean
    /** The link to share if the email didn't arrive */
    inviteUrl: string
}

async function getCallerId(): Promise<string> {
    const user = await getCurrentUser()
    if (!user) throw new Error("Unauthorized")
    return user.id
}

export async function getTeamMembers(): Promise<TeamMember[]> {
    const tenantId = await getTenantAdminId()
    const callerId = await getCallerId()

    const [users, tenant] = await Promise.all([
        prisma.user.findMany({
            where: { tenantId },
            orderBy: [{ createdAt: "asc" }],
            select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
        }),
        prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } }),
    ])
    const team = readTeam(tenant?.settings)

    return users.map((u) => ({
        ...u,
        isAdmin: isAdminRole(u.role),
        access: resolveAccess(u.role, team.access[u.id]),
        isSelf: u.id === callerId,
        createdAt: u.createdAt.toISOString(),
    }))
}

export async function getPendingInvites(): Promise<PendingInvite[]> {
    const tenantId = await getTenantAdminId()
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } })
    const now = Date.now()
    return readTeam(tenant?.settings).invites.map((i) => ({
        id: i.id,
        email: i.email,
        fullName: i.fullName,
        role: i.role,
        access: i.access,
        invitedByName: i.invitedByName,
        createdAt: i.createdAt,
        expiresAt: i.expiresAt,
        expired: new Date(i.expiresAt).getTime() < now,
        inviteUrl: inviteUrl(tenantId, i.id, new Date(i.expiresAt)),
    }))
}

function inviteUrl(tenantId: string, inviteId: string, expiresAt: Date): string {
    return `${appUrl()}/join?token=${encodeURIComponent(createInviteToken(tenantId, inviteId, expiresAt))}`
}

/**
 * Loads a member of the caller's workspace that the caller may change:
 * not themselves (so an admin can't lock themselves out) and not a
 * platform SUPER_ADMIN.
 */
async function getEditableMember(tenantId: string, userId: string) {
    const callerId = await getCallerId()
    if (userId === callerId) throw new Error("You can't change your own role or status.")

    const member = await prisma.user.findFirst({
        where: { id: userId, tenantId },
        select: { id: true, email: true, role: true, isActive: true },
    })
    if (!member) throw new Error("Team member not found")
    if (member.role === "SUPER_ADMIN") throw new Error("Platform administrators can't be changed here.")
    return member
}

/** True if removing this member's admin rights would leave the workspace with no active admin. */
async function isLastActiveAdmin(tenantId: string, userId: string): Promise<boolean> {
    const otherAdmins = await prisma.user.count({
        where: { tenantId, role: "ADMIN", isActive: true, id: { not: userId } },
    })
    return otherAdmins === 0
}

/**
 * Makes someone an admin, or a member with the given module access. A member
 * keeps their current access when none is given.
 */
export async function updateTeamMember(
    userId: string,
    change: { role: TeamRole; access?: ModuleAccess }
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()
        if (change.role !== "ADMIN" && change.role !== "MEMBER") return { success: false, error: "Invalid role" }

        const member = await getEditableMember(tenantId, userId)
        if (change.role === "MEMBER" && member.role === "ADMIN" && member.isActive && (await isLastActiveAdmin(tenantId, userId))) {
            return { success: false, error: "The workspace needs at least one active admin." }
        }

        await prisma.$transaction(async (tx) => {
            if (change.role === "ADMIN") {
                await tx.user.updateMany({ where: { id: userId, tenantId }, data: { role: "ADMIN" } })
                await updateTeam(tenantId, (t) => {
                    const access = { ...t.access }
                    delete access[userId]
                    return { ...t, access }
                }, tx)
                return
            }
            // Members are stored as USER; their module access decides the rest. An admin
            // turned member starts with edit access unless the form sent something.
            const current = resolveAccess(member.role, readTeam((await tx.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } }))?.settings).access[userId])
            const access = change.access
                ? resolveAccess("USER", change.access)
                : isAdminRole(member.role) ? uniformAccess("EDIT") : current
            await tx.user.updateMany({ where: { id: userId, tenantId }, data: { role: "USER" } })
            await updateTeam(tenantId, (t) => ({ ...t, access: { ...t.access, [userId]: access } }), tx)
        })

        revalidatePath("/settings")
        revalidatePath("/admin/users")
        await logTenantAudit(tenantId, "TEAM_MEMBER_UPDATED", { target: { type: "USER", id: userId }, metadata: { memberEmail: member.email, role: change.role, ...(change.access ? { access: change.access } : {}) } })
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to update the member" }
    }
}

export async function setTeamMemberActive(
    userId: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()

        const member = await getEditableMember(tenantId, userId)
        if (isActive && !member.isActive) {
            const limit = await planLimitError(tenantId, "users")
            if (limit) return { success: false, error: limit }
        }
        if (!isActive && member.role === "ADMIN" && member.isActive && (await isLastActiveAdmin(tenantId, userId))) {
            return { success: false, error: "The workspace needs at least one active admin." }
        }

        const { count } = await prisma.user.updateMany({
            where: { id: userId, tenantId },
            data: { isActive },
        })
        if (count === 0) return { success: false, error: "Team member not found" }

        revalidatePath("/settings")
        revalidatePath("/admin/users")
        await logTenantAudit(tenantId, isActive ? "TEAM_MEMBER_REACTIVATED" : "TEAM_MEMBER_DEACTIVATED", { target: { type: "USER", id: userId }, metadata: { memberEmail: member.email } })
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to update status" }
    }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Invites someone by email: they get a link to set a password and join this
 * workspace with the role and module access chosen here. Inviting the same
 * email again replaces the earlier invite (and its link).
 */
export async function inviteTeamMember(input: {
    email: string
    fullName: string
    role: TeamRole
    access?: ModuleAccess
}): Promise<{ success: boolean; error?: string; inviteUrl?: string; emailSent?: boolean; emailError?: string }> {
    try {
        const tenantId = await getTenantAdminId()
        const caller = await getCurrentUser()
        if (!caller) throw new Error("Unauthorized")
        const email = String(input.email || "").trim().toLowerCase()
        const fullName = String(input.fullName || "").trim()
        if (!EMAIL_RE.test(email)) return { success: false, error: "Enter a valid email address" }
        if (!fullName) return { success: false, error: "Enter the person's name" }
        if (input.role !== "ADMIN" && input.role !== "MEMBER") return { success: false, error: "Invalid role" }

        const existing = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } }, select: { tenantId: true } })
        if (existing?.tenantId === tenantId) return { success: false, error: "This person is already in your team." }
        if (existing) return { success: false, error: "This email already has a Genesoft account in another workspace. Ask them to use a different email." }

        // A new invite takes a seat on the plan; re-inviting the same email replaces the old one
        const settings = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } })
        const replacing = readTeam(settings?.settings).invites.some((i) => i.email === email && new Date(i.expiresAt).getTime() > Date.now())
        const limit = await planLimitError(tenantId, "users", { adding: replacing ? 0 : 1 })
        if (limit) return { success: false, error: limit }

        const [tenant, inviter] = await Promise.all([
            prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
            prisma.user.findUnique({ where: { id: caller.id }, select: { fullName: true, email: true } }),
        ])
        const invitedByName = inviter?.fullName || inviter?.email || "Your admin"
        const id = crypto.randomUUID()
        const expiresAt = new Date(Date.now() + INVITE_DAYS * 24 * 3600 * 1000)
        await updateTeam(tenantId, (t) => ({
            ...t,
            invites: [
                ...t.invites.filter((i) => i.email !== email),
                {
                    id,
                    email,
                    fullName,
                    role: input.role,
                    access: input.role === "ADMIN" ? uniformAccess("FULL") : resolveAccess("USER", input.access ?? uniformAccess("VIEW")),
                    invitedBy: caller.id,
                    invitedByName,
                    createdAt: new Date().toISOString(),
                    expiresAt: expiresAt.toISOString(),
                },
            ],
        }))

        const url = inviteUrl(tenantId, id, expiresAt)
        const mail = await sendSystemEmail("TEAM_INVITE", email, {
            invitee_name: fullName,
            inviter_name: invitedByName,
            company_name: tenant?.name || "your team",
            invite_url: url,
            expires_on: expiresAt.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }),
        })

        revalidatePath("/settings")
        revalidatePath("/admin/users")
        await logTenantAudit(tenantId, "TEAM_INVITE_SENT", { target: { type: "INVITE", id }, metadata: { email, role: input.role, emailSent: mail.sent } })
        return { success: true, inviteUrl: url, emailSent: mail.sent, emailError: mail.reason }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to send the invite" }
    }
}

/** Sends a pending invite again with a fresh 7-day link. */
export async function resendInvite(inviteId: string): Promise<{ success: boolean; error?: string; inviteUrl?: string; emailSent?: boolean; emailError?: string }> {
    try {
        const tenantId = await getTenantAdminId()
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { settings: true } })
        const invite = readTeam(tenant?.settings).invites.find((i) => i.id === inviteId)
        if (!invite) return { success: false, error: "Invite not found" }
        await updateTeam(tenantId, (t) => ({ ...t, invites: t.invites.filter((i) => i.id !== inviteId) }))
        return inviteTeamMember({ email: invite.email, fullName: invite.fullName, role: invite.role, access: invite.access })
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to resend the invite" }
    }
}

/** Cancels a pending invite; its link stops working at once. */
export async function revokeInvite(inviteId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()
        let found = false
        await updateTeam(tenantId, (t) => {
            found = t.invites.some((i) => i.id === inviteId)
            return { ...t, invites: t.invites.filter((i) => i.id !== inviteId) }
        })
        if (!found) return { success: false, error: "Invite not found" }
        await logTenantAudit(tenantId, "TEAM_INVITE_REVOKED", { target: { type: "INVITE", id: inviteId } })
        revalidatePath("/settings")
        revalidatePath("/admin/users")
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to cancel the invite" }
    }
}
