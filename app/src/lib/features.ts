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
 * Switched-off modules: CRM Emails, WhatsApp and Web Forms, Finance → Bank
 * Reconciliation (2026-11-12), and the thin modules (2026-11-14, owner's
 * decision before launch): Manufacturing, Inventory → Batch & serial,
 * HR → Performance & training and Recruitment, Purchase → RFQ, Finance →
 * Budgets and the Report builder. They are out of the menu and the links that
 * lead to them, their pages redirect, their plan/team-access entries are
 * hidden, public form links answer "not found" and the daily inbox sync is
 * skipped. The code and saved data stay; set NEXT_PUBLIC_ENABLE_PARKED_MODULES=true
 * to bring them back.
 */
export const PARKED_MODULES_ENABLED = process.env.NEXT_PUBLIC_ENABLE_PARKED_MODULES === "true"

/** Each switched-off page and where a visitor to it is sent instead */
const PARKED: { route: string; fallback: string }[] = [
    { route: "/crm/emails", fallback: "/crm/contacts" },
    { route: "/crm/whatsapp", fallback: "/crm/contacts" },
    { route: "/crm/forms", fallback: "/crm/contacts" },
    { route: "/finance/bank-reconciliation", fallback: "/finance/reports" },
    { route: "/manufacturing", fallback: "/inventory" },
    { route: "/hr/performance", fallback: "/hr" },
    { route: "/hr/recruitment", fallback: "/hr" },
    { route: "/purchase/rfq", fallback: "/purchase" },
    { route: "/finance/budgets", fallback: "/finance/reports" },
    { route: "/reports/builder", fallback: "/reports" },
]

export const PARKED_ROUTES = PARKED.map((p) => p.route)

/** Whole access modules that are switched off (hidden in Team & Access and plan settings; access is NONE) */
export const PARKED_MODULE_KEYS: readonly string[] = ["manufacturing", "reports"]

/** Inventory tab that is switched off with them */
export const PARKED_INVENTORY_TAB = "batch-serial"

function parkedEntry(pathname: string) {
    return PARKED.find((p) => pathname === p.route || pathname.startsWith(`${p.route}/`))
}

export function isParkedRoute(pathname: string): boolean {
    return parkedEntry(pathname) !== undefined
}

/** Where to send someone who opens a switched-off page */
export function parkedFallback(pathname: string): string {
    return parkedEntry(pathname)?.fallback ?? "/dashboard"
}

/** A module key that is switched off (false whenever PARKED_MODULES_ENABLED is on) */
export function isParkedModule(key: string): boolean {
    // Read when called (not only at load) so tests of the switched-off code can turn it on
    const enabled = PARKED_MODULES_ENABLED || process.env.NEXT_PUBLIC_ENABLE_PARKED_MODULES === "true"
    return !enabled && PARKED_MODULE_KEYS.includes(key)
}
