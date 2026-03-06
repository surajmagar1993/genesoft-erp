"use client"

import { useState } from "react"
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

/* ── Mock data ── */
const initialQuotes: QuoteFormData[] = [
    {
        id: "1",
        quoteNumber: "QTN-001",
        customerName: "Acme Corporation",
        customerEmail: "procurement@acme.com",
        quoteDate: "2026-03-01",
        validUntil: "2026-03-31",
        reference: "PO-2026-100",
        status: "SENT",
        lineItems: [
            { id: "l1", productName: "Dell OptiPlex 3000 Desktop", description: "Intel Core i5, 8GB RAM, 256GB SSD", qty: 5, unitPrice: 42000, taxPercent: 18 },
            { id: "l2", productName: "Cloud Hosting & Maintenance", description: "Annual AWS hosting", qty: 1, unitPrice: 25000, taxPercent: 18 },
        ],
        notes: "Priority order — customer needs delivery by month-end.",
        termsAndConditions: "Payment due within 30 days.",
        discount: 5,
        discountType: "PERCENT",
    },
    {
        id: "2",
        quoteNumber: "QTN-002",
        customerName: "Nexora Tech Pvt Ltd",
        customerEmail: "it@nexora.in",
        quoteDate: "2026-03-03",
        validUntil: "2026-04-03",
        reference: "",
        status: "DRAFT",
        lineItems: [
            { id: "l3", productName: "Ubiquiti UniFi AP AC Pro", description: "Enterprise Wi-Fi AP", qty: 10, unitPrice: 12500, taxPercent: 18 },
        ],
        notes: "",
        termsAndConditions: "Standard terms apply.",
        discount: 0,
        discountType: "PERCENT",
    },
    {
        id: "3",
        quoteNumber: "QTN-003",
        customerName: "StarLane Interiors",
        customerEmail: "finance@starlane.in",
        quoteDate: "2026-02-15",
        validUntil: "2026-03-15",
        reference: "SL-RFQ-22",
        status: "ACCEPTED",
        lineItems: [
            { id: "l4", productName: "Custom Website Development", description: "Corporate site with CMS", qty: 1, unitPrice: 50000, taxPercent: 18 },
            { id: "l5", productName: "Cloud Hosting & Maintenance", description: "1 year hosting", qty: 1, unitPrice: 25000, taxPercent: 18 },
        ],
        notes: "Site should be live by April.",
        termsAndConditions: "50% advance, 50% on delivery.",
        discount: 10000,
        discountType: "FIXED",
    },
    {
        id: "4",
        quoteNumber: "QTN-004",
        customerName: "BluePeak Solutions",
        customerEmail: "admin@bluepeak.io",
        quoteDate: "2026-01-20",
        validUntil: "2026-02-20",
        reference: "",
        status: "EXPIRED",
        lineItems: [
            { id: "l6", productName: "Dell OptiPlex 3000 Desktop", description: "Desktop PC", qty: 3, unitPrice: 42000, taxPercent: 18 },
        ],
        notes: "",
        termsAndConditions: "Standard terms.",
        discount: 0,
        discountType: "PERCENT",
    },
    {
        id: "5",
        quoteNumber: "QTN-005",
        customerName: "GreenField Agro",
        customerEmail: "ops@greenfield.co",
        quoteDate: "2026-03-05",
        validUntil: "2026-04-05",
        reference: "GF-IT-2026",
        status: "REJECTED",
        lineItems: [
            { id: "l7", productName: "Custom Website Development", description: "E-commerce platform", qty: 1, unitPrice: 80000, taxPercent: 18 },
        ],
        notes: "Customer went with a competitor.",
        termsAndConditions: "Standard terms.",
        discount: 0,
        discountType: "PERCENT",
    },
]

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
    const [quotes, setQuotes] = useState<QuoteFormData[]>(initialQuotes)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<"all" | QuoteStatus>("all")

    const filteredQuotes = quotes.filter((q) => {
        const matchesSearch =
            q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = filterStatus === "all" || q.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const handleDelete = (id: string) => {
        setQuotes((prev) => prev.filter((q) => q.id !== id))
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
                                        const cfg = statusConfig[q.status]
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
                                                    {formatCurrency(calcQuoteTotal(q))}
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
