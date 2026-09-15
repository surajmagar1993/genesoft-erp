"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    ShoppingCart,
    Truck,
    Package,
    Building2,
    DollarSign,
    CheckCircle2,
    Clock,
    AlertCircle,
    XCircle,
    Plus,
    Search,
    RefreshCw,
    Filter,
    Boxes,
    FileText,
    Receipt,
    Calendar,
    Eye,
    Send,
    Check,
    Ban,
    ArrowUpRight,
    Loader2,
    Phone,
    Mail,
    MapPin,
    Trash2,
    ExternalLink,
    AlertTriangle,
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
import {
    PurchaseOverviewData,
    PurchaseOrderRecord,
    PurchaseOrderItemRecord,
    VendorItem,
    createPurchaseOrder,
    createVendor,
    updatePurchaseOrderStatus,
    receiveGoods,
    convertPOToBill,
    PurchaseOrderItemInput,
} from "@/app/actions/purchase"
import { formatCurrency } from "@/lib/utils"
import { PurchaseOrderStatus } from "@prisma/client"

interface PurchaseClientProps {
    initialData: PurchaseOverviewData
}

interface NewPOItemState {
    id: string
    productId: string
    description: string
    hsnSacCode: string
    quantity: string
    unitPrice: string
    taxPercent: string
}

