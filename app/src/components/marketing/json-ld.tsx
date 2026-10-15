import { ldJson } from "@/lib/structured-data"

/** Structured data for search engines (see src/lib/structured-data.ts). */
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
    return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: ldJson(data) }} />
}
