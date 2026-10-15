import { describe, expect, it, vi } from "vitest"

vi.mock("next/headers", () => ({ headers: async () => new Headers({ "x-forwarded-for": "203.0.113.9" }) }))

import { prisma } from "@/lib/prisma"
import {
    getPageAdmin,
    listItemsAdmin,
    listLeads,
    publishPage,
    resetPage,
    restorePageVersion,
    saveItem,
    savePageDraft,
    saveSiteSettings,
    updateLead,
    getSiteSettingsAdmin,
} from "@/app/actions/website"
import { getPageContent, getPublishedItems, getSiteSettings } from "@/lib/site-cms"
import { sendContactMessage } from "@/app/actions/public/contact"
import { actAs, createTestTenant } from "./helpers"

async function superAdmin() {
    const { user } = await createTestTenant({ role: "SUPER_ADMIN" })
    actAs(user)
    return user
}

describe("Super Admin → Website", () => {
    it("only the platform super admin can edit the website", async () => {
        const { user } = await createTestTenant({ role: "ADMIN" })
        actAs(user)
        await expect(getSiteSettingsAdmin()).rejects.toThrow(/Super Admin/)
        expect(await savePageDraft("page:home", {})).toMatchObject({ success: false, error: expect.stringMatching(/Super Admin/) })
    })

    it("site settings are checked and then used by the public site", async () => {
        await superAdmin()
        const base = await getSiteSettingsAdmin()
        expect(await saveSiteSettings({ ...base, email: "nope" })).toMatchObject({ success: false, error: expect.stringMatching(/General email/) })
        expect(await saveSiteSettings({ ...base, socials: [{ network: "LinkedIn", url: "http://insecure.example" }] })).toMatchObject({ success: false, error: expect.stringMatching(/https/) })
        expect(await saveSiteSettings({ ...base, hours: [{ day: "Monday", closed: false, open: "19:00", close: "10:00" }] })).toMatchObject({ success: false, error: expect.stringMatching(/Monday/) })

        const ok = await saveSiteSettings({
            ...base,
            mapsUrl: "https://maps.app.goo.gl/example",
            hours: [{ day: "Monday", closed: false, open: "10:00", close: "19:00" }, { day: "Sunday", closed: true, open: "10:00", close: "19:00" }],
            socials: [{ network: "LinkedIn", url: "https://www.linkedin.com/company/example" }],
        })
        expect(ok.success).toBe(true)
        const pub = await getSiteSettings()
        expect(pub.mapsUrl).toBe("https://maps.app.goo.gl/example")
        expect(pub.hours).toHaveLength(2)
        expect(pub.socials).toEqual([{ network: "LinkedIn", url: "https://www.linkedin.com/company/example" }])
        expect(await prisma.adminAuditLog.count({ where: { action: "WEBSITE_SETTINGS_UPDATE" } })).toBeGreaterThan(0)
    })

    it("pages: a draft isn't public, publish makes it live, history restores, reset goes back to the built-in text", async () => {
        await superAdmin()
        const builtIn = (await getPageContent("page:home")).heading
        const page = await getPageAdmin("page:home")
        expect(page.values.heading).toBe(builtIn)

        expect(await savePageDraft("page:home", { ...page.values, heading: "" })).toMatchObject({ success: false, error: expect.stringMatching(/Heading is required/) })
        expect((await savePageDraft("page:home", { ...page.values, heading: "Draft heading" })).success).toBe(true)
        expect((await getPageContent("page:home")).heading).toBe(builtIn)

        expect((await publishPage("page:home", { ...page.values, heading: "First live heading" })).success).toBe(true)
        expect((await getPageContent("page:home")).heading).toBe("First live heading")
        expect((await publishPage("page:home", { ...page.values, heading: "Second live heading" })).success).toBe(true)

        const after = await getPageAdmin("page:home")
        expect(after.versions).toHaveLength(2)
        expect((await restorePageVersion(after.versions[1].id)).success).toBe(true)
        expect((await getPageAdmin("page:home")).values.heading).toBe("First live heading") // back in the draft
        expect((await getPageContent("page:home")).heading).toBe("Second live heading") // still live until published

        expect((await resetPage("page:home")).success).toBe(true)
        expect((await getPageContent("page:home")).heading).toBe(builtIn)
    })

    it("service pages parse 'Title | text' and 'Question | Answer' lines", async () => {
        await superAdmin()
        const page = await getPageAdmin("service:it-support")
        expect(await publishPage("service:it-support", { ...page.values, faqs: "No bar here" })).toMatchObject({ success: false, error: expect.stringMatching(/Question \| Answer/) })
        expect((await publishPage("service:it-support", { ...page.values, faqs: "Do you do AMC? | Yes, yearly contracts." })).success).toBe(true)
        expect((await getPageContent("service:it-support")).faqs).toEqual([{ q: "Do you do AMC?", a: "Yes, yearly contracts." }])
    })

    it("lists: unconfirmed proof can't be published, drafts never show, images must come from the media library", async () => {
        await superAdmin()
        const testimonial = { quote: "Great work on our ERP.", name: "Asha Rao", role: "Director", company: "Rao Traders", photo: "" }
        expect(await saveItem({ kind: "testimonial", values: testimonial, status: "published", confirmed: false })).toMatchObject({ success: false, error: expect.stringMatching(/agreed/) })
        expect((await saveItem({ kind: "testimonial", values: testimonial, status: "draft", confirmed: false })).success).toBe(true)
        expect(await getPublishedItems("testimonial")).toHaveLength(0)
        const ok = await saveItem({ kind: "testimonial", values: testimonial, status: "published", confirmed: true })
        expect(ok.success).toBe(true)
        expect((await getPublishedItems("testimonial")).map((t) => t.data.name)).toEqual(["Asha Rao"])

        expect(await saveItem({ kind: "client", values: { name: "Outside Co", logo: "https://evil.example/logo.png", website: "" }, status: "draft", confirmed: false })).toMatchObject({
            success: false,
            error: expect.stringMatching(/Media library/),
        })

        // Jobs need no tick; slugs are unique
        const job = { title: "Web Developer", department: "", type: "Full-time", location: "Pune", experience: "", about: "Build things.", responsibilities: "", requirements: "" }
        const a = await saveItem({ kind: "job", values: job, status: "published", confirmed: false })
        const b = await saveItem({ kind: "job", values: job, status: "published", confirmed: false })
        expect(a.success && b.success && a.data.slug !== b.data.slug).toBe(true)
        expect((await listItemsAdmin("job")).length).toBeGreaterThanOrEqual(2)
    })

    it("website forms land in the leads inbox, where status and notes can be updated", async () => {
        const res = await sendContactMessage({ name: "Ravi Kumar", email: "ravi@example.test", topic: "Software Development", message: "We need an inventory app for two shops." })
        expect(res.success).toBe(true)
        await superAdmin()
        const { leads, counts } = await listLeads({ kind: "contact" })
        const lead = leads.find((l) => l.email === "ravi@example.test")!
        expect(lead).toMatchObject({ status: "new", topic: "Software Development" })
        expect(counts.new).toBeGreaterThan(0)
        expect((await updateLead(lead.id, { status: "contacted", notes: "Called, sending a quote" })).success).toBe(true)
        expect(await updateLead(lead.id, { status: "unknown" })).toMatchObject({ success: false })
        expect(await prisma.siteLead.findUniqueOrThrow({ where: { id: lead.id } })).toMatchObject({ status: "contacted", notes: "Called, sending a quote" })
    })
})
