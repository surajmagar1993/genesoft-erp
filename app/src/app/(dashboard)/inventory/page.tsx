import React from "react"
import { Warehouse } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export const metadata = {
    title: "Inventory Management | Genesoft ERP",
    description: "Manage warehouses, stock quantities, and items catalog.",
}

export default function InventoryPage() {
    return (
        <ModulePlaceholder
            title="Inventory & Warehouse"
            description="Manage multi-location stock levels, track transfer actions, scan products, and automate inventory valuation metrics."
            icon={Warehouse}
            phase="2 (Growth)"
            progress={35}
            features={[
                {
                    title: "Stock Level Audits",
                    description: "Real-time tracking of item levels, low-stock notifications, and automatic purchase order triggers."
                },
                {
                    title: "Barcode & QR Scanning",
                    description: "Scan tags directly via mobile camera or dedicated Bluetooth scanner during check-ins and check-outs."
                },
                {
                    title: "Multi-Warehouse Management",
                    description: "Transfer stock between physical locations and track location-specific quantities."
                }
            ]}
        />
    )
}
