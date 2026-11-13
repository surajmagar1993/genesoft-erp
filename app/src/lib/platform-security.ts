import { prisma } from "@/lib/prisma"

/** Sign-in and request rules the super admin sets in Admin → Security. */
export interface SecurityPolicy {
    /** Admin and Super Admin accounts must use an authenticator app (TOTP). */
    enforce2FA: boolean
    /** Sign out after this many minutes without activity; 0 = never. */
    sessionTimeoutMinutes: number
    /** Failed sign-ins for one email (within LOGIN_LOCK_MINUTES) before it is locked for a while. */
    authLockoutAttempts: number
    /** API calls and form submissions per IP address per minute. */
    rateLimitPerMin: number
}

export const DEFAULT_SECURITY_POLICY: SecurityPolicy = {
    enforce2FA: false,
    sessionTimeoutMinutes: 30,
    authLockoutAttempts: 5,
    rateLimitPerMin: 120,
}

const POLICY_LIMITS: Record<Exclude<keyof SecurityPolicy, "enforce2FA">, [number, number]> = {
    sessionTimeoutMinutes: [0, 24 * 60],
    authLockoutAttempts: [3, 20],
    rateLimitPerMin: [30, 1000],
}

function clampInt(value: unknown, [min, max]: [number, number]): number | undefined {
    const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
    if (!Number.isFinite(n)) return undefined
    return Math.min(max, Math.max(min, Math.round(n)))
}

/** Keeps only valid policy fields from a saved or submitted object (unknown keys dropped, numbers clamped). */
export function cleanSecurityPolicy(input: unknown): Partial<SecurityPolicy> {
    const src = (input && typeof input === "object" ? input : {}) as Record<string, unknown>
    const out: Partial<SecurityPolicy> = {}
    if (typeof src.enforce2FA === "boolean") out.enforce2FA = src.enforce2FA
    for (const key of Object.keys(POLICY_LIMITS) as (keyof typeof POLICY_LIMITS)[]) {
        const v = clampInt(src[key], POLICY_LIMITS[key])
        if (v !== undefined) out[key] = v
    }
    return out
}

/**
 * The policy is saved as SECURITY_POLICY_UPDATE entries in the admin audit log
 * (so every change keeps its history). Entries may hold only some fields, so
 * they are applied oldest first over the defaults.
 */
export function mergeSecurityPolicy(entriesOldestFirst: unknown[]): SecurityPolicy {
    return entriesOldestFirst.reduce<SecurityPolicy>(
        (acc, meta) => ({ ...acc, ...cleanSecurityPolicy(meta) }),
        { ...DEFAULT_SECURITY_POLICY },
    )
}

export async function loadSecurityPolicy(): Promise<SecurityPolicy> {
    const logs = await prisma.adminAuditLog.findMany({
        where: { action: "SECURITY_POLICY_UPDATE" },
        orderBy: { createdAt: "desc" },
        take: 100,
        select: { metadata: true },
    })
    return mergeSecurityPolicy(logs.reverse().map((l: { metadata: unknown }) => l.metadata))
}

export interface PlatformGate {
    maintenanceMode: boolean
    allowSignups: boolean
    blockedIps: Set<string>
    policy: SecurityPolicy
}

const CACHE_MS = 30_000
let cached: { at: number; value: PlatformGate } | null = null

/**
 * Platform-wide switches the super admin controls: maintenance mode and the
 * signup switch (global_settings), the IP blocklist (block/unblock entries in
 * the admin audit log) and the security policy. Cached for 30 seconds per
 * server instance because the proxy reads it on every request. Fails open
 * (no blocks, default policy) if the database can't be reached, so an outage
 * doesn't lock everyone out.
 */
export async function getPlatformGate(): Promise<PlatformGate> {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.value
    try {
        const [settings, ipLogs, policy] = await Promise.all([
            prisma.globalSettings.findUnique({ where: { id: "system_config" } }),
            prisma.adminAuditLog.findMany({
                where: { action: { in: ["SECURITY_IP_BLOCK", "SECURITY_IP_UNBLOCK"] } },
                orderBy: { createdAt: "asc" },
                select: { action: true, targetId: true },
            }),
            loadSecurityPolicy(),
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
            policy,
        }
        cached = { at: Date.now(), value }
        return value
    } catch (err) {
        console.error("getPlatformGate: could not load platform settings", err)
        return { maintenanceMode: false, allowSignups: true, blockedIps: new Set(), policy: { ...DEFAULT_SECURITY_POLICY } }
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
