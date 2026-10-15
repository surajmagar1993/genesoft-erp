import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"

/**
 * Platform (Super Admin) guard for server actions outside actions/saas/admin.ts.
 * Returns the signed-in super admin; throws for anyone else.
 */
export async function requireSuperAdmin(): Promise<{ id: string; email: string }> {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()
    if (!user) throw new Error("Unauthorized")
    const profile = await prisma.user.findUnique({ where: { id: user.id }, select: { role: true, isActive: true } })
    if (!profile || profile.role !== "SUPER_ADMIN" || profile.isActive === false) {
        throw new Error("Forbidden: Super Admin access required")
    }
    return { id: user.id, email: user.email || "unknown" }
}

/** Records a Super Admin action in Admin Audit. Never throws. */
export async function logAdminAudit(
    admin: { id: string; email: string },
    action: string,
    target?: { id?: string; type?: string },
    metadata: Record<string, unknown> = {}
): Promise<void> {
    try {
        await prisma.adminAuditLog.create({
            data: {
                adminId: admin.id,
                adminEmail: admin.email,
                action,
                targetId: target?.id,
                targetType: target?.type,
                metadata: metadata as Prisma.InputJsonValue,
            },
        })
    } catch (err) {
        console.error("logAdminAudit failed:", err)
    }
}
