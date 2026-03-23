"use client"

import { useState, useTransition } from "react"
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
import { InvoiceStatus } from "@/components/sales/invoice-form"
import { InvoiceDB, deleteInvoice } from "@/app/actions/sales/invoices"

/* ── Status config ── */
const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: "Draft", variant: "secondary", icon: FileText },
    SENT: { label: "Sent", variant: "default", icon: Send },
    ACCEPTED: { label: "Accepted", variant: "outline", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
    EXPIRED: { label: "Expired", variant: "secondary", icon: Clock },
}

/* ── Helpers ── */
function calcInvoiceTotal(inv: InvoiceDB) {
    const items = inv.invoice_line_items ?? []
    const subtotal = items.reduce((s, li) => s + li.qty * li.unit_price, 0)
    const tax = items.reduce((s, li) => s + li.qty * li.unit_price * (li.tax_percent / 100), 0)
    const disc = inv.discount_type === "PERCENT" ? subtotal * (inv.discount / 100) : inv.discount
    return subtotal + tax - disc
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

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
    const [isPending, startTransition] = useTransition()

    const filteredInvoices = invoices.filter((inv) => {
        const matchesSearch =
            inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
            inv.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = filterStatus === "all" || inv.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const handleDelete = (id: string) => {
        startTransition(async () => {
            const { error } = await deleteInvoice(id)
            if (!error) {
                setInvoices((prev) => prev.filter((inv) => inv.id !== id))
            }
        })
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
                                placeholder="Search by invoice # or customer..."
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
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-medium">{inv.invoice_number}</TableCell>
                                                <TableCell>
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
                                                    {formatCurrency(calcInvoiceTotal(inv))}
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
