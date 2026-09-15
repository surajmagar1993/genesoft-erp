import { getManufacturingOverview } from "@/app/actions/manufacturing"
import { ManufacturingClient } from "./manufacturing-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Manufacturing & MRP | Genesoft ERP",
    description: "Bill of Materials (BOM), work orders, shop floor scheduling, inventory consumption, and quality control.",
}

export default async function ManufacturingPage() {
    const data = await getManufacturingOverview()

    return <ManufacturingClient initialData={data} />
}
