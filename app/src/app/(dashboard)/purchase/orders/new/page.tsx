import { getPurchaseOverview } from "@/app/actions/purchase"
import { PurchaseOrderForm } from "@/components/purchase/purchase-order-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "New purchase order | Genesoft ERP" }

export default async function NewPurchaseOrderPage({ searchParams }: { searchParams: Promise<{ vendor?: string }> }) {
    const { vendor } = await searchParams
    const data = await getPurchaseOverview()
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <PurchaseOrderForm data={data} vendorId={vendor} />
        </div>
    )
}
