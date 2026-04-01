"use client"
import { useEffect, useState } from "react"
import { getOrders, deleteOrder } from "@/app/actions/sales/orders"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Search, Plus, Pencil, Trash2, Box, Package, CheckCircle2, XCircle, Clock, FileBarChart2 } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { OrderFormData, SalesOrderStatus } from "@/components/sales/order-form"

/* ── Status config ── */
const statusConfig: Record<SalesOrderStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: "Draft", variant: "secondary", icon: Clock },
    CONFIRMED: { label: "Confirmed", variant: "outline", icon: CheckCircle2 },
    PROCESSING: { label: "Processing", variant: "secondary", icon: Box },
    SHIPPED: { label: "Shipped", variant: "default", icon: Package },
    DELIVERED: { label: "Delivered", variant: "outline", icon: CheckCircle2 },
    CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
}

/* ── Helpers ── */
function calcOrderTotal(o: OrderFormData) {
    const subtotal = o.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
    const tax = o.lineItems.reduce((s, li) => s + li.qty * li.unitPrice * (li.taxPercent / 100), 0)
    const disc = o.discountType === "PERCENT" ? subtotal * (o.discount / 100) : o.discount
    return subtotal + tax - disc
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function OrdersPage() {
    const router = useRouter()
    const [orders, setOrders] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<"all" | SalesOrderStatus>("all")

    useEffect(() => {
        fetchOrders()
    }, [])

    const fetchOrders = async () => {
        setLoading(true)
        try {
            const data = await getOrders()
            const mapped = data.map(o => ({
                id: o.id,
                orderNumber: o.order_number,
                customerName: o.customer_name,
                customerEmail: o.customer_email,
                orderDate: o.order_date,
                expectedDate: o.expected_date || "",
                reference: o.reference || "",
                status: o.status,
                lineItems: o.sales_order_items?.map(li => ({
                    id: li.id,
                    productName: li.product_name,
                    description: li.description || "",
                    qty: li.qty,
                    unitPrice: li.unit_price,
                    taxPercent: li.tax_percent
                })) || [],
                notes: o.notes || "",
                termsAndConditions: o.terms_and_conditions || "",
                discount: Number(o.discount),
                discountType: o.discount_type,
                total: Number(o.total)
            }))
            setOrders(mapped)
        } catch (error) {
            toast.error("Failed to fetch orders")
        } finally {
            setLoading(false)
        }
    }

    const filteredOrders = orders.filter((o) => {
        const matchesSearch =
            o.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            o.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = filterStatus === "all" || o.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this sales order?")) return
        const { error } = await deleteOrder(id)
        if (error) {
            toast.error(error)
        } else {
            toast.success("Order deleted")
            fetchOrders()
        }
    }

    const totalOrders = orders.length
    const confirmedOrders = orders.filter(o => o.status === "CONFIRMED").length
    const processingOrders = orders.filter(o => o.status === "PROCESSING").length
    const totalPipeline = orders.reduce((acc, o) => acc + calcOrderTotal(o), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
                    <p className="text-muted-foreground mt-1">Manage standard orders and fulfillments</p>
                </div>
                <Button size="sm" onClick={() => router.push("/sales/orders/new")}>
                    <Plus className="mr-2 h-4 w-4" /> New Order
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <FileBarChart2 className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Orders</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">{totalOrders}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-blue-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Confirmed</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-blue-500">{confirmedOrders}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <Box className="h-4 w-4 text-orange-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Processing</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-orange-500">{processingOrders}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-primary" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Value</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-primary">{formatCurrency(totalPipeline)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
                        <div className="relative max-w-sm w-full flex-1">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search by order # or customer..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Badge
                                variant={filterStatus === "all" ? "default" : "outline"}
                                className="cursor-pointer px-3 py-1"
                                onClick={() => setFilterStatus("all")}
                            >
                                All
                            </Badge>
                            {(Object.keys(statusConfig) as SalesOrderStatus[]).map((s) => {
                                const cfg = statusConfig[s]
                                return (
                                    <Badge
                                        key={s}
                                        variant={filterStatus === s ? "default" : "outline"}
                                        className="cursor-pointer px-3 py-1 capitalize"
                                        onClick={() => setFilterStatus(s)}
                                    >
                                        {cfg.label}
                                    </Badge>
                                )
                            })}
                        </div>
                    </div>

                    <div className="rounded-md border bg-muted/30">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Order #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Expected</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No orders found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredOrders.map((o) => {
                                        const cfg = statusConfig[o.status as SalesOrderStatus]
                                        const StatusIcon = cfg.icon
                                        return (
                                            <TableRow key={o.id}>
                                                <TableCell className="font-medium">{o.orderNumber}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{o.customerName}</span>
                                                        <span className="text-xs text-muted-foreground">{o.customerEmail}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{formatDate(o.orderDate)}</TableCell>
                                                <TableCell className="text-sm">{formatDate(o.expectedDate)}</TableCell>
                                                <TableCell className="text-center font-mono">{o.lineItems.length}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(o.total || calcOrderTotal(o))}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={cfg.variant} className="flex w-fit items-center gap-1.5">
                                                        <StatusIcon className="h-3 w-3" />
                                                        {cfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => router.push(`/sales/orders/${o.id}`)}>
                                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(o.id!)}>
                                                        <Trash2 className="h-4 w-4 text-destructive" />
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        )
                                    })
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
