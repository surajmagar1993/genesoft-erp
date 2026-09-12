import { getRecurringInvoicesOverview } from "@/app/actions/sales/recurring-invoices"
import RecurringInvoicesClient from "./recurring-invoices-client"

export const metadata = {
    title: "Recurring Invoices & Subscriptions | Genesoft ERP",
    description: "Manage client retainer contracts, software subscriptions, AMC maintenance agreements, and automated cyclical billing schedules.",
}

export default async function RecurringInvoicesPage({
    searchParams,
}: {
    searchParams: Promise<{ status?: string }>
}) {
    const { status } = await searchParams
    const overview = await getRecurringInvoicesOverview(status)

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <RecurringInvoicesClient initialData={overview} />
        </div>
    )
}
