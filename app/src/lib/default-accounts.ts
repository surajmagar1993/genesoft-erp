import type { TaxJurisdictionConfig } from "@/lib/tax-jurisdiction"

/** Indian-only tax accounts: CGST/SGST/IGST sub-ledgers and TDS. */
const INDIA_ONLY_CODES = new Set(["2210", "2220", "2230", "2300"])

/**
 * Adapts a default chart of accounts to the business's country. India keeps
 * GST Payable (CGST/SGST/IGST) and TDS. Everywhere else gets one
 * "<VAT|GST|Sales Tax> Payable" account and a matching input-tax account.
 * Works on any row shape that has `code` and `name`.
 */
export function adaptTaxAccounts<T extends { code: string; name: string }>(rows: T[], regime: TaxJurisdictionConfig): T[] {
    if (regime.mode === "IN_GST") return rows
    const label = regime.taxLabel
    return rows
        .filter((row) => !INDIA_ONLY_CODES.has(row.code))
        .map((row) => {
            if (row.code === "2200") {
                const adapted: Record<string, unknown> = { ...row, name: `${label} Payable` }
                if ("isGroup" in row) adapted.isGroup = false
                if ("is_group" in row) adapted.is_group = false
                if ("description" in row) adapted.description = `${label} collected on sales`
                return adapted as T
            }
            if (row.code === "1400" && /GST/i.test(row.name)) {
                return { ...row, name: `Input ${label}` } as T
            }
            return row
        })
}

/** Name used in journal descriptions for tax paid on purchases. */
export function inputTaxLabel(regime: TaxJurisdictionConfig): string {
    return regime.mode === "IN_GST" ? "Input GST" : `Input ${regime.taxLabel}`
}
