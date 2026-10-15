import type { ReactNode } from "react"
import Link from "next/link"
import { Lock } from "lucide-react"
import { hasModuleAccess, isInPlan } from "@/lib/get-tenant-id"
import { MODULES, type ModuleKey } from "@/lib/access"
import { PlanGate } from "@/components/auth/plan-gate"

/**
 * Server-side page guard for a module: people without access see a short
 * notice instead of the page (and the page's data is never loaded).
 */
export async function ModuleGate({ module, children }: { module: ModuleKey; children: ReactNode }) {
    if (await hasModuleAccess(module, "VIEW")) return <>{children}</>
    // Left out of the workspace's plan: show the upgrade notice instead
    if (!(await isInPlan(module))) return <PlanGate feature={module}>{children}</PlanGate>
    const label = MODULES.find((m) => m.key === module)?.label ?? module
    return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
            <div className="max-w-md text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                    <Lock className="h-5 w-5 text-muted-foreground" />
                </div>
                <h1 className="text-lg font-semibold">You don&apos;t have access to {label}</h1>
                <p className="text-sm text-muted-foreground">Ask a workspace admin to give you access in Settings → Team & Access.</p>
                <Link href="/reports" className="inline-block text-sm font-medium text-primary hover:underline">
                    Go to the dashboard
                </Link>
            </div>
        </div>
    )
}
