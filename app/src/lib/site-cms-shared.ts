/**
 * What can be edited in Super Admin → Website, and the built-in defaults.
 * Pure data (safe in the browser): the admin forms and the public pages are
 * both built from these definitions. Storage: src/lib/site-cms.ts.
 */
import { PLATFORM } from "@/lib/constants/platform"
import { SERVICES, RENTAL_CATEGORIES } from "@/lib/site-content"

// ---------------------------------------------------------------- fields

export type FieldType =
    | "text"
    | "textarea"
    /** One entry per line → string[] */
    | "lines"
    /** "Title | text" per line → { title, text }[] */
    | "pairs"
    /** "Question | Answer" per line → { q, a }[] */
    | "faqs"
    | "url"
    | "email"
    | "number"
    | "select"
    /** An image from the Media library (stores its public URL) */
    | "image"

export interface FieldDef {
    name: string
    label: string
    type: FieldType
    help?: string
    required?: boolean
    options?: string[]
    max?: number
}

export type Pair = { title: string; text: string }
export type Faq = { q: string; a: string }
export type FieldValue = string | number | string[] | Pair[] | Faq[] | null

// ---------------------------------------------------------------- site settings

export const WEEK_DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const
export const SOCIAL_NETWORKS = ["LinkedIn", "Instagram", "Facebook", "YouTube", "X"] as const

export interface OfficeHours {
    day: (typeof WEEK_DAYS)[number]
    closed: boolean
    open: string // "10:00"
    close: string // "19:00"
}

export interface SiteSettingsData {
    phone: string
    whatsapp: string
    email: string
    careersEmail: string
    addressLine1: string
    addressLine2: string
    mapsUrl: string
    /** Empty = hours not set, so the site doesn't show them */
    hours: OfficeHours[]
    hoursNote: string
    socials: { network: (typeof SOCIAL_NETWORKS)[number]; url: string }[]
    seoTitle: string
    seoDescription: string
}

export const DEFAULT_SITE_SETTINGS: SiteSettingsData = {
    phone: PLATFORM.phone,
    whatsapp: PLATFORM.whatsapp,
    email: PLATFORM.email,
    careersEmail: PLATFORM.careersEmail,
    addressLine1: PLATFORM.address.line1,
    addressLine2: PLATFORM.address.line2,
    mapsUrl: "",
    hours: [],
    hoursNote: "",
    socials: [],
    seoTitle: "Genesoft Infotech | Software, Digital Marketing, IT Rentals and IT Support in Pune",
    seoDescription:
        "Genesoft Infotech builds custom software and ERP systems, runs digital marketing, rents laptops and servers, and provides IT support, from Pune, India. Makers of Genesoft ERP.",
}

// ---------------------------------------------------------------- pages

export interface PageDef {
    key: string
    label: string
    /** Public address, for "View page" */
    path: string
    fields: FieldDef[]
    defaults: Record<string, FieldValue>
}

const serviceFields = (slug: string): FieldDef[] => [
    { name: "short", label: "One line for cards and menus", type: "textarea", required: true, max: 200 },
    { name: "heading", label: "Page heading", type: "text", required: true, max: 120 },
    { name: "intro", label: "Intro paragraph", type: "textarea", required: true, max: 500 },
    ...(slug === "it-rentals"
        ? []
        : ([
              { name: "includes", label: "What's included", type: "pairs", help: "One per line: Title | short description" },
              { name: "getList", label: "What you get (side box)", type: "lines", help: "One point per line" },
              { name: "faqs", label: "Questions", type: "faqs", help: "One per line: Question | Answer" },
          ] as FieldDef[])),
    ...(slug === "software-development" ? ([{ name: "tech", label: "Technologies", type: "lines", help: "One per line" }] as FieldDef[]) : []),
]