export function PurchaseClient({ initialData }: PurchaseClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [activeTab, setActiveTab] = useState<"orders" | "vendors" | "receipts">("orders")

    // Filter states
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [vendorSearchQuery, setVendorSearchQuery] = useState("")

    // Modals
    const [isCreatePOOpen, setIsCreatePOOpen] = useState(false)
    const [isCreateVendorOpen, setIsCreateVendorOpen] = useState(false)
    const [isReceiveOpen, setIsReceiveOpen] = useState(false)
    const [isConvertBillOpen, setIsConvertBillOpen] = useState(false)
    const [isViewDetailsOpen, setIsViewDetailsOpen] = useState(false)

    // Selected items for dialogs
    const [selectedPO, setSelectedPO] = useState<PurchaseOrderRecord | null>(null)

    // Form state: Create Vendor
    const [vendorDisplayName, setVendorDisplayName] = useState("")
    const [vendorCompanyName, setVendorCompanyName] = useState("")
    const [vendorEmail, setVendorEmail] = useState("")
    const [vendorPhone, setVendorPhone] = useState("")
    const [vendorGstin, setVendorGstin] = useState("")
    const [vendorCity, setVendorCity] = useState("")
    const [vendorState, setVendorState] = useState("")
    const [vendorCountryCode, setVendorCountryCode] = useState("IN")
    const [isSubmittingVendor, setIsSubmittingVendor] = useState(false)

    // Form state: Create Purchase Order
    const [poVendorId, setPoVendorId] = useState("")
    const [poWarehouseId, setPoWarehouseId] = useState("")
    const [poDeliveryDate, setPoDeliveryDate] = useState("")
    const [poNotes, setPoNotes] = useState("")
    const [poTerms, setPoTerms] = useState("")
    const [poItems, setPoItems] = useState<NewPOItemState[]>([
        {
            id: "item-1",
            productId: "",
            description: "",
            hsnSacCode: "",
            quantity: "1",
            unitPrice: "0",
            taxPercent: "18",
        },
    ])
    const [isSubmittingPO, setIsSubmittingPO] = useState(false)

    // Form state: Receive Goods
    const [receiveWarehouseId, setReceiveWarehouseId] = useState("")
    const [receiveQuantities, setReceiveQuantities] = useState<Record<string, string>>({})
    const [receiveNotes, setReceiveNotes] = useState("")
    const [isSubmittingReceive, setIsSubmittingReceive] = useState(false)

    // Form state: Convert to Bill
    const [billDueDate, setBillDueDate] = useState("")
    const [billNumberInput, setBillNumberInput] = useState("")
    const [isSubmittingBill, setIsSubmittingBill] = useState(false)

    // Status action pending
    const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null)

    // Filtered Purchase Orders
    const filteredOrders = useMemo(() => {
        return initialData.orders.filter((order) => {
            const matchesSearch =
                order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                order.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (order.warehouseName?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                (order.billNumber?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
                order.items.some((item) =>
                    item.description.toLowerCase().includes(searchQuery.toLowerCase())
                )

            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "BILLED" ? Boolean(order.billNumber) : order.status === statusFilter)

            return matchesSearch && matchesStatus
        })
    }, [initialData.orders, searchQuery, statusFilter])

    // Filtered Vendors
    const filteredVendors = useMemo(() => {
        return initialData.vendors.filter((v) => {
            const query = vendorSearchQuery.toLowerCase()
            return (
                v.displayName.toLowerCase().includes(query) ||
                (v.companyName?.toLowerCase() || "").includes(query) ||
                (v.email?.toLowerCase() || "").includes(query) ||
                (v.phone?.toLowerCase() || "").includes(query) ||
                (v.gstin?.toLowerCase() || "").includes(query) ||
                (v.city?.toLowerCase() || "").includes(query)
            )
        })
    }, [initialData.vendors, vendorSearchQuery])

    // Pending Receipts Queue (Orders in APPROVED or PARTIALLY_RECEIVED)
    const pendingReceiptOrders = useMemo(() => {
        return initialData.orders.filter(
            (o) => o.status === "APPROVED" || o.status === "PARTIALLY_RECEIVED"
        )
    }, [initialData.orders])

    // Total pending receipt items count
    const pendingReceiptsTotalItems = useMemo(() => {
        return pendingReceiptOrders.reduce((sum, order) => {
            const remainingInOrder = order.items.reduce((itemSum, item) => {
                return itemSum + Math.max(0, item.quantity - item.receivedQty)
            }, 0)
            return sum + remainingInOrder
        }, 0)
    }, [pendingReceiptOrders])

    // Calculation for Create PO Modal
    const poCalculations = useMemo(() => {
        let subtotal = 0
        let totalTax = 0

        poItems.forEach((item) => {
            const qty = parseFloat(item.quantity) || 0
            const price = parseFloat(item.unitPrice) || 0
            const taxPct = parseFloat(item.taxPercent) || 0

            const lineBase = qty * price
            const lineTax = lineBase * (taxPct / 100)

            subtotal += lineBase
            totalTax += lineTax
        })

        return {
            subtotal,
            totalTax,
            grandTotal: subtotal + totalTax,
        }
    }, [poItems])

    // Reset Create PO Form
    const resetCreatePOForm = () => {
        setPoVendorId("")
        setPoWarehouseId(initialData.warehouses[0]?.id || "")
        setPoDeliveryDate("")
        setPoNotes("")
        setPoTerms("")
        setPoItems([
            {
                id: `item-${Date.now()}`,
                productId: "",
                description: "",
                hsnSacCode: "",
                quantity: "1",
                unitPrice: "0",
                taxPercent: "18",
            },
        ])
    }

    // Handlers for PO Line Items
    const handleAddLineItem = () => {
        setPoItems((prev) => [
            ...prev,
            {
                id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
                productId: "",
                description: "",
                hsnSacCode: "",
                quantity: "1",
                unitPrice: "0",
                taxPercent: "18",
            },
        ])
    }

    const handleRemoveLineItem = (id: string) => {
        if (poItems.length <= 1) {
            toast.error("Purchase order must contain at least one item")
            return
        }
        setPoItems((prev) => prev.filter((item) => item.id !== id))
    }

    const handleProductSelect = (index: number, productId: string) => {
        const product = initialData.products.find((p) => p.id === productId)
        setPoItems((prev) => {
            const next = [...prev]
            if (product) {
                next[index] = {
                    ...next[index],
                    productId: product.id,
                    description: product.name,
                    unitPrice: String(product.unitPrice || 0),
                    hsnSacCode: product.hsnSacCode || "",
                }
            } else {
                next[index] = {
                    ...next[index],
                    productId: "",
                }
            }
            return next
        })
    }

    const handleItemChange = (index: number, field: keyof NewPOItemState, value: string) => {
        setPoItems((prev) => {
            const next = [...prev]
            next[index] = {
                ...next[index],
                [field]: value,
            }
            return next
        })
    }

    // Submit Create Vendor
    const handleCreateVendorSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!vendorDisplayName.trim()) {
            toast.error("Supplier contact person or display name is required")
            return
        }

        setIsSubmittingVendor(true)
        try {
            const res = await createVendor({
                displayName: vendorDisplayName.trim(),
                companyName: vendorCompanyName.trim() || undefined,
                email: vendorEmail.trim() || undefined,
                phone: vendorPhone.trim() || undefined,
                gstin: vendorGstin.trim() || undefined,
                city: vendorCity.trim() || undefined,
                state: vendorState.trim() || undefined,
                countryCode: vendorCountryCode || "IN",
            })

            if (res.success) {
                toast.success("Supplier created successfully")
                setIsCreateVendorOpen(false)
                setVendorDisplayName("")
                setVendorCompanyName("")
                setVendorEmail("")
                setVendorPhone("")
                setVendorGstin("")
                setVendorCity("")
                setVendorState("")
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to create supplier")
        } finally {
            setIsSubmittingVendor(false)
        }
    }

    // Submit Create PO
    const handleCreatePOSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!poVendorId) {
            toast.error("Please select a vendor / supplier")
            return
        }

        // Validate items
        const formattedItems: PurchaseOrderItemInput[] = []
        for (let i = 0; i < poItems.length; i++) {
            const item = poItems[i]
            if (!item.description.trim()) {
                toast.error(`Item #${i + 1} must have a description`)
                return
            }
            const qty = parseFloat(item.quantity)
            if (isNaN(qty) || qty <= 0) {
                toast.error(`Item #${i + 1} quantity must be greater than 0`)
                return
            }
            const price = parseFloat(item.unitPrice)
            if (isNaN(price) || price < 0) {
                toast.error(`Item #${i + 1} price cannot be negative`)
                return
            }
            const taxPct = parseFloat(item.taxPercent) || 0

            formattedItems.push({
                productId: item.productId || undefined,
                description: item.description.trim(),
                hsnSacCode: item.hsnSacCode.trim() || undefined,
                quantity: qty,
                unitPrice: price,
                taxPercent: taxPct,
            })
        }

        setIsSubmittingPO(true)
        try {
            const res = await createPurchaseOrder({
                vendorId: poVendorId,
                warehouseId: poWarehouseId || undefined,
                expectedDeliveryDate: poDeliveryDate || undefined,
                notes: poNotes.trim() || undefined,
                terms: poTerms.trim() || undefined,
                items: formattedItems,
            })

            if (res.success) {
                toast.success(`Purchase order ${res.order.orderNumber} created successfully`)
                setIsCreatePOOpen(false)
                resetCreatePOForm()
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to create purchase order")
        } finally {
            setIsSubmittingPO(false)
        }
    }

    // Handle Status Change
    const handleStatusTransition = async (orderId: string, newStatus: PurchaseOrderStatus) => {
        setIsUpdatingStatus(orderId)
        try {
            const res = await updatePurchaseOrderStatus(orderId, newStatus)
            if (res.success) {
                toast.success(`Order status updated to ${newStatus}`)
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to update order status")
        } finally {
            setIsUpdatingStatus(null)
        }
    }

    // Open Receive Dialog
    const handleOpenReceiveDialog = (order: PurchaseOrderRecord) => {
        setSelectedPO(order)
        setReceiveWarehouseId(order.warehouseId || initialData.warehouses[0]?.id || "")
        setReceiveNotes("")

        // Pre-fill quantities with remaining unreceived items
        const initialQtys: Record<string, string> = {}
        order.items.forEach((item) => {
            const remaining = Math.max(0, item.quantity - item.receivedQty)
            initialQtys[item.id] = String(remaining)
        })
        setReceiveQuantities(initialQtys)
        setIsReceiveOpen(true)
    }

    // Submit Receive Goods
    const handleReceiveSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPO) return

        if (!receiveWarehouseId) {
            toast.error("Please select a target warehouse for receipt intake")
            return
        }

        const itemsToReceive: { itemId: string; quantity: number }[] = []
        let hasAnyQuantity = false

        for (const item of selectedPO.items) {
            const qtyStr = receiveQuantities[item.id] || "0"
            const qtyNum = parseFloat(qtyStr)
            if (!isNaN(qtyNum) && qtyNum > 0) {
                const remaining = Math.max(0, item.quantity - item.receivedQty)
                if (qtyNum > remaining) {
                    toast.error(
                        `Cannot receive ${qtyNum} units of "${item.description}". Max remaining is ${remaining}.`
                    )
                    return
                }
                hasAnyQuantity = true
                itemsToReceive.push({
                    itemId: item.id,
                    quantity: qtyNum,
                })
            }
        }

        if (!hasAnyQuantity) {
            toast.error("Please specify a receipt quantity greater than 0 for at least one item")
            return
        }

        setIsSubmittingReceive(true)
        try {
            const res = await receiveGoods({
                purchaseOrderId: selectedPO.id,
                warehouseId: receiveWarehouseId,
                receivedItems: itemsToReceive,
                notes: receiveNotes.trim() || undefined,
            })

            if (res.success) {
                toast.success(
                    res.allReceived
                        ? "All goods received! Order status marked as RECEIVED and inventory updated."
                        : "Goods partially received! Inventory updated successfully."
                )
                setIsReceiveOpen(false)
                setSelectedPO(null)
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to intake goods")
        } finally {
            setIsSubmittingReceive(false)
        }
    }

    // Open Convert to Bill Dialog
    const handleOpenConvertBillDialog = (order: PurchaseOrderRecord) => {
        setSelectedPO(order)
        const defaultDueDate = new Date()
        defaultDueDate.setDate(defaultDueDate.getDate() + 30)
        setBillDueDate(format(defaultDueDate, "yyyy-MM-dd"))
        setBillNumberInput("")
        setIsConvertBillOpen(true)
    }

    // Submit Convert to Bill
    const handleConvertBillSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!selectedPO) return

        setIsSubmittingBill(true)
        try {
            const res = await convertPOToBill({
                purchaseOrderId: selectedPO.id,
                dueDate: billDueDate || undefined,
                billNumber: billNumberInput.trim() || undefined,
            })

            if (res.success) {
                toast.success(`Vendor bill ${res.billNumber} created in Accounts Payable!`)
                setIsConvertBillOpen(false)
                setSelectedPO(null)
                startTransition(() => {
                    router.refresh()
                })
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to convert purchase order to bill")
        } finally {
            setIsSubmittingBill(false)
        }
    }

    // Open View Details Dialog
    const handleOpenViewDetails = (order: PurchaseOrderRecord) => {
        setSelectedPO(order)
        setIsViewDetailsOpen(true)
    }

    // Open Create PO for a specific vendor
    const handleCreatePOForVendor = (vendorId: string) => {
        resetCreatePOForm()
        setPoVendorId(vendorId)
        setIsCreatePOOpen(true)
    }

    // Status Badge Helper
    const renderStatusBadge = (status: PurchaseOrderStatus, isBilled?: boolean) => {
        if (isBilled) {
            return (
                <Badge variant="outline" className="border-purple-500/40 bg-purple-50/50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400">
                    Billed
                </Badge>
            )
        }
        switch (status) {
            case "DRAFT":
                return (
                    <Badge variant="outline" className="border-gray-500/40 text-gray-600 dark:text-gray-400">
                        Draft
                    </Badge>
                )
            case "SENT":
                return (
                    <Badge variant="outline" className="border-blue-500/40 bg-blue-50/50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                        Sent
                    </Badge>
                )
            case "APPROVED":
                return (
                    <Badge variant="outline" className="border-amber-500/40 bg-amber-50/50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                        Approved
                    </Badge>
                )
            case "PARTIALLY_RECEIVED":
                return (
                    <Badge variant="outline" className="border-sky-500/40 bg-sky-50/50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                        Partially Received
                    </Badge>
                )
            case "RECEIVED":
                return (
                    <Badge variant="outline" className="border-emerald-500/40 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Received
                    </Badge>
                )
            case "CANCELLED":
                return (
                    <Badge variant="outline" className="border-red-500/40 bg-red-50/50 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                        Cancelled
                    </Badge>
                )
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    return (
        <div className="flex-1 space-y-6 p-3 sm:p-4 md:p-6">
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                            <Truck className="h-5 w-5" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight">Purchase & Procurement</h1>
                            <p className="text-sm text-muted-foreground">
                                Manage vendor procurement, purchase orders, multi-facility goods intake, and AP billing.
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            startTransition(() => {
                                router.refresh()
                            })
                        }}
                        disabled={isPending}
                    >
                        <RefreshCw className={`mr-2 h-4 w-4 ${isPending ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsCreateVendorOpen(true)}
                    >
                        <Building2 className="mr-2 h-4 w-4" />
                        New Supplier
                    </Button>
                    <Button
                        size="sm"
                        onClick={() => {
                            resetCreatePOForm()
                            setIsCreatePOOpen(true)
                        }}
                    >
                        <Plus className="mr-2 h-4 w-4" />
                        New Purchase Order
                    </Button>
                </div>
            </div>

            {/* KPI Telemetry Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Procurement Spend
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                            <DollarSign className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {formatCurrency(initialData.telemetry.totalProcurementSpend)}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Committed across active & completed orders
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Open Purchase Orders
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400">
                            <ShoppingCart className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.openOrdersCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Orders currently in progress or awaiting receipt
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Pending Receipts
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                            <Boxes className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.pendingReceiptsCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {pendingReceiptsTotalItems} units awaiting warehouse delivery
                        </p>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Suppliers
                        </CardTitle>
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400">
                            <Building2 className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {initialData.telemetry.activeVendorsCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Suppliers with recorded contracts or balances
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs Section */}
            <Tabs
                value={activeTab}
                onValueChange={(val) => setActiveTab(val as "orders" | "vendors" | "receipts")}
                className="space-y-4"
            >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <TabsList className="grid w-full grid-cols-3 sm:w-auto">
                        <TabsTrigger value="orders" className="flex items-center gap-2">
                            <ShoppingCart className="h-4 w-4" />
                            <span>Purchase Orders</span>
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                                {initialData.orders.length}
                            </Badge>
                        </TabsTrigger>
                        <TabsTrigger value="receipts" className="flex items-center gap-2">
                            <Boxes className="h-4 w-4" />
                            <span>Pending Receipts</span>
                            {pendingReceiptOrders.length > 0 && (
                                <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                    {pendingReceiptOrders.length}
                                </Badge>
                            )}
                        </TabsTrigger>
                        <TabsTrigger value="vendors" className="flex items-center gap-2">
                            <Building2 className="h-4 w-4" />
                            <span>Suppliers & Vendors</span>
                            <Badge variant="secondary" className="ml-1 px-1.5 py-0 text-xs">
                                {initialData.vendors.length}
                            </Badge>
                        </TabsTrigger>
                    </TabsList>
                </div>

                {/* Tab 1: Purchase Orders */}
                <TabsContent value="orders" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Procurement Orders</CardTitle>
                                    <CardDescription>
                                        Monitor purchase orders from draft authorization through goods intake and bill settlement.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search by PO #, vendor, item..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="w-full sm:w-44">
                                            <SelectValue placeholder="Filter by status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="all">All Statuses</SelectItem>
                                            <SelectItem value="DRAFT">Draft</SelectItem>
                                            <SelectItem value="SENT">Sent</SelectItem>
                                            <SelectItem value="APPROVED">Approved</SelectItem>
                                            <SelectItem value="PARTIALLY_RECEIVED">Partially Received</SelectItem>
                                            <SelectItem value="RECEIVED">Received</SelectItem>
                                            <SelectItem value="BILLED">Billed</SelectItem>
                                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                                        <ShoppingCart className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-medium">No purchase orders found</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                                        {searchQuery || statusFilter !== "all"
                                            ? "Try clearing your search query or status filter to see more orders."
                                            : "Create your first purchase order to initiate vendor procurement."}
                                    </p>
                                    <Button
                                        onClick={() => {
                                            resetCreatePOForm()
                                            setIsCreatePOOpen(true)
                                        }}
                                        size="sm"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Create Purchase Order
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Order #</TableHead>
                                                <TableHead>Supplier</TableHead>
                                                <TableHead>Warehouse</TableHead>
                                                <TableHead>Order Date</TableHead>
                                                <TableHead>Expected By</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead className="text-right">Total Amount</TableHead>
                                                <TableHead>Linked Bill</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredOrders.map((order) => {
                                                const isActionPending = isUpdatingStatus === order.id
                                                return (
                                                    <TableRow key={order.id}>
                                                        <TableCell className="font-medium">
                                                            <div className="flex items-center gap-1.5">
                                                                <span>{order.orderNumber}</span>
                                                            </div>
                                                            <span className="text-xs text-muted-foreground block">
                                                                {order.items.length} {order.items.length === 1 ? "item" : "items"}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell>
                                                            <div className="font-medium">{order.vendorName}</div>
                                                            {order.vendorPhone && (
                                                                <div className="text-xs text-muted-foreground">
                                                                    {order.vendorPhone}
                                                                </div>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>
                                                            {order.warehouseName ? (
                                                                <span className="text-sm">{order.warehouseName}</span>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground italic">
                                                                    Not specified
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {format(new Date(order.orderDate), "dd MMM yyyy")}
                                                        </TableCell>
                                                        <TableCell className="text-sm">
                                                            {order.expectedDeliveryDate ? (
                                                                format(new Date(order.expectedDeliveryDate), "dd MMM yyyy")
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{renderStatusBadge(order.status, Boolean(order.billNumber))}</TableCell>
                                                        <TableCell className="text-right font-medium">
                                                            {formatCurrency(order.total, order.currencyCode)}
                                                        </TableCell>
                                                        <TableCell>
                                                            {order.billNumber ? (
                                                                <Link
                                                                    href="/finance/bills"
                                                                    className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                                                >
                                                                    <span>{order.billNumber}</span>
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </Link>
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-right">
                                                            <div className="flex items-center justify-end gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="h-8 w-8"
                                                                    onClick={() => handleOpenViewDetails(order)}
                                                                    title="View PO Details"
                                                                >
                                                                    <Eye className="h-4 w-4" />
                                                                </Button>

                                                                {/* Context Menu for Lifecycle Actions */}
                                                                <DropdownMenu>
                                                                    <DropdownMenuTrigger asChild>
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            className="h-8 px-2"
                                                                            disabled={isActionPending}
                                                                        >
                                                                            {isActionPending ? (
                                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                                            ) : (
                                                                                <span>Actions</span>
                                                                            )}
                                                                        </Button>
                                                                    </DropdownMenuTrigger>
                                                                    <DropdownMenuContent align="end">
                                                                        <DropdownMenuLabel>Order Workflow</DropdownMenuLabel>
                                                                        <DropdownMenuSeparator />

                                                                        {order.status === "DRAFT" && (
                                                                            <DropdownMenuItem
                                                                                onClick={() =>
                                                                                    handleStatusTransition(order.id, "SENT")
                                                                                }
                                                                            >
                                                                                <Send className="mr-2 h-4 w-4 text-blue-500" />
                                                                                <span>Mark as Sent</span>
                                                                            </DropdownMenuItem>
                                                                        )}

                                                                        {(order.status === "DRAFT" || order.status === "SENT") && (
                                                                            <DropdownMenuItem
                                                                                onClick={() =>
                                                                                    handleStatusTransition(order.id, "APPROVED")
                                                                                }
                                                                            >
                                                                                <Check className="mr-2 h-4 w-4 text-emerald-500" />
                                                                                <span>Approve Order</span>
                                                                            </DropdownMenuItem>
                                                                        )}

                                                                        {(order.status === "APPROVED" ||
                                                                            order.status === "PARTIALLY_RECEIVED") && (
                                                                            <DropdownMenuItem
                                                                                onClick={() => handleOpenReceiveDialog(order)}
                                                                            >
                                                                                <Boxes className="mr-2 h-4 w-4 text-amber-500" />
                                                                                <span>Intake Goods</span>
                                                                            </DropdownMenuItem>
                                                                        )}

                                                                        {!order.billId &&
                                                                            order.status !== "DRAFT" &&
                                                                            order.status !== "CANCELLED" && (
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        handleOpenConvertBillDialog(order)
                                                                                    }
                                                                                >
                                                                                    <Receipt className="mr-2 h-4 w-4 text-purple-500" />
                                                                                    <span>Convert to Vendor Bill</span>
                                                                                </DropdownMenuItem>
                                                                            )}

                                                                        {(order.status === "DRAFT" || order.status === "SENT") && (
                                                                            <>
                                                                                <DropdownMenuSeparator />
                                                                                <DropdownMenuItem
                                                                                    onClick={() =>
                                                                                        handleStatusTransition(order.id, "CANCELLED")
                                                                                    }
                                                                                    className="text-red-600 dark:text-red-400"
                                                                                >
                                                                                    <Ban className="mr-2 h-4 w-4" />
                                                                                    <span>Cancel Order</span>
                                                                                </DropdownMenuItem>
                                                                            </>
                                                                        )}
                                                                    </DropdownMenuContent>
                                                                </DropdownMenu>
                                                            </div>
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 2: Pending Receipts Queue */}
                <TabsContent value="receipts" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Warehouse Goods Intake Queue</CardTitle>
                                    <CardDescription>
                                        Orders approved and awaiting complete physical receiving into facility stock inventory.
                                    </CardDescription>
                                </div>
                                <Badge variant="secondary" className="w-fit">
                                    {pendingReceiptOrders.length} Orders Awaiting Intake
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {pendingReceiptOrders.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-600 mb-4">
                                        <CheckCircle2 className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-medium">All orders received</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mt-1">
                                        There are no approved purchase orders awaiting receipt intake at this time.
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {pendingReceiptOrders.map((order) => {
                                        const totalOrdered = order.items.reduce((s, i) => s + i.quantity, 0)
                                        const totalReceived = order.items.reduce((s, i) => s + i.receivedQty, 0)
                                        const percentReceived = Math.round(
                                            (totalReceived / (totalOrdered || 1)) * 100
                                        )

                                        return (
                                            <div
                                                key={order.id}
                                                className="rounded-lg border p-4 transition-colors hover:border-primary/40"
                                            >
                                                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-2">
                                                            <span className="font-semibold text-base">
                                                                {order.orderNumber}
                                                            </span>
                                                            {renderStatusBadge(order.status, Boolean(order.billNumber))}
                                                            <span className="text-xs text-muted-foreground">
                                                                Ordered: {format(new Date(order.orderDate), "dd MMM yyyy")}
                                                            </span>
                                                        </div>
                                                        <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                            <span className="flex items-center gap-1 font-medium text-foreground">
                                                                <Building2 className="h-3.5 w-3.5" />
                                                                {order.vendorName}
                                                            </span>
                                                            <span>•</span>
                                                            <span className="flex items-center gap-1">
                                                                <Truck className="h-3.5 w-3.5" />
                                                                {order.warehouseName || "Default Warehouse"}
                                                            </span>
                                                            {order.expectedDeliveryDate && (
                                                                <>
                                                                    <span>•</span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="h-3.5 w-3.5" />
                                                                        Expected: {format(new Date(order.expectedDeliveryDate), "dd MMM yyyy")}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center gap-3">
                                                        <div className="text-right">
                                                            <div className="text-sm font-semibold">
                                                                {totalReceived} / {totalOrdered} Units
                                                            </div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {percentReceived}% received
                                                            </div>
                                                        </div>
                                                        <Button
                                                            size="sm"
                                                            onClick={() => handleOpenReceiveDialog(order)}
                                                        >
                                                            <Boxes className="mr-2 h-4 w-4" />
                                                            Intake Goods
                                                        </Button>
                                                    </div>
                                                </div>

                                                {/* Visual Receipt Progress Bar */}
                                                <div className="mt-3 w-full bg-muted rounded-full h-2 overflow-hidden">
                                                    <div
                                                        className="bg-primary h-2 transition-all duration-300 rounded-full"
                                                        style={{ width: `${Math.min(100, percentReceived)}%` }}
                                                    />
                                                </div>

                                                {/* Itemized summary */}
                                                <div className="mt-3 grid gap-2 pt-2 border-t border-border/40 sm:grid-cols-2 lg:grid-cols-3">
                                                    {order.items.map((item) => {
                                                        const remaining = Math.max(0, item.quantity - item.receivedQty)
                                                        return (
                                                            <div
                                                                key={item.id}
                                                                className="flex items-center justify-between text-xs rounded bg-muted/40 p-2"
                                                            >
                                                                <span className="truncate pr-2 font-medium">
                                                                    {item.description}
                                                                </span>
                                                                <span
                                                                    className={
                                                                        remaining === 0
                                                                            ? "text-emerald-600 font-medium"
                                                                            : "text-amber-600 font-medium"
                                                                    }
                                                                >
                                                                    {item.receivedQty} / {item.quantity} rcvd
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 3: Suppliers & Vendors Directory */}
                <TabsContent value="vendors" className="space-y-4">
                    <Card>
                        <CardHeader className="pb-3">
                            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                                <div>
                                    <CardTitle>Supplier Directory</CardTitle>
                                    <CardDescription>
                                        Verified suppliers, payment terms, outstanding balances, and order history.
                                    </CardDescription>
                                </div>
                                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search suppliers by name, GSTIN..."
                                            value={vendorSearchQuery}
                                            onChange={(e) => setVendorSearchQuery(e.target.value)}
                                            className="pl-8"
                                        />
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={() => setIsCreateVendorOpen(true)}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Supplier
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {filteredVendors.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-12 text-center">
                                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground mb-4">
                                        <Building2 className="h-6 w-6" />
                                    </div>
                                    <h3 className="text-lg font-medium">No suppliers found</h3>
                                    <p className="text-sm text-muted-foreground max-w-sm mt-1 mb-4">
                                        {vendorSearchQuery
                                            ? "Try changing your search query to find vendors."
                                            : "Add your first supplier or vendor to begin creating purchase orders."}
                                    </p>
                                    <Button
                                        onClick={() => setIsCreateVendorOpen(true)}
                                        size="sm"
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Supplier
                                    </Button>
                                </div>
                            ) : (
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Supplier Name</TableHead>
                                                <TableHead>Contact Information</TableHead>
                                                <TableHead>Location</TableHead>
                                                <TableHead>GSTIN / Tax ID</TableHead>
                                                <TableHead className="text-center">Total POs</TableHead>
                                                <TableHead className="text-right">Payable Balance</TableHead>
                                                <TableHead className="text-right">Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredVendors.map((vendor) => (
                                                <TableRow key={vendor.id}>
                                                    <TableCell>
                                                        <div className="font-semibold text-foreground">
                                                            {vendor.companyName || vendor.displayName}
                                                        </div>
                                                        {vendor.companyName && (
                                                            <div className="text-xs text-muted-foreground">
                                                                Contact: {vendor.displayName}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="space-y-0.5 text-xs">
                                                            {vendor.email && (
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                    <Mail className="h-3 w-3" />
                                                                    <span>{vendor.email}</span>
                                                                </div>
                                                            )}
                                                            {vendor.phone && (
                                                                <div className="flex items-center gap-1 text-muted-foreground">
                                                                    <Phone className="h-3 w-3" />
                                                                    <span>{vendor.phone}</span>
                                                                </div>
                                                            )}
                                                            {!vendor.email && !vendor.phone && (
                                                                <span className="text-muted-foreground italic">No contact details</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-sm">
                                                        {vendor.city || vendor.state ? (
                                                            <span>
                                                                {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                                                            </span>
                                                        ) : (
                                                            <span className="text-xs text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="font-mono text-xs">
                                                        {vendor.gstin || <span className="text-muted-foreground">—</span>}
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">
                                                        {vendor.totalOrdersCount}
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium">
                                                        <span
                                                            className={
                                                                vendor.balance > 0
                                                                    ? "text-red-600 dark:text-red-400"
                                                                    : "text-muted-foreground"
                                                            }
                                                        >
                                                            {formatCurrency(vendor.balance)}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleCreatePOForVendor(vendor.id)}
                                                        >
                                                            <Plus className="mr-1 h-3.5 w-3.5" />
                                                            Create PO
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Modal 1: Create Purchase Order */}
            <Dialog open={isCreatePOOpen} onOpenChange={setIsCreatePOOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShoppingCart className="h-5 w-5 text-primary" />
                            Create New Purchase Order
                        </DialogTitle>
                        <DialogDescription>
                            Generate a formal procurement order for suppliers with itemized taxes, pricing, and destination warehouse.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreatePOSubmit} className="space-y-6">
                        {/* Header Details */}
                        <div className="grid gap-4 sm:grid-cols-3">
                            <div className="space-y-2">
                                <Label htmlFor="po-vendor">
                                    Supplier / Vendor <span className="text-red-500">*</span>
                                </Label>
                                <Select value={poVendorId} onValueChange={setPoVendorId}>
                                    <SelectTrigger id="po-vendor">
                                        <SelectValue placeholder="Select supplier" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.vendors.map((v) => (
                                            <SelectItem key={v.id} value={v.id}>
                                                {v.companyName ? `${v.companyName} (${v.displayName})` : v.displayName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="po-warehouse">Destination Warehouse</Label>
                                <Select value={poWarehouseId} onValueChange={setPoWarehouseId}>
                                    <SelectTrigger id="po-warehouse">
                                        <SelectValue placeholder="Select target warehouse" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {initialData.warehouses.map((w) => (
                                            <SelectItem key={w.id} value={w.id}>
                                                {w.name} ({w.code})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="po-delivery-date">Expected Delivery Date</Label>
                                <Input
                                    id="po-delivery-date"
                                    type="date"
                                    value={poDeliveryDate}
                                    onChange={(e) => setPoDeliveryDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Line Items Section */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h4 className="text-sm font-semibold">Purchase Line Items</h4>
                                    <p className="text-xs text-muted-foreground">
                                        Select from existing product catalog or enter custom line items.
                                    </p>
                                </div>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddLineItem}
                                >
                                    <Plus className="mr-1 h-3.5 w-3.5" />
                                    Add Item
                                </Button>
                            </div>

                            <div className="rounded-md border p-3 space-y-3 bg-muted/20">
                                {poItems.map((item, index) => {
                                    const qtyNum = parseFloat(item.quantity) || 0
                                    const priceNum = parseFloat(item.unitPrice) || 0
                                    const taxPct = parseFloat(item.taxPercent) || 0
                                    const lineTotal = qtyNum * priceNum * (1 + taxPct / 100)

                                    return (
                                        <div
                                            key={item.id}
                                            className="grid gap-3 p-3 rounded-lg border bg-background sm:grid-cols-12 items-end"
                                        >
                                            {/* Catalog selection */}
                                            <div className="sm:col-span-3 space-y-1">
                                                <Label className="text-xs">Product Catalog Item</Label>
                                                <Select
                                                    value={item.productId || "manual"}
                                                    onValueChange={(val) =>
                                                        handleProductSelect(index, val === "manual" ? "" : val)
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Catalog product" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="manual">Custom / Manual Item</SelectItem>
                                                        {initialData.products.map((p) => (
                                                            <SelectItem key={p.id} value={p.id} className="text-xs">
                                                                {p.name} {p.sku ? `(${p.sku})` : ""}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            {/* Description */}
                                            <div className="sm:col-span-3 space-y-1">
                                                <Label className="text-xs">
                                                    Description <span className="text-red-500">*</span>
                                                </Label>
                                                <Input
                                                    className="h-8 text-xs"
                                                    placeholder="Item name or description"
                                                    value={item.description}
                                                    onChange={(e) =>
                                                        handleItemChange(index, "description", e.target.value)
                                                    }
                                                    required
                                                />
                                            </div>

                                            {/* Quantity */}
                                            <div className="sm:col-span-1 space-y-1">
                                                <Label className="text-xs">Qty</Label>
                                                <Input
                                                    type="number"
                                                    step="any"
                                                    min="1"
                                                    className="h-8 text-xs"
                                                    value={item.quantity}
                                                    onChange={(e) =>
                                                        handleItemChange(index, "quantity", e.target.value)
                                                    }
                                                    required
                                                />
                                            </div>

                                            {/* Unit Price */}
                                            <div className="sm:col-span-2 space-y-1">
                                                <Label className="text-xs">Unit Price</Label>
                                                <Input
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    className="h-8 text-xs"
                                                    value={item.unitPrice}
                                                    onChange={(e) =>
                                                        handleItemChange(index, "unitPrice", e.target.value)
                                                    }
                                                    required
                                                />
                                            </div>

                                            {/* Tax % */}
                                            <div className="sm:col-span-1 space-y-1">
                                                <Label className="text-xs">Tax %</Label>
                                                <Select
                                                    value={item.taxPercent}
                                                    onValueChange={(val) =>
                                                        handleItemChange(index, "taxPercent", val)
                                                    }
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
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
                                            </div>

                                            {/* Line Total & Remove */}
                                            <div className="sm:col-span-2 flex items-center justify-between gap-2">
                                                <div className="text-right flex-1">
                                                    <span className="text-xs text-muted-foreground block">Total</span>
                                                    <span className="text-xs font-semibold">
                                                        {formatCurrency(lineTotal)}
                                                    </span>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-500 hover:text-red-700"
                                                    onClick={() => handleRemoveLineItem(item.id)}
                                                    disabled={poItems.length <= 1}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>

                            {/* Summary calculation breakdown */}
                            <div className="flex flex-col sm:flex-row justify-end pt-2">
                                <div className="w-full sm:w-72 space-y-1.5 rounded-lg border p-3 bg-muted/30">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Subtotal:</span>
                                        <span>{formatCurrency(poCalculations.subtotal)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Estimated Tax:</span>
                                        <span>{formatCurrency(poCalculations.totalTax)}</span>
                                    </div>
                                    <div className="border-t border-border pt-1 flex justify-between font-semibold text-sm">
                                        <span>Grand Total:</span>
                                        <span className="text-primary">
                                            {formatCurrency(poCalculations.grandTotal)}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Notes and Terms */}
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="po-notes">Delivery & Shipping Notes</Label>
                                <Textarea
                                    id="po-notes"
                                    placeholder="Enter instructions for delivery or freight handling..."
                                    value={poNotes}
                                    onChange={(e) => setPoNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="po-terms">Payment Terms & Remarks</Label>
                                <Textarea
                                    id="po-terms"
                                    placeholder="Enter payment conditions, warranty remarks, etc..."
                                    value={poTerms}
                                    onChange={(e) => setPoTerms(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreatePOOpen(false)}
                                disabled={isSubmittingPO}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmittingPO}>
                                {isSubmittingPO ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Creating PO...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Save Purchase Order
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal 2: Receive Goods Intake */}
            <Dialog open={isReceiveOpen} onOpenChange={setIsReceiveOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Boxes className="h-5 w-5 text-amber-500" />
                            Warehouse Goods Intake
                        </DialogTitle>
                        <DialogDescription>
                            Confirm delivery of goods against Purchase Order{" "}
                            <span className="font-semibold text-foreground">
                                {selectedPO?.orderNumber}
                            </span>
                            . Stock levels will be updated atomically.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPO && (
                        <form onSubmit={handleReceiveSubmit} className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2 bg-muted/40 p-3 rounded-lg text-sm">
                                <div>
                                    <span className="text-muted-foreground block text-xs">Supplier:</span>
                                    <span className="font-medium">{selectedPO.vendorName}</span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground block text-xs">Target Warehouse:</span>
                                    <Select
                                        value={receiveWarehouseId}
                                        onValueChange={setReceiveWarehouseId}
                                    >
                                        <SelectTrigger className="h-8 mt-1 text-xs">
                                            <SelectValue placeholder="Select warehouse" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {initialData.warehouses.map((w) => (
                                                <SelectItem key={w.id} value={w.id} className="text-xs">
                                                    {w.name} ({w.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            {/* Item Receipt Inputs */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Items to Receive</Label>
                                <div className="rounded-md border divide-y">
                                    {selectedPO.items.map((item) => {
                                        const remaining = Math.max(0, item.quantity - item.receivedQty)
                                        return (
                                            <div
                                                key={item.id}
                                                className="p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2"
                                            >
                                                <div className="space-y-0.5">
                                                    <div className="font-medium text-sm">{item.description}</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        Ordered: {item.quantity} | Previously Received: {item.receivedQty} | Remaining: {remaining}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <Label htmlFor={`rcv-${item.id}`} className="text-xs shrink-0">
                                                        Intake Qty:
                                                    </Label>
                                                    <Input
                                                        id={`rcv-${item.id}`}
                                                        type="number"
                                                        min="0"
                                                        max={remaining}
                                                        step="any"
                                                        className="w-24 h-8 text-xs text-right font-medium"
                                                        value={receiveQuantities[item.id] || "0"}
                                                        onChange={(e) =>
                                                            setReceiveQuantities((prev) => ({
                                                                ...prev,
                                                                [item.id]: e.target.value,
                                                            }))
                                                        }
                                                        disabled={remaining === 0}
                                                    />
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="receive-notes">Challan / Delivery Remarks</Label>
                                <Textarea
                                    id="receive-notes"
                                    placeholder="Enter delivery challan number, batch tracking remarks, or inspector notes..."
                                    value={receiveNotes}
                                    onChange={(e) => setReceiveNotes(e.target.value)}
                                    rows={2}
                                />
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsReceiveOpen(false)}
                                    disabled={isSubmittingReceive}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmittingReceive}>
                                    {isSubmittingReceive ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Processing Intake...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Confirm Receipt & Update Stock
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal 3: Convert to Vendor Bill */}
            <Dialog open={isConvertBillOpen} onOpenChange={setIsConvertBillOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Receipt className="h-5 w-5 text-purple-500" />
                            Convert to Accounts Payable Bill
                        </DialogTitle>
                        <DialogDescription>
                            Generate a formal AP vendor bill from Purchase Order{" "}
                            <span className="font-semibold text-foreground">
                                {selectedPO?.orderNumber}
                            </span>
                            . This updates vendor balance and financial records.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPO && (
                        <form onSubmit={handleConvertBillSubmit} className="space-y-4">
                            <div className="bg-muted/40 p-3 rounded-lg space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Supplier:</span>
                                    <span className="font-medium">{selectedPO.vendorName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Bill Amount:</span>
                                    <span className="font-bold text-primary">
                                        {formatCurrency(selectedPO.total, selectedPO.currencyCode)}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="custom-bill-num">Vendor Invoice / Bill Reference</Label>
                                <Input
                                    id="custom-bill-num"
                                    placeholder="Enter vendor invoice reference or leave blank for auto-generation"
                                    value={billNumberInput}
                                    onChange={(e) => setBillNumberInput(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="bill-due-date">Payment Due Date</Label>
                                <Input
                                    id="bill-due-date"
                                    type="date"
                                    value={billDueDate}
                                    onChange={(e) => setBillDueDate(e.target.value)}
                                />
                            </div>

                            <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                                <span>
                                    Converting to a Bill will register this transaction under Accounts Payable (Finance module) and increment the outstanding balance for this vendor.
                                </span>
                            </div>

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsConvertBillOpen(false)}
                                    disabled={isSubmittingBill}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmittingBill}>
                                    {isSubmittingBill ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating Bill...
                                        </>
                                    ) : (
                                        <>
                                            <Check className="mr-2 h-4 w-4" />
                                            Create Vendor Bill
                                        </>
                                    )}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            {/* Modal 4: Create Vendor / Supplier */}
            <Dialog open={isCreateVendorOpen} onOpenChange={setIsCreateVendorOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            Add New Supplier
                        </DialogTitle>
                        <DialogDescription>
                            Register a new vendor in the procurement directory for purchasing and invoice settlement.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateVendorSubmit} className="space-y-4">
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="space-y-1 sm:col-span-2">
                                <Label htmlFor="vendor-comp">Company / Business Name</Label>
                                <Input
                                    id="vendor-comp"
                                    placeholder="Enter company or trade name"
                                    value={vendorCompanyName}
                                    onChange={(e) => setVendorCompanyName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                                <Label htmlFor="vendor-disp">
                                    Primary Contact / Representative <span className="text-red-500">*</span>
                                </Label>
                                <Input
                                    id="vendor-disp"
                                    placeholder="Enter contact person full name"
                                    value={vendorDisplayName}
                                    onChange={(e) => setVendorDisplayName(e.target.value)}
                                    required
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="vendor-email">Email Address</Label>
                                <Input
                                    id="vendor-email"
                                    type="email"
                                    placeholder="supplier@business.com"
                                    value={vendorEmail}
                                    onChange={(e) => setVendorEmail(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="vendor-phone">Phone Number</Label>
                                <Input
                                    id="vendor-phone"
                                    placeholder="+91 98765 43210"
                                    value={vendorPhone}
                                    onChange={(e) => setVendorPhone(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1 sm:col-span-2">
                                <Label htmlFor="vendor-gstin">GSTIN / Tax ID</Label>
                                <Input
                                    id="vendor-gstin"
                                    placeholder="Enter GSTIN or business registration identifier"
                                    value={vendorGstin}
                                    onChange={(e) => setVendorGstin(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="vendor-city">City</Label>
                                <Input
                                    id="vendor-city"
                                    placeholder="City"
                                    value={vendorCity}
                                    onChange={(e) => setVendorCity(e.target.value)}
                                />
                            </div>

                            <div className="space-y-1">
                                <Label htmlFor="vendor-state">State / Region</Label>
                                <Input
                                    id="vendor-state"
                                    placeholder="State or Province"
                                    value={vendorState}
                                    onChange={(e) => setVendorState(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateVendorOpen(false)}
                                disabled={isSubmittingVendor}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isSubmittingVendor}>
                                {isSubmittingVendor ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Check className="mr-2 h-4 w-4" />
                                        Register Supplier
                                    </>
                                )}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Modal 5: View PO Details */}
            <Dialog open={isViewDetailsOpen} onOpenChange={setIsViewDetailsOpen}>
                <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center justify-between">
                            <DialogTitle className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Purchase Order Details: {selectedPO?.orderNumber}
                            </DialogTitle>
                            {selectedPO && renderStatusBadge(selectedPO.status, Boolean(selectedPO.billNumber))}
                        </div>
                        <DialogDescription>
                            Created on{" "}
                            {selectedPO && format(new Date(selectedPO.createdAt), "dd MMM yyyy, hh:mm a")}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedPO && (
                        <div className="space-y-6">
                            {/* Vendor & Delivery info card */}
                            <div className="grid gap-4 sm:grid-cols-2 rounded-lg border p-4 bg-muted/20">
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                        Supplier Details
                                    </h4>
                                    <div className="font-semibold text-base">{selectedPO.vendorName}</div>
                                    {selectedPO.vendorEmail && (
                                        <div className="text-xs text-muted-foreground mt-0.5">
                                            {selectedPO.vendorEmail}
                                        </div>
                                    )}
                                    {selectedPO.vendorPhone && (
                                        <div className="text-xs text-muted-foreground">
                                            {selectedPO.vendorPhone}
                                        </div>
                                    )}
                                    {selectedPO.vendorGstin && (
                                        <div className="text-xs font-mono mt-1">
                                            GSTIN: {selectedPO.vendorGstin}
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                                        Fulfillment & AP Status
                                    </h4>
                                    <div className="text-sm">
                                        <span className="text-muted-foreground">Warehouse: </span>
                                        <span className="font-medium">
                                            {selectedPO.warehouseName || "Default Warehouse"}
                                        </span>
                                    </div>
                                    <div className="text-sm mt-1">
                                        <span className="text-muted-foreground">Expected Delivery: </span>
                                        <span className="font-medium">
                                            {selectedPO.expectedDeliveryDate
                                                ? format(new Date(selectedPO.expectedDeliveryDate), "dd MMM yyyy")
                                                : "Not scheduled"}
                                        </span>
                                    </div>
                                    <div className="text-sm mt-1">
                                        <span className="text-muted-foreground">Linked AP Bill: </span>
                                        {selectedPO.billNumber ? (
                                            <Link
                                                href="/finance/bills"
                                                className="font-medium text-primary hover:underline inline-flex items-center gap-1"
                                            >
                                                {selectedPO.billNumber}
                                                <ExternalLink className="h-3 w-3" />
                                            </Link>
                                        ) : (
                                            <span className="text-muted-foreground italic">Not yet billed</span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Itemized Line Items Table */}
                            <div className="space-y-2">
                                <h4 className="text-sm font-semibold">Ordered Line Items</h4>
                                <div className="rounded-md border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Item & Description</TableHead>
                                                <TableHead className="text-center">Ordered</TableHead>
                                                <TableHead className="text-center">Received</TableHead>
                                                <TableHead className="text-right">Unit Price</TableHead>
                                                <TableHead className="text-right">Tax</TableHead>
                                                <TableHead className="text-right">Line Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {selectedPO.items.map((item) => (
                                                <TableRow key={item.id}>
                                                    <TableCell>
                                                        <div className="font-medium text-sm">{item.description}</div>
                                                        {item.productSku && (
                                                            <div className="text-xs text-muted-foreground">
                                                                SKU: {item.productSku}
                                                            </div>
                                                        )}
                                                        {item.hsnSacCode && (
                                                            <div className="text-xs text-muted-foreground">
                                                                HSN: {item.hsnSacCode}
                                                            </div>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-center font-medium">
                                                        {item.quantity}
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span
                                                            className={
                                                                item.receivedQty >= item.quantity
                                                                    ? "text-emerald-600 font-semibold"
                                                                    : item.receivedQty > 0
                                                                    ? "text-amber-600 font-semibold"
                                                                    : "text-muted-foreground"
                                                            }
                                                        >
                                                            {item.receivedQty}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-sm">
                                                        {formatCurrency(item.unitPrice, selectedPO.currencyCode)}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono text-xs">
                                                        {formatCurrency(item.taxAmount, selectedPO.currencyCode)}
                                                        <span className="text-muted-foreground block">
                                                            ({item.taxPercent}%)
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-medium font-mono">
                                                        {formatCurrency(item.lineTotal, selectedPO.currencyCode)}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            {/* Totals Summary */}
                            <div className="flex justify-end">
                                <div className="w-full sm:w-72 space-y-1.5 rounded-lg border p-3 bg-muted/30">
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Subtotal:</span>
                                        <span>{formatCurrency(selectedPO.subtotal, selectedPO.currencyCode)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-muted-foreground">
                                        <span>Total Taxes:</span>
                                        <span>{formatCurrency(selectedPO.taxAmount, selectedPO.currencyCode)}</span>
                                    </div>
                                    <div className="border-t border-border pt-1 flex justify-between font-bold text-base">
                                        <span>Grand Total:</span>
                                        <span className="text-primary">
                                            {formatCurrency(selectedPO.total, selectedPO.currencyCode)}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Remarks & Terms */}
                            {(selectedPO.notes || selectedPO.terms) && (
                                <div className="grid gap-3 sm:grid-cols-2 text-xs border-t pt-3">
                                    {selectedPO.notes && (
                                        <div>
                                            <span className="font-semibold text-muted-foreground block mb-1">
                                                Delivery Notes:
                                            </span>
                                            <p className="rounded bg-muted/40 p-2">{selectedPO.notes}</p>
                                        </div>
                                    )}
                                    {selectedPO.terms && (
                                        <div>
                                            <span className="font-semibold text-muted-foreground block mb-1">
                                                Terms & Conditions:
                                            </span>
                                            <p className="rounded bg-muted/40 p-2">{selectedPO.terms}</p>
                                        </div>
                                    )}
                                </div>
                            )}

                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setIsViewDetailsOpen(false)}
                                >
                                    Close
                                </Button>
                                {(selectedPO.status === "APPROVED" ||
                                    selectedPO.status === "PARTIALLY_RECEIVED") && (
                                    <Button
                                        onClick={() => {
                                            setIsViewDetailsOpen(false)
                                            handleOpenReceiveDialog(selectedPO)
                                        }}
                                    >
                                        <Boxes className="mr-2 h-4 w-4" />
                                        Intake Goods
                                    </Button>
                                )}
                            </DialogFooter>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
