import { getInventoryOverview } from "@/app/actions/inventory"
import { InventoryClient } from "./inventory-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Inventory & Warehouses | Genesoft ERP",
    description: "Multi-facility stock tracking, adjustments, transfers, and procurement alerts.",
}

export default async function InventoryPage() {
    const overviewData = await getInventoryOverview()

    return <InventoryClient initialData={overviewData} />
}
