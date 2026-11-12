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

/**
 * Switched-off modules: CRM Emails, WhatsApp and Web Forms, and Finance →
 * Bank Reconciliation. They are out of the menu, their pages redirect, public
 * form links answer "not found" and the daily inbox sync is skipped. The code
 * and saved data stay; set NEXT_PUBLIC_ENABLE_PARKED_MODULES=true to bring
 * them back.
 */
export const PARKED_MODULES_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PARKED_MODULES === "true"

export const PARKED_ROUTES = [
    "/crm/emails",
    "/crm/whatsapp",
    "/crm/forms",
    "/finance/bank-reconciliation",
]

export function isParkedRoute(pathname: string): boolean {
    return PARKED_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`))
}
