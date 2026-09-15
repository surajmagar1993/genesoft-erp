"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Factory,
    Boxes,
    CheckCircle2,
    Clock,
    AlertCircle,
    Search,
    Plus,
    RefreshCw,
    Play,
    Check,
    X,
    Eye,
    Percent,
    ShieldCheck,
    Truck,
    Calendar,
    ChevronRight,
    ArrowRight,
    Loader2,
    Layers,
    FileText,
    Wrench,
    Sliders,
    Trash2
} from "lucide-react"
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
import { formatCurrency } from "@/lib/utils"
import {
    ManufacturingOverviewData,
    WorkOrderRecord,
    BOMRecord,
    QualityInspectionRecord,
    createBOM,
    updateBOMStatus,
    createWorkOrder,
    updateWorkOrderStatus,
    recordQualityInspection
} from "@/app/actions/manufacturing"
import {
    WorkOrderStatus,
    WorkOrderPriority,
    BOMStatus,
    QCStatus
} from "@prisma/client"

export function ManufacturingClient({ initialData }: { initialData: ManufacturingOverviewData }) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<"orders" | "boms" | "qc">("orders")

    // Modals
    const [isNewOrderModalOpen, setIsNewOrderModalOpen] = useState(false)
    const [isNewBOMModalOpen, setIsNewBOMModalOpen] = useState(false)
    const [isAdvanceStatusModalOpen, setIsAdvanceStatusModalOpen] = useState(false)
    const [isQCModalOpen, setIsQCModalOpen] = useState(false)
    const [isBOMDetailOpen, setIsBOMDetailOpen] = useState(false)

    // Active records
    const [selectedOrder, setSelectedOrder] = useState<WorkOrderRecord | null>(null)
    const [selectedBOM, setSelectedBOM] = useState<BOMRecord | null>(null)

    // Filters
    const [orderSearch, setOrderSearch] = useState("")
    const [orderStatusFilter, setOrderStatusFilter] = useState("ALL")
    const [bomSearch, setBOMSearch] = useState("")

    // Advance Status Form
    const [nextStatus, setNextStatus] = useState<WorkOrderStatus>("IN_PROGRESS")
    const [producedQty, setProducedQty] = useState("1")
    const [scrapQty, setScrapQty] = useState("0")
    const [statusNotes, setStatusNotes] = useState("")

    // Work Order Form
    const [woBOMId, setWoBOMId] = useState("")
    const [woPlannedQty, setWoPlannedQty] = useState("10")
    const [woSourceWh, setWoSourceWh] = useState(initialData.availableWarehouses[0]?.id || "")
    const [woTargetWh, setWoTargetWh] = useState(initialData.availableWarehouses[0]?.id || "")
    const [woDueDate, setWoDueDate] = useState(format(new Date(Date.now() + 7 * 86400000), "yyyy-MM-dd"))
    const [woPriority, setWoPriority] = useState<WorkOrderPriority>("MEDIUM")
    const [woAssignedTo, setWoAssignedTo] = useState("")
    const [woNotes, setWoNotes] = useState("")

    // BOM Form
    const [bomName, setBomName] = useState("")
    const [bomProductId, setBomProductId] = useState("")
    const [bomBatchQty, setBomBatchQty] = useState("1")
    const [bomUnit, setBomUnit] = useState("Nos")
    const [bomVersion, setBomVersion] = useState("1.0")
    const [bomLaborCost, setBomLaborCost] = useState("0")
    const [bomOverheadCost, setBomOverheadCost] = useState("0")
    const [bomNotes, setBomNotes] = useState("")
    const [bomComponents, setBomComponents] = useState<
        { productId: string; quantity: string; unit: string; unitCost: string; scrapPercentage: string }[]
    >([
        { productId: initialData.availableProducts[0]?.id || "", quantity: "1", unit: "Nos", unitCost: "100", scrapPercentage: "0" }
    ])

    // QC Form
    const [qcWorkOrderId, setQcWorkOrderId] = useState("")
    const [qcInspectedQty, setQcInspectedQty] = useState("10")
    const [qcPassedQty, setQcPassedQty] = useState("10")
    const [qcFailedQty, setQcFailedQty] = useState("0")
    const [qcDefectReason, setQcDefectReason] = useState("")
    const [qcInspector, setQcInspector] = useState("Quality Control Lead")
    const [qcNotes, setQcNotes] = useState("")

    // Filtered Work Orders
    const filteredOrders = useMemo(() => {
        return initialData.workOrders.filter(wo => {
            const matchesSearch =
                wo.orderNumber.toLowerCase().includes(orderSearch.toLowerCase()) ||
                wo.productName.toLowerCase().includes(orderSearch.toLowerCase()) ||
                wo.bomName.toLowerCase().includes(orderSearch.toLowerCase())

            const matchesStatus = orderStatusFilter === "ALL" || wo.status === orderStatusFilter
            return matchesSearch && matchesStatus
        })
    }, [initialData.workOrders, orderSearch, orderStatusFilter])

    // Filtered BOMs
    const filteredBOMs = useMemo(() => {
        return initialData.boms.filter(b => {
            return (
                b.bomNumber.toLowerCase().includes(bomSearch.toLowerCase()) ||
                b.name.toLowerCase().includes(bomSearch.toLowerCase()) ||
                b.productName.toLowerCase().includes(bomSearch.toLowerCase())
            )
        })
    }, [initialData.boms, bomSearch])

    // Handle Create Work Order
    const handleCreateWorkOrder = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            try {
                const res = await createWorkOrder({
                    bomId: woBOMId,
                    plannedQuantity: Number(woPlannedQty),
                    sourceWarehouseId: woSourceWh,
                    targetWarehouseId: woTargetWh,
                    dueDate: woDueDate,
                    priority: woPriority,
                    assignedTo: woAssignedTo || undefined,
                    notes: woNotes || undefined
                })

                if (res.success) {
                    if (res.hasShortages) {
                        toast.warning(`Work Order ${res.orderNumber} created with component stock warnings.`)
                    } else {
                        toast.success(`Work Order ${res.orderNumber} scheduled successfully!`)
                    }
                    setIsNewOrderModalOpen(false)
                    router.refresh()
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to create work order")
            }
        })
    }

    // Handle Advance Status
    const handleAdvanceStatusSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedOrder) return

        startTransition(async () => {
            try {
                const res = await updateWorkOrderStatus(
                    selectedOrder.id,
                    nextStatus,
                    nextStatus === "COMPLETED" ? Number(producedQty) : undefined,
                    nextStatus === "COMPLETED" ? Number(scrapQty) : undefined,
                    statusNotes || undefined
                )

                if (res.success) {
                    if (nextStatus === "COMPLETED") {
                        toast.success(`Production completed! Raw materials consumed and ${producedQty} finished units added to inventory.`)
                    } else {
                        toast.success(`Work Order status updated to ${nextStatus}`)
                    }
                    setIsAdvanceStatusModalOpen(false)
                    setSelectedOrder(null)
                    router.refresh()
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to update work order")
            }
        })
    }

    // Handle Create BOM
    const handleCreateBOM = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            try {
                const res = await createBOM({
                    name: bomName,
                    productId: bomProductId,
                    quantity: Number(bomBatchQty),
                    unit: bomUnit,
                    version: bomVersion,
                    laborCost: Number(bomLaborCost),
                    overheadCost: Number(bomOverheadCost),
                    notes: bomNotes || undefined,
                    items: bomComponents.map(c => ({
                        productId: c.productId,
                        quantity: Number(c.quantity),
                        unit: c.unit,
                        unitCost: Number(c.unitCost),
                        scrapPercentage: Number(c.scrapPercentage)
                    }))
                })

                if (res.success) {
                    toast.success(`Bill of Materials ${res.bomNumber} created successfully!`)
                    setIsNewBOMModalOpen(false)
                    router.refresh()
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to create BOM")
            }
        })
    }

    // Handle Record QC
    const handleRecordQC = (e: React.FormEvent) => {
        e.preventDefault()
        startTransition(async () => {
            try {
                const res = await recordQualityInspection(qcWorkOrderId, {
                    inspectedQuantity: Number(qcInspectedQty),
                    passedQuantity: Number(qcPassedQty),
                    failedQuantity: Number(qcFailedQty),
                    defectReason: qcDefectReason || undefined,
                    inspectorName: qcInspector || undefined,
                    notes: qcNotes || undefined
                })

                if (res.success) {
                    toast.success(`Inspection ${res.inspectionNumber} recorded: Verdict ${res.status}`)
                    setIsQCModalOpen(false)
                    router.refresh()
                }
            } catch (err: any) {
                toast.error(err.message || "Failed to record quality inspection")
            }
        })
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Factory className="h-6 w-6 text-orange-600" />
                        Manufacturing & MRP Suite
                    </h2>
                    <p className="text-sm text-muted-foreground">
                        Bill of Materials (BOM), production scheduling, automated stock consumption, and Quality Control (QC).
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => router.refresh()}
                        disabled={isPending}
                        className="h-9"
                    >
                        <RefreshCw className={`h-4 w-4 mr-2 ${isPending ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>

                    <Button
                        onClick={() => setIsNewOrderModalOpen(true)}
                        className="bg-orange-600 hover:bg-orange-700 text-white shadow-sm h-9"
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        New Work Order
                    </Button>
                </div>
            </div>

            {/* KPI Telemetry Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Active Work Orders
                        </CardTitle>
                        <Clock className="h-4 w-4 text-orange-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-foreground">
                            {initialData.telemetry.activeWorkOrders}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="text-orange-600 font-medium">In Queue / On Floor</span>
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Production Yield Rate
                        </CardTitle>
                        <Percent className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-emerald-600">
                            {initialData.telemetry.productionYieldRate}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Good output vs scrap ratio
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Completed Output (MTD)
                        </CardTitle>
                        <Boxes className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-foreground">
                            {initialData.telemetry.completedThisMonth}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Work orders completed this month
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Active BOM Recipes
                        </CardTitle>
                        <Layers className="h-4 w-4 text-indigo-600" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold font-mono text-foreground">
                            {initialData.telemetry.totalBOMs}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Engineered assembly formulas
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Sub Tabs */}
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="space-y-4">
                <TabsList className="grid grid-cols-3 sm:flex sm:w-auto h-auto p-1 gap-1 border bg-muted/40">
                    <TabsTrigger value="orders" className="text-xs py-1.5 px-3">
                        <Wrench className="h-3.5 w-3.5 mr-1.5" />
                        Work Orders ({initialData.workOrders.length})
                    </TabsTrigger>
                    <TabsTrigger value="boms" className="text-xs py-1.5 px-3">
                        <Layers className="h-3.5 w-3.5 mr-1.5" />
                        Bill of Materials ({initialData.boms.length})
                    </TabsTrigger>
                    <TabsTrigger value="qc" className="text-xs py-1.5 px-3">
                        <ShieldCheck className="h-3.5 w-3.5 mr-1.5" />
                        Quality Control ({initialData.inspections.length})
                    </TabsTrigger>
                </TabsList>

                {/* --- TAB 1: WORK ORDERS --- */}
                <TabsContent value="orders" className="space-y-4 mt-0">
                    <Card className="border-border">
                        <CardHeader className="pb-3">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <CardTitle className="text-base font-semibold">Production Orders</CardTitle>
                                    <CardDescription className="text-xs">
                                        Track factory floor job cards from planned staging to quality check and warehouse stocking.
                                    </CardDescription>
                                </div>

                                <div className="flex flex-wrap items-center gap-2">
                                    <div className="relative w-full sm:w-60">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Search order # or product..."
                                            value={orderSearch}
                                            onChange={(e) => setOrderSearch(e.target.value)}
                                            className="h-8 pl-8 text-xs"
                                        />
                                    </div>

                                    <Select value={orderStatusFilter} onValueChange={setOrderStatusFilter}>
                                        <SelectTrigger className="h-8 text-xs w-[130px]">
                                            <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Status</SelectItem>
                                            <SelectItem value="PLANNED">Planned</SelectItem>
                                            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                            <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                                            <SelectItem value="QUALITY_CHECK">Quality Check</SelectItem>
                                            <SelectItem value="COMPLETED">Completed</SelectItem>
                                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead>Order #</TableHead>
                                            <TableHead>Finished Good</TableHead>
                                            <TableHead>BOM Recipe</TableHead>
                                            <TableHead className="text-center">Yield Progress</TableHead>
                                            <TableHead>Warehouses</TableHead>
                                            <TableHead>Due Date</TableHead>
                                            <TableHead className="text-center">Priority</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredOrders.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                                                    No work orders found. Click "New Work Order" to schedule your first production batch.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredOrders.map((wo) => (
                                                <TableRow key={wo.id} className="text-xs hover:bg-muted/40">
                                                    <TableCell className="font-semibold font-mono text-foreground">
                                                        {wo.orderNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-foreground">{wo.productName}</div>
                                                        <div className="text-[11px] text-muted-foreground font-mono">
                                                            {wo.productSku || "No SKU"}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {wo.bomName}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="font-mono font-semibold">
                                                            {wo.producedQuantity} / {wo.plannedQuantity}
                                                        </div>
                                                        {wo.scrapQuantity > 0 && (
                                                            <span className="text-[10px] text-red-500 font-mono block">
                                                                ({wo.scrapQuantity} scrap)
                                                            </span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="text-[11px] text-muted-foreground">
                                                            <span className="font-medium text-foreground">{wo.sourceWarehouseName}</span>
                                                            <ArrowRight className="inline h-3 w-3 mx-1 opacity-50" />
                                                            <span className="font-medium text-foreground">{wo.targetWarehouseName}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {format(new Date(wo.dueDate), "dd MMM yyyy")}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] ${
                                                                wo.priority === "URGENT" || wo.priority === "HIGH"
                                                                    ? "border-red-400 text-red-600 bg-red-50 dark:bg-red-950/20"
                                                                    : "border-slate-300 text-slate-600"
                                                            }`}
                                                        >
                                                            {wo.priority}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        {wo.status === "PLANNED" && (
                                                            <Badge variant="outline" className="border-slate-300 text-slate-600 text-[10px]">
                                                                PLANNED
                                                            </Badge>
                                                        )}
                                                        {wo.status === "CONFIRMED" && (
                                                            <Badge variant="outline" className="border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20 text-[10px]">
                                                                CONFIRMED
                                                            </Badge>
                                                        )}
                                                        {wo.status === "IN_PROGRESS" && (
                                                            <Badge variant="outline" className="border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20 text-[10px]">
                                                                IN PROGRESS
                                                            </Badge>
                                                        )}
                                                        {wo.status === "QUALITY_CHECK" && (
                                                            <Badge variant="outline" className="border-indigo-400 text-indigo-600 bg-indigo-50 dark:bg-indigo-950/20 text-[10px]">
                                                                QUALITY CHECK
                                                            </Badge>
                                                        )}
                                                        {wo.status === "COMPLETED" && (
                                                            <Badge variant="outline" className="border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-[10px]">
                                                                COMPLETED
                                                            </Badge>
                                                        )}
                                                        {wo.status === "CANCELLED" && (
                                                            <Badge variant="outline" className="border-red-400 text-red-600 bg-red-50 dark:bg-red-950/20 text-[10px]">
                                                                CANCELLED
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        {wo.status !== "COMPLETED" && wo.status !== "CANCELLED" ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => {
                                                                    setSelectedOrder(wo)
                                                                    setProducedQty(String(wo.plannedQuantity))
                                                                    setScrapQty("0")
                                                                    setNextStatus(
                                                                        wo.status === "PLANNED" ? "CONFIRMED" :
                                                                        wo.status === "CONFIRMED" ? "IN_PROGRESS" :
                                                                        wo.status === "IN_PROGRESS" ? "QUALITY_CHECK" : "COMPLETED"
                                                                    )
                                                                    setIsAdvanceStatusModalOpen(true)
                                                                }}
                                                                disabled={isPending}
                                                                className="h-7 px-2 text-[11px]"
                                                            >
                                                                <Sliders className="h-3 w-3 mr-1" />
                                                                Advance
                                                            </Button>
                                                        ) : (
                                                            <span className="text-[11px] text-muted-foreground">Archived</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB 2: BILL OF MATERIALS (BOM) --- */}
                <TabsContent value="boms" className="space-y-4 mt-0">
                    <Card className="border-border">
                        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base font-semibold">Bill of Materials (BOM) Recipes</CardTitle>
                                <CardDescription className="text-xs">
                                    Assembly formulas, component quantities, scrap waste allowances, and labor overheads.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setIsNewBOMModalOpen(true)}
                                className="h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Create BOM
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead>BOM Number</TableHead>
                                            <TableHead>Recipe Name</TableHead>
                                            <TableHead>Finished Product</TableHead>
                                            <TableHead className="text-center">Batch Yield</TableHead>
                                            <TableHead className="text-center">Components</TableHead>
                                            <TableHead className="text-right">Labor / Overhead</TableHead>
                                            <TableHead className="text-right">Estimated Batch Cost</TableHead>
                                            <TableHead className="text-center">Status</TableHead>
                                            <TableHead className="text-right">Recipe Detail</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredBOMs.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                                                    No Bill of Materials configured yet. Click "Create BOM" to define a product assembly formula.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            filteredBOMs.map((bom) => (
                                                <TableRow key={bom.id} className="text-xs hover:bg-muted/40">
                                                    <TableCell className="font-semibold font-mono text-foreground">
                                                        {bom.bomNumber}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-foreground">{bom.name}</div>
                                                        <div className="text-[10px] text-muted-foreground">Version {bom.version}</div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="font-medium text-foreground">{bom.productName}</div>
                                                        <div className="text-[11px] text-muted-foreground font-mono">{bom.productSku}</div>
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono">
                                                        {bom.quantity} {bom.unit}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="secondary" className="font-mono text-[11px]">
                                                            {bom.itemsCount} parts
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-muted-foreground">
                                                        {formatCurrency(bom.laborCost + bom.overheadCost)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-bold text-foreground">
                                                        {formatCurrency(bom.estimatedTotalCost)}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge variant="outline" className="border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-[10px]">
                                                            {bom.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            onClick={() => {
                                                                setSelectedBOM(bom)
                                                                setIsBOMDetailOpen(true)
                                                            }}
                                                            className="h-7 px-2 text-[11px]"
                                                        >
                                                            <Eye className="h-3 w-3 mr-1" />
                                                            View Components
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* --- TAB 3: QUALITY CONTROL (QC) --- */}
                <TabsContent value="qc" className="space-y-4 mt-0">
                    <Card className="border-border">
                        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base font-semibold">Quality Control & Inspections</CardTitle>
                                <CardDescription className="text-xs">
                                    Quality gates, defect categorization, and batch pass/fail compliance audits.
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => {
                                    if (initialData.workOrders.length > 0) {
                                        setQcWorkOrderId(initialData.workOrders[0].id)
                                    }
                                    setIsQCModalOpen(true)
                                }}
                                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                <Plus className="h-3.5 w-3.5 mr-1" />
                                Record QC Inspection
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="text-xs bg-muted/30">
                                            <TableHead>QC #</TableHead>
                                            <TableHead>Work Order</TableHead>
                                            <TableHead>Product</TableHead>
                                            <TableHead className="text-center">Inspected</TableHead>
                                            <TableHead className="text-center">Passed</TableHead>
                                            <TableHead className="text-center">Failed / Scrap</TableHead>
                                            <TableHead className="text-center">Verdict</TableHead>
                                            <TableHead>Inspector</TableHead>
                                            <TableHead>Date</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {initialData.inspections.length === 0 ? (
                                            <TableRow>
                                                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground text-xs">
                                                    No quality inspections recorded yet.
                                                </TableCell>
                                            </TableRow>
                                        ) : (
                                            initialData.inspections.map((qc) => (
                                                <TableRow key={qc.id} className="text-xs hover:bg-muted/40">
                                                    <TableCell className="font-semibold font-mono text-foreground">
                                                        {qc.inspectionNumber}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-muted-foreground">
                                                        {qc.workOrderNumber}
                                                    </TableCell>
                                                    <TableCell className="font-medium text-foreground">
                                                        {qc.productName}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono font-semibold">
                                                        {qc.inspectedQuantity}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-emerald-600">
                                                        {qc.passedQuantity}
                                                    </TableCell>
                                                    <TableCell className="text-center font-mono text-red-600">
                                                        {qc.failedQuantity}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <Badge
                                                            variant="outline"
                                                            className={`text-[10px] ${
                                                                qc.status === "PASSED"
                                                                    ? "border-emerald-400 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
                                                                    : qc.status === "FAILED"
                                                                    ? "border-red-400 text-red-600 bg-red-50 dark:bg-red-950/20"
                                                                    : "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20"
                                                            }`}
                                                        >
                                                            {qc.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {qc.inspectorName || "QA Specialist"}
                                                    </TableCell>
                                                    <TableCell className="text-muted-foreground">
                                                        {format(new Date(qc.inspectedAt), "dd MMM yyyy")}
                                                    </TableCell>
                                                </TableRow>
                                            ))
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* --- MODAL 1: NEW WORK ORDER --- */}
            <Dialog open={isNewOrderModalOpen} onOpenChange={setIsNewOrderModalOpen}>
                <DialogContent className="sm:max-w-[540px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Factory className="h-5 w-5 text-orange-600" />
                            Schedule New Work Order
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define planned production quantity, target completion date, and warehouse routing for raw material drawing and finished goods deposit.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateWorkOrder} className="space-y-4 py-2 text-xs">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Select Bill of Materials (BOM) *</Label>
                            <Select value={woBOMId} onValueChange={setWoBOMId} required>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Select assembly formula..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.boms.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>
                                            {b.bomNumber} — {b.name} ({b.productName})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Planned Quantity *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={woPlannedQty}
                                    onChange={(e) => setWoPlannedQty(e.target.value)}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Priority *</Label>
                                <Select value={woPriority} onValueChange={(v: any) => setWoPriority(v)}>
                                    <SelectTrigger className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="LOW">Low</SelectItem>
                                        <SelectItem value="MEDIUM">Medium</SelectItem>
                                        <SelectItem value="HIGH">High</SelectItem>
                                        <SelectItem value="URGENT">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Source Warehouse (Raw Materials) *</Label>
                                <Select value={woSourceWh} onValueChange={setWoSourceWh} required>
                                    <SelectTrigger className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.availableWarehouses.map((wh) => (
                                            <SelectItem key={wh.id} value={wh.id}>
                                                {wh.name} ({wh.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Target Warehouse (Finished Stock) *</Label>
                                <Select value={woTargetWh} onValueChange={setWoTargetWh} required>
                                    <SelectTrigger className="text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.availableWarehouses.map((wh) => (
                                            <SelectItem key={wh.id} value={wh.id}>
                                                {wh.name} ({wh.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Due Date *</Label>
                                <Input
                                    type="date"
                                    value={woDueDate}
                                    onChange={(e) => setWoDueDate(e.target.value)}
                                    required
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Assigned Floor Supervisor</Label>
                                <Input
                                    placeholder="e.g. Ramesh K. (Shift A)"
                                    value={woAssignedTo}
                                    onChange={(e) => setWoAssignedTo(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Production Notes (Optional)</Label>
                            <Textarea
                                placeholder="Special tooling, batch stamping instructions, or packaging notes..."
                                value={woNotes}
                                onChange={(e) => setWoNotes(e.target.value)}
                                className="text-xs h-16 resize-none"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsNewOrderModalOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending || !woBOMId}
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Schedule Order"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL 2: ADVANCE WORK ORDER STATUS / COMPLETE --- */}
            <Dialog open={isAdvanceStatusModalOpen} onOpenChange={setIsAdvanceStatusModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Sliders className="h-5 w-5 text-orange-600" />
                            Advance Work Order: {selectedOrder?.orderNumber}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Update production stage. Transitioning to COMPLETED triggers automated inventory raw material consumption and finished goods stock replenishment.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAdvanceStatusSubmit} className="space-y-4 py-2 text-xs">
                        <div className="p-3 bg-muted/40 rounded-lg border space-y-1">
                            <div className="font-semibold text-foreground flex justify-between">
                                <span>Product:</span>
                                <span>{selectedOrder?.productName}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Target Output:</span>
                                <span className="font-mono">{selectedOrder?.plannedQuantity} units</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Current Status:</span>
                                <Badge variant="secondary" className="text-[10px]">{selectedOrder?.status}</Badge>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Next Stage *</Label>
                            <Select value={nextStatus} onValueChange={(v: any) => setNextStatus(v)}>
                                <SelectTrigger className="text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                    <SelectItem value="IN_PROGRESS">In Progress (Floor Running)</SelectItem>
                                    <SelectItem value="QUALITY_CHECK">Quality Check</SelectItem>
                                    <SelectItem value="COMPLETED">Completed (Stock Execution)</SelectItem>
                                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {nextStatus === "COMPLETED" && (
                            <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-300 dark:border-emerald-800 rounded-lg space-y-3">
                                <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                                    Final Yield & Scrap Reporting
                                </h4>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium">Produced Units (Good) *</Label>
                                        <Input
                                            type="number"
                                            value={producedQty}
                                            onChange={(e) => setProducedQty(e.target.value)}
                                            required
                                            className="text-xs font-mono font-bold text-emerald-600"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs font-medium">Scrap / Defective Units</Label>
                                        <Input
                                            type="number"
                                            value={scrapQty}
                                            onChange={(e) => setScrapQty(e.target.value)}
                                            className="text-xs font-mono text-red-600"
                                        />
                                    </div>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Completing this work order will deduct all component materials from <b>{selectedOrder?.sourceWarehouseName}</b> and add <b>{producedQty} units</b> into <b>{selectedOrder?.targetWarehouseName}</b>.
                                </p>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Status Remarks / Shift Notes</Label>
                            <Textarea
                                placeholder="Log machine telemetry, shift handovers, or testing comments..."
                                value={statusNotes}
                                onChange={(e) => setStatusNotes(e.target.value)}
                                className="text-xs h-16 resize-none"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAdvanceStatusModalOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className={nextStatus === "COMPLETED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-orange-600 hover:bg-orange-700 text-white"}
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Status Update"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL 3: CREATE BILL OF MATERIALS (BOM) --- */}
            <Dialog open={isNewBOMModalOpen} onOpenChange={setIsNewBOMModalOpen}>
                <DialogContent className="sm:max-w-[650px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-orange-600" />
                            Create Bill of Materials (BOM) Formula
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Define the finished product recipe, component raw materials, waste scrap factor, and direct labor overheads.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateBOM} className="space-y-4 py-2 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Formula / BOM Name *</Label>
                                <Input
                                    placeholder="e.g. Standard 1000W Motor Assembly"
                                    value={bomName}
                                    onChange={(e) => setBomName(e.target.value)}
                                    required
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Finished Good Product *</Label>
                                <Select value={bomProductId} onValueChange={setBomProductId} required>
                                    <SelectTrigger className="text-xs">
                                        <SelectValue placeholder="Select catalog product..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.availableProducts.map((p) => (
                                            <SelectItem key={p.id} value={p.id}>
                                                {p.name} ({p.sku || "No SKU"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Batch Yield Qty *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={bomBatchQty}
                                    onChange={(e) => setBomBatchQty(e.target.value)}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Unit</Label>
                                <Input
                                    value={bomUnit}
                                    onChange={(e) => setBomUnit(e.target.value)}
                                    className="text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Version</Label>
                                <Input
                                    value={bomVersion}
                                    onChange={(e) => setBomVersion(e.target.value)}
                                    className="text-xs font-mono"
                                />
                            </div>
                        </div>

                        {/* Components Builder */}
                        <div className="border-t pt-3 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Raw Material Components & Sub-Assemblies
                                </h4>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => {
                                        setBomComponents([
                                            ...bomComponents,
                                            { productId: initialData.availableProducts[0]?.id || "", quantity: "1", unit: "Nos", unitCost: "50", scrapPercentage: "0" }
                                        ])
                                    }}
                                    className="h-7 text-[11px]"
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Part
                                </Button>
                            </div>

                            <div className="space-y-2">
                                {bomComponents.map((comp, idx) => (
                                    <div key={idx} className="p-2.5 bg-muted/40 rounded-lg border grid grid-cols-12 gap-2 items-center text-xs">
                                        <div className="col-span-5">
                                            <Label className="text-[10px] text-muted-foreground">Raw Material *</Label>
                                            <Select
                                                value={comp.productId}
                                                onValueChange={(val) => {
                                                    const updated = [...bomComponents]
                                                    updated[idx].productId = val
                                                    setBomComponents(updated)
                                                }}
                                            >
                                                <SelectTrigger className="h-8 text-xs">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {initialData.availableProducts.map((p) => (
                                                        <SelectItem key={p.id} value={p.id}>
                                                            {p.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="col-span-2">
                                            <Label className="text-[10px] text-muted-foreground">Qty</Label>
                                            <Input
                                                type="number"
                                                step="any"
                                                value={comp.quantity}
                                                onChange={(e) => {
                                                    const updated = [...bomComponents]
                                                    updated[idx].quantity = e.target.value
                                                    setBomComponents(updated)
                                                }}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <Label className="text-[10px] text-muted-foreground">Unit Cost</Label>
                                            <Input
                                                type="number"
                                                step="any"
                                                value={comp.unitCost}
                                                onChange={(e) => {
                                                    const updated = [...bomComponents]
                                                    updated[idx].unitCost = e.target.value
                                                    setBomComponents(updated)
                                                }}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>

                                        <div className="col-span-2">
                                            <Label className="text-[10px] text-muted-foreground">Scrap %</Label>
                                            <Input
                                                type="number"
                                                step="any"
                                                value={comp.scrapPercentage}
                                                onChange={(e) => {
                                                    const updated = [...bomComponents]
                                                    updated[idx].scrapPercentage = e.target.value
                                                    setBomComponents(updated)
                                                }}
                                                className="h-8 text-xs font-mono"
                                            />
                                        </div>

                                        <div className="col-span-1 pt-3.5 flex justify-end">
                                            {bomComponents.length > 1 && (
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => {
                                                        setBomComponents(bomComponents.filter((_, i) => i !== idx))
                                                    }}
                                                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Overheads */}
                        <div className="border-t pt-3 space-y-3">
                            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Direct Labor & Machine Overhead (INR per Batch)
                            </h4>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Labor Cost (INR)</Label>
                                    <Input
                                        type="number"
                                        value={bomLaborCost}
                                        onChange={(e) => setBomLaborCost(e.target.value)}
                                        className="text-xs font-mono"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-medium">Overhead / Machine Run Cost (INR)</Label>
                                    <Input
                                        type="number"
                                        value={bomOverheadCost}
                                        onChange={(e) => setBomOverheadCost(e.target.value)}
                                        className="text-xs font-mono"
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsNewBOMModalOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending || !bomProductId}
                                className="bg-orange-600 hover:bg-orange-700 text-white"
                            >
                                Save BOM Recipe
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL 4: RECORD QC INSPECTION --- */}
            <Dialog open={isQCModalOpen} onOpenChange={setIsQCModalOpen}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck className="h-5 w-5 text-emerald-600" />
                            Record Quality Control Inspection
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Validate finished lot compliance, log defect reasons, and record inspector signatures.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleRecordQC} className="space-y-4 py-2 text-xs">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Work Order *</Label>
                            <Select value={qcWorkOrderId} onValueChange={setQcWorkOrderId} required>
                                <SelectTrigger className="text-xs">
                                    <SelectValue placeholder="Select work order..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {initialData.workOrders.map((wo) => (
                                        <SelectItem key={wo.id} value={wo.id}>
                                            {wo.orderNumber} — {wo.productName} ({wo.status})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Inspected Qty *</Label>
                                <Input
                                    type="number"
                                    min="1"
                                    value={qcInspectedQty}
                                    onChange={(e) => setQcInspectedQty(e.target.value)}
                                    required
                                    className="text-xs font-mono"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Passed Qty *</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={qcPassedQty}
                                    onChange={(e) => setQcPassedQty(e.target.value)}
                                    required
                                    className="text-xs font-mono text-emerald-600 font-bold"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Failed Qty</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={qcFailedQty}
                                    onChange={(e) => setQcFailedQty(e.target.value)}
                                    className="text-xs font-mono text-red-600 font-bold"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Defect Classification (If any)</Label>
                            <Input
                                placeholder="e.g. Dimensions out of tolerance, surface finish scratch"
                                value={qcDefectReason}
                                onChange={(e) => setQcDefectReason(e.target.value)}
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Inspector Name *</Label>
                            <Input
                                value={qcInspector}
                                onChange={(e) => setQcInspector(e.target.value)}
                                required
                                className="text-xs"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-medium">Inspection Notes</Label>
                            <Textarea
                                placeholder="Inspection laboratory observations, calibrated instruments used..."
                                value={qcNotes}
                                onChange={(e) => setQcNotes(e.target.value)}
                                className="text-xs h-16 resize-none"
                            />
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsQCModalOpen(false)}
                                disabled={isPending}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending || !qcWorkOrderId}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                            >
                                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Inspection"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* --- MODAL 5: BOM DETAIL VIEW --- */}
            <Dialog open={isBOMDetailOpen} onOpenChange={setIsBOMDetailOpen}>
                <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-orange-600" />
                            {selectedBOM?.bomNumber}: {selectedBOM?.name}
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Component breakdown for {selectedBOM?.quantity} {selectedBOM?.unit} of {selectedBOM?.productName}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2 text-xs">
                        <div className="overflow-x-auto border rounded-lg">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/30 text-xs">
                                        <TableHead>Part Name</TableHead>
                                        <TableHead className="text-center">Required Qty</TableHead>
                                        <TableHead className="text-center">Scrap %</TableHead>
                                        <TableHead className="text-right">Unit Cost</TableHead>
                                        <TableHead className="text-right">Total Cost</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {selectedBOM?.items.map((item) => (
                                        <TableRow key={item.id} className="text-xs">
                                            <TableCell className="font-medium">
                                                {item.productName}
                                                {item.productSku && (
                                                    <span className="text-[10px] text-muted-foreground font-mono block">
                                                        {item.productSku}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-center font-mono">
                                                {item.quantity} {item.unit}
                                            </TableCell>
                                            <TableCell className="text-center font-mono text-muted-foreground">
                                                {item.scrapPercentage}%
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-muted-foreground">
                                                {formatCurrency(item.unitCost)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono font-semibold">
                                                {formatCurrency(item.totalCost)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="p-3 bg-muted/40 rounded-lg border space-y-1.5 font-mono">
                            <div className="flex justify-between text-muted-foreground">
                                <span>Labor Cost:</span>
                                <span>{formatCurrency(selectedBOM?.laborCost || 0)}</span>
                            </div>
                            <div className="flex justify-between text-muted-foreground">
                                <span>Overhead / Machine Run:</span>
                                <span>{formatCurrency(selectedBOM?.overheadCost || 0)}</span>
                            </div>
                            <div className="flex justify-between font-bold text-foreground border-t pt-1.5 text-sm">
                                <span>Estimated Total Batch Cost:</span>
                                <span className="text-orange-600">{formatCurrency(selectedBOM?.estimatedTotalCost || 0)}</span>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                variant="outline"
                                onClick={() => setIsBOMDetailOpen(false)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
