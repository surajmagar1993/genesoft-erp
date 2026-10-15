import type { ReactNode } from "react"
import Link from "next/link"
import { Sparkles } from "lucide-react"
import { getTenantId } from "@/lib/get-tenant-id"
import { featureMessage, getEffectivePlan, planAllows, type PlanFeature } from "@/lib/plan-limits"
import { getPlanConfig } from "@/lib/plan-config"

/**
 * Server-side page guard for a feature that isn't on every plan: workspaces
 * on a lower plan see an upgrade notice instead of the page.
 */
export async function PlanGate({ feature, children }: { feature: PlanFeature; children: ReactNode }) {
    const tenantId = await getTenantId()
    const [plan, config] = await Promise.all([getEffectivePlan(tenantId), getPlanConfig()])
    if (planAllows(config, plan.tier, feature)) return <>{children}</>
    return (
        <div className="flex min-h-[50vh] items-center justify-center p-6">
            <div className="max-w-md text-center space-y-3">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <h1 className="text-lg font-semibold">Upgrade to use this</h1>
                <p className="text-sm text-muted-foreground">{featureMessage(config, feature)}</p>
                <Link href="/settings?tab=billing" className="inline-block text-sm font-medium text-primary hover:underline">
                    See plans
                </Link>
            </div>
        </div>
    )
}
