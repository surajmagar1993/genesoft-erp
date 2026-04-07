"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, AlertCircle } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  INDIAN_STATES,
  GST_RATES,
  GstRate,
  SupplyType,
  getSupplyType,
  computeLineItemGst,
  computeInvoiceGstSummary,
  isValidGstin,
} from "@/lib/gst-engine"

/* ── Types ─────────────────────────────────────────────────────────────────── */
export interface InvoiceLineItem {
  id: string
  productName: string
  description: string
  qty: number
  unitPrice: number
  gstRate: GstRate
  hsnSac: string
}

export type InvoiceStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED"

export interface InvoiceFormData {
  id?: string
  invoiceNumber: string
  customerName: string
  customerEmail: string
  invoiceDate: string
  validUntil: string
  reference: string
  status: InvoiceStatus
  lineItems: InvoiceLineItem[]
  notes: string
  termsAndConditions: string
  discount: number
  discountType: "PERCENT" | "FIXED"
  // GST fields
  supplierGstin: string
  customerGstin: string
  supplierState: string
  placeOfSupply: string
}

export const defaultInvoiceForm: InvoiceFormData = {
  invoiceNumber: "",
  customerName: "",
  customerEmail: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  validUntil: "",
  reference: "",
  status: "DRAFT",
  lineItems: [],
  notes: "",
  termsAndConditions:
    "1. Payment due within 30 days of invoice date.\n2. Prices are exclusive of applicable taxes unless otherwise stated.\n3. This quotation is valid for the period mentioned above.",
  discount: 0,
  discountType: "PERCENT",
  supplierGstin: "",
  customerGstin: "",
  supplierState: "",
  placeOfSupply: "",
}

