"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { 
    Warehouse as WarehouseIcon, 
    Package, 
    Layers, 
    AlertTriangle, 
    TrendingUp, 
    ArrowUpDown, 
    Plus, 
    RefreshCw, 
    Search, 
    Building2, 
    MapPin, 
    Phone, 
    User, 
    Boxes, 
    CheckCircle2, 
    XCircle, 
    History, 
    AlertCircle, 
    Filter, 
    ArrowUpRight, 
    ArrowDownLeft, 
    Loader2,
    MoveRight,
    SlidersHorizontal,
    Tag,
    Pencil,
    Printer,
    ScanLine,
    Barcode as BarcodeIcon,
    QrCode as QrIcon,
} from "lucide-react"
import { BarcodeDisplay } from "@/components/inventory/barcode-display"
import { BarcodeLabelPrinter } from "@/components/inventory/barcode-label-printer"
import { BarcodeScannerModal } from "@/components/inventory/barcode-scanner-modal"
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
import { format } from "date-fns"
import { toast } from "sonner"
import { 
    InventoryOverviewData, 
    InventoryProduct, 
    WarehouseItem, 
    StockMovementRecord,
    createWarehouse, 
    updateWarehouse, 
    adjustStock, 
    transferStock 
} from "@/app/actions/inventory"
import { formatCurrency } from "@/lib/utils"
import { StockMovementType } from "@prisma/client"

interface InventoryClientProps {
    initialData: InventoryOverviewData
}

