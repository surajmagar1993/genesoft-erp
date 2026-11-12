import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

export type SettingsJson = Record<string, unknown>

/**
 * Reads `tenants.settings` and locks the row until the transaction ends.
 * Every change to that JSON should start here: it holds team access, invites,
 * the subscription and saved credentials side by side, and an unlocked
 * read → change → write lets two saves silently undo each other.
 */
export async function lockTenantSettings(tx: Prisma.TransactionClient, tenantId: string): Promise<SettingsJson> {
    const rows: { settings: unknown }[] = await tx.$queryRaw`select settings from tenants where id = ${tenantId}::uuid for update`
    if (rows.length === 0) throw new Error("Workspace not found")
    return (rows[0].settings as SettingsJson | null) || {}
}

/**
 * Changes the settings JSON under the row lock and returns the new value.
 * `change` gets the latest settings and returns what to save (return the same
 * object to leave them as they are). Pass `tx` when already in a transaction.
 */
export async function patchTenantSettings(
    tenantId: string,
    change: (settings: SettingsJson) => SettingsJson,
    tx?: Prisma.TransactionClient
): Promise<SettingsJson> {
    const run = async (db: Prisma.TransactionClient) => {
        const current = await lockTenantSettings(db, tenantId)
        const next = change(current)
        if (next !== current) {
            await db.tenant.update({ where: { id: tenantId }, data: { settings: next as unknown as Prisma.InputJsonValue } })
        }
        return next
    }
    return tx ? run(tx) : prisma.$transaction(run)
}
