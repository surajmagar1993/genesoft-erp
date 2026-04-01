"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, Plus, Pencil, Trash2, Box, Package, CheckCircle2, XCircle, Clock, FileBarChart2, Loader2 } from "lucide-react"
import { toast } from "sonner"

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
import { SalesOrderStatus, deleteOrder, type SalesOrderDB } from "@/app/actions/sales/orders"

const statusConfig: Record<SalesOrderStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: "Draft", variant: "secondary", icon: Clock },
    CONFIRMED: { label: "Confirmed", variant: "outline", icon: CheckCircle2 },
    PROCESSING: { label: "Processing", variant: "secondary", icon: Box },
    SHIPPED: { label: "Shipped", variant: "default", icon: Package },
    DELIVERED: { label: "Delivered", variant: "outline", icon: CheckCircle2 },
    CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

interface Props {
    initialOrders: SalesOrderDB[]
    total: number
}

export default function OrdersClient({ initialOrders, total }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Sync state with URL params
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
    const [filterStatus, setFilterStatus] = useState<string>(searchParams.get("status") || "all")
    const [pendingId, setPendingId] = useState<string | null>(null)

    // Update URL when filters change
    const updateUrl = (newParams: Record<string, string | number | null>) => {
        const params = new URLSearchParams(searchParams.toString())
        Object.entries(newParams).forEach(([key, value]) => {
            if (value === null || value === "all") {
                params.delete(key)
            } else {
                params.set(key, value.toString())
            }
        })
        if (!newParams.page && (newParams.search !== undefined || newParams.status !== undefined)) {
            params.set("page", "1")
        }
        router.push(`${pathname}?${params.toString()}`)
    }

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            if (searchQuery !== (searchParams.get("search") || "")) {
                updateUrl({ search: searchQuery })
            }
        }, 500)
        return () => clearTimeout(timer)
    }, [searchQuery])

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure?")) return
        setPendingId(id)
        startTransition(async () => {
            const { error } = await deleteOrder(id)
            if (error) toast.error(error)
            else {
                toast.success("Order deleted")
                router.refresh()
            }
            setPendingId(null)
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Sales Orders</h1>
                    <p className="text-muted-foreground mt-1">Manage orders and fulfillments</p>
                </div>
                <Button size="sm" onClick={() => router.push("/sales/orders/new")}>
                    <Plus className="mr-2 h-4 w-4" /> New Order
                </Button>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2"><FileBarChart2 className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium uppercase">Total Orders</p></div>
                    <p className="text-2xl font-bold mt-1">{total}</p>
                </CardContent></Card>
            </div>

            {/* Search & Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between mb-6">
                        <div className="relative max-w-sm w-full flex-1">
                            {isPending ? <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />}
                            <Input
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
                                onClick={() => { setFilterStatus("all"); updateUrl({ status: "all" }) }}
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
                                        onClick={() => { setFilterStatus(s); updateUrl({ status: s }) }}
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
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialOrders.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No orders found.</TableCell></TableRow>
                                ) : initialOrders.map((o) => {
                                    const cfg = statusConfig[o.status as SalesOrderStatus]
                                    const StatusIcon = cfg.icon
                                    return (
                                        <TableRow key={o.id}>
                                            <TableCell className="font-medium">{o.order_number}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col"><span className="font-medium">{o.customer_name}</span><span className="text-xs text-muted-foreground">{o.customer_email}</span></div>
                                            </TableCell>
                                            <TableCell className="text-sm">{formatDate(o.order_date)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(Number(o.total))}</TableCell>
                                            <TableCell><Badge variant={cfg.variant} className="flex w-fit items-center gap-1.5"><StatusIcon className="h-3 w-3" />{cfg.label}</Badge></TableCell>
                                            <TableCell className="text-right flex items-center justify-end gap-1">
                                                <Button variant="ghost" size="icon" onClick={() => router.push(`/sales/orders/${o.id}/edit`)}>
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                                <Button variant="ghost" size="icon" disabled={pendingId === o.id} onClick={() => handleDelete(o.id)}>
                                                    {pendingId === o.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
