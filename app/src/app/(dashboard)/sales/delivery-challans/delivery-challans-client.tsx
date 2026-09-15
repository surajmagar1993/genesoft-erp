"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Truck,
    Navigation,
    CheckCircle2,
    FileText,
    Plus,
    Search,
    Filter,
    Printer,
    ArrowRight,
    Building2,
    Calendar,
    MapPin,
    DollarSign,
    MoreHorizontal,
    Package,
    Shield,
    Trash2,
    Loader2,
    ExternalLink,
    AlertCircle,
    ArrowUpRight,
    RefreshCw,
    X,
    Check
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format } from "date-fns"
import { toast } from "sonner"
import { formatCurrency } from "@/lib/utils"
import {
    ChallanReason,
    ChallanStatus,
    TransportMode
} from "@prisma/client"
import {
    DeliveryChallansOverviewData,
    DeliveryChallanRecord,
    CreateChallanItemInput,
    createDeliveryChallan,
    updateDeliveryChallanStatus,
    convertChallanToInvoice
} from "@/app/actions/sales/delivery-challan"

interface DeliveryChallansClientProps {
    initialData: DeliveryChallansOverviewData
}

export function DeliveryChallansClient({ initialData }: DeliveryChallansClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    // Filters
    const [searchQuery, setSearchQuery] = useState("")
    const [reasonFilter, setReasonFilter] = useState<string>("all")
    const [statusFilter, setStatusFilter] = useState<string>("all")

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false)
    const [isPrintModalOpen, setIsPrintModalOpen] = useState(false)
    const [isConvertModalOpen, setIsConvertModalOpen] = useState(false)

    // Selected Challan
    const [selectedChallan, setSelectedChallan] = useState<DeliveryChallanRecord | null>(null)
    const [targetStatus, setTargetStatus] = useState<ChallanStatus>(ChallanStatus.IN_TRANSIT)
    const [printCopyType, setPrintCopyType] = useState<"CONSIGNEE" | "TRANSPORTER" | "CONSIGNOR">("CONSIGNEE")

    // Create Form State
    const [contactId, setContactId] = useState("")
    const [recipientName, setRecipientName] = useState("")
    const [recipientEmail, setRecipientEmail] = useState("")
    const [recipientPhone, setRecipientPhone] = useState("")
    const [recipientGstin, setRecipientGstin] = useState("")
    const [sourceWarehouseId, setSourceWarehouseId] = useState("")
    const [selectedSalesOrderId, setSelectedSalesOrderId] = useState("")
    const [reason, setReason] = useState<ChallanReason>(ChallanReason.SUPPLY_ON_APPROVAL)
    const [transportMode, setTransportMode] = useState<TransportMode>(TransportMode.ROAD)
    const [transporterName, setTransporterName] = useState("")
    const [transporterId, setTransporterId] = useState("")
    const [vehicleNumber, setVehicleNumber] = useState("")
    const [lrNumber, setLrNumber] = useState("")
    const [lrDate, setLrDate] = useState("")
    const [placeOfSupply, setPlaceOfSupply] = useState("27-Maharashtra")
    const [dispatchAddressText, setDispatchAddressText] = useState("Main Logistics Hub, Warehouse A, Mumbai, Maharashtra 400001")
    const [deliveryAddressText, setDeliveryAddressText] = useState("")
    const [notes, setNotes] = useState("")
    const [terms, setTerms] = useState("1. Goods are transported under Rule 55 of CGST Rules.\n2. Goods to be returned within 30 days if sent on approval.")

    // Line items for creation
    const [lineItems, setLineItems] = useState<CreateChallanItemInput[]>([
        { productName: "", hsnCode: "", quantity: 1, unit: "PCS", unitPrice: 0, taxRate: 18, description: "" }
    ])

    // Filtered Challans
    const filteredChallans = useMemo(() => {
        return initialData.challans.filter(c => {
            const matchesSearch =
                c.challanNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                c.recipientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.vehicleNumber && c.vehicleNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (c.recipientGstin && c.recipientGstin.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesReason = reasonFilter === "all" || c.reason === reasonFilter
            const matchesStatus = statusFilter === "all" || c.status === statusFilter

            return matchesSearch && matchesReason && matchesStatus
        })
    }, [initialData.challans, searchQuery, reasonFilter, statusFilter])

    // Status styling config
    const statusConfig: Record<ChallanStatus, { label: string; color: string; bg: string }> = {
        DRAFT: { label: "Draft", color: "text-muted-foreground", bg: "bg-muted border-border" },
        ISSUED: { label: "Issued", color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-900" },
        IN_TRANSIT: { label: "In Transit", color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900" },
        DELIVERED: { label: "Delivered", color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900" },
        RETURNED: { label: "Returned", color: "text-indigo-700 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-900" },
        CANCELLED: { label: "Cancelled", color: "text-rose-700 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900" },
        CONVERTED_TO_INVOICE: { label: "Invoiced", color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-950/40 border-purple-200 dark:border-purple-900" }
    }

    const reasonLabels: Record<ChallanReason, string> = {
        JOB_WORK: "Job Work",
        SUPPLY_ON_APPROVAL: "Supply on Approval",
        EXHIBITION_DEMO: "Exhibition / Demo",
        WAREHOUSE_TRANSFER: "Warehouse Transfer",
        LINE_SALE: "Line Sale",
        OTHERS: "Other Purpose"
    }

    // Contact selection helper
    const handleSelectContact = (id: string) => {
        setContactId(id)
        const contact = initialData.contacts.find(c => c.id === id)
        if (contact) {
            setRecipientName(contact.displayName)
            setRecipientEmail(contact.email || "")
            setRecipientPhone(contact.phone || "")
            setRecipientGstin(contact.gstin || "")
            if (contact.shippingAddress && typeof contact.shippingAddress === "object") {
                const addr = contact.shippingAddress as any
                setDeliveryAddressText(`${addr.street || ""}, ${addr.city || ""}, ${addr.state || ""} ${addr.pincode || ""}`.trim())
            }
        }
    }

    // Sales Order helper
    const handleSelectSalesOrder = (soId: string) => {
        setSelectedSalesOrderId(soId)
        const so = initialData.salesOrders.find(s => s.id === soId)
        if (so && so.items && so.items.length > 0) {
            setRecipientName(so.customerName)
            setLineItems(
                so.items.map(it => ({
                    productName: it.productName,
                    quantity: it.qty,
                    unit: "PCS",
                    unitPrice: it.unitPrice,
                    taxRate: it.taxPercent || 18,
                    hsnCode: "8471"
                }))
            )
            toast.info(`Loaded ${so.items.length} item(s) from Sales Order ${so.orderNumber}`)
        }
    }

    // Product line handlers
    const handleAddItemRow = () => {
        setLineItems(prev => [
            ...prev,
            { productName: "", hsnCode: "", quantity: 1, unit: "PCS", unitPrice: 0, taxRate: 18 }
        ])
    }

    const handleRemoveItemRow = (index: number) => {
        if (lineItems.length <= 1) return
        setLineItems(prev => prev.filter((_, i) => i !== index))
    }

    const handleItemChange = (index: number, field: keyof CreateChallanItemInput, val: any) => {
        setLineItems(prev => {
            const updated = [...prev]
            updated[index] = { ...updated[index], [field]: val }
            return updated
        })
    }

    const handleSelectProduct = (index: number, productId: string) => {
        const prod = initialData.products.find(p => p.id === productId)
        if (prod) {
            setLineItems(prev => {
                const updated = [...prev]
                updated[index] = {
                    ...updated[index],
                    productId: prod.id,
                    productName: prod.name,
                    hsnCode: prod.hsnSacCode || "",
                    unit: prod.unit || "PCS",
                    unitPrice: prod.unitPrice || 0
                }
                return updated
            })
        }
    }

    // Computed totals for create modal
    const computedTotals = useMemo(() => {
        let taxable = 0
        let tax = 0
        let qty = 0

        lineItems.forEach(it => {
            const q = Number(it.quantity) || 0
            const r = Number(it.unitPrice) || 0
            const tRate = Number(it.taxRate) || 0
            const lineTaxable = q * r
            const lineTax = lineTaxable * (tRate / 100)

            qty += q
            taxable += lineTaxable
            tax += lineTax
        })

        return {
            totalQuantity: qty,
            taxableAmount: taxable,
            taxAmount: tax,
            totalValue: taxable + tax
        }
    }, [lineItems])

    // Handlers
    const handleCreateChallan = () => {
        if (!recipientName.trim()) {
            toast.error("Recipient name is required.")
            return
        }
        if (lineItems.some(it => !it.productName.trim() || it.quantity <= 0)) {
            toast.error("All item lines must have a valid name and quantity.")
            return
        }

        startTransition(async () => {
            try {
                const res = await createDeliveryChallan({
                    contactId: contactId || undefined,
                    recipientName,
                    recipientEmail: recipientEmail || undefined,
                    recipientPhone: recipientPhone || undefined,
                    recipientGstin: recipientGstin || undefined,
                    dispatchAddress: { address: dispatchAddressText },
                    deliveryAddress: { address: deliveryAddressText },
                    placeOfSupply,
                    reason,
                    transportMode,
                    transporterName: transporterName || undefined,
                    transporterId: transporterId || undefined,
                    vehicleNumber: vehicleNumber || undefined,
                    lrNumber: lrNumber || undefined,
                    lrDate: lrDate || undefined,
                    sourceWarehouseId: sourceWarehouseId || undefined,
                    salesOrderId: selectedSalesOrderId || undefined,
                    notes: notes || undefined,
                    terms: terms || undefined,
                    items: lineItems
                })

                toast.success(`Delivery Challan ${res.challan.challanNumber} issued successfully!`)
                setIsCreateModalOpen(false)
                resetCreateForm()
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to create delivery challan.")
            }
        })
    }

    const resetCreateForm = () => {
        setContactId("")
        setRecipientName("")
        setRecipientEmail("")
        setRecipientPhone("")
        setRecipientGstin("")
        setSourceWarehouseId("")
        setSelectedSalesOrderId("")
        setReason(ChallanReason.SUPPLY_ON_APPROVAL)
        setTransportMode(TransportMode.ROAD)
        setTransporterName("")
        setTransporterId("")
        setVehicleNumber("")
        setLrNumber("")
        setLrDate("")
        setDeliveryAddressText("")
        setLineItems([{ productName: "", hsnCode: "", quantity: 1, unit: "PCS", unitPrice: 0, taxRate: 18 }])
    }

    const handleUpdateStatus = () => {
        if (!selectedChallan) return

        startTransition(async () => {
            try {
                await updateDeliveryChallanStatus(selectedChallan.id, targetStatus)
                toast.success(`Challan status updated to ${statusConfig[targetStatus].label}.`)
                setIsStatusModalOpen(false)
                router.refresh()
            } catch (err: any) {
                toast.error(err.message || "Failed to update challan status.")
            }
        })
    }

    const handleConvertToInvoice = () => {
        if (!selectedChallan) return

        startTransition(async () => {
            try {
                const res = await convertChallanToInvoice(selectedChallan.id)
                toast.success(`Converted to Tax Invoice ${res.invoice.invoiceNumber}!`)
                setIsConvertModalOpen(false)
                router.refresh()
                router.push(`/sales/invoices/${res.invoice.id}`)
            } catch (err: any) {
                toast.error(err.message || "Failed to convert challan to invoice.")
            }
        })
    }

    const openPrintModal = (challan: DeliveryChallanRecord) => {
        setSelectedChallan(challan)
        setPrintCopyType("CONSIGNEE")
        setIsPrintModalOpen(true)
    }

    const openStatusModal = (challan: DeliveryChallanRecord, defaultNext: ChallanStatus) => {
        setSelectedChallan(challan)
        setTargetStatus(defaultNext)
        setIsStatusModalOpen(true)
    }

    const openConvertModal = (challan: DeliveryChallanRecord) => {
        setSelectedChallan(challan)
        setIsConvertModalOpen(true)
    }

    return (
        <div className="space-y-6">
            {/* Header & Main Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <Truck className="h-7 w-7 text-primary" />
                        Delivery Challan Engine (Rule 55)
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        Legally compliant goods transport for job work, supply on approval, warehouse transfers, and staged dispatches with 1-click Tax Invoice conversion.
                    </p>
                </div>
                <Button
                    onClick={() => setIsCreateModalOpen(true)}
                    className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow"
                >
                    <Plus className="h-4 w-4" />
                    Issue Delivery Challan
                </Button>
            </div>

            {/* Telemetry KPI Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Total Challans
                        </CardTitle>
                        <FileText className="h-4 w-4 text-blue-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-foreground">
                            {initialData.stats.totalChallansCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Dispatches on record
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            In Transit
                        </CardTitle>
                        <Navigation className="h-4 w-4 text-amber-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-amber-600">
                            {initialData.stats.inTransitCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Consignments on the road
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Delivered
                        </CardTitle>
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-emerald-600">
                            {initialData.stats.deliveredCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Received by consignee
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                            Total Dispatched
                        </CardTitle>
                        <DollarSign className="h-4 w-4 text-purple-600" />
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                        <div className="text-2xl font-bold text-foreground">
                            {formatCurrency(initialData.stats.totalDispatchedValue)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <span className="font-semibold text-purple-600">{initialData.stats.convertedCount}</span> invoiced
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-3 rounded-lg border shadow-sm">
                <div className="relative w-full sm:w-80">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search challan, recipient, vehicle..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9 bg-background h-9 text-sm"
                    />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                    <Select value={reasonFilter} onValueChange={setReasonFilter}>
                        <SelectTrigger className="h-9 text-xs w-[170px] bg-background">
                            <SelectValue placeholder="All Reasons" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Purposes</SelectItem>
                            <SelectItem value="JOB_WORK">Job Work</SelectItem>
                            <SelectItem value="SUPPLY_ON_APPROVAL">Supply on Approval</SelectItem>
                            <SelectItem value="EXHIBITION_DEMO">Exhibition / Demo</SelectItem>
                            <SelectItem value="WAREHOUSE_TRANSFER">Warehouse Transfer</SelectItem>
                            <SelectItem value="LINE_SALE">Line Sale</SelectItem>
                            <SelectItem value="OTHERS">Others</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-9 text-xs w-[140px] bg-background">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="ISSUED">Issued</SelectItem>
                            <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                            <SelectItem value="DELIVERED">Delivered</SelectItem>
                            <SelectItem value="CONVERTED_TO_INVOICE">Invoiced</SelectItem>
                            <SelectItem value="RETURNED">Returned</SelectItem>
                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Delivery Challans Table */}
            <Card className="shadow-sm">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[130px]">Challan No</TableHead>
                                <TableHead>Date & Purpose</TableHead>
                                <TableHead>Consignee / Recipient</TableHead>
                                <TableHead>Vehicle & Transporter</TableHead>
                                <TableHead>Source Depot</TableHead>
                                <TableHead>Value (INR)</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredChallans.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                        No delivery challans found matching your filters.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredChallans.map(challan => (
                                    <TableRow key={challan.id}>
                                        <TableCell>
                                            <div className="font-mono text-xs font-bold text-foreground">
                                                {challan.challanNumber}
                                            </div>
                                            {challan.convertedInvoiceNumber && (
                                                <div className="text-[10px] text-purple-600 font-mono mt-0.5">
                                                    ➔ {challan.convertedInvoiceNumber}
                                                </div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs font-medium text-foreground">
                                                {format(new Date(challan.challanDate), "dd MMM yyyy")}
                                            </div>
                                            <Badge variant="secondary" className="text-[10px] h-4.5 px-1 font-normal mt-0.5">
                                                {reasonLabels[challan.reason]}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-xs text-foreground">{challan.recipientName}</div>
                                            <div className="text-[11px] text-muted-foreground font-mono">
                                                {challan.recipientGstin || "Unregistered"}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs font-mono font-medium text-foreground">
                                                {challan.vehicleNumber || "No vehicle logged"}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                                <span>{challan.transportMode}</span>
                                                {challan.transporterName && <span>• {challan.transporterName}</span>}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-xs text-foreground">
                                                {challan.sourceWarehouseName || "Primary Hub"}
                                            </div>
                                            <div className="text-[11px] text-muted-foreground">
                                                {challan.itemsCount} item{challan.itemsCount !== 1 ? "s" : ""}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="font-medium text-xs text-foreground font-mono">
                                                {formatCurrency(challan.totalValue)}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground">
                                                Taxable: {formatCurrency(challan.taxableAmount)}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant="outline"
                                                className={`text-xs font-medium ${statusConfig[challan.status].bg} ${statusConfig[challan.status].color}`}
                                            >
                                                {statusConfig[challan.status].label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => openPrintModal(challan)}
                                                    className="h-8 text-xs gap-1"
                                                >
                                                    <Printer className="h-3.5 w-3.5" />
                                                    Print
                                                </Button>

                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="text-xs w-48">
                                                        <DropdownMenuLabel>Challan Actions</DropdownMenuLabel>
                                                        {challan.status === "ISSUED" && (
                                                            <DropdownMenuItem onClick={() => openStatusModal(challan, ChallanStatus.IN_TRANSIT)}>
                                                                Mark In Transit
                                                            </DropdownMenuItem>
                                                        )}
                                                        {challan.status === "IN_TRANSIT" && (
                                                            <DropdownMenuItem onClick={() => openStatusModal(challan, ChallanStatus.DELIVERED)}>
                                                                Mark Delivered
                                                            </DropdownMenuItem>
                                                        )}
                                                        {challan.status !== "DELIVERED" && challan.status !== "CONVERTED_TO_INVOICE" && (
                                                            <DropdownMenuItem onClick={() => openStatusModal(challan, ChallanStatus.RETURNED)}>
                                                                Record Goods Return
                                                            </DropdownMenuItem>
                                                        )}
                                                        <DropdownMenuSeparator />
                                                        {challan.status !== "CONVERTED_TO_INVOICE" && challan.contactId && (
                                                            <DropdownMenuItem
                                                                onClick={() => openConvertModal(challan)}
                                                                className="text-purple-600 font-semibold"
                                                            >
                                                                Convert to Tax Invoice
                                                            </DropdownMenuItem>
                                                        )}
                                                        {challan.status !== "CANCELLED" && challan.status !== "CONVERTED_TO_INVOICE" && (
                                                            <DropdownMenuItem
                                                                onClick={() => openStatusModal(challan, ChallanStatus.CANCELLED)}
                                                                className="text-rose-600"
                                                            >
                                                                Cancel Challan
                                                            </DropdownMenuItem>
                                                        )}
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>

            {/* MODAL 1: CREATE DELIVERY CHALLAN */}
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
                <DialogContent className="sm:max-w-4xl max-h-[92vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary" />
                            Issue Delivery Challan (CGST Rule 55)
                        </DialogTitle>
                        <DialogDescription>
                            Create a legally compliant goods dispatch challan with transport details, HSN codes, and purpose documentation.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Section A: Party & Purpose */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-muted/30 rounded-lg border">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Consignee Contact (Optional)</Label>
                                <Select value={contactId} onValueChange={handleSelectContact}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Pick saved contact" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.contacts.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Recipient / Consignee Name *</Label>
                                <Input
                                    placeholder="Recipient company or individual"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Recipient GSTIN (If any)</Label>
                                <Input
                                    placeholder="27ABCDE1234F1Z5"
                                    value={recipientGstin}
                                    onChange={(e) => setRecipientGstin(e.target.value.toUpperCase())}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Transportation Purpose (Rule 55) *</Label>
                                <Select value={reason} onValueChange={(v) => setReason(v as ChallanReason)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={ChallanReason.SUPPLY_ON_APPROVAL}>Supply on Approval</SelectItem>
                                        <SelectItem value={ChallanReason.JOB_WORK}>Job Work</SelectItem>
                                        <SelectItem value={ChallanReason.EXHIBITION_DEMO}>Exhibition / Demonstration</SelectItem>
                                        <SelectItem value={ChallanReason.WAREHOUSE_TRANSFER}>Warehouse / Branch Transfer</SelectItem>
                                        <SelectItem value={ChallanReason.LINE_SALE}>Line Sale</SelectItem>
                                        <SelectItem value={ChallanReason.OTHERS}>Other Purpose</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Source Warehouse</Label>
                                <Select value={sourceWarehouseId} onValueChange={setSourceWarehouseId}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Default Depot" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.warehouses.map(w => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name} ({w.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Copy from Confirmed Sales Order</Label>
                                <Select value={selectedSalesOrderId} onValueChange={handleSelectSalesOrder}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue placeholder="Select Sales Order" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.salesOrders.map(so => (
                                            <SelectItem key={so.id} value={so.id}>
                                                {so.orderNumber}: {so.customerName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Section B: Transport & Vehicle Details */}
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 p-3 bg-muted/20 rounded-lg border">
                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Transport Mode</Label>
                                <Select value={transportMode} onValueChange={(v) => setTransportMode(v as TransportMode)}>
                                    <SelectTrigger className="h-9 text-xs">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={TransportMode.ROAD}>Road (Truck/Tempo)</SelectItem>
                                        <SelectItem value={TransportMode.RAIL}>Rail Freight</SelectItem>
                                        <SelectItem value={TransportMode.AIR}>Air Cargo</SelectItem>
                                        <SelectItem value={TransportMode.SHIP}>Ship / Marine</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Vehicle Number</Label>
                                <Input
                                    placeholder="MH-12-AB-1234"
                                    value={vehicleNumber}
                                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                                    className="h-9 text-xs font-mono font-medium"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">Transporter Name</Label>
                                <Input
                                    placeholder="e.g. Blue Dart / V-Trans"
                                    value={transporterName}
                                    onChange={(e) => setTransporterName(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs font-semibold">LR / Consignment No</Label>
                                <Input
                                    placeholder="LR-987654"
                                    value={lrNumber}
                                    onChange={(e) => setLrNumber(e.target.value)}
                                    className="h-9 text-xs font-mono"
                                />
                            </div>

                            <div className="sm:col-span-2 space-y-1">
                                <Label className="text-xs font-semibold">Dispatch Address (Ship-From)</Label>
                                <Input
                                    value={dispatchAddressText}
                                    onChange={(e) => setDispatchAddressText(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>

                            <div className="sm:col-span-2 space-y-1">
                                <Label className="text-xs font-semibold">Delivery Address (Ship-To) *</Label>
                                <Input
                                    placeholder="Complete consignee delivery destination"
                                    value={deliveryAddressText}
                                    onChange={(e) => setDeliveryAddressText(e.target.value)}
                                    className="h-9 text-xs"
                                />
                            </div>
                        </div>

                        {/* Section C: Line Items */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                    Dispatched Goods & Materials
                                </Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddItemRow}
                                    className="h-7 text-xs gap-1"
                                >
                                    <Plus className="h-3.5 w-3.5" />
                                    Add Item
                                </Button>
                            </div>

                            <div className="border rounded-lg overflow-x-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40 text-[11px]">
                                            <TableHead className="w-[280px]">Product / Item</TableHead>
                                            <TableHead className="w-[100px]">HSN/SAC</TableHead>
                                            <TableHead className="w-[90px]">Qty</TableHead>
                                            <TableHead className="w-[80px]">Unit</TableHead>
                                            <TableHead className="w-[120px]">Unit Price (INR)</TableHead>
                                            <TableHead className="w-[90px]">GST Rate %</TableHead>
                                            <TableHead className="w-[120px] text-right">Total (INR)</TableHead>
                                            <TableHead className="w-[50px]"></TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {lineItems.map((item, index) => {
                                            const lineTotal = (item.quantity * item.unitPrice) * (1 + (item.taxRate / 100))
                                            return (
                                                <TableRow key={index} className="text-xs">
                                                    <TableCell>
                                                        <div className="space-y-1">
                                                            <Select onValueChange={(pId) => handleSelectProduct(index, pId)}>
                                                                <SelectTrigger className="h-7 text-[11px]">
                                                                    <SelectValue placeholder="Pick from catalog..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {initialData.products.map(p => (
                                                                        <SelectItem key={p.id} value={p.id}>
                                                                            {p.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                            <Input
                                                                placeholder="Item name / description"
                                                                value={item.productName}
                                                                onChange={(e) => handleItemChange(index, "productName", e.target.value)}
                                                                className="h-7 text-xs"
                                                            />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            placeholder="8471"
                                                            value={item.hsnCode || ""}
                                                            onChange={(e) => handleItemChange(index, "hsnCode", e.target.value)}
                                                            className="h-7 text-xs font-mono"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            min={1}
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(index, "quantity", Number(e.target.value))}
                                                            className="h-7 text-xs"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            value={item.unit || "PCS"}
                                                            onChange={(e) => handleItemChange(index, "unit", e.target.value)}
                                                            className="h-7 text-xs"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Input
                                                            type="number"
                                                            value={item.unitPrice}
                                                            onChange={(e) => handleItemChange(index, "unitPrice", Number(e.target.value))}
                                                            className="h-7 text-xs font-mono"
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Select
                                                            value={String(item.taxRate)}
                                                            onValueChange={(v) => handleItemChange(index, "taxRate", Number(v))}
                                                        >
                                                            <SelectTrigger className="h-7 text-xs">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="0">0%</SelectItem>
                                                                <SelectItem value="5">5%</SelectItem>
                                                                <SelectItem value="12">12%</SelectItem>
                                                                <SelectItem value="18">18%</SelectItem>
                                                                <SelectItem value="28">28%</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono font-medium">
                                                        {formatCurrency(lineTotal)}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemoveItemRow(index)}
                                                            disabled={lineItems.length <= 1}
                                                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            )
                                        })}
                                    </TableBody>
                                </Table>
                            </div>

                            {/* Totals Summary */}
                            <div className="flex justify-end p-3 bg-muted/30 rounded-lg border">
                                <div className="w-64 space-y-1 text-xs">
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Total Dispatched Qty:</span>
                                        <span className="font-semibold text-foreground">{computedTotals.totalQuantity}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Taxable Consignment Value:</span>
                                        <span className="font-semibold text-foreground">{formatCurrency(computedTotals.taxableAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                        <span>Estimated GST (Rule 55):</span>
                                        <span className="font-semibold text-foreground">{formatCurrency(computedTotals.taxAmount)}</span>
                                    </div>
                                    <div className="flex justify-between pt-1 border-t font-bold text-sm text-foreground">
                                        <span>Total Declared Value:</span>
                                        <span className="font-mono text-primary">{formatCurrency(computedTotals.totalValue)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateChallan} disabled={isPending} className="gap-2">
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Issue Delivery Challan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 2: UPDATE STATUS */}
            <Dialog open={isStatusModalOpen} onOpenChange={setIsStatusModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Navigation className="h-5 w-5 text-primary" />
                            Update Dispatch Status
                        </DialogTitle>
                        <DialogDescription>
                            Advance {selectedChallan?.challanNumber} through dispatch and delivery checkpoints.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-3">
                        <div className="space-y-1">
                            <Label className="text-xs font-semibold">Select New Status</Label>
                            <Select value={targetStatus} onValueChange={(v) => setTargetStatus(v as ChallanStatus)}>
                                <SelectTrigger className="h-9 text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ChallanStatus.ISSUED}>Issued (At Warehouse)</SelectItem>
                                    <SelectItem value={ChallanStatus.IN_TRANSIT}>In Transit (On the road)</SelectItem>
                                    <SelectItem value={ChallanStatus.DELIVERED}>Delivered (Consignee Received)</SelectItem>
                                    <SelectItem value={ChallanStatus.RETURNED}>Returned (Goods Received Back)</SelectItem>
                                    <SelectItem value={ChallanStatus.CANCELLED}>Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsStatusModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdateStatus} disabled={isPending} className="gap-2">
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Update Status
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 3: 1-CLICK CONVERT TO INVOICE */}
            <Dialog open={isConvertModalOpen} onOpenChange={setIsConvertModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-purple-700 dark:text-purple-400">
                            <FileText className="h-5 w-5" />
                            Convert Challan to Tax Invoice
                        </DialogTitle>
                        <DialogDescription>
                            Generate an official Indian GST Tax Invoice directly from this delivery challan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2 text-xs">
                        <div className="p-3 bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 rounded-lg space-y-1">
                            <div className="font-semibold text-purple-900 dark:text-purple-300">
                                Delivery Challan: {selectedChallan?.challanNumber}
                            </div>
                            <div className="text-purple-700 dark:text-purple-400">
                                Recipient: {selectedChallan?.recipientName}
                            </div>
                            <div className="font-mono text-purple-800 dark:text-purple-300 font-bold">
                                Invoice Amount: {selectedChallan ? formatCurrency(selectedChallan.totalValue) : ""}
                            </div>
                        </div>

                        <p className="text-muted-foreground">
                            This will create an active Tax Invoice with all {selectedChallan?.itemsCount} line items, HSN numbers, and GST rates, and update this challan status to Invoiced.
                        </p>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsConvertModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleConvertToInvoice}
                            disabled={isPending}
                            className="gap-2 bg-purple-600 hover:bg-purple-700 text-white font-semibold"
                        >
                            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                            Generate Tax Invoice
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL 4: 2-COPY PRINTABLE DELIVERY CHALLAN SLIP */}
            <Dialog open={isPrintModalOpen} onOpenChange={setIsPrintModalOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[95vh] overflow-y-auto print:p-0 print:max-w-none">
                    <DialogHeader className="print:hidden">
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <Printer className="h-5 w-5 text-primary" />
                                Form Delivery Challan (Rule 55)
                            </DialogTitle>
                            <div className="flex items-center gap-2">
                                <Select value={printCopyType} onValueChange={(v) => setPrintCopyType(v as any)}>
                                    <SelectTrigger className="h-8 text-xs w-48">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="CONSIGNEE">Original for Consignee</SelectItem>
                                        <SelectItem value="TRANSPORTER">Duplicate for Transporter</SelectItem>
                                        <SelectItem value="CONSIGNOR">Triplicate for Consignor</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button size="sm" onClick={() => window.print()} className="gap-1.5 h-8">
                                    <Printer className="h-3.5 w-3.5" />
                                    Print
                                </Button>
                            </div>
                        </div>
                    </DialogHeader>

                    {/* PRINTABLE SLIP CONTENT */}
                    {selectedChallan && (
                        <div className="p-6 bg-white text-black border rounded-lg shadow-sm print:border-0 print:shadow-none space-y-4 font-sans text-xs">
                            {/* Header Banner */}
                            <div className="border-b pb-4 text-center relative">
                                <div className="absolute right-0 top-0 border px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-gray-50">
                                    {printCopyType === "CONSIGNEE" ? "Original for Consignee" : printCopyType === "TRANSPORTER" ? "Duplicate for Transporter" : "Triplicate for Consignor"}
                                </div>
                                <h2 className="text-lg font-extrabold uppercase tracking-wide">
                                    DELIVERY CHALLAN
                                </h2>
                                <p className="text-[10px] text-gray-600">
                                    (Issued under Rule 55 of the Central Goods and Services Tax Rules, 2017)
                                </p>
                            </div>

                            {/* Metadata Grid */}
                            <div className="grid grid-cols-2 gap-4 border p-3 rounded text-[11px]">
                                <div>
                                    <span className="font-bold text-gray-500 uppercase text-[9px] block">Challan Details:</span>
                                    <div><strong>Challan No:</strong> <span className="font-mono font-bold">{selectedChallan.challanNumber}</span></div>
                                    <div><strong>Challan Date:</strong> {format(new Date(selectedChallan.challanDate), "dd/MM/yyyy")}</div>
                                    <div><strong>Purpose of Transport:</strong> <span className="font-semibold text-primary">{reasonLabels[selectedChallan.reason]}</span></div>
                                    <div><strong>Place of Supply:</strong> {selectedChallan.placeOfSupply || "State-wide"}</div>
                                </div>
                                <div>
                                    <span className="font-bold text-gray-500 uppercase text-[9px] block">Transport Details:</span>
                                    <div><strong>Mode:</strong> {selectedChallan.transportMode}</div>
                                    <div><strong>Vehicle Number:</strong> <span className="font-mono font-bold">{selectedChallan.vehicleNumber || "N/A"}</span></div>
                                    <div><strong>Transporter:</strong> {selectedChallan.transporterName || "Direct / Self"}</div>
                                    <div><strong>LR / GR No:</strong> {selectedChallan.lrNumber || "N/A"}</div>
                                </div>
                            </div>

                            {/* Addresses Grid */}
                            <div className="grid grid-cols-2 gap-4 border p-3 rounded text-[11px]">
                                <div>
                                    <span className="font-bold text-gray-500 uppercase text-[9px] block">Dispatch From (Consignor):</span>
                                    <div className="font-bold text-sm">GENESOFT ENTERPRISE TECHNOLOGIES</div>
                                    <div className="text-gray-600 mt-0.5">{selectedChallan.dispatchAddress?.address || "Main Logistics Depot, Mumbai"}</div>
                                    <div className="mt-1"><strong>GSTIN:</strong> 27AABCG1234F1Z9</div>
                                </div>
                                <div>
                                    <span className="font-bold text-gray-500 uppercase text-[9px] block">Deliver To (Consignee):</span>
                                    <div className="font-bold text-sm">{selectedChallan.recipientName}</div>
                                    <div className="text-gray-600 mt-0.5">{selectedChallan.deliveryAddress?.address || "Destination Address"}</div>
                                    <div className="mt-1"><strong>GSTIN:</strong> {selectedChallan.recipientGstin || "Unregistered / Consumer"}</div>
                                    {selectedChallan.recipientPhone && <div><strong>Phone:</strong> {selectedChallan.recipientPhone}</div>}
                                </div>
                            </div>

                            {/* Goods Table */}
                            <div className="border rounded overflow-hidden">
                                <table className="w-full text-left border-collapse text-[11px]">
                                    <thead>
                                        <tr className="bg-gray-100 border-b">
                                            <th className="p-2 border-r w-8 text-center">#</th>
                                            <th className="p-2 border-r">Description of Goods</th>
                                            <th className="p-2 border-r w-20">HSN/SAC</th>
                                            <th className="p-2 border-r w-16 text-right">Qty</th>
                                            <th className="p-2 border-r w-16">Unit</th>
                                            <th className="p-2 border-r w-24 text-right">Rate</th>
                                            <th className="p-2 border-r w-24 text-right">Taxable Val</th>
                                            <th className="p-2 border-r w-14 text-right">GST %</th>
                                            <th className="p-2 text-right w-24">Total Value</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedChallan.items.map((item, idx) => (
                                            <tr key={item.id} className="border-b">
                                                <td className="p-2 border-r text-center">{idx + 1}</td>
                                                <td className="p-2 border-r font-medium">{item.productName}</td>
                                                <td className="p-2 border-r font-mono">{item.hsnCode || "-"}</td>
                                                <td className="p-2 border-r text-right font-semibold">{item.quantity}</td>
                                                <td className="p-2 border-r">{item.unit}</td>
                                                <td className="p-2 border-r text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                                                <td className="p-2 border-r text-right font-mono">{formatCurrency(item.taxableAmount)}</td>
                                                <td className="p-2 border-r text-right">{item.taxRate}%</td>
                                                <td className="p-2 text-right font-mono font-bold">{formatCurrency(item.totalAmount)}</td>
                                            </tr>
                                        ))}
                                        <tr className="bg-gray-50 font-bold border-t">
                                            <td colSpan={3} className="p-2 text-right border-r">TOTAL:</td>
                                            <td className="p-2 text-right border-r font-mono">{selectedChallan.totalQuantity}</td>
                                            <td className="p-2 border-r"></td>
                                            <td className="p-2 border-r"></td>
                                            <td className="p-2 text-right border-r font-mono">{formatCurrency(selectedChallan.taxableAmount)}</td>
                                            <td className="p-2 border-r"></td>
                                            <td className="p-2 text-right font-mono">{formatCurrency(selectedChallan.totalValue)}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            {/* Statutory Rule 55 Declaration */}
                            <div className="border p-2.5 rounded bg-gray-50 text-[10px] space-y-1">
                                <span className="font-bold uppercase text-gray-700 block">Statutory Rule 55 Declaration:</span>
                                <p className="text-gray-600">
                                    Certified that the particulars given above are true and correct. The goods described above are being transported for the purpose of <strong>{reasonLabels[selectedChallan.reason]}</strong> in accordance with the provisions of Rule 55 of the CGST Rules, 2017 and not as an outright sale at the time of removal.
                                </p>
                            </div>

                            {/* Signatures */}
                            <div className="grid grid-cols-2 gap-8 pt-8 text-[11px]">
                                <div className="border-t pt-2 text-center">
                                    <p className="font-bold">Receiver's / Consignee's Signature</p>
                                    <p className="text-[10px] text-gray-500">(Received goods in good condition)</p>
                                </div>
                                <div className="border-t pt-2 text-center">
                                    <p className="font-bold">For GENESOFT ENTERPRISE TECHNOLOGIES</p>
                                    <p className="text-[10px] text-gray-500">Authorized Signatory</p>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="print:hidden">
                        <Button variant="outline" onClick={() => setIsPrintModalOpen(false)}>
                            Close
                        </Button>
                        <Button onClick={() => window.print()} className="gap-1.5">
                            <Printer className="h-4 w-4" />
                            Print Delivery Challan
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
