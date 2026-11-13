"use client"

import { useMemo, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { addDays, format } from "date-fns"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createRfq, type CreateRfqItemInput, type RfqOverviewData } from "@/app/actions/rfq"
import { unwrap } from "@/lib/action-result"
import { errorMessage } from "@/lib/utils"
import { useTaxRegime } from "@/hooks/use-tax-regime"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Line = { key: string; productId: string; description: string; quantity: string; targetUnitPrice: string; unit: string; hsnSacCode: string }
const newLine = (): Line => ({ key: crypto.randomUUID(), productId: "", description: "", quantity: "1", targetUnitPrice: "", unit: "", hsnSacCode: "" })

const DEFAULT_TERMS = "1. Bids must remain valid for at least 30 days.\n2. State delivery time, warranty and freight charges.\n3. Goods must meet the applicable technical standards."

/** New request for quotation (full page; RFQs are listed on /purchase/rfq). */
export function RfqForm({ data }: { data: RfqOverviewData }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const { formatMoney } = useTaxRegime()
    const [title, setTitle] = useState("")
    const [dueDate, setDueDate] = useState(() => format(addDays(new Date(), 14), "yyyy-MM-dd"))
    const [notes, setNotes] = useState("")
    const [terms, setTerms] = useState(DEFAULT_TERMS)
    const [lines, setLines] = useState<Line[]>([newLine()])
    const [invited, setInvited] = useState<string[]>([])

    const setLine = (i: number, change: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...change } : l)))
    const pickProduct = (i: number, productId: string) => {
        const p = data.products.find((x) => x.id === productId)
        setLine(i, p ? { productId: p.id, description: p.name, targetUnitPrice: String(p.unitPrice), unit: p.unit || "", hsnSacCode: p.hsnSacCode || "" } : { productId: "" })
    }
    const target = useMemo(() => lines.reduce((s, l) => s + (parseFloat(l.quantity) || 0) * (parseFloat(l.targetUnitPrice) || 0), 0), [lines])

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return toast.error("Enter a title for the RFQ")
        if (!dueDate) return toast.error("Choose the bid deadline")
        const items: CreateRfqItemInput[] = []
        for (const [i, l] of lines.entries()) {
            const quantity = parseFloat(l.quantity)
            if (!l.description.trim()) return toast.error(`Line ${i + 1}: enter a description or pick a product`)
            if (!(quantity > 0)) return toast.error(`Line ${i + 1}: quantity must be more than 0`)
            items.push({
                productId: l.productId || undefined,
                description: l.description.trim(),
                quantity,
                targetUnitPrice: l.targetUnitPrice ? parseFloat(l.targetUnitPrice) : undefined,
                unit: l.unit.trim() || "pcs",
                hsnSacCode: l.hsnSacCode.trim() || undefined,
            })
        }
        startTransition(async () => {
            try {
                const res = unwrap(await createRfq({ title, dueDate, notes, terms, items, invitedVendorIds: invited }))
                toast.success(`RFQ ${res.rfqNumber} created`)
                router.push(`/purchase/rfq?rfq=${res.rfqId}`)
                router.refresh()
            } catch (err) {
                toast.error(errorMessage(err) || "The RFQ couldn't be created")
            }
        })
    }

    return (
        <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild aria-label="Back to RFQs">
                    <Link href="/purchase/rfq"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New request for quotation</h1>
                    <p className="text-sm text-muted-foreground">List what you need and invite suppliers to bid.</p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <Card>
                    <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="rfq-title">Title *</Label>
                            <Input id="rfq-title" required placeholder="Enter a title for this RFQ" value={title} onChange={(e) => setTitle(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="rfq-due">Bids due by *</Label>
                            <Input id="rfq-due" type="date" required value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-base">Items</CardTitle>
                            <CardDescription>A target price is optional and only for your own comparison.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setLines((ls) => [...ls, newLine()])}>
                            <Plus className="h-4 w-4" /> Add item
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {lines.map((l, i) => (
                            <div key={l.key} className="space-y-3 rounded-lg border p-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-muted-foreground">Item {i + 1}</span>
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" disabled={lines.length <= 1} aria-label={`Remove item ${i + 1}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                                <div className="grid gap-3 sm:grid-cols-12">
                                    <div className="space-y-1 sm:col-span-5">
                                        <Label className="text-xs">Product</Label>
                                        <Select value={l.productId || "manual"} onValueChange={(v) => pickProduct(i, v === "manual" ? "" : v)}>
                                            <SelectTrigger className="[&>span]:truncate"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manual">Type a description instead</SelectItem>
                                                {data.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1 sm:col-span-7">
                                        <Label className="text-xs">Description and specification *</Label>
                                        <Input required placeholder="Describe what you need" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                                    </div>
                                    <div className="space-y-1 sm:col-span-3">
                                        <Label className="text-xs">Quantity *</Label>
                                        <Input type="number" min="0.01" step="any" required value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                                    </div>
                                    <div className="space-y-1 sm:col-span-3">
                                        <Label className="text-xs">Unit</Label>
                                        <Input placeholder="Unit of measure" value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })} />
                                    </div>
                                    <div className="space-y-1 sm:col-span-3">
                                        <Label className="text-xs">Target unit price</Label>
                                        <Input type="number" min="0" step="any" placeholder="Optional" value={l.targetUnitPrice} onChange={(e) => setLine(i, { targetUnitPrice: e.target.value })} />
                                    </div>
                                    <div className="space-y-1 sm:col-span-3">
                                        <Label className="text-xs">HSN / SAC</Label>
                                        <Input placeholder="Code (optional)" value={l.hsnSacCode} onChange={(e) => setLine(i, { hsnSacCode: e.target.value })} />
                                    </div>
                                </div>
                            </div>
                        ))}
                        <p className="text-right text-sm"><span className="text-muted-foreground">Target total: </span><strong>{formatMoney(target)}</strong></p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Invite suppliers</CardTitle>
                        <CardDescription>{invited.length} selected. More can be invited later.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {data.vendors.length === 0 ? (
                            <p className="text-sm text-muted-foreground">No suppliers yet. <Link className="underline" href="/purchase/vendors/new">Add a supplier</Link>.</p>
                        ) : (
                            <div className="max-h-64 divide-y overflow-y-auto rounded-lg border">
                                {data.vendors.map((v) => (
                                    <label key={v.id} className="flex cursor-pointer items-center gap-3 p-2.5 text-sm hover:bg-muted/40">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4"
                                            checked={invited.includes(v.id)}
                                            onChange={(e) => setInvited((ids) => (e.target.checked ? [...ids, v.id] : ids.filter((id) => id !== v.id)))}
                                        />
                                        <span className="min-w-0 flex-1">
                                            <span className="block font-medium">{v.companyName || v.displayName}</span>
                                            <span className="block text-xs text-muted-foreground">{v.email || v.phone || "No contact details"}</span>
                                        </span>
                                    </label>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="rfq-notes">Internal notes</Label>
                            <Textarea id="rfq-notes" rows={4} placeholder="Notes for your team (not sent to suppliers)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="rfq-terms">Terms for suppliers</Label>
                            <Textarea id="rfq-terms" rows={4} value={terms} onChange={(e) => setTerms(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild><Link href="/purchase/rfq">Cancel</Link></Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create RFQ
                    </Button>
                </div>
            </form>
        </div>
    )
}
