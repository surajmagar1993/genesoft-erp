"use client"

import { confirmAction } from "@/components/confirm-dialog"
import Link from "next/link"
import { localeForCurrency } from "@/lib/utils"
import { useState, useTransition, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, Plus, Pencil, Trash2, FileText, Send, CheckCircle2, XCircle, Clock, MoreHorizontal, Download, Eye, Loader2, Receipt, Palette } from "lucide-react"
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import { InvoiceStatus, type InvoiceDB, deleteInvoice, sendInvoiceEmail } from "@/app/actions/sales/invoices"

import { PageHeader } from "@/components/ui/page-header"
import { RequireRole } from "@/components/auth/role-context"

const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive"; icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: "Draft", variant: "secondary", icon: Clock },
    SENT: { label: "Sent", variant: "outline", icon: Send },
    ACCEPTED: { label: "Accepted", variant: "default", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
    EXPIRED: { label: "Expired", variant: "outline", icon: XCircle },
    PAID: { label: "Paid", variant: "default", icon: CheckCircle2 },
    PARTIALLY_PAID: { label: "Partially Paid", variant: "outline", icon: Clock },
    OVERDUE: { label: "Overdue", variant: "destructive", icon: Clock },
    CANCELLED: { label: "Cancelled", variant: "destructive", icon: XCircle },
}

const formatCurrency = (amount: number, currency = "INR") =>
    new Intl.NumberFormat(localeForCurrency(currency), { style: "currency", currency }).format(amount)

// Document dates are stored at midnight UTC: show that date for every viewer (no day shift, same on server and browser)
const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" })
}

interface Props {
    initialInvoices: InvoiceDB[]
    total: number
}

