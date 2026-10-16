"use client"

import { useTaxRegime } from "@/hooks/use-tax-regime"
import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Package,
    Warehouse as WarehouseIcon,
    Layers,
    AlertTriangle,
    ShieldAlert,
    Clock,
    Search,
    Plus,
    RefreshCw,
    Download,
    Eye,
    SlidersHorizontal,
    CheckCircle2,
    XCircle,
    Copy,
    Check,
    Barcode as BarcodeIcon,
    QrCode as QrIcon,
    FileSpreadsheet,
    Printer,
    History,
    ArrowUpRight,
    ArrowDownLeft,
    Tag,
    Pencil,
    Ban,
    AlertCircle,
    Calendar,
    ChevronRight,
    ExternalLink,
    Hash,
    Truck,
    Info,
    SearchCheck,
    ShieldCheck
} from "lucide-react"
import Papa from "papaparse"
import { format, isBefore, addDays } from "date-fns"
import { toast } from "sonner"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { BarcodeDisplay } from "@/components/inventory/barcode-display"
import {
    BatchSerialOverviewData,
    BatchItem,
    SerialItem,
    TraceabilityAuditResult,
    createBatch,
    updateBatch,
    adjustBatchQty,
    recallBatch,
    createSerial,
    createSerialsBulk,
    updateSerialStatus,
    getTraceabilityAudit,
} from "@/app/actions/batch-serial"
import { BatchStatus, SerialStatus } from "@prisma/client"
import { RequireRole } from "@/components/auth/role-context"
import { unwrap } from "@/lib/action-result"

interface BatchSerialTabProps {
    data: BatchSerialOverviewData
    onRefresh?: () => void
}

