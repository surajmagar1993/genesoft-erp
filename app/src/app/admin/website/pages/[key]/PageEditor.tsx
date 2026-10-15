"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowLeft, ExternalLink, History, RotateCcw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { getPageAdmin, publishPage, resetPage, restorePageVersion, savePageDraft } from "@/app/actions/website"
import { unwrap } from "@/lib/action-result"
import { FieldInput } from "../../_components/field-input"

type Page = Awaited<ReturnType<typeof getPageAdmin>>

export function PageEditor({ page }: { page: Page }) {
    const router = useRouter()
    const [values, setValues] = useState<Record<string, string>>(page.values)
    const [dirty, setDirty] = useState(false)
    const [busy, startTransition] = useTransition()

    const run = (fn: () => Promise<void>) =>
        startTransition(async () => {
            try {
                await fn()
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Something went wrong")
            }
        })

    const save = () =>
        run(async () => {
            unwrap(await savePageDraft(page.key, values))
            setDirty(false)
            toast.success("Draft saved. Visitors still see the published version.")
            router.refresh()
        })

    const publish = () =>
        run(async () => {
            unwrap(await publishPage(page.key, values))
            setDirty(false)
            toast.success("Published. The website shows it now.")
            router.refresh()
        })

    const restore = (id: string) =>
        run(async () => {
            unwrap(await restorePageVersion(id))
            toast.success("That version is back in the draft. Review it and publish.")
            const fresh = await getPageAdmin(page.key)
            setValues(fresh.values)
            router.refresh()
        })

    const reset = () => {
        if (!confirm("Go back to the built-in text? Your saved text for this page will be removed (it stays in History).")) return
        run(async () => {
            unwrap(await resetPage(page.key))
            toast.success("Back to the built-in text.")
            const fresh = await getPageAdmin(page.key)
            setValues(fresh.values)
            setDirty(false)
            router.refresh()
        })
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12">
            <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-1">
                    <Link href="/admin/website/pages" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
                        <ArrowLeft className="h-3.5 w-3.5" /> Pages
                    </Link>
                    <h1 className="text-2xl font-bold tracking-tight">{page.label}</h1>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {page.publishedAt
                            ? `Published ${new Date(page.publishedAt).toLocaleString()}`
                            : page.draftOnly
                              ? "Not published yet: this page is hidden from the website until you publish it"
                              : "Not published yet: the website shows the built-in text"}
                        {(page.unpublished || dirty) && <Badge variant="secondary">Unpublished changes</Badge>}
                    </div>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={page.path} target="_blank" className="gap-1.5">View page <ExternalLink className="h-3.5 w-3.5" /></Link>
                    </Button>
                    <Button variant="outline" size="sm" onClick={save} disabled={busy}>Save draft</Button>
                    <Button size="sm" onClick={publish} disabled={busy}>Publish</Button>
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                <Card>
                    <CardContent className="space-y-5 pt-6">
                        {page.fields.map((f) => (
                            <FieldInput
                                key={f.name}
                                field={f}
                                value={values[f.name] ?? ""}
                                onChange={(v) => {
                                    setValues((x) => ({ ...x, [f.name]: v }))
                                    setDirty(true)
                                }}
                            />
                        ))}
                    </CardContent>
                </Card>
                <div className="space-y-4">
                    <Card>
                        <CardHeader className="pb-2">
                            <CardTitle className="flex items-center gap-2 text-sm"><History className="h-4 w-4" /> History</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-1.5 text-sm">
                            {page.versions.length === 0 && <p className="text-muted-foreground">No published versions yet.</p>}
                            {page.versions.map((v, i) => (
                                <div key={v.id} className="flex items-center justify-between gap-2">
                                    <span className="text-muted-foreground">{new Date(v.publishedAt).toLocaleString()}{i === 0 ? " (live)" : ""}</span>
                                    {i > 0 && (
                                        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => restore(v.id)} disabled={busy}>Restore</Button>
                                    )}
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="space-y-2 pt-6 text-sm">
                            <p className="text-muted-foreground">Lists with one item per line: press Enter between items. Pairs use a bar: <code>Title | text</code>.</p>
                            <Button variant="ghost" size="sm" className="gap-1.5 px-0 text-muted-foreground hover:bg-transparent hover:text-foreground" onClick={reset} disabled={busy}>
                                <RotateCcw className="h-3.5 w-3.5" /> Reset to the built-in text
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
