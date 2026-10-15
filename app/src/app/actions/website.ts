"use server"

import type { Prisma } from "@prisma/client"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { toActionResult, type ActionResult } from "@/lib/action-result"
import { logAdminAudit, requireSuperAdmin } from "@/lib/super-admin"
import { imageKind, isOwnStorageUrl, removeFiles, signedDownloadUrl, uploadPublicFile } from "@/lib/storage"
import {
    ITEM_KINDS,
    LEAD_STATUSES,
    PAGE_DEFS,
    SOCIAL_NETWORKS,
    WEEK_DAYS,
    itemKindDef,
    normalizeSiteSettings,
    pageDef,
    slugify,
    textToValue,
    valueToText,
    type FieldValue,
    type ItemKind,
    type LeadStatus,
    type SiteSettingsData,
} from "@/lib/site-cms"
import { OWNER_TODO } from "@/lib/legal-markdown"

/**
 * Super Admin → Website. Every action checks for a super admin and is written
 * to Admin Audit. Public pages read the published results via src/lib/site-cms.ts.
 */

const isSiteImage = (url: string) => isOwnStorageUrl(url, "site-media")
const json = (v: unknown) => v as Prisma.InputJsonValue

function refreshSite() {
    revalidatePath("/", "layout")
}

// ---------------------------------------------------------------- overview

export async function getWebsiteOverview() {
    await requireSuperAdmin()
    const [newLeads, items, drafts, media] = await Promise.all([
        prisma.siteLead.count({ where: { status: "new" } }),
        prisma.siteItem.groupBy({ by: ["kind", "status"], _count: { _all: true } }),
        prisma.siteContent.findMany({ select: { key: true, draft: true, published: true } }),
        prisma.siteMedia.count({ where: { bucket: "site-media" } }),
    ])
    const unpublished = drafts.filter((d) => JSON.stringify(d.draft) !== JSON.stringify(d.published ?? {})).map((d) => d.key)
    return {
        newLeads,
        media,
        unpublishedPages: unpublished,
        items: ITEM_KINDS.map((k) => ({
            kind: k.kind,
            label: k.label,
            published: items.find((i) => i.kind === k.kind && i.status === "published")?._count._all ?? 0,
            draft: items.find((i) => i.kind === k.kind && i.status === "draft")?._count._all ?? 0,
        })),
    }
}

// ---------------------------------------------------------------- settings

export async function getSiteSettingsAdmin(): Promise<SiteSettingsData> {
    await requireSuperAdmin()
    const row = await prisma.siteSetting.findUnique({ where: { id: "site" }, select: { data: true } })
    return normalizeSiteSettings(row?.data)
}

async function _saveSiteSettings(input: SiteSettingsData) {
    const admin = await requireSuperAdmin()
    const email = (v: string, label: string) => {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) throw new Error(`${label}: enter a valid email address.`)
        return v.trim().toLowerCase()
    }
    const phone = (v: string, label: string) => {
        if (!/^[+()\d\s-]{6,20}$/.test(v.trim())) throw new Error(`${label}: enter a valid phone number.`)
        return v.trim()
    }
    const hhmm = (v: string) => (/^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : null)
    const hours = (input.hours || []).filter((h) => WEEK_DAYS.includes(h.day)).map((h) => {
        const open = hhmm(h.open), close = hhmm(h.close)
        if (!h.closed && (!open || !close || open >= close)) throw new Error(`${h.day}: enter opening and closing times (closing after opening), or mark it closed.`)
        return { day: h.day, closed: !!h.closed, open: open || "10:00", close: close || "19:00" }
    })
    const socials = (input.socials || [])
        .filter((s) => s.url?.trim())
        .map((s) => {
            if (!SOCIAL_NETWORKS.includes(s.network)) throw new Error("Unknown social network.")
            if (!/^https:\/\/[^\s]+$/.test(s.url.trim())) throw new Error(`${s.network}: enter a full https:// link.`)
            return { network: s.network, url: s.url.trim() }
        })
    const mapsUrl = (input.mapsUrl || "").trim()
    if (mapsUrl && !/^https:\/\/[^\s]+$/.test(mapsUrl)) throw new Error("Google Maps link: enter a full https:// link.")
    const req = (v: string, label: string, max: number) => {
        const t = (v || "").trim()
        if (!t) throw new Error(`${label} is required.`)
        if (t.length > max) throw new Error(`${label} is too long.`)
        return t
    }
    const data: SiteSettingsData = {
        phone: phone(input.phone, "Phone"),
        whatsapp: phone(input.whatsapp, "WhatsApp number"),
        email: email(input.email, "General email"),
        careersEmail: email(input.careersEmail, "Careers email"),
        addressLine1: req(input.addressLine1, "Address line 1", 150),
        addressLine2: req(input.addressLine2, "Address line 2", 150),
        mapsUrl,
        hours,
        hoursNote: (input.hoursNote || "").trim().slice(0, 200),
        socials,
        seoTitle: req(input.seoTitle, "Search title", 120),
        seoDescription: req(input.seoDescription, "Search description", 300),
    }
    await prisma.siteSetting.upsert({
        where: { id: "site" },
        update: { data: json(data), updatedBy: admin.id },
        create: { id: "site", data: json(data), updatedBy: admin.id },
    })
    await logAdminAudit(admin, "WEBSITE_SETTINGS_UPDATE", { id: "site", type: "WEBSITE" })
    refreshSite()
    return data
}
export async function saveSiteSettings(input: SiteSettingsData): Promise<ActionResult<SiteSettingsData>> {
    return toActionResult(() => _saveSiteSettings(input))
}

