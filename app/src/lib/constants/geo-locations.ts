/**
 * Comprehensive Geographic Locations Dataset
 * Provides autocomplete & auto-suggest data for Countries, States/Provinces, and Cities.
 */

export interface CountryItem {
  name: string
  code: string
  flag: string
  dialCode: string
}

export interface StateItem {
  name: string
  code?: string
  countryCode: string
}

export interface CityItem {
  name: string
  stateName: string
  countryCode: string
}

export const GEO_COUNTRIES: CountryItem[] = [
  { name: "India", code: "IN", flag: "🇮🇳", dialCode: "+91" },
  { name: "United States", code: "US", flag: "🇺🇸", dialCode: "+1" },
  { name: "United Arab Emirates", code: "AE", flag: "🇦🇪", dialCode: "+971" },
  { name: "United Kingdom", code: "GB", flag: "🇬🇧", dialCode: "+44" },
  { name: "Australia", code: "AU", flag: "🇦🇺", dialCode: "+61" },
  { name: "Saudi Arabia", code: "SA", flag: "🇸🇦", dialCode: "+966" },
  { name: "Canada", code: "CA", flag: "🇨🇦", dialCode: "+1" },
  { name: "Singapore", code: "SG", flag: "🇸🇬", dialCode: "+65" },
  { name: "Germany", code: "DE", flag: "🇩🇪", dialCode: "+49" },
  { name: "France", code: "FR", flag: "🇫🇷", dialCode: "+33" },
  { name: "Japan", code: "JP", flag: "🇯🇵", dialCode: "+81" },
  { name: "South Africa", code: "ZA", flag: "🇿🇦", dialCode: "+27" },
  { name: "New Zealand", code: "NZ", flag: "🇳🇿", dialCode: "+64" },
  { name: "Malaysia", code: "MY", flag: "🇲🇾", dialCode: "+60" },
  { name: "Qatar", code: "QA", flag: "🇶🇦", dialCode: "+974" },
  { name: "Oman", code: "OM", flag: "🇴🇲", dialCode: "+968" },
  { name: "Kuwait", code: "KW", flag: "🇰🇼", dialCode: "+965" },
  { name: "Bahrain", code: "BH", flag: "🇧🇭", dialCode: "+973" },
  { name: "Brazil", code: "BR", flag: "🇧🇷", dialCode: "+55" },
  { name: "Mexico", code: "MX", flag: "🇲🇽", dialCode: "+52" },
]

export const GEO_STATES: StateItem[] = [
  // India (36 States & UTs)
  { name: "Maharashtra", code: "MH", countryCode: "IN" },
  { name: "Delhi", code: "DL", countryCode: "IN" },
  { name: "Karnataka", code: "KA", countryCode: "IN" },
  { name: "Tamil Nadu", code: "TN", countryCode: "IN" },
  { name: "Gujarat", code: "GJ", countryCode: "IN" },
  { name: "Uttar Pradesh", code: "UP", countryCode: "IN" },
  { name: "Telangana", code: "TS", countryCode: "IN" },
  { name: "West Bengal", code: "WB", countryCode: "IN" },
  { name: "Rajasthan", code: "RJ", countryCode: "IN" },
  { name: "Madhya Pradesh", code: "MP", countryCode: "IN" },
  { name: "Haryana", code: "HR", countryCode: "IN" },
  { name: "Kerala", code: "KL", countryCode: "IN" },
  { name: "Punjab", code: "PB", countryCode: "IN" },
  { name: "Andhra Pradesh", code: "AP", countryCode: "IN" },
  { name: "Bihar", code: "BR", countryCode: "IN" },
  { name: "Odisha", code: "OD", countryCode: "IN" },
  { name: "Assam", code: "AS", countryCode: "IN" },
  { name: "Jharkhand", code: "JH", countryCode: "IN" },
  { name: "Chhattisgarh", code: "CG", countryCode: "IN" },
  { name: "Uttarakhand", code: "UK", countryCode: "IN" },
  { name: "Goa", code: "GA", countryCode: "IN" },
  { name: "Himachal Pradesh", code: "HP", countryCode: "IN" },
  { name: "Jammu and Kashmir", code: "JK", countryCode: "IN" },
  { name: "Chandigarh", code: "CH", countryCode: "IN" },
  { name: "Puducherry", code: "PY", countryCode: "IN" },

  // United States (Key States)
  { name: "California", code: "CA", countryCode: "US" },
  { name: "New York", code: "NY", countryCode: "US" },
  { name: "Texas", code: "TX", countryCode: "US" },
  { name: "Florida", code: "FL", countryCode: "US" },
  { name: "Illinois", code: "IL", countryCode: "US" },
  { name: "Washington", code: "WA", countryCode: "US" },
  { name: "Pennsylvania", code: "PA", countryCode: "US" },
  { name: "Ohio", code: "OH", countryCode: "US" },
  { name: "Georgia", code: "GA", countryCode: "US" },
  { name: "North Carolina", code: "NC", countryCode: "US" },
  { name: "Michigan", code: "MI", countryCode: "US" },
  { name: "New Jersey", code: "NJ", countryCode: "US" },
  { name: "Virginia", code: "VA", countryCode: "US" },
  { name: "Massachusetts", code: "MA", countryCode: "US" },
  { name: "Colorado", code: "CO", countryCode: "US" },
  { name: "Arizona", code: "AZ", countryCode: "US" },

  // UAE (7 Emirates)
  { name: "Dubai", code: "DXB", countryCode: "AE" },
  { name: "Abu Dhabi", code: "AUH", countryCode: "AE" },
  { name: "Sharjah", code: "SHJ", countryCode: "AE" },
  { name: "Ajman", code: "AJM", countryCode: "AE" },
  { name: "Ras Al Khaimah", code: "RAK", countryCode: "AE" },
  { name: "Fujairah", code: "FUJ", countryCode: "AE" },
  { name: "Umm Al Quwain", code: "UAQ", countryCode: "AE" },

  // United Kingdom
  { name: "England", code: "ENG", countryCode: "GB" },
  { name: "Scotland", code: "SCT", countryCode: "GB" },
  { name: "Wales", code: "WLS", countryCode: "GB" },
  { name: "Northern Ireland", code: "NIR", countryCode: "GB" },

  // Australia
  { name: "New South Wales", code: "NSW", countryCode: "AU" },
  { name: "Victoria", code: "VIC", countryCode: "AU" },
  { name: "Queensland", code: "QLD", countryCode: "AU" },
  { name: "Western Australia", code: "WA", countryCode: "AU" },
  { name: "South Australia", code: "SA", countryCode: "AU" },

  // Saudi Arabia
  { name: "Riyadh Province", code: "RIY", countryCode: "SA" },
  { name: "Makkah Province", code: "MAK", countryCode: "SA" },
  { name: "Eastern Province", code: "EAS", countryCode: "SA" },
  { name: "Madinah Province", code: "MAD", countryCode: "SA" },

  // Canada
  { name: "Ontario", code: "ON", countryCode: "CA" },
  { name: "Quebec", code: "QC", countryCode: "CA" },
  { name: "British Columbia", code: "BC", countryCode: "CA" },
  { name: "Alberta", code: "AB", countryCode: "CA" },
]

