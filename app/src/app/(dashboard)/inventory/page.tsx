import { getInventoryOverview, getInventoryReportsData } from "@/app/actions/inventory"
import { getBatchSerialOverview } from "@/app/actions/batch-serial"
import { InventoryClient } from "./inventory-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Inventory & Warehouses | Genesoft ERP",
    description: "Multi-facility stock tracking, adjustments, transfers, and procurement alerts.",
}

export default async function InventoryPage({
    searchParams,
}: {
    searchParams?: Promise<{ tab?: string }> | { tab?: string }
}) {
    const resolvedParams = searchParams ? await Promise.resolve(searchParams) : {}
    const initialTab = resolvedParams?.tab

    const [overviewData, reportsData, batchSerialData] = await Promise.all([
        getInventoryOverview(),
        getInventoryReportsData("30d"),
        getBatchSerialOverview(),
    ])

    return (
        <InventoryClient
            initialData={overviewData}
            initialReportsData={reportsData}
            initialBatchSerialData={batchSerialData}
            initialTab={initialTab}
        />
    )
}
