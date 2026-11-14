import { describe, expect, it } from "vitest"
import { readGeoNamesPostal, readPinCodes, readWorld, titleCase } from "./geo-import"

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

    it("reads GeoNames postal codes with the app's state spellings", () => {
        const tsv = [
            "IN\t744301\tCarnicobar\tAndaman & Nicobar Islands\t01\tNicobar\t638\tCarnicobar\t\t9.18\t92.77\t3",
            "IN\t605001\tPondicherry H.O\tPondicherry\t22\tPondicherry\t\t\t\t11.9\t79.8\t4",
            "IN\t194101\tLeh\tJammu & Kashmir\t12\tLeh\t\t\t\t34.1\t77.5\t4",
            "IN\t180001\tJammu\tJammu & Kashmir\t12\tJammu\t\t\t\t32.7\t74.8\t4",
            "IN\t12345\tBad\tX\t00\tY",
            "",
        ].join("\n")
        expect(readGeoNamesPostal(tsv).map((r) => [r.postalCode, r.stateName, r.district])).toEqual([
            ["744301", "Andaman and Nicobar Islands", "Nicobar"],
            ["605001", "Puducherry", "Pondicherry"],
            ["194101", "Ladakh", "Leh"],
            ["180001", "Jammu and Kashmir", "Jammu"],
        ])
    })
})
