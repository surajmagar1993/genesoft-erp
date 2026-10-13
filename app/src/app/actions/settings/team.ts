"use server"

import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { getTenantAdminId } from "@/lib/get-tenant-id"
import { revalidatePath } from "next/cache"

export type TeamRole = "ADMIN" | "MANAGER" | "USER" | "VIEWER"

const TEAM_ROLES: TeamRole[] = ["ADMIN", "MANAGER", "USER", "VIEWER"]

export interface TeamMember {
    id: string
    fullName: string | null
    email: string
    role: string
    isActive: boolean
    isSelf: boolean
    createdAt: string
}

async function getCallerId(): Promise<string> {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")
    return user.id
}

export async function getTeamMembers(): Promise<TeamMember[]> {
    const tenantId = await getTenantAdminId()
    const callerId = await getCallerId()

    const users = await prisma.user.findMany({
        where: { tenantId },
        orderBy: [{ createdAt: "asc" }],
        select: { id: true, fullName: true, email: true, role: true, isActive: true, createdAt: true },
    })

    return users.map((u: { id: string; fullName: string | null; email: string; role: string; isActive: boolean; createdAt: Date }) => ({
        ...u,
        isSelf: u.id === callerId,
        createdAt: u.createdAt.toISOString(),
    }))
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

export async function updateTeamMemberRole(
    userId: string,
    role: TeamRole
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()
        if (!TEAM_ROLES.includes(role)) return { success: false, error: "Invalid role" }

        const member = await getEditableMember(tenantId, userId)
        if (member.role === role) return { success: true }
        if (member.role === "ADMIN" && member.isActive && (await isLastActiveAdmin(tenantId, userId))) {
            return { success: false, error: "The workspace needs at least one active admin." }
        }

        const { count } = await prisma.user.updateMany({
            where: { id: userId, tenantId },
            data: { role },
        })
        if (count === 0) return { success: false, error: "Team member not found" }

        revalidatePath("/settings")
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to update role" }
    }
}

export async function setTeamMemberActive(
    userId: string,
    isActive: boolean
): Promise<{ success: boolean; error?: string }> {
    try {
        const tenantId = await getTenantAdminId()

        const member = await getEditableMember(tenantId, userId)
        if (!isActive && member.role === "ADMIN" && member.isActive && (await isLastActiveAdmin(tenantId, userId))) {
            return { success: false, error: "The workspace needs at least one active admin." }
        }

        const { count } = await prisma.user.updateMany({
            where: { id: userId, tenantId },
            data: { isActive },
        })
        if (count === 0) return { success: false, error: "Team member not found" }

        revalidatePath("/settings")
        return { success: true }
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Failed to update status" }
    }
}
