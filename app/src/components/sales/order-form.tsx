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
export interface OrderLineItem {
    id: string
    productName: string
    description: string
    qty: number
    unitPrice: number
    taxPercent: number
}

export type SalesOrderStatus = "DRAFT" | "CONFIRMED" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"

export interface OrderFormData {
    id?: string
    orderNumber: string
    customerName: string
    customerEmail: string
    orderDate: string
    expectedDate: string
    reference: string
    status: SalesOrderStatus
    lineItems: OrderLineItem[]
    notes: string
    termsAndConditions: string
    discount: number
    discountType: "PERCENT" | "FIXED"
    contactId?: string | null
    quoteId?: string | null
}

export const defaultOrderForm: OrderFormData = {
    orderNumber: "",
    customerName: "",
    customerEmail: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDate: "",
    reference: "",
    status: "DRAFT",
    lineItems: [],
    notes: "",
    termsAndConditions: "1. Payment due within 30 days of invoice date unless otherwise specified.\n2. Goods remain property of the company until fully paid.\n3. Refer to standard return policy for any discrepancies.",
    discount: 0,
    discountType: "PERCENT",
    contactId: null,
    quoteId: null,
}

const emptyLineItem: OrderLineItem = {
    id: "",
    productName: "",
    description: "",
    qty: 1,
    unitPrice: 0,
    taxPercent: 18,
}

/* ── Helpers ── */
function lineTotal(item: OrderLineItem) {
    return item.qty * item.unitPrice
}
function lineTax(item: OrderLineItem) {
    return lineTotal(item) * (item.taxPercent / 100)
}

interface OrderFormProps {
    initialData?: OrderFormData | null
    onSave: (data: OrderFormData) => void
}

export function OrderForm({ initialData, onSave }: OrderFormProps) {
    const router = useRouter()
    const mode = initialData ? "edit" : "create"
    const [form, setForm] = useState<OrderFormData>(initialData || defaultOrderForm)
    const [prevInitialData, setPrevInitialData] = useState(initialData)
 
    // Synchronize state with props during render instead of effect to avoid cascading renders (React 19)
    if (initialData !== prevInitialData) {
        setPrevInitialData(initialData)
        setForm(initialData || defaultOrderForm)
    }
 
    useEffect(() => {
        if (!initialData && !form.orderNumber) {
            // Generate temporary business ID on client-side mount only
            setForm(prev => ({ 
                ...prev, 
                orderNumber: `ORD-${Date.now().toString().slice(-6)}` 
            }))
        }
    }, [initialData])

    const update = <K extends keyof OrderFormData>(field: K, value: OrderFormData[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    /* ── Line Item CRUD ── */
    const addLineItem = () => {
        const newItem: OrderLineItem = { ...emptyLineItem, id: Date.now().toString() }
        update("lineItems", [...form.lineItems, newItem])
    }

    const updateLineItem = (id: string, field: keyof OrderLineItem, value: any) => {
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
                <Button variant="ghost" size="icon" onClick={() => router.push("/sales/orders")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {mode === "create" ? "New Sales Order" : "Edit Sales Order"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {mode === "create"
                            ? "Create a new sales order for a customer"
                            : `Editing: ${form.orderNumber} — ${form.customerName}`}
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
                                <Label htmlFor="orderNumber">Order Number</Label>
                                <Input
                                    id="orderNumber"
                                    value={form.orderNumber}
                                    onChange={(e) => update("orderNumber", e.target.value)}
                                    placeholder="Enter order number"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <div className="flex gap-2 flex-wrap">
                                    {(["DRAFT", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const).map((s) => (
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
                                    placeholder="Enter customer name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="customerEmail">Customer Email</Label>
                                <Input
                                    id="customerEmail"
                                    type="email"
                                    value={form.customerEmail}
                                    onChange={(e) => update("customerEmail", e.target.value)}
                                    placeholder="Enter customer email"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="orderDate">Order Date</Label>
                                <Input
                                    id="orderDate"
                                    type="date"
                                    value={form.orderDate}
                                    onChange={(e) => update("orderDate", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="expectedDate">Expected Delivery / Fufillment Date</Label>
                                <Input
                                    id="expectedDate"
                                    type="date"
                                    value={form.expectedDate}
                                    onChange={(e) => update("expectedDate", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="reference">Reference / PO Number</Label>
                            <Input
                                id="reference"
                                value={form.reference}
                                onChange={(e) => update("reference", e.target.value)}
                                placeholder="Enter PO number"
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
                                    No items added yet. Click &quot;Add Item&quot; to start building the order.
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
                            <h4 className="font-medium text-sm mb-3">Order Summary</h4>
                            <div className="grid grid-cols-2 gap-y-2 text-sm">
                                <span className="text-muted-foreground">Customer</span>
                                <span className="text-right font-medium">{form.customerName || "—"}</span>
                                <span className="text-muted-foreground">Order #</span>
                                <span className="text-right">{form.orderNumber}</span>
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
                <Button variant="outline" onClick={() => router.push("/sales/orders")}>
                    Cancel
                </Button>
                <Button onClick={handleSave}>
                    {mode === "create" ? "Save Order" : "Update Order"}
                </Button>
            </div>
        </div>
    )
}
