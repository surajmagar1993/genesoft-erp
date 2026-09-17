import { InvoiceTemplateId } from "@/app/actions/sales/invoices"

export interface InvoiceTemplateMeta {
    id: InvoiceTemplateId
    name: string
    category: string
    description: string
    accentColor: string
    badgeText: string
    recommendedFor: string
    previewThumbnailClasses: string
}

export const INVOICE_TEMPLATES: Record<InvoiceTemplateId, InvoiceTemplateMeta> = {
    MODERN: {
        id: "MODERN",
        name: "Modern Executive",
        category: "Contemporary Tech & SaaS",
        description: "Vibrant indigo header accents, card-structured billing parties, pill badges, and clean tabular rows with soft zebra striping.",
        accentColor: "#4f46e5", // Indigo-600
        badgeText: "Recommended",
        recommendedFor: "SaaS, IT Services, Consulting, Modern Agencies",
        previewThumbnailClasses: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800"
    },
    CLASSIC: {
        id: "CLASSIC",
        name: "Classic Corporate",
        category: "Formal & Accounting",
        description: "Traditional corporate letterhead, formal boxed grids, double-underline accounting totals, and structured tabular boundaries.",
        accentColor: "#1e293b", // Slate-800
        badgeText: "Enterprise",
        recommendedFor: "Manufacturing, Wholesale, Legal, Audit & Chartered Accountants",
        previewThumbnailClasses: "bg-slate-50 dark:bg-slate-900 border-slate-300 dark:border-slate-700"
    },
    MINIMALIST: {
        id: "MINIMALIST",
        name: "Swiss Minimalist",
        category: "Design & High-End",
        description: "Ultra-clean typographical aesthetic, ample whitespace, hairline divider rules, monochromatic purity, and zero visual clutter.",
        accentColor: "#0f172a", // Slate-900
        badgeText: "Clean & Simple",
        recommendedFor: "Architecture, Creative Studios, Luxury Retail, Freelancers",
        previewThumbnailClasses: "bg-zinc-50 dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800"
    },
    COMPACT: {
        id: "COMPACT",
        name: "Compact / POS Thermal",
        category: "Retail & Quick Sales",
        description: "High-density receipt slip format, condensed typography, minimal padding, and inline tax summary for counter sales and delivery dockets.",
        accentColor: "#0d9488", // Teal-600
        badgeText: "Retail & Counter",
        recommendedFor: "POS Counters, Hardware Stores, Fast Spares, Delivery Slips",
        previewThumbnailClasses: "bg-teal-50 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800"
    },
    CREATIVE: {
        id: "CREATIVE",
        name: "Creative Bold",
        category: "Media & Agency",
        description: "Bold top gradient hero banner, eye-catching brand insignia, high-contrast callout boxes, and modern gradient totals badge.",
        accentColor: "#8b5cf6", // Violet-600
        badgeText: "Bold Branding",
        recommendedFor: "Marketing Agencies, Video Production, Designers, Entertainment",
        previewThumbnailClasses: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800"
    }
}
