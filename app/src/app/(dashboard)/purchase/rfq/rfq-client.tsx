"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
    FileSpreadsheet,
    ShoppingCart,
    Truck,
    Building2,
    Calendar,
    Clock,
    Plus,
    Search,
    RefreshCw,
    Filter,
    CheckCircle2,
    AlertCircle,
    XCircle,
    Eye,
    Send,
    Award,
    Printer,
    Trash2,
    ArrowUpRight,
    ArrowDownRight,
    Sparkles,
    ShieldCheck,
    Check,
    Boxes,
    Mail,
    Phone,
    SlidersHorizontal,
    ChevronRight,
    DollarSign,
    Layers,
    BadgePercent,
    ExternalLink,
    Percent,
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
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { format, differenceInDays } from "date-fns"
import { toast } from "sonner"
import {
    RfqOverviewData,
    RfqRecord,
    RfqVendorRecord,
    createRfq,
    updateRfqStatus,
    recordVendorQuote,
    awardVendorQuote,
    deleteRfq,
    inviteVendorsToRfq,
    CreateRfqItemInput,
    RecordVendorQuoteItemInput,
} from "@/app/actions/rfq"
import { formatCurrency } from "@/lib/utils"
import { RfqStatus, RfqVendorStatus } from "@prisma/client"
import { RequireRole } from "@/components/auth/role-context"
import { unwrap } from "@/lib/action-result"

interface RfqClientProps {
    initialData: RfqOverviewData
}

interface NewRfqItemForm {
    id: string
    productId: string
    description: string
    quantity: string
    targetUnitPrice: string
    unit: string
    hsnSacCode: string
    notes: string
}

