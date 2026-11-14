import { getInventoryOverview, getInventoryReportsData } from "@/app/actions/inventory"
import { getBatchSerialOverview } from "@/app/actions/batch-serial"
import { InventoryClient } from "./inventory-client"
import { PARKED_MODULES_ENABLED } from "@/lib/features"

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
        // Batch & serial is switched off (src/lib/features.ts): don't load it
        PARKED_MODULES_ENABLED ? getBatchSerialOverview() : Promise.resolve(undefined),
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
