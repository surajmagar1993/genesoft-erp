import { notFound } from "next/navigation"
import { getPageAdmin } from "@/app/actions/website"
import { pageDef } from "@/lib/site-cms-shared"
import { PageEditor } from "./PageEditor"

export const dynamic = "force-dynamic"

export default async function EditWebsitePage({ params }: { params: Promise<{ key: string }> }) {
    const key = decodeURIComponent((await params).key)
    if (!pageDef(key)) notFound()
    return <PageEditor page={await getPageAdmin(key)} />
}
