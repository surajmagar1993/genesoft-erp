import { getPurchaseOverview } from "@/app/actions/purchase"
import { PurchaseClient } from "./purchase-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Purchase & Procurement | Genesoft ERP",
    description: "Multi-vendor procurement, purchase order lifecycle, warehouse receipt intake, and accounts payable bill generation.",
}

export default async function PurchasePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
    const { tab } = await searchParams
    const overviewData = await getPurchaseOverview()
    const initialTab = tab === "vendors" || tab === "receipts" ? tab : "orders"

    return <PurchaseClient initialData={overviewData} initialTab={initialTab} />
}