export const PAGE_DEFS: PageDef[] = [
    {
        key: "page:home",
        label: "Home",
        path: "/",
        fields: [
            { name: "eyebrow", label: "Small label above the heading", type: "text", max: 120 },
            { name: "heading", label: "Heading", type: "text", required: true, max: 120 },
            { name: "lead", label: "Text under the heading", type: "textarea", required: true, max: 400 },
            { name: "points", label: "Ticks under the buttons", type: "lines", help: "Up to 3, one per line" },
        ],
        defaults: {
            eyebrow: "Software · Marketing · IT Rentals · IT Support",
            heading: "Technology that keeps your business moving.",
            lead: `From Pune, ${PLATFORM.brandName} builds custom software, grows your brand online, rents you the IT equipment you need, and keeps it all running. One team, one point of contact.`,
            points: ["Free first consultation", "Clear quote before we start", "Support after launch"],
        },
    },
    {
        key: "page:about",
        label: "About",
        path: "/about",
        fields: [
            { name: "heading", label: "Heading", type: "text", required: true, max: 120 },
            { name: "lead", label: "Intro", type: "textarea", required: true, max: 400 },
            { name: "story", label: "Our story", type: "lines", help: "One paragraph per line" },
        ],
        defaults: {
            heading: "A technology partner for growing businesses",
            lead: "We're a Pune-based team that builds software, grows brands online, supplies IT equipment on rent and keeps systems running, so our clients can focus on their own work.",
            story: [
                "Many small and mid-sized businesses keep customers in one tool, invoices in another and stock in a spreadsheet. Numbers drift apart, the same details are typed again and again, and month-end means chasing figures.",
                `We work across four areas: software development, digital marketing, IT rentals and IT support. We also build ${PLATFORM.productName}, our own business software for companies in India, the Gulf, the UK, the US and Australia, where a quote becomes an order and an invoice, moves stock and reaches the ledger without re-typing.`,
            ],
        },
    },
    ...SERVICES.map((s) => ({
        key: `service:${s.slug}`,
        label: `Service: ${s.name}`,
        path: `/services/${s.slug}`,
        fields: serviceFields(s.slug),
        defaults: {
            short: s.short,
            heading: s.heading,
            intro: s.intro,
            includes: s.includes,
            getList: s.getList,
            faqs: s.faqs,
            ...(s.tech ? { tech: s.tech } : {}),
        } as Record<string, FieldValue>,
    })),
]

export function pageDef(key: string): PageDef | undefined {
    return PAGE_DEFS.find((p) => p.key === key)
}

// ---------------------------------------------------------------- lists

export type ItemKind = "portfolio" | "client" | "testimonial" | "stat" | "team" | "job" | "rental_item"

export interface ItemKindDef {
    kind: ItemKind
    label: string
    singular: string
    /** Field used as the item's title in lists (and its slug, when hasSlug) */
    titleField: string
    hasSlug: boolean
    /** The tick that must be on before an item can show; null = no tick needed */
    confirmLabel: string | null
    fields: FieldDef[]
    /** Where it appears */
    shownOn: string
}

const SERVICE_NAMES = SERVICES.map((s) => s.name)

