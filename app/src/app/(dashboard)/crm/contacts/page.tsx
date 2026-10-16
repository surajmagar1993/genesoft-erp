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

    // Load first, render after: React can't catch rendering errors with try/catch
    let loaded: { contacts: Awaited<ReturnType<typeof getContacts>>["data"]; total: number; currencyCode: string } | null = null
    try {
        const { data: contacts, total } = await getContacts(page, limit, search)
        // The business's currency for formatting
        const tenantId = await getTenantId()
        const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyCode: true } })
        loaded = { contacts, total, currencyCode: tenant?.currencyCode || "INR" }
    } catch (error) {
        console.error("contacts page failed to load:", error)
    }
    if (!loaded) {
        return (
            <div className="flex h-[400px] items-center justify-center font-bold">
                <p className="text-red-500">Failed to load contacts. Please try again.</p>
            </div>
        )
    }
    return <ContactsClient initialContacts={loaded.contacts} total={loaded.total} baseCurrency={loaded.currencyCode} />
}
