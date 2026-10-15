import { listMedia } from "@/app/actions/website"
import { MediaClient } from "./MediaClient"

export const dynamic = "force-dynamic"

export default async function WebsiteMediaPage() {
    return <MediaClient media={await listMedia()} />
}
