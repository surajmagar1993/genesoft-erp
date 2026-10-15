import type { ReactNode } from "react"
import { ModuleGate } from "@/components/auth/module-gate"
import { PlanGate } from "@/components/auth/plan-gate"

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <ModuleGate module="manufacturing">
            <PlanGate feature="manufacturing">{children}</PlanGate>
        </ModuleGate>
    )
}
