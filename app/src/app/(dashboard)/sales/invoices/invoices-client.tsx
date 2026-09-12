"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Search, Plus, Pencil, Trash2, Send, FileText, CheckCircle2, XCircle, Clock, FileBarChart2, Download, Loader2 } from "lucide-react"

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
import { InvoiceStatus } from "@/components/sales/invoice-form"
import { InvoiceDB, deleteInvoice, sendInvoiceEmail } from "@/app/actions/sales/invoices"

/* ── Status config ── */
const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: "Draft", variant: "secondary", icon: FileText },
    SENT: { label: "Sent", variant: "default", icon: Send },
    ACCEPTED: { label: "Accepted", variant: "outline", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
    EXPIRED: { label: "Expired", variant: "secondary", icon: Clock },
    PAID: { label: "Paid", variant: "default", icon: CheckCircle2 },
    PARTIALLY_PAID: { label: "Partially Paid", variant: "outline", icon: Clock },
    OVERDUE: { label: "Overdue", variant: "destructive", icon: Clock },
    CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
}

import { formatCurrency } from "@/lib/utils"

function calcInvoiceTotal(inv: InvoiceDB) {
    const items = inv.invoice_line_items ?? []
    const subtotal = items.reduce((s, li) => s + li.qty * li.unit_price, 0)
    const tax = items.reduce((s, li) => s + li.qty * li.unit_price * (li.tax_percent / 100), 0)
    const disc = inv.discount_type === "PERCENT" ? subtotal * (inv.discount / 100) : inv.discount
    return subtotal + tax - disc
}

const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

interface Props {
    invoices: InvoiceDB[]
}

