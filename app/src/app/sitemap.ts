import type { MetadataRoute } from "next"
import { appUrl } from "@/lib/app-url"
import { indexingAllowed } from "@/lib/indexing"
import { getLegalLinks } from "@/lib/site-cms"
import { SERVICES } from "@/lib/site-content"

/** /sitemap.xml: the public website's pages, for search engines. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    if (!indexingAllowed()) return []
    const base = appUrl()
    const main = ["/", "/services", ...SERVICES.map((s) => `/services/${s.slug}`), "/erp", "/erp/pricing", "/portfolio", "/about", "/careers", "/contact", "/register"]
    return [
        ...main.map((path) => ({ url: `${base}${path === "/" ? "" : path}`, changeFrequency: "weekly" as const, priority: path === "/" ? 1 : 0.8 })),
        ...(await getLegalLinks()).map((l) => ({ url: `${base}${l.href}`, changeFrequency: "yearly" as const, priority: 0.3 })),
    ]
}
