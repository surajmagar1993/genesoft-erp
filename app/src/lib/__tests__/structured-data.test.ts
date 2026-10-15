import { describe, expect, it } from "vitest"
import { DEFAULT_SITE_SETTINGS, type SiteSettingsData } from "@/lib/site-cms-shared"
import { jobPostingLd, ldJson, organizationLd, postalAddress, serviceLd, softwareLd } from "@/lib/structured-data"
import { pageMeta } from "@/lib/seo"

const base = "https://genesoftinfotech.com"

describe("structured data", () => {
    it("reads the postcode and locality from the address", () => {
        expect(postalAddress({ addressLine1: "Shivtirtha Bungalow", addressLine2: "Lohegaon, Pune, Maharashtra 411032" })).toEqual({
            "@type": "PostalAddress",
            streetAddress: "Shivtirtha Bungalow",
            addressLocality: "Lohegaon, Pune, Maharashtra",
            postalCode: "411032",
            addressCountry: "IN",
        })
    })

    it("company: hours, map and social links only when set", () => {
        const bare = organizationLd(base, DEFAULT_SITE_SETTINGS)
        expect(bare).not.toHaveProperty("openingHoursSpecification")
        expect(bare).not.toHaveProperty("sameAs")
        expect(bare).not.toHaveProperty("hasMap")
        const full: SiteSettingsData = {
            ...DEFAULT_SITE_SETTINGS,
            mapsUrl: "https://maps.app.goo.gl/x",
            hours: [
                { day: "Monday", closed: false, open: "10:00", close: "19:00" },
                { day: "Sunday", closed: true, open: "10:00", close: "19:00" },
            ],
            socials: [{ network: "LinkedIn", url: "https://www.linkedin.com/company/x" }],
        }
        const ld = organizationLd(base, full)
        expect(ld.openingHoursSpecification).toEqual([{ "@type": "OpeningHoursSpecification", dayOfWeek: "https://schema.org/Monday", opens: "10:00", closes: "19:00" }])
        expect(ld.sameAs).toEqual(["https://www.linkedin.com/company/x"])
        expect(ld.hasMap).toBe("https://maps.app.goo.gl/x")
    })

    it("service pages add their questions", () => {
        expect(serviceLd(base, { name: "IT Support", path: "/services/it-support", description: "d" })).toHaveLength(1)
        const [svc, faq] = serviceLd(base, { name: "IT Support", path: "/services/it-support", description: "d", faqs: [{ q: "Q?", a: "A." }] })
        expect(svc.url).toBe(`${base}/services/it-support`)
        expect(faq).toMatchObject({ "@type": "FAQPage", mainEntity: [{ name: "Q?", acceptedAnswer: { text: "A." } }] })
    })

    it("Genesoft ERP offers its free plan", () => {
        expect(softwareLd(base, "d")).toMatchObject({ "@type": "SoftwareApplication", offers: { price: "0" } })
    })

    it("job posts: remote vs office, type and escaped text", () => {
        const job = { slug: "dev", title: "Dev", about: "Build <apps> & more", responsibilities: ["Code"], requirements: [], type: "Full-time", location: "Pune", postedAt: new Date("2026-10-15T10:00:00Z") }
        const office = jobPostingLd(base, DEFAULT_SITE_SETTINGS, job)
        expect(office).toMatchObject({ employmentType: "FULL_TIME", datePosted: "2026-10-15", jobLocation: { address: { postalCode: "411032" } } })
        expect(office.description).toContain("Build &lt;apps&gt; &amp; more")
        expect(office.description).toContain("<li>Code</li>")
        expect(jobPostingLd(base, DEFAULT_SITE_SETTINGS, { ...job, location: "Remote (India)" })).toMatchObject({ jobLocationType: "TELECOMMUTE" })
    })

    it("can't break out of the script tag", () => {
        expect(ldJson({ name: "</script><script>alert(1)</script>" })).not.toContain("<")
    })

    it("page previews use the site picture unless the page has its own", () => {
        const m = pageMeta({ title: "T", description: "D", path: "/about" })
        expect(m.alternates?.canonical).toBe("/about")
        expect(m.openGraph).toMatchObject({ url: "/about", siteName: "Genesoft Infotech", images: [{ url: "/og-image.png" }] })
        expect(pageMeta({ title: "T", description: "D", path: "/p", image: "https://x/y.png" }).openGraph).toMatchObject({ images: [{ url: "https://x/y.png" }] })
    })
})
