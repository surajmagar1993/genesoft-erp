import { describe, expect, it } from "vitest"
import { readPinCodes, readWorld, titleCase } from "./geo-import"

describe("address data import", () => {
    it("title-cases India Post's upper-case names", () => {
        expect(titleCase("ANDAMAN AND NICOBAR ISLANDS")).toBe("Andaman and Nicobar Islands")
        expect(titleCase("  NEW   DELHI ")).toBe("New Delhi")
    })

    it("reads states and cities per country, skipping blanks and duplicates", () => {
        const world = JSON.stringify([
            { iso2: "IN", states: [{ name: "Maharashtra", iso2: "MH", cities: [{ name: "Pune" }, { name: "Pune" }, { name: "" }] }] },
            { iso2: "AE", states: [{ name: "Dubai", state_code: "DU", cities: [{ name: "Dubai" }] }] },
            { iso2: "", states: [{ name: "Nowhere" }] },
        ])
        const { states, cities } = readWorld(world)
        expect(states).toEqual([
            { countryCode: "IN", code: "MH", name: "Maharashtra" },
            { countryCode: "AE", code: "DU", name: "Dubai" },
        ])
        expect(cities).toEqual([
            { countryCode: "IN", stateName: "Maharashtra", name: "Pune" },
            { countryCode: "AE", stateName: "Dubai", name: "Dubai" },
        ])
    })

    it("reads India Post's directory: clean office names, the app's state spelling, bad rows skipped", () => {
        const csv = [
            "circlename,regionname,divisionname,officename,pincode,officetype,delivery,district,statename",
            "Maharashtra Circle,Mumbai,Mumbai GPO,Mumbai G.P.O. H.O,400001,HO,Delivery,MUMBAI,MAHARASHTRA",
            "Maharashtra Circle,Mumbai,Mumbai GPO,Mumbai G.P.O. H.O,400001,HO,Delivery,MUMBAI,MAHARASHTRA",
            "Delhi Circle,Delhi,New Delhi,Connaught Place S.O,110001,SO,Delivery,NEW DELHI,DELHI",
            "Bad,Row,Here,Somewhere,12345,SO,Delivery,X,Y",
        ].join("\n")
        expect(readPinCodes(csv)).toEqual([
            { countryCode: "IN", postalCode: "400001", placeName: "Mumbai G.P.O.", district: "Mumbai", stateName: "Maharashtra" },
            { countryCode: "IN", postalCode: "110001", placeName: "Connaught Place", district: "New Delhi", stateName: "Delhi" },
        ])
    })
})
