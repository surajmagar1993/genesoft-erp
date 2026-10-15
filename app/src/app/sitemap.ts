import type { MetadataRoute } from "next"
import { appUrl } from "@/lib/app-url"
import { LEGAL_LINKS } from "@/components/marketing/legal-links"

/** /sitemap.xml: the public website's pages, for search engines. */
export default function sitemap(): MetadataRoute.Sitemap {
    const base = appUrl()
    const main = ["/", "/pricing", "/about", "/contact", "/register", "/login", "/sitemap"]
    return [
        ...main.map((path) => ({ url: `${base}${path === "/" ? "" : path}`, changeFrequency: "weekly" as const, priority: path === "/" ? 1 : 0.8 })),
        ...LEGAL_LINKS.map((l) => ({ url: `${base}${l.href}`, changeFrequency: "yearly" as const, priority: 0.3 })),
    ]
}