// ---------------------------------------------------------------- pages

export async function listPagesAdmin() {
    await requireSuperAdmin()
    const rows = await prisma.siteContent.findMany({ select: { key: true, draft: true, published: true, publishedAt: true, updatedAt: true } })
    return PAGE_DEFS.map((p) => {
        const r = rows.find((x) => x.key === p.key)
        return {
            key: p.key,
            label: p.label,
            path: p.path,
            group: p.group ?? "Pages",
            draftOnly: !!p.draftOnly,
            publishedAt: r?.publishedAt?.toISOString() ?? null,
            unpublished: !!r && JSON.stringify(r.draft) !== JSON.stringify(r.published ?? {}),
            customised: !!r?.published,
        }
    })
}

export async function getPageAdmin(key: string) {
    await requireSuperAdmin()
    const def = pageDef(key)
    if (!def) throw new Error("Unknown page")
    const [row, versions] = await Promise.all([
        prisma.siteContent.findUnique({ where: { key } }),
        prisma.siteContentVersion.findMany({ where: { key }, orderBy: { publishedAt: "desc" }, take: 20, select: { id: true, publishedAt: true } }),
    ])
    const source = (row?.draft && Object.keys(row.draft as object).length ? row.draft : row?.published) as Record<string, FieldValue> | null
    const values = Object.fromEntries(def.fields.map((f) => [f.name, valueToText(f, (source && f.name in source ? source[f.name] : def.defaults[f.name]) ?? null)]))
    return {
        key,
        label: def.label,
        path: def.path,
        draftOnly: !!def.draftOnly,
        fields: def.fields,
        values,
        publishedAt: row?.publishedAt?.toISOString() ?? null,
        unpublished: !!row && JSON.stringify(row.draft) !== JSON.stringify(row.published ?? {}),
        versions: versions.map((v) => ({ id: v.id, publishedAt: v.publishedAt.toISOString() })),
    }
}

function parsePage(key: string, values: Record<string, string>) {
    const def = pageDef(key)
    if (!def) throw new Error("Unknown page")
    return Object.fromEntries(def.fields.map((f) => [f.name, textToValue(f, values[f.name], isSiteImage)]))
}

async function _savePageDraft(key: string, values: Record<string, string>) {
    const admin = await requireSuperAdmin()
    const draft = parsePage(key, values)
    await prisma.siteContent.upsert({
        where: { key },
        update: { draft: json(draft), updatedBy: admin.id },
        create: { key, draft: json(draft), updatedBy: admin.id },
    })
    return { saved: true as const }
}
export async function savePageDraft(key: string, values: Record<string, string>): Promise<ActionResult<{ saved: true }>> {
    return toActionResult(() => _savePageDraft(key, values))
}

