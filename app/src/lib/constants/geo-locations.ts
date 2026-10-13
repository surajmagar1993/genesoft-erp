/**
 * Comprehensive Geographic Locations Dataset
 * Provides official, deduplicated autocomplete & auto-suggest data for:
 * - Countries (ISO-3166-1 alpha-2, dial codes, flags, currency)
 * - States & Union Territories (all 36 Indian states & UTs with GST codes + international)
 * - Cities & Metros (verified canonical city names with official 6-digit India Post PIN codes & aliases)
 *
 * Deduplication Guarantees:
 * - Distinct municipal cities: Mumbai (400001) vs Navi Mumbai (400703) vs Thane (400601).
 * - State integrity: Delhi is the Union Territory (GST 07); New Delhi is a city (110001) and alias of Delhi.
 * - Disambiguated same-name cities across states (e.g. Bilaspur CG vs Bilaspur HP, Balrampur UP vs CG).
 */

export interface CountryItem {
  name: string
  code: string
  flag: string
  dialCode: string
  currency: string
  aliases?: string[]
}

export interface StateItem {
  name: string
  code: string
  countryCode: string
  gstCode?: string
  type?: "STATE" | "UNION_TERRITORY" | "PROVINCE" | "EMIRATE" | "COUNTRY" | "REGION" | "TERRITORY"
  aliases?: string[]
}

export interface CityItem {
  name: string
  stateName: string
  countryCode: string
  pincode: string
  aliases?: string[]
}

export const GEO_COUNTRIES: CountryItem[] = [
  {
    "name": "India",
    "code": "IN",
    "flag": "\ud83c\uddee\ud83c\uddf3",
    "dialCode": "+91",
    "currency": "INR",
    "aliases": [
      "Bharat",
      "Hindustan"
    ]
  },
  {
    "name": "United States",
    "code": "US",
    "flag": "\ud83c\uddfa\ud83c\uddf8",
    "dialCode": "+1",
    "currency": "USD",
    "aliases": [
      "USA",
      "US",
      "America",
      "United States of America"
    ]
  },
  {
    "name": "United Arab Emirates",
    "code": "AE",
    "flag": "\ud83c\udde6\ud83c\uddea",
    "dialCode": "+971",
    "currency": "AED",
    "aliases": [
      "UAE",
      "Emirates"
    ]
  },
  {
    "name": "United Kingdom",
    "code": "GB",
    "flag": "\ud83c\uddec\ud83c\udde7",
    "dialCode": "+44",
    "currency": "GBP",
    "aliases": [
      "UK",
      "Britain",
      "Great Britain",
      "England"
    ]
  },
  {
    "name": "Saudi Arabia",
    "code": "SA",
    "flag": "\ud83c\uddf8\ud83c\udde6",
    "dialCode": "+966",
    "currency": "SAR",
    "aliases": [
      "KSA"
    ]
  },
  {
    "name": "Singapore",
    "code": "SG",
    "flag": "\ud83c\uddf8\ud83c\uddec",
    "dialCode": "+65",
    "currency": "SGD"
  },
  {
    "name": "Canada",
    "code": "CA",
    "flag": "\ud83c\udde8\ud83c\udde6",
    "dialCode": "+1",
    "currency": "CAD"
  },
  {
    "name": "Australia",
    "code": "AU",
    "flag": "\ud83c\udde6\ud83c\uddfa",
    "dialCode": "+61",
    "currency": "AUD"
  },
  {
    "name": "Germany",
    "code": "DE",
    "flag": "\ud83c\udde9\ud83c\uddea",
    "dialCode": "+49",
    "currency": "EUR",
    "aliases": [
      "Deutschland"
    ]
  },
  {
    "name": "France",
    "code": "FR",
    "flag": "\ud83c\uddeb\ud83c\uddf7",
    "dialCode": "+33",
    "currency": "EUR"
  },
  {
    "name": "Japan",
    "code": "JP",
    "flag": "\ud83c\uddef\ud83c\uddf5",
    "dialCode": "+81",
    "currency": "JPY",
    "aliases": [
      "Nippon"
    ]
  },
  {
    "name": "China",
    "code": "CN",
    "flag": "\ud83c\udde8\ud83c\uddf3",
    "dialCode": "+86",
    "currency": "CNY",
    "aliases": [
      "PRC"
    ]
  },
  {
    "name": "Oman",
    "code": "OM",
    "flag": "\ud83c\uddf4\ud83c\uddf2",
    "dialCode": "+968",
    "currency": "OMR"
  },
  {
    "name": "Qatar",
    "code": "QA",
    "flag": "\ud83c\uddf6\ud83c\udde6",
    "dialCode": "+974",
    "currency": "QAR"
  },
  {
    "name": "Kuwait",
    "code": "KW",
    "flag": "\ud83c\uddf0\ud83c\uddfc",
    "dialCode": "+965",
    "currency": "KWD"
  },
  {
    "name": "Bahrain",
    "code": "BH",
    "flag": "\ud83c\udde7\ud83c\udded",
    "dialCode": "+973",
    "currency": "BHD"
  },
  {
    "name": "Netherlands",
    "code": "NL",
    "flag": "\ud83c\uddf3\ud83c\uddf1",
    "dialCode": "+31",
    "currency": "EUR",
    "aliases": [
      "Holland"
    ]
  },
  {
    "name": "Switzerland",
    "code": "CH",
    "flag": "\ud83c\udde8\ud83c\udded",
    "dialCode": "+41",
    "currency": "CHF"
  },
  {
    "name": "Italy",
    "code": "IT",
    "flag": "\ud83c\uddee\ud83c\uddf9",
    "dialCode": "+39",
    "currency": "EUR",
    "aliases": [
      "Italia"
    ]
  },
  {
    "name": "Spain",
    "code": "ES",
    "flag": "\ud83c\uddea\ud83c\uddf8",
    "dialCode": "+34",
    "currency": "EUR",
    "aliases": [
      "Espana"
    ]
  },
  {
    "name": "South Africa",
    "code": "ZA",
    "flag": "\ud83c\uddff\ud83c\udde6",
    "dialCode": "+27",
    "currency": "ZAR"
  },
  {
    "name": "New Zealand",
    "code": "NZ",
    "flag": "\ud83c\uddf3\ud83c\uddff",
    "dialCode": "+64",
    "currency": "NZD"
  },
  {
    "name": "Malaysia",
    "code": "MY",
    "flag": "\ud83c\uddf2\ud83c\uddfe",
    "dialCode": "+60",
    "currency": "MYR"
  },
  {
    "name": "Indonesia",
    "code": "ID",
    "flag": "\ud83c\uddee\ud83c\udde9",
    "dialCode": "+62",
    "currency": "IDR"
  },
  {
    "name": "Thailand",
    "code": "TH",
    "flag": "\ud83c\uddf9\ud83c\udded",
    "dialCode": "+66",
    "currency": "THB"
  },
  {
    "name": "Vietnam",
    "code": "VN",
    "flag": "\ud83c\uddfb\ud83c\uddf3",
    "dialCode": "+84",
    "currency": "VND"
  },
  {
    "name": "Brazil",
    "code": "BR",
    "flag": "\ud83c\udde7\ud83c\uddf7",
    "dialCode": "+55",
    "currency": "BRL"
  },
  {
    "name": "Mexico",
    "code": "MX",
    "flag": "\ud83c\uddf2\ud83c\uddfd",
    "dialCode": "+52",
    "currency": "MXN"
  },
  {
    "name": "Ireland",
    "code": "IE",
    "flag": "\ud83c\uddee\ud83c\uddea",
    "dialCode": "+353",
    "currency": "EUR"
  },
  {
    "name": "Sweden",
    "code": "SE",
    "flag": "\ud83c\uddf8\ud83c\uddea",
    "dialCode": "+46",
    "currency": "SEK"
  },
  {
    "name": "Norway",
    "code": "NO",
    "flag": "\ud83c\uddf3\ud83c\uddf4",
    "dialCode": "+47",
    "currency": "NOK"
  },
  {
    "name": "Denmark",
    "code": "DK",
    "flag": "\ud83c\udde9\ud83c\uddf0",
    "dialCode": "+45",
    "currency": "DKK"
  },
  {
    "name": "Finland",
    "code": "FI",
    "flag": "\ud83c\uddeb\ud83c\uddee",
    "dialCode": "+358",
    "currency": "EUR"
  },
  {
    "name": "Belgium",
    "code": "BE",
    "flag": "\ud83c\udde7\ud83c\uddea",
    "dialCode": "+32",
    "currency": "EUR"
  },
  {
    "name": "Austria",
    "code": "AT",
    "flag": "\ud83c\udde6\ud83c\uddf9",
    "dialCode": "+43",
    "currency": "EUR"
  },
  {
    "name": "Poland",
    "code": "PL",
    "flag": "\ud83c\uddf5\ud83c\uddf1",
    "dialCode": "+48",
    "currency": "PLN"
  },
  {
    "name": "Portugal",
    "code": "PT",
    "flag": "\ud83c\uddf5\ud83c\uddf9",
    "dialCode": "+351",
    "currency": "EUR"
  },
  {
    "name": "Greece",
    "code": "GR",
    "flag": "\ud83c\uddec\ud83c\uddf7",
    "dialCode": "+30",
    "currency": "EUR"
  },
  {
    "name": "Turkey",
    "code": "TR",
    "flag": "\ud83c\uddf9\ud83c\uddf7",
    "dialCode": "+90",
    "currency": "TRY",
    "aliases": [
      "Turkiye"
    ]
  },
  {
    "name": "South Korea",
    "code": "KR",
    "flag": "\ud83c\uddf0\ud83c\uddf7",
    "dialCode": "+82",
    "currency": "KRW",
    "aliases": [
      "Korea"
    ]
  },
  {
    "name": "Hong Kong",
    "code": "HK",
    "flag": "\ud83c\udded\ud83c\uddf0",
    "dialCode": "+852",
    "currency": "HKD"
  },
  {
    "name": "Taiwan",
    "code": "TW",
    "flag": "\ud83c\uddf9\ud83c\uddfc",
    "dialCode": "+886",
    "currency": "TWD"
  },
  {
    "name": "Philippines",
    "code": "PH",
    "flag": "\ud83c\uddf5\ud83c\udded",
    "dialCode": "+63",
    "currency": "PHP"
  },
  {
    "name": "Egypt",
    "code": "EG",
    "flag": "\ud83c\uddea\ud83c\uddec",
    "dialCode": "+20",
    "currency": "EGP"
  },
  {
    "name": "Israel",
    "code": "IL",
    "flag": "\ud83c\uddee\ud83c\uddf1",
    "dialCode": "+972",
    "currency": "ILS"
  },
  {
    "name": "Nigeria",
    "code": "NG",
    "flag": "\ud83c\uddf3\ud83c\uddec",
    "dialCode": "+234",
    "currency": "NGN"
  },
  {
    "name": "Kenya",
    "code": "KE",
    "flag": "\ud83c\uddf0\ud83c\uddea",
    "dialCode": "+254",
    "currency": "KES"
  },
  {
    "name": "Sri Lanka",
    "code": "LK",
    "flag": "\ud83c\uddf1\ud83c\uddf0",
    "dialCode": "+94",
    "currency": "LKR"
  },
  {
    "name": "Bangladesh",
    "code": "BD",
    "flag": "\ud83c\udde7\ud83c\udde9",
    "dialCode": "+880",
    "currency": "BDT"
  },
  {
    "name": "Nepal",
    "code": "NP",
    "flag": "\ud83c\uddf3\ud83c\uddf5",
    "dialCode": "+977",
    "currency": "NPR"
  },
  {
    "name": "Bhutan",
    "code": "BT",
    "flag": "\ud83c\udde7\ud83c\uddf9",
    "dialCode": "+975",
    "currency": "BTN"
  },
  {
    "name": "Maldives",
    "code": "MV",
    "flag": "\ud83c\uddf2\ud83c\uddfb",
    "dialCode": "+960",
    "currency": "MVR"
  },
  {
    "name": "Mauritius",
    "code": "MU",
    "flag": "\ud83c\uddf2\ud83c\uddfa",
    "dialCode": "+230",
    "currency": "MUR"
  },
  {
    "name": "Argentina",
    "code": "AR",
    "flag": "\ud83c\udde6\ud83c\uddf7",
    "dialCode": "+54",
    "currency": "ARS"
  },
  {
    "name": "Chile",
    "code": "CL",
    "flag": "\ud83c\udde8\ud83c\uddf1",
    "dialCode": "+56",
    "currency": "CLP"
  },
  {
    "name": "Colombia",
    "code": "CO",
    "flag": "\ud83c\udde8\ud83c\uddf4",
    "dialCode": "+57",
    "currency": "COP"
  },
  {
    "name": "Peru",
    "code": "PE",
    "flag": "\ud83c\uddf5\ud83c\uddea",
    "dialCode": "+51",
    "currency": "PEN"
  },
  {
    "name": "Russia",
    "code": "RU",
    "flag": "\ud83c\uddf7\ud83c\uddfa",
    "dialCode": "+7",
    "currency": "RUB"
  },
  {
    "name": "Czech Republic",
    "code": "CZ",
    "flag": "\ud83c\udde8\ud83c\uddff",
    "dialCode": "+420",
    "currency": "CZK",
    "aliases": [
      "Czechia"
    ]
  },
  {
    "name": "Hungary",
    "code": "HU",
    "flag": "\ud83c\udded\ud83c\uddfa",
    "dialCode": "+36",
    "currency": "HUF"
  },
  {
    "name": "Romania",
    "code": "RO",
    "flag": "\ud83c\uddf7\ud83c\uddf4",
    "dialCode": "+40",
    "currency": "RON"
  },
  {
    "name": "Jordan",
    "code": "JO",
    "flag": "\ud83c\uddef\ud83c\uddf4",
    "dialCode": "+962",
    "currency": "JOD"
  },
  {
    "name": "Lebanon",
    "code": "LB",
    "flag": "\ud83c\uddf1\ud83c\udde7",
    "dialCode": "+961",
    "currency": "LBP"
  },
  {
    "name": "Pakistan",
    "code": "PK",
    "flag": "\ud83c\uddf5\ud83c\uddf0",
    "dialCode": "+92",
    "currency": "PKR"
  },
  {
    "name": "Ghana",
    "code": "GH",
    "flag": "\ud83c\uddec\ud83c\udded",
    "dialCode": "+233",
    "currency": "GHS"
  },
  {
    "name": "Tanzania",
    "code": "TZ",
    "flag": "\ud83c\uddf9\ud83c\uddff",
    "dialCode": "+255",
    "currency": "TZS"
  },
  {
    "name": "Uganda",
    "code": "UG",
    "flag": "\ud83c\uddfa\ud83c\uddec",
    "dialCode": "+256",
    "currency": "UGX"
  },
  {
    "name": "Morocco",
    "code": "MA",
    "flag": "\ud83c\uddf2\ud83c\udde6",
    "dialCode": "+212",
    "currency": "MAD"
  },
  {
    "name": "Cyprus",
    "code": "CY",
    "flag": "\ud83c\udde8\ud83c\uddfe",
    "dialCode": "+357",
    "currency": "EUR"
  },
  {
    "name": "Luxembourg",
    "code": "LU",
    "flag": "\ud83c\uddf1\ud83c\uddfa",
    "dialCode": "+352",
    "currency": "EUR"
  },
  {
    "name": "Estonia",
    "code": "EE",
    "flag": "\ud83c\uddea\ud83c\uddea",
    "dialCode": "+372",
    "currency": "EUR"
  },
  {
    "name": "Croatia",
    "code": "HR",
    "flag": "\ud83c\udded\ud83c\uddf7",
    "dialCode": "+385",
    "currency": "EUR"
  },
  {
    "name": "Bulgaria",
    "code": "BG",
    "flag": "\ud83c\udde7\ud83c\uddec",
    "dialCode": "+359",
    "currency": "BGN"
  },
  {
    "name": "Serbia",
    "code": "RS",
    "flag": "\ud83c\uddf7\ud83c\uddf8",
    "dialCode": "+381",
    "currency": "RSD"
  },
  {
    "name": "Ukraine",
    "code": "UA",
    "flag": "\ud83c\uddfa\ud83c\udde6",
    "dialCode": "+380",
    "currency": "UAH"
  },
  {
    "name": "Kazakhstan",
    "code": "KZ",
    "flag": "\ud83c\uddf0\ud83c\uddff",
    "dialCode": "+7",
    "currency": "KZT"
  },
  {
    "name": "Uzbekistan",
    "code": "UZ",
    "flag": "\ud83c\uddfa\ud83c\uddff",
    "dialCode": "+998",
    "currency": "UZS"
  },
  {
    "name": "Panama",
    "code": "PA",
    "flag": "\ud83c\uddf5\ud83c\udde6",
    "dialCode": "+507",
    "currency": "PAB"
  },
  {
    "name": "Costa Rica",
    "code": "CR",
    "flag": "\ud83c\udde8\ud83c\uddf7",
    "dialCode": "+506",
    "currency": "CRC"
  },
  {
    "name": "Uruguay",
    "code": "UY",
    "flag": "\ud83c\uddfa\ud83c\uddfe",
    "dialCode": "+598",
    "currency": "UYU"
  },
  {
    "name": "Ecuador",
    "code": "EC",
    "flag": "\ud83c\uddea\ud83c\udde8",
    "dialCode": "+593",
    "currency": "USD"
  },
  {
    "name": "Ethiopia",
    "code": "ET",
    "flag": "\ud83c\uddea\ud83c\uddf9",
    "dialCode": "+251",
    "currency": "ETB"
  },
  {
    "name": "Tunisia",
    "code": "TN",
    "flag": "\ud83c\uddf9\ud83c\uddf3",
    "dialCode": "+216",
    "currency": "TND"
  },
  {
    "name": "Algeria",
    "code": "DZ",
    "flag": "\ud83c\udde9\ud83c\uddff",
    "dialCode": "+213",
    "currency": "DZD"
  },
  {
    "name": "Iraq",
    "code": "IQ",
    "flag": "\ud83c\uddee\ud83c\uddf6",
    "dialCode": "+964",
    "currency": "IQD"
  }
];

