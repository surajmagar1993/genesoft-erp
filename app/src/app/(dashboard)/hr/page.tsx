import React from "react"
import { Users } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export const metadata = {
    title: "HR & Employees | Genesoft ERP",
    description: "Manage employee directory, leave allocations, and attendance logs.",
}

export default function HRPage() {
    return (
        <ModulePlaceholder
            title="HR & Employees"
            description="A comprehensive workforce management module to track employee lifecycle, schedules, leave structures, and performance parameters."
            icon={Users}
            phase="2 (Growth)"
            progress={25}
            features={[
                {
                    title: "Employee Directory",
                    description: "Centralized record system for profiles, contracts, reporting hierarchies, and documents."
                },
                {
                    title: "Attendance Tracking",
                    description: "Shift logs, check-in/out registers, and integrations with hardware punch devices."
                },
                {
                    title: "Leave Management",
                    description: "Request submissions, custom approval workflows, balance tracking, and fiscal year calculations."
                }
            ]}
        />
    )
}