export function BatchSerialTab({ data, onRefresh }: BatchSerialTabProps) {
    const { formatMoney, regime: moneyRegime } = useTaxRegime()
    const appLocale = moneyRegime?.locale
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Sub-view state: "batches" | "serials" | "watchdog" | "traceability"
    const [subTab, setSubTab] = useState<"batches" | "serials" | "watchdog" | "traceability">("batches")

    // Filters for Batches
    const [batchSearch, setBatchSearch] = useState("")
    const [batchStatusFilter, setBatchStatusFilter] = useState<string>("ALL")
    const [batchWarehouseFilter, setBatchWarehouseFilter] = useState<string>("ALL")

    // Filters for Serials
    const [serialSearch, setSerialSearch] = useState("")
    const [serialStatusFilter, setSerialStatusFilter] = useState<string>("ALL")
    const [serialProductFilter, setSerialProductFilter] = useState<string>("ALL")

    // Modals
    const [isCreateBatchOpen, setIsCreateBatchOpen] = useState(false)
    const [isCreateSerialsOpen, setIsCreateSerialsOpen] = useState(false)
    const [adjustBatchTarget, setAdjustBatchTarget] = useState<BatchItem | null>(null)
    const [recallBatchTarget, setRecallBatchTarget] = useState<BatchItem | null>(null)
    const [labelPreviewSerial, setLabelPreviewSerial] = useState<SerialItem | null>(null)

    // Form States: New Batch
    const [newBatch, setNewBatch] = useState({
        productId: "",
        warehouseId: "",
        batchNumber: "",
        initialQty: 100,
        manufacturingDate: "",
        expiryDate: "",
        costPrice: "",
        supplierBatchNo: "",
        notes: "",
    })

    // Form States: Serials Registration
    const [serialMode, setSerialMode] = useState<"RANGE" | "MANUAL">("RANGE")
    const [newSerials, setNewSerials] = useState({
        productId: "",
        warehouseId: "",
        batchId: "",
        prefix: "SN-",
        startNumber: 1,
        count: 10,
        padLength: 5,
        manualInput: "",
        warrantyMonths: 12,
        notes: "",
    })

    // Form States: Adjust Batch
    const [adjustQty, setAdjustQty] = useState<number>(0)
    const [adjustDirection, setAdjustDirection] = useState<"ADD" | "DEDUCT">("DEDUCT")
    const [adjustReason, setAdjustReason] = useState<string>("Cycle count discrepancy")

    // Form States: Recall Batch
    const [recallReason, setRecallReason] = useState("")

    // Traceability State
    const [traceQuery, setTraceQuery] = useState("")
    const [isSearchingTrace, setIsSearchingTrace] = useState(false)
    const [traceResult, setTraceResult] = useState<TraceabilityAuditResult | null>(null)

    // Copied feedback helper
    const [copiedId, setCopiedId] = useState<string | null>(null)
    const copyToClipboard = (text: string, id: string) => {
        navigator.clipboard.writeText(text)
        setCopiedId(id)
        toast.success(`Copied "${text}" to clipboard`)
        setTimeout(() => setCopiedId(null), 2000)
    }

    // -------------------------------------------------------------
    // Filtered Batches
    // -------------------------------------------------------------
    const filteredBatches = useMemo(() => {
        return data.batches.filter((b) => {
            const matchesSearch =
                !batchSearch.trim() ||
                b.batchNumber.toLowerCase().includes(batchSearch.toLowerCase()) ||
                b.productName.toLowerCase().includes(batchSearch.toLowerCase()) ||
                (b.productSku && b.productSku.toLowerCase().includes(batchSearch.toLowerCase())) ||
                (b.supplierBatchNo && b.supplierBatchNo.toLowerCase().includes(batchSearch.toLowerCase()))

            const matchesStatus =
                batchStatusFilter === "ALL" ||
                (batchStatusFilter === "EXPIRING" && b.daysToExpiry !== null && b.daysToExpiry <= 30 && b.daysToExpiry > 0) ||
                b.status === batchStatusFilter

            const matchesWarehouse =
                batchWarehouseFilter === "ALL" || b.warehouseId === batchWarehouseFilter

            return matchesSearch && matchesStatus && matchesWarehouse
        })
    }, [data.batches, batchSearch, batchStatusFilter, batchWarehouseFilter])

    // -------------------------------------------------------------
    // Filtered Serials
    // -------------------------------------------------------------
    const filteredSerials = useMemo(() => {
        return data.serials.filter((s) => {
            const matchesSearch =
                !serialSearch.trim() ||
                s.serialNumber.toLowerCase().includes(serialSearch.toLowerCase()) ||
                s.productName.toLowerCase().includes(serialSearch.toLowerCase()) ||
                (s.batchNumber && s.batchNumber.toLowerCase().includes(serialSearch.toLowerCase())) ||
                (s.productSku && s.productSku.toLowerCase().includes(serialSearch.toLowerCase()))

            const matchesStatus =
                serialStatusFilter === "ALL" || s.status === serialStatusFilter

            const matchesProduct =
                serialProductFilter === "ALL" || s.productId === serialProductFilter

            return matchesSearch && matchesStatus && matchesProduct
        })
    }, [data.serials, serialSearch, serialStatusFilter, serialProductFilter])

    // -------------------------------------------------------------
    // Expiry Watchdog Groups
    // -------------------------------------------------------------
    const expiredBatchesList = useMemo(() => {
        return data.batches.filter((b) => b.daysToExpiry !== null && b.daysToExpiry <= 0 && b.currentQty > 0)
    }, [data.batches])

    const criticalExpiringList = useMemo(() => {
        return data.batches.filter((b) => b.daysToExpiry !== null && b.daysToExpiry > 0 && b.daysToExpiry <= 15 && b.currentQty > 0)
    }, [data.batches])

    const warningExpiringList = useMemo(() => {
        return data.batches.filter((b) => b.daysToExpiry !== null && b.daysToExpiry > 15 && b.daysToExpiry <= 30 && b.currentQty > 0)
    }, [data.batches])

    const recalledBatchesList = useMemo(() => {
        return data.batches.filter((b) => b.status === "RECALLED")
    }, [data.batches])

    // -------------------------------------------------------------
    // Action Handlers
    // -------------------------------------------------------------
    const handleCreateBatch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newBatch.productId || !newBatch.warehouseId || !newBatch.batchNumber) {
            toast.error("Please fill in Product, Warehouse, and Batch Number.")
            return
        }

        startTransition(async () => {
            try {
                unwrap(await createBatch({
                    productId: newBatch.productId,
                    warehouseId: newBatch.warehouseId,
                    batchNumber: newBatch.batchNumber,
                    initialQty: Number(newBatch.initialQty) || 0,
                    manufacturingDate: newBatch.manufacturingDate || null,
                    expiryDate: newBatch.expiryDate || null,
                    costPrice: newBatch.costPrice ? Number(newBatch.costPrice) : null,
                    supplierBatchNo: newBatch.supplierBatchNo || null,
                    notes: newBatch.notes || null,
                }))
                toast.success(`Lot / Batch "${newBatch.batchNumber.toUpperCase()}" created successfully!`)
                setIsCreateBatchOpen(false)
                setNewBatch({
                    productId: "",
                    warehouseId: "",
                    batchNumber: "",
                    initialQty: 100,
                    manufacturingDate: "",
                    expiryDate: "",
                    costPrice: "",
                    supplierBatchNo: "",
                    notes: "",
                })
                router.refresh()
                onRefresh?.()
            } catch (err: any) {
                toast.error(err.message || "Failed to create batch")
            }
        })
    }

    const handleCreateSerials = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!newSerials.productId) {
            toast.error("Please select a product.")
            return
        }

        startTransition(async () => {
            try {
                if (serialMode === "RANGE") {
                    const res = unwrap(await createSerialsBulk({
                        productId: newSerials.productId,
                        warehouseId: newSerials.warehouseId || null,
                        batchId: newSerials.batchId || null,
                        prefix: newSerials.prefix,
                        startNumber: Number(newSerials.startNumber),
                        count: Number(newSerials.count),
                        padLength: Number(newSerials.padLength),
                        warrantyMonths: Number(newSerials.warrantyMonths) || null,
                        notes: newSerials.notes || null,
                    }))
                    toast.success(`Registered ${res.createdCount} serial numbers! (${res.skippedCount} skipped as duplicates)`)
                } else {
                    const rawList = newSerials.manualInput
                        .split(/[\n,]+/)
                        .map((s) => s.trim())
                        .filter((s) => s.length > 0)

                    if (rawList.length === 0) {
                        toast.error("Please enter at least one serial number.")
                        return
                    }

                    const res = unwrap(await createSerialsBulk({
                        productId: newSerials.productId,
                        warehouseId: newSerials.warehouseId || null,
                        batchId: newSerials.batchId || null,
                        serialNumbers: rawList,
                        warrantyMonths: Number(newSerials.warrantyMonths) || null,
                        notes: newSerials.notes || null,
                    }))
                    toast.success(`Registered ${res.createdCount} serial numbers! (${res.skippedCount} skipped as duplicates)`)
                }

                setIsCreateSerialsOpen(false)
                setNewSerials({
                    productId: "",
                    warehouseId: "",
                    batchId: "",
                    prefix: "SN-",
                    startNumber: 1,
                    count: 10,
                    padLength: 5,
                    manualInput: "",
                    warrantyMonths: 12,
                    notes: "",
                })
                router.refresh()
                onRefresh?.()
            } catch (err: any) {
                toast.error(err.message || "Failed to register serials")
            }
        })
    }

    const handleAdjustBatch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!adjustBatchTarget) return

        const delta = adjustDirection === "ADD" ? Math.abs(adjustQty) : -Math.abs(adjustQty)
        if (delta === 0) {
            toast.error("Adjustment quantity must be greater than zero.")
            return
        }

        startTransition(async () => {
            try {
                unwrap(await adjustBatchQty(adjustBatchTarget.id, delta, adjustReason))
                toast.success(`Updated batch quantity for "${adjustBatchTarget.batchNumber}".`)
                setAdjustBatchTarget(null)
                setAdjustQty(0)
                router.refresh()
                onRefresh?.()
            } catch (err: any) {
                toast.error(err.message || "Failed to adjust batch quantity")
            }
        })
    }

    const handleRecallBatch = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!recallBatchTarget) return
        if (!recallReason.trim()) {
            toast.error("Recall justification is required.")
            return
        }

        startTransition(async () => {
            try {
                unwrap(await recallBatch(recallBatchTarget.id, recallReason))
                toast.warning(`Emergency recall issued for Batch "${recallBatchTarget.batchNumber}".`)
                setRecallBatchTarget(null)
                setRecallReason("")
                router.refresh()
                onRefresh?.()
            } catch (err: any) {
                toast.error(err.message || "Failed to recall batch")
            }
        })
    }

    const handleSerialStatusChange = async (serialId: string, status: SerialStatus) => {
        startTransition(async () => {
            try {
                unwrap(await updateSerialStatus(serialId, status))
                toast.success(`Serial status updated to ${status}`)
                router.refresh()
                onRefresh?.()
            } catch (err: any) {
                toast.error(err.message || "Failed to update serial status")
            }
        })
    }

    const handleInvestigateTrace = async (e?: React.FormEvent) => {
        if (e) e.preventDefault()
        if (!traceQuery.trim()) {
            toast.error("Enter a Lot # or Serial # to trace.")
            return
        }

        setIsSearchingTrace(true)
        try {
            const res = await getTraceabilityAudit(traceQuery)
            setTraceResult(res)
            if (!res.found) {
                toast.error(`No record found matching identifier "${traceQuery}".`)
            } else {
                toast.success(`Loaded full provenance audit for ${traceQuery.toUpperCase()}!`)
            }
        } catch (err: any) {
            toast.error(err.message || "Error running traceability investigation")
        } finally {
            setIsSearchingTrace(false)
        }
    }

    // CSV Exports
    const exportBatchesCsv = () => {
        try {
            const rows = filteredBatches.map((b) => ({
                "Batch Number": b.batchNumber,
                "Product Name": b.productName,
                "SKU": b.productSku || "",
                "Warehouse": `${b.warehouseName} (${b.warehouseCode})`,
                "Initial Qty": b.initialQty,
                "Current Qty": b.currentQty,
                "Mfg Date": b.manufacturingDate ? format(new Date(b.manufacturingDate), "yyyy-MM-dd") : "",
                "Expiry Date": b.expiryDate ? format(new Date(b.expiryDate), "yyyy-MM-dd") : "",
                "Status": b.status,
                "Days Left": b.daysToExpiry !== null ? b.daysToExpiry : "",
                "Supplier Lot": b.supplierBatchNo || "",
                "Cost Price": b.costPrice || "",
                "Notes": b.notes || "",
            }))
            const csv = Papa.unparse(rows)
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `batch_lots_${new Date().toISOString().split("T")[0]}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success("Batches exported to CSV.")
        } catch (e) {
            toast.error("Failed to export batches CSV")
        }
    }

    const exportSerialsCsv = () => {
        try {
            const rows = filteredSerials.map((s) => ({
                "Serial Number": s.serialNumber,
                "Product Name": s.productName,
                "SKU": s.productSku || "",
                "Batch Number": s.batchNumber || "",
                "Warehouse": s.warehouseName ? `${s.warehouseName} (${s.warehouseCode})` : "Unassigned",
                "Status": s.status,
                "PO Reference": s.poNumber || "",
                "Warranty (Months)": s.warrantyMonths || "",
                "Warranty Expiry": s.warrantyExpiry ? format(new Date(s.warrantyExpiry), "yyyy-MM-dd") : "",
                "Notes": s.notes || "",
            }))
            const csv = Papa.unparse(rows)
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.setAttribute("download", `product_serials_${new Date().toISOString().split("T")[0]}.csv`)
            document.body.appendChild(link)
            link.click()
            document.body.removeChild(link)
            toast.success("Serials exported to CSV.")
        } catch (e) {
            toast.error("Failed to export serials CSV")
        }
    }

    return (
        <div className="space-y-6">
            {/* Top Telemetry KPI Ribbon */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-l-4 border-l-blue-500 shadow-sm bg-gradient-to-br from-card to-blue-50/20 dark:to-blue-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Lots</CardTitle>
                        <Layers className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {data.telemetry.activeBatches}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                            <span className="font-semibold text-foreground">{data.telemetry.totalBatches}</span> total batches across all facilities
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-amber-500 shadow-sm bg-gradient-to-br from-card to-amber-50/20 dark:to-amber-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Expiring Soon (&le;30d)</CardTitle>
                        <Clock className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                            {data.telemetry.expiringSoonBatches}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {data.telemetry.expiringSoonBatches > 0 ? "Requires priority sales or transfer" : "Zero immediate shelf-life risks"}
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-rose-500 shadow-sm bg-gradient-to-br from-card to-rose-50/20 dark:to-rose-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Expired / Recalled</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-rose-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                            <span>{data.telemetry.expiredBatches}</span>
                            {data.telemetry.recalledBatches > 0 && (
                                <Badge variant="destructive" className="text-[10px] font-normal px-1.5 py-0">
                                    {data.telemetry.recalledBatches} Recalled
                                </Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Must be quarantined or written off immediately
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-l-4 border-l-purple-500 shadow-sm bg-gradient-to-br from-card to-purple-50/20 dark:to-purple-950/20">
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Serialized Units</CardTitle>
                        <QrIcon className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {data.telemetry.totalSerials}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">{data.telemetry.availableSerials} available</span>
                            <span>&bull;</span>
                            <span className="text-indigo-600 dark:text-indigo-400 font-medium">{data.telemetry.soldSerials} sold</span>
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Sub Navigation Bar & Quick Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card p-3 rounded-xl border shadow-sm">
                <Tabs value={subTab} onValueChange={(val: any) => setSubTab(val)} className="w-full md:w-auto">
                    <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full md:w-[620px]">
                        <TabsTrigger value="batches" className="gap-2 text-xs sm:text-sm">
                            <Layers className="h-3.5 w-3.5" />
                            Lots &amp; Batches
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                                {data.batches.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="serials" className="gap-2 text-xs sm:text-sm">
                            <Hash className="h-3.5 w-3.5" />
                            Serial Register
                            <Badge variant="secondary" className="ml-1 text-[10px] px-1 py-0">
                                {data.serials.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="watchdog" className="gap-2 text-xs sm:text-sm">
                            <AlertTriangle className="h-3.5 w-3.5 text-amber-500" />
                            Watchdog
                            {(expiredBatchesList.length > 0 || criticalExpiringList.length > 0 || recalledBatchesList.length > 0) && (
                                <Badge variant="destructive" className="ml-1 text-[10px] px-1 py-0">
                                    {expiredBatchesList.length + criticalExpiringList.length + recalledBatchesList.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="traceability" className="gap-2 text-xs sm:text-sm">
                            <SearchCheck className="h-3.5 w-3.5 text-indigo-500" />
                            Traceability
                        </TabsTrigger>
                    </TabsList>
                </Tabs>

                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCreateBatchOpen(true)}
                        className="gap-1.5 border-dashed"
                    >
                        <Plus className="h-4 w-4 text-blue-500" />
                        New Lot
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIsCreateSerialsOpen(true)}
                        className="gap-1.5 border-dashed"
                    >
                        <BarcodeIcon className="h-4 w-4 text-purple-500" />
                        Register Serials
                    </Button>
                    <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                            router.refresh()
                            onRefresh?.()
                        }}
                        disabled={isPending}
                        className="h-8 w-8 p-0"
                        title="Refresh roster"
                    >
                        <RefreshCw className={`h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                    </Button>
                </div>
            </div>

            {/* ========================================================================= */}
            {/* SUB-VIEW 1: Batches & Lots Ledger */}
            {/* ========================================================================= */}
            {subTab === "batches" && (
                <div className="space-y-4">
                    {/* Filters & Search Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border">
                        <div className="flex flex-1 flex-col sm:flex-row items-center gap-2 w-full">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search Lot #, SKU, or Product..."
                                    value={batchSearch}
                                    onChange={(e) => setBatchSearch(e.target.value)}
                                    className="pl-8 h-9 text-xs sm:text-sm"
                                />
                            </div>

                            <Select value={batchStatusFilter} onValueChange={setBatchStatusFilter}>
                                <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Statuses</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="EXPIRING">Expiring &le; 30d</SelectItem>
                                    <SelectItem value="EXPIRED">Expired</SelectItem>
                                    <SelectItem value="RECALLED">Recalled</SelectItem>
                                    <SelectItem value="DEPLETED">Depleted (0 Stock)</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={batchWarehouseFilter} onValueChange={setBatchWarehouseFilter}>
                                <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                                    <SelectValue placeholder="All Facilities" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Facilities</SelectItem>
                                    {data.warehouses.map((w) => (
                                        <SelectItem key={w.id} value={w.id}>
                                            {w.name} ({w.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={exportBatchesCsv}
                                className="gap-1.5 h-9 text-xs"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export CSV
                            </Button>
                        </div>
                    </div>

                    {/* Batches Table */}
                    <Card className="shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="w-[180px]">Batch / Lot #</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Warehouse</TableHead>
                                        <TableHead className="text-right">Available Qty</TableHead>
                                        <TableHead>Dates &amp; Shelf Life</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-center">Serials</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredBatches.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                                <Layers className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                No batch lots found matching your filter criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredBatches.map((b) => {
                                            const isDepleted = b.currentQty === 0
                                            const isExpired = b.daysToExpiry !== null && b.daysToExpiry <= 0
                                            const isExpiringSoon = b.daysToExpiry !== null && b.daysToExpiry > 0 && b.daysToExpiry <= 30

                                            return (
                                                <TableRow key={b.id} className="hover:bg-muted/20">
                                                    <TableCell className="font-mono text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-foreground">{b.batchNumber}</span>
                                                            <button
                                                                onClick={() => copyToClipboard(b.batchNumber, b.id)}
                                                                className="text-muted-foreground hover:text-foreground p-0.5"
                                                                title="Copy Batch Number"
                                                            >
                                                                {copiedId === b.id ? (
                                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        {b.supplierBatchNo && (
                                                            <span className="text-[10px] text-muted-foreground block">
                                                                Vendor: {b.supplierBatchNo}
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="font-medium text-xs sm:text-sm text-foreground">
                                                            {b.productName}
                                                        </div>
                                                        {b.productSku && (
                                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                                SKU: {b.productSku}
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-xs">
                                                        <div className="flex items-center gap-1 text-muted-foreground">
                                                            <WarehouseIcon className="h-3 w-3" />
                                                            <span>{b.warehouseCode}</span>
                                                        </div>
                                                        <span className="text-[11px] text-muted-foreground/80 block">
                                                            {b.warehouseName}
                                                        </span>
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="font-semibold text-xs sm:text-sm">
                                                            {b.currentQty} / <span className="text-muted-foreground font-normal">{b.initialQty}</span>
                                                        </div>
                                                        {b.costPrice != null && (
                                                            <span className="text-[10px] text-muted-foreground block font-mono">
                                                                @{b.costPrice.toFixed(2)}/unit
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-xs">
                                                        {b.expiryDate ? (
                                                            <div>
                                                                <span className="text-foreground block">
                                                                    Exp: {format(new Date(b.expiryDate), "yyyy-MM-dd")}
                                                                </span>
                                                                {b.daysToExpiry !== null && (
                                                                    <span
                                                                        className={`text-[10px] font-medium ${
                                                                            isExpired
                                                                                ? "text-rose-600 dark:text-rose-400"
                                                                                : isExpiringSoon
                                                                                ? "text-amber-600 dark:text-amber-400"
                                                                                : "text-muted-foreground"
                                                                        }`}
                                                                    >
                                                                        {isExpired
                                                                            ? `Expired (${Math.abs(b.daysToExpiry)}d ago)`
                                                                            : `${b.daysToExpiry} days remaining`}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-[11px]">No expiration</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        {b.status === "ACTIVE" && (
                                                            <Badge
                                                                variant="outline"
                                                                className={`text-[10px] px-2 py-0.5 border ${
                                                                    isExpiringSoon
                                                                        ? "border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                                                                        : "border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                                                }`}
                                                            >
                                                                {isExpiringSoon ? "Expiring Soon" : "Active"}
                                                            </Badge>
                                                        )}
                                                        {b.status === "EXPIRED" && (
                                                            <Badge variant="destructive" className="text-[10px] px-2 py-0.5">
                                                                Expired
                                                            </Badge>
                                                        )}
                                                        {b.status === "RECALLED" && (
                                                            <Badge variant="destructive" className="text-[10px] px-2 py-0.5 bg-rose-700 animate-pulse">
                                                                Recalled
                                                            </Badge>
                                                        )}
                                                        {b.status === "DEPLETED" && (
                                                            <Badge variant="secondary" className="text-[10px] px-2 py-0.5 text-muted-foreground">
                                                                Depleted
                                                            </Badge>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-center font-mono text-xs">
                                                        {b.serialCount > 0 ? (
                                                            <Badge
                                                                variant="outline"
                                                                className="cursor-pointer hover:bg-muted"
                                                                onClick={() => {
                                                                    setSerialSearch(b.batchNumber)
                                                                    setSubTab("serials")
                                                                }}
                                                            >
                                                                {b.serialCount} units
                                                            </Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground/50 text-[11px]">&mdash;</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 px-2 text-xs"
                                                                onClick={() => {
                                                                    setAdjustBatchTarget(b)
                                                                    setAdjustQty(0)
                                                                    setAdjustDirection("DEDUCT")
                                                                }}
                                                                title="Adjust Quantity"
                                                            >
                                                                <SlidersHorizontal className="h-3.5 w-3.5" />
                                                            </Button>

                                                            {b.status !== "RECALLED" && (
                                                                <RequireRole min="MANAGER"><Button
                                                                    size="sm"
                                                                    variant="ghost"
                                                                    className="h-8 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950"
                                                                    onClick={() => {
                                                                        setRecallBatchTarget(b)
                                                                        setRecallReason("")
                                                                    }}
                                                                    title="Issue Recall"
                                                                >
                                                                    <Ban className="h-3.5 w-3.5" />
                                                                </Button></RequireRole>
                                                            )}

                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-8 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                                                onClick={() => {
                                                                    setTraceQuery(b.batchNumber)
                                                                    setSubTab("traceability")
                                                                    handleInvestigateTrace()
                                                                }}
                                                                title="Investigate Traceability"
                                                            >
                                                                <SearchCheck className="h-3.5 w-3.5" />
                                                            </Button>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-VIEW 2: Serial Numbers Register */}
            {/* ========================================================================= */}
            {subTab === "serials" && (
                <div className="space-y-4">
                    {/* Filters & Search Toolbar */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-muted/30 p-3 rounded-lg border">
                        <div className="flex flex-1 flex-col sm:flex-row items-center gap-2 w-full">
                            <div className="relative w-full sm:w-72">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search Serial #, SKU, or Batch..."
                                    value={serialSearch}
                                    onChange={(e) => setSerialSearch(e.target.value)}
                                    className="pl-8 h-9 text-xs sm:text-sm"
                                />
                            </div>

                            <Select value={serialStatusFilter} onValueChange={setSerialStatusFilter}>
                                <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Statuses</SelectItem>
                                    <SelectItem value="AVAILABLE">Available</SelectItem>
                                    <SelectItem value="ALLOCATED">Allocated</SelectItem>
                                    <SelectItem value="SOLD">Sold</SelectItem>
                                    <SelectItem value="DEFECTIVE">Defective</SelectItem>
                                    <SelectItem value="MAINTENANCE">Maintenance</SelectItem>
                                    <SelectItem value="RETURNED">Returned</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select value={serialProductFilter} onValueChange={setSerialProductFilter}>
                                <SelectTrigger className="w-full sm:w-48 h-9 text-xs">
                                    <SelectValue placeholder="All Products" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Products</SelectItem>
                                    {data.products.map((p) => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2 self-end sm:self-auto">
                            <Button
                                size="sm"
                                variant="outline"
                                onClick={exportSerialsCsv}
                                className="gap-1.5 h-9 text-xs"
                            >
                                <Download className="h-3.5 w-3.5" />
                                Export CSV
                            </Button>
                        </div>
                    </div>

                    {/* Serials Table */}
                    <Card className="shadow-sm">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/40">
                                        <TableHead className="w-[200px]">Serial Number</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Linked Batch</TableHead>
                                        <TableHead>Warehouse</TableHead>
                                        <TableHead>Lifecycle Status</TableHead>
                                        <TableHead>Warranty &amp; PO</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredSerials.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                                <Hash className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                                No serialized assets found matching criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredSerials.map((s) => {
                                            return (
                                                <TableRow key={s.id} className="hover:bg-muted/20">
                                                    <TableCell className="font-mono text-xs">
                                                        <div className="flex items-center gap-1.5">
                                                            <span className="font-semibold text-foreground">{s.serialNumber}</span>
                                                            <button
                                                                onClick={() => copyToClipboard(s.serialNumber, s.id)}
                                                                className="text-muted-foreground hover:text-foreground p-0.5"
                                                                title="Copy Serial Number"
                                                            >
                                                                {copiedId === s.id ? (
                                                                    <Check className="h-3 w-3 text-emerald-500" />
                                                                ) : (
                                                                    <Copy className="h-3 w-3" />
                                                                )}
                                                            </button>
                                                        </div>
                                                        <button
                                                            onClick={() => setLabelPreviewSerial(s)}
                                                            className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 mt-0.5"
                                                        >
                                                            <BarcodeIcon className="h-3 w-3" />
                                                            View Label
                                                        </button>
                                                    </TableCell>

                                                    <TableCell>
                                                        <div className="font-medium text-xs sm:text-sm text-foreground">
                                                            {s.productName}
                                                        </div>
                                                        {s.productSku && (
                                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                                SKU: {s.productSku}
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-xs">
                                                        {s.batchNumber ? (
                                                            <span className="font-mono text-foreground font-medium">
                                                                {s.batchNumber}
                                                            </span>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-[11px]">Unlinked</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-xs">
                                                        {s.warehouseName ? (
                                                            <div>
                                                                <span className="font-medium text-foreground">{s.warehouseCode}</span>
                                                                <span className="text-[11px] text-muted-foreground block">{s.warehouseName}</span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground italic text-[11px]">In Transit / External</span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell>
                                                        <Select
                                                            value={s.status}
                                                            onValueChange={(val: SerialStatus) => handleSerialStatusChange(s.id, val)}
                                                        >
                                                            <SelectTrigger className="h-7 text-xs w-32">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="AVAILABLE">
                                                                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">● Available</span>
                                                                </SelectItem>
                                                                <SelectItem value="ALLOCATED">
                                                                    <span className="text-blue-600 dark:text-blue-400 font-medium">● Allocated</span>
                                                                </SelectItem>
                                                                <SelectItem value="SOLD">
                                                                    <span className="text-purple-600 dark:text-purple-400 font-medium">● Sold</span>
                                                                </SelectItem>
                                                                <SelectItem value="DEFECTIVE">
                                                                    <span className="text-rose-600 dark:text-rose-400 font-medium">● Defective</span>
                                                                </SelectItem>
                                                                <SelectItem value="MAINTENANCE">
                                                                    <span className="text-amber-600 dark:text-amber-400 font-medium">● Maintenance</span>
                                                                </SelectItem>
                                                                <SelectItem value="RETURNED">
                                                                    <span className="text-slate-600 dark:text-slate-400 font-medium">● Returned</span>
                                                                </SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>

                                                    <TableCell className="text-xs">
                                                        {s.warrantyExpiry ? (
                                                            <div className="text-[11px]">
                                                                <span className="text-muted-foreground">Expires: </span>
                                                                <span className="font-medium text-foreground">
                                                                    {format(new Date(s.warrantyExpiry), "yyyy-MM-dd")}
                                                                </span>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground text-[11px]">Standard warranty</span>
                                                        )}
                                                        {s.poNumber && (
                                                            <span className="text-[10px] text-muted-foreground block font-mono">
                                                                PO: {s.poNumber}
                                                            </span>
                                                        )}
                                                    </TableCell>

                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-8 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950"
                                                            onClick={() => {
                                                                setTraceQuery(s.serialNumber)
                                                                setSubTab("traceability")
                                                                handleInvestigateTrace()
                                                            }}
                                                            title="Investigate Traceability"
                                                        >
                                                            <SearchCheck className="h-3.5 w-3.5 mr-1" />
                                                            Trace
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </Card>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-VIEW 3: Expiry Watchdog & Recalls */}
            {/* ========================================================================= */}
            {subTab === "watchdog" && (
                <div className="space-y-6">
                    {/* Critical Alert Banner if Recalls Exist */}
                    {recalledBatchesList.length > 0 && (
                        <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl p-4 flex items-start gap-3">
                            <ShieldAlert className="h-5 w-5 text-rose-600 dark:text-rose-400 mt-0.5 flex-shrink-0" />
                            <div className="flex-1">
                                <h4 className="font-semibold text-rose-900 dark:text-rose-200 text-sm">
                                    Active Quarantine &amp; Safety Recalls ({recalledBatchesList.length} Lots)
                                </h4>
                                <p className="text-xs text-rose-700 dark:text-rose-300 mt-1">
                                    The following lots have been flagged with safety or quality recall alerts. Ensure these units are quarantined immediately from dispatch aisles.
                                </p>
                                <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                    {recalledBatchesList.map((rb) => (
                                        <div key={rb.id} className="bg-card p-2.5 rounded-lg border border-rose-200 dark:border-rose-800 text-xs">
                                            <div className="font-bold text-rose-600 dark:text-rose-400 font-mono">
                                                {rb.batchNumber}
                                            </div>
                                            <div className="font-medium text-foreground truncate">{rb.productName}</div>
                                            <div className="text-muted-foreground mt-1 text-[11px]">
                                                {rb.currentQty} units remaining at {rb.warehouseName}
                                            </div>
                                            {rb.notes && (
                                                <div className="text-[10px] text-rose-700 dark:text-rose-300 mt-1 italic">
                                                    {rb.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Expiry Risk Tiers */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Tier 1: Expired (Needs Disposal) */}
                        <Card className="border-t-4 border-t-rose-500 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
                                        <XCircle className="h-4 w-4" />
                                        Expired Lots (&gt;0 Units)
                                    </CardTitle>
                                    <Badge variant="destructive" className="text-xs">
                                        {expiredBatchesList.length}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Products whose shelf life has lapsed but still show positive stock balances.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {expiredBatchesList.length === 0 ? (
                                    <div className="text-center py-6 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                                        No expired inventory on hand.
                                    </div>
                                ) : (
                                    expiredBatchesList.map((b) => (
                                        <div key={b.id} className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono font-bold text-foreground">{b.batchNumber}</span>
                                                <span className="text-[11px] text-rose-600 font-medium">
                                                    {b.daysToExpiry ? `${Math.abs(b.daysToExpiry)}d ago` : "Expired"}
                                                </span>
                                            </div>
                                            <div className="font-medium text-foreground truncate">{b.productName}</div>
                                            <div className="text-muted-foreground text-[11px] flex items-center justify-between">
                                                <span>{b.warehouseName}</span>
                                                <span className="font-semibold text-foreground">{b.currentQty} units</span>
                                            </div>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="w-full text-xs h-7 text-rose-600 border-rose-200 hover:bg-rose-50 dark:hover:bg-rose-950 mt-1"
                                                onClick={() => {
                                                    setAdjustBatchTarget(b)
                                                    setAdjustQty(b.currentQty)
                                                    setAdjustDirection("DEDUCT")
                                                    setAdjustReason("Expired inventory scrap/disposal")
                                                }}
                                            >
                                                Write Off / Scrap Lot
                                            </Button>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Tier 2: Critical (&le;15 Days) */}
                        <Card className="border-t-4 border-t-amber-500 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
                                        <AlertTriangle className="h-4 w-4" />
                                        Critical Shelf-Life (&le;15d)
                                    </CardTitle>
                                    <Badge variant="outline" className="text-xs border-amber-500 text-amber-700 dark:text-amber-300">
                                        {criticalExpiringList.length}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Lots expiring within 15 days. Fast-track for dispatch or promotional clearance.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {criticalExpiringList.length === 0 ? (
                                    <div className="text-center py-6 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                                        No lots in critical shelf-life window.
                                    </div>
                                ) : (
                                    criticalExpiringList.map((b) => (
                                        <div key={b.id} className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono font-bold text-foreground">{b.batchNumber}</span>
                                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-bold">
                                                    {b.daysToExpiry}d left
                                                </span>
                                            </div>
                                            <div className="font-medium text-foreground truncate">{b.productName}</div>
                                            <div className="text-muted-foreground text-[11px] flex items-center justify-between">
                                                <span>{b.warehouseName}</span>
                                                <span className="font-semibold text-foreground">{b.currentQty} units</span>
                                            </div>
                                            <div className="flex items-center gap-1 mt-1">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="w-full text-xs h-7"
                                                    onClick={() => {
                                                        setAdjustBatchTarget(b)
                                                        setAdjustQty(0)
                                                    }}
                                                >
                                                    Adjust Stock
                                                </Button>
                                                <RequireRole min="MANAGER"><Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="text-xs h-7 text-rose-600 hover:text-rose-700"
                                                    onClick={() => {
                                                        setRecallBatchTarget(b)
                                                        setRecallReason("Preemptive shelf-life quarantine")
                                                    }}
                                                >
                                                    Quarantine
                                                </Button></RequireRole>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Tier 3: Warning (16-30 Days) */}
                        <Card className="border-t-4 border-t-blue-500 shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                                        <Clock className="h-4 w-4" />
                                        Warning Window (16-30d)
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-xs">
                                        {warningExpiringList.length}
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Lots approaching expiry in 2-4 weeks. Monitor and prioritize in FIFO allocation.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {warningExpiringList.length === 0 ? (
                                    <div className="text-center py-6 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-6 w-6 text-emerald-500 mx-auto mb-1 opacity-70" />
                                        No lots in 16-30 day warning window.
                                    </div>
                                ) : (
                                    warningExpiringList.map((b) => (
                                        <div key={b.id} className="p-3 bg-muted/40 rounded-lg border text-xs space-y-1.5">
                                            <div className="flex items-center justify-between">
                                                <span className="font-mono font-bold text-foreground">{b.batchNumber}</span>
                                                <span className="text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                                    {b.daysToExpiry}d left
                                                </span>
                                            </div>
                                            <div className="font-medium text-foreground truncate">{b.productName}</div>
                                            <div className="text-muted-foreground text-[11px] flex items-center justify-between">
                                                <span>{b.warehouseName}</span>
                                                <span className="font-semibold text-foreground">{b.currentQty} units</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* ========================================================================= */}
            {/* SUB-VIEW 4: Universal Traceability Investigator */}
            {/* ========================================================================= */}
            {subTab === "traceability" && (
                <div className="space-y-6">
                    {/* Investigator Search Card */}
                    <Card className="shadow-sm border-indigo-200 dark:border-indigo-900 bg-gradient-to-br from-card via-card to-indigo-50/20 dark:to-indigo-950/20">
                        <CardHeader>
                            <CardTitle className="text-lg font-semibold flex items-center gap-2">
                                <SearchCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                Universal Traceability Investigator
                            </CardTitle>
                            <CardDescription>
                                Enter any Lot / Batch Identifier or Unit Serial Number to audit its end-to-end lifecycle provenance, warehouse custody, linked assets, and stock movement logs.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleInvestigateTrace} className="flex flex-col sm:flex-row items-center gap-2">
                                <div className="relative flex-1 w-full">
                                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Enter Lot # or Serial # (e.g. LOT-2026-001 or SN-00042)..."
                                        value={traceQuery}
                                        onChange={(e) => setTraceQuery(e.target.value)}
                                        className="pl-9 font-mono uppercase text-sm"
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    disabled={isSearchingTrace || !traceQuery.trim()}
                                    className="w-full sm:w-auto gap-2 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    {isSearchingTrace ? (
                                        <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <SearchCheck className="h-4 w-4" />
                                    )}
                                    Investigate Record
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Investigation Results Display */}
                    {traceResult && traceResult.found && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            {/* Header Summary */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3 border-b">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 uppercase text-[11px] font-mono"
                                                >
                                                    {traceResult.type === "SERIAL" ? "Serialized Unit" : "Production Lot"}
                                                </Badge>
                                                <h3 className="text-xl font-bold font-mono text-foreground">
                                                    {traceResult.type === "SERIAL"
                                                        ? traceResult.serial?.serialNumber
                                                        : traceResult.batch?.batchNumber}
                                                </h3>
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Product: <span className="font-semibold text-foreground">{traceResult.product?.name}</span> (SKU: {traceResult.product?.sku || "N/A"})
                                            </p>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {traceResult.type === "SERIAL" && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs font-semibold px-2.5 py-1 border-emerald-500 text-emerald-700 dark:text-emerald-300"
                                                >
                                                    Status: {traceResult.serial?.status}
                                                </Badge>
                                            )}
                                            {traceResult.type === "BATCH" && (
                                                <Badge
                                                    variant="outline"
                                                    className="text-xs font-semibold px-2.5 py-1 border-blue-500 text-blue-700 dark:text-blue-300"
                                                >
                                                    Status: {traceResult.batch?.status}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>

                                <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {traceResult.type === "SERIAL" && traceResult.serial && (
                                        <>
                                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                                <span className="text-muted-foreground block">Facility Custody</span>
                                                <span className="font-semibold text-foreground block text-sm">
                                                    {traceResult.serial.warehouseName || "In Transit"}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground font-mono">
                                                    Code: {traceResult.serial.warehouseCode || "N/A"}
                                                </span>
                                            </div>

                                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                                <span className="text-muted-foreground block">Parent Lot / Batch</span>
                                                <span className="font-semibold text-foreground block text-sm font-mono">
                                                    {traceResult.serial.batchNumber || "None Linked"}
                                                </span>
                                                {traceResult.serial.batchDetails?.expiryDate && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Lot Exp: {format(new Date(traceResult.serial.batchDetails.expiryDate), "yyyy-MM-dd")}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                                <span className="text-muted-foreground block">Procurement Reference</span>
                                                <span className="font-semibold text-foreground block text-sm font-mono">
                                                    {traceResult.serial.poNumber || "Direct Intake"}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    Registered: {format(new Date(traceResult.serial.createdAt), "yyyy-MM-dd")}
                                                </span>
                                            </div>

                                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                                <span className="text-muted-foreground block">Warranty Protection</span>
                                                <span className="font-semibold text-foreground block text-sm">
                                                    {traceResult.serial.warrantyMonths ? `${traceResult.serial.warrantyMonths} Months` : "Standard"}
                                                </span>
                                                {traceResult.serial.warrantyExpiry && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Until: {format(new Date(traceResult.serial.warrantyExpiry), "yyyy-MM-dd")}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}

                                    {traceResult.type === "BATCH" && traceResult.batch && (
                                        <>
                                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                                <span className="text-muted-foreground block">Facility Custody</span>
                                                <span className="font-semibold text-foreground block text-sm">
                                                    {traceResult.batch.warehouseName}
                                                </span>
                                                <span className="text-[11px] text-muted-foreground font-mono">
                                                    {traceResult.batch.warehouseCode}
                                                </span>
                                            </div>

                                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                                <span className="text-muted-foreground block">Lot Balance</span>
                                                <span className="font-semibold text-foreground block text-sm">
                                                    {traceResult.batch.currentQty} / {traceResult.batch.initialQty} units
                                                </span>
                                                <span className="text-[11px] text-muted-foreground">
                                                    {traceResult.batch.serialCount} serialized units
                                                </span>
                                            </div>

                                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                                <span className="text-muted-foreground block">Manufacturing &amp; Expiry</span>
                                                <span className="font-semibold text-foreground block text-sm">
                                                    {traceResult.batch.expiryDate ? format(new Date(traceResult.batch.expiryDate), "yyyy-MM-dd") : "No expiry"}
                                                </span>
                                                {traceResult.batch.manufacturingDate && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Mfg: {format(new Date(traceResult.batch.manufacturingDate), "yyyy-MM-dd")}
                                                    </span>
                                                )}
                                            </div>

                                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                                <span className="text-muted-foreground block">Supplier Reference</span>
                                                <span className="font-semibold text-foreground block text-sm font-mono">
                                                    {traceResult.batch.supplierBatchNo || "Internal Lot"}
                                                </span>
                                                {traceResult.batch.costPrice != null && (
                                                    <span className="text-[11px] text-muted-foreground">
                                                        Unit Cost: {formatMoney(Number(traceResult.batch.costPrice))}
                                                    </span>
                                                )}
                                            </div>
                                        </>
                                    )}
                                </CardContent>
                            </Card>

                            {/* Linked Serials If Batch Has Units */}
                            {traceResult.type === "BATCH" && traceResult.batch?.serialsList && traceResult.batch.serialsList.length > 0 && (
                                <Card className="shadow-sm">
                                    <CardHeader className="pb-3">
                                        <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                            <Hash className="h-4 w-4 text-purple-500" />
                                            Registered Serials in Lot ({traceResult.batch.serialsList.length})
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto p-2 bg-muted/20 rounded-lg border">
                                            {traceResult.batch.serialsList.map((sn) => (
                                                <Badge
                                                    key={sn.id}
                                                    variant="secondary"
                                                    className="font-mono text-xs cursor-pointer hover:bg-muted"
                                                    onClick={() => {
                                                        setTraceQuery(sn.serialNumber)
                                                        handleInvestigateTrace()
                                                    }}
                                                >
                                                    {sn.serialNumber} ({sn.status})
                                                </Badge>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* Movement Audit Trail Timeline */}
                            <Card className="shadow-sm">
                                <CardHeader className="pb-3">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <History className="h-4 w-4 text-blue-500" />
                                        Stock Movement &amp; Custody Audit Logs
                                    </CardTitle>
                                    <CardDescription className="text-xs">
                                        Transactional history matching product and lot identifiers.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    {!traceResult.movements || traceResult.movements.length === 0 ? (
                                        <p className="text-xs text-muted-foreground italic py-4 text-center">
                                            No automated ledger movements recorded yet.
                                        </p>
                                    ) : (
                                        <div className="space-y-3">
                                            {traceResult.movements.map((m, idx) => (
                                                <div
                                                    key={m.id || idx}
                                                    className="flex items-start gap-3 p-3 bg-muted/30 rounded-lg border text-xs"
                                                >
                                                    <div className="p-1.5 bg-background rounded border mt-0.5">
                                                        {m.type === "IN" ? (
                                                            <ArrowDownLeft className="h-4 w-4 text-emerald-500" />
                                                        ) : m.type === "OUT" ? (
                                                            <ArrowUpRight className="h-4 w-4 text-rose-500" />
                                                        ) : (
                                                            <SlidersHorizontal className="h-4 w-4 text-blue-500" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <span className="font-semibold text-foreground">
                                                                {m.type} Movement: {m.quantity} Units
                                                            </span>
                                                            <span className="text-[11px] text-muted-foreground">
                                                                {format(new Date(m.createdAt), "yyyy-MM-dd HH:mm")}
                                                            </span>
                                                        </div>
                                                        <p className="text-muted-foreground mt-0.5">
                                                            Facility: <span className="text-foreground font-medium">{m.warehouseName}</span>
                                                        </p>
                                                        {m.reason && (
                                                            <p className="text-foreground/80 mt-1 italic">
                                                                &ldquo;{m.reason}&rdquo;
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {/* ========================================================================= */}
            {/* DIALOG: Create New Lot / Batch */}
            {/* ========================================================================= */}
            <Dialog open={isCreateBatchOpen} onOpenChange={setIsCreateBatchOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-blue-500" />
                            Register Production Lot / Batch
                        </DialogTitle>
                        <DialogDescription>
                            Create a distinct inventory lot with shelf-life tracking and warehouse allocation.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateBatch} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Product *</Label>
                                <Select
                                    value={newBatch.productId}
                                    onValueChange={(val) => setNewBatch({ ...newBatch, productId: val })}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.products.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} {p.sku ? `(${p.sku})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Warehouse / Facility *</Label>
                                <Select
                                    value={newBatch.warehouseId}
                                    onValueChange={(val) => setNewBatch({ ...newBatch, warehouseId: val })}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Select Warehouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name} ({w.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Lot / Batch Number *</Label>
                                <Input
                                    placeholder="e.g. LOT-2026-001"
                                    value={newBatch.batchNumber}
                                    onChange={(e) => setNewBatch({ ...newBatch, batchNumber: e.target.value })}
                                    className="font-mono uppercase text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Initial Intake Quantity *</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="1"
                                    value={newBatch.initialQty}
                                    onChange={(e) => setNewBatch({ ...newBatch, initialQty: Number(e.target.value) })}
                                    className="text-xs"
                                    required
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Manufacturing Date</Label>
                                <Input
                                    type="date"
                                    value={newBatch.manufacturingDate}
                                    onChange={(e) => setNewBatch({ ...newBatch, manufacturingDate: e.target.value })}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Expiry Date</Label>
                                <Input
                                    type="date"
                                    value={newBatch.expiryDate}
                                    onChange={(e) => setNewBatch({ ...newBatch, expiryDate: e.target.value })}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Supplier Lot / Batch #</Label>
                                <Input
                                    placeholder="Vendor's internal lot code"
                                    value={newBatch.supplierBatchNo}
                                    onChange={(e) => setNewBatch({ ...newBatch, supplierBatchNo: e.target.value })}
                                    className="text-xs"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Unit Cost Price</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    placeholder="e.g. 250.00"
                                    value={newBatch.costPrice}
                                    onChange={(e) => setNewBatch({ ...newBatch, costPrice: e.target.value })}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-semibold">Notes &amp; Quality Certifications</Label>
                            <Textarea
                                placeholder="Certificate of Analysis (CoA) notes, storage temp requirements..."
                                value={newBatch.notes}
                                onChange={(e) => setNewBatch({ ...newBatch, notes: e.target.value })}
                                className="text-xs"
                                rows={2}
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateBatchOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-blue-600 hover:bg-blue-700 text-white">
                                {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                Save Lot
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* DIALOG: Register Serial Numbers (Range / Manual) */}
            {/* ========================================================================= */}
            <Dialog open={isCreateSerialsOpen} onOpenChange={setIsCreateSerialsOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BarcodeIcon className="h-5 w-5 text-purple-500" />
                            Register Unit Serial Numbers
                        </DialogTitle>
                        <DialogDescription>
                            Generate sequential serial numbers or input specific hardware barcodes.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateSerials} className="space-y-4 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Product *</Label>
                                <Select
                                    value={newSerials.productId}
                                    onValueChange={(val) => setNewSerials({ ...newSerials, productId: val, batchId: "" })}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Select Product" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.products.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Warehouse / Facility</Label>
                                <Select
                                    value={newSerials.warehouseId}
                                    onValueChange={(val) => setNewSerials({ ...newSerials, warehouseId: val })}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Select Facility" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name} ({w.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Optional Batch Linkage */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Link to Batch / Lot (Optional)</Label>
                                <Select
                                    value={newSerials.batchId}
                                    onValueChange={(val) => setNewSerials({ ...newSerials, batchId: val })}
                                    disabled={!newSerials.productId}
                                >
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Select Lot" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.batches
                                            .filter((b) => b.productId === newSerials.productId)
                                            .map((b) => (
                                                <SelectItem key={b.id} value={b.id}>
                                                    {b.batchNumber} ({b.warehouseCode})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Warranty Period (Months)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={newSerials.warrantyMonths}
                                    onChange={(e) => setNewSerials({ ...newSerials, warrantyMonths: Number(e.target.value) })}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        {/* Generation Mode Selector */}
                        <div className="space-y-2 pt-2 border-t">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-semibold">Registration Mode</Label>
                                <div className="flex items-center gap-1 bg-muted p-0.5 rounded-lg">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={serialMode === "RANGE" ? "default" : "ghost"}
                                        className="h-7 text-xs px-2.5"
                                        onClick={() => setSerialMode("RANGE")}
                                    >
                                        Sequential Range
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={serialMode === "MANUAL" ? "default" : "ghost"}
                                        className="h-7 text-xs px-2.5"
                                        onClick={() => setSerialMode("MANUAL")}
                                    >
                                        Manual / Scan List
                                    </Button>
                                </div>
                            </div>

                            {serialMode === "RANGE" ? (
                                <div className="p-3 bg-muted/40 rounded-lg space-y-3">
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">Prefix</Label>
                                            <Input
                                                value={newSerials.prefix}
                                                onChange={(e) => setNewSerials({ ...newSerials, prefix: e.target.value })}
                                                className="font-mono uppercase text-xs h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">Start #</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={newSerials.startNumber}
                                                onChange={(e) => setNewSerials({ ...newSerials, startNumber: Number(e.target.value) })}
                                                className="text-xs h-8"
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-[11px]">Count</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                max="500"
                                                value={newSerials.count}
                                                onChange={(e) => setNewSerials({ ...newSerials, count: Number(e.target.value) })}
                                                className="text-xs h-8"
                                            />
                                        </div>
                                    </div>
                                    <div className="text-[11px] text-muted-foreground">
                                        Preview Range:{" "}
                                        <span className="font-mono font-semibold text-foreground">
                                            {newSerials.prefix}
                                            {String(newSerials.startNumber).padStart(newSerials.padLength, "0")}
                                        </span>{" "}
                                        &rarr;{" "}
                                        <span className="font-mono font-semibold text-foreground">
                                            {newSerials.prefix}
                                            {String(newSerials.startNumber + newSerials.count - 1).padStart(newSerials.padLength, "0")}
                                        </span>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-1">
                                    <Textarea
                                        placeholder="Paste serial numbers separated by newlines or commas (e.g. SN-A01, SN-A02)..."
                                        value={newSerials.manualInput}
                                        onChange={(e) => setNewSerials({ ...newSerials, manualInput: e.target.value })}
                                        className="font-mono text-xs"
                                        rows={4}
                                    />
                                </div>
                            )}
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateSerialsOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending} className="bg-purple-600 hover:bg-purple-700 text-white">
                                {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                Register Serials
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* DIALOG: Adjust Batch Stock */}
            {/* ========================================================================= */}
            <Dialog open={!!adjustBatchTarget} onOpenChange={(open) => !open && setAdjustBatchTarget(null)}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="h-5 w-5 text-blue-500" />
                            Adjust Lot Stock
                        </DialogTitle>
                        <DialogDescription>
                            Update quantity for lot <span className="font-mono font-bold">{adjustBatchTarget?.batchNumber}</span>
                        </DialogDescription>
                    </DialogHeader>

                    {adjustBatchTarget && (
                        <form onSubmit={handleAdjustBatch} className="space-y-4 py-2">
                            <div className="p-3 bg-muted/40 rounded-lg text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Product:</span>
                                    <span className="font-semibold text-foreground">{adjustBatchTarget.productName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Warehouse:</span>
                                    <span className="font-semibold text-foreground">{adjustBatchTarget.warehouseName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Lot Qty:</span>
                                    <span className="font-bold text-foreground">{adjustBatchTarget.currentQty} units</span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Adjustment Action</Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={adjustDirection === "DEDUCT" ? "default" : "outline"}
                                        className="text-xs h-8"
                                        onClick={() => setAdjustDirection("DEDUCT")}
                                    >
                                        Reduce / Write Off (-)
                                    </Button>
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant={adjustDirection === "ADD" ? "default" : "outline"}
                                        className="text-xs h-8"
                                        onClick={() => setAdjustDirection("ADD")}
                                    >
                                        Add Stock (+)
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Units to {adjustDirection === "ADD" ? "Add" : "Reduce"}</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={adjustQty}
                                    onChange={(e) => setAdjustQty(Number(e.target.value))}
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Reason for Audit Log *</Label>
                                <Input
                                    placeholder="e.g. Cycle count discrepancy, damaged write-off..."
                                    value={adjustReason}
                                    onChange={(e) => setAdjustReason(e.target.value)}
                                    className="text-xs"
                                    required
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setAdjustBatchTarget(null)}
                                    disabled={isPending}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isPending}>
                                    {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Confirm Adjustment
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* DIALOG: Recall Lot / Batch */}
            {/* ========================================================================= */}
            <Dialog open={!!recallBatchTarget} onOpenChange={(open) => !open && setRecallBatchTarget(null)}>
                <DialogContent className="sm:max-w-[450px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                            <Ban className="h-5 w-5" />
                            Issue Emergency Lot Recall
                        </DialogTitle>
                        <DialogDescription>
                            This will quarantine Lot <span className="font-mono font-bold">{recallBatchTarget?.batchNumber}</span> across all warehouse pick lists.
                        </DialogDescription>
                    </DialogHeader>

                    {recallBatchTarget && (
                        <form onSubmit={handleRecallBatch} className="space-y-4 py-2">
                            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-lg text-xs space-y-1">
                                <div className="font-semibold text-rose-900 dark:text-rose-200">
                                    Quarantine Notice
                                </div>
                                <p className="text-rose-700 dark:text-rose-300">
                                    {recallBatchTarget.currentQty} units of {recallBatchTarget.productName} in {recallBatchTarget.warehouseName} will be flagged as RECALLED.
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-semibold">Recall Justification &amp; Authority *</Label>
                                <Textarea
                                    placeholder="Enter FDA/safety alert #, manufacturer recall reference, defect description..."
                                    value={recallReason}
                                    onChange={(e) => setRecallReason(e.target.value)}
                                    className="text-xs"
                                    rows={3}
                                    required
                                />
                            </div>

                            <DialogFooter className="pt-2">
                                <RequireRole min="MANAGER"><Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setRecallBatchTarget(null)}
                                    disabled={isPending}
                                >
                                    Cancel
                                </Button></RequireRole>
                                <Button type="submit" disabled={isPending} variant="destructive">
                                    {isPending ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                                    Confirm Recall
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* ========================================================================= */}
            {/* DIALOG: Print / Preview Serial Label */}
            {/* ========================================================================= */}
            <Dialog open={!!labelPreviewSerial} onOpenChange={(open) => !open && setLabelPreviewSerial(null)}>
                <DialogContent className="sm:max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <BarcodeIcon className="h-5 w-5 text-indigo-500" />
                            Asset Barcode Label
                        </DialogTitle>
                        <DialogDescription>
                            Printable Code-128 barcode for serialized hardware unit.
                        </DialogDescription>
                    </DialogHeader>

                    {labelPreviewSerial && (
                        <div className="space-y-4 py-2">
                            <div className="p-4 bg-white dark:bg-zinc-900 rounded-xl border flex flex-col items-center justify-center text-center space-y-2">
                                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                                    {labelPreviewSerial.productName}
                                </span>
                                <BarcodeDisplay
                                    value={labelPreviewSerial.serialNumber}
                                    type="CODE128"
                                    width={240}
                                    height={70}
                                    showText={true}
                                />
                                {labelPreviewSerial.batchNumber && (
                                    <span className="text-[10px] text-muted-foreground font-mono">
                                        LOT: {labelPreviewSerial.batchNumber}
                                    </span>
                                )}
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setLabelPreviewSerial(null)}
                                >
                                    Close
                                </Button>
                                <Button
                                    type="button"
                                    onClick={() => {
                                        window.print()
                                    }}
                                    className="gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
                                >
                                    <Printer className="h-4 w-4" />
                                    Print Label
                                </Button>
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
