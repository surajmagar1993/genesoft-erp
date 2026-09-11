"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    FileMinus,
    Plus,
    Search,
    RotateCcw,
    Receipt,
    DollarSign,
    Package,
    Warehouse,
    TrendingDown,
    CheckCircle2,
    Clock,
    AlertCircle,
    Building2,
    Calendar,
    ArrowUpRight,
    Ban,
    Loader2,
    Trash2,
    Coins,
    ShieldCheck,
    CreditCard,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { format } from "date-fns"
import { toast } from "sonner"
import {
    CreditNotesOverviewData,
    CreditNoteRecord,
    createCreditNote,
    applyCreditToInvoice,
    recordCreditNoteRefund,
    voidCreditNote,
} from "@/app/actions/sales/credit-notes"
import {
    CreditNoteStatus,
    CreditNoteReason,
} from "@prisma/client"

interface CreditNotesClientProps {
    initialData: CreditNotesOverviewData
}

interface NewCreditNoteItemState {
    productId?: string
    description: string
    hsnSacCode: string
    quantity: number
    unitPrice: number
    taxRate: number
    restockInventory: boolean
    warehouseId?: string
}

export function CreditNotesClient({ initialData }: CreditNotesClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [data, setData] = useState<CreditNotesOverviewData>(initialData)

    // Active tab
    const [activeTab, setActiveTab] = useState("all")

    // Filter states
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("all")
    const [reasonFilter, setReasonFilter] = useState<string>("all")

    // Modal states
    const [isNewCreditNoteOpen, setIsNewCreditNoteOpen] = useState(false)
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false)
    const [isRefundModalOpen, setIsRefundModalOpen] = useState(false)

    // Selected credit note for actions
    const [selectedCreditNote, setSelectedCreditNote] = useState<CreditNoteRecord | null>(null)

    // Form: New Credit Note
    const [newCreditNote, setNewCreditNote] = useState<{
        contactId: string
        invoiceId: string
        issueDate: string
        reason: CreditNoteReason
        notes: string
        terms: string
        items: NewCreditNoteItemState[]
    }>({
        contactId: "",
        invoiceId: "",
        issueDate: format(new Date(), "yyyy-MM-dd"),
        reason: CreditNoteReason.GOODS_RETURN,
        notes: "",
        terms: "Credit balance can be applied to future invoices or refunded upon request.",
        items: [
            {
                description: "Returned Merchandise",
                hsnSacCode: "8517",
                quantity: 1,
                unitPrice: 0,
                taxRate: 18,
                restockInventory: false,
            }
        ]
    })

    // Form: Apply Credit to Invoice
    const [applyForm, setApplyForm] = useState({
        invoiceId: "",
        amount: 0,
    })

    // Form: Record Refund
    const [refundForm, setRefundForm] = useState({
        amount: 0,
        refundDate: format(new Date(), "yyyy-MM-dd"),
        paymentMethod: "BANK_TRANSFER",
        reference: "",
        notes: "",
    })

    // Filtered Credit Notes
    const filteredCreditNotes = useMemo(() => {
        return data.creditNotes.filter(cn => {
            const matchesSearch =
                cn.creditNoteNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                cn.contactName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (cn.invoiceNumber && cn.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (cn.notes && cn.notes.toLowerCase().includes(searchQuery.toLowerCase()))

            const matchesStatus = statusFilter === "all" || cn.status === statusFilter
            const matchesReason = reasonFilter === "all" || cn.reason === reasonFilter

            return matchesSearch && matchesStatus && matchesReason
        })
    }, [data.creditNotes, searchQuery, statusFilter, reasonFilter])

    // Invoices available for selected customer in apply modal
    const customerOpenInvoices = useMemo(() => {
        if (!selectedCreditNote) return []
        return data.availableInvoices.filter(
            inv => inv.contactId === selectedCreditNote.contactId && inv.status !== "PAID"
        )
    }, [data.availableInvoices, selectedCreditNote])

    // Invoices available for customer in New Credit Note form
    const newNoteCustomerInvoices = useMemo(() => {
        if (!newCreditNote.contactId) return []
        return data.availableInvoices.filter(inv => inv.contactId === newCreditNote.contactId)
    }, [data.availableInvoices, newCreditNote.contactId])

    // Compute totals for New Credit Note form
    const newNoteTotals = useMemo(() => {
        let subtotal = 0
        let tax = 0
        for (const item of newCreditNote.items) {
            const lineSub = item.quantity * item.unitPrice
            const lineTax = Math.round((lineSub * (item.taxRate / 100)) * 100) / 100
            subtotal += lineSub
            tax += lineTax
        }
        return { subtotal, tax, total: subtotal + tax }
    }, [newCreditNote.items])

    // Handlers: Form line items
    const handleAddItem = () => {
        setNewCreditNote(prev => ({
            ...prev,
            items: [
                ...prev.items,
                {
                    description: "",
                    hsnSacCode: "",
                    quantity: 1,
                    unitPrice: 0,
                    taxRate: 18,
                    restockInventory: false,
                }
            ]
        }))
    }

    const handleRemoveItem = (index: number) => {
        if (newCreditNote.items.length <= 1) return
        setNewCreditNote(prev => ({
            ...prev,
            items: prev.items.filter((_, idx) => idx !== index)
        }))
    }

    const handleItemChange = (index: number, field: keyof NewCreditNoteItemState, value: any) => {
        setNewCreditNote(prev => {
            const updated = [...prev.items]
            updated[index] = { ...updated[index], [field]: value }

            // If product was selected, auto-fill unitPrice and hsn
            if (field === "productId" && value) {
                const prod = data.availableProducts.find(p => p.id === value)
                if (prod) {
                    updated[index].description = prod.name
                    updated[index].unitPrice = prod.unitPrice
                    updated[index].hsnSacCode = prod.hsnSacCode || ""
                }
            }

            return { ...prev, items: updated }
        })
    }

    // Handlers: Actions
    const handleCreateCreditNote = () => {
        if (!newCreditNote.contactId) {
            toast.error("Please select a customer")
            return
        }
        if (newCreditNote.items.length === 0 || newCreditNote.items.some(i => !i.description.trim())) {
            toast.error("Please enter a description for each line item")
            return
        }
        if (newNoteTotals.total <= 0) {
            toast.error("Credit note total must be greater than zero")
            return
        }

        startTransition(async () => {
            try {
                await createCreditNote({
                    contactId: newCreditNote.contactId,
                    invoiceId: newCreditNote.invoiceId || undefined,
                    issueDate: newCreditNote.issueDate,
                    reason: newCreditNote.reason,
                    notes: newCreditNote.notes || undefined,
                    terms: newCreditNote.terms || undefined,
                    items: newCreditNote.items.map(item => ({
                        productId: item.productId || undefined,
                        description: item.description,
                        hsnSacCode: item.hsnSacCode || undefined,
                        quantity: Number(item.quantity),
                        unitPrice: Number(item.unitPrice),
                        taxRate: Number(item.taxRate),
                        restockInventory: item.restockInventory,
                        warehouseId: item.warehouseId || undefined,
                    }))
                })

                toast.success("Credit Note issued successfully and posted to ledger!")
                setIsNewCreditNoteOpen(false)
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to issue credit note")
            }
        })
    }

    const handleOpenApplyModal = (cn: CreditNoteRecord) => {
        setSelectedCreditNote(cn)
        setApplyForm({
            invoiceId: "",
            amount: cn.remainingBalance,
        })
        setIsApplyModalOpen(true)
    }

    const handleApplyCredit = () => {
        if (!selectedCreditNote || !applyForm.invoiceId) {
            toast.error("Please select an invoice to apply credit to")
            return
        }
        if (applyForm.amount <= 0 || applyForm.amount > selectedCreditNote.remainingBalance) {
            toast.error(`Amount must be between 1 and ₹${selectedCreditNote.remainingBalance.toLocaleString("en-IN")}`)
            return
        }

        startTransition(async () => {
            try {
                await applyCreditToInvoice({
                    creditNoteId: selectedCreditNote.id,
                    invoiceId: applyForm.invoiceId,
                    amount: Number(applyForm.amount),
                })

                toast.success("Credit applied successfully to invoice!")
                setIsApplyModalOpen(false)
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to apply credit")
            }
        })
    }

    const handleOpenRefundModal = (cn: CreditNoteRecord) => {
        setSelectedCreditNote(cn)
        setRefundForm({
            amount: cn.remainingBalance,
            refundDate: format(new Date(), "yyyy-MM-dd"),
            paymentMethod: "BANK_TRANSFER",
            reference: "",
            notes: `Disbursement refund for Credit Note #${cn.creditNoteNumber}`,
        })
        setIsRefundModalOpen(true)
    }

    const handleProcessRefund = () => {
        if (!selectedCreditNote) return
        if (refundForm.amount <= 0 || refundForm.amount > selectedCreditNote.remainingBalance) {
            toast.error(`Refund amount must be between 1 and ₹${selectedCreditNote.remainingBalance.toLocaleString("en-IN")}`)
            return
        }

        startTransition(async () => {
            try {
                await recordCreditNoteRefund({
                    creditNoteId: selectedCreditNote.id,
                    amount: Number(refundForm.amount),
                    refundDate: refundForm.refundDate,
                    paymentMethod: refundForm.paymentMethod,
                    reference: refundForm.reference || undefined,
                    notes: refundForm.notes || undefined,
                })

                toast.success("Refund disbursement recorded and posted to customer ledger!")
                setIsRefundModalOpen(false)
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to record refund")
            }
        })
    }

    const handleVoidCreditNote = (cn: CreditNoteRecord) => {
        if (!confirm(`Are you sure you want to VOID Credit Note #${cn.creditNoteNumber}? This will reverse the available credit balance.`)) {
            return
        }

        startTransition(async () => {
            try {
                await voidCreditNote(cn.id)
                toast.success(`Credit Note #${cn.creditNoteNumber} voided`)
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to void credit note")
            }
        })
    }

    // Helper Badges
    const getStatusBadge = (status: CreditNoteStatus) => {
        switch (status) {
            case CreditNoteStatus.ISSUED:
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">Issued</Badge>
            case CreditNoteStatus.APPLIED:
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Applied</Badge>
            case CreditNoteStatus.REFUNDED:
                return <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800">Refunded</Badge>
            case CreditNoteStatus.VOID:
                return <Badge variant="destructive">Void</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const getReasonBadge = (reason: CreditNoteReason) => {
        switch (reason) {
            case CreditNoteReason.GOODS_RETURN:
                return <Badge variant="outline" className="text-emerald-600 border-emerald-300">Goods Return</Badge>
            case CreditNoteReason.OVERBILLING:
                return <Badge variant="outline" className="text-amber-600 border-amber-300">Overbilling</Badge>
            case CreditNoteReason.DEFECTIVE_PRODUCT:
                return <Badge variant="outline" className="text-destructive border-destructive/30">Defective</Badge>
            case CreditNoteReason.ORDER_CANCELLATION:
                return <Badge variant="outline" className="text-blue-600 border-blue-300">Cancelled</Badge>
            case CreditNoteReason.GOODWILL_DISCOUNT:
                return <Badge variant="outline" className="text-purple-600 border-purple-300">Discount</Badge>
            default:
                return <Badge variant="outline">{reason}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <FileMinus className="h-8 w-8 text-primary" />
                        Credit Notes & Customer Refunds
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Issue credit memos against invoices, process customer returns with automatic inventory restocking, apply credits to unpaid bills, and record refund disbursements.
                    </p>
                </div>
                <Button onClick={() => setIsNewCreditNoteOpen(true)} className="gap-1.5">
                    <Plus className="h-4 w-4" />
                    Issue Credit Note
                </Button>
            </div>

            {/* KPI Telemetry */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-xs hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Credit Notes</CardTitle>
                        <FileMinus className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.totalCreditNotes} Memos</div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                            <span className="text-blue-600 font-medium">{data.stats.issuedCount} Open</span>
                            <span className="text-emerald-600 font-medium">{data.stats.appliedCount} Applied</span>
                            <span className="text-purple-600 font-medium">{data.stats.refundedCount} Refunded</span>
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Gross Credit Value</CardTitle>
                        <TrendingDown className="h-4 w-4 text-destructive" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{data.stats.totalCreditValue.toLocaleString("en-IN")}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Cumulative credit adjustment issued to customers
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Available Open Credit</CardTitle>
                        <Coins className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-emerald-600">
                            ₹{data.stats.openBalance.toLocaleString("en-IN")}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Eligible to apply against upcoming customer invoices
                        </p>
                    </CardContent>
                </Card>

                <Card className="shadow-xs hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Refunds Disbursed</CardTitle>
                        <RotateCcw className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{data.stats.totalRefunded.toLocaleString("en-IN")}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Total direct cash/bank payouts across {data.refunds.length} transaction(s)
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/60 p-1">
                    <TabsTrigger value="all" className="gap-2">
                        <FileMinus className="h-4 w-4" />
                        All Credit Notes ({data.creditNotes.length})
                    </TabsTrigger>
                    <TabsTrigger value="open" className="gap-2">
                        <Coins className="h-4 w-4" />
                        Open Credits ({data.openCredits.length})
                    </TabsTrigger>
                    <TabsTrigger value="refunds" className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Refunds & Payouts ({data.refunds.length})
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: ALL CREDIT NOTES */}
                <TabsContent value="all" className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="flex flex-1 flex-wrap items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search credit notes, customer, invoice..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value={CreditNoteStatus.ISSUED}>Issued</SelectItem>
                                    <SelectItem value={CreditNoteStatus.APPLIED}>Applied</SelectItem>
                                    <SelectItem value={CreditNoteStatus.REFUNDED}>Refunded</SelectItem>
                                    <SelectItem value={CreditNoteStatus.VOID}>Void</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={reasonFilter} onValueChange={setReasonFilter}>
                                <SelectTrigger className="w-[170px]">
                                    <SelectValue placeholder="All Reasons" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Reasons</SelectItem>
                                    <SelectItem value={CreditNoteReason.GOODS_RETURN}>Goods Return</SelectItem>
                                    <SelectItem value={CreditNoteReason.OVERBILLING}>Overbilling</SelectItem>
                                    <SelectItem value={CreditNoteReason.DEFECTIVE_PRODUCT}>Defective Product</SelectItem>
                                    <SelectItem value={CreditNoteReason.ORDER_CANCELLATION}>Order Cancellation</SelectItem>
                                    <SelectItem value={CreditNoteReason.GOODWILL_DISCOUNT}>Goodwill Discount</SelectItem>
                                    <SelectItem value={CreditNoteReason.OTHER}>Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Credit Note #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Linked Invoice</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Gross Total</TableHead>
                                        <TableHead>Remaining Balance</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredCreditNotes.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                                No credit notes found matching criteria.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredCreditNotes.map(cn => (
                                            <TableRow key={cn.id} className="hover:bg-muted/40">
                                                <TableCell className="font-semibold">
                                                    <div className="flex flex-col">
                                                        <span>{cn.creditNoteNumber}</span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {format(new Date(cn.issueDate), "dd MMM yyyy")}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{cn.contactName}</span>
                                                        <span className="text-xs text-muted-foreground">{cn.contactPhone || cn.contactEmail || "—"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {cn.invoiceNumber ? (
                                                        <Badge variant="outline" className="font-mono text-xs gap-1">
                                                            <Receipt className="h-3 w-3 text-blue-500" />
                                                            {cn.invoiceNumber}
                                                        </Badge>
                                                    ) : (
                                                        <span className="text-xs text-muted-foreground">—</span>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    {getReasonBadge(cn.reason)}
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                    ₹{cn.total.toLocaleString("en-IN")}
                                                </TableCell>
                                                <TableCell className="font-semibold text-emerald-600">
                                                    ₹{cn.remainingBalance.toLocaleString("en-IN")}
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(cn.status)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {cn.remainingBalance > 0 && cn.status !== CreditNoteStatus.VOID && (
                                                            <>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700"
                                                                    onClick={() => handleOpenApplyModal(cn)}
                                                                >
                                                                    <Receipt className="h-3 w-3" />
                                                                    Apply
                                                                </Button>
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700"
                                                                    onClick={() => handleOpenRefundModal(cn)}
                                                                >
                                                                    <RotateCcw className="h-3 w-3" />
                                                                    Refund
                                                                </Button>
                                                            </>
                                                        )}

                                                        {cn.allocatedAmount === 0 && cn.status === CreditNoteStatus.ISSUED && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleVoidCreditNote(cn)}
                                                            >
                                                                Void
                                                            </Button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: OPEN CREDITS */}
                <TabsContent value="open" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Coins className="h-4 w-4 text-emerald-500" />
                                Available Customer Credits
                            </CardTitle>
                            <CardDescription>
                                Customer accounts holding unallocated credit balances eligible to offset invoices or be disbursed as refunds.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Credit Note #</TableHead>
                                        <TableHead>Issue Date</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Original Amount</TableHead>
                                        <TableHead>Available Balance</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.openCredits.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                                                No open credit balances currently held.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.openCredits.map(cn => (
                                            <TableRow key={cn.id} className="hover:bg-muted/40">
                                                <TableCell className="font-semibold text-sm">
                                                    {cn.contactName}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-semibold">
                                                    {cn.creditNoteNumber}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {format(new Date(cn.issueDate), "dd MMM yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    {getReasonBadge(cn.reason)}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    ₹{cn.total.toLocaleString("en-IN")}
                                                </TableCell>
                                                <TableCell className="font-bold text-emerald-600">
                                                    ₹{cn.remainingBalance.toLocaleString("en-IN")}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700"
                                                            onClick={() => handleOpenApplyModal(cn)}
                                                        >
                                                            <Receipt className="h-3 w-3" />
                                                            Apply to Invoice
                                                        </Button>
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-xs gap-1 text-purple-600 hover:text-purple-700"
                                                            onClick={() => handleOpenRefundModal(cn)}
                                                        >
                                                            <RotateCcw className="h-3 w-3" />
                                                            Disburse Refund
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 3: REFUNDS LEDGER */}
                <TabsContent value="refunds" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <RotateCcw className="h-4 w-4 text-purple-500" />
                                Refund Payouts & Disbursements Ledger
                            </CardTitle>
                            <CardDescription>
                                Immutable ledger of settled customer refunds disbursed via bank transfers, cheques, UPI, or cash.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Payout Date</TableHead>
                                        <TableHead>Credit Note #</TableHead>
                                        <TableHead>Payment Method</TableHead>
                                        <TableHead>Reference / UTR</TableHead>
                                        <TableHead>Notes</TableHead>
                                        <TableHead className="text-right">Refund Amount</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.refunds.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                                                No refund disbursements recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.refunds.map(r => (
                                            <TableRow key={r.id} className="hover:bg-muted/40">
                                                <TableCell className="text-xs font-medium">
                                                    {format(new Date(r.refundDate), "dd MMM yyyy")}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-semibold">
                                                    {r.creditNoteNumber}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {r.paymentMethod.replace("_", " ")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {r.reference || "—"}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground max-w-[240px] truncate">
                                                    {r.notes || "—"}
                                                </TableCell>
                                                <TableCell className="text-right font-semibold text-purple-600">
                                                    ₹{r.amount.toLocaleString("en-IN")}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* MODAL: ISSUE NEW CREDIT NOTE */}
            <Dialog open={isNewCreditNoteOpen} onOpenChange={setIsNewCreditNoteOpen}>
                <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileMinus className="h-5 w-5 text-primary" />
                            Issue Credit Note
                        </DialogTitle>
                        <DialogDescription>
                            Create a credit memo against returned goods or billing adjustments. Optionally restock items into warehouse inventory.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Customer & Invoice Link */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Customer Account *</Label>
                                <Select
                                    value={newCreditNote.contactId}
                                    onValueChange={val => setNewCreditNote(prev => ({ ...prev, contactId: val, invoiceId: "" }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select customer..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {data.availableCustomers.map(c => (
                                            <SelectItem key={c.id} value={c.id}>
                                                {c.name} {c.phone ? `(${c.phone})` : ""}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Original Invoice (Optional)</Label>
                                <Select
                                    value={newCreditNote.invoiceId}
                                    onValueChange={val => setNewCreditNote(prev => ({ ...prev, invoiceId: val }))}
                                    disabled={!newCreditNote.contactId}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder={newCreditNote.contactId ? "Select linked invoice..." : "Select customer first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {newNoteCustomerInvoices.map(inv => (
                                            <SelectItem key={inv.id} value={inv.id}>
                                                {inv.invoiceNumber} (Total: ₹{inv.total.toLocaleString("en-IN")})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Date & Reason */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Issue Date</Label>
                                <Input
                                    type="date"
                                    value={newCreditNote.issueDate}
                                    onChange={e => setNewCreditNote(prev => ({ ...prev, issueDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Credit Reason *</Label>
                                <Select
                                    value={newCreditNote.reason}
                                    onValueChange={val => setNewCreditNote(prev => ({ ...prev, reason: val as CreditNoteReason }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={CreditNoteReason.GOODS_RETURN}>Goods Return</SelectItem>
                                        <SelectItem value={CreditNoteReason.OVERBILLING}>Overbilling / Price Correction</SelectItem>
                                        <SelectItem value={CreditNoteReason.DEFECTIVE_PRODUCT}>Defective / Damaged Item</SelectItem>
                                        <SelectItem value={CreditNoteReason.ORDER_CANCELLATION}>Order Cancellation</SelectItem>
                                        <SelectItem value={CreditNoteReason.GOODWILL_DISCOUNT}>Goodwill / Post-Sale Discount</SelectItem>
                                        <SelectItem value={CreditNoteReason.OTHER}>Other Reason</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Line Items */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="font-semibold text-xs uppercase tracking-wider">
                                    Credit Note Line Items
                                </Label>
                                <Button size="sm" variant="outline" onClick={handleAddItem} className="h-7 text-xs gap-1">
                                    <Plus className="h-3 w-3" />
                                    Add Item
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {newCreditNote.items.map((item, idx) => (
                                    <div key={idx} className="p-3 rounded-xl border bg-muted/30 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-semibold text-muted-foreground">Item #{idx + 1}</span>
                                            {newCreditNote.items.length > 1 && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                                    onClick={() => handleRemoveItem(idx)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                            <div className="sm:col-span-2 space-y-1">
                                                <Label className="text-xs">Product Catalog (Optional)</Label>
                                                <Select
                                                    value={item.productId || "custom"}
                                                    onValueChange={val => handleItemChange(idx, "productId", val === "custom" ? undefined : val)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Pick from catalog or enter custom..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="custom">Custom / Service Item</SelectItem>
                                                        {data.availableProducts.map(p => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                {p.name} (₹{p.unitPrice})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1">
                                                <Label className="text-xs">HSN/SAC Code</Label>
                                                <Input
                                                    className="h-8 text-xs"
                                                    placeholder="e.g. 8517"
                                                    value={item.hsnSacCode}
                                                    onChange={e => handleItemChange(idx, "hsnSacCode", e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-xs">Description *</Label>
                                            <Input
                                                className="h-8 text-xs"
                                                placeholder="Item description or reason details..."
                                                value={item.description}
                                                onChange={e => handleItemChange(idx, "description", e.target.value)}
                                            />
                                        </div>

                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Quantity</Label>
                                                <Input
                                                    type="number"
                                                    className="h-8 text-xs"
                                                    value={item.quantity || ""}
                                                    onChange={e => handleItemChange(idx, "quantity", Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Unit Rate (₹)</Label>
                                                <Input
                                                    type="number"
                                                    className="h-8 text-xs"
                                                    value={item.unitPrice || ""}
                                                    onChange={e => handleItemChange(idx, "unitPrice", Number(e.target.value))}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Tax Rate (%)</Label>
                                                <Select
                                                    value={String(item.taxRate)}
                                                    onValueChange={val => handleItemChange(idx, "taxRate", Number(val))}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="0">0% (Nil)</SelectItem>
                                                        <SelectItem value="5">5%</SelectItem>
                                                        <SelectItem value="12">12%</SelectItem>
                                                        <SelectItem value="18">18% (Standard)</SelectItem>
                                                        <SelectItem value="28">28%</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>

                                        {/* Restock Inventory Toggle */}
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1 border-t border-muted">
                                            <label className="flex items-center gap-2 cursor-pointer text-xs">
                                                <input
                                                    type="checkbox"
                                                    checked={item.restockInventory}
                                                    onChange={e => handleItemChange(idx, "restockInventory", e.target.checked)}
                                                    className="rounded border-gray-300 text-primary focus:ring-primary"
                                                />
                                                <span className="font-medium">Restock physical items into warehouse depot</span>
                                            </label>

                                            {item.restockInventory && (
                                                <div className="w-full sm:w-[220px]">
                                                    <Select
                                                        value={item.warehouseId || ""}
                                                        onValueChange={val => handleItemChange(idx, "warehouseId", val)}
                                                    >
                                                        <SelectTrigger className="h-7 text-xs">
                                                            <SelectValue placeholder="Select target depot..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {data.availableWarehouses.map(w => (
                                                                <SelectItem key={w.id} value={w.id}>
                                                                    {w.name} ({w.code})
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Financial summary */}
                        <div className="rounded-xl border bg-muted/40 p-3 flex justify-between items-center text-xs">
                            <div className="space-y-0.5">
                                <div>Subtotal: ₹{newNoteTotals.subtotal.toLocaleString("en-IN")}</div>
                                <div>GST Tax: ₹{newNoteTotals.tax.toLocaleString("en-IN")}</div>
                            </div>
                            <div className="text-right">
                                <span className="text-muted-foreground block">Total Credit Memo Value:</span>
                                <span className="text-lg font-bold text-primary">₹{newNoteTotals.total.toLocaleString("en-IN")}</span>
                            </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-1.5">
                            <Label>Reason Notes & Justification</Label>
                            <Textarea
                                rows={2}
                                placeholder="Explain rationale for this credit note..."
                                value={newCreditNote.notes}
                                onChange={e => setNewCreditNote(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewCreditNoteOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateCreditNote} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Issue Credit Note
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: APPLY CREDIT TO INVOICE */}
            {selectedCreditNote && (
                <Dialog open={isApplyModalOpen} onOpenChange={setIsApplyModalOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-blue-500" />
                                Apply Credit to Invoice
                            </DialogTitle>
                            <DialogDescription>
                                Allocate available credit from #{selectedCreditNote.creditNoteNumber} against an unpaid invoice for {selectedCreditNote.contactName}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1">
                                <div className="font-semibold text-foreground">
                                    Customer: {selectedCreditNote.contactName}
                                </div>
                                <div className="text-muted-foreground">
                                    Available Credit Balance: <span className="font-bold text-emerald-600">₹{selectedCreditNote.remainingBalance.toLocaleString("en-IN")}</span>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Select Unpaid Invoice *</Label>
                                <Select
                                    value={applyForm.invoiceId}
                                    onValueChange={val => {
                                        const inv = customerOpenInvoices.find(i => i.id === val)
                                        const maxAmount = inv ? Math.min(inv.total, selectedCreditNote.remainingBalance) : selectedCreditNote.remainingBalance
                                        setApplyForm(prev => ({ ...prev, invoiceId: val, amount: maxAmount }))
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Choose open invoice..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {customerOpenInvoices.map(inv => (
                                            <SelectItem key={inv.id} value={inv.id}>
                                                {inv.invoiceNumber} — Total ₹{inv.total.toLocaleString("en-IN")} ({inv.status})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {customerOpenInvoices.length === 0 && (
                                    <p className="text-xs text-amber-600">
                                        No unpaid invoices found for this customer.
                                    </p>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <Label>Amount to Apply (₹) *</Label>
                                <Input
                                    type="number"
                                    value={applyForm.amount || ""}
                                    onChange={e => setApplyForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsApplyModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleApplyCredit} disabled={isPending || customerOpenInvoices.length === 0}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Allocation
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* MODAL: RECORD REFUND DISBURSEMENT */}
            {selectedCreditNote && (
                <Dialog open={isRefundModalOpen} onOpenChange={setIsRefundModalOpen}>
                    <DialogContent className="sm:max-w-[500px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <RotateCcw className="h-5 w-5 text-purple-500" />
                                Record Refund Payout
                            </DialogTitle>
                            <DialogDescription>
                                Disburse an electronic bank transfer, cheque, or cash refund for Credit Note #{selectedCreditNote.creditNoteNumber}.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-2">
                            <div className="rounded-xl border bg-muted/40 p-3 text-xs space-y-1">
                                <div className="font-semibold text-foreground">
                                    Customer: {selectedCreditNote.contactName}
                                </div>
                                <div className="text-muted-foreground">
                                    Available Credit Balance: <span className="font-bold text-emerald-600">₹{selectedCreditNote.remainingBalance.toLocaleString("en-IN")}</span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Refund Amount (₹) *</Label>
                                    <Input
                                        type="number"
                                        value={refundForm.amount || ""}
                                        onChange={e => setRefundForm(prev => ({ ...prev, amount: Number(e.target.value) }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Payment Method</Label>
                                    <Select
                                        value={refundForm.paymentMethod}
                                        onValueChange={val => setRefundForm(prev => ({ ...prev, paymentMethod: val }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS)</SelectItem>
                                            <SelectItem value="UPI">UPI</SelectItem>
                                            <SelectItem value="CHEQUE">Cheque</SelectItem>
                                            <SelectItem value="CASH">Cash</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Disbursement Date</Label>
                                    <Input
                                        type="date"
                                        value={refundForm.refundDate}
                                        onChange={e => setRefundForm(prev => ({ ...prev, refundDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>UTR / Reference #</Label>
                                    <Input
                                        placeholder="e.g. HDFC-UTR-128938"
                                        value={refundForm.reference}
                                        onChange={e => setRefundForm(prev => ({ ...prev, reference: e.target.value }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Notes / Bank Account Details</Label>
                                <Input
                                    placeholder="Account #, IFSC, receiver details..."
                                    value={refundForm.notes}
                                    onChange={e => setRefundForm(prev => ({ ...prev, notes: e.target.value }))}
                                />
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsRefundModalOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleProcessRefund} disabled={isPending} className="bg-purple-600 hover:bg-purple-700">
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Confirm Disbursement
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
