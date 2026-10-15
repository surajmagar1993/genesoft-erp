import type { Metadata } from "next"
import { PLATFORM } from "@/lib/constants/platform"

/**
 * Title, description, canonical address and share previews (WhatsApp,
 * LinkedIn, X…) for a public website page. The share image is the site's
 * /og-image.png unless the page has its own (e.g. a portfolio project).
 */
export function pageMeta(p: { title: string; description: string; path: string; image?: string | null; noIndex?: boolean }): Metadata {
    // Default: the site's share picture (src/app/og-image.png/route.tsx)
    const images = [p.image ? { url: p.image } : { url: "/og-image.png", width: 1200, height: 630, alt: `${PLATFORM.brandName}: software, digital marketing, IT rentals and IT support` }]
    return {
        title: p.title,
        description: p.description,
        alternates: { canonical: p.path },
        openGraph: {
            title: p.title,
            description: p.description,
            url: p.path,
            siteName: PLATFORM.brandName,
            locale: "en_IN",
            type: "website",
            images,
        },
        twitter: { card: "summary_large_image", title: p.title, description: p.description, images },
        ...(p.noIndex ? { robots: { index: false } } : {}),
    }
}
