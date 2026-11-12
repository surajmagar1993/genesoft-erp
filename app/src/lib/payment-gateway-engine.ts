/** Converting money to and from the whole-number units payment gateways use (paise, cents, fils). */

// Zero-decimal currencies per ISO 4217
const ZERO_DECIMAL_CURRENCIES = new Set(["BIF", "CLP", "DJF", "GNF", "JPY", "KMF", "KRW", "MGA", "PYG", "RWF", "UGX", "VND", "VUV", "XAF", "XOF", "XPF"])

// Three-decimal currencies
const THREE_DECIMAL_CURRENCIES = new Set(["BHD", "JOD", "KWD", "OMR", "TND"])

/**
 * Converts a normal currency amount into its integer subunit (e.g. $10.50 -> 1050 cents).
 */
export function toSmallestCurrencyUnit(amount: number, currency: string = "USD"): number {
    const cur = currency.toUpperCase()
    if (ZERO_DECIMAL_CURRENCIES.has(cur)) {
        return Math.round(amount)
    }
    if (THREE_DECIMAL_CURRENCIES.has(cur)) {
        return Math.round(amount * 1000)
    }
    return Math.round(amount * 100)
}

/**
 * Converts an integer subunit back into standard currency decimal (e.g. 1050 cents -> $10.50).
 */
export function fromSmallestCurrencyUnit(amount: number, currency: string = "USD"): number {
    const cur = currency.toUpperCase()
    if (ZERO_DECIMAL_CURRENCIES.has(cur)) {
        return amount
    }
    if (THREE_DECIMAL_CURRENCIES.has(cur)) {
        return amount / 1000
    }
    return amount / 100
}
