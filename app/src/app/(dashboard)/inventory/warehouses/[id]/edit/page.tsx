import { notFound } from "next/navigation"
import { getInventoryOverview } from "@/app/actions/inventory"
import { WarehouseForm } from "@/components/inventory/warehouse-form"
import { isUuid } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "Edit warehouse | Genesoft ERP" }

export default async function EditWarehousePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    const { warehouses } = await getInventoryOverview()
    const warehouse = warehouses.find((w) => w.id === id)
    if (!warehouse) notFound()
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <WarehouseForm warehouses={warehouses} warehouse={warehouse} />
        </div>
    )
}