export const GEO_STATES: StateItem[] = [
  {
    "name": "Andhra Pradesh",
    "code": "AP",
    "countryCode": "IN",
    "gstCode": "37",
    "type": "STATE",
    "aliases": [
      "AP"
    ]
  },
  {
    "name": "Arunachal Pradesh",
    "code": "AR",
    "countryCode": "IN",
    "gstCode": "12",
    "type": "STATE",
    "aliases": [
      "AR"
    ]
  },
  {
    "name": "Assam",
    "code": "AS",
    "countryCode": "IN",
    "gstCode": "18",
    "type": "STATE",
    "aliases": [
      "AS",
      "Asom"
    ]
  },
  {
    "name": "Bihar",
    "code": "BR",
    "countryCode": "IN",
    "gstCode": "10",
    "type": "STATE",
    "aliases": [
      "BR"
    ]
  },
  {
    "name": "Chhattisgarh",
    "code": "CG",
    "countryCode": "IN",
    "gstCode": "22",
    "type": "STATE",
    "aliases": [
      "CG",
      "Chhatisgarh"
    ]
  },
  {
    "name": "Goa",
    "code": "GA",
    "countryCode": "IN",
    "gstCode": "30",
    "type": "STATE",
    "aliases": [
      "GA"
    ]
  },
  {
    "name": "Gujarat",
    "code": "GJ",
    "countryCode": "IN",
    "gstCode": "24",
    "type": "STATE",
    "aliases": [
      "GJ"
    ]
  },
  {
    "name": "Haryana",
    "code": "HR",
    "countryCode": "IN",
    "gstCode": "06",
    "type": "STATE",
    "aliases": [
      "HR"
    ]
  },
  {
    "name": "Himachal Pradesh",
    "code": "HP",
    "countryCode": "IN",
    "gstCode": "02",
    "type": "STATE",
    "aliases": [
      "HP"
    ]
  },
  {
    "name": "Jharkhand",
    "code": "JH",
    "countryCode": "IN",
    "gstCode": "20",
    "type": "STATE",
    "aliases": [
      "JH"
    ]
  },
  {
    "name": "Karnataka",
    "code": "KA",
    "countryCode": "IN",
    "gstCode": "29",
    "type": "STATE",
    "aliases": [
      "KA"
    ]
  },
  {
    "name": "Kerala",
    "code": "KL",
    "countryCode": "IN",
    "gstCode": "32",
    "type": "STATE",
    "aliases": [
      "KL",
      "Keralam"
    ]
  },
  {
    "name": "Madhya Pradesh",
    "code": "MP",
    "countryCode": "IN",
    "gstCode": "23",
    "type": "STATE",
    "aliases": [
      "MP"
    ]
  },
  {
    "name": "Maharashtra",
    "code": "MH",
    "countryCode": "IN",
    "gstCode": "27",
    "type": "STATE",
    "aliases": [
      "MH",
      "Maha"
    ]
  },
  {
    "name": "Manipur",
    "code": "MN",
    "countryCode": "IN",
    "gstCode": "14",
    "type": "STATE",
    "aliases": [
      "MN"
    ]
  },
  {
    "name": "Meghalaya",
    "code": "ML",
    "countryCode": "IN",
    "gstCode": "17",
    "type": "STATE",
    "aliases": [
      "ML"
    ]
  },
  {
    "name": "Mizoram",
    "code": "MZ",
    "countryCode": "IN",
    "gstCode": "15",
    "type": "STATE",
    "aliases": [
      "MZ"
    ]
  },
  {
    "name": "Nagaland",
    "code": "NL",
    "countryCode": "IN",
    "gstCode": "13",
    "type": "STATE",
    "aliases": [
      "NL"
    ]
  },
  {
    "name": "Odisha",
    "code": "OD",
    "countryCode": "IN",
    "gstCode": "21",
    "type": "STATE",
    "aliases": [
      "OD",
      "Orissa"
    ]
  },
  {
    "name": "Punjab",
    "code": "PB",
    "countryCode": "IN",
    "gstCode": "03",
    "type": "STATE",
    "aliases": [
      "PB"
    ]
  },
  {
    "name": "Rajasthan",
    "code": "RJ",
    "countryCode": "IN",
    "gstCode": "08",
    "type": "STATE",
    "aliases": [
      "RJ"
    ]
  },
  {
    "name": "Sikkim",
    "code": "SK",
    "countryCode": "IN",
    "gstCode": "11",
    "type": "STATE",
    "aliases": [
      "SK"
    ]
  },
  {
    "name": "Tamil Nadu",
    "code": "TN",
    "countryCode": "IN",
    "gstCode": "33",
    "type": "STATE",
    "aliases": [
      "TN",
      "Tamilnadu"
    ]
  },
  {
    "name": "Telangana",
    "code": "TS",
    "countryCode": "IN",
    "gstCode": "36",
    "type": "STATE",
    "aliases": [
      "TS",
      "TG"
    ]
  },
  {
    "name": "Tripura",
    "code": "TR",
    "countryCode": "IN",
    "gstCode": "16",
    "type": "STATE",
    "aliases": [
      "TR"
    ]
  },
  {
    "name": "Uttar Pradesh",
    "code": "UP",
    "countryCode": "IN",
    "gstCode": "09",
    "type": "STATE",
    "aliases": [
      "UP"
    ]
  },
  {
    "name": "Uttarakhand",
    "code": "UK",
    "countryCode": "IN",
    "gstCode": "05",
    "type": "STATE",
    "aliases": [
      "UK",
      "UA",
      "Uttaranchal"
    ]
  },
  {
    "name": "West Bengal",
    "code": "WB",
    "countryCode": "IN",
    "gstCode": "19",
    "type": "STATE",
    "aliases": [
      "WB",
      "Bangla"
    ]
  },
  {
    "name": "Andaman and Nicobar Islands",
    "code": "AN",
    "countryCode": "IN",
    "gstCode": "35",
    "type": "UNION_TERRITORY",
    "aliases": [
      "AN",
      "Andaman",
      "A&N Islands",
      "Port Blair"
    ]
  },
  {
    "name": "Chandigarh",
    "code": "CH",
    "countryCode": "IN",
    "gstCode": "04",
    "type": "UNION_TERRITORY",
    "aliases": [
      "CH"
    ]
  },
  {
    "name": "Dadra and Nagar Haveli and Daman and Diu",
    "code": "DN",
    "countryCode": "IN",
    "gstCode": "26",
    "type": "UNION_TERRITORY",
    "aliases": [
      "DN",
      "DD",
      "DNH & DD",
      "Daman and Diu",
      "Dadra and Nagar Haveli"
    ]
  },
  {
    "name": "Delhi",
    "code": "DL",
    "countryCode": "IN",
    "gstCode": "07",
    "type": "UNION_TERRITORY",
    "aliases": [
      "DL",
      "New Delhi",
      "NCT of Delhi",
      "National Capital Territory of Delhi",
      "Delhi NCR",
      "NCT"
    ]
  },
  {
    "name": "Jammu and Kashmir",
    "code": "JK",
    "countryCode": "IN",
    "gstCode": "01",
    "type": "UNION_TERRITORY",
    "aliases": [
      "JK",
      "J&K"
    ]
  },
  {
    "name": "Ladakh",
    "code": "LA",
    "countryCode": "IN",
    "gstCode": "38",
    "type": "UNION_TERRITORY",
    "aliases": [
      "LA",
      "Leh Ladakh"
    ]
  },
  {
    "name": "Lakshadweep",
    "code": "LD",
    "countryCode": "IN",
    "gstCode": "31",
    "type": "UNION_TERRITORY",
    "aliases": [
      "LD"
    ]
  },
  {
    "name": "Puducherry",
    "code": "PY",
    "countryCode": "IN",
    "gstCode": "34",
    "type": "UNION_TERRITORY",
    "aliases": [
      "PY",
      "Pondicherry"
    ]
  },
  {
    "name": "Alabama",
    "code": "AL",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Alaska",
    "code": "AK",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Arizona",
    "code": "AZ",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Arkansas",
    "code": "AR",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "California",
    "code": "CA",
    "countryCode": "US",
    "type": "STATE",
    "aliases": [
      "Cali"
    ]
  },
  {
    "name": "Colorado",
    "code": "CO",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Connecticut",
    "code": "CT",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Delaware",
    "code": "DE",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Florida",
    "code": "FL",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Georgia",
    "code": "GA",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Hawaii",
    "code": "HI",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Idaho",
    "code": "ID",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Illinois",
    "code": "IL",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Indiana",
    "code": "IN",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Iowa",
    "code": "IA",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Kansas",
    "code": "KS",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Kentucky",
    "code": "KY",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Louisiana",
    "code": "LA",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Maine",
    "code": "ME",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Maryland",
    "code": "MD",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Massachusetts",
    "code": "MA",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Michigan",
    "code": "MI",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Minnesota",
    "code": "MN",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Mississippi",
    "code": "MS",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Missouri",
    "code": "MO",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Montana",
    "code": "MT",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Nebraska",
    "code": "NE",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Nevada",
    "code": "NV",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "New Hampshire",
    "code": "NH",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "New Jersey",
    "code": "NJ",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "New Mexico",
    "code": "NM",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "New York",
    "code": "NY",
    "countryCode": "US",
    "type": "STATE",
    "aliases": [
      "NYC"
    ]
  },
  {
    "name": "North Carolina",
    "code": "NC",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "North Dakota",
    "code": "ND",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Ohio",
    "code": "OH",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Oklahoma",
    "code": "OK",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Oregon",
    "code": "OR",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Pennsylvania",
    "code": "PA",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Rhode Island",
    "code": "RI",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "South Carolina",
    "code": "SC",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "South Dakota",
    "code": "SD",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Tennessee",
    "code": "TN",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Texas",
    "code": "TX",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Utah",
    "code": "UT",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Vermont",
    "code": "VT",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Virginia",
    "code": "VA",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Washington",
    "code": "WA",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "West Virginia",
    "code": "WV",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Wisconsin",
    "code": "WI",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "Wyoming",
    "code": "WY",
    "countryCode": "US",
    "type": "STATE"
  },
  {
    "name": "District of Columbia",
    "code": "DC",
    "countryCode": "US",
    "type": "TERRITORY",
    "aliases": [
      "Washington DC",
      "DC"
    ]
  },
  {
    "name": "Puerto Rico",
    "code": "PR",
    "countryCode": "US",
    "type": "TERRITORY"
  },
  {
    "name": "Dubai",
    "code": "DXB",
    "countryCode": "AE",
    "type": "EMIRATE"
  },
  {
    "name": "Abu Dhabi",
    "code": "AUH",
    "countryCode": "AE",
    "type": "EMIRATE"
  },
  {
    "name": "Sharjah",
    "code": "SHJ",
    "countryCode": "AE",
    "type": "EMIRATE"
  },
  {
    "name": "Ajman",
    "code": "AJM",
    "countryCode": "AE",
    "type": "EMIRATE"
  },
  {
    "name": "Ras Al Khaimah",
    "code": "RAK",
    "countryCode": "AE",
    "type": "EMIRATE"
  },
  {
    "name": "Fujairah",
    "code": "FUJ",
    "countryCode": "AE",
    "type": "EMIRATE"
  },
  {
    "name": "Umm Al Quwain",
    "code": "UAQ",
    "countryCode": "AE",
    "type": "EMIRATE"
  },
  {
    "name": "England",
    "code": "ENG",
    "countryCode": "GB",
    "type": "COUNTRY"
  },
  {
    "name": "Scotland",
    "code": "SCT",
    "countryCode": "GB",
    "type": "COUNTRY"
  },
  {
    "name": "Wales",
    "code": "WLS",
    "countryCode": "GB",
    "type": "COUNTRY"
  },
  {
    "name": "Northern Ireland",
    "code": "NIR",
    "countryCode": "GB",
    "type": "COUNTRY"
  },
  {
    "name": "Ontario",
    "code": "ON",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "Quebec",
    "code": "QC",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "British Columbia",
    "code": "BC",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "Alberta",
    "code": "AB",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "Manitoba",
    "code": "MB",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "Saskatchewan",
    "code": "SK",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "Nova Scotia",
    "code": "NS",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "New Brunswick",
    "code": "NB",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "Newfoundland and Labrador",
    "code": "NL",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "Prince Edward Island",
    "code": "PE",
    "countryCode": "CA",
    "type": "PROVINCE"
  },
  {
    "name": "Northwest Territories",
    "code": "NT",
    "countryCode": "CA",
    "type": "TERRITORY"
  },
  {
    "name": "Yukon",
    "code": "YT",
    "countryCode": "CA",
    "type": "TERRITORY"
  },
  {
    "name": "Nunavut",
    "code": "NU",
    "countryCode": "CA",
    "type": "TERRITORY"
  },
  {
    "name": "New South Wales",
    "code": "NSW",
    "countryCode": "AU",
    "type": "STATE"
  },
  {
    "name": "Victoria",
    "code": "VIC",
    "countryCode": "AU",
    "type": "STATE"
  },
  {
    "name": "Queensland",
    "code": "QLD",
    "countryCode": "AU",
    "type": "STATE"
  },
  {
    "name": "Western Australia",
    "code": "WA",
    "countryCode": "AU",
    "type": "STATE"
  },
  {
    "name": "South Australia",
    "code": "SA",
    "countryCode": "AU",
    "type": "STATE"
  },
  {
    "name": "Tasmania",
    "code": "TAS",
    "countryCode": "AU",
    "type": "STATE"
  },
  {
    "name": "Australian Capital Territory",
    "code": "ACT",
    "countryCode": "AU",
    "type": "TERRITORY"
  },
  {
    "name": "Northern Territory",
    "code": "NT",
    "countryCode": "AU",
    "type": "TERRITORY"
  },
  {
    "name": "Riyadh Province",
    "code": "RIY",
    "countryCode": "SA",
    "type": "PROVINCE",
    "aliases": [
      "Riyadh"
    ]
  },
  {
    "name": "Makkah Province",
    "code": "MAK",
    "countryCode": "SA",
    "type": "PROVINCE",
    "aliases": [
      "Mecca",
      "Makkah"
    ]
  },
  {
    "name": "Eastern Province",
    "code": "EAS",
    "countryCode": "SA",
    "type": "PROVINCE",
    "aliases": [
      "Dammam",
      "Khobar"
    ]
  },
  {
    "name": "Madinah Province",
    "code": "MAD",
    "countryCode": "SA",
    "type": "PROVINCE",
    "aliases": [
      "Medina",
      "Madinah"
    ]
  },
  {
    "name": "Asir Province",
    "code": "ASI",
    "countryCode": "SA",
    "type": "PROVINCE",
    "aliases": [
      "Abha"
    ]
  },
  {
    "name": "Tabuk Province",
    "code": "TAB",
    "countryCode": "SA",
    "type": "PROVINCE"
  },
  {
    "name": "Al-Qassim Province",
    "code": "QAS",
    "countryCode": "SA",
    "type": "PROVINCE"
  },
  {
    "name": "Hail Province",
    "code": "HAI",
    "countryCode": "SA",
    "type": "PROVINCE"
  },
  {
    "name": "Jazan Province",
    "code": "JAZ",
    "countryCode": "SA",
    "type": "PROVINCE"
  },
  {
    "name": "Najran Province",
    "code": "NAJ",
    "countryCode": "SA",
    "type": "PROVINCE"
  },
  {
    "name": "Al-Bahah Province",
    "code": "BAH",
    "countryCode": "SA",
    "type": "PROVINCE"
  },
  {
    "name": "Al-Jawf Province",
    "code": "JAW",
    "countryCode": "SA",
    "type": "PROVINCE"
  },
  {
    "name": "Northern Borders Province",
    "code": "NOR",
    "countryCode": "SA",
    "type": "PROVINCE"
  },
  {
    "name": "Bavaria",
    "code": "BY",
    "countryCode": "DE",
    "type": "STATE",
    "aliases": [
      "Bayern"
    ]
  },
  {
    "name": "Baden-W\u00fcrttemberg",
    "code": "BW",
    "countryCode": "DE",
    "type": "STATE"
  },
  {
    "name": "Berlin",
    "code": "BE",
    "countryCode": "DE",
    "type": "STATE"
  },
  {
    "name": "Brandenburg",
    "code": "BB",
    "countryCode": "DE",
    "type": "STATE"
  },
  {
    "name": "Bremen",
    "code": "HB",
    "countryCode": "DE",
    "type": "STATE"
  },
  {
    "name": "Hamburg",
    "code": "HH",
    "countryCode": "DE",
    "type": "STATE"
  },
  {
    "name": "Hesse",
    "code": "HE",
    "countryCode": "DE",
    "type": "STATE",
    "aliases": [
      "Hessen"
    ]
  },
  {
    "name": "Lower Saxony",
    "code": "NI",
    "countryCode": "DE",
    "type": "STATE",
    "aliases": [
      "Niedersachsen"
    ]
  },
  {
    "name": "Mecklenburg-Vorpommern",
    "code": "MV",
    "countryCode": "DE",
    "type": "STATE"
  },
  {
    "name": "North Rhine-Westphalia",
    "code": "NW",
    "countryCode": "DE",
    "type": "STATE",
    "aliases": [
      "NRW"
    ]
  },
  {
    "name": "Rhineland-Palatinate",
    "code": "RP",
    "countryCode": "DE",
    "type": "STATE",
    "aliases": [
      "Rheinland-Pfalz"
    ]
  },
  {
    "name": "Saarland",
    "code": "SL",
    "countryCode": "DE",
    "type": "STATE"
  },
  {
    "name": "Saxony",
    "code": "SN",
    "countryCode": "DE",
    "type": "STATE",
    "aliases": [
      "Sachsen"
    ]
  },
  {
    "name": "Saxony-Anhalt",
    "code": "ST",
    "countryCode": "DE",
    "type": "STATE",
    "aliases": [
      "Sachsen-Anhalt"
    ]
  },
  {
    "name": "Schleswig-Holstein",
    "code": "SH",
    "countryCode": "DE",
    "type": "STATE"
  },
  {
    "name": "Thuringia",
    "code": "TH",
    "countryCode": "DE",
    "type": "STATE",
    "aliases": [
      "Th\u00fcringen"
    ]
  },
  {
    "name": "Central Singapore",
    "code": "SG-01",
    "countryCode": "SG",
    "type": "REGION"
  },
  {
    "name": "North East",
    "code": "SG-02",
    "countryCode": "SG",
    "type": "REGION"
  },
  {
    "name": "North West",
    "code": "SG-03",
    "countryCode": "SG",
    "type": "REGION"
  },
  {
    "name": "South East",
    "code": "SG-04",
    "countryCode": "SG",
    "type": "REGION"
  },
  {
    "name": "South West",
    "code": "SG-05",
    "countryCode": "SG",
    "type": "REGION"
  }
];