async function _publishPage(key: string, values: Record<string, string>) {
    const admin = await requireSuperAdmin()
    const data = parsePage(key, values)
    if (key.startsWith("legal:") && JSON.stringify(data).includes(OWNER_TODO)) {
        throw new Error(`Fill in every "${OWNER_TODO} …]" note before publishing. You can save it as a draft meanwhile.`)
    }
    const now = new Date()
    await prisma.$transaction([
        prisma.siteContent.upsert({
            where: { key },
            update: { draft: json(data), published: json(data), publishedAt: now, updatedBy: admin.id },
            create: { key, draft: json(data), published: json(data), publishedAt: now, updatedBy: admin.id },
        }),
        prisma.siteContentVersion.create({ data: { key, data: json(data), publishedAt: now, publishedBy: admin.id } }),
    ])
    await logAdminAudit(admin, "WEBSITE_PAGE_PUBLISH", { id: key, type: "WEBSITE_PAGE" })
    refreshSite()
    return { publishedAt: now.toISOString() }
}
export async function publishPage(key: string, values: Record<string, string>): Promise<ActionResult<{ publishedAt: string }>> {
    return toActionResult(() => _publishPage(key, values))
}

/** Puts an earlier published version back into the draft (publish to make it live). */
async function _restorePageVersion(versionId: string) {
    const admin = await requireSuperAdmin()
    const v = await prisma.siteContentVersion.findUnique({ where: { id: versionId } })
    if (!v) throw new Error("Version not found")
    await prisma.siteContent.update({ where: { key: v.key }, data: { draft: json(v.data), updatedBy: admin.id } })
    return { key: v.key }
}
export async function restorePageVersion(versionId: string): Promise<ActionResult<{ key: string }>> {
    return toActionResult(() => _restorePageVersion(versionId))
}

/** Back to the built-in text: removes the saved content so defaults show. */
async function _resetPage(key: string) {
    const admin = await requireSuperAdmin()
    if (!pageDef(key)) throw new Error("Unknown page")
    await prisma.siteContent.deleteMany({ where: { key } })
    await logAdminAudit(admin, "WEBSITE_PAGE_RESET", { id: key, type: "WEBSITE_PAGE" })
    refreshSite()
    return { reset: true as const }
}
export async function resetPage(key: string): Promise<ActionResult<{ reset: true }>> {
    return toActionResult(() => _resetPage(key))
}

// ---------------------------------------------------------------- lists

export async function listItemsAdmin(kind: ItemKind) {
    await requireSuperAdmin()
    const def = itemKindDef(kind)
    if (!def) throw new Error("Unknown list")
    const rows = await prisma.siteItem.findMany({ where: { kind, status: { not: "archived" } }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }] })
    return rows.map((r) => {
        const data = r.data as Record<string, FieldValue>
        return {
            id: r.id,
            slug: r.slug,
            status: r.status,
            confirmed: r.confirmed,
            sort: r.sort,
            title: String(data[def.titleField] ?? "(untitled)"),
            values: Object.fromEntries(def.fields.map((f) => [f.name, valueToText(f, data[f.name] ?? null)])),
            updatedAt: r.updatedAt.toISOString(),
        }
    })
}

async function _saveItem(input: { id?: string; kind: ItemKind; values: Record<string, string>; status: "draft" | "published"; confirmed: boolean }) {
    const admin = await requireSuperAdmin()
    const def = itemKindDef(input.kind)
    if (!def) throw new Error("Unknown list")
    if (input.status !== "draft" && input.status !== "published") throw new Error("Invalid status")
    const data = Object.fromEntries(def.fields.map((f) => [f.name, textToValue(f, input.values[f.name], isSiteImage)]))
    if (input.status === "published" && def.confirmLabel && !input.confirmed) {
        throw new Error(`Tick "${def.confirmLabel}" before publishing.`)
    }
    let slug: string | null = null
    if (def.hasSlug) {
        const base = slugify(String(data[def.titleField] ?? "")) || "item"
        slug = base
        for (let n = 2; ; n++) {
            const clash = await prisma.siteItem.findFirst({ where: { kind: input.kind, slug, ...(input.id ? { id: { not: input.id } } : {}) }, select: { id: true } })
            if (!clash) break
            slug = `${base}-${n}`
        }
    }
    const confirmed = def.confirmLabel ? !!input.confirmed : true
    let id = input.id
    if (id) {
        const { count } = await prisma.siteItem.updateMany({ where: { id, kind: input.kind }, data: { data: json(data), slug, status: input.status, confirmed, updatedBy: admin.id } })
        if (!count) throw new Error("Item not found")
    } else {
        const last = await prisma.siteItem.aggregate({ where: { kind: input.kind }, _max: { sort: true } })
        id = (await prisma.siteItem.create({ data: { kind: input.kind, data: json(data), slug, status: input.status, confirmed, sort: (last._max.sort ?? 0) + 10, updatedBy: admin.id }, select: { id: true } })).id
    }
    await logAdminAudit(admin, "WEBSITE_ITEM_SAVE", { id, type: `WEBSITE_${input.kind.toUpperCase()}` }, { status: input.status, confirmed })
    refreshSite()
    return { id, slug }
}
export async function saveItem(input: Parameters<typeof _saveItem>[0]): Promise<ActionResult<{ id: string; slug: string | null }>> {
    return toActionResult(() => _saveItem(input))
}

