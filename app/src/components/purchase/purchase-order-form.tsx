"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { createPurchaseOrder, type PurchaseOrderItemInput, type PurchaseOverviewData } from "@/app/actions/purchase"
import { unwrap } from "@/lib/action-result"
import { errorMessage } from "@/lib/utils"
import { roundMoney } from "@/lib/gst-engine"
import { useTaxRegime } from "@/hooks/use-tax-regime"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type Line = { key: string; productId: string; description: string; hsnSacCode: string; quantity: string; unitPrice: string; taxPercent: string }
const newLine = (rate = ""): Line => ({ key: crypto.randomUUID(), productId: "", description: "", hsnSacCode: "", quantity: "1", unitPrice: "0", taxPercent: rate })

/** New purchase order (full page; the list is /purchase). */
export function PurchaseOrderForm({ data, vendorId = "" }: { data: PurchaseOverviewData; vendorId?: string }) {
    const router = useRouter()
    const { formatMoney, taxLabel, rates, defaultRate, regime } = useTaxRegime()
    const [saving, setSaving] = useState(false)
    const [vendor, setVendor] = useState(data.vendors.some((v) => v.id === vendorId) ? vendorId : "")
    const [warehouseId, setWarehouseId] = useState(data.warehouses[0]?.id || "")
    const [deliveryDate, setDeliveryDate] = useState("")
    const [notes, setNotes] = useState("")
    const [terms, setTerms] = useState("")
    const [lines, setLines] = useState<Line[]>([newLine()])

    // Lines take the business's default rate once its tax setup has loaded
    useEffect(() => {
        if (!regime) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- fill the default rate once the tax setup arrives
        setLines((ls) => ls.map((l) => (l.taxPercent === "" ? { ...l, taxPercent: String(defaultRate) } : l)))
    }, [regime, defaultRate])

    const setLine = (i: number, change: Partial<Line>) => setLines((ls) => ls.map((l, j) => (j === i ? { ...l, ...change } : l)))
    const pickProduct = (i: number, productId: string) => {
        const p = data.products.find((x) => x.id === productId)
        setLine(i, p ? { productId: p.id, description: p.name, unitPrice: String(p.unitPrice || 0), hsnSacCode: p.hsnSacCode || "" } : { productId: "" })
    }

    const totals = useMemo(() => {
        let subtotal = 0
        let tax = 0
        for (const l of lines) {
            const base = (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0)
            subtotal += base
            tax += roundMoney(base * ((parseFloat(l.taxPercent) || 0) / 100))
        }
        return { subtotal, tax, total: subtotal + tax }
    }, [lines])
    const rateOptions = [...new Set([...rates, ...lines.map((l) => parseFloat(l.taxPercent)).filter((r) => Number.isFinite(r))])].sort((a, b) => a - b)

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!vendor) return toast.error("Choose a supplier")
        const items: PurchaseOrderItemInput[] = []
        for (const [i, l] of lines.entries()) {
            const quantity = parseFloat(l.quantity)
            const unitPrice = parseFloat(l.unitPrice)
            if (!l.description.trim()) return toast.error(`Line ${i + 1}: enter a description`)
            if (!(quantity > 0)) return toast.error(`Line ${i + 1}: quantity must be more than 0`)
            if (!(unitPrice >= 0)) return toast.error(`Line ${i + 1}: price can't be negative`)
            items.push({ productId: l.productId || undefined, description: l.description.trim(), hsnSacCode: l.hsnSacCode.trim() || undefined, quantity, unitPrice, taxPercent: parseFloat(l.taxPercent) || 0 })
        }
        setSaving(true)
        try {
            const res = unwrap(await createPurchaseOrder({
                vendorId: vendor,
                warehouseId: warehouseId || undefined,
                expectedDeliveryDate: deliveryDate || undefined,
                notes: notes.trim() || undefined,
                terms: terms.trim() || undefined,
                items,
            }))
            toast.success(`Purchase order ${res.order.orderNumber} created`)
            router.push("/purchase")
            router.refresh()
        } catch (err) {
            toast.error(errorMessage(err) || "The purchase order couldn't be created")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild aria-label="Back to purchases">
                    <Link href="/purchase"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New purchase order</h1>
                    <p className="text-sm text-muted-foreground">An order number is given when you save.</p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Supplier and delivery</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="po-vendor">Supplier *</Label>
                            <Select value={vendor} onValueChange={setVendor}>
                                <SelectTrigger id="po-vendor" className="[&>span]:truncate"><SelectValue placeholder="Choose a supplier" /></SelectTrigger>
                                <SelectContent>
                                    {data.vendors.map((v) => (
                                        <SelectItem key={v.id} value={v.id}>{v.companyName && v.companyName !== v.displayName ? `${v.companyName} (${v.displayName})` : v.displayName}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {data.vendors.length === 0 && (
                                <p className="text-xs text-muted-foreground">No suppliers yet. <Link className="underline" href="/purchase/vendors/new">Add one</Link> first.</p>
                            )}
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="po-warehouse">Deliver to</Label>
                            <Select value={warehouseId} onValueChange={setWarehouseId}>
                                <SelectTrigger id="po-warehouse" className="[&>span]:truncate"><SelectValue placeholder="Choose a warehouse" /></SelectTrigger>
                                <SelectContent>
                                    {data.warehouses.map((w) => <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="po-date">Expected delivery</Label>
                            <Input id="po-date" type="date" value={deliveryDate} onChange={(e) => setDeliveryDate(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-base">Lines</CardTitle>
                            <CardDescription>Pick from your products or type a description.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setLines((ls) => [...ls, newLine(String(defaultRate))])}>
                            <Plus className="h-4 w-4" /> Add line
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {lines.map((l, i) => {
                            const lineTotal = (parseFloat(l.quantity) || 0) * (parseFloat(l.unitPrice) || 0) * (1 + (parseFloat(l.taxPercent) || 0) / 100)
                            return (
                                <div key={l.key} className="grid items-end gap-3 rounded-lg border p-3 sm:grid-cols-12">
                                    <div className="space-y-1 sm:col-span-3">
                                        <Label className="text-xs">Product</Label>
                                        <Select value={l.productId || "manual"} onValueChange={(v) => pickProduct(i, v === "manual" ? "" : v)}>
                                            <SelectTrigger className="[&>span]:truncate"><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="manual">Type a description instead</SelectItem>
                                                {data.products.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}{p.sku ? ` (${p.sku})` : ""}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-1 sm:col-span-3">
                                        <Label className="text-xs">Description *</Label>
                                        <Input required placeholder="Describe the item" value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} />
                                    </div>
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-xs">Qty</Label>
                                        <Input type="number" step="any" min="0.01" required value={l.quantity} onChange={(e) => setLine(i, { quantity: e.target.value })} />
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <Label className="text-xs">Unit price</Label>
                                        <Input type="number" step="0.01" min="0" required value={l.unitPrice} onChange={(e) => setLine(i, { unitPrice: e.target.value })} />
                                    </div>
                                    <div className="space-y-1 sm:col-span-1">
                                        <Label className="text-xs">{taxLabel}</Label>
                                        <Select value={l.taxPercent || String(defaultRate)} onValueChange={(v) => setLine(i, { taxPercent: v })}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {rateOptions.map((r) => <SelectItem key={r} value={String(r)}>{r}%</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="flex items-center justify-between gap-2 sm:col-span-2">
                                        <div className="flex-1 text-right text-xs">
                                            <span className="block text-muted-foreground">Total</span>
                                            <span className="font-semibold">{formatMoney(lineTotal)}</span>
                                        </div>
                                        <Button type="button" variant="ghost" size="icon" disabled={lines.length <= 1} aria-label={`Remove line ${i + 1}`} onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            )
                        })}
                        <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{taxLabel}</span><span>{formatMoney(totals.tax)}</span></div>
                            <div className="flex justify-between border-t pt-1 font-semibold"><span>Total</span><span>{formatMoney(totals.total)}</span></div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="grid gap-4 pt-6 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="po-notes">Delivery notes</Label>
                            <Textarea id="po-notes" rows={3} placeholder="Delivery or freight instructions (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="po-terms">Payment terms</Label>
                            <Textarea id="po-terms" rows={3} placeholder="Payment conditions or warranty remarks (optional)" value={terms} onChange={(e) => setTerms(e.target.value)} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild><Link href="/purchase">Cancel</Link></Button>
                    <Button type="submit" disabled={saving || !regime}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save purchase order
                    </Button>
                </div>
            </form>
        </div>
    )
}
