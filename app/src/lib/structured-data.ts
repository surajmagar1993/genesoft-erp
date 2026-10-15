/**
 * Structured data (schema.org JSON-LD) for the public website, so search
 * engines can show the company's address, hours, services, Genesoft ERP and
 * job posts. Built only from real, published details: site settings, page
 * content and items from Super Admin → Website. Pure functions; rendered by
 * <JsonLd> (src/components/marketing/json-ld.tsx).
 */
import { PLATFORM } from "@/lib/constants/platform"
import type { SiteSettingsData } from "@/lib/site-cms-shared"

type Ld = Record<string, unknown>

const DAY_URL: Record<string, string> = {
    Monday: "https://schema.org/Monday",
    Tuesday: "https://schema.org/Tuesday",
    Wednesday: "https://schema.org/Wednesday",
    Thursday: "https://schema.org/Thursday",
    Friday: "https://schema.org/Friday",
    Saturday: "https://schema.org/Saturday",
    Sunday: "https://schema.org/Sunday",
}

const abs = (base: string, path: string) => `${base}${path === "/" ? "" : path}`

export const orgId = (base: string) => `${base}/#organization`

/** "Lohegaon, Pune, Maharashtra 411032" → locality and postcode, as far as they can be read. */
export function postalAddress(s: Pick<SiteSettingsData, "addressLine1" | "addressLine2">): Ld {
    const postcode = /\b(\d{6})\b/.exec(s.addressLine2)?.[1]
    const locality = s.addressLine2.replace(/\b\d{6}\b/, "").replace(/[,\s]+$/, "").trim()
    return {
        "@type": "PostalAddress",
        streetAddress: s.addressLine1,
        ...(locality ? { addressLocality: locality } : {}),
        ...(postcode ? { postalCode: postcode } : {}),
        addressCountry: "IN",
    }
}

/** The company: Organization + LocalBusiness, for the home and contact pages. */
export function organizationLd(base: string, s: SiteSettingsData): Ld {
    const open = s.hours.filter((h) => !h.closed)
    return {
        "@context": "https://schema.org",
        "@type": ["Organization", "LocalBusiness"],
        "@id": orgId(base),
        name: PLATFORM.brandName,
        legalName: PLATFORM.legalName,
        url: base,
        logo: `${base}/header.png`,
        image: `${base}/header.png`,
        description: s.seoDescription,
        email: s.email,
        telephone: s.phone,
        address: postalAddress(s),
        ...(s.mapsUrl ? { hasMap: s.mapsUrl } : {}),
        ...(open.length
            ? {
                  openingHoursSpecification: open.map((h) => ({
                      "@type": "OpeningHoursSpecification",
                      dayOfWeek: DAY_URL[h.day],
                      opens: h.open,
                      closes: h.close,
                  })),
              }
            : {}),
        ...(s.socials.length ? { sameAs: s.socials.map((x) => x.url) } : {}),
        contactPoint: [
            { "@type": "ContactPoint", contactType: "customer service", email: s.email, telephone: s.phone, areaServed: "IN", availableLanguage: ["English"] },
        ],
    }
}

/** One of the company's services, with its questions when it has any. */
export function serviceLd(base: string, svc: { name: string; path: string; description: string; faqs?: { q: string; a: string }[] }): Ld[] {
    const out: Ld[] = [
        {
            "@context": "https://schema.org",
            "@type": "Service",
            name: svc.name,
            serviceType: svc.name,
            description: svc.description,
            url: abs(base, svc.path),
            provider: { "@id": orgId(base), "@type": "Organization", name: PLATFORM.brandName, url: base },
            areaServed: { "@type": "Country", name: "India" },
        },
    ]
    if (svc.faqs?.length) {
        out.push({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: svc.faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
        })
    }
    return out
}

/** Genesoft ERP as a web application. The free plan is real, so the offer is 0. */
export function softwareLd(base: string, description: string): Ld {
    return {
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        name: PLATFORM.productName,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web browser",
        description,
        url: `${base}/erp`,
        publisher: { "@id": orgId(base), "@type": "Organization", name: PLATFORM.brandName, url: base },
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR", description: "Free plan and a 15-day free trial of paid features", url: `${base}/erp/pricing` },
    }
}

const EMPLOYMENT: Record<string, string> = { "Full-time": "FULL_TIME", "Part-time": "PART_TIME", Internship: "INTERN", Contract: "CONTRACTOR" }

/** A published job post. Remote jobs are marked as such; others are placed at the location given. */
export function jobPostingLd(
    base: string,
    s: SiteSettingsData,
    job: { slug: string; title: string; about: string; responsibilities: string[]; requirements: string[]; type: string; location: string; postedAt: Date },
): Ld {
    const esc = (t: string) => t.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]!)
    const ul = (items: string[]) => (items.length ? `<ul>${items.map((i) => `<li>${esc(i)}</li>`).join("")}</ul>` : "")
    const description =
        `<p>${esc(job.about).replace(/\n+/g, "</p><p>")}</p>` +
        (job.responsibilities.length ? `<p><strong>You'll work on</strong></p>${ul(job.responsibilities)}` : "") +
        (job.requirements.length ? `<p><strong>You'll bring</strong></p>${ul(job.requirements)}` : "")
    const remote = /remote|work from home/i.test(job.location)
    const own = /pune/i.test(job.location)
    return {
        "@context": "https://schema.org",
        "@type": "JobPosting",
        title: job.title,
        description,
        datePosted: job.postedAt.toISOString().slice(0, 10),
        ...(EMPLOYMENT[job.type] ? { employmentType: EMPLOYMENT[job.type] } : {}),
        hiringOrganization: { "@type": "Organization", name: PLATFORM.brandName, sameAs: base, logo: `${base}/header.png` },
        url: `${base}/careers/${job.slug}`,
        directApply: true,
        ...(remote
            ? { jobLocationType: "TELECOMMUTE", applicantLocationRequirements: { "@type": "Country", name: "India" } }
            : {
                  jobLocation: {
                      "@type": "Place",
                      address: own ? postalAddress(s) : { "@type": "PostalAddress", addressLocality: job.location, addressCountry: "IN" },
                  },
              }),
    }
}

/** JSON for a <script type="application/ld+json">, safe inside HTML. */
export function ldJson(data: Ld | Ld[]): string {
    return JSON.stringify(data).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026")
}