export const ITEM_KINDS: ItemKindDef[] = [
    {
        kind: "portfolio",
        label: "Portfolio",
        singular: "project",
        titleField: "title",
        hasSlug: true,
        confirmLabel: "The client agreed to this being shown",
        shownOn: "Portfolio page, service pages and Home",
        fields: [
            { name: "title", label: "Project name", type: "text", required: true, max: 120 },
            { name: "client", label: "Client (leave empty to keep it anonymous)", type: "text", max: 120 },
            { name: "service", label: "Service", type: "select", options: SERVICE_NAMES, required: true },
            { name: "technologies", label: "Technologies or channels", type: "text", max: 200 },
            { name: "summary", label: "One-line result", type: "text", required: true, max: 200 },
            { name: "challenge", label: "The challenge", type: "textarea", max: 2000 },
            { name: "solution", label: "What we did", type: "textarea", max: 2000 },
            { name: "result", label: "The result", type: "textarea", max: 2000 },
            { name: "image", label: "Main image", type: "image" },
            { name: "link", label: "Link (optional)", type: "url" },
            { name: "year", label: "Year", type: "text", max: 10 },
        ],
    },
    {
        kind: "client",
        label: "Clients",
        singular: "client",
        titleField: "name",
        hasSlug: false,
        confirmLabel: "We have permission to show this logo",
        shownOn: "Home (client logos band)",
        fields: [
            { name: "name", label: "Client name", type: "text", required: true, max: 120 },
            { name: "logo", label: "Logo", type: "image", required: true },
            { name: "website", label: "Website (optional)", type: "url" },
        ],
    },
    {
        kind: "testimonial",
        label: "Testimonials",
        singular: "testimonial",
        titleField: "name",
        hasSlug: false,
        confirmLabel: "The person agreed to their words being shown",
        shownOn: "Home",
        fields: [
            { name: "quote", label: "Their words", type: "textarea", required: true, max: 600 },
            { name: "name", label: "Name", type: "text", required: true, max: 80 },
            { name: "role", label: "Role", type: "text", max: 80 },
            { name: "company", label: "Company", type: "text", max: 120 },
            { name: "photo", label: "Photo (optional)", type: "image" },
        ],
    },
    {
        kind: "stat",
        label: "Numbers",
        singular: "number",
        titleField: "label",
        hasSlug: false,
        confirmLabel: "This number is true and up to date",
        shownOn: "Home (numbers band)",
        fields: [
            { name: "value", label: "Number (e.g. 120+)", type: "text", required: true, max: 12 },
            { name: "label", label: "Label (e.g. Projects delivered)", type: "text", required: true, max: 60 },
        ],
    },
    {
        kind: "team",
        label: "Team",
        singular: "person",
        titleField: "name",
        hasSlug: false,
        confirmLabel: "This person agreed to be shown",
        shownOn: "About page",
        fields: [
            { name: "name", label: "Name", type: "text", required: true, max: 80 },
            { name: "role", label: "Role", type: "text", required: true, max: 80 },
            { name: "photo", label: "Photo", type: "image" },
        ],
    },
    {
        kind: "job",
        label: "Jobs",
        singular: "job post",
        titleField: "title",
        hasSlug: true,
        confirmLabel: null,
        shownOn: "Careers page (published jobs only)",
        fields: [
            { name: "title", label: "Job title", type: "text", required: true, max: 120 },
            { name: "department", label: "Department", type: "text", max: 80 },
            { name: "type", label: "Type", type: "select", options: ["Full-time", "Part-time", "Internship", "Contract"], required: true },
            { name: "location", label: "Location", type: "text", required: true, max: 80 },
            { name: "experience", label: "Experience", type: "text", max: 80 },
            { name: "about", label: "About the role", type: "textarea", required: true, max: 3000 },
            { name: "responsibilities", label: "You'll work on", type: "lines", help: "One per line" },
            { name: "requirements", label: "You'll bring", type: "lines", help: "One per line" },
        ],
    },
    {
        kind: "rental_item",
        label: "Rental catalogue",
        singular: "equipment category",
        titleField: "name",
        hasSlug: false,
        confirmLabel: null,
        shownOn: "IT Rentals page and its quote form",
        fields: [
            { name: "name", label: "Category name", type: "text", required: true, max: 60 },
            { name: "text", label: "Short description", type: "text", required: true, max: 160 },
        ],
    },
]

export function itemKindDef(kind: string): ItemKindDef | undefined {
    return ITEM_KINDS.find((k) => k.kind === kind)
}

/** Built-in rental categories, used until the catalogue has published items */
export const DEFAULT_RENTAL_ITEMS = RENTAL_CATEGORIES

// ---------------------------------------------------------------- leads

