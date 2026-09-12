"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { BarcodeDisplay } from "@/components/inventory/barcode-display"
import { Barcode as BarcodeIcon, Sparkles, QrCode as QrIcon } from "lucide-react"

export interface ProductFormData {
    id?: string
    type: "PRODUCT" | "SERVICE"
    name: string
    category: string
    brand: string
    modelNo: string
    serialNo: string
    sku: string
    barcode?: string
    hsnSacCode: string
    description: string
    customAttributes: { key: string; value: string }[]
    unitPrice: number
    currency: string
    unit: string
    taxGroupId: string
    stockQty: number
    isActive: boolean
}

export const defaultProductForm: ProductFormData = {
    type: "PRODUCT",
    name: "",
    category: "",
    brand: "",
    modelNo: "",
    serialNo: "",
    sku: "",
    barcode: "",
    hsnSacCode: "",
    description: "",
    customAttributes: [],
    unitPrice: 0,
    currency: "INR",
    unit: "Nos",
    taxGroupId: "",
    stockQty: 0,
    isActive: true,
}

interface ProductFormProps {
    initialData?: ProductFormData | null
    onSave: (data: ProductFormData) => void
}

export function ProductForm({ initialData, onSave }: ProductFormProps) {
    const router = useRouter()
    const mode = initialData ? "edit" : "create"
    const [form, setForm] = useState<ProductFormData>(initialData || defaultProductForm)
    const [isSaving, setIsSaving] = useState(false)
    const [previewBarcodeType, setPreviewBarcodeType] = useState<"CODE128" | "QR">("CODE128")

    useEffect(() => {
        if (initialData) {
            let bVal = initialData.barcode || ""
            if (!bVal && initialData.customAttributes) {
                const entry = initialData.customAttributes.find((a: any) => a.key === "barcode")
                if (entry) bVal = entry.value
            }
            setForm({ ...initialData, barcode: bVal })
        }
    }, [initialData])

    const update = (field: keyof ProductFormData, value: any) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const generateBarcode = () => {
        const randomDigits = Math.floor(100000000 + Math.random() * 900000000).toString()
        const code = `890${randomDigits}`
        update("barcode", code)
    }

    const handleSave = async () => {
        if (!form.name.trim()) {
            alert("Product Name is required.")
            return
        }
        setIsSaving(true)
        try {
            const currentAttrs = [...(form.customAttributes || [])]
            const filteredAttrs = currentAttrs.filter((a) => a.key !== "barcode")
            if (form.barcode) {
                filteredAttrs.push({ key: "barcode", value: form.barcode })
            }
            await onSave({ ...form, customAttributes: filteredAttrs })
        } catch (err) {
            console.error("onSave failed:", err)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => router.push("/sales/products")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">
                        {mode === "create" ? "New Product or Service" : "Edit Item"}
                    </h2>
                    <p className="text-sm text-muted-foreground mt-1">
                        {mode === "create"
                            ? "Add a new product or service to your catalog"
                            : `Editing: ${form.name}`}
                    </p>
                </div>
            </div>

            {/* Form Card */}
            <div className="rounded-lg border bg-card p-6">
                <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="w-full h-auto p-1 mb-6">
                        <TabsTrigger value="basic" className="flex-1 py-2 px-3 text-xs sm:text-sm">
                            Basic Info
                        </TabsTrigger>
                        <TabsTrigger value="specs" className="flex-1 py-2 px-3 text-xs sm:text-sm">
                            Specifications
                        </TabsTrigger>
                        <TabsTrigger value="pricing" className="flex-1 py-2 px-3 text-xs sm:text-sm">
                            Pricing & Inventory
                        </TabsTrigger>
                        <TabsTrigger value="meta" className="flex-1 py-2 px-3 text-xs sm:text-sm">
                            Status & Meta
                        </TabsTrigger>
                    </TabsList>

                    {/* ── Basic Info ── */}
                    <TabsContent value="basic" className="space-y-4">
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

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name *</Label>
                                <Input
                                    id="name"
                                    value={form.name}
                                    onChange={(e) => update("name", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="category">Category</Label>
                                <Input
                                    id="category"
                                    value={form.category}
                                    onChange={(e) => update("category", e.target.value)}
                                    placeholder="Enter category"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="brand">Brand</Label>
                                <Input
                                    id="brand"
                                    value={form.brand}
                                    onChange={(e) => update("brand", e.target.value)}
                                    placeholder="Enter brand"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="modelNo">Model Number</Label>
                                <Input
                                    id="modelNo"
                                    value={form.modelNo}
                                    onChange={(e) => update("modelNo", e.target.value)}
                                    placeholder="Enter model number"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="serialNo">Serial Number</Label>
                                <Input
                                    id="serialNo"
                                    value={form.serialNo}
                                    onChange={(e) => update("serialNo", e.target.value)}
                                    placeholder="Enter serial number"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="sku">SKU / Item Code</Label>
                                <Input
                                    id="sku"
                                    value={form.sku}
                                    onChange={(e) => update("sku", e.target.value)}
                                    placeholder="e.g. SKU-PROD-001"
                                />
                            </div>
                        </div>

                        {/* Barcode & QR Code Section */}
                        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30 space-y-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                    <Label htmlFor="barcode" className="font-bold flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                                        <BarcodeIcon className="h-4 w-4 text-indigo-500" />
                                        Barcode / EAN / UPC
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-0.5">
                                        Used for POS scanner checkout and inventory label printing. Falls back to SKU if blank.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 text-xs gap-1 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800"
                                        onClick={generateBarcode}
                                    >
                                        <Sparkles className="h-3 w-3" />
                                        Auto-Generate
                                    </Button>
                                    <div className="flex rounded border p-0.5 bg-muted/40">
                                        <Button
                                            type="button"
                                            variant={previewBarcodeType === "CODE128" ? "default" : "ghost"}
                                            size="sm"
                                            className="h-6 text-[11px] px-2"
                                            onClick={() => setPreviewBarcodeType("CODE128")}
                                        >
                                            1D
                                        </Button>
                                        <Button
                                            type="button"
                                            variant={previewBarcodeType === "QR" ? "default" : "ghost"}
                                            size="sm"
                                            className="h-6 text-[11px] px-2"
                                            onClick={() => setPreviewBarcodeType("QR")}
                                        >
                                            QR
                                        </Button>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                                <div className="md:col-span-2">
                                    <Input
                                        id="barcode"
                                        value={form.barcode || ""}
                                        onChange={(e) => update("barcode", e.target.value)}
                                        placeholder="Enter barcode or click Auto-Generate"
                                        className="font-mono text-sm bg-white dark:bg-slate-800"
                                    />
                                </div>
                                <div className="flex items-center justify-center p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 min-h-[56px]">
                                    <BarcodeDisplay
                                        value={form.barcode || form.sku || "SAMPLE-CODE"}
                                        type={previewBarcodeType}
                                        width={160}
                                        height={45}
                                        showText={true}
                                        showActions={true}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
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

                    {/* ── Specifications ── */}
                    <TabsContent value="specs" className="space-y-4">
                        <div className="space-y-2">
                            <Label>Custom Attributes</Label>
                            <p className="text-sm text-muted-foreground pb-2">
                                Add individual specifications based on the product requirement (e.g., Processor, RAM for Laptops).
                            </p>

                            {form.customAttributes.map((attr, index) => (
                                <div key={index} className="flex items-center gap-2 mb-2">
                                    <Input
                                        placeholder="Attribute name"
                                        value={attr.key}
                                        onChange={(e) => {
                                            const newAttrs = [...form.customAttributes]
                                            newAttrs[index].key = e.target.value
                                            update("customAttributes", newAttrs)
                                        }}
                                        className="w-1/3"
                                    />
                                    <Input
                                        placeholder="Attribute value"
                                        value={attr.value}
                                        onChange={(e) => {
                                            const newAttrs = [...form.customAttributes]
                                            newAttrs[index].value = e.target.value
                                            update("customAttributes", newAttrs)
                                        }}
                                        className="flex-1"
                                    />
                                    <Button
                                        variant="outline"
                                        size="icon"
                                        onClick={() => {
                                            const newAttrs = form.customAttributes.filter((_, i) => i !== index)
                                            update("customAttributes", newAttrs)
                                        }}
                                    >
                                        &times;
                                    </Button>
                                </div>
                            ))}

                            <Button
                                variant="secondary"
                                size="sm"
                                className="mt-2"
                                onClick={() => {
                                    update("customAttributes", [...form.customAttributes, { key: "", value: "" }])
                                }}
                            >
                                + Add Attribute
                            </Button>
                        </div>
                    </TabsContent>

                    {/* ── Pricing & Inventory ── */}
                    <TabsContent value="pricing" className="space-y-4">
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
                                    placeholder="Enter unit of measurement"
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
                    <TabsContent value="meta" className="space-y-4">
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
            </div>

            {/* Footer Actions */}
            <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => router.push("/sales/products")}>
                    Cancel
                </Button>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving ? "Saving..." : (mode === "create" ? "Save Product" : "Update Changes")}
                </Button>
            </div>
        </div>
    )
}
