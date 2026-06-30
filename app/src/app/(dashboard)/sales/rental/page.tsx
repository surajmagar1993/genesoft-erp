import React from "react"
import { Home } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export const metadata = {
    title: "Rental & Leasing | Genesoft ERP",
    description: "Manage assets, rental agreements, leasing schedules, and collections.",
}

export default function RentalPage() {
    return (
        <ModulePlaceholder
            title="Rental & Leasing"
            description="Manage lease options, equipment rentals, contract timelines, return statuses, and billing schedules."
            icon={Home}
            phase="2 (Growth)"
            progress={20}
            features={[
                {
                    title: "Lease Agreements",
                    description: "Draft rental terms, security deposits, payment terms, and automate recurrent invoices."
                },
                {
                    title: "Asset Status Tracking",
                    description: "Monitor check-out status, maintenance schedules, returns, and damages of rental items."
                },
                {
                    title: "Billing & Collections",
                    description: "Track unpaid rental cycles, calculate late fees, and handle automated collection reminders."
                }
            ]}
        />
    )
}
