import { COUNTRIES } from "@/lib/constants/countries"

/** Countries for an address field: exact name or code first, then names starting with, then containing the text. */
export function searchCountries(query: string): typeof COUNTRIES {
    const q = query.trim().toLowerCase()
    if (!q) return COUNTRIES.slice(0, 15)
    const rank = (c: (typeof COUNTRIES)[number]) => {
        const name = c.name.toLowerCase()
        if (name === q || c.code.toLowerCase() === q) return 0
        if (name.startsWith(q)) return 1
        if (name.includes(q)) return 2
        return 3
    }
    return COUNTRIES.map((c) => ({ c, r: rank(c) }))
        .filter((x) => x.r < 3)
        .sort((a, b) => a.r - b.r || a.c.name.localeCompare(b.c.name))
        .slice(0, 15)
        .map((x) => x.c)
}
