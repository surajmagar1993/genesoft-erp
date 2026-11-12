import { getMyAccess } from "@/lib/get-tenant-id"
import { getTenantSettings } from "@/app/actions/settings/tenant"
import { getAnnouncement } from "@/app/actions/announcement"
import { getCurrentUser } from "@/lib/current-user"
import { prisma } from "@/lib/prisma"
import { DashboardShell } from "./dashboard-shell"

export const dynamic = "force-dynamic"

/**
 * Loads who the user is and what they may open once, on the server, so the
 * menu is complete on first paint (no "Loading…" menu) and the business's own
 * country is known before anything is drawn.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
    const [{ role, access, planModules }, settings, announcement, authUser] = await Promise.all([
        getMyAccess(),
        getTenantSettings(),
        getAnnouncement(),
        getCurrentUser(),
    ])
    const profile = authUser
        ? await prisma.user.findUnique({ where: { id: authUser.id }, select: { fullName: true, email: true } })
        : null

    return (
        <DashboardShell
            initial={{
                role,
                access,
                planModules,
                countryCode: settings?.country_code || "",
                multiJurisdiction: !!settings?.settings?.enable_multijurisdiction,
                tenantName: settings?.name || "",
                announcement,
                userName: profile?.fullName || "",
                userEmail: profile?.email || authUser?.email || "",
            }}
        >
            {children}
        </DashboardShell>
    )
}
