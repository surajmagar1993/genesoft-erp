"use server"

import { createHash } from "node:crypto"
import { headers } from "next/headers"
import { Resend } from "resend"
import { prisma } from "@/lib/prisma"
import { PLATFORM } from "@/lib/constants/platform"
import { clientIp } from "@/lib/platform-security"
import { toActionResult, type ActionResult } from "@/lib/action-result"
import { CONTACT_TOPICS, RENTAL_CATEGORIES, RENTAL_PERIODS } from "@/lib/site-content"
import { getPublishedItem, getPublishedItems, getSiteSettings } from "@/lib/site-cms"
import { documentKind, storageConfigured, uploadPrivateFile } from "@/lib/storage"

const WINDOW_MS = 10 * 60 * 1000
const MAX_PER_WINDOW = 3
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function escapeHtml(text: string): string {
    return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!)
}

function oneLine(text: string): string {
    return text.replace(/[\r\n]+/g, " ").trim()
}

interface Visitor {
    name: string
    email: string
    company: string
    phone: string
}

function cleanVisitor(input: { name?: string; email?: string; company?: string; phone?: string }): Visitor {
    const name = oneLine(input.name || "")
    const email = (input.email || "").trim().toLowerCase()
    const company = oneLine(input.company || "")
    const phone = oneLine(input.phone || "")
    if (name.length < 2 || name.length > 100) throw new Error("Please enter your name.")
    if (!EMAIL_RE.test(email) || email.length > 200) throw new Error("Please enter a valid email address.")
    if (company.length > 150) throw new Error("Company name is too long.")
    if (phone && !/^[+()\d\s-]{6,20}$/.test(phone)) throw new Error("Please enter a valid phone number, or leave it empty.")
    return { name, email, company, phone }
}

/**
 * Saves a website form to the Leads inbox (Super Admin → Website → Leads) and
 * emails it to `to` (info@, or careers@ for applications) with the visitor as
 * reply-to. The lead is saved first, so a failed email loses nothing. Each IP
 * gets 3 submissions per 10 minutes (counted in System Logs, which keep only
 * metadata, never the message text).
 */
async function deliver(
    kind: "CONTACT_FORM" | "RENTAL_QUOTE" | "JOB_APPLICATION",
    topic: string,
    v: Visitor,
    rows: [string, string][],
    body: string,
    lead: { data: Record<string, unknown>; to?: string }
) {
    const ip = clientIp(await headers()) || "unknown"
    const ipTag = `ip=${createHash("sha256").update(ip).digest("hex").slice(0, 16)}`
    const recent = await prisma.systemLog.count({
        where: { path: "/contact", message: { contains: ipTag }, timestamp: { gte: new Date(Date.now() - WINDOW_MS) } },
    })
    if (recent >= MAX_PER_WINDOW) throw new Error("You've sent a few messages already. Please wait 10 minutes and try again.")

    const leadKind = kind === "RENTAL_QUOTE" ? "quote" : kind === "JOB_APPLICATION" ? "application" : "contact"
    const saved = await prisma.siteLead.create({
        data: { kind: leadKind, topic, name: v.name, email: v.email, phone: v.phone || null, company: v.company || null, data: { ...lead.data, message: body } },
        select: { id: true },
    })
    await prisma.systemLog.create({
        data: { level: "INFO", path: "/contact", message: `${kind} ${ipTag} topic=${topic} lead=${saved.id}` },
    })

    const apiKey = process.env.RESEND_API_KEY
    const domain = process.env.RESEND_DOMAIN
    if (!apiKey || !domain) {
        console.error(`Website form saved as lead ${saved.id} but not emailed: RESEND_API_KEY / RESEND_DOMAIN missing`)
        return saved.id
    }
    const allRows: [string, string][] = [["Name", v.name], ["Email", v.email], ["Phone", v.phone || "-"], ["Company", v.company || "-"], ["Topic", topic], ...rows]
    const subject =
        kind === "RENTAL_QUOTE" ? `[IT Rentals] Quote request from ${v.name}` : kind === "JOB_APPLICATION" ? `[Careers] Application from ${v.name}: ${topic}` : `[${topic}] Website enquiry from ${v.name}`
    const { error } = await new Resend(apiKey).emails.send({
        from: `Genesoft website <website@${domain}>`,
        to: [lead.to || (await getSiteSettings()).email],
        replyTo: v.email,
        subject,
        text: `${allRows.map(([k, val]) => `${k}: ${val}`).join("\n")}\n\n${body}\n\nAlso in Super Admin → Website → Leads.`,
        html: `<table cellpadding="4" style="border-collapse:collapse;font-family:sans-serif;font-size:14px">${allRows
            .map(([k, val]) => `<tr><td style="color:#6B6762;vertical-align:top"><strong>${escapeHtml(k)}</strong></td><td style="white-space:pre-wrap">${escapeHtml(val)}</td></tr>`)
            .join("")}</table><p style="white-space:pre-wrap;font-family:sans-serif;font-size:14px">${escapeHtml(body)}</p><p style="font-family:sans-serif;font-size:12px;color:#6B6762">Also in Super Admin → Website → Leads.</p>`,
    })
    // The lead is safe in the inbox either way; only log the email failure
    if (error) console.error(`Website form saved as lead ${saved.id} but the email failed:`, error.message)
    return saved.id
}

