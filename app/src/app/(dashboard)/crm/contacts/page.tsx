import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { getContacts } from "@/app/actions/crm/contacts"
import ContactsClient from "./ContactsClient"

export const dynamic = "force-dynamic"

export default async function ContactsPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const search = params.search as string | undefined
    const page = params.page ? parseInt(params.page as string) : 1
    const limit = params.limit ? parseInt(params.limit as string) : 10

    try {
        // Fetch contacts using Supabase server action
        const { data: contacts, total } = await getContacts(page, limit, search)

        // The business's currency for formatting
        const tenantId = await getTenantId()
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } })
        const currencyCode = tenant?.currencyCode || "INR"

        return <ContactsClient initialContacts={contacts} total={total} baseCurrency={currencyCode} />
    } catch (error) {
        return (
            <div className="flex h-[400px] items-center justify-center font-bold">
                <p className="text-red-500">Failed to load contacts. Please try again.</p>
            </div>
        )
    }
}
