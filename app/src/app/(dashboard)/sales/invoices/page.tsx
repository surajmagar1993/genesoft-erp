import { getInvoices, type InvoiceStatus } from "@/app/actions/sales/invoices"
import InvoicesClient from "./InvoicesClient"

export const dynamic = "force-dynamic"

export default async function InvoicesPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const params = await searchParams
    const status = params.status as InvoiceStatus | undefined
    const search = params.search as string | undefined
    const page = params.page ? parseInt(params.page as string) : 1
    const limit = params.limit ? parseInt(params.limit as string) : 20

    const { data: invoices, total } = await getInvoices(page, limit, { status, search })
    
    return <InvoicesClient initialInvoices={invoices} total={total} />
}
