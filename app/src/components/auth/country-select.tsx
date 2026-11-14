"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { COUNTRIES as ALL_COUNTRIES } from "@/lib/constants/countries"

/** Countries with their own tax setup; everyone else picks "Other country" */
const COUNTRIES = [
    { code: "IN", name: "India", currency: "INR", tax: "GST" },
    { code: "AE", name: "United Arab Emirates", currency: "AED", tax: "VAT 5%" },
    { code: "SA", name: "Saudi Arabia", currency: "SAR", tax: "VAT 15% + ZATCA QR" },
    { code: "GB", name: "United Kingdom", currency: "GBP", tax: "VAT" },
    { code: "US", name: "United States", currency: "USD", tax: "Sales tax" },
    { code: "AU", name: "Australia", currency: "AUD", tax: "GST 10%" },
]
const OTHERS = ALL_COUNTRIES.filter((c) => !COUNTRIES.some((m) => m.code === c.code))

/** Same look as the text inputs */
const SELECT = "h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30"

/**
 * Business country at sign-up. It sets the currency, number format and the
 * tax used on documents, so nothing is preselected (never assume India).
 * "Other country" picks from the full list; its currency comes with it and the
 * tax name and rates are set later in Settings.
 */
export function CountrySelect() {
    const [country, setCountry] = useState("")
    const [other, setOther] = useState("")
    const chosen = COUNTRIES.find((c) => c.code === country)
    const otherCountry = OTHERS.find((c) => c.code === other)

    return (
        <div className="space-y-2">
            <Label htmlFor="country">Business country</Label>
            <select id="country" name="country" required value={country} onChange={(e) => setCountry(e.target.value)} className={SELECT}>
                <option value="" disabled>Choose your country</option>
                {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                ))}
                <option value="OTHER">Other country</option>
            </select>
            {chosen && <p className="text-xs text-muted-foreground">Currency {chosen.currency} · {chosen.tax} on invoices</p>}
            {country === "OTHER" && (
                <>
                    <select aria-label="Your country" required value={other} onChange={(e) => setOther(e.target.value)} className={SELECT}>
                        <option value="" disabled>Choose your country</option>
                        {OTHERS.map((c) => (
                            <option key={c.code} value={c.code}>{c.name}</option>
                        ))}
                    </select>
                    <input type="hidden" name="otherCountry" value={otherCountry?.code ?? ""} />
                    <input type="hidden" name="otherCurrency" value={otherCountry?.currency ?? ""} />
                    <p className="text-xs text-muted-foreground">
                        {otherCountry ? `Currency ${otherCountry.currency}. ` : ""}Set your tax name and rates in Settings after signing in.
                    </p>
                </>
            )}
        </div>
    )
}