export default function InvoicesClient({ initialInvoices, total }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Sync state with URL params
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
    const [filterStatus, setFilterStatus] = useState<string>(searchParams.get("status") || "all")
    const [filterType, setFilterType] = useState<string>(searchParams.get("type") || "all")
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
        if (!newParams.page && (newParams.search !== undefined || newParams.status !== undefined || newParams.type !== undefined)) {
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
        if (!(await confirmAction({ title: "Delete this invoice?", description: "Its payments, ledger entries and stock movements are reversed. This can't be undone.", confirmLabel: "Delete invoice" }))) return
        setPendingId(id)
        startTransition(async () => {
            const { error } = await deleteInvoice(id)
            if (error) toast.error(error)
            else {
                toast.success("Invoice deleted")
                router.refresh()
            }
            setPendingId(null)
        })
    }

    const handleSendEmail = async (id: string) => {
        setPendingId(id)
        startTransition(async () => {
            const { error } = await sendInvoiceEmail(id)
            if (error) toast.error(error)
            else {
                toast.success("Invoice sent to customer")
                router.refresh()
            }
            setPendingId(null)
        })
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-700">
            <PageHeader 
                title="Invoices" 
                description="Manage billing and customer payments"
                icon={Receipt}
                action={{
                    label: "New Invoice",
                    icon: Plus,
                    onClick: () => router.push("/sales/invoices/new")
                }}
            />

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-primary">
                            <FileText className="h-4 w-4" />
                            <p className="text-xs font-bold uppercase tracking-wider">Total Invoices</p>
                        </div>
                        <p className="text-2xl font-bold mt-2 text-foreground">{total}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filters */}
            <Card className="border-none shadow-sm overflow-hidden ring-1 ring-border">
                <div className="bg-card p-4 sm:p-6 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="relative max-w-md w-full">
                            {isPending ? <Loader2 className="absolute left-3 top-3 h-4 w-4 animate-spin text-primary" /> : <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />}
                            <Input
                                placeholder="Search by invoice number or customer name..."
                                className="pl-10 h-10 bg-background transition-all text-xs sm:text-sm"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                            {/* Document Type Filter */}
                            <div className="flex overflow-x-auto max-w-full rounded-lg border p-1 bg-muted">
                                <button
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filterType === "all" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                    onClick={() => { setFilterType("all"); updateUrl({ type: "all" }) }}
                                >
                                    All Invoices
                                </button>
                                <button
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filterType === "TAX_INVOICE" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                    onClick={() => { setFilterType("TAX_INVOICE"); updateUrl({ type: "TAX_INVOICE" }) }}
                                >
                                    Tax Invoices
                                </button>
                                <button
                                    className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${filterType === "PROFORMA" ? "bg-background text-amber-700 dark:text-amber-400 shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                    onClick={() => { setFilterType("PROFORMA"); updateUrl({ type: "PROFORMA" }) }}
                                >
                                    Proforma Invoices
                                </button>
                            </div>

                            {/* Status Filter */}
                            <div className="flex flex-wrap gap-1.5 p-1 bg-muted rounded-lg">
                                <button
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === "all" ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                    onClick={() => { setFilterStatus("all"); updateUrl({ status: "all" }) }}
                                >
                                    All Statuses
                                </button>
                                {(Object.keys(statusConfig) as InvoiceStatus[]).map((s) => {
                                    const cfg = statusConfig[s]
                                    return (
                                        <button
                                            key={s}
                                            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${filterStatus === s ? "bg-background text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                                            onClick={() => { setFilterStatus(s); updateUrl({ status: s }) }}
                                        >
                                            {cfg.label}
                                        </button>
                                    )
                                })}
                            </div>

                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs gap-1.5 "
                                onClick={() => router.push("/sales/invoices/templates")}
                            >
                                <Palette className="h-3.5 w-3.5 text-primary" />
                                Templates
                            </Button>
                        </div>
                    </div>

                    {/* Phones: one card per invoice with what matters (number, customer, total, status) */}
                    <ul className="md:hidden divide-y rounded-xl border">
                        {initialInvoices.length === 0 ? (
                            <li className="p-6 text-center text-sm text-muted-foreground">No invoices found.</li>
                        ) : initialInvoices.map((inv) => {
                            const cfg = statusConfig[inv.status as InvoiceStatus]
                            return (
                                <li key={inv.id}>
                                    <Link href={`/sales/invoices/${inv.id}`} className="flex items-start justify-between gap-3 p-4 hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                                        <div className="min-w-0">
                                            <p className="font-semibold text-primary truncate">
                                                {inv.invoice_number}
                                                {inv.type === "PROFORMA" && <span className="ml-2 text-xs font-medium text-amber-700 dark:text-amber-400">Proforma</span>}
                                            </p>
                                            <p className="text-sm truncate">{inv.customer_name}</p>
                                            <p className="text-xs text-muted-foreground">{formatDate(inv.invoice_date)}</p>
                                        </div>
                                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                                            <span className="font-semibold tabular-nums">{formatCurrency(Number(inv.total || 0), inv.currency_code)}</span>
                                            <Badge variant={cfg.variant} className="capitalize">{cfg.label}</Badge>
                                        </div>
                                    </Link>
                                </li>
                            )
                        })}
                    </ul>

                    <div className="hidden md:block rounded-xl border overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead className="font-semibold text-foreground">Invoice #</TableHead>
                                    <TableHead className="font-semibold text-foreground">Customer</TableHead>
                                    <TableHead className="hidden md:table-cell font-semibold text-foreground">Date</TableHead>
                                    <TableHead className="text-right font-semibold text-foreground">Total</TableHead>
                                    <TableHead className="font-semibold text-foreground">Status</TableHead>
                                    <TableHead className="text-right font-semibold text-foreground">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialInvoices.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-muted-foreground italic">No invoices found.</TableCell></TableRow>
                                ) : initialInvoices.map((inv) => {
                                    const cfg = statusConfig[inv.status as InvoiceStatus]
                                    const StatusIcon = cfg.icon
                                    
                                    const totalAmount = Number(inv.total || 0)

                                    return (
                                        <TableRow key={inv.id} className="hover:bg-muted/50 transition-colors cursor-pointer" onClick={() => router.push(`/sales/invoices/${inv.id}`)}>
                                            <TableCell className="font-bold text-primary">
                                                <div className="flex items-center gap-2">
                                                    <Link href={`/sales/invoices/${inv.id}`} className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm" onClick={(e) => e.stopPropagation()}>
                                                        {inv.invoice_number}
                                                    </Link>
                                                    {inv.type === "PROFORMA" && (
                                                        <Badge variant="outline" className="text-xs border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/10 font-bold uppercase px-2 py-0.5">
                                                            PROFORMA
                                                        </Badge>
                                                    )}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">{inv.customer_name}</span>
                                                    <span className="hidden sm:block text-xs text-muted-foreground">{inv.customer_email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm font-medium text-muted-foreground whitespace-nowrap">{formatDate(inv.invoice_date)}</TableCell>
                                            <TableCell className="text-right font-semibold tabular-nums whitespace-nowrap">{formatCurrency(totalAmount, inv.currency_code)}</TableCell>
                                            <TableCell>
                                                <Badge variant={cfg.variant} className="flex w-fit items-center gap-1.5 px-2.5 py-0.5 rounded-full ring-1 ring-inset shadow-sm">
                                                    <StatusIcon className="h-3 w-3" />
                                                    <span className="capitalize">{cfg.label}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                                    <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" title="Download PDF" aria-label="Download PDF">
                                                            <Download className="h-4 w-4 text-muted-foreground" />
                                                        </Button>
                                                    </a>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => router.push(`/sales/invoices/${inv.id}/edit`)} aria-label="Edit">
                                                        <Pencil className="h-4 w-4 text-muted-foreground" />
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pendingId === inv.id} aria-label={`More actions for ${inv.invoice_number}`}>
                                                                {pendingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <MoreHorizontal className="h-4 w-4 text-muted-foreground" />}
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => router.push(`/sales/invoices/${inv.id}`)}>
                                                                <Eye className="mr-2 h-4 w-4" /> View Details
                                                            </DropdownMenuItem>
                                                            {inv.pdf_url && (
                                                                <DropdownMenuItem onClick={() => window.open(inv.pdf_url ?? undefined, '_blank')}>
                                                                    <Download className="mr-2 h-4 w-4" /> Download PDF
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => handleSendEmail(inv.id)}>
                                                                <Send className="mr-2 h-4 w-4" /> Send Email
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <RequireRole min="MANAGER"><DropdownMenuItem variant="destructive" onClick={() => handleDelete(inv.id)}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
                                                            </DropdownMenuItem></RequireRole>
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
                </div>
            </Card>
        </div>
    )
}
