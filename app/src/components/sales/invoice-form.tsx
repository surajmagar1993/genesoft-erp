"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2, AlertCircle, ShieldCheck } from "lucide-react"

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
  TAX_EXEMPTION_REASONS,
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

export type InvoiceStatus = "DRAFT" | "SENT" | "ACCEPTED" | "REJECTED" | "EXPIRED" | "PARTIALLY_PAID" | "PAID" | "OVERDUE" | "CANCELLED"

export type InvoiceDocType = "TAX_INVOICE" | "PROFORMA"

export const TERMS_PRESETS = [
  {
    id: "standard",
    label: "Standard Commercial",
    text: "1. Payment is due within 30 days of the invoice date.\n2. Overdue balances are subject to a late charge of 1.5% per month (18% per annum).\n3. Title of goods/licenses shall remain with the seller until full payment is received.\n4. Any disputes shall be subject to the exclusive jurisdiction of courts at seller's registered city.",
  },
  {
    id: "saas",
    label: "SaaS & Tech Services",
    text: "1. Subscription access and service milestones are billed in advance.\n2. Deliverables are deemed accepted unless written notice is given within 7 calendar days.\n3. Uptime SLA commitments exclude scheduled maintenance and external network disruptions.\n4. All intellectual property remains the exclusive property of the service provider.",
  },
  {
    id: "retail",
    label: "Physical Goods & Delivery",
    text: "1. Consignments must be inspected immediately upon physical receipt.\n2. In-transit damage or shortages must be notified in writing within 48 hours of delivery.\n3. Goods once sold are non-refundable without prior written Return Material Authorization (RMA).\n4. OEM manufacturer warranties apply directly as per product documentation.",
  },
  {
    id: "consulting",
    label: "Milestones & Retainer",
    text: "1. Invoices are submitted upon milestone completion per the approved Statement of Work.\n2. Approved operational and travel disbursements will be invoiced at actuals with receipts.\n3. Professional liability is limited to the total service fees paid under this invoice.\n4. Governed by national commercial arbitration standards.",
  },
]

export interface InvoiceFormData {
  id?: string
  type?: InvoiceDocType
  contactId?: string
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
  declaration?: string
  signatoryName?: string
  signatoryDesignation?: string
  signatureUrl?: string
  discount: number
  discountType: "PERCENT" | "FIXED"
  // GST fields
  supplierGstin: string
  customerGstin: string
  supplierState: string
  placeOfSupply: string
  isTaxExempt?: boolean
  taxExemptionReason?: string
  taxExemptionCertificate?: string
}

export const defaultInvoiceForm: InvoiceFormData = {
  type: "TAX_INVOICE",
  contactId: "",
  invoiceNumber: "",
  customerName: "",
  customerEmail: "",
  invoiceDate: new Date().toISOString().split("T")[0],
  validUntil: "",
  reference: "",
  status: "DRAFT",
  lineItems: [],
  notes: "",
  termsAndConditions: TERMS_PRESETS[0].text,
  declaration:
    "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct.",
  signatoryName: "Authorized Representative",
  signatoryDesignation: "Authorized Signatory",
  discount: 0,
  discountType: "PERCENT",
  supplierGstin: "",
  customerGstin: "",
  supplierState: "",
  placeOfSupply: "",
  isTaxExempt: false,
  taxExemptionReason: "",
  taxExemptionCertificate: "",
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
  contacts?: any[]
  onSave: (data: InvoiceFormData) => void
}

