/**
 * Government-filing modules (GST return files, TDS/26Q, e-way bills, UAE VAT
 * 201, KSA VAT return / ZATCA phase 2, UK MTD, Australian BAS, US 1099 &
 * nexus) need live government APIs to be useful. They stay in the code but
 * are hidden until NEXT_PUBLIC_ENABLE_COMPLIANCE_MODULES=true.
 * Basic tax on documents (GST in India, VAT elsewhere, ZATCA QR in Saudi
 * Arabia) and the Tax Summary report are always on.
 */
export const COMPLIANCE_MODULES_ENABLED = process.env.NEXT_PUBLIC_ENABLE_COMPLIANCE_MODULES === "true"

export const COMPLIANCE_ROUTES = [
    "/finance/gst-returns",
    "/finance/tds",
    "/sales/eway-bills",
    "/finance/vat-uae",
    "/finance/vat-ksa",
    "/finance/tax-australia",
    "/finance/vat-uk",
    "/finance/tax-us",
]

export function isComplianceRoute(pathname: string): boolean {
    return COMPLIANCE_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
