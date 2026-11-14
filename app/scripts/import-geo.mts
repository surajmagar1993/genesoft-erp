/**
 * Loads address reference data into geo_states, geo_cities and geo_postal_codes
 * (migration 4_geo_reference_data). Run by hand from app/, after downloading:
 *
 *   1. States and cities, every country: countries+states+cities.json from
 *      https://github.com/dr5hn/countries-states-cities-database (json/ folder).
 *      Licence ODbL-1.0: credit "countries-states-cities-database by dr5hn".
 *   2. Indian PIN codes, either source:
 *      --geonames: IN.txt inside https://download.geonames.org/export/zip/IN.zip
 *        (GeoNames, CC BY 4.0: credit "GeoNames"), or
 *      --pincodes: "All India Pincode Directory" CSV from data.gov.in
 *        (India Post, Government Open Data Licence – India).
 *
 *   npx tsx --env-file=.env.local scripts/import-geo.mts --world <file.json> --pincodes <file.csv>          (dry run: counts only)
 *   npx tsx --env-file=.env.local scripts/import-geo.mts --world <file.json> --pincodes <file.csv> --write  (replaces the rows)
 *
 * Either file can be left out to load only the other. Each table is replaced
 * in one transaction, so a failed run leaves the old rows in place.
 */
import { readFileSync } from "node:fs"
import { prisma } from "../src/lib/prisma"
import { readGeoNamesPostal, readPinCodes, readWorld } from "../src/lib/geo-import"

const args = process.argv.slice(2)
const arg = (name: string) => {
    const i = args.indexOf(name)
    return i >= 0 ? args[i + 1] : undefined
}
const worldFile = arg("--world")
const pinFile = arg("--pincodes")
const geoNamesFile = arg("--geonames")
const write = args.includes("--write")
const CHUNK = 5000

if (!worldFile && !pinFile && !geoNamesFile) {
    console.error("Give --world <countries+states+cities.json> and/or --pincodes <pincode.csv> or --geonames <IN.txt>. Add --write to save.")
    process.exit(1)
}

async function main() {
    if (worldFile) {
        const { states, cities } = readWorld(readFileSync(worldFile, "utf8"))
        await prisma.$transaction(async (tx) => {
            if (!write) return
            await tx.geoState.deleteMany()
            for (let i = 0; i < states.length; i += CHUNK) await tx.geoState.createMany({ data: states.slice(i, i + CHUNK), skipDuplicates: true })
            await tx.geoCity.deleteMany()
            for (let i = 0; i < cities.length; i += CHUNK) await tx.geoCity.createMany({ data: cities.slice(i, i + CHUNK) })
        }, { timeout: 10 * 60_000, maxWait: 60_000 })
        console.log(`states: ${states.length.toLocaleString("en")}, cities: ${cities.length.toLocaleString("en")}${write ? " — saved" : " (dry run)"}`)
        const india = cities.filter((c) => c.countryCode === "IN").length
        console.log(`  India: ${states.filter((s) => s.countryCode === "IN").length} states, ${india.toLocaleString("en")} cities`)
    }
    if (pinFile || geoNamesFile) {
        const pins = pinFile ? readPinCodes(readFileSync(pinFile, "utf8")) : readGeoNamesPostal(readFileSync(geoNamesFile!, "utf8"))
        await prisma.$transaction(async (tx) => {
            if (!write) return
            await tx.geoPostalCode.deleteMany({ where: { countryCode: "IN" } })
            for (let i = 0; i < pins.length; i += CHUNK) await tx.geoPostalCode.createMany({ data: pins.slice(i, i + CHUNK) })
        }, { timeout: 10 * 60_000, maxWait: 60_000 })
        console.log(`PIN codes: ${new Set(pins.map((p) => p.postalCode)).size.toLocaleString("en")} codes, ${pins.length.toLocaleString("en")} post offices${write ? " — saved" : " (dry run)"}`)
    }
}

main()
    .catch((err) => {
        console.error(err)
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