const emptyLineItem: InvoiceLineItem = {
  id: "",
  productName: "",
  description: "",
  qty: 1,
  unitPrice: 0,
  gstRate: 18,
  hsnSac: "",
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

/* ── Props ──────────────────────────────────────────────────────────────────── */
interface InvoiceFormProps {
  initialData?: InvoiceFormData | null
  nextInvoiceNumber?: string
  onSave: (data: InvoiceFormData) => void
}

export function InvoiceForm({ initialData, nextInvoiceNumber, onSave }: InvoiceFormProps) {
  const router = useRouter()
  const mode = initialData ? "edit" : "create"
  const [form, setForm] = useState<InvoiceFormData>(
    initialData || {
      ...defaultInvoiceForm,
      invoiceNumber: nextInvoiceNumber || `INV-${Date.now().toString().slice(-6)}`,
    }
  )

  useEffect(() => {
    if (initialData) {
      setForm(initialData)
    } else if (nextInvoiceNumber && form.invoiceNumber.startsWith("INV") && form.invoiceNumber.length < 15) {
      setForm((prev) => ({ ...prev, invoiceNumber: nextInvoiceNumber }))
    }
  }, [initialData, nextInvoiceNumber])

  const update = <K extends keyof InvoiceFormData>(field: K, value: InvoiceFormData[K]) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  /* ── Derived: supply type ────────────────────────────────────────────────── */
  const supplyType: SupplyType = useMemo(
    () => getSupplyType(form.supplierState, form.placeOfSupply),
    [form.supplierState, form.placeOfSupply]
  )

  /* ── GSTIN validation ────────────────────────────────────────────────────── */
  const supplierGstinValid = isValidGstin(form.supplierGstin)
  const customerGstinValid = isValidGstin(form.customerGstin)

  /* ── Line Item CRUD ──────────────────────────────────────────────────────── */
  const addLineItem = () => {
    const newItem: InvoiceLineItem = { ...emptyLineItem, id: Date.now().toString() }
    update("lineItems", [...form.lineItems, newItem])
  }

  const updateLineItem = (id: string, field: keyof InvoiceLineItem, value: any) => {
    update(
      "lineItems",
      form.lineItems.map((li) => (li.id === id ? { ...li, [field]: value } : li))
    )
  }

  const removeLineItem = (id: string) => {
    update("lineItems", form.lineItems.filter((li) => li.id !== id))
  }

  /* ── Totals (with GST) ───────────────────────────────────────────────────── */
  const gstSummary = useMemo(
    () =>
      computeInvoiceGstSummary(
        form.lineItems.map((li) => ({
          qty: li.qty,
          unitPrice: li.unitPrice,
          gstRate: li.gstRate,
        })),
        supplyType,
        form.discount,
        form.discountType
      ),
    [form.lineItems, supplyType, form.discount, form.discountType]
  )

  /* ── Save ────────────────────────────────────────────────────────────────── */
  const handleSave = () => {
    if (!form.customerName.trim()) {
      alert("Customer Name is required.")
      return
    }
    if (form.lineItems.length === 0) {
      alert("Add at least one line item.")
      return
    }
    onSave({ ...form })
    router.push("/sales/invoices")
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/sales/invoices")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {mode === "create" ? "New Invoice" : "Edit Invoice"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {mode === "create"
              ? "Create a new tax invoice"
              : `Editing: ${form.invoiceNumber} — ${form.customerName}`}
          </p>
        </div>
        {/* Supply type badge */}
        {(form.supplierState || form.placeOfSupply) && (
          <Badge
            variant="outline"
            className={
              supplyType === "intra"
                ? "ml-auto border-blue-500 text-blue-600"
                : "ml-auto border-orange-500 text-orange-600"
            }
          >
            {supplyType === "intra" ? "Intra-State · CGST + SGST" : "Inter-State · IGST"}
          </Badge>
        )}
      </div>

      {/* Form Card */}
      <div className="rounded-lg border bg-card p-6">
        <Tabs defaultValue="details" className="w-full">
          <TabsList className="w-full h-auto p-1 mb-6">
            <TabsTrigger value="details" className="flex-1 py-2 px-3 text-xs sm:text-sm">
              Customer &amp; Details
            </TabsTrigger>
            <TabsTrigger value="items" className="flex-1 py-2 px-3 text-xs sm:text-sm">
              Line Items
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex-1 py-2 px-3 text-xs sm:text-sm">
              Terms &amp; Summary
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Customer & Details ──────────────────────────────────── */}
          <TabsContent value="details" className="space-y-5">
            {/* Invoice metadata */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceNumber">Invoice Number</Label>
                <Input
                  id="invoiceNumber"
                  value={form.invoiceNumber}
                  onChange={(e) => update("invoiceNumber", e.target.value)}
                  placeholder="Enter invoice number"
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

            {/* Customer details */}
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

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={form.invoiceDate}
                  onChange={(e) => update("invoiceDate", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="validUntil">Due Date</Label>
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
                placeholder="Enter PO number"
              />
            </div>

            {/* ── GST Section ────────────────────────────────────────────── */}
            <div className="rounded-lg border border-dashed p-4 space-y-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                GST Details
              </p>

              {/* GSTIN */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierGstin">Your GSTIN</Label>
                  <div className="relative">
                    <Input
                      id="supplierGstin"
                      value={form.supplierGstin}
                      onChange={(e) =>
                        update("supplierGstin", e.target.value.toUpperCase())
                      }
                      placeholder="Enter your GSTIN"
                      className={
                        form.supplierGstin && !supplierGstinValid
                          ? "border-red-500 pr-9"
                          : ""
                      }
                    />
                    {form.supplierGstin && !supplierGstinValid && (
                      <AlertCircle className="absolute right-2.5 top-2.5 h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {form.supplierGstin && !supplierGstinValid && (
                    <p className="text-xs text-red-500">Invalid GSTIN format</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="customerGstin">Customer GSTIN</Label>
                  <div className="relative">
                    <Input
                      id="customerGstin"
                      value={form.customerGstin}
                      onChange={(e) =>
                        update("customerGstin", e.target.value.toUpperCase())
                      }
                      placeholder="Enter customer GSTIN"
                      className={
                        form.customerGstin && !customerGstinValid
                          ? "border-red-500 pr-9"
                          : ""
                      }
                    />
                    {form.customerGstin && !customerGstinValid && (
                      <AlertCircle className="absolute right-2.5 top-2.5 h-4 w-4 text-red-500" />
                    )}
                  </div>
                  {form.customerGstin && !customerGstinValid && (
                    <p className="text-xs text-red-500">Invalid GSTIN format</p>
                  )}
                </div>
              </div>

              {/* State / Place of Supply */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Supplier State</Label>
                  <Select
                    value={form.supplierState}
                    onValueChange={(v) => update("supplierState", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Place of Supply</Label>
                  <Select
                    value={form.placeOfSupply}
                    onValueChange={(v) => update("placeOfSupply", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDIAN_STATES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto-derived supply type indicator */}
              {form.supplierState && form.placeOfSupply && (
                <div
                  className={`rounded-md px-3 py-2 text-xs font-medium ${
                    supplyType === "intra"
                      ? "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300"
                      : "bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-300"
                  }`}
                >
                  {supplyType === "intra"
                    ? `✓ Intra-state supply — CGST + SGST will be applied on line items`
                    : `✓ Inter-state supply — IGST will be applied on line items`}
                </div>
              )}
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

          {/* ── Tab 2: Line Items ──────────────────────────────────────────── */}
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
                  No items added yet. Click &quot;Add Item&quot; to start building the invoice.
                </p>
                <Button size="sm" onClick={addLineItem}>
                  <Plus className="h-4 w-4 mr-1" /> Add First Item
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Column headers */}
                <div className="grid grid-cols-[1.8fr_1.2fr_0.7fr_0.7fr_1fr_0.6fr_1.2fr_auto] gap-2 text-xs font-medium text-muted-foreground px-1">
                  <span>Product / Service</span>
                  <span>Description</span>
                  <span className="text-center">HSN/SAC</span>
                  <span className="text-center">Qty</span>
                  <span className="text-right">Unit Price</span>
                  <span className="text-center">GST %</span>
                  <span className="text-right">Amount</span>
                  <span className="w-9" />
                </div>

                {form.lineItems.map((item) => {
                  const gst = computeLineItemGst(
                    item.qty,
                    item.unitPrice,
                    item.gstRate,
                    supplyType
                  )
                  return (
                    <div
                      key={item.id}
                      className="rounded-md border p-3 space-y-2"
                    >
                      {/* Row 1: main inputs */}
                      <div className="grid grid-cols-[1.8fr_1.2fr_0.7fr_0.7fr_1fr_0.6fr_1.2fr_auto] gap-2 items-center">
                        <Input
                          value={item.productName}
                          onChange={(e) =>
                            updateLineItem(item.id, "productName", e.target.value)
                          }
                          placeholder="Product name"
                          className="text-sm"
                        />
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            updateLineItem(item.id, "description", e.target.value)
                          }
                          placeholder="Details"
                          className="text-sm"
                        />
                        <Input
                          value={item.hsnSac}
                          onChange={(e) =>
                            updateLineItem(item.id, "hsnSac", e.target.value)
                          }
                          placeholder="Enter HSN/SAC"
                          className="text-sm text-center"
                        />
                        <Input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            updateLineItem(item.id, "qty", Number(e.target.value))
                          }
                          className="text-sm text-center"
                        />
                        <Input
                          type="number"
                          min={0}
                          value={item.unitPrice}
                          onChange={(e) =>
                            updateLineItem(item.id, "unitPrice", Number(e.target.value))
                          }
                          className="text-sm text-right"
                        />
                        {/* GST Rate dropdown */}
                        <Select
                          value={String(item.gstRate)}
                          onValueChange={(v) =>
                            updateLineItem(item.id, "gstRate", Number(v) as GstRate)
                          }
                        >
                          <SelectTrigger className="text-sm h-9">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {GST_RATES.map((r) => (
                              <SelectItem key={r} value={String(r)}>
                                {r}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>

                        <div className="text-sm font-medium text-right pr-1">
                          {formatCurrency(gst.lineTotal)}
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

                      {/* Row 2: GST split breakdown (read-only) */}
                      {item.gstRate > 0 && (
                        <div className="flex gap-4 text-xs text-muted-foreground pl-1">
                          <span>
                            Taxable: <span className="font-medium text-foreground">{formatCurrency(gst.taxableAmount)}</span>
                          </span>
                          {supplyType === "intra" ? (
                            <>
                              <span>CGST {gst.cgstPercent}%: <span className="font-medium text-foreground">{formatCurrency(gst.cgstAmount)}</span></span>
                              <span>SGST {gst.sgstPercent}%: <span className="font-medium text-foreground">{formatCurrency(gst.sgstAmount)}</span></span>
                            </>
                          ) : (
                            <span>IGST {gst.igstPercent}%: <span className="font-medium text-foreground">{formatCurrency(gst.igstAmount)}</span></span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* ── Totals ────────────────────────────────────────────── */}
                <div className="flex justify-end pt-3">
                  <div className="w-80 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatCurrency(gstSummary.subtotal)}</span>
                    </div>

                    {supplyType === "intra" ? (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">CGST</span>
                          <span>{formatCurrency(gstSummary.cgstTotal)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">SGST</span>
                          <span>{formatCurrency(gstSummary.sgstTotal)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">IGST</span>
                        <span>{formatCurrency(gstSummary.igstTotal)}</span>
                      </div>
                    )}

                    {gstSummary.discountAmount > 0 && (
                      <div className="flex justify-between text-green-500">
                        <span>Discount</span>
                        <span>-{formatCurrency(gstSummary.discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t pt-2 font-semibold text-base">
                      <span>Grand Total</span>
                      <span>{formatCurrency(gstSummary.grandTotal)}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </TabsContent>

          {/* ── Tab 3: Terms & Summary ─────────────────────────────────────── */}
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
              <Label htmlFor="termsAndConditions">Terms &amp; Conditions</Label>
              <Textarea
                id="termsAndConditions"
                value={form.termsAndConditions}
                onChange={(e) => update("termsAndConditions", e.target.value)}
                rows={6}
              />
            </div>

            {/* ── Final Summary Card ─────────────────────────────────────── */}
            <div className="rounded-lg border p-5 space-y-3">
              <h4 className="font-medium text-sm">Invoice Summary</h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Customer</span>
                <span className="text-right font-medium">{form.customerName || "—"}</span>

                <span className="text-muted-foreground">Invoice #</span>
                <span className="text-right">{form.invoiceNumber}</span>

                {form.supplierGstin && (
                  <>
                    <span className="text-muted-foreground">Your GSTIN</span>
                    <span className="text-right font-mono text-xs">{form.supplierGstin}</span>
                  </>
                )}
                {form.customerGstin && (
                  <>
                    <span className="text-muted-foreground">Customer GSTIN</span>
                    <span className="text-right font-mono text-xs">{form.customerGstin}</span>
                  </>
                )}
                {form.placeOfSupply && (
                  <>
                    <span className="text-muted-foreground">Place of Supply</span>
                    <span className="text-right">{form.placeOfSupply}</span>
                  </>
                )}
                {form.supplierState && form.placeOfSupply && (
                  <>
                    <span className="text-muted-foreground">Supply Type</span>
                    <span className="text-right capitalize">{supplyType}-state</span>
                  </>
                )}

                <span className="text-muted-foreground">Items</span>
                <span className="text-right">{form.lineItems.length}</span>

                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-right">{formatCurrency(gstSummary.subtotal)}</span>

                {supplyType === "intra" ? (
                  <>
                    <span className="text-muted-foreground">CGST</span>
                    <span className="text-right">{formatCurrency(gstSummary.cgstTotal)}</span>
                    <span className="text-muted-foreground">SGST</span>
                    <span className="text-right">{formatCurrency(gstSummary.sgstTotal)}</span>
                  </>
                ) : (
                  <>
                    <span className="text-muted-foreground">IGST</span>
                    <span className="text-right">{formatCurrency(gstSummary.igstTotal)}</span>
                  </>
                )}

                {gstSummary.discountAmount > 0 && (
                  <>
                    <span className="text-muted-foreground">Discount</span>
                    <span className="text-right text-green-500">
                      -{formatCurrency(gstSummary.discountAmount)}
                    </span>
                  </>
                )}

                <span className="text-muted-foreground font-semibold border-t pt-2">Grand Total</span>
                <span className="text-right font-semibold text-base border-t pt-2">
                  {formatCurrency(gstSummary.grandTotal)}
                </span>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => router.push("/sales/invoices")}>
          Cancel
        </Button>
        <Button onClick={handleSave}>
          {mode === "create" ? "Save Invoice" : "Update Invoice"}
        </Button>
      </div>
    </div>
  )
}
