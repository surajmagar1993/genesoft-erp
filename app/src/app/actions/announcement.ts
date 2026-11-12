"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"

/**
 * The platform's broadcast message (Super Admin → System Settings), for any
 * signed-in user. Only the message leaves the server: the other platform
 * switches stay with the Super Admin (`getGlobalSettings`).
 */
export async function getAnnouncement(): Promise<string | null> {
    if (!(await getCurrentUser())) return null
    try {
        const row = await prisma.globalSettings.findUnique({ where: { id: "system_config" }, select: { bannerMessage: true } })
        return row?.bannerMessage?.trim() || null
    } catch (err) {
        console.error("getAnnouncement failed:", err)
        return null
    }
}
