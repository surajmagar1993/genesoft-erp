import { describe, expect, it } from "vitest"
import { prisma } from "@/lib/prisma"
import { findCities, findPinCode, findStates } from "@/app/actions/geo"
import { actAs, createTestTenant } from "./helpers"

describe("address suggestions from the reference tables", () => {
    it("finds states, cities and PIN codes by country, and nothing for unknown input", async () => {
        const { user } = await createTestTenant()
        actAs(user)
        await prisma.geoState.createMany({ data: [{ countryCode: "IN", code: "MH", name: "Maharashtra" }, { countryCode: "IN", code: "MN", name: "Manipur" }, { countryCode: "AE", code: "DU", name: "Dubai" }] })
        await prisma.geoCity.createMany({ data: [{ countryCode: "IN", stateName: "Maharashtra", name: "Pune" }, { countryCode: "IN", stateName: "Maharashtra", name: "Panvel" }, { countryCode: "IN", stateName: "Punjab", name: "Patiala" }] })
        await prisma.geoPostalCode.createMany({ data: [{ postalCode: "411001", placeName: "Pune City", district: "Pune", stateName: "Maharashtra" }] })

        expect((await findStates("ma", "India")).map((s) => s.value)).toEqual(["Maharashtra", "Manipur"])
        expect((await findStates("", "AE")).map((s) => s.value)).toEqual(["Dubai"])
        expect((await findCities("pa", "Maharashtra", "IN")).map((c) => c.value)).toEqual(["Panvel"])
        expect((await findCities("pa", "", "IN")).map((c) => c.value)).toEqual(["Panvel", "Patiala"])
        expect(await findCities("p", "", "IN")).toEqual([]) // at least two letters
        expect(await findCities("pa%", "", "IN")).toHaveLength(2) // wildcards are ignored, not used
        expect(await findPinCode("411 001")).toEqual([{ place: "Pune City", district: "Pune", state: "Maharashtra" }])
        expect(await findPinCode("41100")).toEqual([])
        expect(await findStates("ma", "Atlantis")).toEqual([])
    })
})
