import { getGlobalUsers } from "@/app/actions/saas/admin"
import { UsersClient } from "./UsersClient"

export const dynamic = "force-dynamic"

export default async function AdminUsersPage(props: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const searchParams = await props.searchParams
    const search = (searchParams.search as string) || ""
    const role = (searchParams.role as string) || "ALL"
    const status = (searchParams.status as string) || "ALL"

    const { users, totalCount } = await getGlobalUsers({
        search,
        role,
        status,
        limit: 50
    })

    return (
        <UsersClient
            initialUsers={users}
            totalCount={totalCount}
            searchQuery={search}
            selectedRole={role}
            selectedStatus={status}
        />
    )
}
