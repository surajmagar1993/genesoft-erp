import type { MetadataRoute } from "next"
import { appUrl } from "@/lib/app-url"

/** Search engines may index the public website, not the app, admin or API. */
export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: "*",
            allow: "/",
            disallow: ["/admin", "/api", "/portal", "/forms", "/join", "/auth", "/settings", "/reports", "/crm", "/sales", "/finance", "/purchase", "/inventory", "/manufacturing", "/hr", "/projects", "/support", "/workspace-settings"],
        },
        sitemap: `${appUrl()}/sitemap.xml`,
    }
}