export const GEO_CITIES: CityItem[] = [
  {
    "name": "Mumbai",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "400001",
    "aliases": [
      "Bombay",
      "Mumbai City",
      "South Mumbai",
      "Nariman Point",
      "Fort"
    ]
  },
  {
    "name": "Navi Mumbai",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "400703",
    "aliases": [
      "New Bombay",
      "Vashi",
      "CBD Belapur",
      "Nerul",
      "Airoli",
      "Kopar Khairane"
    ]
  },
  {
    "name": "Thane",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "400601",
    "aliases": [
      "Thana",
      "Ghubunder",
      "Majiwada"
    ]
  },
  {
    "name": "Kalyan-Dombivli",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "421201",
    "aliases": [
      "Kalyan",
      "Dombivli",
      "KDMC"
    ]
  },
  {
    "name": "Mira-Bhayandar",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "401107",
    "aliases": [
      "Mira Road",
      "Bhayandar",
      "MBMC"
    ]
  },
  {
    "name": "Vasai-Virar",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "401201",
    "aliases": [
      "Vasai",
      "Virar",
      "VVMC",
      "Nalasopara"
    ]
  },
  {
    "name": "Ulhasnagar",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "421001",
    "aliases": [
      "UMC"
    ]
  },
  {
    "name": "Panvel",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "410206",
    "aliases": [
      "New Panvel",
      "Khandeshwar",
      "Kamothe",
      "Kharghar"
    ]
  },
  {
    "name": "Bhiwandi",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "421302",
    "aliases": [
      "Powerloom City",
      "BNMC"
    ]
  },
  {
    "name": "Pune",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "411001",
    "aliases": [
      "Poona",
      "Shivajinagar",
      "Kothrud",
      "Hinjawadi",
      "Viman Nagar",
      "Hadapsar",
      "Baner"
    ]
  },
  {
    "name": "Pimpri-Chinchwad",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "411018",
    "aliases": [
      "PCMC",
      "Pimpri",
      "Chinchwad",
      "Bhosari",
      "Nigdi",
      "Wakad",
      "Ravet"
    ]
  },
  {
    "name": "Nagpur",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "440001",
    "aliases": [
      "Orange City",
      "Dharampeth",
      "Sitabuldi",
      "MIHAN"
    ]
  },
  {
    "name": "Nashik",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "422001",
    "aliases": [
      "Nasik",
      "Panchavati",
      "Satpur",
      "Ambad"
    ]
  },
  {
    "name": "Chhatrapati Sambhajinagar",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "431001",
    "aliases": [
      "Aurangabad",
      "Sambhajinagar",
      "Waluj",
      "Chikalthana"
    ]
  },
  {
    "name": "Solapur",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "413001",
    "aliases": [
      "Sholapur"
    ]
  },
  {
    "name": "Kolhapur",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "416001",
    "aliases": [
      "Karveer",
      "Ichalkaranji road"
    ]
  },
  {
    "name": "Amravati",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "444601",
    "aliases": [
      "Amrawati"
    ]
  },
  {
    "name": "Nanded",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "431601",
    "aliases": [
      "Nanded-Waghala",
      "Hazur Sahib"
    ]
  },
  {
    "name": "Sangli",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "416416",
    "aliases": [
      "Sangli-Miraj-Kupwad",
      "Miraj"
    ]
  },
  {
    "name": "Jalgaon",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "425001",
    "aliases": [
      "Banana City",
      "Gold City"
    ]
  },
  {
    "name": "Akola",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "444001",
    "aliases": [
      "Cotton City"
    ]
  },
  {
    "name": "Latur",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "413512",
    "aliases": [
      "Marathwada Hub"
    ]
  },
  {
    "name": "Dhule",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "424001",
    "aliases": [
      "Dhulia"
    ]
  },
  {
    "name": "Ahmednagar",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "414001",
    "aliases": [
      "Ahilyanagar"
    ]
  },
  {
    "name": "Chandrapur",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "442401",
    "aliases": [
      "Chanda",
      "Black Gold City"
    ]
  },
  {
    "name": "Parbhani",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "431401",
    "aliases": [
      "Prabhavatinagar"
    ]
  },
  {
    "name": "Ichalkaranji",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "416115",
    "aliases": [
      "Manchester of Maharashtra"
    ]
  },
  {
    "name": "Jalna",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "431203",
    "aliases": [
      "Steel City of Maharashtra"
    ]
  },
  {
    "name": "Satara",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "415001",
    "aliases": [
      "Ajinkyatara"
    ]
  },
  {
    "name": "Beed",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "431122",
    "aliases": [
      "Bhir"
    ]
  },
  {
    "name": "Yavatmal",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "445001",
    "aliases": [
      "Yeotmal"
    ]
  },
  {
    "name": "Gondia",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "441601",
    "aliases": [
      "Gondiya",
      "Rice City"
    ]
  },
  {
    "name": "Wardha",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "442001",
    "aliases": [
      "Sevagram"
    ]
  },
  {
    "name": "Barshi",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "413401",
    "aliases": [
      "Barsi"
    ]
  },
  {
    "name": "Achalpur",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "444806",
    "aliases": [
      "Ellichpur"
    ]
  },
  {
    "name": "Dharashiv",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "413501",
    "aliases": [
      "Osmanabad"
    ]
  },
  {
    "name": "Nandurbar",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "425412"
  },
  {
    "name": "Hingoli",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "431513"
  },
  {
    "name": "Washim",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "444505",
    "aliases": [
      "Basim"
    ]
  },
  {
    "name": "Bhandara",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "441904",
    "aliases": [
      "Brass City of Vidarbha"
    ]
  },
  {
    "name": "Gadchiroli",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "442605"
  },
  {
    "name": "Ratnagiri",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "415612",
    "aliases": [
      "Alphonso City"
    ]
  },
  {
    "name": "Sindhudurg",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "416812",
    "aliases": [
      "Oros",
      "Kudal",
      "Malvan"
    ]
  },
  {
    "name": "Palghar",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "401404",
    "aliases": [
      "Tarapur",
      "Boisar"
    ]
  },
  {
    "name": "Alibag",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "402201",
    "aliases": [
      "Raigad",
      "Alibaug"
    ]
  },
  {
    "name": "Shirdi",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "423109",
    "aliases": [
      "Sai Nagar"
    ]
  },
  {
    "name": "Baramati",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "413102",
    "aliases": [
      "MIDC Baramati"
    ]
  },
  {
    "name": "Karad",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "415110"
  },
  {
    "name": "Mahabaleshwar",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "412806",
    "aliases": [
      "Panchgani"
    ]
  },
  {
    "name": "Lonavala",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "410401",
    "aliases": [
      "Khandala"
    ]
  },
  {
    "name": "Malegaon",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "423203"
  },
  {
    "name": "Chiplun",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "415605"
  },
  {
    "name": "Buldhana",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "443001",
    "aliases": [
      "Buldana",
      "Lonar"
    ]
  },
  {
    "name": "Khamgaon",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "444303"
  },
  {
    "name": "Pandharpur",
    "stateName": "Maharashtra",
    "countryCode": "IN",
    "pincode": "413304",
    "aliases": [
      "Vithoba Temple"
    ]
  },
  {
    "name": "New Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110001",
    "aliases": [
      "Delhi",
      "Central Delhi",
      "Connaught Place",
      "Barakhamba",
      "Chanakyapuri"
    ]
  },
  {
    "name": "Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110006",
    "aliases": [
      "Old Delhi",
      "Chandni Chowk",
      "Kashmiri Gate",
      "Daryaganj"
    ]
  },
  {
    "name": "North Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110007",
    "aliases": [
      "Civil Lines",
      "Delhi University",
      "Kamla Nagar",
      "Model Town"
    ]
  },
  {
    "name": "South Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110016",
    "aliases": [
      "Hauz Khas",
      "Saket",
      "Greater Kailash",
      "Green Park",
      "Malviya Nagar"
    ]
  },
  {
    "name": "West Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110027",
    "aliases": [
      "Rajouri Garden",
      "Janakpuri",
      "Punjabi Bagh",
      "Tilak Nagar",
      "Paschim Vihar"
    ]
  },
  {
    "name": "East Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110092",
    "aliases": [
      "Mayur Vihar",
      "Laxmi Nagar",
      "Preet Vihar",
      "Anand Vihar",
      "Patparganj"
    ]
  },
  {
    "name": "North West Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110085",
    "aliases": [
      "Rohini",
      "Pitampura",
      "Prashant Vihar",
      "Shalimar Bagh"
    ]
  },
  {
    "name": "South West Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110075",
    "aliases": [
      "Dwarka",
      "Vasant Kunj",
      "Najafgarh",
      "Palam"
    ]
  },
  {
    "name": "North East Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110053",
    "aliases": [
      "Yamuna Vihar",
      "Seelampur",
      "Bhajanpura"
    ]
  },
  {
    "name": "South East Delhi",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110025",
    "aliases": [
      "Okhla",
      "Lajpat Nagar",
      "Nehru Place",
      "Kalkaji",
      "Sarita Vihar"
    ]
  },
  {
    "name": "Shahdara",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110032",
    "aliases": [
      "Vivek Vihar",
      "Dilshad Garden",
      "Mansarovar Park"
    ]
  },
  {
    "name": "Karol Bagh",
    "stateName": "Delhi",
    "countryCode": "IN",
    "pincode": "110005",
    "aliases": [
      "Pusa Road",
      "Rajinder Nagar",
      "Patel Nagar"
    ]
  },
  {
    "name": "Bengaluru",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "560001",
    "aliases": [
      "Bangalore",
      "Electronic City",
      "Whitefield",
      "Koramangala",
      "Indiranagar",
      "HSR Layout",
      "Jayanagar",
      "Marathahalli"
    ]
  },
  {
    "name": "Mysuru",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "570001",
    "aliases": [
      "Mysore",
      "Heritage City"
    ]
  },
  {
    "name": "Hubballi-Dharwad",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "580020",
    "aliases": [
      "Hubli",
      "Dharwad"
    ]
  },
  {
    "name": "Mangaluru",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "575001",
    "aliases": [
      "Mangalore",
      "Dakshina Kannada"
    ]
  },
  {
    "name": "Belagavi",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "590001",
    "aliases": [
      "Belgaum"
    ]
  },
  {
    "name": "Kalaburagi",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "585101",
    "aliases": [
      "Gulbarga"
    ]
  },
  {
    "name": "Davanagere",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "577001",
    "aliases": [
      "Davangere"
    ]
  },
  {
    "name": "Ballari",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "583101",
    "aliases": [
      "Bellary"
    ]
  },
  {
    "name": "Vijayapura",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "586101",
    "aliases": [
      "Bijapur",
      "Gol Gumbaz"
    ]
  },
  {
    "name": "Shivamogga",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "577201",
    "aliases": [
      "Shimoga"
    ]
  },
  {
    "name": "Tumakuru",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "572101",
    "aliases": [
      "Tumkur"
    ]
  },
  {
    "name": "Raichur",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "584101"
  },
  {
    "name": "Bidar",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "585401"
  },
  {
    "name": "Hosapete",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "583201",
    "aliases": [
      "Hospet",
      "Vijayanagara",
      "Hampi"
    ]
  },
  {
    "name": "Gadag",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "582101",
    "aliases": [
      "Gadag-Betageri"
    ]
  },
  {
    "name": "Udupi",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "576101",
    "aliases": [
      "Manipal"
    ]
  },
  {
    "name": "Hassan",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "573201",
    "aliases": [
      "Belur",
      "Halebidu"
    ]
  },
  {
    "name": "Bhadravati",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "577301"
  },
  {
    "name": "Chitradurga",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "577501",
    "aliases": [
      "Fort City"
    ]
  },
  {
    "name": "Kolar",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "563101",
    "aliases": [
      "KGF",
      "Kolar Gold Fields"
    ]
  },
  {
    "name": "Mandya",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "571401",
    "aliases": [
      "Sugar City"
    ]
  },
  {
    "name": "Chikkamagaluru",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "577101",
    "aliases": [
      "Chikmagalur",
      "Coffee Land"
    ]
  },
  {
    "name": "Karwar",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "581301",
    "aliases": [
      "Uttara Kannada"
    ]
  },
  {
    "name": "Bagalkot",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "587101",
    "aliases": [
      "Badami"
    ]
  },
  {
    "name": "Haveri",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "581110"
  },
  {
    "name": "Yadgir",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "585201"
  },
  {
    "name": "Ramanagara",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "562159",
    "aliases": [
      "Silk City"
    ]
  },
  {
    "name": "Chamarajanagar",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "571313"
  },
  {
    "name": "Koppal",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "583231"
  },
  {
    "name": "Madikeri",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "571201",
    "aliases": [
      "Coorg",
      "Kodagu"
    ]
  },
  {
    "name": "Chikkaballapur",
    "stateName": "Karnataka",
    "countryCode": "IN",
    "pincode": "562101"
  },
  {
    "name": "Chennai",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "600001",
    "aliases": [
      "Madras",
      "OMR",
      "Guindy",
      "T Nagar",
      "Adyar",
      "Velachery",
      "Anna Nagar"
    ]
  },
  {
    "name": "Coimbatore",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "641001",
    "aliases": [
      "Kovai",
      "Manchester of South India",
      "Peelamedu",
      "Gandhipuram"
    ]
  },
  {
    "name": "Madurai",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "625001",
    "aliases": [
      "Temple City",
      "Meenakshi Amman"
    ]
  },
  {
    "name": "Tiruchirappalli",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "620001",
    "aliases": [
      "Trichy",
      "Rockfort"
    ]
  },
  {
    "name": "Salem",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "636001",
    "aliases": [
      "Steel City"
    ]
  },
  {
    "name": "Tiruppur",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "641601",
    "aliases": [
      "Tirupur",
      "Knitwear Capital"
    ]
  },
  {
    "name": "Erode",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "638001",
    "aliases": [
      "Turmeric City"
    ]
  },
  {
    "name": "Tirunelveli",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "627001",
    "aliases": [
      "Nellai"
    ]
  },
  {
    "name": "Vellore",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "632001",
    "aliases": [
      "CMC Vellore",
      "VIT"
    ]
  },
  {
    "name": "Thoothukudi",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "628001",
    "aliases": [
      "Tuticorin",
      "Pearl City"
    ]
  },
  {
    "name": "Dindigul",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "624001",
    "aliases": [
      "Lock City"
    ]
  },
  {
    "name": "Thanjavur",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "613001",
    "aliases": [
      "Tanjore",
      "Brihadeeswarar"
    ]
  },
  {
    "name": "Ranipet",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "632401"
  },
  {
    "name": "Sivakasi",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "626123",
    "aliases": [
      "Kutti Japan",
      "Fireworks City"
    ]
  },
  {
    "name": "Karur",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "639001",
    "aliases": [
      "Textile Export Hub"
    ]
  },
  {
    "name": "Udhagamandalam",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "643001",
    "aliases": [
      "Ooty",
      "Nilgiris"
    ]
  },
  {
    "name": "Hosur",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "635109",
    "aliases": [
      "Industrial Hub Hosur"
    ]
  },
  {
    "name": "Nagercoil",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "629001",
    "aliases": [
      "Kanyakumari"
    ]
  },
  {
    "name": "Kanchipuram",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "631501",
    "aliases": [
      "Silk City",
      "Conjeevaram"
    ]
  },
  {
    "name": "Kumbakonam",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "612001"
  },
  {
    "name": "Cuddalore",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "607001"
  },
  {
    "name": "Tiruvannamalai",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "606601",
    "aliases": [
      "Arunachala"
    ]
  },
  {
    "name": "Pollachi",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "642001"
  },
  {
    "name": "Rajapalayam",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "626117"
  },
  {
    "name": "Pudukkottai",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "622001"
  },
  {
    "name": "Nagapattinam",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "611001"
  },
  {
    "name": "Viluppuram",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "605602",
    "aliases": [
      "Villupuram"
    ]
  },
  {
    "name": "Namakkal",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "637001",
    "aliases": [
      "Egg City",
      "Transport Hub"
    ]
  },
  {
    "name": "Krishnagiri",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "635001"
  },
  {
    "name": "Ramanathapuram",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "623501",
    "aliases": [
      "Rameswaram"
    ]
  },
  {
    "name": "Dharmapuri",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "636701"
  },
  {
    "name": "Perambalur",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "621212"
  },
  {
    "name": "Ariyalur",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "621704"
  },
  {
    "name": "Theni",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "625531"
  },
  {
    "name": "Tenkasi",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "627811",
    "aliases": [
      "Courtallam"
    ]
  },
  {
    "name": "Chengalpattu",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "603001",
    "aliases": [
      "Mahabalipuram"
    ]
  },
  {
    "name": "Tirupathur",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "635601"
  },
  {
    "name": "Kallakurichi",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "606202"
  },
  {
    "name": "Mayiladuthurai",
    "stateName": "Tamil Nadu",
    "countryCode": "IN",
    "pincode": "609001"
  },
  {
    "name": "Ahmedabad",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "380001",
    "aliases": [
      "Amdavad",
      "Maninagar",
      "Navrangpura",
      "SG Highway",
      "Bodakdev",
      "Prahlad Nagar"
    ]
  },
  {
    "name": "Surat",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "395001",
    "aliases": [
      "Diamond City",
      "Silk City",
      "Varachha",
      "Adajan"
    ]
  },
  {
    "name": "Vadodara",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "390001",
    "aliases": [
      "Baroda",
      "Sayajigunj",
      "Alkapuri"
    ]
  },
  {
    "name": "Rajkot",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "360001",
    "aliases": [
      "Saurashtra Hub"
    ]
  },
  {
    "name": "Bhavnagar",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "364001",
    "aliases": [
      "Alang"
    ]
  },
  {
    "name": "Jamnagar",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "361001",
    "aliases": [
      "Oil City",
      "Reliance Jamnagar"
    ]
  },
  {
    "name": "Junagadh",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "362001",
    "aliases": [
      "Girnar"
    ]
  },
  {
    "name": "Gandhinagar",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "382010",
    "aliases": [
      "GIFT City",
      "Capital of Gujarat"
    ]
  },
  {
    "name": "Anand",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "388001",
    "aliases": [
      "Milk City",
      "Amul"
    ]
  },
  {
    "name": "Navsari",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "396445"
  },
  {
    "name": "Morbi",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "363641",
    "aliases": [
      "Ceramic City of India"
    ]
  },
  {
    "name": "Nadiad",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "387001",
    "aliases": [
      "Kheda"
    ]
  },
  {
    "name": "Bharuch",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "392001",
    "aliases": [
      "Broach",
      "Dahej"
    ]
  },
  {
    "name": "Porbandar",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "360575",
    "aliases": [
      "Birthplace of Mahatma Gandhi"
    ]
  },
  {
    "name": "Vapi",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "396191",
    "aliases": [
      "Chemical Hub Vapi"
    ]
  },
  {
    "name": "Mehsana",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "384001"
  },
  {
    "name": "Bhuj",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "370001",
    "aliases": [
      "Kutch",
      "Rann of Kutch"
    ]
  },
  {
    "name": "Valsad",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "396001",
    "aliases": [
      "Bulsar"
    ]
  },
  {
    "name": "Ankleshwar",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "393001",
    "aliases": [
      "Industrial GIDC"
    ]
  },
  {
    "name": "Gandhidham",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "370201",
    "aliases": [
      "Kandla",
      "Deendayal Port"
    ]
  },
  {
    "name": "Godhra",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "389001",
    "aliases": [
      "Panchmahal"
    ]
  },
  {
    "name": "Patan",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "384265",
    "aliases": [
      "Rani ki Vav"
    ]
  },
  {
    "name": "Palanpur",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "385001",
    "aliases": [
      "Banaskantha"
    ]
  },
  {
    "name": "Veraval",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "362265",
    "aliases": [
      "Somnath",
      "Gir Somnath"
    ]
  },
  {
    "name": "Surendranagar",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "363001",
    "aliases": [
      "Wadhwan"
    ]
  },
  {
    "name": "Amreli",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "365601"
  },
  {
    "name": "Botad",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "364710"
  },
  {
    "name": "Dahod",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "389151"
  },
  {
    "name": "Himatnagar",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "383001",
    "aliases": [
      "Sabarkantha"
    ]
  },
  {
    "name": "Modasa",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "383315",
    "aliases": [
      "Aravalli"
    ]
  },
  {
    "name": "Vyara",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "394650",
    "aliases": [
      "Tapi"
    ]
  },
  {
    "name": "Ahwa",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "394710",
    "aliases": [
      "Dang"
    ]
  },
  {
    "name": "Chhota Udaipur",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "391165"
  },
  {
    "name": "Mahisagar",
    "stateName": "Gujarat",
    "countryCode": "IN",
    "pincode": "389230",
    "aliases": [
      "Lunawada"
    ]
  },
  {
    "name": "Lucknow",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "226001",
    "aliases": [
      "City of Nawabs",
      "Hazratganj",
      "Gomti Nagar",
      "Alambagh"
    ]
  },
  {
    "name": "Kanpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "208001",
    "aliases": [
      "Cawnpore",
      "Leather City",
      "Civil Lines Kanpur"
    ]
  },
  {
    "name": "Varanasi",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "221001",
    "aliases": [
      "Banaras",
      "Kashi",
      "Ghats of Kashi"
    ]
  },
  {
    "name": "Agra",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "282001",
    "aliases": [
      "Taj Mahal City"
    ]
  },
  {
    "name": "Prayagraj",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "211001",
    "aliases": [
      "Allahabad",
      "Sangam"
    ]
  },
  {
    "name": "Meerut",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "250001",
    "aliases": [
      "Sports City"
    ]
  },
  {
    "name": "Ghaziabad",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "201001",
    "aliases": [
      "Indirapuram",
      "Vaishali",
      "Raj Nagar"
    ]
  },
  {
    "name": "Noida",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "201301",
    "aliases": [
      "Gautam Buddha Nagar",
      "Sector 18 Noida",
      "Sector 62"
    ]
  },
  {
    "name": "Greater Noida",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "201310",
    "aliases": [
      "Pari Chowk",
      "Knowledge Park"
    ]
  },
  {
    "name": "Bareilly",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "243001"
  },
  {
    "name": "Aligarh",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "202001",
    "aliases": [
      "Lock City",
      "AMU"
    ]
  },
  {
    "name": "Moradabad",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "244001",
    "aliases": [
      "Brass City"
    ]
  },
  {
    "name": "Saharanpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "247001",
    "aliases": [
      "Woodcraft City"
    ]
  },
  {
    "name": "Gorakhpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "273001",
    "aliases": [
      "Gorakhnath"
    ]
  },
  {
    "name": "Firozabad",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "283203",
    "aliases": [
      "Glass City",
      "Bangle City"
    ]
  },
  {
    "name": "Jhansi",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "284001",
    "aliases": [
      "Bundelkhand Hub"
    ]
  },
  {
    "name": "Muzaffarnagar",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "251001"
  },
  {
    "name": "Mathura",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "281001",
    "aliases": [
      "Vrindavan",
      "Braj"
    ]
  },
  {
    "name": "Ayodhya",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "224123",
    "aliases": [
      "Faizabad",
      "Ram Janmabhoomi"
    ]
  },
  {
    "name": "Rampur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "244901"
  },
  {
    "name": "Shahjahanpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "242001"
  },
  {
    "name": "Farrukhabad",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "209625",
    "aliases": [
      "Fatehgarh"
    ]
  },
  {
    "name": "Hapur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "245101"
  },
  {
    "name": "Etawah",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "206001"
  },
  {
    "name": "Mirzapur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "231001",
    "aliases": [
      "Vindhyachal",
      "Carpet City"
    ]
  },
  {
    "name": "Bulandshahr",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "203001"
  },
  {
    "name": "Sambhal",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "244302"
  },
  {
    "name": "Amroha",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "244221"
  },
  {
    "name": "Hardoi",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "241001"
  },
  {
    "name": "Fatehpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "212601"
  },
  {
    "name": "Raebareli",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "229001"
  },
  {
    "name": "Orai",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "285001",
    "aliases": [
      "Jalaun"
    ]
  },
  {
    "name": "Sitapur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "261001"
  },
  {
    "name": "Bahraich",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "271801"
  },
  {
    "name": "Modinagar",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "201204"
  },
  {
    "name": "Unnao",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "209801"
  },
  {
    "name": "Jaunpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "222001"
  },
  {
    "name": "Lakhimpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "262701",
    "aliases": [
      "Lakhimpur Kheri",
      "Dudhwa"
    ]
  },
  {
    "name": "Hathras",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "204101",
    "aliases": [
      "Asafoetida City"
    ]
  },
  {
    "name": "Banda",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "210001"
  },
  {
    "name": "Pilibhit",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "262001",
    "aliases": [
      "Tiger Reserve"
    ]
  },
  {
    "name": "Barabanki",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "225001",
    "aliases": [
      "Dewa Sharif"
    ]
  },
  {
    "name": "Basti",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "272001"
  },
  {
    "name": "Gonda",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "271001"
  },
  {
    "name": "Ballia",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "277001"
  },
  {
    "name": "Deoria",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "274001"
  },
  {
    "name": "Ghazipur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "233001"
  },
  {
    "name": "Sultanpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "228001"
  },
  {
    "name": "Azamgarh",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "276001"
  },
  {
    "name": "Bijnor",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "246701"
  },
  {
    "name": "Mainpuri",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "205001"
  },
  {
    "name": "Lalitpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "284403"
  },
  {
    "name": "Pratapgarh",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "230001",
    "aliases": [
      "Pratapgarh UP",
      "Aonla"
    ]
  },
  {
    "name": "Shamli",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "247776"
  },
  {
    "name": "Kasganj",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "207123",
    "aliases": [
      "Kanshiram Nagar"
    ]
  },
  {
    "name": "Amethi",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "227405"
  },
  {
    "name": "Mahoba",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "210427"
  },
  {
    "name": "Chitrakoot",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "210205",
    "aliases": [
      "Karwi"
    ]
  },
  {
    "name": "Kaushambi",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "212290"
  },
  {
    "name": "Siddharthnagar",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "272207",
    "aliases": [
      "Naugarh",
      "Kapilvastu"
    ]
  },
  {
    "name": "Sant Kabir Nagar",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "272175",
    "aliases": [
      "Khalilabad"
    ]
  },
  {
    "name": "Maharajganj",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "273303"
  },
  {
    "name": "Kushinagar",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "274403",
    "aliases": [
      "Padrauna"
    ]
  },
  {
    "name": "Mau",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "275101",
    "aliases": [
      "Maunath Bhanjan"
    ]
  },
  {
    "name": "Bhadohi",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "221401",
    "aliases": [
      "Sant Ravidas Nagar",
      "Carpet City Bhadohi"
    ]
  },
  {
    "name": "Chandauli",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "232104",
    "aliases": [
      "Rice Bowl of UP"
    ]
  },
  {
    "name": "Sonbhadra",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "231216",
    "aliases": [
      "Robertsganj",
      "Renukoot"
    ]
  },
  {
    "name": "Kannauj",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "209725",
    "aliases": [
      "Perfume Capital of India"
    ]
  },
  {
    "name": "Auraiya",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "206122"
  },
  {
    "name": "Balrampur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "271201",
    "aliases": [
      "Balrampur UP"
    ]
  },
  {
    "name": "Shravasti",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "271831",
    "aliases": [
      "Bhinga"
    ]
  },
  {
    "name": "Hamirpur",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "210301",
    "aliases": [
      "Hamirpur UP"
    ]
  },
  {
    "name": "Baghpat",
    "stateName": "Uttar Pradesh",
    "countryCode": "IN",
    "pincode": "250609"
  },
  {
    "name": "Kolkata",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "700001",
    "aliases": [
      "Calcutta",
      "Park Street",
      "Salt Lake",
      "New Town",
      "Alipore",
      "Ballygunge"
    ]
  },
  {
    "name": "Howrah",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "711101",
    "aliases": [
      "Haora",
      "Howrah Bridge",
      "Santragachi"
    ]
  },
  {
    "name": "Durgapur",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "713201",
    "aliases": [
      "Steel City of East"
    ]
  },
  {
    "name": "Asansol",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "713301",
    "aliases": [
      "Paschim Bardhaman"
    ]
  },
  {
    "name": "Siliguri",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "734001",
    "aliases": [
      "Gateway to Northeast"
    ]
  },
  {
    "name": "Bardhaman",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "713101",
    "aliases": [
      "Burdwan",
      "Purba Bardhaman"
    ]
  },
  {
    "name": "Malda",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "732101",
    "aliases": [
      "English Bazar",
      "Mango City"
    ]
  },
  {
    "name": "Baharampur",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "742101",
    "aliases": [
      "Berhampore",
      "Murshidabad"
    ]
  },
  {
    "name": "Habra",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "743263"
  },
  {
    "name": "Kharagpur",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "721301",
    "aliases": [
      "IIT Kharagpur"
    ]
  },
  {
    "name": "Shantipur",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "741404",
    "aliases": [
      "Handloom Hub"
    ]
  },
  {
    "name": "Dankuni",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "712311",
    "aliases": [
      "Hooghly Industrial Hub"
    ]
  },
  {
    "name": "Ranaghat",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "741201"
  },
  {
    "name": "Haldia",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "721607",
    "aliases": [
      "Port City Haldia"
    ]
  },
  {
    "name": "Raiganj",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "733134",
    "aliases": [
      "Uttar Dinajpur"
    ]
  },
  {
    "name": "Krishnanagar",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "741101",
    "aliases": [
      "Nadia"
    ]
  },
  {
    "name": "Nabadwip",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "741302",
    "aliases": [
      "Mayapur",
      "Chaitanya"
    ]
  },
  {
    "name": "Medinipur",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "721101",
    "aliases": [
      "Midnapore",
      "Paschim Medinipur"
    ]
  },
  {
    "name": "Jalpaiguri",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "735101",
    "aliases": [
      "Dooars"
    ]
  },
  {
    "name": "Balurghat",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "733101",
    "aliases": [
      "Dakshin Dinajpur"
    ]
  },
  {
    "name": "Basirhat",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "743411"
  },
  {
    "name": "Bankura",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "722101",
    "aliases": [
      "Terracotta City"
    ]
  },
  {
    "name": "Darjeeling",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "734101",
    "aliases": [
      "Queen of the Hills",
      "Tea City"
    ]
  },
  {
    "name": "Alipurduar",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "736121",
    "aliases": [
      "Jaldapara"
    ]
  },
  {
    "name": "Purulia",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "723101",
    "aliases": [
      "Chhau Land"
    ]
  },
  {
    "name": "Cooch Behar",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "736101",
    "aliases": [
      "Koch Bihar"
    ]
  },
  {
    "name": "Kalimpong",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "734301"
  },
  {
    "name": "Tamluk",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "721636",
    "aliases": [
      "Purba Medinipur"
    ]
  },
  {
    "name": "Jhargram",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "721507"
  },
  {
    "name": "Suri",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "731101",
    "aliases": [
      "Birbhum"
    ]
  },
  {
    "name": "Bolpur",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "731204",
    "aliases": [
      "Shantiniketan",
      "Visva Bharati"
    ]
  },
  {
    "name": "Bongaon",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "743235",
    "aliases": [
      "Petrapole Border"
    ]
  },
  {
    "name": "Barasat",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "700124",
    "aliases": [
      "North 24 Parganas"
    ]
  },
  {
    "name": "Diamond Harbour",
    "stateName": "West Bengal",
    "countryCode": "IN",
    "pincode": "743331",
    "aliases": [
      "South 24 Parganas",
      "Sundarbans"
    ]
  },
  {
    "name": "Hyderabad",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "500001",
    "aliases": [
      "Cyberabad",
      "Hitec City",
      "Gachibowli",
      "Madhapur",
      "Banjara Hills",
      "Jubilee Hills",
      "Charminar"
    ]
  },
  {
    "name": "Secunderabad",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "500003",
    "aliases": [
      "Twin City Secunderabad"
    ]
  },
  {
    "name": "Warangal",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "506001",
    "aliases": [
      "Hanamkonda",
      "Kazipet",
      "Kakatiya"
    ]
  },
  {
    "name": "Nizamabad",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "503001",
    "aliases": [
      "Indur"
    ]
  },
  {
    "name": "Karimnagar",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "505001"
  },
  {
    "name": "Ramagundam",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "505208",
    "aliases": [
      "NTPC Ramagundam"
    ]
  },
  {
    "name": "Khammam",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "507001"
  },
  {
    "name": "Mahbubnagar",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "509001",
    "aliases": [
      "Palamoor"
    ]
  },
  {
    "name": "Nalgonda",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "508001"
  },
  {
    "name": "Adilabad",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "504001"
  },
  {
    "name": "Suryapet",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "508213"
  },
  {
    "name": "Miryalaguda",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "508207"
  },
  {
    "name": "Siddipet",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "502103"
  },
  {
    "name": "Jagtial",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "505327"
  },
  {
    "name": "Nirmal",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "504106",
    "aliases": [
      "Toy City"
    ]
  },
  {
    "name": "Kamareddy",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "503111"
  },
  {
    "name": "Kothagudem",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "507101",
    "aliases": [
      "Bhadradri Kothagudem"
    ]
  },
  {
    "name": "Bodhan",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "503185"
  },
  {
    "name": "Palwancha",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "507115"
  },
  {
    "name": "Mandamarri",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "504231"
  },
  {
    "name": "Koratla",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "505326"
  },
  {
    "name": "Tandur",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "501141"
  },
  {
    "name": "Mancherial",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "504208"
  },
  {
    "name": "Sangareddy",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "502001",
    "aliases": [
      "Medak"
    ]
  },
  {
    "name": "Wanaparthy",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "509380"
  },
  {
    "name": "Gadwal",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "509125",
    "aliases": [
      "Jogulamba Gadwal"
    ]
  },
  {
    "name": "Nagarkurnool",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "509209"
  },
  {
    "name": "Vikarabad",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "501101",
    "aliases": [
      "Ananthagiri Hills"
    ]
  },
  {
    "name": "Jangaon",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "506167"
  },
  {
    "name": "Bhupalpally",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "506169",
    "aliases": [
      "Jayashankar Bhupalpally"
    ]
  },
  {
    "name": "Mahabubabad",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "506101"
  },
  {
    "name": "Medchal",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "501401",
    "aliases": [
      "Malkajgiri",
      "Kompally"
    ]
  },
  {
    "name": "Shamshabad",
    "stateName": "Telangana",
    "countryCode": "IN",
    "pincode": "501218",
    "aliases": [
      "Hyderabad Airport",
      "RGIA"
    ]
  },
  {
    "name": "Visakhapatnam",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "530001",
    "aliases": [
      "Vizag",
      "Waltair",
      "Steel City Vizag",
      "Rushikonda"
    ]
  },
  {
    "name": "Vijayawada",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "520001",
    "aliases": [
      "Bezawada",
      "Benz Circle"
    ]
  },
  {
    "name": "Guntur",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "522001",
    "aliases": [
      "Chilli City"
    ]
  },
  {
    "name": "Nellore",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "524001",
    "aliases": [
      "Sri Potti Sriramulu Nellore"
    ]
  },
  {
    "name": "Kurnool",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "518001",
    "aliases": [
      "Gateway of Rayalaseema"
    ]
  },
  {
    "name": "Kakinada",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "533001",
    "aliases": [
      "Fertilizer City"
    ]
  },
  {
    "name": "Rajamahendravaram",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "533101",
    "aliases": [
      "Rajahmundry",
      "Cultural Capital of AP"
    ]
  },
  {
    "name": "Kadapa",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "516001",
    "aliases": [
      "Cuddapah",
      "YSR Kadapa"
    ]
  },
  {
    "name": "Tirupati",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "517501",
    "aliases": [
      "Tirumala",
      "Balaji Temple"
    ]
  },
  {
    "name": "Anantapur",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "515001",
    "aliases": [
      "Anantapuramu"
    ]
  },
  {
    "name": "Vizianagaram",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "535001"
  },
  {
    "name": "Eluru",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "534001"
  },
  {
    "name": "Nandyal",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "518501"
  },
  {
    "name": "Ongole",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "523001",
    "aliases": [
      "Prakasam"
    ]
  },
  {
    "name": "Adoni",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "518301"
  },
  {
    "name": "Madanapalle",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "517325",
    "aliases": [
      "Horsley Hills"
    ]
  },
  {
    "name": "Machilipatnam",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "521001",
    "aliases": [
      "Bandar",
      "Krishna"
    ]
  },
  {
    "name": "Tenali",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "522201",
    "aliases": [
      "Andhra Paris"
    ]
  },
  {
    "name": "Proddatur",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "516360",
    "aliases": [
      "Gold Hub"
    ]
  },
  {
    "name": "Chittoor",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "517001"
  },
  {
    "name": "Hindupur",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "515201"
  },
  {
    "name": "Bhimavaram",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "534201",
    "aliases": [
      "Aqua City",
      "West Godavari"
    ]
  },
  {
    "name": "Guntakal",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "515801",
    "aliases": [
      "Railway Junction"
    ]
  },
  {
    "name": "Dharmavaram",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "515671",
    "aliases": [
      "Silk City AP"
    ]
  },
  {
    "name": "Gudivada",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "521301"
  },
  {
    "name": "Narasaraopet",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "522601",
    "aliases": [
      "Palnadu"
    ]
  },
  {
    "name": "Tadipatri",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "515411"
  },
  {
    "name": "Mangalagiri",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "522503",
    "aliases": [
      "AIIMS Mangalagiri",
      "NRI Academy"
    ]
  },
  {
    "name": "Tadepalligudem",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "534101",
    "aliases": [
      "NIT AP"
    ]
  },
  {
    "name": "Amaravati",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "522020",
    "aliases": [
      "Capital City AP"
    ]
  },
  {
    "name": "Srikakulam",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "532001"
  },
  {
    "name": "Anakapalle",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "531001",
    "aliases": [
      "Jaggery Market"
    ]
  },
  {
    "name": "Bapatla",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "522101",
    "aliases": [
      "Suryalanka Beach"
    ]
  },
  {
    "name": "Rayachoti",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "516269",
    "aliases": [
      "Annamayya"
    ]
  },
  {
    "name": "Puttaparthi",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "515134",
    "aliases": [
      "Sri Sathya Sai"
    ]
  },
  {
    "name": "Paderu",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "531077",
    "aliases": [
      "Alluri Sitharama Raju",
      "Araku Valley"
    ]
  },
  {
    "name": "Parvathipuram",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "535501",
    "aliases": [
      "Parvathipuram Manyam"
    ]
  },
  {
    "name": "Amalapuram",
    "stateName": "Andhra Pradesh",
    "countryCode": "IN",
    "pincode": "533201",
    "aliases": [
      "Konaseema"
    ]
  },
  {
    "name": "Jaipur",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "302001",
    "aliases": [
      "Pink City",
      "Mansarovar",
      "Vaishali Nagar",
      "Malviya Nagar Jaipur",
      "Sitapura"
    ]
  },
  {
    "name": "Jodhpur",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "342001",
    "aliases": [
      "Sun City",
      "Blue City",
      "Mehrangarh"
    ]
  },
  {
    "name": "Kota",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "324001",
    "aliases": [
      "Coaching Hub",
      "Industrial Kota"
    ]
  },
  {
    "name": "Bikaner",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "334001",
    "aliases": [
      "Camel City",
      "Namkeen City"
    ]
  },
  {
    "name": "Ajmer",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "305001",
    "aliases": [
      "Dargah Sharif",
      "Pushkar"
    ]
  },
  {
    "name": "Udaipur",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "313001",
    "aliases": [
      "City of Lakes",
      "Venice of the East"
    ]
  },
  {
    "name": "Bhilwara",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "311001",
    "aliases": [
      "Textile City of Rajasthan"
    ]
  },
  {
    "name": "Alwar",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "301001",
    "aliases": [
      "Bhiwadi",
      "Matsya City"
    ]
  },
  {
    "name": "Bharatpur",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "321001",
    "aliases": [
      "Keoladeo",
      "Bird Sanctuary"
    ]
  },
  {
    "name": "Sikar",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "332001",
    "aliases": [
      "Shekhawati"
    ]
  },
  {
    "name": "Pali",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "306401",
    "aliases": [
      "Textile Hub Pali"
    ]
  },
  {
    "name": "Sri Ganganagar",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "335001",
    "aliases": [
      "Ganganagar",
      "Food Basket of Rajasthan"
    ]
  },
  {
    "name": "Beawar",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "305901"
  },
  {
    "name": "Hanumangarh",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "335512"
  },
  {
    "name": "Tonk",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "304001"
  },
  {
    "name": "Kishangarh",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "305801",
    "aliases": [
      "Marble City Kishangarh"
    ]
  },
  {
    "name": "Jhunjhunu",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "333001",
    "aliases": [
      "Pilani",
      "BITS Pilani"
    ]
  },
  {
    "name": "Sawai Madhopur",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "322001",
    "aliases": [
      "Ranthambore"
    ]
  },
  {
    "name": "Churu",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "331001"
  },
  {
    "name": "Chittorgarh",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "312001",
    "aliases": [
      "Chittor Fort"
    ]
  },
  {
    "name": "Bundi",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "323001"
  },
  {
    "name": "Dausa",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "303303",
    "aliases": [
      "Mehandipur Balaji"
    ]
  },
  {
    "name": "Nagaur",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "341001"
  },
  {
    "name": "Sujangarh",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "331507"
  },
  {
    "name": "Hindaun",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "322230"
  },
  {
    "name": "Gangapur City",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "322201"
  },
  {
    "name": "Banswara",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "327001",
    "aliases": [
      "City of Hundred Islands"
    ]
  },
  {
    "name": "Barmer",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "344001",
    "aliases": [
      "Oilfield Barmer"
    ]
  },
  {
    "name": "Jaisalmer",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "345001",
    "aliases": [
      "Golden City",
      "Thar Desert"
    ]
  },
  {
    "name": "Jalore",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "343001",
    "aliases": [
      "Granite City"
    ]
  },
  {
    "name": "Sirohi",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "307001",
    "aliases": [
      "Mount Abu"
    ]
  },
  {
    "name": "Dungarpur",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "314001"
  },
  {
    "name": "Rajsamand",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "313324",
    "aliases": [
      "Kankroli",
      "Nathdwara"
    ]
  },
  {
    "name": "Dholpur",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "328001"
  },
  {
    "name": "Karauli",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "322241"
  },
  {
    "name": "Pratapgarh",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "312605",
    "aliases": [
      "Pratapgarh RJ"
    ]
  },
  {
    "name": "Baran",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "325205"
  },
  {
    "name": "Jhalawar",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "326001"
  },
  {
    "name": "Balotra",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "344022"
  },
  {
    "name": "Bhiwadi",
    "stateName": "Rajasthan",
    "countryCode": "IN",
    "pincode": "301019",
    "aliases": [
      "Industrial Hub Bhiwadi"
    ]
  },
  {
    "name": "Indore",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "452001",
    "aliases": [
      "Mini Mumbai",
      "Cleanest City",
      "Vijay Nagar",
      "Palasia",
      "Pithampur Link"
    ]
  },
  {
    "name": "Bhopal",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "462001",
    "aliases": [
      "City of Lakes Bhopal",
      "MP Nagar",
      "Arera Colony"
    ]
  },
  {
    "name": "Jabalpur",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "482001",
    "aliases": [
      "Marble Rocks",
      "Bhedaghat"
    ]
  },
  {
    "name": "Gwalior",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "474001",
    "aliases": [
      "Fort City Gwalior"
    ]
  },
  {
    "name": "Ujjain",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "456001",
    "aliases": [
      "Mahakaleshwar",
      "Avanti"
    ]
  },
  {
    "name": "Sagar",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "470001"
  },
  {
    "name": "Dewas",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "455001",
    "aliases": [
      "Bank Note Press"
    ]
  },
  {
    "name": "Satna",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "485001",
    "aliases": [
      "Cement City Satna",
      "Maihar Link"
    ]
  },
  {
    "name": "Ratlam",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "457001",
    "aliases": [
      "Ratlam Sev"
    ]
  },
  {
    "name": "Rewa",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "486001",
    "aliases": [
      "White Tiger Land"
    ]
  },
  {
    "name": "Murwara",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "483501",
    "aliases": [
      "Katni",
      "Limestone City"
    ]
  },
  {
    "name": "Singrauli",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "486889",
    "aliases": [
      "Energy Capital of India",
      "Waidhan"
    ]
  },
  {
    "name": "Burhanpur",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "450331"
  },
  {
    "name": "Khandwa",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "450001",
    "aliases": [
      "East Nimar",
      "Omkareshwar"
    ]
  },
  {
    "name": "Bhind",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "477001"
  },
  {
    "name": "Chhindwara",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "480001"
  },
  {
    "name": "Guna",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "473001"
  },
  {
    "name": "Shivpuri",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "473551"
  },
  {
    "name": "Vidisha",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "464001"
  },
  {
    "name": "Damoh",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "470661"
  },
  {
    "name": "Mandsaur",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "458001",
    "aliases": [
      "Pashupatinath"
    ]
  },
  {
    "name": "Khargone",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "451001",
    "aliases": [
      "West Nimar",
      "Maheshwar"
    ]
  },
  {
    "name": "Neemuch",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "458441"
  },
  {
    "name": "Pithampur",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "454775",
    "aliases": [
      "Detroit of India",
      "Auto Hub"
    ]
  },
  {
    "name": "Narmadapuram",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "461001",
    "aliases": [
      "Hoshangabad",
      "Pachmarhi Link"
    ]
  },
  {
    "name": "Itarsi",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "461111",
    "aliases": [
      "Railway Junction Itarsi"
    ]
  },
  {
    "name": "Sehore",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "466001"
  },
  {
    "name": "Betul",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "460001"
  },
  {
    "name": "Seoni",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "480661",
    "aliases": [
      "Mowgli Land",
      "Pench"
    ]
  },
  {
    "name": "Datia",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "475661",
    "aliases": [
      "Pitambara Peeth"
    ]
  },
  {
    "name": "Nagda",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "456335"
  },
  {
    "name": "Dhar",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "454001",
    "aliases": [
      "Mandu"
    ]
  },
  {
    "name": "Balaghat",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "481001",
    "aliases": [
      "Manganese City"
    ]
  },
  {
    "name": "Morena",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "476001",
    "aliases": [
      "Chambal"
    ]
  },
  {
    "name": "Barwani",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "451551"
  },
  {
    "name": "Tikamgarh",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "472001",
    "aliases": [
      "Orchha Link"
    ]
  },
  {
    "name": "Shahdol",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "484001"
  },
  {
    "name": "Panna",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "488001",
    "aliases": [
      "Diamond City Panna"
    ]
  },
  {
    "name": "Raisen",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "464551",
    "aliases": [
      "Sanchi Stupa",
      "Bhimbetka"
    ]
  },
  {
    "name": "Rajgarh",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "465661",
    "aliases": [
      "Biaora"
    ]
  },
  {
    "name": "Shajapur",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "465001"
  },
  {
    "name": "Anuppur",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "484224",
    "aliases": [
      "Amarkantak"
    ]
  },
  {
    "name": "Maihar",
    "stateName": "Madhya Pradesh",
    "countryCode": "IN",
    "pincode": "485771",
    "aliases": [
      "Sharda Temple"
    ]
  },
  {
    "name": "Patna",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "800001",
    "aliases": [
      "Pataliputra",
      "Kankarbagh",
      "Boring Road",
      "Patliputra",
      "Danapur link"
    ]
  },
  {
    "name": "Gaya",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "823001",
    "aliases": [
      "Bodh Gaya",
      "Mahabodhi"
    ]
  },
  {
    "name": "Bhagalpur",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "812001",
    "aliases": [
      "Silk City Bhagalpur"
    ]
  },
  {
    "name": "Muzaffarpur",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "842001",
    "aliases": [
      "Litchi City"
    ]
  },
  {
    "name": "Purnia",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "854301",
    "aliases": [
      "Purnea"
    ]
  },
  {
    "name": "Darbhanga",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "846001",
    "aliases": [
      "Mithila Capital"
    ]
  },
  {
    "name": "Bihar Sharif",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "803101",
    "aliases": [
      "Nalanda",
      "Rajgir"
    ]
  },
  {
    "name": "Arrah",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "802301",
    "aliases": [
      "Bhojpur",
      "Ara"
    ]
  },
  {
    "name": "Begusarai",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "851101",
    "aliases": [
      "Industrial Capital of Bihar",
      "Barauni"
    ]
  },
  {
    "name": "Katihar",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "854105",
    "aliases": [
      "Jute Hub"
    ]
  },
  {
    "name": "Munger",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "811201",
    "aliases": [
      "Monghyr",
      "Yoga City"
    ]
  },
  {
    "name": "Chhapra",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "841301",
    "aliases": [
      "Saran"
    ]
  },
  {
    "name": "Danapur",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "801503",
    "aliases": [
      "Danapur Cantt"
    ]
  },
  {
    "name": "Bettiah",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "845438",
    "aliases": [
      "West Champaran"
    ]
  },
  {
    "name": "Saharsa",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "852201"
  },
  {
    "name": "Sasaram",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "821115",
    "aliases": [
      "Rohtas",
      "Sher Shah Suri"
    ]
  },
  {
    "name": "Hajipur",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "844101",
    "aliases": [
      "Vaishali"
    ]
  },
  {
    "name": "Dehri",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "821305",
    "aliases": [
      "Dehri-on-Sone"
    ]
  },
  {
    "name": "Siwan",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "841226"
  },
  {
    "name": "Motihari",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "845401",
    "aliases": [
      "East Champaran"
    ]
  },
  {
    "name": "Nawada",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "805110"
  },
  {
    "name": "Bagaha",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "845101"
  },
  {
    "name": "Buxar",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "802101"
  },
  {
    "name": "Kishanganj",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "855107",
    "aliases": [
      "Tea Garden Hub"
    ]
  },
  {
    "name": "Sitamarhi",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "843302",
    "aliases": [
      "Janakpur Road"
    ]
  },
  {
    "name": "Jamalpur",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "811214",
    "aliases": [
      "Railway Workshop"
    ]
  },
  {
    "name": "Jehanabad",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "804408"
  },
  {
    "name": "Aurangabad",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "824101",
    "aliases": [
      "Aurangabad Bihar",
      "Deo Sun Temple"
    ]
  },
  {
    "name": "Lakhisarai",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "811311"
  },
  {
    "name": "Madhubani",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "847211",
    "aliases": [
      "Madhubani Painting"
    ]
  },
  {
    "name": "Samastipur",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "848101",
    "aliases": [
      "Pusa"
    ]
  },
  {
    "name": "Supaul",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "852131"
  },
  {
    "name": "Araria",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "854311"
  },
  {
    "name": "Gopalganj",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "841428"
  },
  {
    "name": "Madhepura",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "852113"
  },
  {
    "name": "Khagaria",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "851204"
  },
  {
    "name": "Jamui",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "811307"
  },
  {
    "name": "Banka",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "813102"
  },
  {
    "name": "Sheikhpura",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "811105"
  },
  {
    "name": "Bhabua",
    "stateName": "Bihar",
    "countryCode": "IN",
    "pincode": "821101",
    "aliases": [
      "Kaimur"
    ]
  },
  {
    "name": "Ludhiana",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "141001",
    "aliases": [
      "Manchester of India",
      "Hosiery City"
    ]
  },
  {
    "name": "Amritsar",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "143001",
    "aliases": [
      "Golden City",
      "Ambarsar",
      "Golden Temple",
      "Wagah Border"
    ]
  },
  {
    "name": "Jalandhar",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "144001",
    "aliases": [
      "Jullundur",
      "Sports Goods Hub"
    ]
  },
  {
    "name": "Patiala",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "147001",
    "aliases": [
      "Royal City"
    ]
  },
  {
    "name": "Bathinda",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "151001",
    "aliases": [
      "Bhatinda",
      "Thermal Plant"
    ]
  },
  {
    "name": "SAS Nagar",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "160055",
    "aliases": [
      "Mohali",
      "Tricity Mohali"
    ]
  },
  {
    "name": "Hoshiarpur",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "146001",
    "aliases": [
      "City of Mangoes"
    ]
  },
  {
    "name": "Batala",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "143505"
  },
  {
    "name": "Pathankot",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "145001",
    "aliases": [
      "Gateway to Himachal and Kashmir"
    ]
  },
  {
    "name": "Moga",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "142001",
    "aliases": [
      "Nestle Moga"
    ]
  },
  {
    "name": "Abohar",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "152116",
    "aliases": [
      "Kinnow Capital"
    ]
  },
  {
    "name": "Malerkotla",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "148023"
  },
  {
    "name": "Khanna",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "141401",
    "aliases": [
      "Largest Grain Market in Asia"
    ]
  },
  {
    "name": "Phagwara",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "144401",
    "aliases": [
      "LPU Phagwara"
    ]
  },
  {
    "name": "Sri Muktsar Sahib",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "152026",
    "aliases": [
      "Muktsar"
    ]
  },
  {
    "name": "Barnala",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "148101"
  },
  {
    "name": "Rajpura",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "140401"
  },
  {
    "name": "Firozpur",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "152001",
    "aliases": [
      "Ferozepur",
      "Hussainiwala"
    ]
  },
  {
    "name": "Kapurthala",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "144601",
    "aliases": [
      "City of Palaces",
      "RCF"
    ]
  },
  {
    "name": "Sangrur",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "148001"
  },
  {
    "name": "Fazilka",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "152123"
  },
  {
    "name": "Mansa",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "151505",
    "aliases": [
      "Area of White Gold"
    ]
  },
  {
    "name": "Gurdaspur",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "143521",
    "aliases": [
      "Dera Baba Nanak"
    ]
  },
  {
    "name": "Fatehgarh Sahib",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "140406",
    "aliases": [
      "Sirhind"
    ]
  },
  {
    "name": "Rupnagar",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "140001",
    "aliases": [
      "Ropar",
      "IIT Ropar"
    ]
  },
  {
    "name": "Nawanshahr",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "144514",
    "aliases": [
      "Shaheed Bhagat Singh Nagar",
      "Khatkar Kalan"
    ]
  },
  {
    "name": "Tarn Taran",
    "stateName": "Punjab",
    "countryCode": "IN",
    "pincode": "143401"
  },
  {
    "name": "Faridabad",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "121001",
    "aliases": [
      "Industrial Faridabad",
      "NIT Faridabad"
    ]
  },
  {
    "name": "Gurugram",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "122001",
    "aliases": [
      "Gurgaon",
      "Cyber City",
      "DLF Cyber City",
      "Golf Course Road",
      "Sohna Road"
    ]
  },
  {
    "name": "Panipat",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "132103",
    "aliases": [
      "City of Weavers",
      "Historic Panipat"
    ]
  },
  {
    "name": "Ambala",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "133001",
    "aliases": [
      "Ambala Cantt",
      "Ambala City",
      "Scientific City"
    ]
  },
  {
    "name": "Yamunanagar",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "135001",
    "aliases": [
      "Jagadhri",
      "Plywood Capital"
    ]
  },
  {
    "name": "Rohtak",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "124001",
    "aliases": [
      "MDU Rohtak"
    ]
  },
  {
    "name": "Hisar",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "125001",
    "aliases": [
      "Hissar",
      "Steel City of Haryana"
    ]
  },
  {
    "name": "Karnal",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "132001",
    "aliases": [
      "Rice Bowl",
      "NDRI"
    ]
  },
  {
    "name": "Sonipat",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "131001",
    "aliases": [
      "Sonepat",
      "Kundli",
      "Rai"
    ]
  },
  {
    "name": "Panchkula",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "134109",
    "aliases": [
      "Tricity Panchkula"
    ]
  },
  {
    "name": "Bhiwani",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "127021",
    "aliases": [
      "Mini Cuba",
      "Boxing Hub"
    ]
  },
  {
    "name": "Sirsa",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "125055"
  },
  {
    "name": "Bahadurgarh",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "124507",
    "aliases": [
      "Footwear Park"
    ]
  },
  {
    "name": "Jind",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "126102",
    "aliases": [
      "Heart of Haryana"
    ]
  },
  {
    "name": "Thanesar",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "136118",
    "aliases": [
      "Kurukshetra",
      "Brahma Sarovar"
    ]
  },
  {
    "name": "Kaithal",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "136027"
  },
  {
    "name": "Rewari",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "123401",
    "aliases": [
      "Brass City of Haryana"
    ]
  },
  {
    "name": "Palwal",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "121102"
  },
  {
    "name": "Hansi",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "125033"
  },
  {
    "name": "Narnaul",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "123001",
    "aliases": [
      "Mahendragarh"
    ]
  },
  {
    "name": "Fatehabad",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "125050"
  },
  {
    "name": "Gohana",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "131301"
  },
  {
    "name": "Tohana",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "125120"
  },
  {
    "name": "Jhajjar",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "124103"
  },
  {
    "name": "Charkhi Dadri",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "127306"
  },
  {
    "name": "Nuh",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "122107",
    "aliases": [
      "Mewat"
    ]
  },
  {
    "name": "Manesar",
    "stateName": "Haryana",
    "countryCode": "IN",
    "pincode": "122051",
    "aliases": [
      "IMT Manesar",
      "Maruti Plant"
    ]
  },
  {
    "name": "Thiruvananthapuram",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "695001",
    "aliases": [
      "Trivandrum",
      "Technopark",
      "Padmanabhaswamy",
      "Kowdiar"
    ]
  },
  {
    "name": "Kochi",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "682001",
    "aliases": [
      "Cochin",
      "Ernakulam",
      "Infopark",
      "Kakkanad",
      "Fort Kochi",
      "Marine Drive"
    ]
  },
  {
    "name": "Kozhikode",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "673001",
    "aliases": [
      "Calicut",
      "City of Spices"
    ]
  },
  {
    "name": "Kollam",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "691001",
    "aliases": [
      "Quilon",
      "Cashew Capital"
    ]
  },
  {
    "name": "Thrissur",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "680001",
    "aliases": [
      "Trichur",
      "Cultural Capital of Kerala",
      "Thrissur Pooram"
    ]
  },
  {
    "name": "Kannur",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "670001",
    "aliases": [
      "Cannanore",
      "Land of Looms and Lores"
    ]
  },
  {
    "name": "Alappuzha",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "688001",
    "aliases": [
      "Alleppey",
      "Venice of the East",
      "Houseboat Capital"
    ]
  },
  {
    "name": "Kottayam",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "686001",
    "aliases": [
      "Akshara Nagari",
      "Rubber Capital"
    ]
  },
  {
    "name": "Palakkad",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "678001",
    "aliases": [
      "Palghat",
      "Gateway of Kerala"
    ]
  },
  {
    "name": "Manjeri",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "676121"
  },
  {
    "name": "Thalassery",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "670101",
    "aliases": [
      "Tellicherry",
      "Circus & Cricket City"
    ]
  },
  {
    "name": "Ponnani",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "679577"
  },
  {
    "name": "Vatakara",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "673101",
    "aliases": [
      "Badagara"
    ]
  },
  {
    "name": "Kanhangad",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "671315"
  },
  {
    "name": "Payyanur",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "670307"
  },
  {
    "name": "Koyilandy",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "673305",
    "aliases": [
      "Quilandy"
    ]
  },
  {
    "name": "Neyyattinkara",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "695121"
  },
  {
    "name": "Kayamkulam",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "690502"
  },
  {
    "name": "Nedumangad",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "695541"
  },
  {
    "name": "Malappuram",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "676505"
  },
  {
    "name": "Kasaragod",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "671121",
    "aliases": [
      "Bekal Fort"
    ]
  },
  {
    "name": "Kalpetta",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "673121",
    "aliases": [
      "Wayanad"
    ]
  },
  {
    "name": "Painavu",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "685603",
    "aliases": [
      "Idukki",
      "Munnar"
    ]
  },
  {
    "name": "Pathanamthitta",
    "stateName": "Kerala",
    "countryCode": "IN",
    "pincode": "689645",
    "aliases": [
      "Sabarimala"
    ]
  },
  {
    "name": "Bhubaneswar",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "751001",
    "aliases": [
      "Temple City Bhubaneswar",
      "Infocity",
      "Chandrasekharpur"
    ]
  },
  {
    "name": "Cuttack",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "753001",
    "aliases": [
      "Silver City",
      "Millennium City Cuttack"
    ]
  },
  {
    "name": "Rourkela",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "769001",
    "aliases": [
      "Steel City Rourkela",
      "NIT Rourkela"
    ]
  },
  {
    "name": "Berhampur",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "760001",
    "aliases": [
      "Brahmapur",
      "Silk City Berhampur",
      "Ganjam"
    ]
  },
  {
    "name": "Sambalpur",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "768001",
    "aliases": [
      "Hirakud",
      "Sambalpuri Saree"
    ]
  },
  {
    "name": "Puri",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "752001",
    "aliases": [
      "Jagannath Puri",
      "Golden Beach"
    ]
  },
  {
    "name": "Balasore",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "756001",
    "aliases": [
      "Baleshwar",
      "Chandipur"
    ]
  },
  {
    "name": "Bhadrak",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "756100"
  },
  {
    "name": "Baripada",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "757001",
    "aliases": [
      "Mayurbhanj",
      "Simlipal"
    ]
  },
  {
    "name": "Jharsuguda",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "768201",
    "aliases": [
      "Powerhouse of Odisha"
    ]
  },
  {
    "name": "Jeypore",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "764001"
  },
  {
    "name": "Bargarh",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "768028",
    "aliases": [
      "Dhanu Jatra"
    ]
  },
  {
    "name": "Rayagada",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "765001"
  },
  {
    "name": "Balangir",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "767001",
    "aliases": [
      "Bolangir"
    ]
  },
  {
    "name": "Bhawanipatna",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "766001",
    "aliases": [
      "Kalahandi"
    ]
  },
  {
    "name": "Dhenkanal",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "759001"
  },
  {
    "name": "Barbil",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "758035",
    "aliases": [
      "Iron Ore City"
    ]
  },
  {
    "name": "Kendujhar",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "758001",
    "aliases": [
      "Keonjhar"
    ]
  },
  {
    "name": "Paradip",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "754142",
    "aliases": [
      "Port City Paradip",
      "Jagatsinghpur"
    ]
  },
  {
    "name": "Angul",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "759122",
    "aliases": [
      "NALCO Angul"
    ]
  },
  {
    "name": "Koraput",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "764020",
    "aliases": [
      "HAL Sunabeda"
    ]
  },
  {
    "name": "Kendrapara",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "754211",
    "aliases": [
      "Bhitarkanika"
    ]
  },
  {
    "name": "Jajpur",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "755001",
    "aliases": [
      "Jajpur Road",
      "Kalinganagar"
    ]
  },
  {
    "name": "Khordha",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "752055",
    "aliases": [
      "Khurda"
    ]
  },
  {
    "name": "Nayagarh",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "752069"
  },
  {
    "name": "Malkangiri",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "764045"
  },
  {
    "name": "Nabarangpur",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "764059"
  },
  {
    "name": "Nuapada",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "766105"
  },
  {
    "name": "Subarnapur",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "767017",
    "aliases": [
      "Sonepur"
    ]
  },
  {
    "name": "Boudh",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "762014"
  },
  {
    "name": "Kandhamal",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "762001",
    "aliases": [
      "Phulbani",
      "Daringbadi"
    ]
  },
  {
    "name": "Gajapati",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "761200",
    "aliases": [
      "Paralakhemundi"
    ]
  },
  {
    "name": "Deogarh",
    "stateName": "Odisha",
    "countryCode": "IN",
    "pincode": "768108",
    "aliases": [
      "Debagarh"
    ]
  },
  {
    "name": "Ranchi",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "834001",
    "aliases": [
      "City of Waterfalls",
      "Doranda",
      "Morabadi",
      "Hatia"
    ]
  },
  {
    "name": "Jamshedpur",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "831001",
    "aliases": [
      "Tatanagar",
      "Steel City",
      "Bistupur",
      "Sakchi",
      "Kadma",
      "East Singhbhum"
    ]
  },
  {
    "name": "Dhanbad",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "826001",
    "aliases": [
      "Coal Capital of India",
      "IIT ISM"
    ]
  },
  {
    "name": "Bokaro Steel City",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "827001",
    "aliases": [
      "Bokaro",
      "BSL"
    ]
  },
  {
    "name": "Deoghar",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "814112",
    "aliases": [
      "Baidyanath Dham",
      "Baba Dham"
    ]
  },
  {
    "name": "Phusro",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "829144"
  },
  {
    "name": "Hazaribagh",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "825301",
    "aliases": [
      "City of Thousand Gardens"
    ]
  },
  {
    "name": "Giridih",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "815301",
    "aliases": [
      "Parasnath"
    ]
  },
  {
    "name": "Ramgarh",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "829122",
    "aliases": [
      "Ramgarh Cantt"
    ]
  },
  {
    "name": "Medininagar",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "822101",
    "aliases": [
      "Daltonganj",
      "Palamu"
    ]
  },
  {
    "name": "Chirkunda",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "828202"
  },
  {
    "name": "Chaibasa",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "833201",
    "aliases": [
      "West Singhbhum"
    ]
  },
  {
    "name": "Gumla",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "835207"
  },
  {
    "name": "Dumka",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "814101",
    "aliases": [
      "Sub-capital of Jharkhand",
      "Santhal Pargana"
    ]
  },
  {
    "name": "Godda",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "814133",
    "aliases": [
      "Adani Power Godda"
    ]
  },
  {
    "name": "Sahibganj",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "816109",
    "aliases": [
      "Ganga Port Sahibganj"
    ]
  },
  {
    "name": "Pakur",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "816107"
  },
  {
    "name": "Jamtara",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "815351"
  },
  {
    "name": "Simdega",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "835223",
    "aliases": [
      "Cradle of Hockey"
    ]
  },
  {
    "name": "Latehar",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "829206",
    "aliases": [
      "Betla National Park",
      "Netarhat"
    ]
  },
  {
    "name": "Koderma",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "825410",
    "aliases": [
      "Mica Capital",
      "Jhumri Telaiya"
    ]
  },
  {
    "name": "Chatra",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "825401"
  },
  {
    "name": "Garhwa",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "822114"
  },
  {
    "name": "Khunti",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "835210",
    "aliases": [
      "Birsa Munda Land"
    ]
  },
  {
    "name": "Saraikela",
    "stateName": "Jharkhand",
    "countryCode": "IN",
    "pincode": "833219",
    "aliases": [
      "Seraikela Kharsawan",
      "Chhau Dance"
    ]
  },
  {
    "name": "Raipur",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "492001",
    "aliases": [
      "Capital Raipur",
      "Naya Raipur",
      "Atal Nagar",
      "Telibandha"
    ]
  },
  {
    "name": "Bhilai",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "490001",
    "aliases": [
      "Steel City Bhilai",
      "Bhilai Nagar",
      "Sector 6 Bhilai"
    ]
  },
  {
    "name": "Bilaspur",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "495001",
    "aliases": [
      "Bilaspur CG",
      "Nyayadhani",
      "High Court CG"
    ]
  },
  {
    "name": "Korba",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "495677",
    "aliases": [
      "Power Capital of CG",
      "NTPC Korba",
      "BALCO"
    ]
  },
  {
    "name": "Rajnandgaon",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "491441",
    "aliases": [
      "Sanskar Dhani"
    ]
  },
  {
    "name": "Jagdalpur",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "494001",
    "aliases": [
      "Bastar",
      "Chitrakote Falls"
    ]
  },
  {
    "name": "Raigarh",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "496001",
    "aliases": [
      "Cultural Capital of CG",
      "Jindal Steel"
    ]
  },
  {
    "name": "Ambikapur",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "497001",
    "aliases": [
      "Surguja",
      "Mainpat"
    ]
  },
  {
    "name": "Dhamtari",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "493773"
  },
  {
    "name": "Mahasamund",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "493445",
    "aliases": [
      "Sirpur"
    ]
  },
  {
    "name": "Durg",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "491001",
    "aliases": [
      "Twin City Durg-Bhilai"
    ]
  },
  {
    "name": "Chirmiri",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "497449",
    "aliases": [
      "Koriya"
    ]
  },
  {
    "name": "Bhatapara",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "493118",
    "aliases": [
      "Baloda Bazar"
    ]
  },
  {
    "name": "Kanker",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "494334",
    "aliases": [
      "North Bastar"
    ]
  },
  {
    "name": "Kawardha",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "491995",
    "aliases": [
      "Kabirdham",
      "Bhoramdeo"
    ]
  },
  {
    "name": "Janjgir",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "495668",
    "aliases": [
      "Janjgir-Champa"
    ]
  },
  {
    "name": "Champa",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "495671",
    "aliases": [
      "Kosa Silk Hub"
    ]
  },
  {
    "name": "Kondagaon",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "494226",
    "aliases": [
      "Bell Metal Craft"
    ]
  },
  {
    "name": "Balod",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "491226"
  },
  {
    "name": "Bemetara",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "491335"
  },
  {
    "name": "Mungeli",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "495334"
  },
  {
    "name": "Dantewada",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "494449",
    "aliases": [
      "South Bastar",
      "Danteshwari Temple"
    ]
  },
  {
    "name": "Sukma",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "494111"
  },
  {
    "name": "Bijapur",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "494444",
    "aliases": [
      "Bijapur CG"
    ]
  },
  {
    "name": "Narayanpur",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "494661"
  },
  {
    "name": "Jashpur",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "496331",
    "aliases": [
      "Jashpur Nagar"
    ]
  },
  {
    "name": "Balrampur",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "497119",
    "aliases": [
      "Balrampur CG",
      "Tatapani"
    ]
  },
  {
    "name": "Surajpur",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "497229"
  },
  {
    "name": "Gariaband",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "493889"
  },
  {
    "name": "Gaurela-Pendra-Marwahi",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "495119"
  },
  {
    "name": "Khairagarh",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "491444",
    "aliases": [
      "Music University"
    ]
  },
  {
    "name": "Manendragarh",
    "stateName": "Chhattisgarh",
    "countryCode": "IN",
    "pincode": "497442"
  },
  {
    "name": "Guwahati",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "781001",
    "aliases": [
      "Gauhati",
      "Dispur",
      "Kamrup Metropolitan",
      "Paltan Bazaar",
      "GS Road",
      "Khanapara",
      "Kamakhya"
    ]
  },
  {
    "name": "Silchar",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "788001",
    "aliases": [
      "Barak Valley Hub",
      "Cachar"
    ]
  },
  {
    "name": "Dibrugarh",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "786001",
    "aliases": [
      "Tea City of India",
      "Bogibeel"
    ]
  },
  {
    "name": "Jorhat",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "785001",
    "aliases": [
      "Cultural Capital of Assam",
      "Tocklai"
    ]
  },
  {
    "name": "Nagaon",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "782001",
    "aliases": [
      "Nowgong"
    ]
  },
  {
    "name": "Tinsukia",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "786125",
    "aliases": [
      "Commercial Hub of Upper Assam",
      "Digboi link"
    ]
  },
  {
    "name": "Tezpur",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "784001",
    "aliases": [
      "City of Eternal Romance",
      "Sonitpur"
    ]
  },
  {
    "name": "Bongaigaon",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "783380",
    "aliases": [
      "Refinery Hub"
    ]
  },
  {
    "name": "Karimganj",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "788710"
  },
  {
    "name": "Sivasagar",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "785640",
    "aliases": [
      "Sibsagar",
      "Ahom Kingdom Capital"
    ]
  },
  {
    "name": "Goalpara",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "783101"
  },
  {
    "name": "Dhubri",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "783301"
  },
  {
    "name": "North Lakhimpur",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "787001",
    "aliases": [
      "Lakhimpur"
    ]
  },
  {
    "name": "Mangaldoi",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "784125",
    "aliases": [
      "Darrang"
    ]
  },
  {
    "name": "Diphu",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "782460",
    "aliases": [
      "Karbi Anglong"
    ]
  },
  {
    "name": "Haflong",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "788819",
    "aliases": [
      "Dima Hasao",
      "Only Hill Station of Assam"
    ]
  },
  {
    "name": "Barpeta",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "781301",
    "aliases": [
      "Satra City"
    ]
  },
  {
    "name": "Golaghat",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "785621",
    "aliases": [
      "Kaziranga Gateway",
      "Numaligarh"
    ]
  },
  {
    "name": "Dhemaji",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "787057"
  },
  {
    "name": "Kokrajhar",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "783370",
    "aliases": [
      "BTR Headquarters"
    ]
  },
  {
    "name": "Nalbari",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "781335"
  },
  {
    "name": "Morigaon",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "782105"
  },
  {
    "name": "Hailakandi",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "788151"
  },
  {
    "name": "Hojai",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "782435"
  },
  {
    "name": "Majuli",
    "stateName": "Assam",
    "countryCode": "IN",
    "pincode": "785104",
    "aliases": [
      "World Largest River Island",
      "Garamur"
    ]
  },
  {
    "name": "Shimla",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "171001",
    "aliases": [
      "Simla",
      "Mall Road Shimla",
      "Kufri",
      "Summer Hill"
    ]
  },
  {
    "name": "Dharamshala",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "176215",
    "aliases": [
      "McLeod Ganj",
      "Kangra",
      "Cricket Stadium HPCA"
    ]
  },
  {
    "name": "Solan",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "173212",
    "aliases": [
      "Mushroom City of India"
    ]
  },
  {
    "name": "Mandi",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "175001",
    "aliases": [
      "Chhoti Kashi"
    ]
  },
  {
    "name": "Kullu",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "175101",
    "aliases": [
      "Valley of Gods"
    ]
  },
  {
    "name": "Manali",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "175131",
    "aliases": [
      "Rohtang Pass Gateway",
      "Solang Valley",
      "Atal Tunnel"
    ]
  },
  {
    "name": "Baddi",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "173205",
    "aliases": [
      "Pharma Capital of Asia",
      "Barotiwala"
    ]
  },
  {
    "name": "Bilaspur",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "174001",
    "aliases": [
      "Bilaspur HP",
      "Gobind Sagar"
    ]
  },
  {
    "name": "Chamba",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "176310",
    "aliases": [
      "Dalhousie link"
    ]
  },
  {
    "name": "Hamirpur",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "177001",
    "aliases": [
      "Hamirpur HP",
      "NIT Hamirpur"
    ]
  },
  {
    "name": "Nahan",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "173001",
    "aliases": [
      "Sirmaur",
      "Renuka Ji"
    ]
  },
  {
    "name": "Una",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "174303",
    "aliases": [
      "Chintpurni"
    ]
  },
  {
    "name": "Paonta Sahib",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "173025",
    "aliases": [
      "Industrial Hub Paonta"
    ]
  },
  {
    "name": "Kangra",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "176001",
    "aliases": [
      "Brajeshwari Temple"
    ]
  },
  {
    "name": "Palampur",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "176061",
    "aliases": [
      "Tea Capital of North India"
    ]
  },
  {
    "name": "Sundernagar",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "175019"
  },
  {
    "name": "Parwanoo",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "173220",
    "aliases": [
      "Timber Trail"
    ]
  },
  {
    "name": "Nalagarh",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "174101"
  },
  {
    "name": "Keylong",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "175132",
    "aliases": [
      "Lahaul and Spiti"
    ]
  },
  {
    "name": "Reckong Peo",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "172107",
    "aliases": [
      "Kinnaur",
      "Kalpa"
    ]
  },
  {
    "name": "Dalhousie",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "176304",
    "aliases": [
      "Khajjiar"
    ]
  },
  {
    "name": "Kasauli",
    "stateName": "Himachal Pradesh",
    "countryCode": "IN",
    "pincode": "173204"
  },
  {
    "name": "Dehradun",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "248001",
    "aliases": [
      "Dehra Doon",
      "Rajpur Road",
      "Clock Tower Dehradun",
      "IMA"
    ]
  },
  {
    "name": "Haridwar",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "249401",
    "aliases": [
      "Hardwar",
      "Har Ki Pauri",
      "SIDCUL Haridwar",
      "BHEL Haridwar"
    ]
  },
  {
    "name": "Roorkee",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "247667",
    "aliases": [
      "IIT Roorkee"
    ]
  },
  {
    "name": "Haldwani",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "263139",
    "aliases": [
      "Haldwani-Kathgodam",
      "Gateway to Kumaon"
    ]
  },
  {
    "name": "Rudrapur",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "263153",
    "aliases": [
      "Udham Singh Nagar",
      "SIDCUL Pantnagar"
    ]
  },
  {
    "name": "Kashipur",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "244713",
    "aliases": [
      "IIM Kashipur"
    ]
  },
  {
    "name": "Rishikesh",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "249201",
    "aliases": [
      "Yoga Capital of the World",
      "Laxman Jhula",
      "AIIMS Rishikesh"
    ]
  },
  {
    "name": "Nainital",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "263001",
    "aliases": [
      "City of Lakes Uttarakhand",
      "Mallital",
      "Tallital"
    ]
  },
  {
    "name": "Mussoorie",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "248179",
    "aliases": [
      "Queen of the Hills",
      "Kempty Falls"
    ]
  },
  {
    "name": "Pantnagar",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "263145",
    "aliases": [
      "Agricultural University"
    ]
  },
  {
    "name": "Pithoragarh",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "262501",
    "aliases": [
      "Little Kashmir"
    ]
  },
  {
    "name": "Almora",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "263601",
    "aliases": [
      "Cultural Hub of Kumaon"
    ]
  },
  {
    "name": "Kotdwar",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "246149",
    "aliases": [
      "Pauri Garhwal Gateway"
    ]
  },
  {
    "name": "Ramnagar",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "244715",
    "aliases": [
      "Jim Corbett National Park"
    ]
  },
  {
    "name": "New Tehri",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "249001",
    "aliases": [
      "Tehri Dam"
    ]
  },
  {
    "name": "Gopeshwar",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "246401",
    "aliases": [
      "Chamoli",
      "Badrinath link"
    ]
  },
  {
    "name": "Uttarkashi",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "249193",
    "aliases": [
      "Gangotri",
      "Yamunotri link"
    ]
  },
  {
    "name": "Rudraprayag",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "246171",
    "aliases": [
      "Kedarnath gateway"
    ]
  },
  {
    "name": "Champawat",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "262523"
  },
  {
    "name": "Bageshwar",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "263642"
  },
  {
    "name": "Ranikhet",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "263645",
    "aliases": [
      "Kumaon Regimental Centre"
    ]
  },
  {
    "name": "Vikas Nagar",
    "stateName": "Uttarakhand",
    "countryCode": "IN",
    "pincode": "248198"
  },
  {
    "name": "Panaji",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403001",
    "aliases": [
      "Panjim",
      "Capital of Goa",
      "North Goa Headquarters",
      "Miramar",
      "Fontainhas"
    ]
  },
  {
    "name": "Margao",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403601",
    "aliases": [
      "Madgaon",
      "Commercial Capital of Goa",
      "South Goa Headquarters"
    ]
  },
  {
    "name": "Vasco da Gama",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403802",
    "aliases": [
      "Mormugao",
      "Dabolim Airport",
      "Vasco"
    ]
  },
  {
    "name": "Mapusa",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403507",
    "aliases": [
      "Friday Market Mapusa"
    ]
  },
  {
    "name": "Ponda",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403401",
    "aliases": [
      "Temple Town of Goa"
    ]
  },
  {
    "name": "Bicholim",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403504"
  },
  {
    "name": "Curchorem",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403706",
    "aliases": [
      "Sanvordem"
    ]
  },
  {
    "name": "Canacona",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403702",
    "aliases": [
      "Palolem Beach"
    ]
  },
  {
    "name": "Pernem",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403512",
    "aliases": [
      "Mopa Airport",
      "Manohar International Airport"
    ]
  },
  {
    "name": "Valpoi",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403506",
    "aliases": [
      "Sattari"
    ]
  },
  {
    "name": "Cuncolim",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403703"
  },
  {
    "name": "Quepem",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403705"
  },
  {
    "name": "Sanquelim",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403505"
  },
  {
    "name": "Calangute",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403516",
    "aliases": [
      "Queen of Beaches",
      "Baga"
    ]
  },
  {
    "name": "Candolim",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403515",
    "aliases": [
      "Aguada"
    ]
  },
  {
    "name": "Porvorim",
    "stateName": "Goa",
    "countryCode": "IN",
    "pincode": "403521",
    "aliases": [
      "Goa Secretariat"
    ]
  },
  {
    "name": "Srinagar",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "190001",
    "aliases": [
      "Summer Capital J&K",
      "Dal Lake",
      "Lal Chowk",
      "Rajbagh"
    ]
  },
  {
    "name": "Jammu",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "180001",
    "aliases": [
      "Winter Capital J&K",
      "City of Temples",
      "Gandhi Nagar Jammu",
      "Bahu Fort"
    ]
  },
  {
    "name": "Anantnag",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "192101",
    "aliases": [
      "Islamabad Kashmir"
    ]
  },
  {
    "name": "Baramulla",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "193101"
  },
  {
    "name": "Sopore",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "193201",
    "aliases": [
      "Apple Town"
    ]
  },
  {
    "name": "Kathua",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "184101",
    "aliases": [
      "City of Sufis"
    ]
  },
  {
    "name": "Udhampur",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "182101",
    "aliases": [
      "Northern Command Headquarters"
    ]
  },
  {
    "name": "Rajouri",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "185131"
  },
  {
    "name": "Poonch",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "185101"
  },
  {
    "name": "Kupwara",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "193222"
  },
  {
    "name": "Pulwama",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "192301",
    "aliases": [
      "Saffron City",
      "Pampore"
    ]
  },
  {
    "name": "Kulgam",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "192231"
  },
  {
    "name": "Ganderbal",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "191201",
    "aliases": [
      "Sindh Valley",
      "Manasbal"
    ]
  },
  {
    "name": "Budgam",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "191111",
    "aliases": [
      "Badgam"
    ]
  },
  {
    "name": "Bandipora",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "193502",
    "aliases": [
      "Wular Lake"
    ]
  },
  {
    "name": "Samba",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "184121",
    "aliases": [
      "Industrial Samba"
    ]
  },
  {
    "name": "Reasi",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "182311",
    "aliases": [
      "Katra",
      "Vaishno Devi Shrine",
      "Chenab Bridge"
    ]
  },
  {
    "name": "Doda",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "182202"
  },
  {
    "name": "Kishtwar",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "182204",
    "aliases": [
      "Saffron Land"
    ]
  },
  {
    "name": "Ramban",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "182144",
    "aliases": [
      "Banihal"
    ]
  },
  {
    "name": "Shopian",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "192303",
    "aliases": [
      "Apple Bowl"
    ]
  },
  {
    "name": "Pahalgam",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "192126",
    "aliases": [
      "Amarnath Base",
      "Betaab Valley"
    ]
  },
  {
    "name": "Gulmarg",
    "stateName": "Jammu and Kashmir",
    "countryCode": "IN",
    "pincode": "193403",
    "aliases": [
      "Ski Resort",
      "Meadow of Flowers"
    ]
  },
  {
    "name": "Leh",
    "stateName": "Ladakh",
    "countryCode": "IN",
    "pincode": "194101",
    "aliases": [
      "Capital of Ladakh",
      "Pangong Lake gateway",
      "Shanti Stupa"
    ]
  },
  {
    "name": "Kargil",
    "stateName": "Ladakh",
    "countryCode": "IN",
    "pincode": "194103",
    "aliases": [
      "Suru Valley"
    ]
  },
  {
    "name": "Diskit",
    "stateName": "Ladakh",
    "countryCode": "IN",
    "pincode": "194401",
    "aliases": [
      "Nubra Valley",
      "Hunder"
    ]
  },
  {
    "name": "Dras",
    "stateName": "Ladakh",
    "countryCode": "IN",
    "pincode": "194102",
    "aliases": [
      "Gateway to Ladakh",
      "Second Coldest Inhabited Place"
    ]
  },
  {
    "name": "Padum",
    "stateName": "Ladakh",
    "countryCode": "IN",
    "pincode": "194302",
    "aliases": [
      "Zanskar Valley"
    ]
  },
  {
    "name": "Chandigarh",
    "stateName": "Chandigarh",
    "countryCode": "IN",
    "pincode": "160017",
    "aliases": [
      "The City Beautiful",
      "Sector 17",
      "Sukhna Lake",
      "Rock Garden",
      "Tricity"
    ]
  },
  {
    "name": "Puducherry",
    "stateName": "Puducherry",
    "countryCode": "IN",
    "pincode": "605001",
    "aliases": [
      "Pondicherry",
      "White Town",
      "Auroville link",
      "Promenade"
    ]
  },
  {
    "name": "Karaikal",
    "stateName": "Puducherry",
    "countryCode": "IN",
    "pincode": "609602",
    "aliases": [
      "Karaikal Port"
    ]
  },
  {
    "name": "Mahe",
    "stateName": "Puducherry",
    "countryCode": "IN",
    "pincode": "673310"
  },
  {
    "name": "Yanam",
    "stateName": "Puducherry",
    "countryCode": "IN",
    "pincode": "533464"
  },
  {
    "name": "Ozhukarai",
    "stateName": "Puducherry",
    "countryCode": "IN",
    "pincode": "605009",
    "aliases": [
      "Oulgaret"
    ]
  },
  {
    "name": "Silvassa",
    "stateName": "Dadra and Nagar Haveli and Daman and Diu",
    "countryCode": "IN",
    "pincode": "396230",
    "aliases": [
      "Dadra and Nagar Haveli Headquarters"
    ]
  },
  {
    "name": "Daman",
    "stateName": "Dadra and Nagar Haveli and Daman and Diu",
    "countryCode": "IN",
    "pincode": "396210",
    "aliases": [
      "Moti Daman",
      "Nani Daman"
    ]
  },
  {
    "name": "Diu",
    "stateName": "Dadra and Nagar Haveli and Daman and Diu",
    "countryCode": "IN",
    "pincode": "362520",
    "aliases": [
      "Diu Island",
      "Diu Fort",
      "Nagoa Beach"
    ]
  },
  {
    "name": "Amli",
    "stateName": "Dadra and Nagar Haveli and Daman and Diu",
    "countryCode": "IN",
    "pincode": "396230"
  },
  {
    "name": "Naroli",
    "stateName": "Dadra and Nagar Haveli and Daman and Diu",
    "countryCode": "IN",
    "pincode": "396235"
  },
  {
    "name": "Port Blair",
    "stateName": "Andaman and Nicobar Islands",
    "countryCode": "IN",
    "pincode": "744101",
    "aliases": [
      "Sri Vijaya Puram",
      "Cellular Jail",
      "South Andaman"
    ]
  },
  {
    "name": "Garacharma",
    "stateName": "Andaman and Nicobar Islands",
    "countryCode": "IN",
    "pincode": "744105"
  },
  {
    "name": "Bambooflat",
    "stateName": "Andaman and Nicobar Islands",
    "countryCode": "IN",
    "pincode": "744107"
  },
  {
    "name": "Diglipur",
    "stateName": "Andaman and Nicobar Islands",
    "countryCode": "IN",
    "pincode": "744202",
    "aliases": [
      "North Andaman",
      "Saddle Peak"
    ]
  },
  {
    "name": "Mayabunder",
    "stateName": "Andaman and Nicobar Islands",
    "countryCode": "IN",
    "pincode": "744204",
    "aliases": [
      "North and Middle Andaman"
    ]
  },
  {
    "name": "Rangat",
    "stateName": "Andaman and Nicobar Islands",
    "countryCode": "IN",
    "pincode": "744205",
    "aliases": [
      "Middle Andaman"
    ]
  },
  {
    "name": "Car Nicobar",
    "stateName": "Andaman and Nicobar Islands",
    "countryCode": "IN",
    "pincode": "744301",
    "aliases": [
      "Nicobar"
    ]
  },
  {
    "name": "Campbell Bay",
    "stateName": "Andaman and Nicobar Islands",
    "countryCode": "IN",
    "pincode": "744399",
    "aliases": [
      "Great Nicobar",
      "Indira Point"
    ]
  },
  {
    "name": "Kavaratti",
    "stateName": "Lakshadweep",
    "countryCode": "IN",
    "pincode": "682555",
    "aliases": [
      "Capital of Lakshadweep"
    ]
  },
  {
    "name": "Agatti",
    "stateName": "Lakshadweep",
    "countryCode": "IN",
    "pincode": "682553",
    "aliases": [
      "Agatti Airport"
    ]
  },
  {
    "name": "Amini",
    "stateName": "Lakshadweep",
    "countryCode": "IN",
    "pincode": "682552"
  },
  {
    "name": "Andrott",
    "stateName": "Lakshadweep",
    "countryCode": "IN",
    "pincode": "682551"
  },
  {
    "name": "Minicoy",
    "stateName": "Lakshadweep",
    "countryCode": "IN",
    "pincode": "682559",
    "aliases": [
      "Maliku"
    ]
  },
  {
    "name": "Kadmat",
    "stateName": "Lakshadweep",
    "countryCode": "IN",
    "pincode": "682556"
  },
  {
    "name": "Kalpeni",
    "stateName": "Lakshadweep",
    "countryCode": "IN",
    "pincode": "682557"
  },
  {
    "name": "Kiltan",
    "stateName": "Lakshadweep",
    "countryCode": "IN",
    "pincode": "682558"
  },
  {
    "name": "Chetlat",
    "stateName": "Lakshadweep",
    "countryCode": "IN",
    "pincode": "682554"
  },
  {
    "name": "Itanagar",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "791111",
    "aliases": [
      "Capital of Arunachal Pradesh",
      "Papum Pare",
      "Ganga Lake"
    ]
  },
  {
    "name": "Naharlagun",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "791110",
    "aliases": [
      "Naharlagun Railway Station"
    ]
  },
  {
    "name": "Pasighat",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "791102",
    "aliases": [
      "East Siang",
      "Oldest Town"
    ]
  },
  {
    "name": "Tawang",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "790104",
    "aliases": [
      "Tawang Monastery",
      "Sela Pass"
    ]
  },
  {
    "name": "Ziro",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "791120",
    "aliases": [
      "Lower Subansiri",
      "Ziro Valley",
      "Apatani"
    ]
  },
  {
    "name": "Tezu",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "792001",
    "aliases": [
      "Lohit",
      "Parasuram Kund"
    ]
  },
  {
    "name": "Roing",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "792110",
    "aliases": [
      "Lower Dibang Valley",
      "Mayodia"
    ]
  },
  {
    "name": "Namsai",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "792103",
    "aliases": [
      "Golden Pagoda"
    ]
  },
  {
    "name": "Bomdila",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "790001",
    "aliases": [
      "West Kameng"
    ]
  },
  {
    "name": "Aalo",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "791001",
    "aliases": [
      "Along",
      "West Siang"
    ]
  },
  {
    "name": "Changlang",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "792120"
  },
  {
    "name": "Khonsa",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "792169",
    "aliases": [
      "Tirap"
    ]
  },
  {
    "name": "Seppa",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "790102",
    "aliases": [
      "East Kameng"
    ]
  },
  {
    "name": "Daporijo",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "791122",
    "aliases": [
      "Upper Subansiri"
    ]
  },
  {
    "name": "Yingkiong",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "791002",
    "aliases": [
      "Upper Siang"
    ]
  },
  {
    "name": "Anini",
    "stateName": "Arunachal Pradesh",
    "countryCode": "IN",
    "pincode": "792101",
    "aliases": [
      "Dibang Valley"
    ]
  },
  {
    "name": "Imphal",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795001",
    "aliases": [
      "Capital of Manipur",
      "Kangla Fort",
      "Ima Keithel"
    ]
  },
  {
    "name": "Churachandpur",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795128",
    "aliases": [
      "Lamka"
    ]
  },
  {
    "name": "Thoubal",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795138"
  },
  {
    "name": "Kakching",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795103",
    "aliases": [
      "Agricultural Hub"
    ]
  },
  {
    "name": "Ukhrul",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795142",
    "aliases": [
      "Shirui Lily"
    ]
  },
  {
    "name": "Senapati",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795106"
  },
  {
    "name": "Bishnupur",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795126",
    "aliases": [
      "Loktak Lake",
      "Keibul Lamjao"
    ]
  },
  {
    "name": "Chandel",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795127",
    "aliases": [
      "Moreh Border Link"
    ]
  },
  {
    "name": "Tamenglong",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795141",
    "aliases": [
      "Orange Bowl of Manipur"
    ]
  },
  {
    "name": "Jiribam",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795116"
  },
  {
    "name": "Kangpokpi",
    "stateName": "Manipur",
    "countryCode": "IN",
    "pincode": "795129"
  },
  {
    "name": "Shillong",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "793001",
    "aliases": [
      "Scotland of the East",
      "East Khasi Hills",
      "Police Bazar",
      "Laitumkhrah"
    ]
  },
  {
    "name": "Tura",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "794001",
    "aliases": [
      "West Garo Hills",
      "Nokrek"
    ]
  },
  {
    "name": "Jowai",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "793150",
    "aliases": [
      "West Jaintia Hills"
    ]
  },
  {
    "name": "Nongpoh",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "793102",
    "aliases": [
      "Ri-Bhoi"
    ]
  },
  {
    "name": "Sohra",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "793108",
    "aliases": [
      "Cherrapunji",
      "Nohkalikai Falls",
      "Living Root Bridges"
    ]
  },
  {
    "name": "Williamnagar",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "794111",
    "aliases": [
      "East Garo Hills"
    ]
  },
  {
    "name": "Baghmara",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "794102",
    "aliases": [
      "South Garo Hills"
    ]
  },
  {
    "name": "Resubelpara",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "794108",
    "aliases": [
      "North Garo Hills"
    ]
  },
  {
    "name": "Nongstoin",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "793119",
    "aliases": [
      "West Khasi Hills"
    ]
  },
  {
    "name": "Khliehriat",
    "stateName": "Meghalaya",
    "countryCode": "IN",
    "pincode": "793200",
    "aliases": [
      "East Jaintia Hills"
    ]
  },
  {
    "name": "Aizawl",
    "stateName": "Mizoram",
    "countryCode": "IN",
    "pincode": "796001",
    "aliases": [
      "Capital of Mizoram",
      "Durtlang",
      "Bara Bazar Aizawl"
    ]
  },
  {
    "name": "Lunglei",
    "stateName": "Mizoram",
    "countryCode": "IN",
    "pincode": "796701",
    "aliases": [
      "Bridge of Rock"
    ]
  },
  {
    "name": "Champhai",
    "stateName": "Mizoram",
    "countryCode": "IN",
    "pincode": "796321",
    "aliases": [
      "Rice Bowl of Mizoram",
      "Zokhawthar Border"
    ]
  },
  {
    "name": "Serchhip",
    "stateName": "Mizoram",
    "countryCode": "IN",
    "pincode": "796181",
    "aliases": [
      "Thenzawl"
    ]
  },
  {
    "name": "Kolasib",
    "stateName": "Mizoram",
    "countryCode": "IN",
    "pincode": "796081",
    "aliases": [
      "Bairabi Link"
    ]
  },
  {
    "name": "Lawngtlai",
    "stateName": "Mizoram",
    "countryCode": "IN",
    "pincode": "796891"
  },
  {
    "name": "Siaha",
    "stateName": "Mizoram",
    "countryCode": "IN",
    "pincode": "796901",
    "aliases": [
      "Saiha",
      "Mara Autonomous District"
    ]
  },
  {
    "name": "Mamit",
    "stateName": "Mizoram",
    "countryCode": "IN",
    "pincode": "796441",
    "aliases": [
      "Dampa Tiger Reserve"
    ]
  },
  {
    "name": "Kohima",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "797001",
    "aliases": [
      "Capital of Nagaland",
      "Hornbill Festival",
      "Kisama",
      "Dzukou Valley"
    ]
  },
  {
    "name": "Dimapur",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "797112",
    "aliases": [
      "Commercial Hub of Nagaland",
      "Chumoukedima link"
    ]
  },
  {
    "name": "Mokokchung",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "798601",
    "aliases": [
      "Cultural Center of Ao Nagas"
    ]
  },
  {
    "name": "Tuensang",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "798612"
  },
  {
    "name": "Wokha",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "797111",
    "aliases": [
      "Land of Lothas",
      "Doyang"
    ]
  },
  {
    "name": "Zunheboto",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "798620",
    "aliases": [
      "Land of Sumis"
    ]
  },
  {
    "name": "Mon",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "798621",
    "aliases": [
      "Land of Konyaks",
      "Longwa"
    ]
  },
  {
    "name": "Phek",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "797107"
  },
  {
    "name": "Kiphire",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "798611",
    "aliases": [
      "Mount Saramati"
    ]
  },
  {
    "name": "Chumoukedima",
    "stateName": "Nagaland",
    "countryCode": "IN",
    "pincode": "797103"
  },
  {
    "name": "Gangtok",
    "stateName": "Sikkim",
    "countryCode": "IN",
    "pincode": "737101",
    "aliases": [
      "Capital of Sikkim",
      "MG Marg Gangtok",
      "East Sikkim",
      "Rumtek"
    ]
  },
  {
    "name": "Namchi",
    "stateName": "Sikkim",
    "countryCode": "IN",
    "pincode": "737126",
    "aliases": [
      "South Sikkim",
      "Char Dham Namchi",
      "Samdruptse"
    ]
  },
  {
    "name": "Geyzing",
    "stateName": "Sikkim",
    "countryCode": "IN",
    "pincode": "737111",
    "aliases": [
      "Gyalshing",
      "West Sikkim",
      "Pelling",
      "Yuksom"
    ]
  },
  {
    "name": "Mangan",
    "stateName": "Sikkim",
    "countryCode": "IN",
    "pincode": "737116",
    "aliases": [
      "North Sikkim",
      "Lachung",
      "Lachen",
      "Yumthang"
    ]
  },
  {
    "name": "Rangpo",
    "stateName": "Sikkim",
    "countryCode": "IN",
    "pincode": "737132",
    "aliases": [
      "Gateway to Sikkim",
      "Pharma Hub Sikkim"
    ]
  },
  {
    "name": "Singtam",
    "stateName": "Sikkim",
    "countryCode": "IN",
    "pincode": "737134"
  },
  {
    "name": "Jorethang",
    "stateName": "Sikkim",
    "countryCode": "IN",
    "pincode": "737121"
  },
  {
    "name": "Ravangla",
    "stateName": "Sikkim",
    "countryCode": "IN",
    "pincode": "737139",
    "aliases": [
      "Buddha Park"
    ]
  },
  {
    "name": "Pakyong",
    "stateName": "Sikkim",
    "countryCode": "IN",
    "pincode": "737106",
    "aliases": [
      "Pakyong Airport"
    ]
  },
  {
    "name": "Agartala",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799001",
    "aliases": [
      "Capital of Tripura",
      "Ujjayanta Palace",
      "West Tripura"
    ]
  },
  {
    "name": "Dharmanagar",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799250",
    "aliases": [
      "North Tripura"
    ]
  },
  {
    "name": "Udaipur",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799120",
    "aliases": [
      "Udaipur Tripura",
      "Gomati",
      "Tripura Sundari Temple"
    ]
  },
  {
    "name": "Kailashahar",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799277",
    "aliases": [
      "Unakoti"
    ]
  },
  {
    "name": "Belonia",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799155",
    "aliases": [
      "South Tripura"
    ]
  },
  {
    "name": "Khowai",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799201"
  },
  {
    "name": "Teliamura",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799205"
  },
  {
    "name": "Ambassa",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799289",
    "aliases": [
      "Dhalai"
    ]
  },
  {
    "name": "Sabroom",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799145",
    "aliases": [
      "Maitri Setu"
    ]
  },
  {
    "name": "Melaghar",
    "stateName": "Tripura",
    "countryCode": "IN",
    "pincode": "799115",
    "aliases": [
      "Neermahal",
      "Sepahijala"
    ]
  },
  {
    "name": "New York",
    "stateName": "New York",
    "countryCode": "US",
    "pincode": "10001",
    "aliases": [
      "NYC",
      "Manhattan",
      "Brooklyn",
      "Queens"
    ]
  },
  {
    "name": "Los Angeles",
    "stateName": "California",
    "countryCode": "US",
    "pincode": "90001",
    "aliases": [
      "LA",
      "Hollywood",
      "Beverly Hills"
    ]
  },
  {
    "name": "Chicago",
    "stateName": "Illinois",
    "countryCode": "US",
    "pincode": "60601",
    "aliases": [
      "Windy City"
    ]
  },
  {
    "name": "Houston",
    "stateName": "Texas",
    "countryCode": "US",
    "pincode": "77001",
    "aliases": [
      "Space City"
    ]
  },
  {
    "name": "Phoenix",
    "stateName": "Arizona",
    "countryCode": "US",
    "pincode": "85001",
    "aliases": [
      "Valley of the Sun"
    ]
  },
  {
    "name": "Philadelphia",
    "stateName": "Pennsylvania",
    "countryCode": "US",
    "pincode": "19101",
    "aliases": [
      "Philly"
    ]
  },
  {
    "name": "San Antonio",
    "stateName": "Texas",
    "countryCode": "US",
    "pincode": "78201",
    "aliases": [
      "Alamo City"
    ]
  },
  {
    "name": "San Diego",
    "stateName": "California",
    "countryCode": "US",
    "pincode": "92101"
  },
  {
    "name": "Dallas",
    "stateName": "Texas",
    "countryCode": "US",
    "pincode": "75201",
    "aliases": [
      "DFW"
    ]
  },
  {
    "name": "San Jose",
    "stateName": "California",
    "countryCode": "US",
    "pincode": "95101",
    "aliases": [
      "Silicon Valley"
    ]
  },
  {
    "name": "Austin",
    "stateName": "Texas",
    "countryCode": "US",
    "pincode": "78701",
    "aliases": [
      "Silicon Hills"
    ]
  },
  {
    "name": "San Francisco",
    "stateName": "California",
    "countryCode": "US",
    "pincode": "94102",
    "aliases": [
      "SF",
      "Bay Area"
    ]
  },
  {
    "name": "Seattle",
    "stateName": "Washington",
    "countryCode": "US",
    "pincode": "98101",
    "aliases": [
      "Emerald City"
    ]
  },
  {
    "name": "Denver",
    "stateName": "Colorado",
    "countryCode": "US",
    "pincode": "80202",
    "aliases": [
      "Mile High City"
    ]
  },
  {
    "name": "Boston",
    "stateName": "Massachusetts",
    "countryCode": "US",
    "pincode": "02108",
    "aliases": [
      "Beantown",
      "Cambridge"
    ]
  },
  {
    "name": "Washington",
    "stateName": "District of Columbia",
    "countryCode": "US",
    "pincode": "20001",
    "aliases": [
      "Washington DC",
      "DC"
    ]
  },
  {
    "name": "Miami",
    "stateName": "Florida",
    "countryCode": "US",
    "pincode": "33101",
    "aliases": [
      "South Beach"
    ]
  },
  {
    "name": "Atlanta",
    "stateName": "Georgia",
    "countryCode": "US",
    "pincode": "30301",
    "aliases": [
      "ATL"
    ]
  },
  {
    "name": "Dubai",
    "stateName": "Dubai",
    "countryCode": "AE",
    "pincode": "00000",
    "aliases": [
      "DXB",
      "Downtown Dubai",
      "Deira",
      "JBR",
      "Dubai Marina",
      "Business Bay"
    ]
  },
  {
    "name": "Abu Dhabi",
    "stateName": "Abu Dhabi",
    "countryCode": "AE",
    "pincode": "00000",
    "aliases": [
      "AUH",
      "Capital of UAE",
      "Yas Island",
      "Corniche"
    ]
  },
  {
    "name": "Sharjah",
    "stateName": "Sharjah",
    "countryCode": "AE",
    "pincode": "00000",
    "aliases": [
      "SHJ",
      "Cultural Capital of Arab World"
    ]
  },
  {
    "name": "Al Ain",
    "stateName": "Abu Dhabi",
    "countryCode": "AE",
    "pincode": "00000",
    "aliases": [
      "Garden City of UAE"
    ]
  },
  {
    "name": "Ajman",
    "stateName": "Ajman",
    "countryCode": "AE",
    "pincode": "00000",
    "aliases": [
      "AJM"
    ]
  },
  {
    "name": "Ras Al Khaimah",
    "stateName": "Ras Al Khaimah",
    "countryCode": "AE",
    "pincode": "00000",
    "aliases": [
      "RAK",
      "Jebel Jais"
    ]
  },
  {
    "name": "Fujairah",
    "stateName": "Fujairah",
    "countryCode": "AE",
    "pincode": "00000",
    "aliases": [
      "FUJ",
      "Port of Fujairah"
    ]
  },
  {
    "name": "Umm Al Quwain",
    "stateName": "Umm Al Quwain",
    "countryCode": "AE",
    "pincode": "00000",
    "aliases": [
      "UAQ"
    ]
  },
  {
    "name": "London",
    "stateName": "England",
    "countryCode": "GB",
    "pincode": "EC1A 1BB",
    "aliases": [
      "City of London",
      "Westminster",
      "Canary Wharf"
    ]
  },
  {
    "name": "Manchester",
    "stateName": "England",
    "countryCode": "GB",
    "pincode": "M1 1AD",
    "aliases": [
      "Greater Manchester"
    ]
  },
  {
    "name": "Birmingham",
    "stateName": "England",
    "countryCode": "GB",
    "pincode": "B1 1AA",
    "aliases": [
      "West Midlands"
    ]
  },
  {
    "name": "Leeds",
    "stateName": "England",
    "countryCode": "GB",
    "pincode": "LS1 1UR",
    "aliases": [
      "Yorkshire"
    ]
  },
  {
    "name": "Glasgow",
    "stateName": "Scotland",
    "countryCode": "GB",
    "pincode": "G1 1XQ"
  },
  {
    "name": "Edinburgh",
    "stateName": "Scotland",
    "countryCode": "GB",
    "pincode": "EH1 1YZ",
    "aliases": [
      "Capital of Scotland"
    ]
  },
  {
    "name": "Liverpool",
    "stateName": "England",
    "countryCode": "GB",
    "pincode": "L1 8JQ",
    "aliases": [
      "Merseyside"
    ]
  },
  {
    "name": "Bristol",
    "stateName": "England",
    "countryCode": "GB",
    "pincode": "BS1 2BD"
  },
  {
    "name": "Belfast",
    "stateName": "Northern Ireland",
    "countryCode": "GB",
    "pincode": "BT1 5GS",
    "aliases": [
      "Capital of Northern Ireland"
    ]
  },
  {
    "name": "Cardiff",
    "stateName": "Wales",
    "countryCode": "GB",
    "pincode": "CF10 1EP",
    "aliases": [
      "Capital of Wales"
    ]
  },
  {
    "name": "Toronto",
    "stateName": "Ontario",
    "countryCode": "CA",
    "pincode": "M5H 2N2",
    "aliases": [
      "GTA",
      "Downtown Toronto"
    ]
  },
  {
    "name": "Montreal",
    "stateName": "Quebec",
    "countryCode": "CA",
    "pincode": "H2Y 1C6",
    "aliases": [
      "Montr\u00e9al"
    ]
  },
  {
    "name": "Vancouver",
    "stateName": "British Columbia",
    "countryCode": "CA",
    "pincode": "V6B 1A1",
    "aliases": [
      "Metro Vancouver"
    ]
  },
  {
    "name": "Calgary",
    "stateName": "Alberta",
    "countryCode": "CA",
    "pincode": "T2P 1J9"
  },
  {
    "name": "Ottawa",
    "stateName": "Ontario",
    "countryCode": "CA",
    "pincode": "K1P 1J1",
    "aliases": [
      "Capital of Canada",
      "National Capital Region"
    ]
  },
  {
    "name": "Edmonton",
    "stateName": "Alberta",
    "countryCode": "CA",
    "pincode": "T5J 0N3"
  },
  {
    "name": "Mississauga",
    "stateName": "Ontario",
    "countryCode": "CA",
    "pincode": "L5B 1M3",
    "aliases": [
      "Toronto Pearson Hub"
    ]
  },
  {
    "name": "Winnipeg",
    "stateName": "Manitoba",
    "countryCode": "CA",
    "pincode": "R3C 1A5"
  },
  {
    "name": "Sydney",
    "stateName": "New South Wales",
    "countryCode": "AU",
    "pincode": "2000",
    "aliases": [
      "Sydney CBD",
      "Harbour City"
    ]
  },
  {
    "name": "Melbourne",
    "stateName": "Victoria",
    "countryCode": "AU",
    "pincode": "3000",
    "aliases": [
      "Melbourne CBD",
      "Garden City"
    ]
  },
  {
    "name": "Brisbane",
    "stateName": "Queensland",
    "countryCode": "AU",
    "pincode": "4000",
    "aliases": [
      "River City"
    ]
  },
  {
    "name": "Perth",
    "stateName": "Western Australia",
    "countryCode": "AU",
    "pincode": "6000"
  },
  {
    "name": "Adelaide",
    "stateName": "South Australia",
    "countryCode": "AU",
    "pincode": "5000",
    "aliases": [
      "City of Churches"
    ]
  },
  {
    "name": "Canberra",
    "stateName": "Australian Capital Territory",
    "countryCode": "AU",
    "pincode": "2600",
    "aliases": [
      "Capital of Australia",
      "ACT"
    ]
  },
  {
    "name": "Gold Coast",
    "stateName": "Queensland",
    "countryCode": "AU",
    "pincode": "4217",
    "aliases": [
      "Surfers Paradise"
    ]
  },
  {
    "name": "Hobart",
    "stateName": "Tasmania",
    "countryCode": "AU",
    "pincode": "7000",
    "aliases": [
      "Capital of Tasmania"
    ]
  },
  {
    "name": "Riyadh",
    "stateName": "Riyadh Province",
    "countryCode": "SA",
    "pincode": "11564",
    "aliases": [
      "Capital of Saudi Arabia",
      "Olaya",
      "KAFD"
    ]
  },
  {
    "name": "Jeddah",
    "stateName": "Makkah Province",
    "countryCode": "SA",
    "pincode": "21577",
    "aliases": [
      "Red Sea Port",
      "Corniche Jeddah"
    ]
  },
  {
    "name": "Dammam",
    "stateName": "Eastern Province",
    "countryCode": "SA",
    "pincode": "31411",
    "aliases": [
      "Eastern Province Hub"
    ]
  },
  {
    "name": "Mecca",
    "stateName": "Makkah Province",
    "countryCode": "SA",
    "pincode": "24231",
    "aliases": [
      "Makkah",
      "Holy City"
    ]
  },
  {
    "name": "Medina",
    "stateName": "Madinah Province",
    "countryCode": "SA",
    "pincode": "42311",
    "aliases": [
      "Madinah",
      "Prophet City"
    ]
  },
  {
    "name": "Khobar",
    "stateName": "Eastern Province",
    "countryCode": "SA",
    "pincode": "31952",
    "aliases": [
      "Al Khobar"
    ]
  },
  {
    "name": "Jubail",
    "stateName": "Eastern Province",
    "countryCode": "SA",
    "pincode": "31951",
    "aliases": [
      "Industrial City"
    ]
  },
  {
    "name": "Berlin",
    "stateName": "Berlin",
    "countryCode": "DE",
    "pincode": "10115",
    "aliases": [
      "Capital of Germany"
    ]
  },
  {
    "name": "Munich",
    "stateName": "Bavaria",
    "countryCode": "DE",
    "pincode": "80331",
    "aliases": [
      "M\u00fcnchen",
      "Bavaria Capital"
    ]
  },
  {
    "name": "Frankfurt",
    "stateName": "Hesse",
    "countryCode": "DE",
    "pincode": "60311",
    "aliases": [
      "Frankfurt am Main",
      "Financial Centre"
    ]
  },
  {
    "name": "Hamburg",
    "stateName": "Hamburg",
    "countryCode": "DE",
    "pincode": "20095",
    "aliases": [
      "Port of Hamburg"
    ]
  },
  {
    "name": "Cologne",
    "stateName": "North Rhine-Westphalia",
    "countryCode": "DE",
    "pincode": "50667",
    "aliases": [
      "K\u00f6ln",
      "Cologne Cathedral"
    ]
  },
  {
    "name": "Stuttgart",
    "stateName": "Baden-W\u00fcrttemberg",
    "countryCode": "DE",
    "pincode": "70173",
    "aliases": [
      "Automotive Hub"
    ]
  },
  {
    "name": "D\u00fcsseldorf",
    "stateName": "North Rhine-Westphalia",
    "countryCode": "DE",
    "pincode": "40213",
    "aliases": [
      "Duesseldorf"
    ]
  },
  {
    "name": "Singapore",
    "stateName": "Central Singapore",
    "countryCode": "SG",
    "pincode": "018989",
    "aliases": [
      "Lion City",
      "Marina Bay",
      "Orchard Road",
      "Raffles Place"
    ]
  }
];

