import { getInventoryOverview, getInventoryReportsData } from "@/app/actions/inventory"
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

    const [overviewData, reportsData] = await Promise.all([
        getInventoryOverview(),
        getInventoryReportsData("30d"),
    ])

    return (
        <InventoryClient
            initialData={overviewData}
            initialReportsData={reportsData}
            initialTab={initialTab}
        />
    )
}
