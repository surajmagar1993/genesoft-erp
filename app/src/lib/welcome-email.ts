import { prisma } from "@/lib/prisma"
import { appUrl } from "@/lib/app-url"
import { PLATFORM } from "@/lib/constants/platform"
import { sendSystemEmail } from "@/lib/system-email"
import { reportError } from "@/lib/error-reporting"

/** Businesses older than this never get a welcome email (so existing customers aren't sent one on their next sign-in). */
export const WELCOME_WINDOW_DAYS = 7

export interface WelcomeCandidate {
    userId: string
    role: string
    tenantCreatedAt: Date
    /** Id of the business's first user (its owner) */
    firstUserId: string | null
    alreadySent: boolean
}

/** Whether this user should get the welcome email now: the owner of a new business that hasn't had one. */
export function isWelcomeDue(c: WelcomeCandidate, now = new Date()): boolean {
    if (c.alreadySent || c.role !== "ADMIN" || c.firstUserId !== c.userId) return false
    return now.getTime() - c.tenantCreatedAt.getTime() <= WELCOME_WINDOW_DAYS * 24 * 60 * 60 * 1000
}

/**
 * Sends the welcome email (Admin → Email Templates → "Welcome to Genesoft ERP")
 * from hello@ to the owner of a new business, once per business. Called after
 * the email is confirmed and on sign-in, so it arrives whichever comes first.
 * The business is claimed in tenants.settings.welcomeEmail before sending, so
 * two calls at once can't send it twice; if sending fails the claim is
 * released and the next sign-in tries again. Never throws.
 */
export async function sendWelcomeEmailOnce(userId: string): Promise<{ sent: boolean; reason?: string }> {
    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { id: true, role: true, email: true, fullName: true, tenantId: true },
        })
        if (!user?.tenantId) return { sent: false, reason: "No business" }
        const [tenant, firstUser] = await Promise.all([
            prisma.tenant.findUnique({ where: { id: user.tenantId }, select: { id: true, name: true, createdAt: true, trialEndsAt: true, isTrial: true, settings: true } }),
            prisma.user.findFirst({ where: { tenantId: user.tenantId }, orderBy: { createdAt: "asc" }, select: { id: true } }),
        ])
        if (!tenant) return { sent: false, reason: "No business" }
        const settings = (tenant.settings ?? {}) as Record<string, unknown>
        const due = isWelcomeDue({
            userId: user.id,
            role: String(user.role),
            tenantCreatedAt: tenant.createdAt,
            firstUserId: firstUser?.id ?? null,
            alreadySent: settings.welcomeEmail != null,
        })
        if (!due) return { sent: false, reason: "Not due" }

        // Claim it: only one caller gets a row back
        const claimed = await prisma.$executeRaw`
            update tenants
               set settings = jsonb_set(coalesce(settings, '{}'::jsonb), '{welcomeEmail}', jsonb_build_object('sentAt', now(), 'to', ${user.email}::text))
             where id = ${tenant.id}::uuid and coalesce(settings, '{}'::jsonb) -> 'welcomeEmail' is null`
        if (claimed !== 1) return { sent: false, reason: "Already sent" }

        const trialEnds = tenant.isTrial && tenant.trialEndsAt ? tenant.trialEndsAt : null
        const result = await sendSystemEmail(
            "WELCOME_ONBOARDING",
            user.email,
            {
                user_name: (user.fullName || "").split(" ")[0] || "there",
                tenant_name: tenant.name,
                trial_ends_on: trialEnds ? trialEnds.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }) : "",
                workspace_url: `${appUrl()}/login`,
            },
            { name: PLATFORM.brandName, address: PLATFORM.welcomeEmail, replyTo: PLATFORM.welcomeEmail },
        )
        if (!result.sent && result.reason !== "Template is switched off") {
            await prisma.$executeRaw`update tenants set settings = settings - 'welcomeEmail' where id = ${tenant.id}::uuid`
            await reportError({ source: "server", kind: "welcome-email", message: `Welcome email not sent: ${result.reason}`, path: `tenant:${tenant.id}` })
        }
        return result
    } catch (err) {
        await reportError({ source: "server", kind: "welcome-email", message: err instanceof Error ? err.message : "Welcome email failed", stack: err instanceof Error ? err.stack : undefined })
        return { sent: false, reason: "Failed" }
    }
}
