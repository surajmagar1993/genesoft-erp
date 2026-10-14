import { isUuid } from "@/lib/utils"
import { getTenantById } from "@/app/actions/saas/admin"
import { notFound } from "next/navigation"
import { TenantDetailClient } from "./TenantDetailClient"

export const dynamic = "force-dynamic"

export default async function TenantDetailPage(props: {
    params: Promise<{ id: string }>
}) {
    const { id } = await props.params
    if (!isUuid(id)) notFound()
    const tenant = await getTenantById(id)

    if (!tenant) {
        notFound()
    }

    return <TenantDetailClient tenant={tenant} />
}
