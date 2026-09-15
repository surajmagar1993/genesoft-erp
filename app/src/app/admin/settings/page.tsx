import { getGlobalSettings } from "@/app/actions/saas/admin"
import { SettingsClient } from "./SettingsClient"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
    const settings = await getGlobalSettings()

    return (
        <SettingsClient
            initialSettings={{
                id: settings.id,
                maintenanceMode: settings.maintenanceMode,
                allowSignups: settings.allowSignups,
                bannerMessage: settings.bannerMessage,
                updatedAt: settings.updatedAt.toISOString()
            }}
        />
    )
}
