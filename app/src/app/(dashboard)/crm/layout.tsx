import type { ReactNode } from "react"
import { ModuleGate } from "@/components/auth/module-gate"

export default function Layout({ children }: { children: ReactNode }) {
    return <ModuleGate module="crm">{children}</ModuleGate>
}