export const GEO_CITIES: CityItem[] = [
  // India - Maharashtra
  { name: "Mumbai", stateName: "Maharashtra", countryCode: "IN" },
  { name: "Pune", stateName: "Maharashtra", countryCode: "IN" },
  { name: "Nagpur", stateName: "Maharashtra", countryCode: "IN" },
  { name: "Thane", stateName: "Maharashtra", countryCode: "IN" },
  { name: "Nashik", stateName: "Maharashtra", countryCode: "IN" },
  { name: "Aurangabad", stateName: "Maharashtra", countryCode: "IN" },
  { name: "Navi Mumbai", stateName: "Maharashtra", countryCode: "IN" },
  { name: "Solapur", stateName: "Maharashtra", countryCode: "IN" },
  { name: "Kolhapur", stateName: "Maharashtra", countryCode: "IN" },

  // India - Delhi
  { name: "New Delhi", stateName: "Delhi", countryCode: "IN" },
  { name: "Delhi", stateName: "Delhi", countryCode: "IN" },

  // India - Karnataka
  { name: "Bengaluru", stateName: "Karnataka", countryCode: "IN" },
  { name: "Mysuru", stateName: "Karnataka", countryCode: "IN" },
  { name: "Hubballi", stateName: "Karnataka", countryCode: "IN" },
  { name: "Mangaluru", stateName: "Karnataka", countryCode: "IN" },

  // India - Tamil Nadu
  { name: "Chennai", stateName: "Tamil Nadu", countryCode: "IN" },
  { name: "Coimbatore", stateName: "Tamil Nadu", countryCode: "IN" },
  { name: "Madurai", stateName: "Tamil Nadu", countryCode: "IN" },

  // India - Gujarat
  { name: "Ahmedabad", stateName: "Gujarat", countryCode: "IN" },
  { name: "Surat", stateName: "Gujarat", countryCode: "IN" },
  { name: "Vadodara", stateName: "Gujarat", countryCode: "IN" },
  { name: "Rajkot", stateName: "Gujarat", countryCode: "IN" },

  // India - Telangana
  { name: "Hyderabad", stateName: "Telangana", countryCode: "IN" },
  { name: "Warangal", stateName: "Telangana", countryCode: "IN" },

  // India - West Bengal
  { name: "Kolkata", stateName: "West Bengal", countryCode: "IN" },
  { name: "Howrah", stateName: "West Bengal", countryCode: "IN" },

  // India - Rajasthan
  { name: "Jaipur", stateName: "Rajasthan", countryCode: "IN" },
  { name: "Jodhpur", stateName: "Rajasthan", countryCode: "IN" },
  { name: "Udaipur", stateName: "Rajasthan", countryCode: "IN" },

  // India - Uttar Pradesh
  { name: "Noida", stateName: "Uttar Pradesh", countryCode: "IN" },
  { name: "Lucknow", stateName: "Uttar Pradesh", countryCode: "IN" },
  { name: "Kanpur", stateName: "Uttar Pradesh", countryCode: "IN" },
  { name: "Varanasi", stateName: "Uttar Pradesh", countryCode: "IN" },
  { name: "Agra", stateName: "Uttar Pradesh", countryCode: "IN" },

  // India - Haryana
  { name: "Gurugram", stateName: "Haryana", countryCode: "IN" },
  { name: "Faridabad", stateName: "Haryana", countryCode: "IN" },

  // United States
  { name: "New York", stateName: "New York", countryCode: "US" },
  { name: "Buffalo", stateName: "New York", countryCode: "US" },
  { name: "Los Angeles", stateName: "California", countryCode: "US" },
  { name: "San Francisco", stateName: "California", countryCode: "US" },
  { name: "San Jose", stateName: "California", countryCode: "US" },
  { name: "San Diego", stateName: "California", countryCode: "US" },
  { name: "Houston", stateName: "Texas", countryCode: "US" },
  { name: "Austin", stateName: "Texas", countryCode: "US" },
  { name: "Dallas", stateName: "Texas", countryCode: "US" },
  { name: "Miami", stateName: "Florida", countryCode: "US" },
  { name: "Orlando", stateName: "Florida", countryCode: "US" },
  { name: "Chicago", stateName: "Illinois", countryCode: "US" },
  { name: "Seattle", stateName: "Washington", countryCode: "US" },

  // UAE
  { name: "Dubai", stateName: "Dubai", countryCode: "AE" },
  { name: "Abu Dhabi", stateName: "Abu Dhabi", countryCode: "AE" },
  { name: "Sharjah", stateName: "Sharjah", countryCode: "AE" },
  { name: "Al Ain", stateName: "Abu Dhabi", countryCode: "AE" },
  { name: "Ajman", stateName: "Ajman", countryCode: "AE" },

  // United Kingdom
  { name: "London", stateName: "England", countryCode: "GB" },
  { name: "Manchester", stateName: "England", countryCode: "GB" },
  { name: "Birmingham", stateName: "England", countryCode: "GB" },
  { name: "Edinburgh", stateName: "Scotland", countryCode: "GB" },

  // Australia
  { name: "Sydney", stateName: "New South Wales", countryCode: "AU" },
  { name: "Melbourne", stateName: "Victoria", countryCode: "AU" },
  { name: "Brisbane", stateName: "Queensland", countryCode: "AU" },
  { name: "Perth", stateName: "Western Australia", countryCode: "AU" },

  // Saudi Arabia
  { name: "Riyadh", stateName: "Riyadh Province", countryCode: "SA" },
  { name: "Jeddah", stateName: "Makkah Province", countryCode: "SA" },
  { name: "Dammam", stateName: "Eastern Province", countryCode: "SA" },
  { name: "Khobar", stateName: "Eastern Province", countryCode: "SA" },
]

