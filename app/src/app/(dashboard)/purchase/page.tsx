import { getPurchaseOverview } from "@/app/actions/purchase"
import { PurchaseClient } from "./purchase-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Purchase & Procurement | Genesoft ERP",
    description: "Multi-vendor procurement, purchase order lifecycle, warehouse receipt intake, and accounts payable bill generation.",
}

export default async function PurchasePage() {
    const overviewData = await getPurchaseOverview()

    return <PurchaseClient initialData={overviewData} />
}
