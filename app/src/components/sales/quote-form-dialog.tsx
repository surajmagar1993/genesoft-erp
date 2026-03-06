"use client"

import { useEffect, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"

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
}

const defaultForm: QuoteFormData = {
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

interface QuoteFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: QuoteFormData | null
    onSave: (data: QuoteFormData) => void
}

export function QuoteFormDialog({
    open,
    onOpenChange,
    initialData,
    onSave,
}: QuoteFormDialogProps) {
    const mode = initialData ? "edit" : "create"
    const [form, setForm] = useState<QuoteFormData>(defaultForm)

    useEffect(() => {
        if (open) {
            setForm(initialData || { ...defaultForm, quoteNumber: `QTN-${Date.now().toString().slice(-6)}` })
        }
    }, [open, initialData])

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
            form.lineItems.map((li) =>
                li.id === id ? { ...li, [field]: value } : li
            )
        )
    }

    const removeLineItem = (id: string) => {
        update("lineItems", form.lineItems.filter((li) => li.id !== id))
    }

    /* ── Totals ── */
    const subtotal = form.lineItems.reduce((sum, li) => sum + lineTotal(li), 0)
    const totalTax = form.lineItems.reduce((sum, li) => sum + lineTax(li), 0)
    const discountAmount =
        form.discountType === "PERCENT"
            ? subtotal * (form.discount / 100)
            : form.discount
    const grandTotal = subtotal + totalTax - discountAmount

    const handleSave = () => {
        if (!form.customerName.trim()) {
            alert("Customer Name is required.")
            return
        }
        if (form.lineItems.length === 0) {
            alert("Add at least one line item.")
            return
        }
        onSave(form)
        onOpenChange(false)
    }

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "New Quotation" : "Edit Quotation"}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full flex-1 flex flex-col min-h-0">
                    <TabsList className="w-full h-auto p-1">
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
                    <TabsContent value="details" className="space-y-4 mt-4 flex-1 overflow-y-auto">
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
                    <TabsContent value="items" className="space-y-4 mt-4 flex-1 overflow-y-auto">
                        <div className="flex items-center justify-between">
                            <Label className="text-base">Items</Label>
                            <Button size="sm" variant="outline" onClick={addLineItem}>
                                <Plus className="h-4 w-4 mr-1" /> Add Item
                            </Button>
                        </div>

                        {form.lineItems.length === 0 ? (
                            <div className="flex flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                                <p className="text-sm text-muted-foreground mb-3">
                                    No items added yet. Click "Add Item" to start building the quote.
                                </p>
                                <Button size="sm" onClick={addLineItem}>
                                    <Plus className="h-4 w-4 mr-1" /> Add First Item
                                </Button>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {/* Header Row */}
                                <div className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_0.8fr_1fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                                    <span>Product / Service</span>
                                    <span>Description</span>
                                    <span className="text-center">Qty</span>
                                    <span className="text-right">Unit Price</span>
                                    <span className="text-center">Tax %</span>
                                    <span className="text-right">Amount</span>
                                    <span className="w-8" />
                                </div>

                                {form.lineItems.map((item) => (
                                    <div
                                        key={item.id}
                                        className="grid grid-cols-[2fr_1fr_0.8fr_0.8fr_0.8fr_1fr_auto] gap-2 items-center rounded-md border p-2"
                                    >
                                        <Input
                                            value={item.productName}
                                            onChange={(e) => updateLineItem(item.id, "productName", e.target.value)}
                                            placeholder="Product name"
                                            className="text-sm h-9"
                                        />
                                        <Input
                                            value={item.description}
                                            onChange={(e) => updateLineItem(item.id, "description", e.target.value)}
                                            placeholder="Details"
                                            className="text-sm h-9"
                                        />
                                        <Input
                                            type="number"
                                            min={1}
                                            value={item.qty}
                                            onChange={(e) => updateLineItem(item.id, "qty", Number(e.target.value))}
                                            className="text-sm h-9 text-center"
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            value={item.unitPrice}
                                            onChange={(e) => updateLineItem(item.id, "unitPrice", Number(e.target.value))}
                                            className="text-sm h-9 text-right"
                                        />
                                        <Input
                                            type="number"
                                            min={0}
                                            max={100}
                                            value={item.taxPercent}
                                            onChange={(e) => updateLineItem(item.id, "taxPercent", Number(e.target.value))}
                                            className="text-sm h-9 text-center"
                                        />
                                        <div className="text-sm font-medium text-right pr-1">
                                            {formatCurrency(lineTotal(item) + lineTax(item))}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8"
                                            onClick={() => removeLineItem(item.id)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}

                                {/* Totals */}
                                <div className="flex justify-end pt-2">
                                    <div className="w-64 space-y-1.5 text-sm">
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
                                        <div className="flex justify-between border-t pt-1.5 font-semibold text-base">
                                            <span>Total</span>
                                            <span>{formatCurrency(grandTotal)}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </TabsContent>

                    {/* ── Tab 3: Terms & Summary ── */}
                    <TabsContent value="terms" className="space-y-4 mt-4 flex-1 overflow-y-auto">
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
                        <div className="rounded-lg border p-4 space-y-2">
                            <h4 className="font-medium text-sm">Quote Summary</h4>
                            <div className="grid grid-cols-2 gap-y-1.5 text-sm">
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
                                <span className="text-muted-foreground font-semibold border-t pt-1.5">Grand Total</span>
                                <span className="text-right font-semibold text-base border-t pt-1.5">
                                    {formatCurrency(grandTotal)}
                                </span>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        {mode === "create" ? "Save Quote" : "Update Quote"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