export default function InvoicesClient({ invoices: initialInvoices }: Props) {
    const router = useRouter()
    const [invoices, setInvoices] = useState<InvoiceDB[]>(initialInvoices)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<"all" | InvoiceStatus>("all")
    const [filterType, setFilterType] = useState<"all" | "TAX_INVOICE" | "PROFORMA">("all")
    const [isPending, startTransition] = useTransition()

    const filteredInvoices = invoices.filter((inv) => {
        const matchesSearch =
            inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = filterStatus === "all" || inv.status === filterStatus
        const matchesType =
            filterType === "all" ||
            (filterType === "PROFORMA" ? inv.type === "PROFORMA" : inv.type !== "PROFORMA")
        return matchesSearch && matchesStatus && matchesType
    })

    const handleDelete = (id: string) => {
        startTransition(async () => {
            const { error } = await deleteInvoice(id)
            if (!error) {
                setInvoices((prev) => prev.filter((inv) => inv.id !== id))
            }
        })
    }

    const handleDownload = (id: string, invoiceNumber: string) => {
        const a = document.createElement("a")
        a.href = `/api/invoices/${id}/pdf`
        a.download = `Invoice-${invoiceNumber}.pdf`
        a.click()
    }

    const [sendingId, setSendingId] = useState<string | null>(null)

    const handleSendEmail = async (id: string) => {
        setSendingId(id)
        const { error } = await sendInvoiceEmail(id)
        setSendingId(null)
        if (error) {
            alert(`Failed to send: ${error}`)
        } else {
            setInvoices((prev) =>
                prev.map((inv) => (inv.id === id ? { ...inv, status: "SENT" as const } : inv))
            )
        }
    }

    const totalInvoices = invoices.length
    const sentInvoices = invoices.filter((inv) => inv.status === "SENT").length
    const acceptedInvoices = invoices.filter((inv) => inv.status === "ACCEPTED").length
    const totalPipeline = invoices.reduce((acc, inv) => acc + calcInvoiceTotal(inv), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
                    <p className="text-muted-foreground mt-1">Manage billing and customer invoices</p>
                </div>
                <Button size="sm" onClick={() => router.push("/sales/invoices/new")}>
                    <Plus className="mr-2 h-4 w-4" /> New Invoice
                </Button>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <FileBarChart2 className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Invoices</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">{totalInvoices}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <Send className="h-4 w-4 text-blue-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Sent Invoices</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-blue-500">{sentInvoices}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Accepted</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-emerald-500">{acceptedInvoices}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-primary" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Value</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-primary">
                            {formatCurrency(totalPipeline, invoices[0]?.currency_code || "INR")}
                        </p>
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
                                placeholder="Search by invoice # or customer..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {/* Document Type Tabs */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex rounded-md border p-0.5 bg-muted/40">
                                <Button
                                    type="button"
                                    variant={filterType === "all" ? "default" : "ghost"}
                                    size="sm"
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setFilterType("all")}
                                >
                                    All ({invoices.length})
                                </Button>
                                <Button
                                    type="button"
                                    variant={filterType === "TAX_INVOICE" ? "default" : "ghost"}
                                    size="sm"
                                    className="h-7 text-xs px-2.5"
                                    onClick={() => setFilterType("TAX_INVOICE")}
                                >
                                    Tax Invoices ({invoices.filter((i) => i.type !== "PROFORMA").length})
                                </Button>
                                <Button
                                    type="button"
                                    variant={filterType === "PROFORMA" ? "default" : "ghost"}
                                    size="sm"
                                    className="h-7 text-xs px-2.5 text-amber-700 dark:text-amber-400"
                                    onClick={() => setFilterType("PROFORMA")}
                                >
                                    Proforma ({invoices.filter((i) => i.type === "PROFORMA").length})
                                </Button>
                            </div>

                            <div className="flex flex-wrap gap-1.5 ml-auto">
                                <Badge
                                    variant={filterStatus === "all" ? "default" : "outline"}
                                    className="cursor-pointer px-2.5 py-1 text-xs"
                                    onClick={() => setFilterStatus("all")}
                                >
                                    All Statuses
                                </Badge>
                            {(Object.keys(statusConfig) as InvoiceStatus[]).map((s) => {
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
                </div>

                    <div className="rounded-md border bg-muted/30">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Invoice #</TableHead>
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
                                {filteredInvoices.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                                            No invoices found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    filteredInvoices.map((inv) => {
                                        const cfg = statusConfig[inv.status]
                                        const StatusIcon = cfg.icon
                                        return (
                                            <TableRow key={inv.id} className="cursor-pointer hover:bg-muted/40">
                                                <TableCell className="font-medium" onClick={() => router.push(`/sales/invoices/${inv.id}`)}>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-primary">{inv.invoice_number}</span>
                                                        {inv.type === "PROFORMA" && (
                                                            <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 font-bold uppercase">
                                                                PROFORMA
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell onClick={() => router.push(`/sales/invoices/${inv.id}`)}>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{inv.customer_name}</span>
                                                        <span className="text-xs text-muted-foreground">{inv.customer_email}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-sm">{formatDate(inv.invoice_date)}</TableCell>
                                                <TableCell className="text-sm">{formatDate(inv.valid_until)}</TableCell>
                                                <TableCell className="text-center font-mono">
                                                    {(inv.invoice_line_items ?? []).length}
                                                </TableCell>
                                                <TableCell className="text-right font-medium">
                                                    {formatCurrency(calcInvoiceTotal(inv), inv.currency_code)}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={cfg.variant} className="flex w-fit items-center gap-1.5">
                                                        <StatusIcon className="h-3 w-3" />
                                                        {cfg.label}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Download PDF"
                                                        onClick={() => handleDownload(inv.id, inv.invoice_number)}
                                                    >
                                                        <Download className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Send to customer"
                                                        disabled={sendingId === inv.id}
                                                        onClick={() => handleSendEmail(inv.id)}
                                                    >
                                                        {sendingId === inv.id
                                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                                            : <Send className="h-4 w-4 text-blue-500" />}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        onClick={() => router.push(`/sales/invoices/${inv.id}/edit`)}
                                                    >
                                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        disabled={isPending}
                                                        onClick={() => handleDelete(inv.id)}
                                                    >
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
