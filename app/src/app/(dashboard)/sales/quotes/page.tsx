"use client"

import { useState } from "react"
import { Search, Plus, Pencil, Trash2, Send, FileText, CheckCircle2, XCircle, Clock } from "lucide-react"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"

import {
    QuoteFormDialog,
    QuoteFormData,
    QuoteStatus,
} from "@/components/sales/quote-form-dialog"

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
    const [quotes, setQuotes] = useState<QuoteFormData[]>(initialQuotes)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<"all" | QuoteStatus>("all")
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editingQuote, setEditingQuote] = useState<QuoteFormData | null>(null)

    const filteredQuotes = quotes.filter((q) => {
        const matchesSearch =
            q.quoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
            q.customerName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = filterStatus === "all" || q.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const handleCreate = () => {
        setEditingQuote(null)
        setDialogOpen(true)
    }

    const handleEdit = (quote: QuoteFormData) => {
        setEditingQuote(quote)
        setDialogOpen(true)
    }

    const handleDelete = (id: string) => {
        setQuotes((prev) => prev.filter((q) => q.id !== id))
    }

    const handleSave = (data: QuoteFormData) => {
        if (editingQuote) {
            setQuotes((prev) =>
                prev.map((q) => (q.id === editingQuote.id ? { ...q, ...data } : q))
            )
        } else {
            const newQuote: QuoteFormData = { ...data, id: Date.now().toString() }
            setQuotes((prev) => [newQuote, ...prev])
        }
    }

    return (
        <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex items-center justify-between space-y-2">
                <h2 className="text-3xl font-bold tracking-tight">Quotations</h2>
                <div className="flex items-center space-x-2">
                    <Button onClick={handleCreate}>
                        <Plus className="mr-2 h-4 w-4" /> New Quote
                    </Button>
                </div>
            </div>

            <div className="flex items-center gap-4 flex-wrap">
                <div className="relative max-w-sm flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder="Search by quote # or customer..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
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

            <div className="rounded-md border bg-card">
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
                                            <Button variant="ghost" size="icon" onClick={() => handleEdit(q)}>
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

            <QuoteFormDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                initialData={editingQuote}
                onSave={handleSave}
            />
        </div>
    )
}
