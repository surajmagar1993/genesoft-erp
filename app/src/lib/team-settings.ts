import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { resolveAccess, type ModuleAccess } from "@/lib/access"

/**
 * Team data kept in tenants.settings.team (no separate table):
 *   access:  { [userId]: ModuleAccess }  – module access of members
 *   invites: TeamInvite[]                – pending invitations
 */
export type InviteRole = "ADMIN" | "MEMBER"

export interface TeamInvite {
    id: string
    email: string
    fullName: string
    role: InviteRole
    access: ModuleAccess
    invitedBy: string
    invitedByName: string
    createdAt: string
    expiresAt: string
}

export interface TeamSettings {
    access: Record<string, ModuleAccess>
    invites: TeamInvite[]
}

export const INVITE_DAYS = 7

export function readTeam(settings: unknown): TeamSettings {
    const team = (settings as { team?: Partial<TeamSettings> } | null)?.team || {}
    const access: Record<string, ModuleAccess> = {}
    for (const [id, a] of Object.entries(team.access || {})) access[id] = resolveAccess("USER", a)
    const invites = (Array.isArray(team.invites) ? team.invites : []).filter(
        (i): i is TeamInvite => !!i && typeof i.id === "string" && typeof i.email === "string"
    ).map((i) => ({ ...i, access: resolveAccess("USER", i.access) }))
    return { access, invites }
}

/**
 * Changes the team settings under a row lock, so two admins saving at once
 * can't overwrite each other (or the rest of settings). Pass `tx` when
 * already inside a transaction.
 */
export async function updateTeam(
    tenantId: string,
    change: (team: TeamSettings) => TeamSettings,
    tx?: Prisma.TransactionClient
): Promise<TeamSettings> {
    const run = async (db: Prisma.TransactionClient) => {
        const rows: { settings: unknown }[] = await db.$queryRaw`select settings from tenants where id = ${tenantId}::uuid for update`
        if (rows.length === 0) throw new Error("Workspace not found")
        const settings = (rows[0].settings as Record<string, unknown> | null) || {}
        const next = change(readTeam(settings))
        await db.tenant.update({ where: { id: tenantId }, data: { settings: { ...settings, team: next } as unknown as Prisma.InputJsonValue } })
        return next
    }
    return tx ? run(tx) : prisma.$transaction(run)
}
