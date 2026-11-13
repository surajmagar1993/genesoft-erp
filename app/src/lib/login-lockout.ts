import { prisma } from "@/lib/prisma"
import { reportCaught } from "@/lib/error-reporting"

/**
 * Failed-login lockout (Admin → Security → "Brute Force Threshold").
 * Each wrong password is a SECURITY_LOGIN_FAILED entry in the admin audit log
 * (so it shows in the Security audit trail). After `maxAttempts` failures for
 * one email within LOGIN_LOCK_MINUTES, that email can't sign in until the
 * window passes; one IP address gets 4× that across all emails. A successful
 * sign-in clears the email's count (SECURITY_LOGIN_RESET).
 *
 * This guards the app's sign-in form. Supabase Auth's own rate limits cover
 * its API directly.
 */
export const LOGIN_LOCK_MINUTES = 15
const SYSTEM_ACTOR = { adminId: "SYSTEM", adminEmail: "sign-in" }

export function normaliseLoginEmail(email: string): string {
    return email.trim().toLowerCase()
}

export async function loginLocked(email: string, ip: string | null, maxAttempts: number, now = new Date()): Promise<boolean> {
    const since = new Date(now.getTime() - LOGIN_LOCK_MINUTES * 60_000)
    const target = normaliseLoginEmail(email)
    try {
        const lastReset = await prisma.adminAuditLog.findFirst({
            where: { action: "SECURITY_LOGIN_RESET", targetId: target, createdAt: { gte: since } },
            orderBy: { createdAt: "desc" },
            select: { createdAt: true },
        })
        const from = lastReset && lastReset.createdAt > since ? lastReset.createdAt : since
        const [byEmail, byIp] = await Promise.all([
            prisma.adminAuditLog.count({
                where: { action: "SECURITY_LOGIN_FAILED", targetId: target, createdAt: { gt: from } },
            }),
            ip
                ? prisma.adminAuditLog.count({
                    where: { action: "SECURITY_LOGIN_FAILED", createdAt: { gte: since }, metadata: { path: ["ip"], equals: ip } },
                })
                : Promise.resolve(0),
        ])
        return byEmail >= maxAttempts || byIp >= maxAttempts * 4
    } catch (err) {
        // Fail open: a database hiccup mustn't stop everyone signing in
        reportCaught(err, "loginLocked")
        return false
    }
}

export async function recordLoginFailure(email: string, ip: string | null): Promise<void> {
    try {
        await prisma.adminAuditLog.create({
            data: { ...SYSTEM_ACTOR, action: "SECURITY_LOGIN_FAILED", targetId: normaliseLoginEmail(email), targetType: "AUTH", metadata: { ip } },
        })
    } catch (err) {
        reportCaught(err, "recordLoginFailure")
    }
}

/** After a good sign-in: forget earlier failures for this email (only writes when there were some). */
export async function clearLoginFailures(email: string, now = new Date()): Promise<void> {
    const target = normaliseLoginEmail(email)
    try {
        const recent = await prisma.adminAuditLog.count({
            where: { action: "SECURITY_LOGIN_FAILED", targetId: target, createdAt: { gte: new Date(now.getTime() - LOGIN_LOCK_MINUTES * 60_000) } },
        })
        if (recent > 0) {
            await prisma.adminAuditLog.create({
                data: { ...SYSTEM_ACTOR, action: "SECURITY_LOGIN_RESET", targetId: target, targetType: "AUTH", metadata: {} },
            })
        }
    } catch (err) {
        reportCaught(err, "clearLoginFailures")
    }
}