/**
 * Search Countries by Name, Code, Dial Code, or Aliases
 */
export function searchCountries(query: string): CountryItem[] {
  if (!query) return GEO_COUNTRIES.slice(0, 15)
  const q = query.toLowerCase().trim()
  return GEO_COUNTRIES.map((c) => {
    const cNameLower = c.name.toLowerCase()
    const cCodeLower = c.code.toLowerCase()
    const aliases = (c.aliases || []).map((a) => a.toLowerCase())
    let score = 0
    let isMatch = false

    if (cNameLower === q || cCodeLower === q || c.dialCode === q) {
      score = 100
      isMatch = true
    } else if (aliases.some((a) => a === q)) {
      score = 95
      isMatch = true
    } else if (cNameLower.startsWith(q)) {
      score = 80
      isMatch = true
    } else if (cCodeLower.startsWith(q) || c.dialCode.startsWith(q)) {
      score = 75
      isMatch = true
    } else if (aliases.some((a) => a.startsWith(q))) {
      score = 70
      isMatch = true
    } else if (cNameLower.includes(q)) {
      score = 50
      isMatch = true
    } else if (aliases.some((a) => a.includes(q))) {
      score = 40
      isMatch = true
    }

    return { country: c, score, isMatch }
  })
  .filter((m) => m.isMatch)
  .sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.country.name.localeCompare(b.country.name)
  })
  .map((m) => m.country)
  .slice(0, 15)
}

