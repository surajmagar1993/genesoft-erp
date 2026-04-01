"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, Plus, Pencil, Trash2, Send, FileText, CheckCircle2, XCircle, Clock, FileBarChart2, ShoppingCart, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { QuoteStatus } from "@/components/sales/quote-form"
import { deleteQuote, type QuoteDB } from "@/app/actions/sales/quotes"
import { convertQuoteToOrder } from "@/app/actions/sales/orders"

const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: "Draft", variant: "secondary", icon: FileText },
    SENT: { label: "Sent", variant: "default", icon: Send },
    ACCEPTED: { label: "Accepted", variant: "outline", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
    EXPIRED: { label: "Expired", variant: "secondary", icon: Clock },
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

interface Props {
    initialQuotes: QuoteDB[]
    total: number
}

export default function QuotesClient({ initialQuotes, total }: Props) {
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
            const { error } = await deleteQuote(id)
            if (error) toast.error(error)
            else {
                toast.success("Quote deleted")
                router.refresh()
            }
            setPendingId(null)
        })
    }

    const handleConvertToOrder = async (id: string) => {
        if (!confirm("Convert to sales order?")) return
        setPendingId(id)
        startTransition(async () => {
            const { orderId, error } = await convertQuoteToOrder(id)
            if (error) toast.error(error)
            else {
                toast.success("Converted successfully")
                if (orderId) router.push(`/sales/orders/${orderId}`)
                else router.refresh()
            }
            setPendingId(null)
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
                    <p className="text-muted-foreground mt-1">Manage estimates and proposals</p>
                </div>
                <Button size="sm" onClick={() => router.push("/sales/quotes/new")}>
                    <Plus className="mr-2 h-4 w-4" /> New Quote
                </Button>
            </div>

            {/* Stats - Approximate based on current page for now, or fetch separately if needed */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card><CardContent className="pt-4 pb-3">
                    <div className="flex items-center gap-2"><FileBarChart2 className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium uppercase">Total</p></div>
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
                                placeholder="Search by quote # or customer..."
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
                            {(Object.keys(statusConfig) as QuoteStatus[]).map((s) => {
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
                                    <TableHead>Quote #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialQuotes.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-24 text-center">No quotations found.</TableCell></TableRow>
                                ) : initialQuotes.map((q) => {
                                    const cfg = statusConfig[q.status as QuoteStatus]
                                    const StatusIcon = cfg.icon
                                    return (
                                        <TableRow key={q.id}>
                                            <TableCell className="font-medium">{q.quote_number}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col"><span className="font-medium">{q.customer_name}</span><span className="text-xs text-muted-foreground">{q.customer_email}</span></div>
                                            </TableCell>
                                            <TableCell className="text-sm">{formatDate(q.quote_date)}</TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(Number(q.total))}</TableCell>
                                            <TableCell><Badge variant={cfg.variant} className="flex w-fit items-center gap-1.5"><StatusIcon className="h-3 w-3" />{cfg.label}</Badge></TableCell>
                                            <TableCell className="text-right flex items-center justify-end gap-1">
                                                {q.status !== "ACCEPTED" && q.status !== "REJECTED" && (
                                                    <Button variant="ghost" size="icon" disabled={pendingId === q.id} onClick={() => handleConvertToOrder(q.id)}>
                                                        <ShoppingCart className="h-4 w-4 text-emerald-600" />
                                                    </Button>
                                                )}
                                                <Button variant="ghost" size="icon" onClick={() => router.push(`/sales/quotes/${q.id}/edit`)}>
                                                    <Pencil className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                                <Button variant="ghost" size="icon" disabled={pendingId === q.id} onClick={() => handleDelete(q.id)}>
                                                    {pendingId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive" />}
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
