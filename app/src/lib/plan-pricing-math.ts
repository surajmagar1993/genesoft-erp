const ANNUAL_DISCOUNT = 0.8 // annual = 12 months less 20%, same rule as the built-in catalog

/** Yearly price for a monthly price (safe to use in the browser). */
export function annualFromMonthly(monthly: number): number {
    return Math.round(monthly * 12 * ANNUAL_DISCOUNT)
}
