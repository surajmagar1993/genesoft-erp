import { prisma } from "@/lib/prisma"

/** Usual time zone per business country (settings.timezone overrides it). */
const COUNTRY_TZ: Record<string, string> = {
    IN: "Asia/Kolkata",
    AE: "Asia/Dubai",
    SA: "Asia/Riyadh",
    GB: "Europe/London",
    US: "America/New_York",
    AU: "Australia/Sydney",
}

export async function tenantTimeZone(tenantId: string): Promise<string> {
    const t = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { countryCode: true, settings: true } })
    const custom = (t?.settings as { timezone?: unknown } | null)?.timezone
    if (typeof custom === "string" && custom) {
        try {
            new Intl.DateTimeFormat("en-US", { timeZone: custom })
            return custom
        } catch {
            // ignore an invalid saved zone
        }
    }
    return COUNTRY_TZ[t?.countryCode || ""] || "UTC"
}

/**
 * A wall-clock date and time in a time zone ("2026-10-14", "09:30",
 * "Asia/Kolkata") as the real instant (09:30 IST = 04:00 UTC). The server
 * runs in UTC, so `new Date("2026-10-14T09:30")` would be 5½ hours off.
 */
export function zonedDateTime(date: string, time: string, timeZone: string): Date {
    const guess = new Date(`${date}T${time.length === 5 ? `${time}:00` : time}Z`)
    const parts = Object.fromEntries(
        new Intl.DateTimeFormat("en-US", { timeZone, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" })
            .formatToParts(guess)
            .map((p) => [p.type, p.value])
    )
    const asIfUtc = Date.UTC(Number(parts.year), Number(parts.month) - 1, Number(parts.day), Number(parts.hour), Number(parts.minute), Number(parts.second))
    return new Date(guess.getTime() - (asIfUtc - guess.getTime()))
}
