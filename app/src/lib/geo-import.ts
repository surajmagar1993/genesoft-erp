import Papa from "papaparse"
import { GEO_STATES } from "@/lib/constants/geo-locations"

/** Parsing for scripts/import-geo.mts (kept here so it can be tested). Server/script only. */

/** "NEW DELHI" → "New Delhi"; small words stay lower case ("Andaman and Nicobar Islands") */
export function titleCase(s: string): string {
    return s
        .toLowerCase()
        .replace(/\s+/g, " ")
        .trim()
        .split(" ")
        .map((w, i) =>
            w.includes(".") ? w.toUpperCase() // abbreviations: G.P.O., S.A.S.
            : i > 0 && ["and", "of", "the"].includes(w) ? w
            : w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
}

interface WorldCountry {
    iso2?: string
    states?: { name?: string; iso2?: string; state_code?: string; cities?: { name?: string }[] }[]
}

export function readWorld(json: string) {
    const countries = JSON.parse(json) as WorldCountry[]
    const states = new Map<string, { countryCode: string; code: string; name: string }>()
    const cities = new Map<string, { countryCode: string; stateName: string; name: string }>()
    for (const c of countries) {
        const countryCode = (c.iso2 ?? "").toUpperCase()
        if (!/^[A-Z]{2}$/.test(countryCode)) continue
        for (const s of c.states ?? []) {
            const stateName = (s.name ?? "").trim()
            if (!stateName) continue
            states.set(`${countryCode}|${stateName.toLowerCase()}`, { countryCode, code: (s.iso2 ?? s.state_code ?? "").trim(), name: stateName })
            for (const city of s.cities ?? []) {
                const name = (city.name ?? "").trim()
                if (name) cities.set(`${countryCode}|${stateName.toLowerCase()}|${name.toLowerCase()}`, { countryCode, stateName, name })
            }
        }
    }
    return { states: [...states.values()], cities: [...cities.values()] }
}

/** India Post's state names are upper case; use the app's spelling where it has one */
const IN_STATES = new Map(GEO_STATES.filter((s) => s.countryCode === "IN").map((s) => [s.name.toLowerCase(), s.name]))

export function readPinCodes(csv: string) {
    const parsed = Papa.parse<Record<string, string>>(csv, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h) => h.trim().toLowerCase().replace(/[^a-z]/g, ""),
    })
    const rows = new Map<string, { countryCode: string; postalCode: string; placeName: string; district: string; stateName: string }>()
    for (const r of parsed.data) {
        const postalCode = String(r.pincode ?? "").trim()
        const placeName = titleCase(String(r.officename ?? "").replace(/\s+(B\.?O|S\.?O|H\.?O)\.?$/i, ""))
        if (!/^[1-9]\d{5}$/.test(postalCode) || !placeName) continue
        const rawState = titleCase(String(r.statename ?? r.state ?? ""))
        rows.set(`${postalCode}|${placeName.toLowerCase()}`, {
            countryCode: "IN",
            postalCode,
            placeName,
            district: titleCase(String(r.district ?? r.districtname ?? "")),
            stateName: IN_STATES.get(rawState.toLowerCase()) ?? rawState,
        })
    }
    return [...rows.values()]
}

