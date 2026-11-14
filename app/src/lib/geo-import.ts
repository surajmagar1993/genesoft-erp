import Papa from "papaparse"

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
/** India's 28 states and 8 union territories, as the app spells them */
const IN_STATE_NAMES = [
    "Andhra Pradesh",
    "Arunachal Pradesh",
    "Assam",
    "Bihar",
    "Chhattisgarh",
    "Goa",
    "Gujarat",
    "Haryana",
    "Himachal Pradesh",
    "Jharkhand",
    "Karnataka",
    "Kerala",
    "Madhya Pradesh",
    "Maharashtra",
    "Manipur",
    "Meghalaya",
    "Mizoram",
    "Nagaland",
    "Odisha",
    "Punjab",
    "Rajasthan",
    "Sikkim",
    "Tamil Nadu",
    "Telangana",
    "Tripura",
    "Uttar Pradesh",
    "Uttarakhand",
    "West Bengal",
    "Andaman and Nicobar Islands",
    "Chandigarh",
    "Dadra and Nagar Haveli and Daman and Diu",
    "Delhi",
    "Jammu and Kashmir",
    "Ladakh",
    "Lakshadweep",
    "Puducherry",
]
const IN_STATES = new Map(IN_STATE_NAMES.map((n) => [n.toLowerCase(), n]))

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


/** GeoNames writes some Indian state names differently from the app */
const GEONAMES_STATE: Record<string, string> = {
    pondicherry: "Puducherry",
}
/** Districts GeoNames still files under Jammu & Kashmir, part of Ladakh since 2019 */
const LADAKH_DISTRICTS = new Set(["leh", "kargil", "leh ladakh"])

/**
 * GeoNames postal codes (download.geonames.org/export/zip/IN.zip, CC BY 4.0):
 * tab-separated country, postal code, place, state, state code, district, …
 */
export function readGeoNamesPostal(tsv: string) {
    const rows = new Map<string, { countryCode: string; postalCode: string; placeName: string; district: string; stateName: string }>()
    for (const line of tsv.split("\n")) {
        const [country, postalCode, place, state, , district] = line.split("\t")
        if (country !== "IN" || !/^[1-9]\d{5}$/.test(postalCode ?? "") || !place?.trim()) continue
        const plain = (state ?? "").replace(/\s*&\s*/g, " and ").trim()
        let stateName = GEONAMES_STATE[plain.toLowerCase()] ?? IN_STATES.get(plain.toLowerCase()) ?? plain
        if (LADAKH_DISTRICTS.has((district ?? "").trim().toLowerCase())) stateName = "Ladakh"
        const placeName = place.trim()
        rows.set(`${postalCode}|${placeName.toLowerCase()}`, { countryCode: "IN", postalCode, placeName, district: (district ?? "").trim(), stateName })
    }
    return [...rows.values()]
}
