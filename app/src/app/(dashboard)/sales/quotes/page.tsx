"use client"
import { useEffect, useState } from "react"
import { getQuotes, deleteQuote } from "@/app/actions/sales/quotes"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Search, Plus, Pencil, Trash2, Send, FileText, CheckCircle2, XCircle, Clock, FileBarChart2 } from "lucide-react"

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
import { QuoteFormData, QuoteStatus } from "@/components/sales/quote-form"

/* ── Status config ── */
const statusConfig: Record<QuoteStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: "Draft", variant: "secondary", icon: FileText },
    SENT: { label: "Sent", variant: "default", icon: Send },
    ACCEPTED: { label: "Accepted", variant: "outline", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
    EXPIRED: { label: "Expired", variant: "secondary", icon: Clock },
}

// initialQuotes removed

/* ── Helpers ── */
function calcQuoteTotal(q: QuoteFormData) {
    const subtotal = q.lineItems.reduce((s, li) => s + li.qty * li.unitPrice, 0)
    const tax = q.lineItems.reduce((s, li) => s + li.qty * li.unitPrice * (li.taxPercent / 100), 0)
    const disc = q.discountType === "PERCENT" ? subtotal * (q.discount / 100) : q.discount
    return subtotal + tax - disc
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

export default function QuotesPage() {
    const router = useRouter()
    const [quotes, setQuotes] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<"all" | QuoteStatus>("all")

    useEffect(() => {
        fetchQuotes()
    }, [])

    const fetchQuotes = async () => {
        setLoading(true)
        try {
            const data = await getQuotes()
            // Map DB fields to Component expected fields if necessary
            const mapped = data.map(q => ({
                id: q.id,
                quoteNumber: q.quote_number,
                customerName: q.customer_name,
                customerEmail: q.customer_email,
                quoteDate: q.quote_date,
                validUntil: q.valid_until || "",
                reference: q.reference || "",
                status: q.status,
                lineItems: q.quote_items?.map(li => ({
                    id: li.id,
                    productName: li.product_name,
                    description: li.description || "",
                    qty: li.qty,
                    unitPrice: li.unit_price,
                    taxPercent: li.tax_percent
                })) || [],
                notes: q.notes || "",
                termsAndConditions: q.terms_and_conditions || "",
                discount: Number(q.discount),
                discountType: q.discount_type,
                total: Number(q.total)
            }))
            setQuotes(mapped)
        } catch (error) {
            toast.error("Failed to fetch quotes")
        } finally {
            setLoading(false)
        }
    }

    const filteredQuotes = quotes.filter((q) => {
        const matchesSearch =
            q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = filterStatus === "all" || q.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const handleDelete = async (id: string) => {
        if (!confirm("Are you sure you want to delete this quotation?")) return
        const { error } = await deleteQuote(id)
        if (error) {
            toast.error(error)
        } else {
            toast.success("Quote deleted")
            fetchQuotes()
        }
    }

    const totalQuotes = quotes.length
    const sentQuotes = quotes.filter(q => q.status === "SENT").length
    const acceptedQuotes = quotes.filter(q => q.status === "ACCEPTED").length
    const totalPipeline = quotes.reduce((acc, q) => acc + calcQuoteTotal(q), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Quotations</h1>
                    <p className="text-muted-foreground mt-1">Manage standard estimates and proposals</p>
                </div>
                <Button size="sm" onClick={() => router.push("/sales/quotes/new")}>
                    <Plus className="mr-2 h-4 w-4" /> New Quote
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <FileBarChart2 className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Quotes</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">{totalQuotes}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-blue-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sent Quotes</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-blue-500">{sentQuotes}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Accepted</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-emerald-500">{acceptedQuotes}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
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
                                onClick={() => setFilterStatus("all")}
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
                                    <TableHead>Quote #</TableHead>
                                    <TableHead>Customer</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Valid Until</TableHead>
                                    <TableHead className="text-center">Items</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredQuotes.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No quotations found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredQuotes.map((q) => {
                                        const cfg = statusConfig[q.status as QuoteStatus]
                                        const StatusIcon = cfg.icon
                                        return (
                                            <TableRow key={q.id}>
                                                <TableCell className="font-medium">{q.quoteNumber}</TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{q.customerName}</span>
                                                        <span className="text-xs text-muted-foreground">{q.customerEmail}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{formatDate(q.quoteDate)}</TableCell>
                                                <TableCell className="text-sm">{formatDate(q.validUntil)}</TableCell>
                                                <TableCell className="text-center font-mono">{q.lineItems.length}</TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(q.total || calcQuoteTotal(q))}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={cfg.variant} className="flex w-fit items-center gap-1.5">
                                                        <StatusIcon className="h-3 w-3" />
                                                        {cfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button variant="ghost" size="icon" onClick={() => router.push(`/sales/quotes/${q.id}/edit`)}>
                                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button variant="ghost" size="icon" onClick={() => handleDelete(q.id!)}>
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
