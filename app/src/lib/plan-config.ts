import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { normalizePlanConfig, type PlanConfig } from "@/lib/plan-config-shared"

export * from "@/lib/plan-config-shared"

/** Admin audit action whose newest entry holds the current plan settings (older ones are the history). */
export const PLAN_CONFIG_ACTION = "PLAN_CONFIG_UPDATE"

/**
 * The plan settings saved in Admin → Pricing & Plans, over the built-in
 * defaults. Read once per request; falls back to the defaults if the
 * database can't be read.
 */
export const getPlanConfig = cache(async (): Promise<PlanConfig> => {
    try {
        const latest = await prisma.adminAuditLog.findFirst({
            where: { action: PLAN_CONFIG_ACTION },
            orderBy: { createdAt: "desc" },
            select: { metadata: true },
        })
        return normalizePlanConfig((latest?.metadata as { config?: unknown } | null)?.config)
    } catch (err) {
        console.error("getPlanConfig: using the built-in plan settings", err)
        return normalizePlanConfig(null)
    }
})
