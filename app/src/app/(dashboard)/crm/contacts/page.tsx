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

        // Get tenant currency for proper formatting via Supabase (more resilient than Prisma TCP)
        const supabase = await (await import("@/lib/supabase/server")).createClient()
        const tenantId = await (await import("@/lib/get-tenant-id")).getTenantId()
        
        const { data: tenant } = await supabase
            .from("tenants")
            .select("currency_code")
            .eq("id", tenantId)
            .single()
            
        const currencyCode = (tenant as any)?.currency_code || "INR"

        return <ContactsClient initialContacts={contacts} total={total} baseCurrency={currencyCode} />
    } catch (error) {
        return (
            <div className="flex h-[400px] items-center justify-center font-bold">
                <p className="text-red-500">Failed to load contacts. Please try again.</p>
            </div>
        )
    }
}
