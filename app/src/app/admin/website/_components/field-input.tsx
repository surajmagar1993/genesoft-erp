"use client"

import { useState } from "react"
import { ImageIcon, Loader2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { listMedia, uploadMedia } from "@/app/actions/website"
import { unwrap } from "@/lib/action-result"
import type { FieldDef } from "@/lib/site-cms-shared"
import { OWNER_TODO, parseLegal } from "@/lib/legal-markdown"
import { cn } from "@/lib/utils"

type Media = Awaited<ReturnType<typeof listMedia>>[number]

/** Picks an image from the Media library, or uploads a new one. */
function ImagePicker({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
    const [open, setOpen] = useState(false)
    const [media, setMedia] = useState<Media[] | null>(null)
    const [busy, setBusy] = useState(false)
    const [alt, setAlt] = useState("")

    const load = async () => {
        setOpen(true)
        try {
            setMedia(await listMedia())
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't load the media library")
        }
    }

    const upload = async (file: File | undefined) => {
        if (!file) return
        if (!alt.trim()) {
            toast.error("Describe the image first (alt text).")
            return
        }
        setBusy(true)
        try {
            const form = new FormData()
            form.set("file", file)
            form.set("alt", alt)
            const { url } = unwrap(await uploadMedia(form))
            onChange(url)
            setAlt("")
            setOpen(false)
            toast.success("Image uploaded")
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Upload failed")
        } finally {
            setBusy(false)
        }
    }

    return (
        <div className="flex items-center gap-3">
            <div className="flex h-16 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted/30">
                {value ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={value} alt="" className="h-full w-full object-contain" />
                ) : (
                    <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                )}
            </div>
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" onClick={load}>
                    {value ? "Change image" : "Choose image"}
                </Button>
                {value && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => onChange("")} aria-label={`Remove ${label}`}>
                        <X className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>Choose an image</DialogTitle>
                        <DialogDescription>From the Media library, or upload a new one (PNG, JPG or WebP, up to 5 MB).</DialogDescription>
                    </DialogHeader>
                    <div className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-end">
                        <div className="flex-1 space-y-1">
                            <Label htmlFor="picker-alt" className="text-xs">Describe the image (alt text)</Label>
                            <Input id="picker-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="What the image shows" />
                        </div>
                        <Button type="button" disabled={busy} onClick={() => document.getElementById("picker-file")?.click()} className="gap-2">
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload new
                        </Button>
                        <input id="picker-file" type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
                    </div>
                    <div className="grid max-h-[50vh] grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4">
                        {media === null && <p className="col-span-full text-sm text-muted-foreground">Loading…</p>}
                        {media?.length === 0 && <p className="col-span-full text-sm text-muted-foreground">No images yet. Upload one above.</p>}
                        {media?.map((m) => (
                            <button
                                key={m.id}
                                type="button"
                                onClick={() => {
                                    onChange(m.url)
                                    setOpen(false)
                                }}
                                className={cn("flex aspect-square items-center justify-center overflow-hidden rounded-md border bg-muted/30 hover:border-primary", value === m.url && "ring-2 ring-primary")}
                                title={m.alt}
                            >
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={m.url} alt={m.alt} className="h-full w-full object-contain" />
                            </button>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}

/** Live check of a legal page's text: its sections, or why it can't be shown. */
function LegalCheck({ text }: { text: string }) {
    let sections: string[] = []
    let error = ""
    try {
        sections = parseLegal(text).map((s) => s.title)
    } catch (err) {
        error = err instanceof Error ? err.message : "This text can't be shown."
    }
    const todos = text.split(OWNER_TODO).length - 1
    return (
        <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-xs">
            {error ? (
                <p className="text-destructive">{error}</p>
            ) : (
                <p className="text-muted-foreground">
                    {sections.length} sections: {sections.map((t, i) => `${i + 1}. ${t}`).join(" · ")}
                </p>
            )}
            {todos > 0 && (
                <p className="text-amber-700 dark:text-amber-400">
                    {todos} {todos === 1 ? "note" : "notes"} still to fill in ({OWNER_TODO} …]). Save as a draft until they&apos;re done; publishing is blocked.
                </p>
            )}
        </div>
    )
}

/** One editable field, as defined in src/lib/site-cms-shared.ts. Values are form text. */
export function FieldInput({ field, value, onChange }: { field: FieldDef; value: string; onChange: (v: string) => void }) {
    const id = `f-${field.name}`
    const multi = field.type === "textarea" || field.type === "lines" || field.type === "pairs" || field.type === "faqs" || field.type === "legalInline"
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id} className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive"> *</span>}
            </Label>
            {field.type === "image" ? (
                <ImagePicker value={value} onChange={onChange} label={field.label} />
            ) : field.type === "select" ? (
                <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-md border bg-background px-3 text-sm">
                    <option value="">Choose…</option>
                    {field.options?.map((o) => (
                        <option key={o}>{o}</option>
                    ))}
                </select>
            ) : field.type === "legal" ? (
                <>
                    <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={28} spellCheck className="font-mono text-[13px] leading-relaxed" />
                    <LegalCheck text={value} />
                </>
            ) : multi ? (
                <Textarea id={id} value={value} onChange={(e) => onChange(e.target.value)} rows={field.type === "textarea" ? 4 : 6} className="text-sm" />
            ) : (
                <Input
                    id={id}
                    type={field.type === "url" ? "url" : field.type === "email" ? "email" : field.type === "number" ? "number" : "text"}
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    maxLength={field.max}
                />
            )}
            {field.help && <p className="text-xs text-muted-foreground">{field.help}</p>}
        </div>
    )
}