async function _deleteItem(id: string) {
    const admin = await requireSuperAdmin()
    const item = await prisma.siteItem.findUnique({ where: { id }, select: { kind: true } })
    if (!item) throw new Error("Item not found")
    await prisma.siteItem.delete({ where: { id } })
    await logAdminAudit(admin, "WEBSITE_ITEM_DELETE", { id, type: `WEBSITE_${item.kind.toUpperCase()}` })
    refreshSite()
    return { deleted: true as const }
}
export async function deleteItem(id: string): Promise<ActionResult<{ deleted: true }>> {
    return toActionResult(() => _deleteItem(id))
}

async function _moveItem(id: string, direction: "up" | "down") {
    await requireSuperAdmin()
    const item = await prisma.siteItem.findUnique({ where: { id } })
    if (!item) throw new Error("Item not found")
    const siblings = await prisma.siteItem.findMany({ where: { kind: item.kind, status: { not: "archived" } }, orderBy: [{ sort: "asc" }, { createdAt: "asc" }], select: { id: true } })
    const i = siblings.findIndex((s) => s.id === id)
    const j = direction === "up" ? i - 1 : i + 1
    if (i < 0 || j < 0 || j >= siblings.length) return { moved: false }
    ;[siblings[i], siblings[j]] = [siblings[j], siblings[i]]
    await prisma.$transaction(siblings.map((s, n) => prisma.siteItem.update({ where: { id: s.id }, data: { sort: (n + 1) * 10 } })))
    refreshSite()
    return { moved: true }
}
export async function moveItem(id: string, direction: "up" | "down"): Promise<ActionResult<{ moved: boolean }>> {
    return toActionResult(() => _moveItem(id, direction))
}

// ---------------------------------------------------------------- media

export async function listMedia() {
    await requireSuperAdmin()
    const rows = await prisma.siteMedia.findMany({ where: { bucket: "site-media" }, orderBy: { createdAt: "desc" } })
    return rows.map((m) => ({ id: m.id, url: m.url!, alt: m.alt, mime: m.mime, bytes: m.bytes, createdAt: m.createdAt.toISOString() }))
}

async function _uploadMedia(formData: FormData) {
    const admin = await requireSuperAdmin()
    const file = formData.get("file")
    const alt = String(formData.get("alt") || "").trim().slice(0, 200)
    if (!(file instanceof File) || file.size === 0) throw new Error("Choose an image to upload.")
    if (file.size > 5 * 1024 * 1024) throw new Error("Images must be 5 MB or smaller.")
    if (!alt) throw new Error("Describe the image (alt text) for people using screen readers.")
    const buf = Buffer.from(await file.arrayBuffer())
    const kind = imageKind(buf)
    if (!kind) throw new Error("Upload a PNG, JPG or WebP image.")
    const path = `images/${crypto.randomUUID()}.${kind.ext}`
    const url = await uploadPublicFile("site-media", path, buf, kind.type)
    const m = await prisma.siteMedia.create({ data: { bucket: "site-media", path, url, alt, mime: kind.type, bytes: buf.length, uploadedBy: admin.id } })
    await logAdminAudit(admin, "WEBSITE_MEDIA_UPLOAD", { id: m.id, type: "WEBSITE_MEDIA" })
    return { id: m.id, url }
}
export async function uploadMedia(formData: FormData): Promise<ActionResult<{ id: string; url: string }>> {
    return toActionResult(() => _uploadMedia(formData))
}

async function _updateMediaAlt(id: string, alt: string) {
    await requireSuperAdmin()
    const a = alt.trim().slice(0, 200)
    if (!a) throw new Error("Alt text can't be empty.")
    const { count } = await prisma.siteMedia.updateMany({ where: { id, bucket: "site-media" }, data: { alt: a } })
    if (!count) throw new Error("Image not found")
    return { saved: true as const }
}
export async function updateMediaAlt(id: string, alt: string): Promise<ActionResult<{ saved: true }>> {
    return toActionResult(() => _updateMediaAlt(id, alt))
}

