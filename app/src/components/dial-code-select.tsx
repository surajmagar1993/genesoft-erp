"use client"

import { useState } from "react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { COUNTRIES } from "@/lib/constants/countries"

/**
 * Country calling code picker. Several countries share a code (+1 USA and
 * Canada, +44 UK and Jersey…), so the list is keyed by country and the parent
 * only gets the code ("+1"). `homeCountry` decides which country a shared code
 * shows as when editing a saved number.
 */
export function DialCodeSelect({ value, onChange, homeCountry, label }: { value: string; onChange: (dialCode: string) => void; homeCountry?: string; label: string }) {
    const pickFor = (dial: string) =>
        COUNTRIES.find((c) => c.dialCode === dial && c.code === homeCountry)?.code ?? COUNTRIES.find((c) => c.dialCode === dial)?.code ?? ""
    const [country, setCountry] = useState(() => pickFor(value))
    // The parent changed the code (e.g. the home country loaded): follow it unless it's the one already shown
    const shown = COUNTRIES.find((c) => c.code === country)?.dialCode === value ? country : pickFor(value)

    return (
        <Select
            value={shown}
            onValueChange={(code) => {
                setCountry(code)
                onChange(COUNTRIES.find((c) => c.code === code)?.dialCode ?? "")
            }}
        >
            <SelectTrigger className="w-[110px] shrink-0" aria-label={label}>
                <SelectValue placeholder="Code" />
            </SelectTrigger>
            <SelectContent>
                {COUNTRIES.map((c) => (
                    <SelectItem key={c.code} value={c.code}>
                        {c.flag} {c.dialCode} <span className="sr-only">{c.name}</span>
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    )
}
