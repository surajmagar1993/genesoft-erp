import { getPriceListsOverview } from "@/app/actions/sales/price-lists"
import PriceListsClient from "./price-lists-client"

export const metadata = {
    title: "Price Lists & Customer Tier Pricing | Genesoft ERP",
    description: "Manage wholesale and enterprise rate cards, volume discount breaks, and dynamic customer pricing tiers.",
}

export default async function PriceListsPage() {
    const res = await getPriceListsOverview()

    if (res.error && !res.data) {
        return (
            <div className="flex-1 p-8">
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
                    <h3 className="font-semibold text-lg">Error Loading Price Lists</h3>
                    <p className="text-sm mt-1">{res.error}</p>
                </div>
            </div>
        )
    }

    const { stats, priceLists, products, customers, matrixData } = res.data!

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <PriceListsClient
                initialStats={stats}
                initialPriceLists={priceLists}
                products={products}
                customers={customers}
                initialMatrixData={matrixData}
            />
        </div>
    )
}
