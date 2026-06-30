import React from "react"
import { FolderKanban } from "lucide-react"
import { ModulePlaceholder } from "@/components/module-placeholder"

export const metadata = {
    title: "Projects & Tasks | Genesoft ERP",
    description: "Manage client projects, milestones, timesheets, and assignments.",
}

export default function ProjectsPage() {
    return (
        <ModulePlaceholder
            title="Projects & Tasks"
            description="Organize client deliveries, track project profitability, allocate resources, and log employee working hours."
            icon={FolderKanban}
            phase="2 (Growth)"
            progress={15}
            features={[
                {
                    title: "Project Boards & Milestones",
                    description: "Kanban and list views for tasks, task dependencies, milestones, and deliverable tracking."
                },
                {
                    title: "Resource Allocation",
                    description: "Schedule workers across multiple active projects and monitor workloads to prevent burnout."
                },
                {
                    title: "Time Tracking & Billing",
                    description: "Log hours directly to tasks, verify timesheets, and compile time-and-material client invoices."
                }
            ]}
        />
    )
}
