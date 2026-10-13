/**
 * The company that runs Genesoft ERP (the SaaS operator), used on platform
 * receipts, the marketing site and legal pages. Not a tenant's details:
 * tenant documents use the tenant's own Settings.
 * PLATFORM_GSTIN is optional; when unset no tax ID is printed.
 */
export const PLATFORM = {
    productName: "Genesoft ERP",
    legalName: process.env.PLATFORM_LEGAL_NAME || "Genesoft Infotech",
    email: process.env.PLATFORM_EMAIL || "hello@genesoftinfotech.com",
    phone: process.env.PLATFORM_PHONE || "+91 8888885285",
    gstin: process.env.PLATFORM_GSTIN || "",
    website: "https://genesoftinfotech.com",
    address: {
        line1: "Shivtirtha Bungalow, Lane 15, Khese Park",
        line2: "Lohegaon, Pune, Maharashtra 411032",
        country: "India",
    },
    /** Courts with jurisdiction under the Terms */
    jurisdiction: "Pune, Maharashtra, India",
} as const

/** "+91 8888885285" → "tel:+918888885285" */
export function telHref(phone: string): string {
    return `tel:${phone.replace(/[^\d+]/g, "")}`
}
