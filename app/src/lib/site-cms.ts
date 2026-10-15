import { cache } from "react"
import { prisma } from "@/lib/prisma"
import {
    DEFAULT_SITE_SETTINGS,
    SOCIAL_NETWORKS,
    WEEK_DAYS,
    itemKindDef,
    pageDef,
    type FieldValue,
    type ItemKind,
    type OfficeHours,
    type SiteSettingsData,
} from "@/lib/site-cms-shared"
import { LEGAL_DEFS, legalDef, type LegalDef } from "@/lib/legal-content"
import { parseInline, parseLegal, type Inline, type LegalDocSection } from "@/lib/legal-markdown"

export * from "@/lib/site-cms-shared"

/**
 * Reads what Super Admin → Website has published, over the built-in
 * defaults (src/lib/site-cms-shared.ts, src/lib/site-content.ts). Public
 * pages call these; if the database can't be read they still render with the
 * defaults. Server only.
 */

function asObject(v: unknown): Record<string, unknown> {
    return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
}

/** Settings stored in site_settings, cleaned and merged over the defaults. */
export function normalizeSiteSettings(raw: unknown): SiteSettingsData {
    const r = asObject(raw)
    const str = (k: keyof SiteSettingsData) => (typeof r[k] === "string" && (r[k] as string).trim() ? (r[k] as string).trim() : (DEFAULT_SITE_SETTINGS[k] as string))
    const hours: OfficeHours[] = Array.isArray(r.hours)
        ? (r.hours as unknown[])
              .map((h) => asObject(h))
              .filter((h) => WEEK_DAYS.includes(h.day as (typeof WEEK_DAYS)[number]))
              .map((h) => ({
                  day: h.day as OfficeHours["day"],
                  closed: h.closed === true,
                  open: /^\d{2}:\d{2}$/.test(String(h.open)) ? String(h.open) : "10:00",
                  close: /^\d{2}:\d{2}$/.test(String(h.close)) ? String(h.close) : "19:00",
              }))
        : []
    const socials = Array.isArray(r.socials)
        ? (r.socials as unknown[])
              .map((s) => asObject(s))
              .filter((s) => SOCIAL_NETWORKS.includes(s.network as (typeof SOCIAL_NETWORKS)[number]) && /^https:\/\//.test(String(s.url)))
              .map((s) => ({ network: s.network as (typeof SOCIAL_NETWORKS)[number], url: String(s.url) }))
        : []
    return {
        phone: str("phone"),
        whatsapp: str("whatsapp"),
        email: str("email"),
        careersEmail: str("careersEmail"),
        addressLine1: str("addressLine1"),
        addressLine2: str("addressLine2"),
        mapsUrl: typeof r.mapsUrl === "string" && /^https:\/\//.test(r.mapsUrl) ? r.mapsUrl : "",
        hours,
        hoursNote: typeof r.hoursNote === "string" ? r.hoursNote.trim().slice(0, 200) : "",
        socials,
        seoTitle: str("seoTitle"),
        seoDescription: str("seoDescription"),
    }
}

export const getSiteSettings = cache(async (): Promise<SiteSettingsData> => {
    try {
        const row = await prisma.siteSetting.findUnique({ where: { id: "site" }, select: { data: true } })
        return normalizeSiteSettings(row?.data)
    } catch (err) {
        console.error("getSiteSettings: using defaults", err)
        return DEFAULT_SITE_SETTINGS
    }
})

/** A Google Maps link: the saved one, else a search for the address. */
export function mapsHref(s: SiteSettingsData): string {
    return s.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${s.addressLine1}, ${s.addressLine2}`)}`
}

/** Published page content merged over the page's defaults. */
export const getPageContent = cache(async (key: string): Promise<Record<string, FieldValue>> => {
    const def = pageDef(key)
    const defaults = def?.defaults ?? {}
    try {
        const row = await prisma.siteContent.findUnique({ where: { key }, select: { published: true } })
        const published = asObject(row?.published)
        const merged: Record<string, FieldValue> = { ...defaults }
        for (const f of def?.fields ?? []) {
            const v = published[f.name] as FieldValue | undefined
            // Empty lists/strings fall back to the default so a page never goes blank
            if (v != null && !(Array.isArray(v) && v.length === 0) && v !== "") merged[f.name] = v
        }
        return merged
    } catch (err) {
        console.error(`getPageContent(${key}): using defaults`, err)
        return { ...defaults }
    }
})

export interface PublicItem {
    id: string
    slug: string | null
    data: Record<string, FieldValue>
    createdAt: Date
}

/** Published items of a kind that may be shown (confirmed, when the kind needs it), in order. */
export const getPublishedItems = cache(async (kind: ItemKind): Promise<PublicItem[]> => {
    const def = itemKindDef(kind)
    try {
        const rows = await prisma.siteItem.findMany({
            where: { kind, status: "published", ...(def?.confirmLabel ? { confirmed: true } : {}) },
            orderBy: [{ sort: "asc" }, { createdAt: "asc" }],
            select: { id: true, slug: true, data: true, createdAt: true },
        })
        return rows.map((r) => ({ id: r.id, slug: r.slug, data: asObject(r.data) as Record<string, FieldValue>, createdAt: r.createdAt }))
    } catch (err) {
        console.error(`getPublishedItems(${kind}) failed`, err)
        return []
    }
})

export async function getPublishedItem(kind: ItemKind, slug: string): Promise<PublicItem | null> {
    return (await getPublishedItems(kind)).find((i) => i.slug === slug) ?? null
}

/** Helpers for reading typed values out of content */
export const text = (v: FieldValue | undefined): string => (typeof v === "string" ? v : v == null ? "" : String(v))
export const list = <T = string>(v: FieldValue | undefined): T[] => (Array.isArray(v) ? (v as T[]) : [])

/** Each service's published one-liner (for cards and menus), by slug. */
export async function getServiceShorts(slugs: string[]): Promise<Record<string, string>> {
    const entries = await Promise.all(slugs.map(async (slug) => [slug, text((await getPageContent(`service:${slug}`)).short)] as const))
    return Object.fromEntries(entries)
}

// ---------------------------------------------------------------- legal pages

export interface LegalPageContent {
    def: LegalDef
    summary: Inline[]
    sections: LegalDocSection[]
    /** "15 October 2026" */
    updated: string
}

const LEGAL_DATE = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Kolkata" })

/**
 * A legal page as visitors see it: the published text over the built-in one,
 * "last updated" from the publish date. null when the page is draft-only and
 * not published yet. If saved text can't be read, the built-in text is shown.
 */
export const getLegalPage = cache(async (key: string): Promise<LegalPageContent | null> => {
    const def = legalDef(key)
    if (!def) return null
    let row: { published: unknown; publishedAt: Date | null } | null = null
    try {
        row = await prisma.siteContent.findUnique({ where: { key }, select: { published: true, publishedAt: true } })
    } catch (err) {
        console.error(`getLegalPage(${key}): using built-in text`, err)
    }
    const published = asObject(row?.published)
    if (def.draftOnly && !row?.publishedAt) return null
    const pick = (name: "summary" | "body") => (typeof published[name] === "string" && (published[name] as string).trim() ? (published[name] as string) : def[name])
    let summary: Inline[]
    let sections: LegalDocSection[]
    try {
        summary = parseInline(pick("summary"))
        sections = parseLegal(pick("body"))
    } catch (err) {
        console.error(`getLegalPage(${key}): saved text can't be read, using built-in text`, err)
        summary = parseInline(def.summary)
        sections = parseLegal(def.body)
    }
    return { def, summary, sections, updated: row?.publishedAt ? LEGAL_DATE.format(row.publishedAt) : def.builtInUpdated }
})

/** Legal pages visitors can open (draft-only ones once published), for the footer, sitemap and "Related policies". */
export const getLegalLinks = cache(async (): Promise<{ href: string; label: string }[]> => {
    const draftKeys = LEGAL_DEFS.filter((d) => d.draftOnly).map((d) => d.key)
    let live = new Set<string>()
    try {
        const rows = await prisma.siteContent.findMany({ where: { key: { in: draftKeys }, publishedAt: { not: null } }, select: { key: true } })
        live = new Set(rows.map((r) => r.key))
    } catch (err) {
        console.error("getLegalLinks: draft-only pages left out", err)
    }
    return LEGAL_DEFS.filter((d) => !d.draftOnly || live.has(d.key)).map((d) => ({ href: d.path, label: d.label }))
})