export function RfqClient({ initialData }: RfqClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()

    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState<string>("ALL")
    const [activeRfqId, setActiveRfqId] = useState<string | null>(null)
    const [activeDetailTab, setActiveDetailTab] = useState<string>("matrix")

    // Create RFQ Modal State
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [createTitle, setCreateTitle] = useState("")
    const [createDueDate, setCreateDueDate] = useState("")
    const [createNotes, setCreateNotes] = useState("")
    const [createTerms, setCreateTerms] = useState(
        "1. All bids must remain valid for at least 30 days.\n2. Delivery timelines, warranty, and freight charges must be specified.\n3. Goods must comply with statutory technical standards."
    )
    const [createItems, setCreateItems] = useState<NewRfqItemForm[]>([
        {
            id: "item-1",
            productId: "",
            description: "",
            quantity: "100",
            targetUnitPrice: "",
            unit: "pcs",
            hsnSacCode: "",
            notes: "",
        },
    ])
    const [createInvitedVendorIds, setCreateInvitedVendorIds] = useState<string[]>([])

    // Record Bid Modal State
    const [isBidModalOpen, setIsBidModalOpen] = useState(false)
    const [biddingVendorQuote, setBiddingVendorQuote] = useState<RfqVendorRecord | null>(null)
    const [bidQuoteRef, setBidQuoteRef] = useState("")
    const [bidQuoteDate, setBidQuoteDate] = useState(format(new Date(), "yyyy-MM-dd"))
    const [bidValidUntil, setBidValidUntil] = useState("")
    const [bidLeadTimeDays, setBidLeadTimeDays] = useState("7")
    const [bidCurrency, setBidCurrency] = useState("INR")
    const [bidNotes, setBidNotes] = useState("")
    const [bidItemInputs, setBidItemInputs] = useState<Record<string, { unitPrice: string; taxPercent: string; availableQty: string; notes: string }>>({})

    // Invite Vendors Modal
    const [isInviteOpen, setIsInviteOpen] = useState(false)
    const [inviteVendorIds, setInviteVendorIds] = useState<string[]>([])

    // Active selected RFQ
    const activeRfq = useMemo(() => {
        if (!activeRfqId) return null
        return initialData.rfqs.find((r) => r.id === activeRfqId) || null
    }, [activeRfqId, initialData.rfqs])

    // Filtered RFQs
    const filteredRfqs = useMemo(() => {
        return initialData.rfqs.filter((rfq) => {
            const matchesSearch =
                rfq.rfqNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rfq.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                rfq.vendors.some((v) =>
                    v.vendorName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    (v.vendorCompanyName && v.vendorCompanyName.toLowerCase().includes(searchQuery.toLowerCase()))
                )

            const matchesStatus =
                statusFilter === "ALL" || rfq.status === statusFilter

            return matchesSearch && matchesStatus
        })
    }, [initialData.rfqs, searchQuery, statusFilter])

    // Handler to open create dialog with clean state
    const handleOpenCreate = () => {
        const defaultDue = new Date()
        defaultDue.setDate(defaultDue.getDate() + 14)

        setCreateTitle("")
        setCreateDueDate(format(defaultDue, "yyyy-MM-dd"))
        setCreateNotes("")
        setCreateItems([
            {
                id: "item-1",
                productId: "",
                description: "",
                quantity: "100",
                targetUnitPrice: "",
                unit: "pcs",
                hsnSacCode: "",
                notes: "",
            },
        ])
        setCreateInvitedVendorIds([])
        setIsCreateOpen(true)
    }

    // Add item line in create dialog
    const handleAddItemLine = () => {
        setCreateItems((prev) => [
            ...prev,
            {
                id: `item-${Date.now()}`,
                productId: "",
                description: "",
                quantity: "1",
                targetUnitPrice: "",
                unit: "pcs",
                hsnSacCode: "",
                notes: "",
            },
        ])
    }

    // Update item line
    const handleUpdateItemLine = (id: string, field: keyof NewRfqItemForm, value: string) => {
        setCreateItems((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item
                const updated = { ...item, [field]: value }

                // Auto-fill from catalog product
                if (field === "productId" && value) {
                    const product = initialData.products.find((p) => p.id === value)
                    if (product) {
                        updated.description = product.name
                        updated.targetUnitPrice = product.unitPrice.toString()
                        updated.unit = product.unit || "pcs"
                        updated.hsnSacCode = product.hsnSacCode || ""
                    }
                }
                return updated
            })
        )
    }

    // Remove item line
    const handleRemoveItemLine = (id: string) => {
        if (createItems.length <= 1) {
            toast.error("At least one line item is required")
            return
        }
        setCreateItems((prev) => prev.filter((i) => i.id !== id))
    }

    // Target estimated budget in create dialog
    const createTargetTotal = useMemo(() => {
        return createItems.reduce((sum, item) => {
            const qty = parseFloat(item.quantity) || 0
            const price = parseFloat(item.targetUnitPrice) || 0
            return sum + qty * price
        }, 0)
    }, [createItems])

    // Submit Create RFQ
    const handleSubmitCreate = () => {
        if (!createTitle.trim()) {
            toast.error("Please enter a title for the RFQ tender")
            return
        }
        if (!createDueDate) {
            toast.error("Please select a bid submission deadline date")
            return
        }

        const validItems: CreateRfqItemInput[] = []
        for (const item of createItems) {
            if (!item.description.trim()) {
                toast.error("Each line item must have a description or product selected")
                return
            }
            const qty = parseFloat(item.quantity)
            if (isNaN(qty) || qty <= 0) {
                toast.error(`Invalid quantity for item: ${item.description}`)
                return
            }
            validItems.push({
                productId: item.productId || undefined,
                description: item.description.trim(),
                quantity: qty,
                targetUnitPrice: item.targetUnitPrice ? parseFloat(item.targetUnitPrice) : undefined,
                unit: item.unit || "pcs",
                hsnSacCode: item.hsnSacCode || undefined,
                notes: item.notes || undefined,
            })
        }

        startTransition(async () => {
            try {
                const res = unwrap(await createRfq({
                    title: createTitle,
                    dueDate: createDueDate,
                    notes: createNotes,
                    terms: createTerms,
                    items: validItems,
                    invitedVendorIds: createInvitedVendorIds,
                }))
                toast.success(`RFQ Tender ${res.rfqNumber} created successfully!`)
                setIsCreateOpen(false)
                router.refresh()
                setActiveRfqId(res.rfqId)
            } catch (err: any) {
                toast.error(err?.message || "Failed to create RFQ")
            }
        })
    }

    // Open Record Bid Modal
    const handleOpenRecordBid = (vendorQuote: RfqVendorRecord) => {
        if (!activeRfq) return
        setBiddingVendorQuote(vendorQuote)
        setBidQuoteRef(vendorQuote.quoteReference || "")
        setBidQuoteDate(
            vendorQuote.quoteDate
                ? format(new Date(vendorQuote.quoteDate), "yyyy-MM-dd")
                : format(new Date(), "yyyy-MM-dd")
        )
        setBidValidUntil(
            vendorQuote.validUntil
                ? format(new Date(vendorQuote.validUntil), "yyyy-MM-dd")
                : ""
        )
        setBidLeadTimeDays((vendorQuote.leadTimeDays || 7).toString())
        setBidCurrency(vendorQuote.currencyCode || "INR")
        setBidNotes(vendorQuote.notes || "")

        // Populate items map
        const initialMap: Record<string, { unitPrice: string; taxPercent: string; availableQty: string; notes: string }> = {}
        activeRfq.items.forEach((rfqItem) => {
            const existingQuoteItem = vendorQuote.items.find((qi) => qi.rfqItemId === rfqItem.id)
            initialMap[rfqItem.id] = {
                unitPrice: existingQuoteItem ? existingQuoteItem.unitPrice.toString() : (rfqItem.targetUnitPrice ? rfqItem.targetUnitPrice.toString() : ""),
                taxPercent: existingQuoteItem ? existingQuoteItem.taxPercent.toString() : "18",
                availableQty: existingQuoteItem && existingQuoteItem.availableQty ? existingQuoteItem.availableQty.toString() : rfqItem.quantity.toString(),
                notes: existingQuoteItem?.notes || "",
            }
        })
        setBidItemInputs(initialMap)
        setIsBidModalOpen(true)
    }

    // Submit Vendor Quote
    const handleSubmitRecordBid = () => {
        if (!activeRfq || !biddingVendorQuote) return

        const itemPayload: RecordVendorQuoteItemInput[] = []
        for (const rfqItem of activeRfq.items) {
            const row = bidItemInputs[rfqItem.id]
            const price = parseFloat(row?.unitPrice || "0")
            const tax = parseFloat(row?.taxPercent || "0")
            const availQty = row?.availableQty ? parseFloat(row.availableQty) : rfqItem.quantity

            itemPayload.push({
                rfqItemId: rfqItem.id,
                unitPrice: price,
                taxPercent: tax,
                availableQty: availQty,
                notes: row?.notes || undefined,
            })
        }

        startTransition(async () => {
            try {
                unwrap(await recordVendorQuote({
                    rfqId: activeRfq.id,
                    quoteId: biddingVendorQuote.id,
                    quoteReference: bidQuoteRef,
                    quoteDate: bidQuoteDate,
                    validUntil: bidValidUntil || undefined,
                    currencyCode: bidCurrency,
                    leadTimeDays: parseInt(bidLeadTimeDays, 10) || undefined,
                    notes: bidNotes,
                    items: itemPayload,
                }))
                toast.success(`Quotation recorded for ${biddingVendorQuote.vendorCompanyName || biddingVendorQuote.vendorName}`)
                setIsBidModalOpen(false)
                router.refresh()
            } catch (err: any) {
                toast.error(err?.message || "Failed to record vendor quote")
            }
        })
    }

    // Award Winning Bid -> Convert to PO
    const handleAwardQuote = (quote: RfqVendorRecord) => {
        if (!activeRfq) return

        if (confirm(`Award RFQ ${activeRfq.rfqNumber} to ${quote.vendorCompanyName || quote.vendorName} for ${formatCurrency(quote.totalAmount, quote.currencyCode)}?\n\nThis will automatically generate a Purchase Order (PO).`)) {
            startTransition(async () => {
                try {
                    const res = unwrap(await awardVendorQuote(activeRfq.id, quote.id))
                    toast.success(`RFQ Awarded! Purchase Order ${res.poNumber} created successfully.`, {
                        action: {
                            label: "View PO",
                            onClick: () => router.push("/purchase"),
                        },
                    })
                    router.refresh()
                } catch (err: any) {
                    toast.error(err?.message || "Failed to award quote")
                }
            })
        }
    }

    // Update Status
    const handleStatusChange = (status: RfqStatus) => {
        if (!activeRfq) return
        startTransition(async () => {
            try {
                unwrap(await updateRfqStatus(activeRfq.id, status))
                toast.success(`RFQ status updated to ${status.replace("_", " ")}`)
                router.refresh()
            } catch (err: any) {
                toast.error(err?.message || "Failed to update status")
            }
        })
    }

    // Delete RFQ
    const handleDeleteRfq = (rfqId: string) => {
        if (confirm("Are you sure you want to delete this RFQ? This action cannot be undone.")) {
            startTransition(async () => {
                try {
                    unwrap(await deleteRfq(rfqId))
                    toast.success("RFQ deleted successfully")
                    if (activeRfqId === rfqId) setActiveRfqId(null)
                    router.refresh()
                } catch (err: any) {
                    toast.error(err?.message || "Failed to delete RFQ")
                }
            })
        }
    }

    // Submit Invite Vendors
    const handleSubmitInvites = () => {
        if (!activeRfq || inviteVendorIds.length === 0) return
        startTransition(async () => {
            try {
                unwrap(await inviteVendorsToRfq(activeRfq.id, inviteVendorIds))
                toast.success(`${inviteVendorIds.length} vendor(s) invited to bid`)
                setIsInviteOpen(false)
                setInviteVendorIds([])
                router.refresh()
            } catch (err: any) {
                toast.error(err?.message || "Failed to invite vendors")
            }
        })
    }

    // Helper: status badge renderer
    const renderStatusBadge = (status: RfqStatus) => {
        switch (status) {
            case RfqStatus.DRAFT:
                return (
                    <Badge variant="outline" className="border-zinc-500/30 text-zinc-600 dark:text-zinc-400 bg-zinc-500/10">
                        Draft Tender
                    </Badge>
                )
            case RfqStatus.SENT:
                return (
                    <Badge variant="outline" className="border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 flex items-center gap-1">
                        <Clock className="w-3 h-3 animate-pulse" /> Bidding Open
                    </Badge>
                )
            case RfqStatus.BIDDING_CLOSED:
                return (
                    <Badge variant="outline" className="border-blue-500/30 text-blue-600 dark:text-blue-400 bg-blue-500/10">
                        Under Evaluation
                    </Badge>
                )
            case RfqStatus.CONVERTED:
                return (
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" /> Awarded (PO)
                    </Badge>
                )
            case RfqStatus.CANCELLED:
                return (
                    <Badge variant="outline" className="border-rose-500/30 text-rose-600 dark:text-rose-400 bg-rose-500/10">
                        Cancelled
                    </Badge>
                )
        }
    }

    // Helper: vendor response status badge
    const renderVendorStatusBadge = (status: RfqVendorStatus, isWinner: boolean) => {
        if (isWinner) {
            return (
                <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 font-semibold">
                    <Award className="w-3 h-3" /> Awarded Winner
                </Badge>
            )
        }
        switch (status) {
            case RfqVendorStatus.INVITED:
                return (
                    <Badge variant="outline" className="text-zinc-500 border-zinc-400/30">
                        Awaiting Quote
                    </Badge>
                )
            case RfqVendorStatus.SUBMITTED:
                return (
                    <Badge variant="outline" className="text-blue-600 border-blue-500/30 bg-blue-500/10">
                        Bid Submitted
                    </Badge>
                )
            case RfqVendorStatus.ACCEPTED:
                return (
                    <Badge className="bg-emerald-600 text-white">Accepted</Badge>
                )
            case RfqVendorStatus.REJECTED:
                return (
                    <Badge variant="outline" className="text-rose-500 border-rose-500/20 bg-rose-500/5">
                        Not Selected
                    </Badge>
                )
        }
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Top Navigation & Breadcrumb */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between border-b border-border/50 pb-4">
                <div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                        <Link href="/purchase" className="hover:text-primary transition-colors flex items-center gap-1">
                            <Truck className="w-3.5 h-3.5" /> Purchase & Procurement
                        </Link>
                        <span>/</span>
                        <span className="text-foreground font-medium flex items-center gap-1">
                            <FileSpreadsheet className="w-3.5 h-3.5 text-primary" /> Request for Quotation (RFQ)
                        </span>
                    </div>
                    <div className="flex items-center gap-3">
                        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                            Request for Quotation (RFQ)
                        </h1>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs py-0.5">
                            Multi-Vendor Bidding
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                        Solicit supplier bids, evaluate line-by-line price matrices, and convert winning proposals to Purchase Orders with 1 click.
                    </p>
                </div>

                {/* Header Actions */}
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            startTransition(() => {
                                router.refresh()
                                toast.success("Refreshed procurement tenders")
                            })
                        }}
                        disabled={isPending}
                        className="gap-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isPending ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <Link href="/purchase">
                        <Button variant="outline" size="sm" className="gap-2">
                            <ShoppingCart className="w-4 h-4" />
                            Purchase Orders
                        </Button>
                    </Link>
                    <Button
                        onClick={handleOpenCreate}
                        className="gap-2 shadow-sm font-medium"
                    >
                        <Plus className="w-4 h-4" />
                        Create RFQ Tender
                    </Button>
                </div>
            </div>

            {/* Telemetry Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="border-border/60 shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Tenders</p>
                            <p className="text-2xl font-bold tracking-tight">{initialData.telemetry.totalRfqs}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                Est. Budget: <span className="font-semibold text-foreground">{formatCurrency(initialData.telemetry.totalTargetSpend)}</span>
                            </p>
                        </div>
                        <div className="p-3 bg-primary/10 rounded-xl text-primary">
                            <FileSpreadsheet className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Bidding</p>
                            <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{initialData.telemetry.activeBidding}</p>
                            <p className="text-xs text-muted-foreground">Vendors currently submitting proposals</p>
                        </div>
                        <div className="p-3 bg-amber-500/10 rounded-xl text-amber-600 dark:text-amber-400">
                            <Clock className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Under Evaluation</p>
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{initialData.telemetry.pendingReview}</p>
                            <p className="text-xs text-muted-foreground">Bids received awaiting awarding</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 rounded-xl text-blue-600 dark:text-blue-400">
                            <SlidersHorizontal className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-border/60 shadow-xs">
                    <CardContent className="p-5 flex items-center justify-between">
                        <div className="space-y-1">
                            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Awarded & Converted</p>
                            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{initialData.telemetry.convertedCount}</p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                                Awarded: <span className="font-semibold text-emerald-600 dark:text-emerald-400">{formatCurrency(initialData.telemetry.awardedSpend)}</span>
                            </p>
                        </div>
                        <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <Award className="w-6 h-6" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Workspace */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Side / Master Table (7 cols or full width if no active selection) */}
                <div className={`${activeRfq ? "lg:col-span-5 xl:col-span-5" : "lg:col-span-12"} space-y-4`}>
                    <Card className="border-border/60 shadow-xs">
                        <CardHeader className="p-4 pb-3 border-b border-border/50">
                            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                                <div className="flex items-center gap-2">
                                    <FileSpreadsheet className="w-4 h-4 text-primary" />
                                    <CardTitle className="text-base font-semibold">Tender Inquiries</CardTitle>
                                    <Badge variant="secondary" className="text-xs">
                                        {filteredRfqs.length}
                                    </Badge>
                                </div>

                                <div className="flex items-center gap-2">
                                    <div className="relative w-full sm:w-56">
                                        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                        <Input
                                            placeholder="Search RFQs, title, vendors..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="h-8 pl-8 text-xs bg-muted/30"
                                        />
                                    </div>
                                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                                        <SelectTrigger className="h-8 text-xs w-36">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="ALL">All Statuses</SelectItem>
                                            <SelectItem value="DRAFT">Draft</SelectItem>
                                            <SelectItem value="SENT">Bidding Open</SelectItem>
                                            <SelectItem value="BIDDING_CLOSED">Under Review</SelectItem>
                                            <SelectItem value="CONVERTED">Awarded (PO)</SelectItem>
                                            <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardHeader>

                        <CardContent className="p-0">
                            {filteredRfqs.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground space-y-3">
                                    <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-muted-foreground">
                                        <FileSpreadsheet className="w-6 h-6" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium text-foreground">No RFQ Tenders Found</p>
                                        <p className="text-xs max-w-sm mx-auto text-muted-foreground">
                                            {searchQuery || statusFilter !== "ALL"
                                                ? "Try adjusting your search criteria or clear your active status filter."
                                                : "Create your first Request for Quotation to invite supplier bids and start comparing prices."}
                                        </p>
                                    </div>
                                    {!searchQuery && statusFilter === "ALL" && (
                                        <Button size="sm" onClick={handleOpenCreate} className="gap-1.5 mt-2">
                                            <Plus className="w-4 h-4" /> Create First RFQ
                                        </Button>
                                    )}
                                </div>
                            ) : (
                                <div className="divide-y divide-border/40">
                                    {filteredRfqs.map((rfq) => {
                                        const isSelected = activeRfqId === rfq.id
                                        const daysLeft = differenceInDays(new Date(rfq.dueDate), new Date())
                                        const isOverdue = daysLeft < 0 && rfq.status === RfqStatus.SENT

                                        return (
                                            <div
                                                key={rfq.id}
                                                onClick={() => {
                                                    setActiveRfqId(rfq.id)
                                                    setActiveDetailTab("matrix")
                                                }}
                                                className={`p-4 cursor-pointer transition-all hover:bg-muted/40 ${
                                                    isSelected
                                                        ? "bg-primary/5 border-l-4 border-l-primary"
                                                        : ""
                                                }`}
                                            >
                                                <div className="flex items-start justify-between gap-3">
                                                    <div className="space-y-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <span className="font-mono text-xs font-bold text-primary">
                                                                {rfq.rfqNumber}
                                                            </span>
                                                            {renderStatusBadge(rfq.status)}
                                                            {isOverdue && (
                                                                <Badge variant="destructive" className="text-[10px] py-0 px-1.5">
                                                                    Deadline Passed
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <h3 className="font-semibold text-sm truncate text-foreground">
                                                            {rfq.title}
                                                        </h3>
                                                    </div>

                                                    <div className="text-right whitespace-nowrap">
                                                        <p className="text-xs font-semibold text-foreground">
                                                            {rfq.lowestQuoteTotal !== null
                                                                ? formatCurrency(rfq.lowestQuoteTotal)
                                                                : formatCurrency(rfq.targetTotalBudget)}
                                                        </p>
                                                        <p className="text-[11px] text-muted-foreground">
                                                            {rfq.lowestQuoteTotal !== null ? "Lowest Bid" : "Target Est."}
                                                        </p>
                                                    </div>
                                                </div>

                                                <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground pt-2 border-t border-border/30">
                                                    <div className="flex items-center gap-3">
                                                        <span className="flex items-center gap-1">
                                                            <Boxes className="w-3.5 h-3.5 text-muted-foreground" />
                                                            {rfq.itemsCount} {rfq.itemsCount === 1 ? "item" : "items"}
                                                        </span>
                                                        <span className="flex items-center gap-1">
                                                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                                                            {rfq.quotesReceivedCount}/{rfq.vendorsCount} quotes
                                                        </span>
                                                    </div>

                                                    <div className="flex items-center gap-1.5 text-muted-foreground">
                                                        <Calendar className="w-3.5 h-3.5" />
                                                        <span>Due {format(new Date(rfq.dueDate), "MMM dd")}</span>
                                                        {daysLeft >= 0 && rfq.status === RfqStatus.SENT && (
                                                            <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium">
                                                                ({daysLeft}d left)
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Side / Interactive RFQ Tender Hub & Bid Comparison Matrix */}
                {activeRfq ? (
                    <div className="lg:col-span-7 xl:col-span-7 space-y-4">
                        <Card className="border-border/60 shadow-xs">
                            {/* Header details */}
                            <CardHeader className="p-5 pb-4 border-b border-border/50 bg-muted/20">
                                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                                    <div className="space-y-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="font-mono text-xs font-bold text-primary px-2 py-0.5 rounded bg-primary/10">
                                                {activeRfq.rfqNumber}
                                            </span>
                                            {renderStatusBadge(activeRfq.status)}
                                            <span className="text-xs text-muted-foreground">
                                                Created {format(new Date(activeRfq.createdAt), "MMM dd, yyyy")}
                                            </span>
                                        </div>
                                        <h2 className="text-xl font-bold text-foreground">
                                            {activeRfq.title}
                                        </h2>
                                        <p className="text-xs text-muted-foreground flex items-center gap-2">
                                            <span>Deadline: <strong className="text-foreground">{format(new Date(activeRfq.dueDate), "MMMM dd, yyyy")}</strong></span>
                                            <span>•</span>
                                            <span>Target Budget: <strong className="text-foreground">{formatCurrency(activeRfq.targetTotalBudget)}</strong></span>
                                        </p>
                                    </div>

                                    {/* Action dropdown */}
                                    <div className="flex items-center gap-2 self-start">
                                        {activeRfq.status === RfqStatus.DRAFT && (
                                            <Button
                                                size="sm"
                                                onClick={() => handleStatusChange(RfqStatus.SENT)}
                                                className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white font-medium"
                                                disabled={isPending}
                                            >
                                                <Send className="w-3.5 h-3.5" />
                                                Open Bidding
                                            </Button>
                                        )}
                                        {activeRfq.status === RfqStatus.SENT && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStatusChange(RfqStatus.BIDDING_CLOSED)}
                                                className="gap-1.5"
                                                disabled={isPending}
                                            >
                                                <SlidersHorizontal className="w-3.5 h-3.5" />
                                                Close Bidding
                                            </Button>
                                        )}
                                        {activeRfq.status === RfqStatus.BIDDING_CLOSED && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => handleStatusChange(RfqStatus.SENT)}
                                                className="gap-1.5"
                                                disabled={isPending}
                                            >
                                                <RefreshCw className="w-3.5 h-3.5" />
                                                Reopen Bids
                                            </Button>
                                        )}

                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                                    <SlidersHorizontal className="w-4 h-4" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuLabel>Tender Controls</DropdownMenuLabel>
                                                <DropdownMenuItem
                                                    onClick={() => {
                                                        setIsInviteOpen(true)
                                                        setInviteVendorIds([])
                                                    }}
                                                >
                                                    <Building2 className="w-4 h-4 mr-2" />
                                                    Invite More Vendors
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => setActiveDetailTab("print")}>
                                                    <Printer className="w-4 h-4 mr-2" />
                                                    Print Tender Slip
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                {activeRfq.status !== RfqStatus.CONVERTED && (
                                                    <RequireRole min="MANAGER"><DropdownMenuItem
                                                        onClick={() => handleDeleteRfq(activeRfq.id)}
                                                        className="text-rose-600 dark:text-rose-400 focus:text-rose-600"
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete RFQ
                                                    </DropdownMenuItem></RequireRole>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>

                                {/* Converted PO Banner */}
                                {activeRfq.status === RfqStatus.CONVERTED && activeRfq.convertedPoNumber && (
                                    <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-xs">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                            <span>
                                                Awarded to <strong>{activeRfq.bestVendorName || "winning vendor"}</strong> and converted to <strong>{activeRfq.convertedPoNumber}</strong>
                                            </span>
                                        </div>
                                        <Link href="/purchase">
                                            <Button size="sm" variant="outline" className="h-7 text-xs border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/10 gap-1">
                                                View in PO Hub <ExternalLink className="w-3 h-3" />
                                            </Button>
                                        </Link>
                                    </div>
                                )}

                                {/* Sub Tabs */}
                                <Tabs value={activeDetailTab} onValueChange={setActiveDetailTab} className="mt-4">
                                    <TabsList className="grid grid-cols-4 w-full h-9 bg-muted/60 p-1">
                                        <TabsTrigger value="matrix" className="text-xs flex items-center gap-1.5">
                                            <SlidersHorizontal className="w-3.5 h-3.5" /> Bid Matrix
                                        </TabsTrigger>
                                        <TabsTrigger value="vendors" className="text-xs flex items-center gap-1.5">
                                            <Building2 className="w-3.5 h-3.5" /> Suppliers ({activeRfq.vendors.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="items" className="text-xs flex items-center gap-1.5">
                                            <Boxes className="w-3.5 h-3.5" /> Items ({activeRfq.items.length})
                                        </TabsTrigger>
                                        <TabsTrigger value="print" className="text-xs flex items-center gap-1.5">
                                            <Printer className="w-3.5 h-3.5" /> Tender Slip
                                        </TabsTrigger>
                                    </TabsList>
                                </Tabs>
                            </CardHeader>

                            <CardContent className="p-5">
                                {/* TAB 1: BID COMPARISON MATRIX */}
                                {activeDetailTab === "matrix" && (
                                    <div className="space-y-5">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-semibold flex items-center gap-2">
                                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                                    Side-by-Side Proposal Comparison Matrix
                                                </h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Evaluates quotes received across invited suppliers. Green indicates the lowest unit cost.
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-2">
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => {
                                                        setIsInviteOpen(true)
                                                        setInviteVendorIds([])
                                                    }}
                                                    className="text-xs h-8 gap-1.5"
                                                >
                                                    <Plus className="w-3.5 h-3.5" /> Invite Supplier
                                                </Button>
                                            </div>
                                        </div>

                                        {activeRfq.vendors.length === 0 ? (
                                            <div className="p-8 text-center text-muted-foreground border border-dashed rounded-lg">
                                                <Building2 className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                                                <p className="text-sm font-medium text-foreground">No Suppliers Invited Yet</p>
                                                <p className="text-xs text-muted-foreground mt-1 mb-3">
                                                    Invite registered suppliers to this tender to compare proposals.
                                                </p>
                                                <Button
                                                    size="sm"
                                                    onClick={() => {
                                                        setIsInviteOpen(true)
                                                        setInviteVendorIds([])
                                                    }}
                                                    className="gap-1.5"
                                                >
                                                    <Plus className="w-4 h-4" /> Invite Suppliers
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto border border-border/60 rounded-xl">
                                                <Table>
                                                    <TableHeader className="bg-muted/30">
                                                        <TableRow>
                                                            <TableHead className="min-w-[180px] font-semibold">Tender Item Spec</TableHead>
                                                            <TableHead className="text-center font-semibold w-24">Target Qty</TableHead>
                                                            <TableHead className="text-right font-semibold w-28">Target Price</TableHead>

                                                            {/* Dynamically render column for each invited vendor */}
                                                            {activeRfq.vendors.map((vendorQuote) => (
                                                                <TableHead
                                                                    key={vendorQuote.id}
                                                                    className={`min-w-[170px] text-right font-semibold ${
                                                                        vendorQuote.isWinner ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-300" : ""
                                                                    }`}
                                                                >
                                                                    <div className="text-right">
                                                                        <div className="font-bold truncate text-foreground">
                                                                            {vendorQuote.vendorCompanyName || vendorQuote.vendorName}
                                                                        </div>
                                                                        <div className="text-[10px] text-muted-foreground font-normal">
                                                                            {vendorQuote.quoteReference ? `Ref: ${vendorQuote.quoteReference}` : "Pending Bid"}
                                                                        </div>
                                                                    </div>
                                                                </TableHead>
                                                            ))}
                                                        </TableRow>
                                                    </TableHeader>

                                                    <TableBody>
                                                        {activeRfq.items.map((rfqItem) => {
                                                            // Determine lowest price among submitted quotes for this item
                                                            const validQuotesForItem = activeRfq.vendors
                                                                .filter((v) => v.status === RfqVendorStatus.SUBMITTED || v.status === RfqVendorStatus.ACCEPTED)
                                                                .map((v) => {
                                                                    const qi = v.items.find((i) => i.rfqItemId === rfqItem.id)
                                                                    return qi && qi.unitPrice > 0 ? qi.unitPrice : null
                                                                })
                                                                .filter((p): p is number => p !== null)

                                                            const lowestItemPrice = validQuotesForItem.length > 0 ? Math.min(...validQuotesForItem) : null

                                                            return (
                                                                <TableRow key={rfqItem.id}>
                                                                    <TableCell className="font-medium text-xs">
                                                                        <div className="font-semibold text-foreground">{rfqItem.description}</div>
                                                                        {rfqItem.hsnSacCode && (
                                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                                HSN: {rfqItem.hsnSacCode}
                                                                            </span>
                                                                        )}
                                                                    </TableCell>
                                                                    <TableCell className="text-center text-xs font-mono">
                                                                        {rfqItem.quantity} {rfqItem.unit}
                                                                    </TableCell>
                                                                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                                                                        {rfqItem.targetUnitPrice ? formatCurrency(rfqItem.targetUnitPrice) : "—"}
                                                                    </TableCell>

                                                                    {/* Vendor quoted unit price cells */}
                                                                    {activeRfq.vendors.map((vendorQuote) => {
                                                                        const quoteItem = vendorQuote.items.find((i) => i.rfqItemId === rfqItem.id)
                                                                        const isLowest = lowestItemPrice !== null && quoteItem?.unitPrice === lowestItemPrice

                                                                        return (
                                                                            <TableCell
                                                                                key={vendorQuote.id}
                                                                                className={`text-right text-xs font-mono ${
                                                                                    isLowest ? "bg-emerald-500/5" : ""
                                                                                }`}
                                                                            >
                                                                                {quoteItem && quoteItem.unitPrice > 0 ? (
                                                                                    <div>
                                                                                        <div className={`font-semibold ${isLowest ? "text-emerald-700 dark:text-emerald-400" : "text-foreground"}`}>
                                                                                            {formatCurrency(quoteItem.unitPrice, vendorQuote.currencyCode)}
                                                                                        </div>
                                                                                        <div className="text-[10px] text-muted-foreground">
                                                                                            Total: {formatCurrency(quoteItem.lineTotal, vendorQuote.currencyCode)}
                                                                                        </div>
                                                                                        {isLowest && (
                                                                                            <span className="inline-block text-[9px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-1 rounded font-bold">
                                                                                                Lowest
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                ) : (
                                                                                    <span className="text-muted-foreground text-xs italic">
                                                                                        {vendorQuote.status === RfqVendorStatus.INVITED ? "Awaiting" : "Not quoted"}
                                                                                    </span>
                                                                                )}
                                                                            </TableCell>
                                                                        )
                                                                    })}
                                                                </TableRow>
                                                            )
                                                        })}

                                                        {/* SUMMARY ROWS */}
                                                        {/* Total Bid Amount */}
                                                        <TableRow className="bg-muted/20 font-bold border-t-2 border-border/80">
                                                            <TableCell className="text-xs uppercase font-bold text-foreground">
                                                                Total Quoted Bid
                                                            </TableCell>
                                                            <TableCell className="text-center text-xs font-mono text-muted-foreground">
                                                                —
                                                            </TableCell>
                                                            <TableCell className="text-right text-xs font-mono font-semibold text-foreground">
                                                                {formatCurrency(activeRfq.targetTotalBudget)}
                                                            </TableCell>

                                                            {activeRfq.vendors.map((vendorQuote) => {
                                                                const isLowestTotal =
                                                                    activeRfq.lowestQuoteTotal !== null &&
                                                                    vendorQuote.totalAmount === activeRfq.lowestQuoteTotal

                                                                return (
                                                                    <TableCell
                                                                        key={vendorQuote.id}
                                                                        className={`text-right font-mono text-xs ${
                                                                            isLowestTotal ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-bold" : "text-foreground"
                                                                        }`}
                                                                    >
                                                                        {vendorQuote.totalAmount > 0 ? (
                                                                            <div>
                                                                                <div className="text-sm">
                                                                                    {formatCurrency(vendorQuote.totalAmount, vendorQuote.currencyCode)}
                                                                                </div>
                                                                                {isLowestTotal && (
                                                                                    <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                                                                                        ⭐ Best Bid
                                                                                    </span>
                                                                                )}
                                                                            </div>
                                                                        ) : (
                                                                            "—"
                                                                        )}
                                                                    </TableCell>
                                                                )
                                                            })}
                                                        </TableRow>

                                                        {/* Lead Time Days */}
                                                        <TableRow className="bg-muted/10 text-xs">
                                                            <TableCell className="font-medium text-muted-foreground">
                                                                Delivery Lead Time
                                                            </TableCell>
                                                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                                                            <TableCell className="text-right text-muted-foreground font-mono">
                                                                Due {format(new Date(activeRfq.dueDate), "MMM dd")}
                                                            </TableCell>

                                                            {activeRfq.vendors.map((vendorQuote) => (
                                                                <TableCell key={vendorQuote.id} className="text-right font-mono text-xs">
                                                                    {vendorQuote.leadTimeDays !== null ? (
                                                                        <Badge variant="outline" className="text-xs font-normal">
                                                                            {vendorQuote.leadTimeDays} days
                                                                        </Badge>
                                                                    ) : (
                                                                        <span className="text-muted-foreground">—</span>
                                                                    )}
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>

                                                        {/* Budget Variance */}
                                                        <TableRow className="bg-muted/10 text-xs">
                                                            <TableCell className="font-medium text-muted-foreground">
                                                                Budget Variance
                                                            </TableCell>
                                                            <TableCell className="text-center text-muted-foreground">—</TableCell>
                                                            <TableCell className="text-right text-muted-foreground font-mono">Baseline</TableCell>

                                                            {activeRfq.vendors.map((vendorQuote) => {
                                                                if (vendorQuote.totalAmount <= 0 || activeRfq.targetTotalBudget <= 0) {
                                                                    return <TableCell key={vendorQuote.id} className="text-right text-muted-foreground">—</TableCell>
                                                                }
                                                                const diff = vendorQuote.totalAmount - activeRfq.targetTotalBudget
                                                                const pct = (diff / activeRfq.targetTotalBudget) * 100
                                                                const isSavings = diff <= 0

                                                                return (
                                                                    <TableCell
                                                                        key={vendorQuote.id}
                                                                        className={`text-right font-mono text-xs ${
                                                                            isSavings ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                                                                        }`}
                                                                    >
                                                                        <span className="flex items-center justify-end gap-0.5">
                                                                            {isSavings ? (
                                                                                <ArrowDownRight className="w-3 h-3" />
                                                                            ) : (
                                                                                <ArrowUpRight className="w-3 h-3" />
                                                                            )}
                                                                            {Math.abs(pct).toFixed(1)}% {isSavings ? "under" : "over"}
                                                                        </span>
                                                                    </TableCell>
                                                                )
                                                            })}
                                                        </TableRow>

                                                        {/* Action Buttons Row */}
                                                        <TableRow className="bg-background">
                                                            <TableCell className="font-medium text-xs text-muted-foreground">
                                                                Actions & Award
                                                            </TableCell>
                                                            <TableCell colSpan={2}></TableCell>

                                                            {activeRfq.vendors.map((vendorQuote) => (
                                                                <TableCell key={vendorQuote.id} className="text-right p-3">
                                                                    <div className="flex flex-col gap-1.5 items-end">
                                                                        <Button
                                                                            size="sm"
                                                                            variant="outline"
                                                                            className="h-7 text-xs w-full"
                                                                            onClick={() => handleOpenRecordBid(vendorQuote)}
                                                                        >
                                                                            {vendorQuote.status === RfqVendorStatus.INVITED ? "Record Bid" : "Edit Bid"}
                                                                        </Button>

                                                                        {activeRfq.status !== RfqStatus.CONVERTED && vendorQuote.totalAmount > 0 && (
                                                                            <RequireRole min="MANAGER"><Button
                                                                                size="sm"
                                                                                className="h-7 text-xs w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                                                                                onClick={() => handleAwardQuote(vendorQuote)}
                                                                                disabled={isPending}
                                                                            >
                                                                                <Award className="w-3.5 h-3.5 mr-1" />
                                                                                Award PO
                                                                            </Button></RequireRole>
                                                                        )}

                                                                        {vendorQuote.isWinner && (
                                                                            <Badge className="bg-emerald-600 text-white text-[10px] w-full justify-center">
                                                                                Won Tender
                                                                            </Badge>
                                                                        )}
                                                                    </div>
                                                                </TableCell>
                                                            ))}
                                                        </TableRow>
                                                    </TableBody>
                                                </Table>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 2: PARTICIPATING SUPPLIERS */}
                                {activeDetailTab === "vendors" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-semibold">Invited Vendors ({activeRfq.vendors.length})</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Manage candidate suppliers and inspect quotation responses.
                                                </p>
                                            </div>
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setIsInviteOpen(true)
                                                    setInviteVendorIds([])
                                                }}
                                                className="gap-1.5 text-xs"
                                            >
                                                <Plus className="w-3.5 h-3.5" /> Invite Suppliers
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                            {activeRfq.vendors.map((vendorQuote) => (
                                                <Card key={vendorQuote.id} className="border-border/60 shadow-xs">
                                                    <CardContent className="p-4 space-y-3">
                                                        <div className="flex items-start justify-between">
                                                            <div className="min-w-0">
                                                                <h5 className="font-bold text-sm text-foreground truncate">
                                                                    {vendorQuote.vendorCompanyName || vendorQuote.vendorName}
                                                                </h5>
                                                                {vendorQuote.vendorCompanyName && (
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        Contact: {vendorQuote.vendorName}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {renderVendorStatusBadge(vendorQuote.status, vendorQuote.isWinner)}
                                                        </div>

                                                        <div className="space-y-1 text-xs text-muted-foreground">
                                                            {vendorQuote.vendorEmail && (
                                                                <p className="flex items-center gap-1.5">
                                                                    <Mail className="w-3 h-3 text-muted-foreground" />
                                                                    {vendorQuote.vendorEmail}
                                                                </p>
                                                            )}
                                                            {vendorQuote.vendorPhone && (
                                                                <p className="flex items-center gap-1.5">
                                                                    <Phone className="w-3 h-3 text-muted-foreground" />
                                                                    {vendorQuote.vendorPhone}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                                                            <div>
                                                                <p className="text-xs text-muted-foreground">Quoted Total</p>
                                                                <p className="text-sm font-bold text-foreground">
                                                                    {vendorQuote.totalAmount > 0
                                                                        ? formatCurrency(vendorQuote.totalAmount, vendorQuote.currencyCode)
                                                                        : "Pending"}
                                                                </p>
                                                            </div>

                                                            <div className="flex items-center gap-1.5">
                                                                <Button
                                                                    size="sm"
                                                                    variant="outline"
                                                                    className="h-8 text-xs"
                                                                    onClick={() => handleOpenRecordBid(vendorQuote)}
                                                                >
                                                                    {vendorQuote.status === RfqVendorStatus.INVITED ? "Record Quote" : "Edit Quote"}
                                                                </Button>
                                                                {activeRfq.status !== RfqStatus.CONVERTED && vendorQuote.totalAmount > 0 && (
                                                                    <RequireRole min="MANAGER"><Button
                                                                        size="sm"
                                                                        className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                                                                        onClick={() => handleAwardQuote(vendorQuote)}
                                                                    >
                                                                        Award
                                                                    </Button></RequireRole>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* TAB 3: TENDER ITEMS SPEC */}
                                {activeDetailTab === "items" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <h4 className="text-sm font-semibold">Required Material & Services</h4>
                                                <p className="text-xs text-muted-foreground">
                                                    Technical line items required for this procurement tender.
                                                </p>
                                            </div>
                                            <div className="text-right text-xs">
                                                <span className="text-muted-foreground">Total Target Estimate: </span>
                                                <span className="font-bold text-foreground">
                                                    {formatCurrency(activeRfq.targetTotalBudget)}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="border border-border/60 rounded-lg overflow-hidden">
                                            <Table>
                                                <TableHeader className="bg-muted/30">
                                                    <TableRow>
                                                        <TableHead className="w-12 text-center">#</TableHead>
                                                        <TableHead>Description & Catalog Product</TableHead>
                                                        <TableHead>HSN / SAC</TableHead>
                                                        <TableHead className="text-center">Quantity</TableHead>
                                                        <TableHead className="text-right">Target Unit Price</TableHead>
                                                        <TableHead className="text-right">Est. Budget</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {activeRfq.items.map((item, idx) => (
                                                        <TableRow key={item.id}>
                                                            <TableCell className="text-center font-mono text-xs text-muted-foreground">
                                                                {idx + 1}
                                                            </TableCell>
                                                            <TableCell>
                                                                <div className="font-medium text-xs text-foreground">{item.description}</div>
                                                                {item.productName && (
                                                                    <p className="text-[11px] text-muted-foreground">
                                                                        Linked to: {item.productName}
                                                                    </p>
                                                                )}
                                                                {item.notes && (
                                                                    <p className="text-[10px] text-muted-foreground italic">
                                                                        Note: {item.notes}
                                                                    </p>
                                                                )}
                                                            </TableCell>
                                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                                {item.hsnSacCode || "—"}
                                                            </TableCell>
                                                            <TableCell className="text-center font-mono text-xs">
                                                                {item.quantity} {item.unit}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs">
                                                                {item.targetUnitPrice ? formatCurrency(item.targetUnitPrice) : "—"}
                                                            </TableCell>
                                                            <TableCell className="text-right font-mono text-xs font-semibold">
                                                                {formatCurrency(item.lineBudget)}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>

                                        {activeRfq.notes && (
                                            <div className="p-3 bg-muted/20 border border-border/50 rounded-lg text-xs space-y-1">
                                                <strong className="text-foreground">Tender Notes & Instructions:</strong>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{activeRfq.notes}</p>
                                            </div>
                                        )}

                                        {activeRfq.terms && (
                                            <div className="p-3 bg-muted/20 border border-border/50 rounded-lg text-xs space-y-1">
                                                <strong className="text-foreground">Submission Terms & Statutory Conditions:</strong>
                                                <p className="text-muted-foreground whitespace-pre-wrap">{activeRfq.terms}</p>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* TAB 4: PRINTABLE TENDER SPEC SHEET */}
                                {activeDetailTab === "print" && (
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs text-muted-foreground">
                                                Print or export this formal Request for Quotation tender notice to dispatch to potential bidders.
                                            </p>
                                            <Button
                                                size="sm"
                                                onClick={() => window.print()}
                                                className="gap-1.5 text-xs"
                                            >
                                                <Printer className="w-3.5 h-3.5" /> Print Tender Slip
                                            </Button>
                                        </div>

                                        <div className="p-8 border border-border/80 rounded-xl bg-white text-zinc-900 shadow-sm space-y-6 print:border-none print:shadow-none">
                                            {/* Tender Header */}
                                            <div className="flex justify-between items-start border-b pb-4">
                                                <div>
                                                    <h3 className="text-xl font-bold tracking-tight text-zinc-950">
                                                        GENESOFT ERP PROCUREMENT
                                                    </h3>
                                                    <p className="text-xs text-zinc-600">
                                                        Formal Tender / Request for Quotation (RFQ)
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    <span className="font-mono text-sm font-bold text-blue-800 bg-blue-50 px-2 py-1 rounded">
                                                        {activeRfq.rfqNumber}
                                                    </span>
                                                    <p className="text-xs text-zinc-600 mt-1">
                                                        Date: {format(new Date(activeRfq.issueDate), "dd MMM yyyy")}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Tender Subject */}
                                            <div className="space-y-1">
                                                <h4 className="text-base font-bold text-zinc-900">
                                                    Subject: {activeRfq.title}
                                                </h4>
                                                <p className="text-xs text-zinc-700">
                                                    Submission Deadline:{" "}
                                                    <strong>
                                                        {format(new Date(activeRfq.dueDate), "dd MMMM yyyy, 17:00 IST")}
                                                    </strong>
                                                </p>
                                            </div>

                                            {/* Specification Table */}
                                            <div className="border rounded overflow-hidden">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-zinc-100 border-b font-bold text-zinc-800">
                                                        <tr>
                                                            <th className="p-2 w-10 text-center">#</th>
                                                            <th className="p-2">Item Description & Specifications</th>
                                                            <th className="p-2 w-24">HSN Code</th>
                                                            <th className="p-2 w-20 text-center">Quantity</th>
                                                            <th className="p-2 w-28 text-right">Target Price</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y text-zinc-800">
                                                        {activeRfq.items.map((it, idx) => (
                                                            <tr key={it.id}>
                                                                <td className="p-2 text-center font-mono">{idx + 1}</td>
                                                                <td className="p-2 font-medium">
                                                                    {it.description}
                                                                    {it.notes && (
                                                                        <div className="text-[10px] text-zinc-500 italic">
                                                                            Specs: {it.notes}
                                                                        </div>
                                                                    )}
                                                                </td>
                                                                <td className="p-2 font-mono">{it.hsnSacCode || "—"}</td>
                                                                <td className="p-2 text-center font-mono">
                                                                    {it.quantity} {it.unit}
                                                                </td>
                                                                <td className="p-2 text-right font-mono">
                                                                    {it.targetUnitPrice ? formatCurrency(it.targetUnitPrice) : "Quote Required"}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            {/* Bidding Terms */}
                                            {activeRfq.terms && (
                                                <div className="space-y-1 text-xs text-zinc-700">
                                                    <strong className="text-zinc-900">Commercial Terms & Submission Guidelines:</strong>
                                                    <p className="whitespace-pre-wrap leading-relaxed text-zinc-600">
                                                        {activeRfq.terms}
                                                    </p>
                                                </div>
                                            )}

                                            <div className="pt-6 border-t flex justify-between items-end text-xs text-zinc-500">
                                                <p>Generated automatically via Genesoft Procurement Engine.</p>
                                                <div className="text-right space-y-8">
                                                    <p>Authorized Procurement Officer</p>
                                                    <p className="border-t pt-1 font-mono text-[10px]">SIGNATURE & STAMP</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                ) : (
                    <div className="hidden lg:block lg:col-span-7 xl:col-span-7">
                        <Card className="border-border/60 h-full flex items-center justify-center p-12 text-center text-muted-foreground min-h-[400px]">
                            <div className="space-y-3 max-w-sm">
                                <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto text-primary">
                                    <SlidersHorizontal className="w-6 h-6" />
                                </div>
                                <h3 className="font-semibold text-foreground text-base">Select an RFQ Tender</h3>
                                <p className="text-xs text-muted-foreground">
                                    Choose an inquiry from the list on the left to inspect multi-vendor comparison matrices, record supplier quotes, and award Purchase Orders.
                                </p>
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            {/* CREATE RFQ DIALOG */}
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Plus className="w-5 h-5 text-primary" /> Create Request for Quotation (RFQ)
                        </DialogTitle>
                        <DialogDescription>
                            Initiate a procurement inquiry, specify required items with target prices, and invite qualified suppliers to bid.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-3">
                        {/* Title & Deadline */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="rfq-title">Tender Title *</Label>
                                <Input
                                    id="rfq-title"
                                    placeholder="e.g. Q4 Raw Material Steel Procurement"
                                    value={createTitle}
                                    onChange={(e) => setCreateTitle(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="rfq-due-date">Submission Deadline *</Label>
                                <Input
                                    id="rfq-due-date"
                                    type="date"
                                    value={createDueDate}
                                    onChange={(e) => setCreateDueDate(e.target.value)}
                                />
                            </div>
                        </div>

                        {/* Line items */}
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <Label className="text-sm font-semibold">Tender Line Items *</Label>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAddItemLine}
                                    className="h-7 text-xs gap-1"
                                >
                                    <Plus className="w-3 h-3" /> Add Item Line
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {createItems.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className="p-3 border border-border/60 rounded-lg bg-muted/10 space-y-3"
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <span className="text-xs font-mono font-bold text-muted-foreground">
                                                Line #{index + 1}
                                            </span>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleRemoveItemLine(item.id)}
                                                className="h-6 w-6 p-0 text-muted-foreground hover:text-rose-500"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
                                            <div className="md:col-span-5 space-y-1">
                                                <Label className="text-xs">Catalog Product (Optional)</Label>
                                                <Select
                                                    value={item.productId}
                                                    onValueChange={(val) => handleUpdateItemLine(item.id, "productId", val)}
                                                >
                                                    <SelectTrigger className="h-8 text-xs">
                                                        <SelectValue placeholder="Pick from catalog..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {initialData.products.map((p) => (
                                                            <SelectItem key={p.id} value={p.id}>
                                                                {p.name} {p.sku ? `(${p.sku})` : ""}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="md:col-span-7 space-y-1">
                                                <Label className="text-xs">Item Description / Spec *</Label>
                                                <Input
                                                    className="h-8 text-xs"
                                                    placeholder="Detailed technical description..."
                                                    value={item.description}
                                                    onChange={(e) => handleUpdateItemLine(item.id, "description", e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-xs">Quantity *</Label>
                                                <Input
                                                    className="h-8 text-xs font-mono"
                                                    type="number"
                                                    min="0.01"
                                                    step="any"
                                                    value={item.quantity}
                                                    onChange={(e) => handleUpdateItemLine(item.id, "quantity", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Unit</Label>
                                                <Input
                                                    className="h-8 text-xs"
                                                    placeholder="pcs, kg, m"
                                                    value={item.unit}
                                                    onChange={(e) => handleUpdateItemLine(item.id, "unit", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">Target Unit Price</Label>
                                                <Input
                                                    className="h-8 text-xs font-mono"
                                                    type="number"
                                                    min="0"
                                                    step="any"
                                                    placeholder="0.00"
                                                    value={item.targetUnitPrice}
                                                    onChange={(e) => handleUpdateItemLine(item.id, "targetUnitPrice", e.target.value)}
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <Label className="text-xs">HSN / SAC</Label>
                                                <Input
                                                    className="h-8 text-xs font-mono"
                                                    placeholder="e.g. 7208"
                                                    value={item.hsnSacCode}
                                                    onChange={(e) => handleUpdateItemLine(item.id, "hsnSacCode", e.target.value)}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <div className="flex justify-end pt-2 text-xs">
                                <span className="text-muted-foreground mr-2">Estimated Target Budget:</span>
                                <strong className="font-bold text-foreground text-sm">
                                    {formatCurrency(createTargetTotal)}
                                </strong>
                            </div>
                        </div>

                        {/* Invite Vendors */}
                        <div className="space-y-2">
                            <Label className="text-sm font-semibold">Invite Registered Suppliers</Label>
                            <p className="text-xs text-muted-foreground">
                                Select candidate vendors from your directory to participate in this bidding round.
                            </p>
                            <div className="max-h-40 overflow-y-auto border border-border/60 rounded-lg p-2 divide-y divide-border/30">
                                {initialData.vendors.length === 0 ? (
                                    <p className="text-xs text-muted-foreground p-2 text-center">
                                        No active vendors in directory. You can create vendors in the Purchase Orders page.
                                    </p>
                                ) : (
                                    initialData.vendors.map((v) => {
                                        const isChecked = createInvitedVendorIds.includes(v.id)
                                        return (
                                            <label
                                                key={v.id}
                                                className="flex items-center gap-3 p-2 hover:bg-muted/30 cursor-pointer rounded text-xs"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={isChecked}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setCreateInvitedVendorIds((prev) => [...prev, v.id])
                                                        } else {
                                                            setCreateInvitedVendorIds((prev) => prev.filter((id) => id !== v.id))
                                                        }
                                                    }}
                                                    className="rounded text-primary focus:ring-primary h-4 w-4"
                                                />
                                                <div className="min-w-0 flex-1">
                                                    <div className="font-semibold text-foreground">
                                                        {v.companyName || v.displayName}
                                                    </div>
                                                    <div className="text-[11px] text-muted-foreground">
                                                        {v.email || v.phone || "No contact info"}
                                                    </div>
                                                </div>
                                            </label>
                                        )
                                    })
                                )}
                            </div>
                            <p className="text-[11px] text-muted-foreground">
                                {createInvitedVendorIds.length} supplier(s) selected
                            </p>
                        </div>

                        {/* Terms & Notes */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="rfq-notes">Internal Tender Notes</Label>
                                <Textarea
                                    id="rfq-notes"
                                    placeholder="Internal procurement specifications or justification..."
                                    rows={3}
                                    className="text-xs"
                                    value={createNotes}
                                    onChange={(e) => setCreateNotes(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="rfq-terms">Commercial Terms & Instructions</Label>
                                <Textarea
                                    id="rfq-terms"
                                    rows={3}
                                    className="text-xs font-mono"
                                    value={createTerms}
                                    onChange={(e) => setCreateTerms(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitCreate} disabled={isPending} className="gap-1.5">
                            <Plus className="w-4 h-4" /> Create Tender
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* RECORD VENDOR BID MODAL */}
            <Dialog open={isBidModalOpen} onOpenChange={setIsBidModalOpen}>
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <SlidersHorizontal className="w-5 h-5 text-primary" />
                            Record Supplier Bid: {biddingVendorQuote?.vendorCompanyName || biddingVendorQuote?.vendorName}
                        </DialogTitle>
                        <DialogDescription>
                            Enter quote reference, delivery lead time, and item pricing submitted by this supplier.
                        </DialogDescription>
                    </DialogHeader>

                    {activeRfq && biddingVendorQuote && (
                        <div className="space-y-4 py-2">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                    <Label className="text-xs">Supplier Quote Ref #</Label>
                                    <Input
                                        className="h-8 text-xs font-mono"
                                        placeholder="e.g. QT-2026-901"
                                        value={bidQuoteRef}
                                        onChange={(e) => setBidQuoteRef(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Quote Date</Label>
                                    <Input
                                        className="h-8 text-xs"
                                        type="date"
                                        value={bidQuoteDate}
                                        onChange={(e) => setBidQuoteDate(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <Label className="text-xs">Delivery Lead Time (Days)</Label>
                                    <Input
                                        className="h-8 text-xs font-mono"
                                        type="number"
                                        min="1"
                                        value={bidLeadTimeDays}
                                        onChange={(e) => setBidLeadTimeDays(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Item Pricing Matrix Inputs */}
                            <div className="space-y-2">
                                <Label className="text-xs font-semibold">Item-Level Quoted Pricing</Label>
                                <div className="border border-border/60 rounded-lg overflow-hidden">
                                    <Table>
                                        <TableHeader className="bg-muted/30">
                                            <TableRow>
                                                <TableHead className="text-xs">Item</TableHead>
                                                <TableHead className="text-xs text-center w-20">Req. Qty</TableHead>
                                                <TableHead className="text-xs w-28">Quoted Unit Price</TableHead>
                                                <TableHead className="text-xs w-20">Tax %</TableHead>
                                                <TableHead className="text-xs text-right w-28">Line Total</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {activeRfq.items.map((rfqItem) => {
                                                const row = bidItemInputs[rfqItem.id] || {
                                                    unitPrice: "",
                                                    taxPercent: "18",
                                                    availableQty: rfqItem.quantity.toString(),
                                                    notes: "",
                                                }
                                                const price = parseFloat(row.unitPrice) || 0
                                                const taxPct = parseFloat(row.taxPercent) || 0
                                                const lineTaxable = rfqItem.quantity * price
                                                const lineTotal = lineTaxable + (lineTaxable * taxPct) / 100

                                                return (
                                                    <TableRow key={rfqItem.id}>
                                                        <TableCell className="text-xs font-medium">
                                                            <div className="text-foreground">{rfqItem.description}</div>
                                                            {rfqItem.targetUnitPrice && (
                                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                                    Target: {formatCurrency(rfqItem.targetUnitPrice)}
                                                                </span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell className="text-center font-mono text-xs">
                                                            {rfqItem.quantity} {rfqItem.unit}
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="h-7 text-xs font-mono"
                                                                type="number"
                                                                min="0"
                                                                step="any"
                                                                placeholder="0.00"
                                                                value={row.unitPrice}
                                                                onChange={(e) =>
                                                                    setBidItemInputs((prev) => ({
                                                                        ...prev,
                                                                        [rfqItem.id]: {
                                                                            ...prev[rfqItem.id],
                                                                            unitPrice: e.target.value,
                                                                        },
                                                                    }))
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell>
                                                            <Input
                                                                className="h-7 text-xs font-mono"
                                                                type="number"
                                                                min="0"
                                                                max="100"
                                                                step="any"
                                                                value={row.taxPercent}
                                                                onChange={(e) =>
                                                                    setBidItemInputs((prev) => ({
                                                                        ...prev,
                                                                        [rfqItem.id]: {
                                                                            ...prev[rfqItem.id],
                                                                            taxPercent: e.target.value,
                                                                        },
                                                                    }))
                                                                }
                                                            />
                                                        </TableCell>
                                                        <TableCell className="text-right font-mono text-xs font-semibold">
                                                            {formatCurrency(lineTotal, bidCurrency)}
                                                        </TableCell>
                                                    </TableRow>
                                                )
                                            })}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>

                            <div className="space-y-1">
                                <Label className="text-xs">Supplier Terms & Notes</Label>
                                <Textarea
                                    className="text-xs"
                                    rows={2}
                                    placeholder="Payment terms, warranty period, or exceptions..."
                                    value={bidNotes}
                                    onChange={(e) => setBidNotes(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsBidModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSubmitRecordBid} disabled={isPending} className="gap-1.5">
                            <Check className="w-4 h-4" /> Save Bid Details
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* INVITE SUPPLIERS MODAL */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Building2 className="w-5 h-5 text-primary" /> Invite Suppliers to Tender
                        </DialogTitle>
                        <DialogDescription>
                            Select additional vendors from your directory to participate in {activeRfq?.rfqNumber}.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="py-2 space-y-2">
                        <div className="max-h-60 overflow-y-auto border border-border/60 rounded-lg p-2 divide-y divide-border/30">
                            {initialData.vendors
                                .filter((v) => !activeRfq?.vendors.some((av) => av.vendorId === v.id))
                                .map((v) => {
                                    const isChecked = inviteVendorIds.includes(v.id)
                                    return (
                                        <label
                                            key={v.id}
                                            className="flex items-center gap-3 p-2 hover:bg-muted/30 cursor-pointer rounded text-xs"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={(e) => {
                                                    if (e.target.checked) {
                                                        setInviteVendorIds((prev) => [...prev, v.id])
                                                    } else {
                                                        setInviteVendorIds((prev) => prev.filter((id) => id !== v.id))
                                                    }
                                                }}
                                                className="rounded text-primary focus:ring-primary h-4 w-4"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="font-semibold text-foreground">
                                                    {v.companyName || v.displayName}
                                                </div>
                                                <div className="text-[11px] text-muted-foreground">
                                                    {v.email || v.phone || "No contact info"}
                                                </div>
                                            </div>
                                        </label>
                                    )
                                })}

                            {initialData.vendors.filter((v) => !activeRfq?.vendors.some((av) => av.vendorId === v.id)).length === 0 && (
                                <p className="text-xs text-muted-foreground p-4 text-center">
                                    All registered suppliers have already been invited to this tender.
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsInviteOpen(false)}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleSubmitInvites}
                            disabled={isPending || inviteVendorIds.length === 0}
                            className="gap-1.5"
                        >
                            <Send className="w-4 h-4" /> Send Invitations
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
