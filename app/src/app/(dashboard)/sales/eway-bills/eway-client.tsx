"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
  Truck,
  FileText,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Plus,
  RefreshCw,
  Search,
  Printer,
  ArrowRight,
  ShieldCheck,
  Building2,
  MapPin,
  ExternalLink,
  Copy,
  Calendar,
  Navigation,
  History,
  Settings,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"

import {
  EwayOverviewData,
  EwayBillRecord,
  generateEwayBill,
  updateEwayBillVehicle,
  cancelEwayBill,
  exportEwayBillNicJson,
  saveTransporter,
} from "@/app/actions/sales/eway-bills"
import {
  EWAY_SUB_SUPPLY_TYPES,
  EWAY_TRANSPORT_MODES,
  EWAY_VEHICLE_TYPES,
  EWAY_DOCUMENT_TYPES,
  calculateEwayBillValidity,
  validateVehicleNumber,
  validatePinCode,
  validateTransporterId,
} from "@/lib/eway-bill-engine"
import { COMPANY } from "@/lib/constants/company"
import { generateQrCodeDataUrl } from "@/lib/barcode/qrcode"

const formatCurrency = (amount: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

const formatDateTime = (dateStr: string | null | undefined) => {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

interface EwayClientProps {
  initialData: EwayOverviewData
}

export function EwayClient({ initialData }: EwayClientProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [activeTab, setActiveTab] = useState("registry")
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "EXPIRED" | "CANCELLED">("ALL")

  // Modal states
  const [slipModalOpen, setSlipModalOpen] = useState(false)
  const [selectedBillForSlip, setSelectedBillForSlip] = useState<EwayBillRecord | null>(null)
  const [qrDataUrl, setQrDataUrl] = useState<string>("")

  const [updateVehicleModalOpen, setUpdateVehicleModalOpen] = useState(false)
  const [targetBillForVehicleUpdate, setTargetBillForVehicleUpdate] = useState<EwayBillRecord | null>(null)
  const [newVehicleNo, setNewVehicleNo] = useState("")
  const [updateReason, setUpdateReason] = useState("Transshipment")
  const [updateFromPlace, setUpdateFromPlace] = useState("")

  const [cancelModalOpen, setCancelModalOpen] = useState(false)
  const [targetBillForCancel, setTargetBillForCancel] = useState<EwayBillRecord | null>(null)
  const [cancelReason, setCancelReason] = useState("Order Cancelled")
  const [cancelRemark, setCancelRemark] = useState("")

  const [addTransporterModalOpen, setAddTransporterModalOpen] = useState(false)
  const [newTransporter, setNewTransporter] = useState({ name: "", gstin: "", phone: "", contactPerson: "" })

  // ── Generator Form State ───────────────────────────────────────────────────
  const [genForm, setGenForm] = useState({
    invoiceId: "",
    subSupplyType: "1", // Supply
    docType: "INV",
    docNo: `INV-${Date.now().toString().slice(-6)}`,
    docDate: new Date().toISOString().split("T")[0],
    fromGstin: COMPANY.gstin || "27AAACG1234F1Z5",
    fromTrdName: COMPANY.name || "Genesoft Technologies Pvt Ltd",
    fromAddr1: "Plot 42, Cyber Heights, Baner Road",
    fromAddr2: "MIDC Phase 2",
    fromPlace: "Pune",
    fromPincode: 411045,
    fromStateCode: 27,
    toGstin: "27AABCA1234A1Z5",
    toTrdName: "Apex Retail Solutions Ltd",
    toAddr1: "Shop 12, Phoenix Marketcity, Viman Nagar",
    toAddr2: "",
    toPlace: "Pune",
    toPincode: 411014,
    toStateCode: 27,
    totalValue: 125000,
    cgstValue: 11250,
    sgstValue: 11250,
    igstValue: 0,
    cessValue: 0,
    transMode: "1", // Road
    transDistance: 120,
    vehicleNo: "MH12AB1234",
    vehicleType: "R",
    transporterId: "29AABCV1234F1Z1",
    transporterName: "VRL Logistics Ltd",
    transDocNo: `GR-${Date.now().toString().slice(-5)}`,
    transDocDate: new Date().toISOString().split("T")[0],
    mainHsn: "8471",
  })

  // Live validity calculation for generator form
  const liveValidity = useMemo(() => {
    return calculateEwayBillValidity(
      Number(genForm.transDistance) || 1,
      (genForm.vehicleType as any) || "R",
      new Date()
    )
  }, [genForm.transDistance, genForm.vehicleType])

  // Filtered bills
  const filteredBills = useMemo(() => {
    let list = initialData.bills
    if (statusFilter !== "ALL") {
      list = list.filter((b) => b.status === statusFilter)
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      list = list.filter(
        (b) =>
          b.ewayBillNo.toLowerCase().includes(q) ||
          b.docNo.toLowerCase().includes(q) ||
          b.toTrdName.toLowerCase().includes(q) ||
          (b.vehicleNo && b.vehicleNo.toLowerCase().includes(q)) ||
          (b.transporterName && b.transporterName.toLowerCase().includes(q))
      )
    }
    return list
  }, [initialData.bills, statusFilter, searchQuery])

  // Open slip modal with QR generation
  const handleOpenSlip = async (bill: EwayBillRecord) => {
    setSelectedBillForSlip(bill)
    try {
      const qrUrl = await generateQrCodeDataUrl(bill.qrPayload || `EWB:${bill.ewayBillNo}`, {
        width: 140,
        margin: 1,
      })
      setQrDataUrl(qrUrl)
    } catch (e) {
      console.error("QR gen error:", e)
    }
    setSlipModalOpen(true)
  }

  // Populate generator from eligible candidate invoice
  const handleSelectInvoiceCandidate = (cand: any) => {
    setGenForm((prev) => ({
      ...prev,
      invoiceId: cand.id,
      docNo: cand.invoiceNumber,
      docDate: cand.invoiceDate || prev.docDate,
      toTrdName: cand.customerName,
      toGstin: cand.customerGstin || prev.toGstin,
      totalValue: Math.round(cand.total * 0.84),
      cgstValue: cand.supplyType === "Intra-State" ? Math.round(cand.total * 0.08) : 0,
      sgstValue: cand.supplyType === "Intra-State" ? Math.round(cand.total * 0.08) : 0,
      igstValue: cand.supplyType === "Inter-State" ? Math.round(cand.total * 0.16) : 0,
    }))
    setActiveTab("generate")
    toast.info(`Pre-filled consignment details from Invoice ${cand.invoiceNumber}`)
  }

  // Generate E-Way Bill submit
  const handleGenerateSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const vRes = validateVehicleNumber(genForm.vehicleNo)
    if (!vRes.isValid && genForm.transMode === "1") {
      toast.error(vRes.error)
      return
    }

    startTransition(async () => {
      const res = await generateEwayBill({
        ...genForm,
        subSupplyType: genForm.subSupplyType as any,
        docType: genForm.docType as any,
        transMode: genForm.transMode as any,
        vehicleType: genForm.vehicleType as any,
        supplyType: "O",
        itemList: [
          {
            productName: "Consignment Goods / Supplies",
            hsnCode: genForm.mainHsn,
            quantity: 1,
            qtyUnit: "NOS",
            cgstRate: genForm.cgstValue > 0 ? 9 : 0,
            sgstRate: genForm.sgstValue > 0 ? 9 : 0,
            igstRate: genForm.igstValue > 0 ? 18 : 0,
            taxableAmount: genForm.totalValue,
          },
        ],
      })

      if (res.success && res.ewayBill) {
        toast.success(`E-Way Bill #${res.ewayBill.ewayBillNo} generated successfully!`)
        setActiveTab("registry")
        router.refresh()
        handleOpenSlip(res.ewayBill)
      } else {
        toast.error(res.error || "Failed to generate E-Way Bill")
      }
    })
  }

  // Update vehicle in transit submit
  const handleUpdateVehicleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetBillForVehicleUpdate) return

    const vRes = validateVehicleNumber(newVehicleNo)
    if (!vRes.isValid) {
      toast.error(vRes.error)
      return
    }

    startTransition(async () => {
      const res = await updateEwayBillVehicle(targetBillForVehicleUpdate.id, {
        vehicleNo: newVehicleNo,
        reason: updateReason,
        fromPlace: updateFromPlace || targetBillForVehicleUpdate.fromPlace,
      })

      if (res.success) {
        toast.success("Part-B Vehicle details updated successfully in transit!")
        setUpdateVehicleModalOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to update vehicle")
      }
    })
  }

  // Cancel E-Way Bill submit
  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!targetBillForCancel) return

    startTransition(async () => {
      const res = await cancelEwayBill(targetBillForCancel.id, cancelReason, cancelRemark)
      if (res.success) {
        toast.success(`E-Way Bill #${targetBillForCancel.ewayBillNo} cancelled successfully`)
        setCancelModalOpen(false)
        router.refresh()
      } else {
        toast.error(res.error || "Failed to cancel E-Way Bill")
      }
    })
  }

  // Export NIC bulk upload JSON
  const handleExportNicJson = async () => {
    startTransition(async () => {
      const res = await exportEwayBillNicJson([])
      if (res.success && res.jsonContent) {
        const blob = new Blob([res.jsonContent], { type: "application/json" })
        const url = URL.createObjectURL(blob)
        const a = document.createElement("a")
        a.href = url
        a.download = res.filename || "EWAY_BILLS_NIC_BULK.json"
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        URL.revokeObjectURL(url)
        toast.success(`Exported ${res.count} E-Way Bill(s) to NIC bulk upload JSON`)
      } else {
        toast.error(res.error || "Failed to export NIC JSON")
      }
    })
  }

  // Add transporter submit
  const handleAddTransporterSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    startTransition(async () => {
      const res = await saveTransporter(newTransporter)
      if (res.success && res.transporter) {
        toast.success(`Transporter ${res.transporter.name} saved!`)
        setAddTransporterModalOpen(false)
        setNewTransporter({ name: "", gstin: "", phone: "", contactPerson: "" })
        router.refresh()
      } else {
        toast.error(res.error || "Failed to save transporter")
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-3xl font-bold tracking-tight">E-Way Bills Studio</h1>
            <Badge variant="outline" className="border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold text-xs">
              🇮🇳 Rule 138 CGST
            </Badge>
          </div>
          <p className="text-muted-foreground mt-1">
            Generate statutory E-Way Bills, update vehicle in transit, calculate road validity, and export NIC bulk upload JSON.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => router.refresh()} disabled={isPending}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportNicJson} disabled={isPending}>
            <Download className="mr-2 h-4 w-4" />
            Export NIC JSON
          </Button>
          <Button size="sm" onClick={() => setActiveTab("generate")}>
            <Plus className="mr-2 h-4 w-4" />
            Generate E-Way Bill
          </Button>
        </div>
      </div>

      {/* 4 Telemetry KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Active in Transit</span>
              <Truck className="h-4 w-4 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600">
              {initialData.telemetry.activeInTransitCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {initialData.telemetry.activeInTransitCount > 0 ? "Consignments with valid Part-B" : "No active shipments"}
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Cargo Value in Transit</span>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-blue-600">
              {formatCurrency(initialData.telemetry.totalValueInTransit)}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Total invoice value on road
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Expiring Soon (&lt;24h)</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-amber-600">
              {initialData.telemetry.expiringSoonCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            Requires extension or completion
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-400 shadow-sm">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs uppercase font-medium flex items-center justify-between">
              <span>Total Generated</span>
              <FileText className="h-4 w-4 text-slate-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {initialData.telemetry.totalBillsCount}
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0 text-xs text-muted-foreground">
            {initialData.telemetry.cancelledCount} statutory cancellations
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs Workspace */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-[650px]">
          <TabsTrigger value="registry" className="text-xs font-semibold">
            Registry ({filteredBills.length})
          </TabsTrigger>
          <TabsTrigger value="generate" className="text-xs font-semibold">
            Generate EWB
          </TabsTrigger>
          <TabsTrigger value="part-b" className="text-xs font-semibold">
            Update Part-B
          </TabsTrigger>
          <TabsTrigger value="settings" className="text-xs font-semibold">
            NIC &amp; Transporters
          </TabsTrigger>
        </TabsList>

        {/* ── TAB 1: REGISTRY ── */}
        <TabsContent value="registry" className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by EWB, invoice, vehicle, recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-36 text-xs">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 text-xs">
                    <TableHead className="pl-6">E-Way Bill No</TableHead>
                    <TableHead>Doc &amp; Date</TableHead>
                    <TableHead>Recipient (Ship To)</TableHead>
                    <TableHead>Vehicle &amp; Mode</TableHead>
                    <TableHead className="text-right">Value (INR)</TableHead>
                    <TableHead>Validity</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right pr-6">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredBills.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="h-32 text-center text-muted-foreground text-sm">
                        No E-Way Bills found matching the current filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBills.map((b) => (
                      <TableRow key={b.id} className="text-xs">
                        <TableCell className="pl-6 font-mono font-bold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <span>{b.ewayBillNo.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => {
                                navigator.clipboard.writeText(b.ewayBillNo)
                                toast.success("Copied EWB Number to clipboard!")
                              }}
                            >
                              <Copy className="h-3 w-3 text-muted-foreground" />
                            </Button>
                          </div>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            Gen: {formatDate(b.generatedAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="font-semibold text-foreground">{b.docNo}</span>
                          <p className="text-[10px] text-muted-foreground">{b.docType} • {formatDate(b.docDate)}</p>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">{b.toTrdName}</span>
                          <p className="text-[10px] text-muted-foreground">{b.toPlace} ({b.toPincode})</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="font-mono text-[10px] uppercase font-bold bg-muted/60">
                              {b.vehicleNo || "NO VEHICLE"}
                            </Badge>
                            <span className="text-[10px] text-muted-foreground">({b.approxDistanceKm} km)</span>
                          </div>
                          <p className="text-[10px] text-muted-foreground">{b.transporterName || "Self"}</p>
                        </TableCell>
                        <TableCell className="text-right font-semibold font-mono">
                          {formatCurrency(b.totInvValue)}
                        </TableCell>
                        <TableCell>
                          {b.status === "ACTIVE" ? (
                            <div className="space-y-0.5">
                              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 text-[10px]">
                                {b.hoursRemaining > 24
                                  ? `${Math.round(b.hoursRemaining / 24)} days left`
                                  : `${b.hoursRemaining}h left`}
                              </Badge>
                              <p className="text-[10px] text-muted-foreground">{formatDateTime(b.validUntil)}</p>
                            </div>
                          ) : b.status === "EXPIRED" ? (
                            <Badge variant="outline" className="border-amber-500 text-amber-600 text-[10px]">
                              Expired
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="text-[10px]">
                              Cancelled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              b.status === "ACTIVE" ? "default" : b.status === "CANCELLED" ? "destructive" : "secondary"
                            }
                            className="text-[10px] uppercase"
                          >
                            {b.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => handleOpenSlip(b)}
                            >
                              <Printer className="mr-1 h-3.5 w-3.5" />
                              Slip
                            </Button>
                            {b.status === "ACTIVE" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs px-2 text-blue-600 hover:text-blue-700"
                                  onClick={() => {
                                    setTargetBillForVehicleUpdate(b)
                                    setNewVehicleNo(b.vehicleNo || "")
                                    setUpdateFromPlace(b.fromPlace)
                                    setUpdateVehicleModalOpen(true)
                                  }}
                                >
                                  Vehicle
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 text-xs px-2 text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setTargetBillForCancel(b)
                                    setCancelModalOpen(true)
                                  }}
                                >
                                  Cancel
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 2: GENERATE E-WAY BILL DESK ── */}
        <TabsContent value="generate" className="space-y-6">
          {/* Candidate Invoices Notification */}
          {initialData.eligibleInvoices.filter((i) => !i.hasEwayBill).length > 0 && (
            <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-indigo-600" />
                  Tax Invoices Requiring Statutory E-Way Bill (&gt; ₹50,000)
                </CardTitle>
                <CardDescription className="text-xs text-indigo-700 dark:text-indigo-300">
                  Select an eligible invoice to auto-fill consignor, consignee, HSN, and GST details in 1-click.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {initialData.eligibleInvoices
                    .filter((i) => !i.hasEwayBill)
                    .slice(0, 6)
                    .map((cand) => (
                      <div
                        key={cand.id}
                        onClick={() => handleSelectInvoiceCandidate(cand)}
                        className="p-3 bg-background rounded-md border hover:border-indigo-500 hover:shadow-xs cursor-pointer transition-all space-y-1 text-xs"
                      >
                        <div className="flex justify-between font-bold">
                          <span>{cand.invoiceNumber}</span>
                          <span className="text-indigo-600">{formatCurrency(cand.total)}</span>
                        </div>
                        <p className="text-muted-foreground text-[11px] truncate">{cand.customerName}</p>
                        <div className="flex justify-between text-[10px] text-muted-foreground pt-1 border-t">
                          <span>{cand.supplyType}</span>
                          <span className="text-indigo-600 font-semibold flex items-center gap-0.5">
                            Auto-Fill <ArrowRight className="h-3 w-3" />
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </CardContent>
            </Card>
          )}

          <form onSubmit={handleGenerateSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Part A: Consignment & Value (2 Cols) */}
              <div className="lg:col-span-2 space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <FileText className="h-4 w-4 text-primary" />
                      Part A: Consignment &amp; Tax Particulars (Rule 138(1))
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-xs">Sub-Supply Type *</Label>
                        <Select
                          value={genForm.subSupplyType}
                          onValueChange={(v) => setGenForm({ ...genForm, subSupplyType: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(EWAY_SUB_SUPPLY_TYPES).map((s) => (
                              <SelectItem key={s.code} value={s.code} className="text-xs">
                                {s.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Document Type *</Label>
                        <Select
                          value={genForm.docType}
                          onValueChange={(v) => setGenForm({ ...genForm, docType: v })}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.entries(EWAY_DOCUMENT_TYPES).map(([code, label]) => (
                              <SelectItem key={code} value={code} className="text-xs">
                                {label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs">Document No. *</Label>
                        <Input
                          className="h-8 text-xs"
                          value={genForm.docNo}
                          onChange={(e) => setGenForm({ ...genForm, docNo: e.target.value })}
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-2 border-t">
                      {/* From (Consignor) */}
                      <div className="space-y-2 p-3 bg-muted/20 rounded-lg border">
                        <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                          <Building2 className="h-3.5 w-3.5 text-primary" />
                          From (Consignor / Dispatch)
                        </h4>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Trade / Legal Name</Label>
                          <Input
                            className="h-7 text-xs"
                            value={genForm.fromTrdName}
                            onChange={(e) => setGenForm({ ...genForm, fromTrdName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Supplier GSTIN</Label>
                          <Input
                            className="h-7 text-xs font-mono uppercase"
                            value={genForm.fromGstin}
                            onChange={(e) => setGenForm({ ...genForm, fromGstin: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">Dispatch City</Label>
                            <Input
                              className="h-7 text-xs"
                              value={genForm.fromPlace}
                              onChange={(e) => setGenForm({ ...genForm, fromPlace: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">PIN Code *</Label>
                            <Input
                              type="number"
                              className="h-7 text-xs font-mono"
                              value={genForm.fromPincode}
                              onChange={(e) => setGenForm({ ...genForm, fromPincode: Number(e.target.value) })}
                              required
                            />
                          </div>
                        </div>
                      </div>

                      {/* To (Consignee) */}
                      <div className="space-y-2 p-3 bg-muted/20 rounded-lg border">
                        <h4 className="font-bold text-xs flex items-center gap-1.5 text-foreground">
                          <MapPin className="h-3.5 w-3.5 text-primary" />
                          To (Consignee / Delivery)
                        </h4>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Recipient Name</Label>
                          <Input
                            className="h-7 text-xs"
                            value={genForm.toTrdName}
                            onChange={(e) => setGenForm({ ...genForm, toTrdName: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Recipient GSTIN / URP</Label>
                          <Input
                            className="h-7 text-xs font-mono uppercase"
                            value={genForm.toGstin}
                            onChange={(e) => setGenForm({ ...genForm, toGstin: e.target.value })}
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">Destination City</Label>
                            <Input
                              className="h-7 text-xs"
                              value={genForm.toPlace}
                              onChange={(e) => setGenForm({ ...genForm, toPlace: e.target.value })}
                              required
                            />
                          </div>
                          <div className="space-y-1.5">
                            <Label className="text-[11px] text-muted-foreground">PIN Code *</Label>
                            <Input
                              type="number"
                              className="h-7 text-xs font-mono"
                              value={genForm.toPincode}
                              onChange={(e) => setGenForm({ ...genForm, toPincode: Number(e.target.value) })}
                              required
                            />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Consignment Item & Value Details */}
                    <div className="pt-2 border-t space-y-3">
                      <h4 className="font-bold text-xs text-foreground">Consignment Value &amp; Taxes</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Main HSN Code *</Label>
                          <Input
                            className="h-7 text-xs font-mono"
                            value={genForm.mainHsn}
                            onChange={(e) => setGenForm({ ...genForm, mainHsn: e.target.value })}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">Taxable Value (₹) *</Label>
                          <Input
                            type="number"
                            className="h-7 text-xs font-mono"
                            value={genForm.totalValue}
                            onChange={(e) => setGenForm({ ...genForm, totalValue: Number(e.target.value) })}
                            required
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">CGST (₹)</Label>
                          <Input
                            type="number"
                            className="h-7 text-xs font-mono"
                            value={genForm.cgstValue}
                            onChange={(e) => setGenForm({ ...genForm, cgstValue: Number(e.target.value) })}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[11px] text-muted-foreground">SGST / IGST (₹)</Label>
                          <Input
                            type="number"
                            className="h-7 text-xs font-mono"
                            value={genForm.sgstValue || genForm.igstValue}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              if (genForm.fromStateCode === genForm.toStateCode) {
                                setGenForm({ ...genForm, sgstValue: val, igstValue: 0 })
                              } else {
                                setGenForm({ ...genForm, igstValue: val, sgstValue: 0, cgstValue: 0 })
                              }
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Part B: Transportation Details (1 Col Sidebar) */}
              <div className="space-y-6">
                <Card>
                  <CardHeader className="pb-4">
                    <CardTitle className="text-base font-bold flex items-center gap-2">
                      <Truck className="h-4 w-4 text-primary" />
                      Part B: Vehicle &amp; Transporter
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-xs">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Transport Mode *</Label>
                      <Select
                        value={genForm.transMode}
                        onValueChange={(v) => setGenForm({ ...genForm, transMode: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(EWAY_TRANSPORT_MODES).map((m) => (
                            <SelectItem key={m.code} value={m.code} className="text-xs">
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Vehicle Number *</Label>
                        <span className="text-[10px] text-muted-foreground">e.g. MH12AB1234</span>
                      </div>
                      <Input
                        className="h-8 text-xs font-mono uppercase font-bold"
                        value={genForm.vehicleNo}
                        onChange={(e) => setGenForm({ ...genForm, vehicleNo: e.target.value })}
                        placeholder="MH12AB1234"
                        required
                      />
                      {genForm.vehicleNo && !validateVehicleNumber(genForm.vehicleNo).isValid && (
                        <p className="text-[10px] text-destructive">
                          Invalid vehicle format (State + RTO + Series + 4 Digits)
                        </p>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Vehicle Type *</Label>
                      <Select
                        value={genForm.vehicleType}
                        onValueChange={(v) => setGenForm({ ...genForm, vehicleType: v })}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(EWAY_VEHICLE_TYPES).map((vt) => (
                            <SelectItem key={vt.code} value={vt.code} className="text-xs">
                              {vt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-xs">Approx Distance (KM) *</Label>
                        <span className="text-[10px] text-emerald-600 font-semibold">
                          {liveValidity.validityDays} Day(s) Validity
                        </span>
                      </div>
                      <Input
                        type="number"
                        min="1"
                        className="h-8 text-xs font-mono"
                        value={genForm.transDistance}
                        onChange={(e) => setGenForm({ ...genForm, transDistance: Number(e.target.value) })}
                        required
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Valid until: {formatDateTime(liveValidity.validUntil.toISOString())}
                      </p>
                    </div>

                    <div className="space-y-1.5 pt-2 border-t">
                      <Label className="text-xs">Transporter (Optional)</Label>
                      <Select
                        value={genForm.transporterId}
                        onValueChange={(v) => {
                          const tr = initialData.transporters.find((t) => t.gstin === v)
                          setGenForm({
                            ...genForm,
                            transporterId: v,
                            transporterName: tr?.name || "",
                          })
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue placeholder="Select Transporter" />
                        </SelectTrigger>
                        <SelectContent>
                          {initialData.transporters.map((t) => (
                            <SelectItem key={t.id} value={t.gstin} className="text-xs">
                              {t.name} ({t.gstin.slice(0, 5)}...)
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="p-3 bg-muted/40 rounded-lg space-y-1 text-xs border">
                      <div className="flex justify-between font-semibold">
                        <span>Total Consignment Value:</span>
                        <span className="text-primary font-bold">
                          {formatCurrency(
                            genForm.totalValue + genForm.cgstValue + genForm.sgstValue + genForm.igstValue
                          )}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Mandatory compliance per Rule 138 (Value &gt; ₹50,000).
                      </p>
                    </div>

                    <Button type="submit" className="w-full" size="lg" disabled={isPending}>
                      <Truck className="mr-2 h-4 w-4" />
                      {isPending ? "Generating E-Way Bill..." : "Generate Indian E-Way Bill"}
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </form>
        </TabsContent>

        {/* ── TAB 3: UPDATE PART-B DESK ── */}
        <TabsContent value="part-b" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Navigation className="h-4 w-4 text-primary" />
                Part-B Vehicle Updation Desk (Rule 138(5))
              </CardTitle>
              <CardDescription className="text-xs">
                When goods are transferred from one vehicle to another in transit (breakdown, transshipment, or change of transporter),
                the consignor or transporter must update Part-B prior to movement.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {initialData.bills
                    .filter((b) => b.status === "ACTIVE")
                    .map((b) => (
                      <div
                        key={b.id}
                        className="p-4 rounded-lg border bg-card hover:border-primary transition-all space-y-2 text-xs"
                      >
                        <div className="flex items-center justify-between font-bold">
                          <span>{b.ewayBillNo}</span>
                          <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">ACTIVE</Badge>
                        </div>
                        <p className="text-muted-foreground">{b.docNo} • {b.toTrdName}</p>
                        <div className="flex justify-between items-center bg-muted/30 p-2 rounded text-[11px] font-mono">
                          <span>Current Vehicle:</span>
                          <span className="font-bold">{b.vehicleNo || "None"}</span>
                        </div>
                        <div className="flex justify-between items-center text-[11px] text-muted-foreground">
                          <span>Validity:</span>
                          <span>{b.hoursRemaining}h remaining</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full mt-2 text-xs"
                          onClick={() => {
                            setTargetBillForVehicleUpdate(b)
                            setNewVehicleNo(b.vehicleNo || "")
                            setUpdateFromPlace(b.fromPlace)
                            setUpdateVehicleModalOpen(true)
                          }}
                        >
                          <Truck className="mr-1.5 h-3.5 w-3.5 text-blue-600" />
                          Update Vehicle in Transit
                        </Button>
                      </div>
                    ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── TAB 4: NIC & TRANSPORTERS SETTINGS ── */}
        <TabsContent value="settings" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Download className="h-4 w-4 text-primary" />
                  Government NIC Bulk Upload Utility
                </CardTitle>
                <CardDescription className="text-xs">
                  Download official JSON files formatted according to the National Informatics Centre (NIC) Bulk Upload specifications
                  for direct ingestion into <code>ewaybillgst.gov.in</code>.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-xs">
                <div className="p-3 bg-muted/40 rounded-lg space-y-1">
                  <p className="font-semibold text-foreground">Active E-Way Bills for Export: {initialData.bills.length}</p>
                  <p className="text-muted-foreground text-[11px]">
                    Includes consignor GSTIN, consignee GSTIN, HSN codes, invoice amounts, transport modes, and vehicle numbers.
                  </p>
                </div>
                <Button onClick={handleExportNicJson} disabled={isPending} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download NIC Bulk Upload JSON
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Truck className="h-4 w-4 text-primary" />
                    Transporter Directory
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Registered logistics partners &amp; TRANSIN profiles.
                  </CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => setAddTransporterModalOpen(true)}>
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add Transporter
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 text-xs">
                {initialData.transporters.map((t) => (
                  <div key={t.id} className="p-3 border rounded-lg flex items-center justify-between bg-card">
                    <div>
                      <p className="font-bold text-foreground">{t.name}</p>
                      <p className="text-muted-foreground font-mono text-[11px]">GSTIN: {t.gstin}</p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {t.phone || "Active"}
                    </Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ── MODAL 1: OFFICIAL PRINTABLE E-WAY BILL SLIP ── */}
      <Dialog open={slipModalOpen} onOpenChange={setSlipModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-6 print:p-0 print:border-none print:shadow-none">
          <DialogHeader className="print:hidden">
            <DialogTitle className="flex items-center justify-between">
              <span>Official Statutory E-Way Bill Slip</span>
              <Button size="sm" variant="outline" onClick={() => window.print()}>
                <Printer className="mr-1.5 h-4 w-4" />
                Print Slip (A4)
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedBillForSlip && (
            <div className="border-2 border-foreground p-6 rounded-md bg-background text-foreground space-y-4 print:p-4 print:border-black">
              {/* Government Header */}
              <div className="border-b-2 border-foreground pb-3 text-center space-y-1">
                <h2 className="text-lg font-black tracking-wider uppercase">Government of India</h2>
                <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                  Electronic Way Bill System (Form GST EWB-01)
                </h3>
                <p className="text-[11px] text-muted-foreground">
                  [See Rule 138 of the Central Goods and Services Tax Rules, 2017]
                </p>
              </div>

              {/* Barcode / QR & EWB Main Details */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-3 bg-muted/20 border border-foreground/30 rounded">
                <div className="space-y-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold">E-Way Bill No:</span>
                    <span className="text-base font-black font-mono tracking-widest text-primary">
                      {selectedBillForSlip.ewayBillNo.replace(/(\d{4})(\d{4})(\d{4})/, "$1 $2 $3")}
                    </span>
                  </div>
                  <p>
                    <span className="font-semibold">E-Way Bill Date:</span>{" "}
                    {formatDateTime(selectedBillForSlip.generatedAt)}
                  </p>
                  <p>
                    <span className="font-semibold">Generated By:</span> {selectedBillForSlip.fromGstin} (
                    {selectedBillForSlip.fromTrdName})
                  </p>
                  <p>
                    <span className="font-semibold">Valid Until:</span>{" "}
                    <span className="font-bold underline">{formatDateTime(selectedBillForSlip.validUntil)}</span>
                  </p>
                </div>
                {qrDataUrl && (
                  <div className="text-center">
                    <img src={qrDataUrl} alt="E-Way Bill QR Code" className="w-28 h-28 mx-auto border bg-white p-1" />
                    <span className="text-[9px] text-muted-foreground font-mono">Verify via NIC App</span>
                  </div>
                )}
              </div>

              {/* Part A Table */}
              <div>
                <h4 className="font-bold text-xs uppercase bg-muted p-1.5 border border-b-0 font-mono">
                  PART - A (Particulars of Consignment)
                </h4>
                <div className="border text-xs divide-y">
                  <div className="grid grid-cols-2 p-2">
                    <div>
                      <span className="font-bold">1. GSTIN of Supplier:</span> {selectedBillForSlip.fromGstin}
                      <p className="text-[11px] text-muted-foreground">{selectedBillForSlip.fromTrdName}</p>
                    </div>
                    <div>
                      <span className="font-bold">2. Place of Dispatch:</span> {selectedBillForSlip.fromPlace} -{" "}
                      {selectedBillForSlip.fromPincode}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 p-2">
                    <div>
                      <span className="font-bold">3. GSTIN of Recipient:</span> {selectedBillForSlip.toGstin}
                      <p className="text-[11px] text-muted-foreground">{selectedBillForSlip.toTrdName}</p>
                    </div>
                    <div>
                      <span className="font-bold">4. Place of Delivery:</span> {selectedBillForSlip.toPlace} -{" "}
                      {selectedBillForSlip.toPincode}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 p-2">
                    <div>
                      <span className="font-bold">5. Document No:</span> {selectedBillForSlip.docNo}
                    </div>
                    <div>
                      <span className="font-bold">6. Document Date:</span> {formatDate(selectedBillForSlip.docDate)}
                    </div>
                    <div>
                      <span className="font-bold">7. Document Type:</span> {selectedBillForSlip.docType}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 p-2">
                    <div>
                      <span className="font-bold">8. Value of Goods:</span> {formatCurrency(selectedBillForSlip.totalValue)}
                    </div>
                    <div>
                      <span className="font-bold">9. HSN Code:</span> {selectedBillForSlip.mainHsn}
                    </div>
                    <div>
                      <span className="font-bold">10. Reason:</span>{" "}
                      {EWAY_SUB_SUPPLY_TYPES[selectedBillForSlip.subSupplyType]?.label || "Supply"}
                    </div>
                  </div>
                  <div className="p-2 bg-muted/10 font-bold flex justify-between">
                    <span>Total Consignment Invoice Value (Including Taxes):</span>
                    <span className="text-sm font-black font-mono">
                      {formatCurrency(selectedBillForSlip.totInvValue)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Part B Table */}
              <div>
                <h4 className="font-bold text-xs uppercase bg-muted p-1.5 border border-b-0 font-mono">
                  PART - B (Transport Information)
                </h4>
                <Table className="border text-xs">
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Mode</TableHead>
                      <TableHead>Vehicle / Doc No</TableHead>
                      <TableHead>From</TableHead>
                      <TableHead>Entered Date</TableHead>
                      <TableHead>Multi-Vehicle Remark</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-semibold">
                        {EWAY_TRANSPORT_MODES[selectedBillForSlip.transMode]?.label || "Road"}
                      </TableCell>
                      <TableCell className="font-mono font-bold uppercase">
                        {selectedBillForSlip.vehicleNo || selectedBillForSlip.transDocNo || "—"}
                      </TableCell>
                      <TableCell>{selectedBillForSlip.fromPlace}</TableCell>
                      <TableCell>{formatDate(selectedBillForSlip.generatedAt)}</TableCell>
                      <TableCell className="text-muted-foreground">Initial Assignment</TableCell>
                    </TableRow>
                    {selectedBillForSlip.vehicleUpdateHistory?.map((h, i) => (
                      <TableRow key={i} className="text-muted-foreground">
                        <TableCell>Road</TableCell>
                        <TableCell className="font-mono font-semibold">{h.vehicleNo}</TableCell>
                        <TableCell>{h.fromPlace}</TableCell>
                        <TableCell>{formatDate(h.updatedAt)}</TableCell>
                        <TableCell>{h.reason}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="pt-3 border-t text-[10px] text-muted-foreground flex justify-between items-center">
                <span>Computer generated statutory document under Goods and Services Tax Act. No physical signature required.</span>
                <span className="font-mono">Genesoft ERP • NIC Compliant</span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── MODAL 2: UPDATE VEHICLE MODAL ── */}
      <Dialog open={updateVehicleModalOpen} onOpenChange={setUpdateVehicleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update Part-B Vehicle in Transit</DialogTitle>
            <DialogDescription className="text-xs">
              Rule 138(5): Update vehicle registration number for consignment in transit.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdateVehicleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">New Vehicle Number *</Label>
              <Input
                className="font-mono uppercase font-bold text-xs"
                placeholder="MH12AB1234"
                value={newVehicleNo}
                onChange={(e) => setNewVehicleNo(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Current Place / City *</Label>
              <Input
                className="text-xs"
                placeholder="e.g. Nashik"
                value={updateFromPlace}
                onChange={(e) => setUpdateFromPlace(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Reason for Change *</Label>
              <Select value={updateReason} onValueChange={setUpdateReason}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Transshipment">Transshipment</SelectItem>
                  <SelectItem value="Break Down">Vehicle Break Down</SelectItem>
                  <SelectItem value="Change of Transporter">Change of Transporter</SelectItem>
                  <SelectItem value="Others">Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setUpdateVehicleModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Update Vehicle
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 3: CANCEL E-WAY BILL MODAL ── */}
      <Dialog open={cancelModalOpen} onOpenChange={setCancelModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-destructive flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" />
              Cancel E-Way Bill
            </DialogTitle>
            <DialogDescription className="text-xs">
              Rule 138(9): E-Way bills can only be cancelled within 24 hours of generation if goods have not been transported.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCancelSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Reason for Cancellation *</Label>
              <Select value={cancelReason} onValueChange={setCancelReason}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1: Duplicate">1: Duplicate</SelectItem>
                  <SelectItem value="2: Order Cancelled">2: Order Cancelled</SelectItem>
                  <SelectItem value="3: Data Entry Mistake">3: Data Entry Mistake</SelectItem>
                  <SelectItem value="4: Others">4: Others</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Remark / Note</Label>
              <Textarea
                className="text-xs"
                placeholder="Optional remark..."
                value={cancelRemark}
                onChange={(e) => setCancelRemark(e.target.value)}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setCancelModalOpen(false)}>
                Go Back
              </Button>
              <Button type="submit" variant="destructive" disabled={isPending}>
                Confirm Cancellation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── MODAL 4: ADD TRANSPORTER MODAL ── */}
      <Dialog open={addTransporterModalOpen} onOpenChange={setAddTransporterModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Logistics Partner / Transporter</DialogTitle>
            <DialogDescription className="text-xs">
              Enter 15-character GSTIN or TRANSIN for direct carrier assignment.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddTransporterSubmit} className="space-y-4 py-2 text-xs">
            <div className="space-y-1.5">
              <Label className="text-xs">Transporter Name *</Label>
              <Input
                className="text-xs"
                placeholder="e.g. Safexpress Pvt Ltd"
                value={newTransporter.name}
                onChange={(e) => setNewTransporter({ ...newTransporter, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Transporter ID (GSTIN / TRANSIN) *</Label>
              <Input
                className="text-xs font-mono uppercase"
                placeholder="27AAACS1234F1Z9"
                value={newTransporter.gstin}
                onChange={(e) => setNewTransporter({ ...newTransporter, gstin: e.target.value })}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Contact Phone</Label>
              <Input
                className="text-xs"
                placeholder="+91 98200 12345"
                value={newTransporter.phone}
                onChange={(e) => setNewTransporter({ ...newTransporter, phone: e.target.value })}
              />
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setAddTransporterModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                Save Transporter
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
