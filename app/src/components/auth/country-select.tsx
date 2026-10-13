"use client"

import { useState } from "react"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"

const COUNTRIES = [
    { code: "IN", name: "India", currency: "INR", tax: "GST" },
    { code: "AE", name: "United Arab Emirates", currency: "AED", tax: "VAT 5%" },
    { code: "SA", name: "Saudi Arabia", currency: "SAR", tax: "VAT 15% + ZATCA QR" },
    { code: "GB", name: "United Kingdom", currency: "GBP", tax: "VAT" },
    { code: "US", name: "United States", currency: "USD", tax: "Sales tax" },
    { code: "AU", name: "Australia", currency: "AUD", tax: "GST 10%" },
]

/**
 * Business country at signup. It sets the currency, number format and the
 * tax used on documents. "Other" asks for the country code and currency;
 * the tax name and rates are set later in Settings.
 */
export function CountrySelect() {
    const [country, setCountry] = useState("IN")
    const chosen = COUNTRIES.find((c) => c.code === country)

    return (
        <div className="space-y-2">
            <Label htmlFor="country">Business country</Label>
            <select
                id="country"
                name="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
                {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>{c.name}</option>
                ))}
                <option value="OTHER">Other country</option>
            </select>
            {chosen ? (
                <p className="text-xs text-muted-foreground">Currency {chosen.currency} · {chosen.tax} on invoices</p>
            ) : (
                <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                        <Label htmlFor="otherCountry" className="text-xs">Country code</Label>
                        <Input id="otherCountry" name="otherCountry" required maxLength={2} placeholder="2 letters, e.g. SG" className="h-9 uppercase" />
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="otherCurrency" className="text-xs">Currency</Label>
                        <Input id="otherCurrency" name="otherCurrency" required maxLength={3} placeholder="3 letters, e.g. SGD" className="h-9 uppercase" />
                    </div>
                    <p className="col-span-2 text-xs text-muted-foreground">Set your tax name and rates in Settings after signing in.</p>
                </div>
            )}
        </div>
    )
}
