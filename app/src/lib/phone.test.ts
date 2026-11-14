import { describe, expect, it } from "vitest"
import { getCountryCallingCode, isSupportedCountry } from "libphonenumber-js"
import { COUNTRIES } from "./constants/countries"
import { phoneProblem, postcodeProblem } from "./phone"

describe("phone numbers", () => {
    it("accepts real numbers and empty ones", () => {
        expect(phoneProblem("+91 98765 43210")).toBeNull()
        expect(phoneProblem("+971 50 123 4567")).toBeNull()
        expect(phoneProblem("+1 212 555 0100")).toBeNull()
        expect(phoneProblem("")).toBeNull()
        expect(phoneProblem("98765 43210")).toBeNull() // no country code: not checked
    })

    it("refuses numbers of the wrong length or with letters", () => {
        expect(phoneProblem("+91 12345")).toMatch(/too short or too long/)
        expect(phoneProblem("+91 98765 4321O")).toMatch(/digits only/)
    })

    it("every country's dialling code matches Google's phone data", () => {
        for (const c of COUNTRIES) {
            if (!isSupportedCountry(c.code as never)) continue
            // Caribbean and some islands are listed with their area code (+1 264 Anguilla): same country code
            expect(c.dialCode.startsWith(`+${getCountryCallingCode(c.code as never)}`), `${c.code} ${c.dialCode}`).toBe(true)
        }
    })
})

describe("postcodes", () => {
    it("checks the format where the country has one", () => {
        expect(postcodeProblem("400001", "IN")).toBeNull()
        expect(postcodeProblem("4000", "IN")).toMatch(/PIN code/)
        expect(postcodeProblem("SW1A 1AA", "GB")).toBeNull()
        expect(postcodeProblem("90210", "US")).toBeNull()
        expect(postcodeProblem("ABC", "US")).toMatch(/postcode/)
    })

    it("lets anything through where there's no rule or no country", () => {
        expect(postcodeProblem("00000", "AE")).toBeNull()
        expect(postcodeProblem("123", "")).toBeNull()
        expect(postcodeProblem("", "IN")).toBeNull()
    })
})
