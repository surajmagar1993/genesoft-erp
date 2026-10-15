/**
 * The company that runs Genesoft ERP (the SaaS operator), used on platform
 * receipts, the website and legal pages. Not a tenant's details: tenant
 * documents use the tenant's own Settings.
 *
 * Names: `brandName` everywhere on the website; `legalName` only on legal
 * pages and on receipts/invoices to customers (owner decision, 15 Oct 2026).
 * Emails: `email` (info@) for general queries and the website forms,
 * `welcomeEmail` (hello@) for welcome emails to clients, `careersEmail`
 * (careers@) for job applications.
 * PLATFORM_GSTIN is optional; when unset no tax ID is printed.
 */
export const PLATFORM = {
    productName: "Genesoft ERP",
    brandName: "Genesoft Infotech",
    legalName: process.env.PLATFORM_LEGAL_NAME || "Genesoft Infotech Private Limited",
    email: process.env.PLATFORM_EMAIL || "info@genesoftinfotech.com",
    welcomeEmail: "hello@genesoftinfotech.com",
    careersEmail: "careers@genesoftinfotech.com",
    phone: process.env.PLATFORM_PHONE || "+91 8888885285",
    /** The main number is also on WhatsApp Business */
    whatsapp: "+91 8888885285",
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

/** WhatsApp chat link with an optional ready-typed message. */
export function whatsappHref(phone: string, text?: string): string {
    const n = phone.replace(/\D/g, "")
    return `https://wa.me/${n}${text ? `?text=${encodeURIComponent(text)}` : ""}`
}
