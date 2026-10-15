import Link from "next/link"
import { ExternalLink, FileText, Image as ImageIcon, Inbox, ListChecks, SlidersHorizontal } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getWebsiteOverview } from "@/app/actions/website"
import { pageDef } from "@/lib/site-cms-shared"

export const dynamic = "force-dynamic"

export default async function WebsiteOverviewPage() {
    const o = await getWebsiteOverview()
    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-12">
            <div className="flex flex-col gap-1 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Website</h1>
                    <p className="text-sm text-muted-foreground">Edit genesoftinfotech.com: text, lists, images and settings. Visitors see changes only after you publish.</p>
                </div>
                <Link href="/" target="_blank" className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">
                    View the website <ExternalLink className="h-3.5 w-3.5" />
                </Link>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Link href="/admin/website/leads">
                    <Card className="h-full transition hover:border-primary/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base"><Inbox className="h-4 w-4" /> Leads inbox</CardTitle>
                            <CardDescription>Contact messages, rental quote requests and job applications.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{o.newLeads}</span> <span className="text-sm text-muted-foreground">new</span>
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/admin/website/pages">
                    <Card className="h-full transition hover:border-primary/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-4 w-4" /> Pages</CardTitle>
                            <CardDescription>Home, About and the four service pages.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-1.5">
                            {o.unpublishedPages.length === 0 ? (
                                <span className="text-sm text-muted-foreground">Everything published</span>
                            ) : (
                                o.unpublishedPages.map((k) => <Badge key={k} variant="secondary">Draft: {pageDef(k)?.label ?? k}</Badge>)
                            )}
                        </CardContent>
                    </Card>
                </Link>
                <Link href="/admin/website/settings">
                    <Card className="h-full transition hover:border-primary/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base"><SlidersHorizontal className="h-4 w-4" /> Site settings</CardTitle>
                            <CardDescription>Phone, WhatsApp, emails, address, Google Maps, office hours, social links, search title.</CardDescription>
                        </CardHeader>
                    </Card>
                </Link>
                <Card className="md:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-base"><ListChecks className="h-4 w-4" /> Lists</CardTitle>
                        <CardDescription>Items show on the website only when published (and, where needed, confirmed).</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-2 sm:grid-cols-2">
                        {o.items.map((i) => (
                            <Link key={i.kind} href={`/admin/website/lists/${i.kind}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm hover:bg-muted/50">
                                <span className="font-medium">{i.label}</span>
                                <span className="text-muted-foreground">{i.published} published · {i.draft} draft</span>
                            </Link>
                        ))}
                    </CardContent>
                </Card>
                <Link href="/admin/website/media">
                    <Card className="h-full transition hover:border-primary/50">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-base"><ImageIcon className="h-4 w-4" /> Media library</CardTitle>
                            <CardDescription>Images for pages, portfolio, clients and team.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <span className="text-3xl font-bold">{o.media}</span> <span className="text-sm text-muted-foreground">images</span>
                        </CardContent>
                    </Card>
                </Link>
            </div>
        </div>
    )
}