/** Contact page and service enquiry forms. A filled hidden "website" field means a bot. */
export async function sendContactMessage(input: {
    name: string
    email: string
    company?: string
    phone?: string
    topic: string
    message: string
    website?: string // honeypot
}): Promise<ActionResult<{ sent: true }>> {
    return toActionResult(async () => {
        if (input.website) return { sent: true as const } // bot: pretend success
        const v = cleanVisitor(input)
        const topic = (CONTACT_TOPICS as readonly string[]).includes(input.topic) ? input.topic : "General"
        const message = (input.message || "").trim()
        if (message.length < 10) throw new Error("Please tell us a little more (at least 10 characters).")
        if (message.length > 5000) throw new Error("Your message is too long. Please keep it under 5,000 characters.")
        await deliver("CONTACT_FORM", topic, v, [], message, { data: {} })
        return { sent: true as const }
    })
}

/** IT Rentals quote form: equipment lines, dates and delivery city. */
export async function sendRentalQuote(input: {
    name: string
    email: string
    company?: string
    phone?: string
    items: { category: string; quantity: number; specs?: string }[]
    startDate?: string
    period: string
    city: string
    notes?: string
    website?: string // honeypot
}): Promise<ActionResult<{ sent: true }>> {
    return toActionResult(async () => {
        if (input.website) return { sent: true as const }
        const v = cleanVisitor(input)
        const published = await getPublishedItems("rental_item")
        const categories = [...(published.length ? published.map((i) => String(i.data.name)) : RENTAL_CATEGORIES.map((c) => c.name)), "Other"]
        const items = (Array.isArray(input.items) ? input.items : []).slice(0, 10).map((i) => ({
            category: categories.includes(i.category) ? i.category : "Other",
            quantity: Math.floor(Number(i.quantity)),
            specs: oneLine(String(i.specs || "")).slice(0, 200),
        }))
        if (items.length === 0) throw new Error("Add at least one item you'd like to rent.")
        if (items.some((i) => !(i.quantity >= 1 && i.quantity <= 10000))) throw new Error("Enter a quantity of at least 1 for each item.")
        const period = RENTAL_PERIODS.includes(input.period) ? input.period : "Other"
        const city = oneLine(input.city || "").slice(0, 80)
        if (city.length < 2) throw new Error("Please enter the delivery city.")
        const start = (input.startDate || "").trim()
        if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) throw new Error("Please choose a valid start date.")
        const notes = (input.notes || "").trim().slice(0, 3000)

        const rows: [string, string][] = [
            ["Items", items.map((i) => `${i.quantity} × ${i.category}${i.specs ? ` (${i.specs})` : ""}`).join("\n")],
            ["Start date", start || "Not given"],
            ["Rental period", period],
            ["Delivery city", city],
        ]
        await deliver("RENTAL_QUOTE", "IT Rentals", v, rows, notes || "(no extra notes)", { data: { items, startDate: start || null, period, city } })
        return { sent: true as const }
    })
}

/** Careers: apply for a published job with a CV (PDF or Word, up to 5 MB, stored privately). */
export async function sendJobApplication(formData: FormData): Promise<ActionResult<{ sent: true }>> {
    return toActionResult(async () => {
        if (formData.get("website")) return { sent: true as const }
        const v = cleanVisitor({
            name: String(formData.get("name") || ""),
            email: String(formData.get("email") || ""),
            phone: String(formData.get("phone") || ""),
        })
        const job = await getPublishedItem("job", String(formData.get("job") || ""))
        if (!job) throw new Error("This job is no longer open.")
        const link = String(formData.get("link") || "").trim()
        if (link && !/^https:\/\/[^\s]+$/.test(link)) throw new Error("Enter your LinkedIn or portfolio as a full https:// link, or leave it empty.")
        const note = String(formData.get("message") || "").trim().slice(0, 3000)
        const file = formData.get("cv")
        if (!(file instanceof File) || file.size === 0) throw new Error("Attach your CV (PDF or Word).")
        if (file.size > 5 * 1024 * 1024) throw new Error("Your CV must be 5 MB or smaller.")
        const buf = Buffer.from(await file.arrayBuffer())
        const kind = documentKind(buf)
        if (!kind) throw new Error("Attach your CV as a PDF or Word file.")
        if (!storageConfigured()) throw new Error(`Applications can't be received online right now. Please email your CV to ${PLATFORM.careersEmail}.`)

        const path = `cvs/${new Date().toISOString().slice(0, 7)}/${crypto.randomUUID()}.${kind.ext}`
        await uploadPrivateFile("site-private", path, buf, kind.type)
        const media = await prisma.siteMedia.create({ data: { bucket: "site-private", path, mime: kind.type, bytes: buf.length, alt: `CV: ${v.name}` }, select: { id: true } })
        const title = String(job.data.title || "Job")
        const settings = await getSiteSettings()
        await deliver("JOB_APPLICATION", title, v, [["Job", title], ["Link", link || "-"], ["CV", "Download it in Super Admin → Website → Leads"]], note || "(no message)", {
            data: { job: job.slug, jobTitle: title, link: link || null, cvMediaId: media.id },
            to: settings.careersEmail,
        })
        return { sent: true as const }
    })
}