export const LEAD_STATUSES = ["new", "contacted", "quote_sent", "won", "lost", "spam"] as const
export type LeadStatus = (typeof LEAD_STATUSES)[number]
export const LEAD_STATUS_LABEL: Record<LeadStatus, string> = {
    new: "New",
    contacted: "Contacted",
    quote_sent: "Quote sent",
    won: "Won",
    lost: "Lost",
    spam: "Spam",
}
export const LEAD_KIND_LABEL: Record<string, string> = { contact: "Message", quote: "Rental quote", application: "Job application" }

// ---------------------------------------------------------------- helpers

export function slugify(text: string): string {
    return text
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[^\w\s-]/g, "")
        .trim()
        .replace(/[\s_]+/g, "-")
        .replace(/-+/g, "-")
        .slice(0, 80)
}

// ---------------------------------------------------------------- form ⇄ value

/** A stored value as the text shown in its form field. */
export function valueToText(field: FieldDef, value: FieldValue | undefined): string {
    if (value == null) return ""
    if (field.type === "lines") return (Array.isArray(value) ? (value as string[]) : []).join("\n")
    if (field.type === "pairs") return (Array.isArray(value) ? (value as Pair[]) : []).map((p) => `${p.title} | ${p.text}`).join("\n")
    if (field.type === "faqs") return (Array.isArray(value) ? (value as Faq[]) : []).map((f) => `${f.q} | ${f.a}`).join("\n")
    return String(value)
}

function splitPair(line: string): [string, string] {
    const i = line.indexOf("|")
    return i < 0 ? [line.trim(), ""] : [line.slice(0, i).trim(), line.slice(i + 1).trim()]
}

/**
 * Turns submitted form text into a stored value, or throws a readable error.
 * `isAllowedImage` decides which image URLs are accepted (our own storage only).
 */
export function textToValue(field: FieldDef, raw: unknown, isAllowedImage: (url: string) => boolean): FieldValue {
    const text = typeof raw === "string" ? raw.replace(/\r\n/g, "\n").trim() : raw == null ? "" : String(raw).trim()
    const max = field.max ?? (field.type === "textarea" ? 5000 : 300)
    if (!text) {
        if (field.required) throw new Error(`${field.label} is required.`)
        return field.type === "lines" || field.type === "pairs" || field.type === "faqs" ? [] : null
    }
    const lines = () => text.split("\n").map((l) => l.trim()).filter(Boolean).slice(0, 30)
    switch (field.type) {
        case "lines":
            return lines().map((l) => l.slice(0, 600))
        case "pairs":
            return lines().map((l) => {
                const [title, body] = splitPair(l)
                if (!title || !body) throw new Error(`${field.label}: write each line as "Title | description".`)
                return { title: title.slice(0, 120), text: body.slice(0, 400) }
            })
        case "faqs":
            return lines().map((l) => {
                const [q, a] = splitPair(l)
                if (!q || !a) throw new Error(`${field.label}: write each line as "Question | Answer".`)
                return { q: q.slice(0, 200), a: a.slice(0, 1000) }
            })
        case "url":
            if (!/^https:\/\/[^\s]+$/i.test(text)) throw new Error(`${field.label}: enter a full https:// link.`)
            return text.slice(0, 500)
        case "email":
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text)) throw new Error(`${field.label}: enter a valid email address.`)
            return text.toLowerCase()
        case "number": {
            const n = Number(text)
            if (!Number.isFinite(n)) throw new Error(`${field.label}: enter a number.`)
            return n
        }
        case "select":
            if (!field.options?.includes(text)) throw new Error(`${field.label}: choose one of the options.`)
            return text
        case "image":
            if (!isAllowedImage(text)) throw new Error(`${field.label}: pick an image from the Media library.`)
            return text
        default:
            if (text.length > max) throw new Error(`${field.label} is too long (${max} characters at most).`)
            return text
    }
}