/**
 * Search States/UTs/Provinces by Name, State Code, GST Code, or Aliases, optionally scoped by Country.
 * E.g., searching "New Delhi" or "NCT" will match the canonical state "Delhi" (GST 07).
 */
export function searchStates(query: string, countryNameOrCode?: string): StateItem[] {
  let list = GEO_STATES

  if (countryNameOrCode) {
    const c = countryNameOrCode.toUpperCase().trim()
    const foundCountry = GEO_COUNTRIES.find(
      (item) => item.name.toUpperCase() === c || item.code.toUpperCase() === c || (item.aliases || []).some((a) => a.toUpperCase() === c)
    )
    if (foundCountry) {
      list = list.filter((s) => s.countryCode === foundCountry.code)
    }
  }

  if (!query) return list.slice(0, 15)
  const q = query.toLowerCase().trim()

  return list.map((s) => {
    const sNameLower = s.name.toLowerCase()
    const sCodeLower = s.code ? s.code.toLowerCase() : ""
    const aliases = (s.aliases || []).map((a) => a.toLowerCase())
    let score = 0
    let isMatch = false

    if (sNameLower === q || sCodeLower === q || (s.gstCode && s.gstCode === q)) {
      score = 100
      isMatch = true
    } else if (aliases.some((a) => a === q)) {
      score = 95
      isMatch = true
    } else if (sNameLower.startsWith(q)) {
      score = 80
      isMatch = true
    } else if (sCodeLower.startsWith(q)) {
      score = 75
      isMatch = true
    } else if (aliases.some((a) => a.startsWith(q))) {
      score = 70
      isMatch = true
    } else if (sNameLower.includes(q)) {
      score = 50
      isMatch = true
    } else if (aliases.some((a) => a.includes(q))) {
      score = 40
      isMatch = true
    }

    return { state: s, score, isMatch }
  })
  .filter((m) => m.isMatch)
  .sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    return a.state.name.localeCompare(b.state.name)
  })
  .map((m) => m.state)
  .slice(0, 15)
}

