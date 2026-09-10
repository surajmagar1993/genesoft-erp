import { getTenantById } from "@/app/actions/saas/admin"
import { notFound } from "next/navigation"
import { TenantDetailClient } from "./TenantDetailClient"

export const dynamic = "force-dynamic"

export default async function TenantDetailPage(props: {
    params: Promise<{ id: string }>
}) {
    const { id } = await props.params
    const tenant = await getTenantById(id)

    if (!tenant) {
        notFound()
    }

    return <TenantDetailClient tenant={tenant} />
}
