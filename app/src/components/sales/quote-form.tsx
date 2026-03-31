"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

/* ── Types ── */
export interface QuoteLineItem {
    id: string
    productName: string
    description: string
    qty: number
    unitPrice: number
    taxPercent: number
}

export type QuoteStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"

export interface QuoteFormData {
    id?: string
    quoteNumber: string
    customerName: string
    customerEmail: string
    quoteDate: string
    validUntil: string
    reference: string
    status: QuoteStatus
    lineItems: QuoteLineItem[]
    notes: string
    termsAndConditions: string
    discount: number
    discountType: "PERCENT" | "FIXED"
    contactId?: string | null
}

export const defaultQuoteForm: QuoteFormData = {
    quoteNumber: "",
    customerName: "",
    customerEmail: "",
    quoteDate: new Date().toISOString().split("T")[0],
    validUntil: "",
    reference: "",
    status: "DRAFT",
    lineItems: [],
    notes: "",
    termsAndConditions: "1. Payment due within 30 days of invoice date.\n2. Prices are exclusive of applicable taxes unless otherwise stated.\n3. This quotation is valid for the period mentioned above.",
    discount: 0,
    discountType: "PERCENT",
    contactId: null,
}

const emptyLineItem: QuoteLineItem = {
    id: "",
    productName: "",
    description: "",
    qty: 1,
    unitPrice: 0,
    taxPercent: 18,
}

/* ── Helpers ── */
function lineTotal(item: QuoteLineItem) {
    return item.qty * item.unitPrice
}
function lineTax(item: QuoteLineItem) {
    return lineTotal(item) * (item.taxPercent / 100)
}

interface QuoteFormProps {
    initialData?: QuoteFormData | null
    onSave: (data: QuoteFormData) => void
}