/**
 * Search Cities by Name, Alias, or PIN code, optionally scoped by State and Country.
 * Prioritizes:
 * 1. Exact match on city name or PIN code (e.g. "Mumbai" strictly ranks before "Navi Mumbai")
 * 2. Exact match on aliases (e.g. "Bombay" -> Mumbai, "Vashi" -> Navi Mumbai)
 * 3. Prefix match on city name
 * 4. Prefix match on PIN code (e.g. "400" matches Mumbai/Navi Mumbai/Thane)
 * 5. Prefix match on aliases
 * 6. Substring match on city name or aliases
 */
export function searchCities(
  query: string,
  stateName?: string,
  countryNameOrCode?: string
): CityItem[] {
  let list = GEO_CITIES

  // Scope by country
  if (countryNameOrCode) {
    const c = countryNameOrCode.toUpperCase().trim()
    const foundCountry = GEO_COUNTRIES.find(
      (item) => item.name.toUpperCase() === c || item.code.toUpperCase() === c || (item.aliases || []).some((a) => a.toUpperCase() === c)
    )
    if (foundCountry) {
      list = list.filter((city) => city.countryCode === foundCountry.code)
    }
  }

  // Scope by state
  if (stateName) {
    const s = stateName.toLowerCase().trim()
    const matchedStateCities = list.filter(
      (city) => city.stateName.toLowerCase() === s
    )
    if (matchedStateCities.length > 0) {
      list = matchedStateCities
    }
  }

  if (!query) return list.slice(0, 15)
  const q = query.toLowerCase().trim()

  // Match and calculate relevance score
  const matched = list.map((city) => {
    const cityNameLower = city.name.toLowerCase()
    const pin = city.pincode.toLowerCase()
    const aliases = (city.aliases || []).map((a) => a.toLowerCase())

    let score = 0
    let isMatch = false

    // Exact city name or exact PIN match (Highest priority)
    if (cityNameLower === q || pin === q) {
      score = 100
      isMatch = true
    }
    // Exact alias match
    else if (aliases.some((a) => a === q)) {
      score = 90
      isMatch = true
    }
    // Prefix match on city name (Word boundary match gets higher score)
    else if (cityNameLower.startsWith(q)) {
      score = 80
      isMatch = true
    }
    // Prefix match on PIN code
    else if (pin.startsWith(q)) {
      score = 75
      isMatch = true
    }
    // Prefix match on alias
    else if (aliases.some((a) => a.startsWith(q))) {
      score = 70
      isMatch = true
    }
    // Word match within city name (e.g. "mumbai" in "Navi Mumbai")
    else if (cityNameLower.includes(q)) {
      // If the query is a word inside city name (e.g. "mumbai" in "navi mumbai")
      // give lower priority than city names starting with the query
      score = 45
      isMatch = true
    }
    // Substring match on alias
    else if (aliases.some((a) => a.includes(q))) {
      score = 40
      isMatch = true
    }

    return { city, score, isMatch }
  })

  return matched
    .filter((m) => m.isMatch)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score
      return a.city.name.localeCompare(b.city.name)
    })
    .map((m) => m.city)
    .slice(0, 15)
}

