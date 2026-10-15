"use server"

import { redirect } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { createClient } from "@/lib/supabase/server"
import { appUrl } from "@/lib/app-url"
import { verifyInviteToken } from "@/lib/invite-token"
import { readTeam, updateTeam, type TeamInvite } from "@/lib/team-settings"

/**
 * Public: the invite page (/join?token=…). The signed token names the
 * workspace and invite; the invite must still be pending in that workspace's
 * settings (so a cancelled invite stops working at once).
 */
async function findInvite(token: string | null | undefined): Promise<{ tenantId: string; tenantName: string; invite: TeamInvite } | { error: string }> {
    const parsed = verifyInviteToken(token)
    if (!parsed) return { error: "This invitation link is invalid or has expired. Ask your admin to send a new one." }
    const tenant = await prisma.tenant.findUnique({ where: { id: parsed.tenantId }, select: { name: true, isActive: true, settings: true } })
    if (!tenant || !tenant.isActive) return { error: "This workspace isn't available. Contact your admin." }
    const invite = readTeam(tenant.settings).invites.find((i) => i.id === parsed.inviteId)
    if (!invite) return { error: "This invitation has been cancelled or already used. Ask your admin to send a new one." }
    return { tenantId: parsed.tenantId, tenantName: tenant.name, invite }
}

export async function getInviteDetails(token: string): Promise<
    { ok: true; companyName: string; email: string; fullName: string; isAdmin: boolean } | { ok: false; error: string }
> {
    const found = await findInvite(token)
    if ("error" in found) return { ok: false, error: found.error }
    return { ok: true, companyName: found.tenantName, email: found.invite.email, fullName: found.invite.fullName, isAdmin: found.invite.role === "ADMIN" }
}

/**
 * Creates the invited person's account in the inviting workspace, with the
 * role and module access the admin chose. The email always comes from the
 * invite, never from the form.
 */
export async function acceptInvite(formData: FormData) {
    const token = String(formData.get("token") || "")
    const back = (msg: string) => redirect(`/join?token=${encodeURIComponent(token)}&error=${encodeURIComponent(msg)}`)

    const found = await findInvite(token)
    if ("error" in found) back(found.error)
    const { tenantId, invite } = found as { tenantId: string; tenantName: string; invite: TeamInvite }

    const fullName = String(formData.get("fullName") || "").trim() || invite.fullName
    const password = String(formData.get("password") || "")
    if (password.length < 8) back("Use a password of at least 8 characters")
    if (password !== String(formData.get("confirmPassword") || "")) back("Passwords do not match")

    if (await prisma.user.findFirst({ where: { email: { equals: invite.email, mode: "insensitive" } }, select: { id: true } })) {
        back("This email already has an account. Sign in instead, or ask your admin to invite a different email.")
    }

    const supabase = await createClient()
    const { data, error } = await supabase.auth.signUp({
        email: invite.email,
        password,
        options: { emailRedirectTo: `${appUrl()}/auth/confirm?next=/reports`, data: { full_name: fullName } },
    })
    if (error) back(error.message)
    // Supabase returns a user with no identities when the email is already registered
    if (!data.user || (Array.isArray(data.user.identities) && data.user.identities.length === 0)) {
        back("This email is already registered. Sign in instead, or ask your admin to invite a different email.")
    }
    const userId = data.user!.id

    try {
        await prisma.$transaction(async (tx) => {
            await tx.user.create({
                data: { id: userId, tenantId, email: invite.email, fullName, role: invite.role === "ADMIN" ? "ADMIN" : "USER" },
            })
            await updateTeam(tenantId, (t) => {
                if (!t.invites.some((i) => i.id === invite.id)) throw new Error("This invitation was cancelled.")
                return {
                    access: invite.role === "ADMIN" ? t.access : { ...t.access, [userId]: invite.access },
                    invites: t.invites.filter((i) => i.id !== invite.id),
                }
            }, tx)
        })
    } catch (err) {
        console.error("acceptInvite failed:", err)
        back(err instanceof Error && err.message.includes("cancelled") ? err.message : "Couldn't finish joining. Please try again or contact your admin.")
    }

    redirect("/login?message=You've+joined+the+team.+Confirm+your+email+if+asked,+then+sign+in.")
}
