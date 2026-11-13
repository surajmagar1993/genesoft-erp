import { notFound } from "next/navigation"
import { getRecurringInvoicesOverview } from "@/app/actions/sales/recurring-invoices"
import { RecurringProfileForm } from "@/components/sales/recurring-profile-form"
import { isUuid } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "Edit recurring profile | Genesoft ERP" }

export default async function EditRecurringProfilePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    const { customers, products, profiles } = await getRecurringInvoicesOverview()
    const profile = profiles.find((p) => p.id === id)
    if (!profile) notFound()
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <RecurringProfileForm customers={customers} products={products} profile={profile} />
        </div>
    )
}
