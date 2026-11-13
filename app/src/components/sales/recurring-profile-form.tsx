"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, X } from "lucide-react"
import { toast } from "sonner"
import {
    createRecurringProfile,
    updateRecurringProfile,
    type RecurringInvoicesOverview,
    type RecurringProfileRecord,
} from "@/app/actions/sales/recurring-invoices"
import { useTaxRegime } from "@/hooks/use-tax-regime"
import { roundMoney } from "@/lib/gst-engine"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"

type Line = { productId: string; description: string; hsnSacCode: string; quantity: number; unitPrice: number; taxRate: number | null; discount: number }

const blankLine = (): Line => ({ productId: "", description: "", hsnSacCode: "", quantity: 1, unitPrice: 0, taxRate: null, discount: 0 })
const selectClass = "w-full h-9 rounded-md border border-input bg-background px-3 text-sm"

/** Create or edit a recurring billing profile (full page; the list is /sales/invoices/recurring). */
export function RecurringProfileForm({
    customers,
    products,
    profile,
}: {
    customers: RecurringInvoicesOverview["customers"]
    products: RecurringInvoicesOverview["products"]
    profile?: RecurringProfileRecord
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const { formatMoney, taxLabel, rates, defaultRate, regime } = useTaxRegime()
    const editing = !!profile

    const [form, setForm] = useState(() => ({
        title: profile?.title ?? "",
        description: profile?.description ?? "",
        contactId: profile?.contactId ?? "",
        frequency: (profile?.frequency ?? "MONTHLY") as RecurringProfileRecord["frequency"],
        startDate: profile?.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
        endDate: profile?.endDate?.slice(0, 10) ?? "",
        maxCycles: profile?.maxCycles ? String(profile.maxCycles) : "",
        autoSendEmail: profile?.autoSendEmail ?? false,
        autoApprove: profile?.autoApprove ?? true,
        paymentTerms: profile?.paymentTerms ?? "NET_30",
        notes: profile?.notes ?? "",
        terms: profile?.terms ?? "",
        items: profile?.items.length
            ? profile.items.map((i): Line => ({
                  productId: i.productId ?? "",
                  description: i.description,
                  hsnSacCode: i.hsnSacCode ?? "",
                  quantity: Number(i.quantity),
                  unitPrice: Number(i.unitPrice),
                  taxRate: Number(i.cgstRate) + Number(i.sgstRate) + Number(i.igstRate),
                  discount: Number(i.discount),
              }))
            : [blankLine()],
    }))

    // New lines take the business's default rate once its tax setup has loaded
    useEffect(() => {
        if (!regime) return
        // eslint-disable-next-line react-hooks/set-state-in-effect -- fill the default rate once the tax setup arrives
        setForm((f) => ({ ...f, items: f.items.map((l) => (l.taxRate === null ? { ...l, taxRate: defaultRate } : l)) }))
    }, [regime, defaultRate])

    const setLine = (index: number, change: Partial<Line>) =>
        setForm((f) => {
            const items = [...f.items]
            const next = { ...items[index], ...change }
            if (change.productId) {
                const product = products.find((p) => p.id === change.productId)
                if (product) {
                    if (!next.description) next.description = product.name
                    if (!next.unitPrice) next.unitPrice = product.unitPrice
                    if (product.hsnSacCode) next.hsnSacCode = product.hsnSacCode
                }
            }
            items[index] = next
            return { ...f, items }
        })

    const totals = form.items.reduce(
        (t, l) => {
            const base = Math.max(0, l.quantity * l.unitPrice - (l.discount || 0))
            const tax = roundMoney(base * ((l.taxRate ?? 0) / 100))
            return { subtotal: t.subtotal + base, tax: t.tax + tax }
        },
        { subtotal: 0, tax: 0 }
    )

    const rateOptions = [...new Set([...rates, ...form.items.map((l) => l.taxRate ?? defaultRate)])].sort((a, b) => a - b)

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        const items = form.items.map((l) => ({ ...l, taxRate: l.taxRate ?? defaultRate, productId: l.productId || undefined }))
        startTransition(async () => {
            const shared = {
                title: form.title,
                description: form.description,
                contactId: form.contactId,
                frequency: form.frequency,
                endDate: form.endDate || undefined,
                maxCycles: form.maxCycles ? parseInt(form.maxCycles) : undefined,
                autoSendEmail: form.autoSendEmail,
                autoApprove: form.autoApprove,
                paymentTerms: form.paymentTerms,
                notes: form.notes,
                terms: form.terms,
                items,
            }
            const res = editing
                ? await updateRecurringProfile(profile.id, shared)
                : await createRecurringProfile({ ...shared, startDate: form.startDate })
            if (res.error) {
                toast.error(res.error)
                return
            }
            toast.success(editing ? "Recurring profile saved" : "Recurring profile created")
            router.push("/sales/invoices/recurring")
            router.refresh()
        })
    }

    return (
        <div className="mx-auto max-w-5xl space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild aria-label="Back to recurring invoices">
                    <Link href="/sales/invoices/recurring">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{editing ? `Edit ${profile.profileNumber}` : "New recurring profile"}</h1>
                    <p className="text-sm text-muted-foreground">An invoice is created from these lines on every run.</p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Schedule</CardTitle>
                        <CardDescription>Who is billed and how often.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm">
                            <span className="font-medium">Title *</span>
                            <Input required placeholder="Enter a name for this schedule" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-sm">
                            <span className="font-medium">Customer *</span>
                            <select required className={selectClass} value={form.contactId} onChange={(e) => setForm({ ...form, contactId: e.target.value })}>
                                <option value="" disabled>Choose a customer</option>
                                {customers.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.displayName}{c.companyName ? ` (${c.companyName})` : ""}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="space-y-1.5 text-sm">
                            <span className="font-medium">How often *</span>
                            <select className={selectClass} value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value as typeof form.frequency })}>
                                <option value="WEEKLY">Weekly</option>
                                <option value="BIWEEKLY">Every 2 weeks</option>
                                <option value="MONTHLY">Monthly</option>
                                <option value="QUARTERLY">Every 3 months</option>
                                <option value="BIANNUALLY">Every 6 months</option>
                                <option value="ANNUALLY">Yearly</option>
                            </select>
                        </label>
                        <label className="space-y-1.5 text-sm">
                            <span className="font-medium">Payment terms</span>
                            <select className={selectClass} value={form.paymentTerms} onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}>
                                <option value="DUE_ON_RECEIPT">Due on receipt</option>
                                <option value="NET_15">15 days</option>
                                <option value="NET_30">30 days</option>
                                <option value="NET_60">60 days</option>
                            </select>
                        </label>
                        <label className="space-y-1.5 text-sm">
                            <span className="font-medium">First invoice on *</span>
                            <Input type="date" required disabled={editing} value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                            {editing && <span className="block text-xs text-muted-foreground">The start date can&apos;t change after the schedule is created.</span>}
                        </label>
                        <label className="space-y-1.5 text-sm">
                            <span className="font-medium">End date</span>
                            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-sm">
                            <span className="font-medium">Number of invoices</span>
                            <Input type="number" min="1" placeholder="Leave empty to keep billing" value={form.maxCycles} onChange={(e) => setForm({ ...form, maxCycles: e.target.value })} />
                        </label>
                        <div className="space-y-2 text-sm">
                            <span className="font-medium">When an invoice is created</span>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="h-4 w-4" checked={form.autoApprove} onChange={(e) => setForm({ ...form, autoApprove: e.target.checked })} />
                                Issue it right away (otherwise it&apos;s saved as a draft)
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="h-4 w-4" checked={form.autoSendEmail} onChange={(e) => setForm({ ...form, autoSendEmail: e.target.checked })} />
                                Email it to the customer
                            </label>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0">
                        <div>
                            <CardTitle className="text-base">Lines</CardTitle>
                            <CardDescription>Billed on every invoice. {taxLabel} follows your business&apos;s country.</CardDescription>
                        </div>
                        <Button type="button" variant="outline" size="sm" className="gap-1" onClick={() => setForm({ ...form, items: [...form.items, { ...blankLine(), taxRate: defaultRate }] })}>
                            <Plus className="h-4 w-4" /> Add line
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        {form.items.map((line, index) => (
                            <div key={index} className="grid gap-3 rounded-lg border p-3 sm:grid-cols-12">
                                <label className="space-y-1 text-xs sm:col-span-5">
                                    <span className="text-muted-foreground">Product or service</span>
                                    <select className={selectClass} value={line.productId} onChange={(e) => setLine(index, { productId: e.target.value })}>
                                        <option value="">Type a description instead</option>
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>{p.name}</option>
                                        ))}
                                    </select>
                                    <Input required placeholder="Describe what is billed" value={line.description} onChange={(e) => setLine(index, { description: e.target.value })} />
                                </label>
                                <label className="space-y-1 text-xs sm:col-span-2">
                                    <span className="text-muted-foreground">HSN/SAC</span>
                                    <Input placeholder="Code (optional)" value={line.hsnSacCode} onChange={(e) => setLine(index, { hsnSacCode: e.target.value })} />
                                </label>
                                <label className="space-y-1 text-xs sm:col-span-1">
                                    <span className="text-muted-foreground">Qty</span>
                                    <Input type="number" min="0.01" step="any" required value={line.quantity} onChange={(e) => setLine(index, { quantity: parseFloat(e.target.value) || 0 })} />
                                </label>
                                <label className="space-y-1 text-xs sm:col-span-2">
                                    <span className="text-muted-foreground">Price</span>
                                    <Input type="number" min="0" step="0.01" required value={line.unitPrice} onChange={(e) => setLine(index, { unitPrice: parseFloat(e.target.value) || 0 })} />
                                </label>
                                <label className="space-y-1 text-xs sm:col-span-1">
                                    <span className="text-muted-foreground">{taxLabel}</span>
                                    <select className={selectClass} value={line.taxRate ?? defaultRate} onChange={(e) => setLine(index, { taxRate: parseFloat(e.target.value) })}>
                                        {rateOptions.map((r) => (
                                            <option key={r} value={r}>{r}%</option>
                                        ))}
                                    </select>
                                </label>
                                <div className="flex items-end justify-end sm:col-span-1">
                                    {form.items.length > 1 && (
                                        <Button type="button" variant="ghost" size="icon" aria-label={`Remove line ${index + 1}`} onClick={() => setForm({ ...form, items: form.items.filter((_, i) => i !== index) })}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <label className="space-y-1 text-xs sm:col-span-3">
                                    <span className="text-muted-foreground">Discount (amount)</span>
                                    <Input type="number" min="0" step="0.01" value={line.discount} onChange={(e) => setLine(index, { discount: parseFloat(e.target.value) || 0 })} />
                                </label>
                            </div>
                        ))}
                        <div className="ml-auto w-full max-w-xs space-y-1 text-sm">
                            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatMoney(totals.subtotal)}</span></div>
                            <div className="flex justify-between"><span className="text-muted-foreground">{taxLabel}</span><span>{formatMoney(totals.tax)}</span></div>
                            <div className="flex justify-between border-t pt-1 font-semibold"><span>Each invoice</span><span>{formatMoney(totals.subtotal + totals.tax)}</span></div>
                            <p className="text-xs text-muted-foreground">Indian GST is split into CGST + SGST or IGST from the customer&apos;s state on each invoice.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Notes</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <label className="space-y-1.5 text-sm">
                            <span className="font-medium">Notes on the invoice</span>
                            <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Shown on each invoice (optional)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                        </label>
                        <label className="space-y-1.5 text-sm">
                            <span className="font-medium">Terms</span>
                            <textarea className="min-h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="Payment terms and conditions (optional)" value={form.terms} onChange={(e) => setForm({ ...form, terms: e.target.value })} />
                        </label>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild>
                        <Link href="/sales/invoices/recurring">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={isPending || !regime}>
                        {isPending ? "Saving…" : editing ? "Save changes" : "Create schedule"}
                    </Button>
                </div>
            </form>
        </div>
    )
}