export function InvoiceForm({ initialData, nextInvoiceNumber, contacts, onSave }: InvoiceFormProps) {
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

  /* ── Totals (with GST & Tax Exemption) ─────────────────────────────────── */
  const gstSummary = useMemo(
    () =>
      computeInvoiceGstSummary(
        form.lineItems.map((li) => ({
          qty: li.qty,
          unitPrice: li.unitPrice,
          gstRate: form.isTaxExempt ? 0 : li.gstRate,
          isExempt: form.isTaxExempt,
        })),
        supplyType,
        form.discount,
        form.discountType,
        {
          isTaxExempt: form.isTaxExempt,
          taxExemptionReason: form.taxExemptionReason,
          taxExemptionCertificate: form.taxExemptionCertificate,
        }
      ),
    [form.lineItems, supplyType, form.discount, form.discountType, form.isTaxExempt, form.taxExemptionReason, form.taxExemptionCertificate]
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
            {/* Document Type Selector (Tax Invoice vs Proforma) */}
            <div className="p-4 rounded-lg border bg-muted/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <Label className="text-sm font-semibold">Document Type</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Choose between an official GST Tax Invoice or a Proforma Invoice (Quotation).
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={form.type !== "PROFORMA" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    update("type", "TAX_INVOICE")
                    if (form.invoiceNumber.startsWith("PI-")) {
                      update("invoiceNumber", form.invoiceNumber.replace(/^PI-/, "INV-"))
                    }
                  }}
                  className="text-xs h-8"
                >
                  Tax Invoice (INV-)
                </Button>
                <Button
                  type="button"
                  variant={form.type === "PROFORMA" ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    update("type", "PROFORMA")
                    if (form.invoiceNumber.startsWith("INV-")) {
                      update("invoiceNumber", form.invoiceNumber.replace(/^INV-/, "PI-"))
                    }
                  }}
                  className="text-xs h-8 border-amber-500/40 text-amber-700 dark:text-amber-400"
                >
                  Proforma Invoice (PI-)
                </Button>
              </div>
            </div>

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
                <Label htmlFor="contactId">Customer / Contact *</Label>
                {contacts && contacts.length > 0 ? (
                  <Select
                    value={form.contactId}
                    onValueChange={(val) => {
                      const selected = contacts.find((c) => c.id === val)
                      if (selected) {
                        const isExempt = Boolean(selected.is_tax_exempt || selected.isTaxExempt)
                        const exemptReason = selected.tax_exemption_reason || selected.taxExemptionReason || ""
                        const exemptCert = selected.tax_exemption_certificate || selected.taxExemptionCertificate || ""

                        setForm((prev) => ({
                          ...prev,
                          contactId: val,
                          customerName: selected.display_name,
                          customerEmail: selected.email || "",
                          customerGstin: selected.gstin || "",
                          placeOfSupply: selected.billing_address?.state || (selected.country_code === "IN" ? "Maharashtra" : ""),
                          isTaxExempt: isExempt,
                          taxExemptionReason: exemptReason,
                          taxExemptionCertificate: exemptCert,
                        }))
                      }
                    }}
                  >
                    <SelectTrigger id="contactId">
                      <SelectValue placeholder="Select a customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.display_name} {c.email ? `(${c.email})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex flex-col gap-1">
                    <Input
                      id="customerName"
                      value={form.customerName}
                      onChange={(e) => update("customerName", e.target.value)}
                      placeholder="Enter customer name"
                    />
                    <p className="text-[11px] text-amber-500">
                      No CRM contacts found. You should create a contact first.
                    </p>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerEmail">Customer Email</Label>
                <Input
                  id="customerEmail"
                  type="email"
                  value={form.customerEmail}
                  onChange={(e) => update("customerEmail", e.target.value)}
                  placeholder="Enter customer email"
                  disabled={!!form.contactId}
                />
              </div>
            </div>

            {/* Tax Exemption Alert Banner */}
            {form.isTaxExempt && (
              <div className="p-3 bg-emerald-50/80 border border-emerald-300/80 rounded-lg flex items-start gap-2.5 text-xs text-emerald-900 animate-in fade-in-50">
                <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-emerald-800">Statutory Tax Exemption Applied</span>
                    <Badge variant="outline" className="bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] py-0">0.00% Tax</Badge>
                  </div>
                  <p className="text-emerald-700">
                    Customer is tax exempt ({TAX_EXEMPTION_REASONS.find(r => r.id === form.taxExemptionReason)?.label || form.taxExemptionReason || "Statutory Exemption"})
                    {form.taxExemptionCertificate && <span className="font-mono ml-1 font-medium">[{form.taxExemptionCertificate}]</span>}.
                    CGST, SGST, IGST and VAT are automatically zeroed.
                  </p>
                </div>
              </div>
            )}

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

            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <Label htmlFor="termsAndConditions" className="text-sm font-semibold">
                  Terms &amp; Conditions
                </Label>
                {/* Presets Button Group */}
                <div className="flex flex-wrap gap-1.5">
                  {TERMS_PRESETS.map((preset) => (
                    <Button
                      key={preset.id}
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2.5"
                      onClick={() => update("termsAndConditions", preset.text)}
                    >
                      {preset.label}
                    </Button>
                  ))}
                </div>
              </div>
              <Textarea
                id="termsAndConditions"
                value={form.termsAndConditions}
                onChange={(e) => update("termsAndConditions", e.target.value)}
                rows={5}
                placeholder="Enter formal payment terms, delivery conditions, jurisdiction clauses..."
              />
            </div>

            {/* Statutory GST Declaration */}
            <div className="space-y-2 rounded-lg border p-4 bg-muted/20">
              <div className="flex items-center justify-between">
                <Label htmlFor="declaration" className="text-sm font-semibold">
                  Statutory GST Declaration
                </Label>
                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                  Statutory Rule
                </Badge>
              </div>
              <Textarea
                id="declaration"
                value={
                  form.declaration ??
                  "We declare that this invoice shows the actual price of the goods or services described and that all particulars are true and correct."
                }
                onChange={(e) => update("declaration", e.target.value)}
                rows={2}
                className="text-xs"
              />
            </div>

            {/* Authorized Signatory Configuration */}
            <div className="rounded-lg border p-4 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-semibold">Authorized Signatory &amp; Seal</Label>
                <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 border-emerald-500/30">
                  Digital Authenticated
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="signatoryName" className="text-xs text-muted-foreground">
                    Signatory Name
                  </Label>
                  <Input
                    id="signatoryName"
                    value={form.signatoryName ?? "Authorized Representative"}
                    onChange={(e) => update("signatoryName", e.target.value)}
                    placeholder="e.g. John Doe / Founder"
                    className="text-sm h-8"
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="signatoryDesignation" className="text-xs text-muted-foreground">
                    Designation / Title
                  </Label>
                  <Input
                    id="signatoryDesignation"
                    value={form.signatoryDesignation ?? "Authorized Signatory"}
                    onChange={(e) => update("signatoryDesignation", e.target.value)}
                    placeholder="e.g. Director / Partner / Manager"
                    className="text-sm h-8"
                  />
                </div>
              </div>
            </div>

            {/* ── Final Summary Card ─────────────────────────────────────── */}
            <div className="rounded-lg border p-5 space-y-3">
              <h4 className="font-medium text-sm">Invoice Summary</h4>
              <div className="grid grid-cols-2 gap-y-2 text-sm">
                <span className="text-muted-foreground">Document Type</span>
                <span className="text-right font-medium">
                  {form.type === "PROFORMA" ? (
                    <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-400">
                      Proforma Invoice
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs border-blue-500/40 text-blue-600">
                      Tax Invoice
                    </Badge>
                  )}
                </span>

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
