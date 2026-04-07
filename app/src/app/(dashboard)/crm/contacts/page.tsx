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
        const { data: contacts, total } = await getContacts(page, limit, search)
        
        // Fetch Tenant Currency
        const { prisma } = await import("@/lib/prisma")
        const tenantId = await (await import("@/lib/get-tenant-id")).getTenantId()
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: { currencyCode: true }
        })

        return <ContactsClient initialContacts={contacts} total={total} baseCurrency={tenant?.currencyCode || "INR"} />
    } catch (error) {
        return (
            <div className="flex h-[400px] items-center justify-center font-bold">
                <p className="text-red-500">Failed to load contacts. Please try again.</p>
            </div>
        )
    }
}
