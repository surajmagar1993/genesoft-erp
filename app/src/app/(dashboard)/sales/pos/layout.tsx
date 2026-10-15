import type { ReactNode } from "react"
import { PlanGate } from "@/components/auth/plan-gate"

export default function Layout({ children }: { children: ReactNode }) {
    return <PlanGate feature="pos">{children}</PlanGate>
}