async function _deleteMedia(id: string) {
    const admin = await requireSuperAdmin()
    const m = await prisma.siteMedia.findFirst({ where: { id, bucket: "site-media" } })
    if (!m) throw new Error("Image not found")
    // Refuse while a page or list item still uses it
    const url = m.url || ""
    const [inContent, inItems] = await Promise.all([
        prisma.$queryRaw<{ n: bigint }[]>`select count(*)::bigint n from site_content where draft::text like ${"%" + url + "%"} or coalesce(published::text, '') like ${"%" + url + "%"}`,
        prisma.$queryRaw<{ n: bigint }[]>`select count(*)::bigint n from site_items where data::text like ${"%" + url + "%"}`,
    ])
    if (Number(inContent[0]?.n ?? 0) + Number(inItems[0]?.n ?? 0) > 0) throw new Error("This image is still used on the website. Remove it there first.")
    await prisma.siteMedia.delete({ where: { id } })
    await removeFiles("site-media", [m.path])
    await logAdminAudit(admin, "WEBSITE_MEDIA_DELETE", { id, type: "WEBSITE_MEDIA" })
    return { deleted: true as const }
}
export async function deleteMedia(id: string): Promise<ActionResult<{ deleted: true }>> {
    return toActionResult(() => _deleteMedia(id))
}

// ---------------------------------------------------------------- leads

export async function listLeads(filter: { status?: string; kind?: string } = {}) {
    await requireSuperAdmin()
    const status = LEAD_STATUSES.includes(filter.status as LeadStatus) ? (filter.status as LeadStatus) : undefined
    const kind = ["contact", "quote", "application"].includes(filter.kind || "") ? filter.kind : undefined
    const [rows, counts] = await Promise.all([
        prisma.siteLead.findMany({ where: { ...(status ? { status } : { status: { not: "spam" } }), ...(kind ? { kind } : {}) }, orderBy: { createdAt: "desc" }, take: 200 }),
        prisma.siteLead.groupBy({ by: ["status"], _count: { _all: true } }),
    ])
    return {
        counts: Object.fromEntries(LEAD_STATUSES.map((s) => [s, counts.find((c) => c.status === s)?._count._all ?? 0])) as Record<LeadStatus, number>,
        leads: rows.map((l) => ({
            id: l.id,
            kind: l.kind,
            topic: l.topic,
            name: l.name,
            email: l.email,
            phone: l.phone,
            company: l.company,
            data: l.data as Record<string, unknown>,
            status: l.status as LeadStatus,
            notes: l.notes,
            createdAt: l.createdAt.toISOString(),
        })),
    }
}

async function _updateLead(id: string, patch: { status?: string; notes?: string }) {
    const admin = await requireSuperAdmin()
    const data: Prisma.SiteLeadUpdateInput = { updatedBy: admin.id }
    if (patch.status !== undefined) {
        if (!LEAD_STATUSES.includes(patch.status as LeadStatus)) throw new Error("Invalid status")
        data.status = patch.status
    }
    if (patch.notes !== undefined) data.notes = patch.notes.trim().slice(0, 5000) || null
    const { count } = await prisma.siteLead.updateMany({ where: { id }, data: data as Prisma.SiteLeadUpdateManyMutationInput })
    if (!count) throw new Error("Lead not found")
    return { saved: true as const }
}
export async function updateLead(id: string, patch: { status?: string; notes?: string }): Promise<ActionResult<{ saved: true }>> {
    return toActionResult(() => _updateLead(id, patch))
}

/** A 5-minute download link for an applicant's CV. */
async function _getCvLink(leadId: string) {
    const admin = await requireSuperAdmin()
    const lead = await prisma.siteLead.findFirst({ where: { id: leadId, kind: "application" }, select: { data: true } })
    const mediaId = (lead?.data as { cvMediaId?: string } | null)?.cvMediaId
    const media = mediaId ? await prisma.siteMedia.findFirst({ where: { id: mediaId, bucket: "site-private" } }) : null
    if (!media) throw new Error("No CV attached to this application.")
    await logAdminAudit(admin, "WEBSITE_CV_DOWNLOAD", { id: leadId, type: "WEBSITE_LEAD" })
    return { url: await signedDownloadUrl("site-private", media.path, 300) }
}
export async function getCvLink(leadId: string): Promise<ActionResult<{ url: string }>> {
    return toActionResult(() => _getCvLink(leadId))
}
