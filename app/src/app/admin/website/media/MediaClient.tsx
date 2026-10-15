"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Copy, Loader2, Trash2, Upload } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { deleteMedia, listMedia, updateMediaAlt, uploadMedia } from "@/app/actions/website"
import { unwrap } from "@/lib/action-result"

type Media = Awaited<ReturnType<typeof listMedia>>[number]

export function MediaClient({ media }: { media: Media[] }) {
    const router = useRouter()
    const [alt, setAlt] = useState("")
    const [busy, startTransition] = useTransition()
    const [alts, setAlts] = useState<Record<string, string>>(() => Object.fromEntries(media.map((m) => [m.id, m.alt])))

    const run = (fn: () => Promise<void>) =>
        startTransition(async () => {
            try {
                await fn()
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Something went wrong")
            }
        })

    const upload = (file: File | undefined) => {
        if (!file) return
        if (!alt.trim()) return toast.error("Describe the image first (alt text).")
        run(async () => {
            const form = new FormData()
            form.set("file", file)
            form.set("alt", alt)
            unwrap(await uploadMedia(form))
            setAlt("")
            toast.success("Image uploaded")
            router.refresh()
        })
    }

    return (
        <div className="mx-auto max-w-6xl space-y-6 px-4 pb-12">
            <div className="border-b pb-5">
                <h1 className="text-2xl font-bold tracking-tight">Media library</h1>
                <p className="text-sm text-muted-foreground">Images for the website: portfolio, clients, team and pages. PNG, JPG or WebP, up to 5 MB.</p>
            </div>
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
                <div className="flex-1 space-y-1.5">
                    <Label htmlFor="new-alt">Describe the image (alt text, for screen readers and search engines)</Label>
                    <Input id="new-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="What the image shows" />
                </div>
                <Button disabled={busy} className="gap-2" onClick={() => document.getElementById("media-file")?.click()}>
                    {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload image
                </Button>
                <input id="media-file" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => { upload(e.target.files?.[0]); e.target.value = "" }} />
            </Card>
            {media.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">No images yet.</p>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {media.map((m) => (
                        <Card key={m.id} className="gap-0 overflow-hidden py-0">
                            <div className="flex aspect-[4/3] items-center justify-center bg-muted/30">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={m.url} alt={m.alt} className="h-full w-full object-contain" />
                            </div>
                            <div className="space-y-2 p-3">
                                <Input
                                    aria-label="Alt text"
                                    value={alts[m.id] ?? ""}
                                    onChange={(e) => setAlts((a) => ({ ...a, [m.id]: e.target.value }))}
                                    onBlur={() => alts[m.id] !== m.alt && run(async () => { unwrap(await updateMediaAlt(m.id, alts[m.id])); toast.success("Alt text saved") })}
                                    className="h-8 text-xs"
                                />
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{(m.bytes / 1024).toFixed(0)} KB</span>
                                    <span className="flex gap-1">
                                        <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Copy link" onClick={() => { navigator.clipboard.writeText(m.url); toast.success("Link copied") }}><Copy className="h-3.5 w-3.5" /></Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-7 w-7 text-destructive"
                                            aria-label="Delete image"
                                            disabled={busy}
                                            onClick={() => confirm("Delete this image?") && run(async () => { unwrap(await deleteMedia(m.id)); toast.success("Deleted"); router.refresh() })}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </span>
                                </div>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    )
}
