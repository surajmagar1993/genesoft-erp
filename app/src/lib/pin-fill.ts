import { findPinCode } from "@/app/actions/geo"

const isIndia = (country: string) => ["in", "india", "bharat"].includes(country.trim().toLowerCase())

/**
 * When a full Indian PIN code is typed, look it up (geo_postal_codes) and
 * hand back the district and state to fill in. Only for India; nothing if the
 * code isn't known or the lookup fails (the form just keeps what was typed).
 */
export async function placeForPin(pin: string, country: string): Promise<{ city: string; state: string } | null> {
    if (!isIndia(country) || !/^[1-9]\d{5}$/.test(pin.trim())) return null
    try {
        const [first] = await findPinCode(pin.trim())
        return first ? { city: first.district, state: first.state } : null
    } catch {
        return null
    }
}