export function InventoryClient({ initialData }: InventoryClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<"stocks" | "warehouses" | "movements" | "alerts" | "barcodes">("stocks")
    const [isScannerOpen, setIsScannerOpen] = useState(false)
    const [isLabelPrinterOpen, setIsLabelPrinterOpen] = useState(false)
    const [selectedProductsForLabel, setSelectedProductsForLabel] = useState<InventoryProduct[]>([])
    const [barcodeTabFormat, setBarcodeTabFormat] = useState<"CODE128" | "QR">("CODE128")

    // Filter states
    const [searchQuery, setSearchQuery] = useState("")
    const [warehouseFilter, setWarehouseFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")

    // Modals
    const [isAdjustOpen, setIsAdjustOpen] = useState(false)
    const [isTransferOpen, setIsTransferOpen] = useState(false)
    const [isWarehouseOpen, setIsWarehouseOpen] = useState(false)
    const [selectedProductForAdjust, setSelectedProductForAdjust] = useState<InventoryProduct | null>(null)
    const [selectedWarehouseForEdit, setSelectedWarehouseForEdit] = useState<WarehouseItem | null>(null)

    // Form states: Adjust Stock
    const [adjustProductId, setAdjustProductId] = useState<string>("")
    const [adjustWarehouseId, setAdjustWarehouseId] = useState<string>("")
    const [adjustType, setAdjustType] = useState<StockMovementType>("IN")
    const [adjustQty, setAdjustQty] = useState<string>("")
    const [adjustReason, setAdjustReason] = useState<string>("")
    const [adjustReference, setAdjustReference] = useState<string>("")
    const [isSubmittingAdjust, setIsSubmittingAdjust] = useState(false)

    // Form states: Transfer Stock
    const [transferProductId, setTransferProductId] = useState<string>("")
    const [transferFromWarehouseId, setTransferFromWarehouseId] = useState<string>("")
    const [transferToWarehouseId, setTransferToWarehouseId] = useState<string>("")
    const [transferQty, setTransferQty] = useState<string>("")
    const [transferReason, setTransferReason] = useState<string>("")
    const [transferReference, setTransferReference] = useState<string>("")
    const [isSubmittingTransfer, setIsSubmittingTransfer] = useState(false)

    // Form states: Warehouse Create/Edit
    const [whName, setWhName] = useState("")
    const [whCode, setWhCode] = useState("")
    const [whAddress, setWhAddress] = useState("")
    const [whCity, setWhCity] = useState("")
    const [whState, setWhState] = useState("")
    const [whContactName, setWhContactName] = useState("")
    const [whContactPhone, setWhContactPhone] = useState("")
    const [whIsDefault, setWhIsDefault] = useState(false)
    const [isSubmittingWh, setIsSubmittingWh] = useState(false)

    // Derived filtered products
    const filteredProducts = initialData.products.filter(p => {
        const matchesSearch = 
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (p.sku?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (p.barcode?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (p.category?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
            (p.brand?.toLowerCase() || "").includes(searchQuery.toLowerCase())

        const matchesStatus = 
            statusFilter === "all" || p.status === statusFilter

        const matchesWarehouse = 
            warehouseFilter === "all" || 
            p.warehouseBreakdown.some(wb => wb.warehouseId === warehouseFilter && wb.quantity > 0)

        return matchesSearch && matchesStatus && matchesWarehouse
    })

    // Low stock items
    const lowStockProducts = initialData.products.filter(p => p.status === "LOW_STOCK" || p.status === "OUT_OF_STOCK")

    // Open Adjust modal for a specific product
    const openAdjustForProduct = (product: InventoryProduct, defaultWarehouseId?: string) => {
        setSelectedProductForAdjust(product)
        setAdjustProductId(product.id)
        setAdjustWarehouseId(defaultWarehouseId || initialData.warehouses[0]?.id || "")
        setAdjustType("IN")
        setAdjustQty("")
        setAdjustReason("")
        setAdjustReference("")
        setIsAdjustOpen(true)
    }

    // Open Transfer modal for a specific product
    const openTransferForProduct = (product: InventoryProduct) => {
        setTransferProductId(product.id)
        const primaryWh = product.warehouseBreakdown.find(wb => wb.quantity > 0)?.warehouseId || initialData.warehouses[0]?.id || ""
        setTransferFromWarehouseId(primaryWh)
        const otherWh = initialData.warehouses.find(w => w.id !== primaryWh)?.id || ""
        setTransferToWarehouseId(otherWh)
        setTransferQty("")
        setTransferReason("")
        setTransferReference("")
        setIsTransferOpen(true)
    }

    // Open Warehouse Edit modal
    const openEditWarehouse = (warehouse: WarehouseItem) => {
        setSelectedWarehouseForEdit(warehouse)
        setWhName(warehouse.name)
        setWhCode(warehouse.code)
        setWhAddress(warehouse.address || "")
        setWhCity(warehouse.city || "")
        setWhState(warehouse.state || "")
        setWhContactName(warehouse.contactName || "")
        setWhContactPhone(warehouse.contactPhone || "")
        setWhIsDefault(warehouse.isDefault)
        setIsWarehouseOpen(true)
    }

    // Open Warehouse Create modal
    const openCreateWarehouse = () => {
        setSelectedWarehouseForEdit(null)
        setWhName("")
        setWhCode(`WH-${initialData.warehouses.length + 1}`)
        setWhAddress("")
        setWhCity("")
        setWhState("")
        setWhContactName("")
        setWhContactPhone("")
        setWhIsDefault(initialData.warehouses.length === 0)
        setIsWarehouseOpen(true)
    }

    // Handle Stock Adjustment Submit
    const handleAdjustSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const qtyNum = parseFloat(adjustQty)
        if (isNaN(qtyNum) || qtyNum <= 0) {
            toast.error("Please enter a valid quantity greater than 0")
            return
        }
        if (!adjustProductId || !adjustWarehouseId) {
            toast.error("Please select a product and warehouse")
            return
        }

        setIsSubmittingAdjust(true)
        try {
            const res = await adjustStock({
                productId: adjustProductId,
                warehouseId: adjustWarehouseId,
                type: adjustType,
                quantity: qtyNum,
                reason: adjustReason,
                referenceNo: adjustReference
            })

            if (res.success) {
                toast.success(`Stock successfully updated! New balance: ${res.newWarehouseQty} units`)
                setIsAdjustOpen(false)
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to adjust stock")
        } finally {
            setIsSubmittingAdjust(false)
        }
    }

    // Handle Stock Transfer Submit
    const handleTransferSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        const qtyNum = parseFloat(transferQty)
        if (isNaN(qtyNum) || qtyNum <= 0) {
            toast.error("Please enter a valid transfer quantity")
            return
        }
        if (!transferProductId || !transferFromWarehouseId || !transferToWarehouseId) {
            toast.error("Please select product, origin warehouse, and target warehouse")
            return
        }
        if (transferFromWarehouseId === transferToWarehouseId) {
            toast.error("Source and destination warehouses cannot be the same")
            return
        }

        setIsSubmittingTransfer(true)
        try {
            const res = await transferStock({
                productId: transferProductId,
                fromWarehouseId: transferFromWarehouseId,
                toWarehouseId: transferToWarehouseId,
                quantity: qtyNum,
                reason: transferReason,
                referenceNo: transferReference
            })

            if (res.success) {
                toast.success(`Transferred ${qtyNum} units between warehouses!`)
                setIsTransferOpen(false)
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to transfer stock")
        } finally {
            setIsSubmittingTransfer(false)
        }
    }

    // Handle Warehouse Submit (Create or Edit)
    const handleWarehouseSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!whName.trim() || !whCode.trim()) {
            toast.error("Warehouse name and code are required")
            return
        }

        setIsSubmittingWh(true)
        try {
            if (selectedWarehouseForEdit) {
                await updateWarehouse(selectedWarehouseForEdit.id, {
                    name: whName,
                    code: whCode,
                    address: whAddress,
                    city: whCity,
                    state: whState,
                    contactName: whContactName,
                    contactPhone: whContactPhone,
                    isDefault: whIsDefault
                })
                toast.success("Warehouse updated successfully")
            } else {
                await createWarehouse({
                    name: whName,
                    code: whCode,
                    address: whAddress,
                    city: whCity,
                    state: whState,
                    contactName: whContactName,
                    contactPhone: whContactPhone,
                    isDefault: whIsDefault
                })
                toast.success("Warehouse provisioned successfully")
            }
            setIsWarehouseOpen(false)
            startTransition(() => {
                router.refresh()
            })
        } catch (err: any) {
            toast.error(err.message || "Failed to save warehouse")
        } finally {
            setIsSubmittingWh(false)
        }
    }

    // Helper for selected product in adjust modal
    const activeAdjustProduct = initialData.products.find(p => p.id === adjustProductId)
    const activeAdjustWarehouse = initialData.warehouses.find(w => w.id === adjustWarehouseId)
    const currentWarehouseStock = activeAdjustProduct?.warehouseBreakdown.find(wb => wb.warehouseId === adjustWarehouseId)?.quantity || 0

    // Preview calculations for adjust dialog
    const previewNewQty = () => {
        const qtyNum = parseFloat(adjustQty) || 0
        if (adjustType === "IN" || adjustType === "RETURN") {
            return currentWarehouseStock + qtyNum
        } else if (adjustType === "OUT" || adjustType === "DAMAGE") {
            return Math.max(0, currentWarehouseStock - qtyNum)
        } else if (adjustType === "ADJUSTMENT") {
            return qtyNum
        }
        return currentWarehouseStock
    }

    return (
        <div className="space-y-6">
            {/* Top Header & Operational Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Inventory & Warehouses</h1>
                    <p className="text-muted-foreground mt-1 text-sm">
                        Track multi-depot stock quantities, conduct audit adjustments, manage transfers, and monitor SKU reorder points.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 text-indigo-600 dark:text-indigo-400 border-indigo-200 dark:border-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 font-semibold"
                        onClick={() => setIsScannerOpen(true)}
                    >
                        <ScanLine className="h-4 w-4" />
                        Scan Barcode
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2 font-semibold"
                        onClick={() => {
                            setSelectedProductsForLabel(initialData.products)
                            setIsLabelPrinterOpen(true)
                        }}
                    >
                        <Printer className="h-4 w-4" />
                        Print Labels
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        onClick={() => {
                            if (initialData.products.length === 0) {
                                toast.error("No products available to adjust. Please add products first.")
                                return
                            }
                            openAdjustForProduct(initialData.products[0])
                        }}
                    >
                        <ArrowUpDown className="h-4 w-4" />
                        Adjust Stock
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="gap-2"
                        disabled={initialData.warehouses.length < 2 || initialData.products.length === 0}
                        onClick={() => {
                            if (initialData.products.length === 0) return
                            openTransferForProduct(initialData.products[0])
                        }}
                    >
                        <MoveRight className="h-4 w-4" />
                        Transfer Stock
                    </Button>
                    <Button 
                        size="sm" 
                        className="gap-2"
                        onClick={openCreateWarehouse}
                    >
                        <Plus className="h-4 w-4" />
                        New Warehouse
                    </Button>
                </div>
            </div>

            {/* Low Stock Warning Callout */}
            {initialData.telemetry.lowStockItemsCount > 0 && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-amber-900 dark:text-amber-200">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-amber-500/20 rounded-lg">
                            <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div>
                            <p className="text-sm font-semibold">
                                {initialData.telemetry.lowStockItemsCount} {initialData.telemetry.lowStockItemsCount === 1 ? "item requires" : "items require"} reordering
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Stock levels have fallen below configured minimum reorder thresholds.
                            </p>
                        </div>
                    </div>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-amber-500/40 hover:bg-amber-500/20 text-xs shrink-0"
                        onClick={() => setActiveTab("alerts")}
                    >
                        Review Reorder Alerts
                    </Button>
                </div>
            )}

            {/* Telemetry 4-Column KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Valuation</CardTitle>
                        <Package className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">
                            {formatCurrency(initialData.telemetry.totalValuation)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            Across {initialData.telemetry.totalProductsCount} catalog products
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock Units</CardTitle>
                        <Boxes className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">
                            {initialData.telemetry.totalUnits.toLocaleString()}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Layers className="h-3 w-3 text-blue-500" />
                            Physical units in storage
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Active Warehouses</CardTitle>
                        <WarehouseIcon className="h-4 w-4 text-indigo-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight">
                            {initialData.telemetry.activeWarehousesCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Building2 className="h-3 w-3 text-indigo-500" />
                            Primary: {initialData.warehouses.find(w => w.isDefault)?.name || "Main Hub"}
                        </p>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                        <CardTitle className="text-sm font-medium text-muted-foreground">Low / Out of Stock</CardTitle>
                        <AlertCircle className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold tracking-tight flex items-baseline gap-2">
                            <span>{initialData.telemetry.lowStockItemsCount}</span>
                            {initialData.telemetry.outOfStockCount > 0 && (
                                <span className="text-xs font-normal text-rose-500">
                                    ({initialData.telemetry.outOfStockCount} zero stock)
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3 text-amber-500" />
                            Requiring purchase restocking
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs & Main Views */}
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
                <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-5 max-w-3xl">
                    <TabsTrigger value="stocks" className="gap-2">
                        <Package className="h-4 w-4" />
                        Stock Levels
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                            {initialData.products.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="barcodes" className="gap-2">
                        <BarcodeIcon className="h-4 w-4 text-indigo-500" />
                        Barcodes & Labels
                    </TabsTrigger>
                    <TabsTrigger value="warehouses" className="gap-2">
                        <WarehouseIcon className="h-4 w-4" />
                        Warehouses
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                            {initialData.warehouses.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="movements" className="gap-2">
                        <History className="h-4 w-4" />
                        Movement Ledger
                        <Badge variant="secondary" className="ml-1 text-[10px] px-1.5 py-0">
                            {initialData.recentMovements.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="alerts" className="gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Reorder Alerts
                        {lowStockProducts.length > 0 && (
                            <Badge variant="destructive" className="ml-1 text-[10px] px-1.5 py-0">
                                {lowStockProducts.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: Stock Levels Table */}
                <TabsContent value="stocks" className="space-y-4">
                    {/* Filters & Search */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-4 rounded-xl border">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by item, SKU, category, brand..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9"
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground shrink-0">Warehouse:</Label>
                                <Select value={warehouseFilter} onValueChange={setWarehouseFilter}>
                                    <SelectTrigger className="w-[180px] h-9 text-xs">
                                        <SelectValue placeholder="All Warehouses" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Locations</SelectItem>
                                        {initialData.warehouses.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="flex items-center gap-2">
                                <Label className="text-xs text-muted-foreground shrink-0">Status:</Label>
                                <Select value={statusFilter} onValueChange={setStatusFilter}>
                                    <SelectTrigger className="w-[140px] h-9 text-xs">
                                        <SelectValue placeholder="All Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Statuses</SelectItem>
                                        <SelectItem value="IN_STOCK">In Stock</SelectItem>
                                        <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                                        <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {(searchQuery || warehouseFilter !== "all" || statusFilter !== "all") && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="text-xs"
                                    onClick={() => {
                                        setSearchQuery("")
                                        setWarehouseFilter("all")
                                        setStatusFilter("all")
                                    }}
                                >
                                    Reset Filters
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Stock Products Table */}
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product / Item</TableHead>
                                    <TableHead>SKU & Category</TableHead>
                                    <TableHead>Barcode</TableHead>
                                    <TableHead>Depot Allocation</TableHead>
                                    <TableHead className="text-right">Total Units</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Valuation</TableHead>
                                    <TableHead className="text-center">Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                            <Boxes className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                            <p className="font-medium">No items matched your inventory filters.</p>
                                            <p className="text-xs mt-1">Try clearing your search query or add items in the Sales Products catalog.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map(product => (
                                        <TableRow key={product.id}>
                                            <TableCell>
                                                <div className="font-semibold text-sm">{product.name}</div>
                                                {product.brand && (
                                                    <div className="text-xs text-muted-foreground">Brand: {product.brand}</div>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-mono text-xs">{product.sku || "—"}</div>
                                                <div className="text-xs text-muted-foreground">{product.category || "General"}</div>
                                            </TableCell>
                                            <TableCell>
                                                {product.barcode || product.sku ? (
                                                    <div className="flex items-center gap-1">
                                                        <BarcodeDisplay 
                                                            value={product.barcode || product.sku || ""} 
                                                            format="CODE128" 
                                                            width={90} 
                                                            height={24}
                                                            showValue={true}
                                                            allowCopy={true}
                                                            allowZoom={true}
                                                            className="p-0.5"
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">No barcode</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <div className="space-y-1">
                                                    {product.warehouseBreakdown.length > 0 ? (
                                                        product.warehouseBreakdown.map(wb => (
                                                            <div key={wb.warehouseId} className="flex items-center justify-between text-xs gap-3">
                                                                <span className="text-muted-foreground truncate max-w-[120px]">{wb.warehouseName}:</span>
                                                                <span className="font-mono font-medium">{wb.quantity} {product.unit}</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">Unallocated</span>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="font-bold text-sm">{product.stockQty.toLocaleString()}</div>
                                                <div className="text-[10px] text-muted-foreground">Reorder at: {product.reorderPoint}</div>
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {formatCurrency(product.unitPrice)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold">
                                                {formatCurrency(product.totalValue)}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {product.status === "IN_STOCK" && (
                                                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[11px]">
                                                        In Stock
                                                    </Badge>
                                                )}
                                                {product.status === "LOW_STOCK" && (
                                                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[11px]">
                                                        Low Stock
                                                    </Badge>
                                                )}
                                                {product.status === "OUT_OF_STOCK" && (
                                                    <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[11px]">
                                                        Out of Stock
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                                                        title="Print Barcode Label"
                                                        onClick={() => {
                                                            setSelectedProductsForLabel([product])
                                                            setIsLabelPrinterOpen(true)
                                                        }}
                                                    >
                                                        <Printer className="h-3.5 w-3.5" />
                                                        <span className="sr-only sm:not-sr-only">Label</span>
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="sm" 
                                                        className="h-8 text-xs gap-1"
                                                        onClick={() => openAdjustForProduct(product)}
                                                    >
                                                        <ArrowUpDown className="h-3.5 w-3.5" />
                                                        Adjust
                                                    </Button>
                                                    {initialData.warehouses.length > 1 && (
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-xs gap-1"
                                                            onClick={() => openTransferForProduct(product)}
                                                        >
                                                            <MoveRight className="h-3.5 w-3.5" />
                                                            Transfer
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* TAB 2: Warehouses Grid */}
                <TabsContent value="warehouses" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {initialData.warehouses.map(warehouse => (
                            <Card key={warehouse.id} className="relative overflow-hidden">
                                <CardHeader className="pb-3">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-base font-bold">{warehouse.name}</CardTitle>
                                                {warehouse.isDefault && (
                                                    <Badge variant="secondary" className="text-[10px] bg-indigo-500/10 text-indigo-600 border-indigo-500/20">
                                                        Primary Hub
                                                    </Badge>
                                                )}
                                            </div>
                                            <CardDescription className="font-mono text-xs font-semibold text-primary">
                                                {warehouse.code}
                                            </CardDescription>
                                        </div>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-7 w-7"
                                            onClick={() => openEditWarehouse(warehouse)}
                                        >
                                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-3 text-xs">
                                    <div className="space-y-1.5 text-muted-foreground">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                            <span>
                                                {[warehouse.address, warehouse.city, warehouse.state, warehouse.country]
                                                    .filter(Boolean)
                                                    .join(", ") || "No address recorded"}
                                            </span>
                                        </div>
                                        {warehouse.contactName && (
                                            <div className="flex items-center gap-2">
                                                <User className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                <span>Manager: {warehouse.contactName}</span>
                                            </div>
                                        )}
                                        {warehouse.contactPhone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                                                <span>{warehouse.contactPhone}</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="pt-3 border-t grid grid-cols-2 gap-2 text-center">
                                        <div className="bg-muted/40 p-2 rounded-lg">
                                            <div className="text-xs text-muted-foreground">SKUs Stored</div>
                                            <div className="text-base font-bold mt-0.5">{warehouse.itemCount}</div>
                                        </div>
                                        <div className="bg-muted/40 p-2 rounded-lg">
                                            <div className="text-xs text-muted-foreground">Total Units</div>
                                            <div className="text-base font-bold mt-0.5">{warehouse.totalUnits.toLocaleString()}</div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* TAB 3: Movement Ledger & Audit History */}
                <TabsContent value="movements" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold">Inventory Transaction Ledger</CardTitle>
                            <CardDescription className="text-xs">
                                Immutable audit trail recording all stock receipts, shipments, manual adjustments, and inter-depot movements.
                            </CardDescription>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Product / SKU</TableHead>
                                    <TableHead className="text-center">Type</TableHead>
                                    <TableHead>Facility Movement</TableHead>
                                    <TableHead className="text-right">Qty Delta</TableHead>
                                    <TableHead className="text-right">New Balance</TableHead>
                                    <TableHead>Reason & Ref</TableHead>
                                    <TableHead>Executed By</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialData.recentMovements.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                            <History className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                            <p className="font-medium">No inventory movements recorded yet.</p>
                                            <p className="text-xs mt-1">Actions such as receiving stock, physical inventory counts, and dispatching will be logged here.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    initialData.recentMovements.map(m => (
                                        <TableRow key={m.id}>
                                            <TableCell className="text-xs text-muted-foreground font-mono">
                                                {format(new Date(m.createdAt), "dd MMM yyyy, HH:mm")}
                                            </TableCell>
                                            <TableCell>
                                                <div className="font-semibold text-xs">{m.productName}</div>
                                                {m.productSku && (
                                                    <div className="font-mono text-[10px] text-muted-foreground">{m.productSku}</div>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center">
                                                {m.type === "IN" && (
                                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                                        STOCK IN
                                                    </Badge>
                                                )}
                                                {m.type === "OUT" && (
                                                    <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px]">
                                                        STOCK OUT
                                                    </Badge>
                                                )}
                                                {m.type === "ADJUSTMENT" && (
                                                    <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-[10px]">
                                                        CORRECTION
                                                    </Badge>
                                                )}
                                                {m.type === "TRANSFER" && (
                                                    <Badge className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">
                                                        TRANSFER
                                                    </Badge>
                                                )}
                                                {m.type === "DAMAGE" && (
                                                    <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px]">
                                                        WRITE-OFF
                                                    </Badge>
                                                )}
                                                {m.type === "RETURN" && (
                                                    <Badge className="bg-teal-500/10 text-teal-600 border-teal-500/20 text-[10px]">
                                                        RETURN
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {m.type === "TRANSFER" ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <span>{m.warehouseName}</span>
                                                        <MoveRight className="h-3 w-3 text-muted-foreground" />
                                                        <span className="font-medium text-primary">{m.toWarehouseName}</span>
                                                    </div>
                                                ) : (
                                                    <span>{m.warehouseName}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs font-semibold">
                                                {(m.type === "IN" || m.type === "RETURN") && (
                                                    <span className="text-emerald-600">+{m.quantity}</span>
                                                )}
                                                {(m.type === "OUT" || m.type === "DAMAGE") && (
                                                    <span className="text-rose-600">-{m.quantity}</span>
                                                )}
                                                {m.type === "ADJUSTMENT" && (
                                                    <span className="text-blue-600">{m.newQty >= m.previousQty ? `+${m.quantity}` : `-${m.quantity}`}</span>
                                                )}
                                                {m.type === "TRANSFER" && (
                                                    <span className="text-purple-600">{m.quantity}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {m.newQty}
                                            </TableCell>
                                            <TableCell className="text-xs max-w-[180px] truncate">
                                                {m.reason || "—"}
                                                {m.referenceNo && (
                                                    <span className="block text-[10px] text-muted-foreground font-mono">Ref: {m.referenceNo}</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {m.performedBy || "Super Admin"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* TAB 4: Reorder Alerts */}
                <TabsContent value="alerts" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold">Low Stock & Procurement Alerts</CardTitle>
                            <CardDescription className="text-xs">
                                Items operating below recommended safety stock levels. Review suggested replenishment quantities.
                            </CardDescription>
                        </CardHeader>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product / Item</TableHead>
                                    <TableHead>SKU</TableHead>
                                    <TableHead className="text-right">Current Stock</TableHead>
                                    <TableHead className="text-right">Reorder Point</TableHead>
                                    <TableHead className="text-right">Deficit Units</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Est. Restock Cost</TableHead>
                                    <TableHead className="text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {lowStockProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                            <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-500 opacity-80" />
                                            <p className="font-medium text-foreground">All inventory levels healthy!</p>
                                            <p className="text-xs mt-1">No products are currently at or below their reorder thresholds.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    lowStockProducts.map(p => {
                                        const deficit = Math.max(0, p.reorderPoint - p.stockQty)
                                        const estCost = deficit * p.unitPrice

                                        return (
                                            <TableRow key={p.id}>
                                                <TableCell>
                                                    <div className="font-semibold text-sm">{p.name}</div>
                                                    <div className="text-xs text-muted-foreground">{p.category || "General"}</div>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{p.sku || "—"}</TableCell>
                                                <TableCell className="text-right">
                                                    <span className="font-bold text-sm text-rose-500">{p.stockQty} {p.unit}</span>
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {p.reorderPoint} {p.unit}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs font-bold text-amber-600">
                                                    +{deficit} {p.unit}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {formatCurrency(p.unitPrice)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs font-semibold">
                                                    {formatCurrency(estCost)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button 
                                                        size="sm" 
                                                        className="h-8 text-xs gap-1.5"
                                                        onClick={() => openAdjustForProduct(p)}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                        Receive Stock
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>

                {/* TAB 5: Barcodes & Labels Studio */}
                <TabsContent value="barcodes" className="space-y-4">
                    {/* Launch Cards Banner */}
                    <div className="grid gap-4 md:grid-cols-3">
                        <Card className="bg-gradient-to-br from-indigo-50/50 via-background to-background dark:from-indigo-950/20 border-indigo-200/50 dark:border-indigo-800/50">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <ScanLine className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                        Barcode Scanner Desk
                                    </CardTitle>
                                    <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/20 text-[10px]">
                                        Live
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Scan with your device camera or plug in any high-speed USB/Bluetooth barcode gun.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    className="w-full gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                                    onClick={() => setIsScannerOpen(true)}
                                >
                                    <ScanLine className="h-4 w-4" />
                                    Launch Scanner Desk
                                </Button>
                            </CardContent>
                        </Card>

                        <Card className="bg-gradient-to-br from-purple-50/50 via-background to-background dark:from-purple-950/20 border-purple-200/50 dark:border-purple-800/50">
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <Printer className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                                        Printable Label Studio
                                    </CardTitle>
                                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/20 text-[10px]">
                                        A4 & Thermal
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    Print A4 sticky sheets (24, 30, 40, 65 per sheet) or continuous direct thermal rolls.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Button 
                                    variant="outline" 
                                    className="w-full gap-2 border-purple-200 dark:border-purple-800 hover:bg-purple-50 dark:hover:bg-purple-950/40 text-purple-700 dark:text-purple-300 font-semibold"
                                    onClick={() => {
                                        setSelectedProductsForLabel(initialData.products)
                                        setIsLabelPrinterOpen(true)
                                    }}
                                >
                                    <Printer className="h-4 w-4" />
                                    Print All Catalog Labels ({initialData.products.length})
                                </Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader className="pb-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                                        <BarcodeIcon className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                        Catalog Coverage
                                    </CardTitle>
                                    <Badge variant="secondary" className="text-[10px]">
                                        {Math.round((initialData.products.filter(p => !!p.barcode || !!p.sku).length / (initialData.products.length || 1)) * 100)}%
                                    </Badge>
                                </div>
                                <CardDescription className="text-xs">
                                    All products with valid SKU or assigned custom barcode ready for instant scanning.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                <div className="flex items-baseline justify-between">
                                    <span className="text-2xl font-bold">
                                        {initialData.products.filter(p => !!p.barcode || !!p.sku).length}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        of {initialData.products.length} total items
                                    </span>
                                </div>
                                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                                    <div 
                                        className="bg-emerald-500 h-full rounded-full transition-all"
                                        style={{ 
                                            width: `${Math.round((initialData.products.filter(p => !!p.barcode || !!p.sku).length / (initialData.products.length || 1)) * 100)}%` 
                                        }}
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Filter & Format Selector Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-muted/40 p-3 rounded-lg border">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input 
                                placeholder="Search by item name, SKU, or barcode number..." 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs bg-background"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex items-center bg-background rounded-md border p-0.5 text-xs">
                                <button
                                    type="button"
                                    onClick={() => setBarcodeTabFormat("CODE128")}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                                        barcodeTabFormat === "CODE128" 
                                            ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <BarcodeIcon className="h-3.5 w-3.5" />
                                    1D Code-128
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setBarcodeTabFormat("QR")}
                                    className={`flex items-center gap-1.5 px-3 py-1 rounded transition-colors ${
                                        barcodeTabFormat === "QR" 
                                            ? "bg-primary text-primary-foreground font-semibold shadow-xs" 
                                            : "text-muted-foreground hover:text-foreground"
                                    }`}
                                >
                                    <QrIcon className="h-3.5 w-3.5" />
                                    2D QR Code
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Barcodes Directory Table */}
                    <Card>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Product / Item</TableHead>
                                    <TableHead>SKU & Category</TableHead>
                                    <TableHead>Encoded Value</TableHead>
                                    <TableHead>Vector Preview</TableHead>
                                    <TableHead className="text-right">Stock on Hand</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredProducts.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                            <BarcodeIcon className="h-10 w-10 mx-auto mb-3 opacity-30" />
                                            <p className="font-medium">No items matched your search criteria.</p>
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredProducts.map(product => {
                                        const codeValue = product.barcode || product.sku || ""
                                        return (
                                            <TableRow key={product.id}>
                                                <TableCell>
                                                    <div className="font-semibold text-sm">{product.name}</div>
                                                    {product.brand && (
                                                        <div className="text-xs text-muted-foreground">Brand: {product.brand}</div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-mono text-xs">{product.sku || "—"}</div>
                                                    <div className="text-xs text-muted-foreground">{product.category || "General"}</div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="font-mono text-xs font-semibold bg-muted/60 px-2 py-1 rounded w-fit">
                                                        {codeValue || "—"}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {codeValue ? (
                                                        <BarcodeDisplay 
                                                            value={codeValue}
                                                            format={barcodeTabFormat}
                                                            width={barcodeTabFormat === "QR" ? 64 : 120}
                                                            height={barcodeTabFormat === "QR" ? 64 : 32}
                                                            showValue={barcodeTabFormat === "CODE128"}
                                                            allowCopy={true}
                                                            allowZoom={true}
                                                        />
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground italic">No code assigned</span>
                                                    )}
                                                </TableCell>
                                                <TableCell className="text-right font-bold text-sm">
                                                    {product.stockQty.toLocaleString()} {product.unit}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {formatCurrency(product.unitPrice)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            className="h-8 text-xs gap-1"
                                                            onClick={() => {
                                                                setSelectedProductsForLabel([product])
                                                                setIsLabelPrinterOpen(true)
                                                            }}
                                                        >
                                                            <Printer className="h-3.5 w-3.5" />
                                                            Print Label
                                                        </Button>
                                                        <Button 
                                                            variant="ghost" 
                                                            size="sm" 
                                                            className="h-8 text-xs gap-1 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                                                            onClick={() => setIsScannerOpen(true)}
                                                        >
                                                            <ScanLine className="h-3.5 w-3.5" />
                                                            Scan
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* MODAL 1: Adjust Stock Dialog */}
            <Dialog open={isAdjustOpen} onOpenChange={setIsAdjustOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Record Stock Adjustment</DialogTitle>
                        <DialogDescription className="text-xs">
                            Adjust inventory quantities for purchases, physical count reconciliations, or damaged stock write-offs.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAdjustSubmit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Product Item *</Label>
                            <Select value={adjustProductId} onValueChange={setAdjustProductId}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} {p.sku ? `(${p.sku})` : ""} — Total: {p.stockQty} {p.unit}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Facility / Warehouse *</Label>
                                <Select value={adjustWarehouseId} onValueChange={setAdjustWarehouseId}>
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Select warehouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.warehouses.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Adjustment Type *</Label>
                                <Select value={adjustType} onValueChange={(val: any) => setAdjustType(val)}>
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Select type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="IN">Stock In (Receive / PO)</SelectItem>
                                        <SelectItem value="OUT">Stock Out (Ship / Dispatch)</SelectItem>
                                        <SelectItem value="ADJUSTMENT">Audit Count (Exact Total)</SelectItem>
                                        <SelectItem value="DAMAGE">Damaged / Expired Write-off</SelectItem>
                                        <SelectItem value="RETURN">Customer Return</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">
                                    {adjustType === "ADJUSTMENT" ? "Actual Count Counted *" : "Quantity Delta *"}
                                </Label>
                                <Input 
                                    type="number" 
                                    step="any"
                                    min="0"
                                    placeholder="e.g. 50" 
                                    value={adjustQty}
                                    onChange={(e) => setAdjustQty(e.target.value)}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Reference # (Optional)</Label>
                                <Input 
                                    placeholder="PO-2026-001 or AUDIT-04" 
                                    value={adjustReference}
                                    onChange={(e) => setAdjustReference(e.target.value)}
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Reason / Operational Notes</Label>
                            <Textarea 
                                placeholder="Explain the context for this inventory modification..."
                                value={adjustReason}
                                onChange={(e) => setAdjustReason(e.target.value)}
                                rows={2}
                                className="text-xs"
                            />
                        </div>

                        {/* Live Calculation Preview Banner */}
                        {adjustQty && activeAdjustProduct && (
                            <div className="p-3 bg-muted/60 rounded-lg text-xs space-y-1">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Current Depot Balance:</span>
                                    <span className="font-mono font-medium">{currentWarehouseStock} {activeAdjustProduct.unit}</span>
                                </div>
                                <div className="flex justify-between text-primary font-semibold">
                                    <span>New Depot Balance:</span>
                                    <span className="font-mono">{previewNewQty()} {activeAdjustProduct.unit}</span>
                                </div>
                            </div>
                        )}

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsAdjustOpen(false)}
                                disabled={isSubmittingAdjust}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                size="sm" 
                                disabled={isSubmittingAdjust}
                                className="gap-2"
                            >
                                {isSubmittingAdjust && <Loader2 className="h-4 w-4 animate-spin" />}
                                Commit Adjustment
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: Transfer Stock Dialog */}
            <Dialog open={isTransferOpen} onOpenChange={setIsTransferOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Transfer Stock Between Warehouses</DialogTitle>
                        <DialogDescription className="text-xs">
                            Relocate inventory from one facility to another with automatic ledger reconciliation.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleTransferSubmit} className="space-y-4 py-2">
                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Product Item *</Label>
                            <Select value={transferProductId} onValueChange={setTransferProductId}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.products.map(p => (
                                        <SelectItem key={p.id} value={p.id}>
                                            {p.name} {p.sku ? `(${p.sku})` : ""}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Origin Facility *</Label>
                                <Select value={transferFromWarehouseId} onValueChange={setTransferFromWarehouseId}>
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Source" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.warehouses.map(w => (
                                            <SelectItem key={w.id} value={w.id}>{w.name} ({w.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Destination Facility *</Label>
                                <Select value={transferToWarehouseId} onValueChange={setTransferToWarehouseId}>
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Destination" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.warehouses.map(w => (
                                            <SelectItem 
                                                key={w.id} 
                                                value={w.id} 
                                                disabled={w.id === transferFromWarehouseId}
                                            >
                                                {w.name} ({w.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Units to Transfer *</Label>
                                <Input 
                                    type="number" 
                                    step="any"
                                    min="1"
                                    placeholder="e.g. 20" 
                                    value={transferQty}
                                    onChange={(e) => setTransferQty(e.target.value)}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Waybill / Transfer Ref</Label>
                                <Input 
                                    placeholder="TRF-2026-09" 
                                    value={transferReference}
                                    onChange={(e) => setTransferReference(e.target.value)}
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Dispatch Note</Label>
                            <Input 
                                placeholder="e.g. Internal store replenishment"
                                value={transferReason}
                                onChange={(e) => setTransferReason(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsTransferOpen(false)}
                                disabled={isSubmittingTransfer}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                size="sm" 
                                disabled={isSubmittingTransfer}
                                className="gap-2"
                            >
                                {isSubmittingTransfer && <Loader2 className="h-4 w-4 animate-spin" />}
                                Execute Transfer
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 3: Warehouse Create/Edit Dialog */}
            <Dialog open={isWarehouseOpen} onOpenChange={setIsWarehouseOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle>
                            {selectedWarehouseForEdit ? "Edit Warehouse Depot" : "Provision New Warehouse"}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define storage locations, distribution centers, and retail depots for inventory stock isolation.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleWarehouseSubmit} className="space-y-4 py-2">
                        <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2 space-y-2">
                                <Label className="text-xs font-medium">Warehouse Name *</Label>
                                <Input 
                                    placeholder="e.g. West Coast Distribution"
                                    value={whName}
                                    onChange={(e) => setWhName(e.target.value)}
                                    required
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Code *</Label>
                                <Input 
                                    placeholder="WH-02"
                                    value={whCode}
                                    onChange={(e) => setWhCode(e.target.value.toUpperCase())}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label className="text-xs font-medium">Physical Address</Label>
                            <Input 
                                placeholder="Plot 12, Industrial Area, Sector 5"
                                value={whAddress}
                                onChange={(e) => setWhAddress(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">City</Label>
                                <Input 
                                    placeholder="Mumbai"
                                    value={whCity}
                                    onChange={(e) => setWhCity(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">State / Region</Label>
                                <Input 
                                    placeholder="Maharashtra"
                                    value={whState}
                                    onChange={(e) => setWhState(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Facility Manager</Label>
                                <Input 
                                    placeholder="Contact person name"
                                    value={whContactName}
                                    onChange={(e) => setWhContactName(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-xs font-medium">Manager Phone</Label>
                                <Input 
                                    placeholder="+91 98000 00000"
                                    value={whContactPhone}
                                    onChange={(e) => setWhContactPhone(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                            <input 
                                type="checkbox" 
                                id="whDefaultCheck"
                                checked={whIsDefault}
                                onChange={(e) => setWhIsDefault(e.target.checked)}
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <Label htmlFor="whDefaultCheck" className="text-xs font-normal cursor-pointer">
                                Set as Primary Hub (Default receiving facility)
                            </Label>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsWarehouseOpen(false)}
                                disabled={isSubmittingWh}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="submit" 
                                size="sm" 
                                disabled={isSubmittingWh}
                                className="gap-2"
                            >
                                {isSubmittingWh && <Loader2 className="h-4 w-4 animate-spin" />}
                                {selectedWarehouseForEdit ? "Save Changes" : "Create Warehouse"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* MODAL 4: Barcode Scanner Desk */}
            <BarcodeScannerModal 
                isOpen={isScannerOpen}
                onClose={() => setIsScannerOpen(false)}
                warehouses={initialData.warehouses}
                onStockUpdated={() => {
                    startTransition(() => {
                        router.refresh()
                    })
                }}
            />

            {/* MODAL 5: Barcode Label Printing Studio */}
            <BarcodeLabelPrinter 
                isOpen={isLabelPrinterOpen}
                onClose={() => setIsLabelPrinterOpen(false)}
                products={selectedProductsForLabel}
            />
        </div>
    )
}