export function searchCountries(query: string): CountryItem[] {
  if (!query) return GEO_COUNTRIES.slice(0, 10)
  const q = query.toLowerCase().trim()
  return GEO_COUNTRIES.filter(
    (c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
  ).slice(0, 8)
}

export function searchStates(query: string, countryNameOrCode?: string): StateItem[] {
  let list = GEO_STATES
  if (countryNameOrCode) {
    const c = countryNameOrCode.toUpperCase().trim()
    const foundCountry = GEO_COUNTRIES.find(
      (item) => item.name.toUpperCase() === c || item.code.toUpperCase() === c
    )
    if (foundCountry) {
      list = list.filter((s) => s.countryCode === foundCountry.code)
    }
  }

  if (!query) return list.slice(0, 10)
  const q = query.toLowerCase().trim()
  return list.filter(
    (s) => s.name.toLowerCase().includes(q) || (s.code && s.code.toLowerCase().includes(q))
  ).slice(0, 8)
}

export function searchCities(
  query: string,
  stateName?: string,
  countryNameOrCode?: string
): CityItem[] {
  let list = GEO_CITIES

  if (countryNameOrCode) {
    const c = countryNameOrCode.toUpperCase().trim()
    const foundCountry = GEO_COUNTRIES.find(
      (item) => item.name.toUpperCase() === c || item.code.toUpperCase() === c
    )
    if (foundCountry) {
      list = list.filter((city) => city.countryCode === foundCountry.code)
    }
  }

  if (stateName) {
    const s = stateName.toLowerCase().trim()
    const matchedStateCities = list.filter((city) => city.stateName.toLowerCase() === s)
    if (matchedStateCities.length > 0) {
      list = matchedStateCities
    }
  }

  if (!query) return list.slice(0, 10)
  const q = query.toLowerCase().trim()
  return list.filter((city) => city.name.toLowerCase().includes(q)).slice(0, 8)
}
