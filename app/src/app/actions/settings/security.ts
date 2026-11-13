"use server"

import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { getPlatformGate } from "@/lib/platform-security"

/** Whether the platform requires the signed-in user to keep two-factor sign-in on. */
export async function getTwoFactorRequirement(): Promise<{ required: boolean }> {
    const user = await getCurrentUser()
    if (!user) return { required: false }
    const [{ policy }, profile] = await Promise.all([
        getPlatformGate(),
        prisma.user.findUnique({ where: { id: user.id }, select: { role: true } }),
    ])
    return { required: policy.enforce2FA && ["SUPER_ADMIN", "ADMIN"].includes(String(profile?.role ?? "")) }
}
