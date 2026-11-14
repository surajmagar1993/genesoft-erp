import { describe, expect, it } from "vitest"
import { searchCountries } from "./country-search"

describe("country search", () => {
    it("puts exact matches and codes first", () => {
        expect(searchCountries("india")[0].code).toBe("IN")
        expect(searchCountries("AE")[0].name).toBe("United Arab Emirates")
        expect(searchCountries("united").map((c) => c.code)).toEqual(expect.arrayContaining(["AE", "GB", "US"]))
        expect(searchCountries("zzz")).toEqual([])
    })
})
