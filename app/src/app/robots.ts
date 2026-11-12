import type { MetadataRoute } from "next"
import { appUrl } from "@/lib/app-url"
import { indexingAllowed } from "@/lib/indexing"
import { APP_AREAS } from "@/lib/app-areas"

/**
 * Search engines may index the public website, not the app, admin or API.
 * A test or preview copy asks them to index nothing (see indexingAllowed).
 */
export default function robots(): MetadataRoute.Robots {
    if (!indexingAllowed()) return { rules: { userAgent: "*", disallow: "/" } }
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: [...APP_AREAS, "/api", "/portal", "/forms", "/join", "/auth", "/login", "/maintenance", "/unsubscribe"],
        },
        sitemap: `${appUrl()}/sitemap.xml`,
    }
}
