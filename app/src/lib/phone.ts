import { isPossiblePhoneNumber } from "libphonenumber-js"
import { postcodeValidator, postcodeValidatorExistsForCountry } from "postcode-validator"

/**
 * Checks for numbers and postcodes typed into forms, shared by the browser
 * and the server actions. Phone data is Google's libphonenumber; the check is
 * on length only ("possible" number), so unusual but real numbers aren't refused.
 */

/** null if the number is fine (or empty), else a message for the form. Phones are stored as "+91 98765 43210". */
export function phoneProblem(phone: string | null | undefined): string | null {
    const value = (phone ?? "").trim()
    if (!value) return null
    if (!value.startsWith("+")) return null // no country code chosen: nothing to check against
    if (!/^\+[\d\s().-]+$/.test(value)) return "Use digits only in the phone number."
    return isPossiblePhoneNumber(value) ? null : `${value} is too short or too long for its country code.`
}

/** null if the postcode fits the country's format (or there's no rule for that country), else a message. */
export function postcodeProblem(postcode: string | null | undefined, countryCode: string | null | undefined): string | null {
    const value = (postcode ?? "").trim()
    const country = (countryCode ?? "").trim().toUpperCase()
    if (!value || country.length !== 2 || !postcodeValidatorExistsForCountry(country)) return null
    return postcodeValidator(value, country) ? null : `${value} isn't a valid ${country === "IN" ? "PIN code" : "postcode"} for this country.`
}
