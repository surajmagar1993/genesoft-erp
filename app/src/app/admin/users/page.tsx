import { isUuid } from "@/lib/utils"
import { getTenantTeams } from "@/app/actions/saas/admin"
import { UsersClient } from "./UsersClient"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const search = (searchParams.search as string) || ""
    const role = (searchParams.role as string) || "ALL"
    const status = (searchParams.status as string) || "ALL"
    const tenantParam = (searchParams.tenant as string) || ""
    const tenant = isUuid(tenantParam) ? tenantParam : ""

    const data = await getTenantTeams({ search, role, status, tenantId: tenant || undefined })

    return <UsersClient {...data} searchQuery={search} selectedRole={role} selectedStatus={status} selectedTenant={tenant} />
}
