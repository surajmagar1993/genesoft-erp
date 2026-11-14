"use server"

import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/current-user"
import { COUNTRIES } from "@/lib/constants/countries"

/**
 * Address suggestions from the reference tables (geo_states, geo_cities,
 * geo_postal_codes; loaded by scripts/import-geo.mts). Signed-in users only.
 * An empty result lets the form fall back to its small built-in list.
 */

export interface PlaceOption {
    label: string
    value: string
    subLabel?: string
}

export interface PinCodePlace {
    place: string
    district: string
    state: string
}

const LIMIT = 15

/** "India", "in" or "IN" → "IN"; unknown → null */
function countryCodeOf(nameOrCode: string | null | undefined): string | null {
    const v = (nameOrCode ?? "").trim().toLowerCase()
    if (!v) return null
    return COUNTRIES.find((c) => c.code.toLowerCase() === v || c.name.toLowerCase() === v)?.code ?? null
}

/** Trimmed, at most 60 characters, and no LIKE wildcards from the user */
function cleanQuery(q: string): string {
    return q.trim().slice(0, 60).replace(/[%_\\]/g, "")
}

async function signedIn(): Promise<boolean> {
    return !!(await getCurrentUser().catch(() => null))
}

export async function findStates(query: string, country: string): Promise<PlaceOption[]> {
    const code = countryCodeOf(country)
    if (!code || !(await signedIn())) return []
    const q = cleanQuery(query)
    const rows = await prisma.geoState.findMany({
        where: { countryCode: code, ...(q ? { name: { startsWith: q, mode: "insensitive" } } : {}) },
        orderBy: { name: "asc" },
        take: LIMIT,
        select: { name: true, code: true },
    })
    return rows.map((r) => ({ label: r.name, value: r.name, subLabel: r.code || undefined }))
}

export async function findCities(query: string, state: string, country: string): Promise<PlaceOption[]> {
    const code = countryCodeOf(country)
    const q = cleanQuery(query)
    if (!code || q.length < 2 || !(await signedIn())) return []
    const st = state.trim()
    const rows = await prisma.geoCity.findMany({
        where: {
            countryCode: code,
            name: { startsWith: q, mode: "insensitive" },
            ...(st ? { stateName: { equals: st, mode: "insensitive" } } : {}),
        },
        orderBy: { name: "asc" },
        take: LIMIT,
        select: { name: true, stateName: true },
    })
    return rows.map((r) => ({ label: r.name, value: r.name, subLabel: r.stateName || undefined }))
}

/** Post offices for a 6-digit Indian PIN code (the first one is used to fill city and state). */
export async function findPinCode(pinCode: string): Promise<PinCodePlace[]> {
    const pin = pinCode.replace(/\s/g, "")
    if (!/^[1-9]\d{5}$/.test(pin) || !(await signedIn())) return []
    const rows = await prisma.geoPostalCode.findMany({
        where: { countryCode: "IN", postalCode: pin },
        orderBy: { placeName: "asc" },
        take: 50,
        select: { placeName: true, district: true, stateName: true },
    })
    return rows.map((r) => ({ place: r.placeName, district: r.district, state: r.stateName }))
}