/**
 * Direct lookup by exact PIN or postal code
 */
export function lookupPincode(pincode: string): CityItem | undefined {
  const cleanPin = pincode.trim().toLowerCase()
  if (!cleanPin) return undefined
  return GEO_CITIES.find((city) => city.pincode.toLowerCase() === cleanPin)
}

/**
 * Direct lookup by city name, optionally scoped by state
 */
export function lookupCity(name: string, stateName?: string): CityItem | undefined {
  const cleanName = name.trim().toLowerCase()
  if (!cleanName) return undefined
  return GEO_CITIES.find((city) => {
    const nameMatch = city.name.toLowerCase() === cleanName || (city.aliases || []).some((a) => a.toLowerCase() === cleanName)
    if (!nameMatch) return false
    if (stateName) {
      return city.stateName.toLowerCase() === stateName.trim().toLowerCase()
    }
    return true
  })
}

/**
 * Lookup state by name, code, or GST code
 */
export function lookupState(stateNameOrCode: string): StateItem | undefined {
  const q = stateNameOrCode.trim().toLowerCase()
  if (!q) return undefined
  return GEO_STATES.find(
    (s) => s.name.toLowerCase() === q || s.code.toLowerCase() === q || s.gstCode === q || (s.aliases || []).some((a) => a.toLowerCase() === q)
  )
}

/**
 * Lookup country by name or code
 */
export function lookupCountry(countryNameOrCode: string): CountryItem | undefined {
  const q = countryNameOrCode.trim().toLowerCase()
  if (!q) return undefined
  return GEO_COUNTRIES.find(
    (c) => c.name.toLowerCase() === q || c.code.toLowerCase() === q || (c.aliases || []).some((a) => a.toLowerCase() === q)
  )
}
