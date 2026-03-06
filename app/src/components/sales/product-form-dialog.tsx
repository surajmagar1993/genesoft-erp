"use client"

import { useState, useEffect } from "react"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"

export interface ProductFormData {
    id?: string
    type: "PRODUCT" | "SERVICE"
    name: string
    sku: string
    hsnSacCode: string
    description: string
    unitPrice: number
    currency: string
    unit: string
    taxGroupId: string
    stockQty: number
    isActive: boolean
}

const defaultForm: ProductFormData = {
    type: "PRODUCT",
    name: "",
    sku: "",
    hsnSacCode: "",
    description: "",
    unitPrice: 0,
    currency: "INR",
    unit: "Nos",
    taxGroupId: "",
    stockQty: 0,
    isActive: true,
}

interface ProductFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    initialData?: ProductFormData | null
    onSave: (data: ProductFormData) => void
}

export function ProductFormDialog({ open, onOpenChange, initialData, onSave }: ProductFormDialogProps) {
    const [form, setForm] = useState<ProductFormData>(defaultForm)
    const mode = initialData ? "edit" : "create"

    useEffect(() => {
        if (open) {
            setForm(initialData || defaultForm)
        }
    }, [open, initialData])

    const update = (field: keyof ProductFormData, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSave = () => {
        if (!form.name.trim()) {
            alert("Product Name is required.")
            return
        }
        onSave(form)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{mode === "create" ? "New Product or Service" : "Edit Item"}</DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="basic">Basic Info</TabsTrigger>
                        <TabsTrigger value="pricing">Pricing & Inventory</TabsTrigger>
                        <TabsTrigger value="meta">Status & Meta</TabsTrigger>
                    </TabsList>

                    {/* ── Basic Info ── */}
                    <TabsContent value="basic" className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label>Item Type</Label>
                            <div className="flex gap-2">
                                {(["PRODUCT", "SERVICE"] as const).map((t) => (
                                    <Badge
                                        key={t}
                                        variant={form.type === t ? "default" : "outline"}
                                        className="cursor-pointer px-4 py-1.5 text-sm"
                                        onClick={() => update("type", t)}
                                    >
                                        {t === "PRODUCT" ? "📦 Physical Product" : "🛠️ Service"}
                                    </Badge>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU / Item Code</Label>
                                <Input
                                    id="sku"
                                    value={form.sku}
                                    onChange={(e) => update("sku", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="hsnSacCode">HSN / SAC Code</Label>
                                <Input
                                    id="hsnSacCode"
                                    value={form.hsnSacCode}
                                    onChange={(e) => update("hsnSacCode", e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                                id="description"
                                value={form.description}
                                onChange={(e) => update("description", e.target.value)}
                                rows={3}
                            />
                        </div>
                    </TabsContent>

                    {/* ── Pricing & Inventory ── */}
                    <TabsContent value="pricing" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unitPrice">Unit Price</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">
                                        {form.currency}
                                    </span>
                                    <Input
                                        id="unitPrice"
                                        type="number"
                                        className="pl-12"
                                        value={form.unitPrice || ""}
                                        onChange={(e) => update("unitPrice", parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="currency">Currency</Label>
                                <Input
                                    id="currency"
                                    value={form.currency}
                                    onChange={(e) => update("currency", e.target.value.toUpperCase())}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="unit">Base Unit of Measurement</Label>
                                <Input
                                    id="unit"
                                    value={form.unit}
                                    onChange={(e) => update("unit", e.target.value)}
                                    placeholder="Nos, Kg, Ltr, etc."
                                />
                            </div>
                            {form.type === "PRODUCT" && (
                                <div className="space-y-2">
                                    <Label htmlFor="stockQty">Current Stock Qty</Label>
                                    <Input
                                        id="stockQty"
                                        type="number"
                                        value={form.stockQty || ""}
                                        onChange={(e) => update("stockQty", parseFloat(e.target.value) || 0)}
                                    />
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    {/* ── Status & Meta ── */}
                    <TabsContent value="meta" className="space-y-4 mt-4">
                        <div className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <Label className="text-base">Active Status</Label>
                                <p className="text-sm text-muted-foreground">
                                    Determines if this item can be selected in new Quotes or Invoices.
                                </p>
                            </div>
                            <Switch
                                checked={form.isActive}
                                onCheckedChange={(v) => update("isActive", v)}
                            />
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        {mode === "create" ? "Save Product" : "Update Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
