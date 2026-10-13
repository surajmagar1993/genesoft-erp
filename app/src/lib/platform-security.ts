import { prisma } from "@/lib/prisma"

export interface PlatformGate {
    maintenanceMode: boolean
    allowSignups: boolean
    blockedIps: Set<string>
}

const CACHE_MS = 30_000
let cached: { at: number; value: PlatformGate } | null = null

/**
 * Platform-wide switches the super admin controls: maintenance mode and the
 * signup switch (global_settings) and the IP blocklist (block/unblock entries
 * in the admin audit log). Cached for 30 seconds per server instance because
 * the proxy reads it on every request. Fails open (no blocks) if the
 * database can't be reached, so an outage doesn't lock everyone out.
 */
export async function getPlatformGate(): Promise<PlatformGate> {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.value
    try {
        const [settings, ipLogs] = await Promise.all([
            prisma.globalSettings.findUnique({ where: { id: "system_config" } }),
            prisma.adminAuditLog.findMany({
                where: { action: { in: ["SECURITY_IP_BLOCK", "SECURITY_IP_UNBLOCK"] } },
                orderBy: { createdAt: "asc" },
                select: { action: true, targetId: true },
            }),
        ])
        const blockedIps = new Set<string>()
        for (const log of ipLogs as { action: string; targetId: string | null }[]) {
            if (!log.targetId) continue
            if (log.action === "SECURITY_IP_BLOCK") blockedIps.add(log.targetId)
            else blockedIps.delete(log.targetId)
        }
        const value: PlatformGate = {
            maintenanceMode: settings?.maintenanceMode ?? false,
            allowSignups: settings?.allowSignups ?? true,
            blockedIps,
        }
        cached = { at: Date.now(), value }
        return value
    } catch (err) {
        console.error("getPlatformGate: could not load platform settings", err)
        return { maintenanceMode: false, allowSignups: true, blockedIps: new Set() }
    }
}

/** Call after changing the settings so this instance sees them immediately. */
export function clearPlatformGateCache(): void {
    cached = null
}

/** The client IP as reported by the platform (Vercel sets x-real-ip / x-forwarded-for). */
export function clientIp(headers: Headers): string | null {
    return headers.get("x-real-ip")?.trim() || headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null
}
