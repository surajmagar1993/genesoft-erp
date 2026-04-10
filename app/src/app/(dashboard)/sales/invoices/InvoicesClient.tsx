"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Search, Plus, Pencil, Trash2, FileText, Send, CheckCircle2, XCircle, Clock, MoreHorizontal, Download, Eye, Loader2, Receipt } from "lucide-react"
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
import { InvoiceStatus, deleteInvoice, sendInvoiceEmail, type InvoiceDB } from "@/app/actions/sales/invoices"

import { PageHeader } from "@/components/ui/page-header"

const statusConfig: Record<InvoiceStatus, { label: string; variant: "default" | "secondary" | "outline" | "destructive" | "success"; icon: React.ComponentType<{ className?: string }> }> = {
    DRAFT: { label: "Draft", variant: "secondary", icon: Clock },
    SENT: { label: "Sent", variant: "outline", icon: Send },
    ACCEPTED: { label: "Accepted", variant: "default", icon: CheckCircle2 },
    REJECTED: { label: "Rejected", variant: "destructive", icon: XCircle },
    EXPIRED: { label: "Expired", variant: "outline", icon: XCircle },
}

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(amount)

const formatDate = (dateStr: string) => {
    if (!dateStr) return "—"
    return new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })
}

interface Props {
    initialInvoices: any[]
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
                <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-900 dark:to-indigo-950 border-none shadow-sm">
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                            <FileText className="h-4 w-4" />
                            <p className="text-xs font-bold uppercase tracking-wider">Total Invoices</p>
                        </div>
                        <p className="text-3xl font-black mt-2 text-indigo-900 dark:text-indigo-100">{total}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Filters */}
            <Card className="border-none shadow-md overflow-hidden ring-1 ring-slate-200 dark:ring-slate-800">
                <div className="bg-white dark:bg-slate-950 p-6 space-y-6">
                    <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                        <div className="relative max-w-md w-full">
                            {isPending ? <Loader2 className="absolute left-3 top-3 h-4 w-4 animate-spin text-indigo-500" /> : <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />}
                            <Input
                                placeholder="Search by invoice number or customer name..."
                                className="pl-10 h-10 border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 focus:bg-white dark:focus:bg-slate-900 transition-all"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <div className="flex flex-wrap gap-2 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
                            <button
                                className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === "all" ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                                onClick={() => { setFilterStatus("all"); updateUrl({ status: "all" }) }}
                            >
                                All
                            </button>
                            {(Object.keys(statusConfig) as InvoiceStatus[]).map((s) => {
                                const cfg = statusConfig[s]
                                return (
                                    <button
                                        key={s}
                                        className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${filterStatus === s ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
                                        onClick={() => { setFilterStatus(s); updateUrl({ status: s }) }}
                                    >
                                        {cfg.label}
                                    </button>
                                )
                            })}
                        </div>
                    </div>

                    <div className="rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden bg-slate-50/30 dark:bg-slate-900/10">
                        <Table>
                            <TableHeader className="bg-slate-100/50 dark:bg-slate-800/50">
                                <TableRow>
                                    <TableHead className="font-bold text-slate-900 dark:text-slate-100">Invoice #</TableHead>
                                    <TableHead className="font-bold text-slate-900 dark:text-slate-100">Customer</TableHead>
                                    <TableHead className="font-bold text-slate-900 dark:text-slate-100">Date</TableHead>
                                    <TableHead className="text-right font-bold text-slate-900 dark:text-slate-100">Total</TableHead>
                                    <TableHead className="font-bold text-slate-900 dark:text-slate-100">Status</TableHead>
                                    <TableHead className="text-right font-bold text-slate-900 dark:text-slate-100">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialInvoices.length === 0 ? (
                                    <TableRow><TableCell colSpan={6} className="h-32 text-center text-slate-500 italic">No invoices found.</TableCell></TableRow>
                                ) : initialInvoices.map((inv) => {
                                    const cfg = statusConfig[inv.status as InvoiceStatus]
                                    const StatusIcon = cfg.icon
                                    
                                    // Calculate total from line items if not directly on the record
                                    // Assuming 'total' field exists based on the action
                                    const totalAmount = Number(inv.total || 0)

                                    return (
                                        <TableRow key={inv.id} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors">
                                            <TableCell className="font-bold text-indigo-600 dark:text-indigo-400">{inv.invoice_number}</TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-slate-900 dark:text-slate-100">{inv.customer_name}</span>
                                                    <span className="text-xs text-slate-500">{inv.customer_email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-slate-600 dark:text-slate-400">{formatDate(inv.invoice_date)}</TableCell>
                                            <TableCell className="text-right font-black text-slate-900 dark:text-slate-50">{formatCurrency(totalAmount)}</TableCell>
                                            <TableCell>
                                                <Badge variant={cfg.variant as any} className="flex w-fit items-center gap-1.5 px-2.5 py-0.5 rounded-full ring-1 ring-inset shadow-sm">
                                                    <StatusIcon className="h-3 w-3" />
                                                    <span className="capitalize">{cfg.label}</span>
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800" onClick={() => router.push(`/sales/invoices/${inv.id}/edit`)}>
                                                        <Pencil className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-slate-200 dark:hover:bg-slate-800" disabled={pendingId === inv.id}>
                                                                {pendingId === inv.id ? <Loader2 className="h-4 w-4 animate-spin text-indigo-500" /> : <MoreHorizontal className="h-4 w-4 text-slate-400" />}
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="w-48">
                                                            <DropdownMenuItem onClick={() => router.push(`/sales/invoices/${inv.id}`)}>
                                                                <Eye className="mr-2 h-4 w-4" /> View Details
                                                            </DropdownMenuItem>
                                                            {inv.pdf_url && (
                                                                <DropdownMenuItem onClick={() => window.open(inv.pdf_url, '_blank')}>
                                                                    <Download className="mr-2 h-4 w-4" /> Download PDF
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuItem onClick={() => handleSendEmail(inv.id)}>
                                                                <Send className="mr-2 h-4 w-4" /> Send Email
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950" onClick={() => handleDelete(inv.id)}>
                                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
                                                            </DropdownMenuItem>
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
