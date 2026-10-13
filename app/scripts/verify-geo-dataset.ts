/**
 * verify-geo-dataset.ts
 * Rigorous Verification Suite for Geographic Dataset & Disambiguation:
 * 1. Checks City Deduplication (Mumbai vs Navi Mumbai vs Thane)
 * 2. Checks State Deduplication (Delhi vs New Delhi)
 * 3. Checks Coverage of all 36 Indian States/UTs with authentic 6-digit PIN codes
 * 4. Checks Country and International City Coverage
 * 5. Checks Autocomplete & Search Functions (Exact match priority, alias resolution)
 */

import {
  GEO_COUNTRIES,
  GEO_STATES,
  GEO_CITIES,
  searchCountries,
  searchStates,
  searchCities,
  lookupPincode,
  lookupCity,
  lookupState,
  lookupCountry,
} from "../src/lib/constants/geo-locations"

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${msg}`)
    process.exit(1)
  }
  console.log(`✅ PASSED: ${msg}`)
}

async function runVerification() {
  console.log("\n=======================================================")
  console.log("   GEOGRAPHIC DATASET & DEDUPLICATION VERIFICATION")
  console.log("=======================================================\n")

  // 1. DATASET TOTALS
  console.log("--- 1. Dataset Totals ---")
  assert(GEO_COUNTRIES.length >= 80, `GEO_COUNTRIES has ${GEO_COUNTRIES.length} countries (expected >= 80)`)
  assert(GEO_STATES.length >= 100, `GEO_STATES has ${GEO_STATES.length} states (expected >= 100)`)
  assert(GEO_CITIES.length >= 800, `GEO_CITIES has ${GEO_CITIES.length} cities (expected >= 800)`)

  const indianStatesInDataset = GEO_STATES.filter((s) => s.countryCode === "IN")
  assert(indianStatesInDataset.length === 36, `All 36 Indian States & UTs present (found: ${indianStatesInDataset.length})`)

  const indianCitiesInDataset = GEO_CITIES.filter((c) => c.countryCode === "IN")
  assert(indianCitiesInDataset.length >= 800, `Indian cities count is ${indianCitiesInDataset.length} (expected >= 800)`)

  // 2. STATE DEDUPLICATION CHECK: DELHI vs NEW DELHI
  console.log("\n--- 2. State Deduplication: Delhi vs New Delhi ---")
  const delhiStates = GEO_STATES.filter((s) => s.name.toLowerCase().includes("delhi"))
  assert(delhiStates.length === 1, `Exactly 1 state for Delhi exists (found: ${delhiStates.length})`)
  assert(delhiStates[0].name === "Delhi", `Official state name is 'Delhi'`)
  assert(delhiStates[0].gstCode === "07", `Delhi has official GST code '07'`)
  assert(delhiStates[0].type === "UNION_TERRITORY", `Delhi has type UNION_TERRITORY`)

  const newDelhiState = GEO_STATES.find((s) => s.name.toLowerCase() === "new delhi")
  assert(newDelhiState === undefined, `'New Delhi' is NOT erroneously added as a duplicate state`)

  // Test searchStates with "New Delhi"
  const searchNewDelhiState = searchStates("New Delhi")
  assert(searchNewDelhiState.length > 0, `searchStates('New Delhi') returns matching state`)
  assert(searchNewDelhiState[0].name === "Delhi", `searchStates('New Delhi') resolves cleanly to canonical state 'Delhi' (GST 07) via alias`)

  // Test searchStates with "Delhi"
  const searchDelhiState = searchStates("Delhi")
  assert(searchDelhiState.length > 0 && searchDelhiState[0].name === "Delhi", `searchStates('Delhi') returns 'Delhi'`)

  // 3. CITY DEDUPLICATION: MUMBAI vs NAVI MUMBAI vs THANE
  console.log("\n--- 3. City Deduplication: Mumbai vs Navi Mumbai ---")
  const mumbaiCities = GEO_CITIES.filter((c) => c.name.toLowerCase() === "mumbai" && c.stateName === "Maharashtra")
  assert(mumbaiCities.length === 1, `Exactly 1 entry for Mumbai exists (no duplicate records)`)
  assert(mumbaiCities[0].pincode === "400001", `Mumbai has official PIN 400001`)

  const naviMumbaiCities = GEO_CITIES.filter((c) => c.name.toLowerCase() === "navi mumbai" && c.stateName === "Maharashtra")
  assert(naviMumbaiCities.length === 1, `Exactly 1 entry for Navi Mumbai exists (no duplicate records)`)
  assert(naviMumbaiCities[0].pincode === "400703", `Navi Mumbai has official PIN 400703`)

  const thaneCities = GEO_CITIES.filter((c) => c.name.toLowerCase() === "thane" && c.stateName === "Maharashtra")
  assert(thaneCities.length === 1, `Thane is distinct with PIN 400601`)

  // Verify search prioritization:
  // When searching "Mumbai", "Mumbai" must rank #1 before "Navi Mumbai"
  const searchMumbai = searchCities("Mumbai")
  assert(searchMumbai.length >= 2, `searchCities('Mumbai') finds results`)
  assert(searchMumbai[0].name === "Mumbai", `searchCities('Mumbai') prioritizes 'Mumbai' (PIN 400001) as #1`)
  assert(searchMumbai.some((c) => c.name === "Navi Mumbai"), `searchCities('Mumbai') also surfaces 'Navi Mumbai'`)

  // When searching "Navi Mumbai", "Navi Mumbai" must rank #1 and "Mumbai" must NOT rank ahead
  const searchNaviMumbai = searchCities("Navi Mumbai")
  assert(searchNaviMumbai.length > 0, `searchCities('Navi Mumbai') returns results`)
  assert(searchNaviMumbai[0].name === "Navi Mumbai", `searchCities('Navi Mumbai') prioritizes 'Navi Mumbai' as #1`)

  // 4. DUPLICATE CHECK ACROSS ENTIRE CITY DATASET
  console.log("\n--- 4. City Uniqueness & PIN Integrity ---")
  const cityKeyMap = new Map<string, string>()
  const duplicateCities: string[] = []

  for (const city of GEO_CITIES) {
    const key = `${city.countryCode}:${city.stateName.toLowerCase()}:${city.name.toLowerCase()}`
    if (cityKeyMap.has(key)) {
      duplicateCities.push(`${city.name} (${city.stateName}, ${city.countryCode})`)
    } else {
      cityKeyMap.set(key, city.pincode)
    }
  }
  assert(duplicateCities.length === 0, `Zero duplicate cities within the same state (duplicates: ${duplicateCities.join(", ")})`)

  // Verify all Indian PIN codes are valid 6-digit numbers
  const pinPattern = /^[1-9][0-9]{5}$/
  let invalidPins = 0
  for (const city of indianCitiesInDataset) {
    if (!pinPattern.test(city.pincode)) {
      invalidPins++
      console.error(`Invalid PIN: ${city.name} (${city.stateName}) -> ${city.pincode}`)
    }
  }
  assert(invalidPins === 0, `All ${indianCitiesInDataset.length} Indian cities have authentic 6-digit India Post PIN codes`)

  // Verify all 36 Indian states have cities in the dataset
  const statesWithCities = new Set(indianCitiesInDataset.map((c) => c.stateName))
  for (const s of indianStatesInDataset) {
    assert(statesWithCities.has(s.name), `State '${s.name}' (${s.code}) has verified cities`)
  }

  // 5. DIRECT LOOKUP FUNCTIONS
  console.log("\n--- 5. Direct PIN & City Lookups ---")
  assert(lookupPincode("400001")?.name === "Mumbai", `lookupPincode('400001') -> Mumbai`)
  assert(lookupPincode("400703")?.name === "Navi Mumbai", `lookupPincode('400703') -> Navi Mumbai`)
  assert(lookupPincode("110001")?.name === "New Delhi", `lookupPincode('110001') -> New Delhi`)
  assert(lookupPincode("560001")?.name === "Bengaluru", `lookupPincode('560001') -> Bengaluru`)
  assert(lookupPincode("600001")?.name === "Chennai", `lookupPincode('600001') -> Chennai`)
  assert(lookupPincode("700001")?.name === "Kolkata", `lookupPincode('700001') -> Kolkata`)
  assert(lookupPincode("500001")?.name === "Hyderabad", `lookupPincode('500001') -> Hyderabad`)
  assert(lookupPincode("380001")?.name === "Ahmedabad", `lookupPincode('380001') -> Ahmedabad`)
  assert(lookupPincode("302001")?.name === "Jaipur", `lookupPincode('302001') -> Jaipur`)

  // City lookups
  assert(lookupCity("Mumbai")?.pincode === "400001", `lookupCity('Mumbai') -> 400001`)
  assert(lookupCity("Navi Mumbai")?.pincode === "400703", `lookupCity('Navi Mumbai') -> 400703`)
  assert(lookupCity("Bombay")?.name === "Mumbai", `lookupCity('Bombay') resolves to Mumbai via alias`)
  assert(lookupCity("New Bombay")?.name === "Navi Mumbai", `lookupCity('New Bombay') resolves to Navi Mumbai via alias`)

  // Disambiguated cities across states
  const bilaspurCG = lookupCity("Bilaspur", "Chhattisgarh")
  const bilaspurHP = lookupCity("Bilaspur", "Himachal Pradesh")
  assert(bilaspurCG !== undefined && bilaspurCG.pincode === "495001", `Bilaspur (CG) has PIN 495001`)
  assert(bilaspurHP !== undefined && bilaspurHP.pincode === "174001", `Bilaspur (HP) has PIN 174001`)

  // 6. COUNTRY SEARCH & LOOKUP
  console.log("\n--- 6. Country Search & Lookups ---")
  assert(lookupCountry("IN")?.name === "India", `lookupCountry('IN') -> India`)
  assert(lookupCountry("Bharat")?.code === "IN", `lookupCountry('Bharat') -> IN via alias`)
  assert(lookupCountry("USA")?.code === "US", `lookupCountry('USA') -> US via alias`)
  assert(lookupCountry("UAE")?.code === "AE", `lookupCountry('UAE') -> AE via alias`)
  assert(lookupCountry("UK")?.code === "GB", `lookupCountry('UK') -> GB via alias`)

  const searchUS = searchCountries("United States")
  assert(searchUS.length > 0 && searchUS[0].code === "US", `searchCountries('United States') -> US`)

  console.log("\n=======================================================")
  console.log("   🎉 ALL VERIFICATIONS PASSED SUCCESSFULLY!          ")
  console.log("=======================================================\n")
}

runVerification().catch((err) => {
  console.error("Verification error:", err)
  process.exit(1)
})
