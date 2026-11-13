import { getInventoryOverview } from "@/app/actions/inventory"
import { WarehouseForm } from "@/components/inventory/warehouse-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "New warehouse | Genesoft ERP" }

export default async function NewWarehousePage() {
    const { warehouses } = await getInventoryOverview()
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <WarehouseForm warehouses={warehouses} />
        </div>
    )
}