export function QuoteForm({ initialData, onSave }: QuoteFormProps) {
    const router = useRouter()
    const mode = initialData ? "edit" : "create"
    const [form, setForm] = useState<QuoteFormData>(
        initialData || { ...defaultQuoteForm, quoteNumber: `QTN-${Date.now().toString().slice(-6)}` }
    )

    useEffect(() => {
        if (initialData) setForm(initialData)
    }, [initialData])

    const update = <K extends keyof QuoteFormData>(field: K, value: QuoteFormData[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    /* ── Line Item CRUD ── */
    const addLineItem = () => {
        const newItem: QuoteLineItem = { ...emptyLineItem, id: Date.now().toString() }
        update("lineItems", [...form.lineItems, newItem])
    }

    const updateLineItem = (id: string, field: keyof QuoteLineItem, value: any) => {
        update(
            "lineItems",
            form.lineItems.map((li) => (li.id === id ? { ...li, [field]: value } : li))
        )
    }

    const removeLineItem = (id: string) => {
        update("lineItems", form.lineItems.filter((li) => li.id !== id))
    }

    /* ── Totals ── */
    const subtotal = form.lineItems.reduce((sum, li) => sum + lineTotal(li), 0)
    const totalTax = form.lineItems.reduce((sum, li) => sum + lineTax(li), 0)
    const discountAmount =
        form.discountType === "PERCENT" ? subtotal * (form.discount / 100) : form.discount
    const grandTotal = subtotal + totalTax - discountAmount

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

    const handleSave = () => {
        if (!form.customerName.trim()) {
            toast.error("Customer Name is required.")
            return
        }
        if (form.lineItems.length === 0) {
            toast.error("Add at least one line item.")
            return
        }
        onSave(form)
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/sales/quotes")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {mode === "create" ? "New Quotation" : "Edit Quotation"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {mode === "create"
                            ? "Create a new quotation for a customer"
                            : `Editing: ${form.quoteNumber} — ${form.customerName}`}
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <div className="rounded-lg border bg-card p-6">
                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="w-full h-auto p-1 mb-6">
                        <TabsTrigger value="details" className="flex-1 py-2 px-3 text-xs sm:text-sm">
                            Customer & Details
                        </TabsTrigger>
                        <TabsTrigger value="items" className="flex-1 py-2 px-3 text-xs sm:text-sm">
                            Line Items
                        </TabsTrigger>
                        <TabsTrigger value="terms" className="flex-1 py-2 px-3 text-xs sm:text-sm">
                            Terms & Summary
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Tab 1: Customer & Details ── */}
                    <TabsContent value="details" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="quoteNumber">Quote Number</Label>
                                <Input
                                    id="quoteNumber"
                                    value={form.quoteNumber}
                                    onChange={(e) => update("quoteNumber", e.target.value)}
                                    placeholder="QTN-000001"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {(["DRAFT", "SENT", "ACCEPTED", "REJECTED", "EXPIRED"] as const).map((s) => (
                                        <Badge
                                            key={s}
                                            variant={form.status === s ? "default" : "outline"}
                                            className="cursor-pointer px-3 py-1.5 text-xs capitalize"
                                            onClick={() => update("status", s)}
                                        >
                                            {s.toLowerCase()}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="customerName">Customer Name *</Label>
                                <Input
                                    id="customerName"
                                    value={form.customerName}
                                    onChange={(e) => update("customerName", e.target.value)}
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customerEmail">Customer Email</Label>
                                <Input
                                    id="customerEmail"
                                    type="email"
                                    value={form.customerEmail}
                                    onChange={(e) => update("customerEmail", e.target.value)}
                                    placeholder="e.g. billing@acme.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="quoteDate">Quote Date</Label>
                                <Input
                                    id="quoteDate"
                                    type="date"
                                    value={form.quoteDate}
                                    onChange={(e) => update("quoteDate", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="validUntil">Valid Until</Label>
                                <Input
                                    id="validUntil"
                                    type="date"
                                    value={form.validUntil}
                                    onChange={(e) => update("validUntil", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reference">Reference / PO Number</Label>
                            <Input
                                id="reference"
                                value={form.reference}
                                onChange={(e) => update("reference", e.target.value)}
                                placeholder="e.g. PO-2024-001"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="notes">Internal Notes</Label>
                            <Textarea
                                id="notes"
                                value={form.notes}
                                onChange={(e) => update("notes", e.target.value)}
                                placeholder="Notes visible only to your team..."
                                rows={3}
                            />
                        </div>
                    </TabsContent>

                    {/* ── Tab 2: Line Items ── */}
                    <TabsContent value="items" className="space-y-4">
                        <div className="flex items-center justify-between">
                            <Label className="text-base">Items</Label>
                            <Button size="sm" variant="outline" onClick={addLineItem}>
                                <Plus className="h-4 w-4 mr-1" /> Add Item
                            </Button>
                        </div>

                        {form.lineItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-10 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                    No items added yet. Click &quot;Add Item&quot; to start building the quote.
                                </p>
                                <Button size="sm" onClick={addLineItem}>
                                    <Plus className="h-4 w-4 mr-1" /> Add First Item
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Header */}
                                <div className="grid grid-cols-[2fr_1.5fr_0.8fr_1fr_0.8fr_1fr_auto] gap-3 text-xs font-medium text-muted-foreground px-1">
                                    <span>Product / Service</span>
                                    <span>Description</span>
                                    <span className="text-center">Qty</span>
                                    <span className="text-right">Unit Price</span>
                                    <span className="text-center">Tax %</span>
                                    <span className="text-right">Amount</span>
                                    <span className="w-9" />
                                </div>

                                {form.lineItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-[2fr_1.5fr_0.8fr_1fr_0.8fr_1fr_auto] gap-3 items-center rounded-md border p-3"
                                    >
                                        <Input
                                            value={item.productName}
                                            onChange={(e) => updateLineItem(item.id, "productName", e.target.value)}
                                            placeholder="Product name"
                                            className="text-sm"
                                        />
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                                            placeholder="Details"
                                            className="text-sm"
                                        />
                                        <Input
                                            type="number"
                                            min={1}
                                            value={item.qty}
                                            onChange={(e) => updateLineItem(item.id, "qty", Number(e.target.value))}
                                            className="text-sm text-center"
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            value={item.unitPrice}
                                            onChange={(e) => updateLineItem(item.id, "unitPrice", Number(e.target.value))}
                                            className="text-sm text-right"
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={item.taxPercent}
                                            onChange={(e) => updateLineItem(item.id, "taxPercent", Number(e.target.value))}
                                            className="text-sm text-center"
                                        />
                                        <div className="text-sm font-medium text-right pr-1">
                                            {formatCurrency(lineTotal(item) + lineTax(item))}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9"
                                            onClick={() => removeLineItem(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}

                                {/* Totals */}
                                <div className="flex justify-end pt-3">
                                    <div className="w-72 space-y-2 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Subtotal</span>
                                            <span>{formatCurrency(subtotal)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-muted-foreground">Tax</span>
                                            <span>{formatCurrency(totalTax)}</span>
                                        </div>
                                        {discountAmount > 0 && (
                                            <div className="flex justify-between text-green-500">
                                                <span>Discount</span>
                                                <span>-{formatCurrency(discountAmount)}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between border-t pt-2 font-semibold text-base">
                                            <span>Total</span>
                                            <span>{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Tab 3: Terms & Summary ── */}
                    <TabsContent value="terms" className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="discount">Discount</Label>
                                <div className="flex gap-2">
                                    <Input
                                        id="discount"
                                        type="number"
                                        min={0}
                                        value={form.discount}
                                        onChange={(e) => update("discount", Number(e.target.value))}
                                        className="flex-1"
                                    />
                                    <div className="flex gap-1">
                                        {(["PERCENT", "FIXED"] as const).map((dt) => (
                                            <Badge
                                                key={dt}
                                                variant={form.discountType === dt ? "default" : "outline"}
                                                className="cursor-pointer px-3 py-1.5 text-xs"
                                                onClick={() => update("discountType", dt)}
                                            >
                                                {dt === "PERCENT" ? "%" : "₹"}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="termsAndConditions">Terms & Conditions</Label>
                            <Textarea
                                id="termsAndConditions"
                                value={form.termsAndConditions}
                                onChange={(e) => update("termsAndConditions", e.target.value)}
                                rows={6}
                            />
                        </div>

                        {/* Summary card */}
                        <div className="rounded-lg border p-5 space-y-2">
                            <h4 className="font-medium text-sm mb-3">Quote Summary</h4>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-muted-foreground">Customer</span>
                                <span className="text-right font-medium">{form.customerName || "—"}</span>
                                <span className="text-muted-foreground">Quote #</span>
                                <span className="text-right">{form.quoteNumber}</span>
                                <span className="text-muted-foreground">Items</span>
                                <span className="text-right">{form.lineItems.length}</span>
                                <span className="text-muted-foreground">Subtotal</span>
                                <span className="text-right">{formatCurrency(subtotal)}</span>
                                <span className="text-muted-foreground">Tax</span>
                                <span className="text-right">{formatCurrency(totalTax)}</span>
                                {discountAmount > 0 && (
                                    <>
                                        <span className="text-muted-foreground">Discount</span>
                                        <span className="text-right text-green-500">-{formatCurrency(discountAmount)}</span>
                                    </>
                                )}
                                <span className="text-muted-foreground font-semibold border-t pt-2">Grand Total</span>
                                <span className="text-right font-semibold text-base border-t pt-2">
                                    {formatCurrency(grandTotal)}
                                </span>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => router.push("/sales/quotes")}>
                    Cancel
                </Button>
                <Button onClick={handleSave}>
                    {mode === "create" ? "Save Quote" : "Update Quote"}
                </Button>
            </div>
        </div>
    )
}
