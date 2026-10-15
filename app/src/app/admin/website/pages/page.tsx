import Link from "next/link"
import { ExternalLink } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { listPagesAdmin } from "@/app/actions/website"

export const dynamic = "force-dynamic"

export default async function WebsitePagesPage() {
    const pages = await listPagesAdmin()
    return (
        <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12">
            <div className="border-b pb-5">
                <h1 className="text-2xl font-bold tracking-tight">Pages</h1>
                <p className="text-sm text-muted-foreground">
                    Edit the text of each page. Until a page is published here, it shows the built-in text. Legal pages show &quot;Last updated&quot; as the day
                    you publish them.
                </p>
            </div>
            {(["Pages", "Legal"] as const).map((group) => (
                <section key={group} className="space-y-2">
                    <h2 className="text-sm font-semibold text-muted-foreground">{group === "Legal" ? "Legal pages" : "Pages"}</h2>
                    <Card className="divide-y gap-0 py-0">
                        {pages
                            .filter((p) => p.group === group)
                            .map((p) => (
                                <div key={p.key} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                                    <div className="flex flex-col">
                                        <Link href={`/admin/website/pages/${encodeURIComponent(p.key)}`} className="font-medium hover:underline">
                                            {p.label}
                                        </Link>
                                        <span className="text-xs text-muted-foreground">
                                            {p.publishedAt
                                                ? `Published ${new Date(p.publishedAt).toLocaleString()}`
                                                : p.draftOnly
                                                  ? "Draft, hidden from the website"
                                                  : p.customised
                                                    ? "Saved"
                                                    : "Built-in text"}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {p.unpublished && <Badge variant="secondary">Unpublished changes</Badge>}
                                        <Link
                                            href={p.path}
                                            target="_blank"
                                            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                                        >
                                            View <ExternalLink className="h-3.5 w-3.5" />
                                        </Link>
                                        <Link
                                            href={`/admin/website/pages/${encodeURIComponent(p.key)}`}
                                            className="text-sm font-medium text-primary hover:underline"
                                        >
                                            Edit
                                        </Link>
                                    </div>
                                </div>
                            ))}
                    </Card>
                </section>
            ))}
        </div>
    )
}
