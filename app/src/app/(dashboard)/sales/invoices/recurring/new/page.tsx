import { getRecurringInvoicesOverview } from "@/app/actions/sales/recurring-invoices"
import { RecurringProfileForm } from "@/components/sales/recurring-profile-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "New recurring profile | Genesoft ERP" }

export default async function NewRecurringProfilePage() {
    const { customers, products } = await getRecurringInvoicesOverview()
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <RecurringProfileForm customers={customers} products={products} />
        </div>
    )
}
