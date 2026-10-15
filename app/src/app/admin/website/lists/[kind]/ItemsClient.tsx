"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { deleteItem, listItemsAdmin, moveItem, saveItem } from "@/app/actions/website"
import { unwrap } from "@/lib/action-result"
import { itemKindDef, type ItemKind } from "@/lib/site-cms-shared"
import { FieldInput } from "../../_components/field-input"

type Item = Awaited<ReturnType<typeof listItemsAdmin>>[number]
type Editing = { id?: string; values: Record<string, string>; status: "draft" | "published"; confirmed: boolean }

export function ItemsClient({ kind, items }: { kind: ItemKind; items: Item[] }) {
    const def = itemKindDef(kind)!
    const router = useRouter()
    const [editing, setEditing] = useState<Editing | null>(null)
    const [busy, startTransition] = useTransition()

    const run = (fn: () => Promise<void>) =>
        startTransition(async () => {
            try {
                await fn()
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Something went wrong")
            }
        })

    const blank = (): Editing => ({ values: Object.fromEntries(def.fields.map((f) => [f.name, ""])), status: "draft", confirmed: false })

    const save = () =>
        run(async () => {
            if (!editing) return
            unwrap(await saveItem({ id: editing.id, kind, values: editing.values, status: editing.status, confirmed: editing.confirmed }))
            toast.success(editing.status === "published" ? "Saved and published" : "Saved as draft")
            setEditing(null)
            router.refresh()
        })

    const remove = (item: Item) => {
        if (!confirm(`Delete "${item.title}"? This can't be undone.`)) return
        run(async () => {
            unwrap(await deleteItem(item.id))
            toast.success("Deleted")
            router.refresh()
        })
    }

    const move = (item: Item, dir: "up" | "down") =>
        run(async () => {
            unwrap(await moveItem(item.id, dir))
            router.refresh()
        })

    return (
        <div className="space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm text-muted-foreground">
                    <strong className="text-foreground">{def.label}</strong> appear on: {def.shownOn}.
                </p>
                <Button size="sm" className="gap-1.5" onClick={() => setEditing(blank())}>
                    <Plus className="h-4 w-4" /> Add {def.singular}
                </Button>
            </div>

            <Card className="gap-0 divide-y py-0">
                {items.length === 0 && <p className="px-4 py-8 text-center text-sm text-muted-foreground">No {def.label.toLowerCase()} yet.</p>}
                {items.map((item, i) => {
                    const live = item.status === "published" && (!def.confirmLabel || item.confirmed)
                    return (
                        <div key={item.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex min-w-0 flex-col">
                                <span className="truncate font-medium">{item.title}</span>
                                <span className="text-xs text-muted-foreground">
                                    {item.slug ? `/${kind === "job" ? "careers" : "portfolio"}/${item.slug} · ` : ""}Updated {new Date(item.updatedAt).toLocaleDateString()}
                                </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                {live ? <Badge>On the website</Badge> : item.status === "published" ? <Badge variant="destructive">Published but not confirmed</Badge> : <Badge variant="secondary">Draft</Badge>}
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Move up" disabled={busy || i === 0} onClick={() => move(item, "up")}><ArrowUp className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Move down" disabled={busy || i === items.length - 1} onClick={() => move(item, "down")}><ArrowDown className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label={`Edit ${item.title}`} onClick={() => setEditing({ id: item.id, values: item.values, status: item.status === "published" ? "published" : "draft", confirmed: item.confirmed })}><Pencil className="h-4 w-4" /></Button>
                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Delete ${item.title}`} disabled={busy} onClick={() => remove(item)}><Trash2 className="h-4 w-4" /></Button>
                            </div>
                        </div>
                    )
                })}
            </Card>

            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editing?.id ? `Edit ${def.singular}` : `Add ${def.singular}`}</DialogTitle>
                        <DialogDescription>Shown on: {def.shownOn}.</DialogDescription>
                    </DialogHeader>
                    {editing && (
                        <div className="min-w-0 space-y-4">
                            {def.fields.map((f) => (
                                <FieldInput key={f.name} field={f} value={editing.values[f.name] ?? ""} onChange={(v) => setEditing((e) => (e ? { ...e, values: { ...e.values, [f.name]: v } } : e))} />
                            ))}
                            {def.confirmLabel && (
                                <label className="flex items-start gap-2.5 rounded-md border p-3 text-sm">
                                    <input type="checkbox" className="mt-0.5 h-4 w-4" checked={editing.confirmed} onChange={(e) => setEditing((x) => (x ? { ...x, confirmed: e.target.checked } : x))} />
                                    <span><strong>{def.confirmLabel}</strong><br /><span className="text-muted-foreground">Required before it can appear on the website.</span></span>
                                </label>
                            )}
                            <div className="space-y-1.5">
                                <Label className="text-sm font-medium">Status</Label>
                                <div className="flex gap-2">
                                    {(["draft", "published"] as const).map((s) => (
                                        <Button key={s} type="button" size="sm" variant={editing.status === s ? "default" : "outline"} onClick={() => setEditing((x) => (x ? { ...x, status: s } : x))}>
                                            {s === "draft" ? "Draft (hidden)" : "Published"}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
                        <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
