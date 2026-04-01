"use client"

import { useState, useMemo } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

import {
  GST_RATES,
  GstRate,
  SupplyType,
  computeLineItemGst,
  computeInvoiceGstSummary,
} from "@/lib/gst-engine"
import { createBill, updateBill, BillStatus, BillItem } from "@/app/actions/finance/bills"
import { toast } from "sonner"

interface BillFormProps {
  initialData?: any
  vendors: any[]
  products: any[]
}

export function BillForm({ initialData, vendors, products }: BillFormProps) {
  const router = useRouter()
  const mode = initialData ? "edit" : "create"
  
  const [billNumber, setBillNumber] = useState(initialData?.bill_number || `BILL-${Date.now().toString().slice(-6)}`)
  const [vendorId, setVendorId] = useState(initialData?.contact_id || "")
  const [status, setStatus] = useState<BillStatus>(initialData?.status || "DRAFT")
  const [billDate, setBillDate] = useState(initialData?.bill_date ? new Date(initialData.bill_date).toISOString().split("T")[0] : new Date().toISOString().split("T")[0])
  const [dueDate, setDueDate] = useState(initialData?.due_date ? new Date(initialData.due_date).toISOString().split("T")[0] : "")
  const [notes, setNotes] = useState(initialData?.notes || "")
  const [items, setItems] = useState<BillItem[]>(initialData?.items?.map((item: any) => ({
    productId: item.product_id,
    description: item.description,
    quantity: Number(item.quantity),
    unitPrice: Number(item.unit_price),
    taxPercent: Number(item.tax_percent),
    taxAmount: Number(item.tax_amount),
    lineTotal: Number(item.line_total)
  })) || [])

  const [discount, setDiscount] = useState(initialData?.discount || 0)
  const [supplyType, setSupplyType] = useState<SupplyType>("intra") // Default to intra for now

  const totals = useMemo(() => {
    return computeInvoiceGstSummary(
      items.map(item => ({
        qty: item.quantity,
        unitPrice: item.unitPrice,
        gstRate: item.taxPercent as GstRate
      })),
      supplyType,
      discount,
      "FIXED"
    )
  }, [items, supplyType, discount])

  const addLineItem = () => {
    setItems([...items, {
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxPercent: 18,
      taxAmount: 0,
      lineTotal: 0
    }])
  }

  const updateLineItem = (index: number, field: keyof BillItem, value: any) => {
    const newItems = [...items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Recalculate line total for this item
    if (field === "quantity" || field === "unitPrice" || field === "taxPercent") {
      const q = field === "quantity" ? Number(value) : newItems[index].quantity
      const p = field === "unitPrice" ? Number(value) : newItems[index].unitPrice
      const t = field === "taxPercent" ? Number(value) : newItems[index].taxPercent
      
      const res = computeLineItemGst(q, p, t, supplyType)
      newItems[index].taxAmount = res.totalTaxAmount
      newItems[index].lineTotal = res.lineTotal
    }
    
    setItems(newItems)
  }

  const removeLineItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const handleSave = async () => {
    if (!vendorId) {
      toast.error("Please select a vendor")
      return
    }
    if (items.length === 0) {
      toast.error("Please add at least one item")
      return
    }

    const data = {
      contactId: vendorId,
      billNumber,
      status,
      billDate: new Date(billDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      subtotal: totals.subtotal,
      taxAmount: totals.totalTax,
      discount,
      total: totals.grandTotal,
      currencyCode: "INR",
      notes,
      items
    }

    try {
      if (mode === "create") {
        await createBill(data)
        toast.success("Bill created successfully")
      } else {
        await updateBill(initialData.id, data)
        toast.success("Bill updated successfully")
      }
      router.push("/finance/bills")
    } catch (err: any) {
      toast.error(err.message || "Failed to save bill")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/finance/bills")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            {mode === "create" ? "New Vendor Bill" : "Edit Bill"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Record cost of goods or services from your vendors.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <Select value={vendorId} onValueChange={setVendorId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a vendor" />
                    </SelectTrigger>
                    <SelectContent>
                      {vendors.map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.display_name} {v.company_name ? `(${v.company_name})` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Bill Number *</Label>
                  <Input 
                    value={billNumber} 
                    onChange={(e) => setBillNumber(e.target.value)} 
                    placeholder="e.g. EB-2024-001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Bill Date</Label>
                  <Input 
                    type="date" 
                    value={billDate} 
                    onChange={(e) => setBillDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Due Date</Label>
                  <Input 
                    type="date" 
                    value={dueDate} 
                    onChange={(e) => setDueDate(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as BillStatus)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Draft</SelectItem>
                      <SelectItem value="OPEN">Open</SelectItem>
                      <SelectItem value="PAID">Paid</SelectItem>
                      <SelectItem value="VOID">Void</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Line Items</CardTitle>
              <Button variant="outline" size="sm" onClick={addLineItem}>
                <Plus className="mr-2 h-4 w-4" /> Add Line
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Description</TableHead>
                    <TableHead className="w-[100px]">Qty</TableHead>
                    <TableHead className="w-[150px]">Unit Price</TableHead>
                    <TableHead className="w-[120px]">Tax %</TableHead>
                    <TableHead className="text-right pr-6">Total</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                        No items added. Click "Add Line" to begin.
                      </TableCell>
                    </TableRow>
                  ) : (
                    items.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="pl-6">
                          <Input 
                            value={item.description} 
                            onChange={(e) => updateLineItem(index, "description", e.target.value)}
                            placeholder="Product or service description"
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.quantity} 
                            onChange={(e) => updateLineItem(index, "quantity", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Input 
                            type="number" 
                            value={item.unitPrice} 
                            onChange={(e) => updateLineItem(index, "unitPrice", e.target.value)}
                          />
                        </TableCell>
                        <TableCell>
                          <Select 
                            value={item.taxPercent.toString()} 
                            onValueChange={(v) => updateLineItem(index, "taxPercent", Number(v))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {GST_RATES.map(rate => (
                                <SelectItem key={rate} value={rate.toString()}>{rate}%</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right font-medium pr-6">
                          {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(item.lineTotal)}
                        </TableCell>
                        <TableCell>
                          <Button variant="ghost" size="icon" onClick={() => removeLineItem(index)}>
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <Label>Notes / Terms</Label>
              <Textarea 
                className="mt-2" 
                placeholder="Internal notes or vendor terms..." 
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totals.subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">GST Total</span>
                <span>{new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totals.totalTax)}</span>
              </div>
              <div className="flex justify-between text-sm items-center">
                <span className="text-muted-foreground">Discount</span>
                <div className="flex items-center gap-2">
                  <span>-</span>
                  <Input 
                    type="number" 
                    className="h-8 w-24 text-right" 
                    value={discount}
                    onChange={(e) => setDiscount(Number(e.target.value))}
                  />
                </div>
              </div>
              <div className="pt-4 border-t flex justify-between items-center">
                <span className="font-bold">Total Amount</span>
                <span className="text-xl font-bold text-indigo-600">
                  {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(totals.grandTotal)}
                </span>
              </div>
              
              <Button className="w-full mt-4" size="lg" onClick={handleSave}>
                {mode === "create" ? "Create Bill" : "Update Bill"}
              </Button>
              <Button variant="outline" className="w-full" onClick={() => router.push("/finance/bills")}>
                Cancel
              </Button>
            </CardContent>
          </Card>
          
          <Card className="bg-indigo-50/50 border-indigo-100">
            <CardContent className="pt-6 space-y-2">
              <h4 className="font-semibold text-indigo-900 flex items-center gap-2">
                <Badge variant="outline" className="bg-indigo-100 text-indigo-600 border-indigo-200">Pro Tip</Badge>
              </h4>
              <p className="text-xs text-indigo-800 leading-relaxed">
                Recording bills accurately helps in claiming Input Tax Credit (ITC) during GST filing. Ensure vendor GSTIN is captured in the contact profile.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
