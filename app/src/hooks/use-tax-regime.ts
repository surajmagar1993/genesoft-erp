"use client"

import { useEffect, useState } from "react"
import { getInvoiceTaxRegime } from "@/app/actions/sales/tax"
import { localeForCurrency } from "@/lib/utils"

export type TaxRegime = Awaited<ReturnType<typeof getInvoiceTaxRegime>>

let cached: Promise<TaxRegime> | null = null

/**
 * The signed-in business's tax setup (tax name, rates, currency, number
 * format), loaded once per page. Null while loading.
 */
export function useTaxRegime() {
    const [regime, setRegime] = useState<TaxRegime | null>(null)
    useEffect(() => {
        cached ??= getInvoiceTaxRegime().catch((err) => {
            cached = null
            throw err
        })
        cached.then(setRegime).catch(() => {})
    }, [])

    const currency = regime?.currency || "INR"
    const formatMoney = (amount: number) =>
        new Intl.NumberFormat(regime?.locale || localeForCurrency(currency), { style: "currency", currency }).format(amount)

    return { regime, formatMoney, taxLabel: regime?.taxLabel || "Tax", rates: regime?.standardRates || [0], defaultRate: regime?.defaultRate ?? 0 }
}
