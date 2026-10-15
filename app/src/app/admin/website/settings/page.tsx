import { getSiteSettingsAdmin } from "@/app/actions/website"
import { SettingsClient } from "./SettingsClient"

export const dynamic = "force-dynamic"

export default async function WebsiteSettingsPage() {
    return <SettingsClient initial={await getSiteSettingsAdmin()} />
}
