"use client"

import { useState, useTransition, useMemo } from "react"
import { useRouter } from "next/navigation"
import {
    Home,
    Plus,
    Search,
    Calendar,
    DollarSign,
    Package,
    AlertCircle,
    CheckCircle2,
    Clock,
    RotateCcw,
    ShieldAlert,
    Receipt,
    Pencil,
    Trash2,
    Layers,
    User,
    Warehouse,
    Filter,
    ArrowUpRight,
    Loader2,
    ShieldCheck,
    Wrench,
    FileText,
    TrendingUp,
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
    RentalOverviewData,
    RentalAgreementRecord,
    RentalAssetRecord,
    createRentalAsset,
    updateRentalAsset,
    deleteRentalAsset,
    createRentalAgreement,
    updateRentalAgreementStatus,
    processRentalReturn,
    convertAgreementToInvoice,
} from "@/app/actions/rental"
import {
    AssetCondition,
    RentalAssetStatus,
    RentalBillingCycle,
    RentalStatus,
    DepositStatus,
} from "@prisma/client"

interface RentalClientProps {
    initialData: RentalOverviewData
}

export function RentalClient({ initialData }: RentalClientProps) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const [data, setData] = useState<RentalOverviewData>(initialData)

    // Active tab
    const [activeTab, setActiveTab] = useState("agreements")

    // Filter states
    const [agreementSearch, setAgreementSearch] = useState("")
    const [agreementStatusFilter, setAgreementStatusFilter] = useState<string>("all")
    const [assetSearch, setAssetSearch] = useState("")
    const [assetCategoryFilter, setAssetCategoryFilter] = useState<string>("all")
    const [assetStatusFilter, setAssetStatusFilter] = useState<string>("all")

    // Modal dialogs
    const [isNewAgreementOpen, setIsNewAgreementOpen] = useState(false)
    const [isNewAssetOpen, setIsNewAssetOpen] = useState(false)
    const [isReturnModalOpen, setIsReturnModalOpen] = useState(false)
    const [isEditAssetOpen, setIsEditAssetOpen] = useState(false)
    const [selectedAssetForEdit, setSelectedAssetForEdit] = useState<RentalAssetRecord | null>(null)
    const [selectedAgreementForReturn, setSelectedAgreementForReturn] = useState<RentalAgreementRecord | null>(null)
    const [selectedAssetIdForReturn, setSelectedAssetIdForReturn] = useState<string>("")

    // Form: New Agreement
    const [newAgreement, setNewAgreement] = useState<{
        contactId: string
        assetId: string
        startDate: string
        endDate: string
        billingCycle: RentalBillingCycle
        terms: string
        notes: string
    }>({
        contactId: "",
        assetId: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        endDate: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
        billingCycle: RentalBillingCycle.DAILY,
        terms: "Hirer accepts liability for operational safety, site security, and return in clean condition.",
        notes: "",
    })

    // Form: New Asset
    const [newAsset, setNewAsset] = useState<{
        name: string
        category: string
        assetCode: string
        serialNumber: string
        dailyRate: number
        weeklyRate: number
        monthlyRate: number
        securityDeposit: number
        condition: AssetCondition
        warehouseId: string
        description: string
    }>({
        name: "",
        category: "Heavy Machinery",
        assetCode: "",
        serialNumber: "",
        dailyRate: 0,
        weeklyRate: 0,
        monthlyRate: 0,
        securityDeposit: 0,
        condition: AssetCondition.EXCELLENT,
        warehouseId: "",
        description: "",
    })

    // Form: Process Return
    const [returnForm, setReturnForm] = useState<{
        returnDate: string
        condition: AssetCondition
        damageNotes: string
        damageFee: number
        lateFee: number
        depositRefunded: number
        inspectedBy: string
    }>({
        returnDate: format(new Date(), "yyyy-MM-dd"),
        condition: AssetCondition.EXCELLENT,
        damageNotes: "",
        damageFee: 0,
        lateFee: 0,
        depositRefunded: 0,
        inspectedBy: "",
    })

    // Categories list derived from assets
    const categories = useMemo(() => {
        const set = new Set(data.assets.map(a => a.category))
        return Array.from(set)
    }, [data.assets])

    // Filtered Agreements
    const filteredAgreements = useMemo(() => {
        return data.agreements.filter(ag => {
            const matchesSearch =
                ag.agreementNumber.toLowerCase().includes(agreementSearch.toLowerCase()) ||
                ag.contactName.toLowerCase().includes(agreementSearch.toLowerCase()) ||
                ag.items.some(i => i.assetName.toLowerCase().includes(agreementSearch.toLowerCase()))

            const matchesStatus =
                agreementStatusFilter === "all" || ag.status === agreementStatusFilter

            return matchesSearch && matchesStatus
        })
    }, [data.agreements, agreementSearch, agreementStatusFilter])

    // Filtered Assets
    const filteredAssets = useMemo(() => {
        return data.assets.filter(asset => {
            const matchesSearch =
                asset.name.toLowerCase().includes(assetSearch.toLowerCase()) ||
                asset.assetCode.toLowerCase().includes(assetSearch.toLowerCase()) ||
                asset.category.toLowerCase().includes(assetSearch.toLowerCase()) ||
                (asset.serialNumber && asset.serialNumber.toLowerCase().includes(assetSearch.toLowerCase()))

            const matchesCategory =
                assetCategoryFilter === "all" || asset.category === assetCategoryFilter

            const matchesStatus =
                assetStatusFilter === "all" || asset.status === assetStatusFilter

            return matchesSearch && matchesCategory && matchesStatus
        })
    }, [data.assets, assetSearch, assetCategoryFilter, assetStatusFilter])

    // Computed preview for New Agreement dialog
    const selectedAssetForNewAgreement = useMemo(() => {
        return data.assets.find(a => a.id === newAgreement.assetId)
    }, [data.assets, newAgreement.assetId])

    const agreementDurationDays = useMemo(() => {
        if (!newAgreement.startDate || !newAgreement.endDate) return 1
        const start = new Date(newAgreement.startDate)
        const end = new Date(newAgreement.endDate)
        const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
        return Math.max(1, diff)
    }, [newAgreement.startDate, newAgreement.endDate])

    const estimatedAgreementTotal = useMemo(() => {
        if (!selectedAssetForNewAgreement) return 0
        return selectedAssetForNewAgreement.dailyRate * agreementDurationDays
    }, [selectedAssetForNewAgreement, agreementDurationDays])

    // Handlers
    const handleCreateAgreement = () => {
        if (!newAgreement.contactId) {
            toast.error("Please select a customer contact")
            return
        }
        if (!newAgreement.assetId) {
            toast.error("Please select a rental asset")
            return
        }

        startTransition(async () => {
            try {
                await createRentalAgreement({
                    contactId: newAgreement.contactId,
                    startDate: newAgreement.startDate,
                    endDate: newAgreement.endDate,
                    billingCycle: newAgreement.billingCycle,
                    terms: newAgreement.terms,
                    notes: newAgreement.notes,
                    items: [
                        {
                            assetId: newAgreement.assetId,
                            quantity: 1,
                            rentalDays: agreementDurationDays,
                            rate: selectedAssetForNewAgreement?.dailyRate,
                        }
                    ]
                })

                toast.success("Rental agreement created and asset checked out!")
                setIsNewAgreementOpen(false)
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to create agreement")
            }
        })
    }

    const handleCreateAsset = () => {
        if (!newAsset.name.trim()) {
            toast.error("Asset name is required")
            return
        }
        if (newAsset.dailyRate <= 0) {
            toast.error("Daily rate must be greater than 0")
            return
        }

        startTransition(async () => {
            try {
                await createRentalAsset({
                    name: newAsset.name,
                    category: newAsset.category,
                    assetCode: newAsset.assetCode || undefined,
                    serialNumber: newAsset.serialNumber || undefined,
                    dailyRate: newAsset.dailyRate,
                    weeklyRate: newAsset.weeklyRate || undefined,
                    monthlyRate: newAsset.monthlyRate || undefined,
                    securityDeposit: newAsset.securityDeposit,
                    condition: newAsset.condition,
                    warehouseId: newAsset.warehouseId || undefined,
                    description: newAsset.description || undefined,
                })

                toast.success("Rental asset registered successfully!")
                setIsNewAssetOpen(false)
                setNewAsset({
                    name: "",
                    category: "Heavy Machinery",
                    assetCode: "",
                    serialNumber: "",
                    dailyRate: 0,
                    weeklyRate: 0,
                    monthlyRate: 0,
                    securityDeposit: 0,
                    condition: AssetCondition.EXCELLENT,
                    warehouseId: "",
                    description: "",
                })
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to register asset")
            }
        })
    }

    const handleOpenReturnModal = (ag: RentalAgreementRecord, defaultAssetId?: string) => {
        setSelectedAgreementForReturn(ag)
        const targetAssetId = defaultAssetId || ag.items[0]?.assetId || ""
        setSelectedAssetIdForReturn(targetAssetId)

        // Set initial refund to deposit
        setReturnForm({
            returnDate: format(new Date(), "yyyy-MM-dd"),
            condition: AssetCondition.EXCELLENT,
            damageNotes: "",
            damageFee: 0,
            lateFee: 0,
            depositRefunded: ag.securityDeposit,
            inspectedBy: "",
        })

        setIsReturnModalOpen(true)
    }

    const handleProcessReturn = () => {
        if (!selectedAgreementForReturn || !selectedAssetIdForReturn) return

        startTransition(async () => {
            try {
                await processRentalReturn({
                    agreementId: selectedAgreementForReturn.id,
                    assetId: selectedAssetIdForReturn,
                    returnDate: returnForm.returnDate,
                    condition: returnForm.condition,
                    damageNotes: returnForm.damageNotes || undefined,
                    damageFee: Number(returnForm.damageFee),
                    lateFee: Number(returnForm.lateFee),
                    depositRefunded: Number(returnForm.depositRefunded),
                    inspectedBy: returnForm.inspectedBy || undefined,
                })

                toast.success("Return processed, damages reconciled, and asset updated!")
                setIsReturnModalOpen(false)
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to process return")
            }
        })
    }

    const handleConvertToInvoice = (ag: RentalAgreementRecord) => {
        if (ag.invoiceId) {
            toast.info(`Invoice #${ag.invoiceNumber} is already generated for this agreement`)
            return
        }

        startTransition(async () => {
            try {
                const invoice = await convertAgreementToInvoice(ag.id)
                toast.success(`Generated official Sales Invoice #${invoice.invoiceNumber}!`)
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to generate invoice")
            }
        })
    }

    const handleCancelAgreement = (id: string) => {
        if (!confirm("Are you sure you want to cancel this agreement? Any checked-out assets will be released.")) {
            return
        }

        startTransition(async () => {
            try {
                await updateRentalAgreementStatus(id, RentalStatus.CANCELLED)
                toast.success("Agreement cancelled and assets released")
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to cancel agreement")
            }
        })
    }

    const handleDeleteAsset = (id: string) => {
        if (!confirm("Are you sure you want to delete this asset?")) return

        startTransition(async () => {
            try {
                await deleteRentalAsset(id)
                toast.success("Asset deleted successfully")
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to delete asset")
            }
        })
    }

    const handleEditAssetSubmit = () => {
        if (!selectedAssetForEdit) return

        startTransition(async () => {
            try {
                await updateRentalAsset(selectedAssetForEdit.id, {
                    name: selectedAssetForEdit.name,
                    category: selectedAssetForEdit.category,
                    serialNumber: selectedAssetForEdit.serialNumber || undefined,
                    dailyRate: selectedAssetForEdit.dailyRate,
                    weeklyRate: selectedAssetForEdit.weeklyRate || undefined,
                    monthlyRate: selectedAssetForEdit.monthlyRate || undefined,
                    securityDeposit: selectedAssetForEdit.securityDeposit,
                    condition: selectedAssetForEdit.condition,
                    status: selectedAssetForEdit.status,
                    warehouseId: selectedAssetForEdit.warehouseId || undefined,
                    description: selectedAssetForEdit.description || undefined,
                })

                toast.success("Asset updated successfully")
                setIsEditAssetOpen(false)
                setSelectedAssetForEdit(null)
                router.refresh()
            } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : "Failed to update asset")
            }
        })
    }

    // Helper badges
    const getStatusBadge = (status: RentalStatus) => {
        switch (status) {
            case RentalStatus.ACTIVE:
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">Active</Badge>
            case RentalStatus.OVERDUE:
                return <Badge variant="destructive" className="animate-pulse">Overdue</Badge>
            case RentalStatus.RETURNED:
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Returned</Badge>
            case RentalStatus.CANCELLED:
                return <Badge variant="secondary">Cancelled</Badge>
            default:
                return <Badge variant="outline">{status}</Badge>
        }
    }

    const getAssetStatusBadge = (status: RentalAssetStatus) => {
        switch (status) {
            case RentalAssetStatus.AVAILABLE:
                return <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800">Available</Badge>
            case RentalAssetStatus.RENTED:
                return <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800">Rented Out</Badge>
            case RentalAssetStatus.MAINTENANCE:
                return <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800">Maintenance</Badge>
            default:
                return <Badge variant="secondary">{status}</Badge>
        }
    }

    const getConditionBadge = (condition: AssetCondition) => {
        switch (condition) {
            case AssetCondition.EXCELLENT:
                return <Badge variant="outline" className="text-emerald-600 border-emerald-300">Excellent</Badge>
            case AssetCondition.GOOD:
                return <Badge variant="outline" className="text-blue-600 border-blue-300">Good</Badge>
            case AssetCondition.FAIR:
                return <Badge variant="outline" className="text-amber-600 border-amber-300">Fair</Badge>
            case AssetCondition.DAMAGED:
                return <Badge variant="destructive">Damaged</Badge>
            case AssetCondition.UNDER_MAINTENANCE:
                return <Badge variant="outline" className="text-purple-600 border-purple-300">Servicing</Badge>
            default:
                return <Badge variant="outline">{condition}</Badge>
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                        <Home className="h-8 w-8 text-primary" />
                        Rental & Asset Leasing
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Manage asset availability, draft rental agreements, track active leases, process returns with damage inspection, and automate tax invoicing.
                    </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setIsNewAssetOpen(true)}
                        className="gap-1.5"
                    >
                        <Package className="h-4 w-4" />
                        Register Asset
                    </Button>
                    <Button
                        onClick={() => setIsNewAgreementOpen(true)}
                        className="gap-1.5"
                    >
                        <Plus className="h-4 w-4" />
                        New Rental Agreement
                    </Button>
                </div>
            </div>

            {/* Overdue Alert Banner */}
            {data.stats.overdueAgreements > 0 && (
                <div className="rounded-xl border border-destructive/50 bg-destructive/10 p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <AlertCircle className="h-5 w-5 text-destructive animate-bounce" />
                        <div>
                            <p className="font-semibold text-destructive">
                                Attention Required: {data.stats.overdueAgreements} Rental Agreement(s) Overdue
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Contracts have passed their scheduled return dates without recorded check-in. Contact client or initiate return & inspection.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                            setActiveTab("agreements")
                            setAgreementStatusFilter(RentalStatus.OVERDUE)
                        }}
                    >
                        Review Overdue Contracts
                    </Button>
                </div>
            )}

            {/* KPI Telemetry */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="shadow-xs hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Fleet Availability</CardTitle>
                        <Package className="h-4 w-4 text-emerald-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.totalAssets} Units</div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground mt-2">
                            <span className="text-emerald-600 font-medium">{data.stats.availableAssets} Available</span>
                            <span className="text-blue-600 font-medium">{data.stats.rentedAssets} Rented</span>
                            <span className="text-amber-600 font-medium">{data.stats.maintenanceAssets} Service</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-1.5 mt-2">
                            <div
                                className="bg-emerald-500 h-1.5 rounded-full"
                                style={{ width: `${data.stats.availabilityRate}%` }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Leases</CardTitle>
                        <Clock className="h-4 w-4 text-blue-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{data.stats.activeAgreements} Active</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Contract Value: <span className="font-semibold text-foreground">₹{data.stats.totalContractValue.toLocaleString("en-IN")}</span>
                        </p>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-2">
                            <TrendingUp className="h-3 w-3 text-emerald-500" />
                            Live pipeline in active lease terms
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Security Deposits Held</CardTitle>
                        <ShieldCheck className="h-4 w-4 text-purple-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{data.stats.totalDepositHeld.toLocaleString("en-IN")}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Held in escrow against damage & overdue risk
                        </p>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-2">
                            <RotateCcw className="h-3 w-3 text-purple-500" />
                            Reconciled automatically upon return
                        </div>
                    </CardContent>
                </Card>

                <Card className="shadow-xs hover:border-primary/50 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Damages & Penalties</CardTitle>
                        <ShieldAlert className="h-4 w-4 text-amber-500" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">₹{data.stats.totalDamageFeesCollected.toLocaleString("en-IN")}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Collected fees across {data.returns.length} return inspection(s)
                        </p>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-2">
                            <Wrench className="h-3 w-3 text-amber-500" />
                            {data.stats.maintenanceAssets} asset(s) under scheduled service
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/60 p-1">
                    <TabsTrigger value="agreements" className="gap-2">
                        <FileText className="h-4 w-4" />
                        Agreements & Contracts ({data.agreements.length})
                    </TabsTrigger>
                    <TabsTrigger value="assets" className="gap-2">
                        <Package className="h-4 w-4" />
                        Asset Fleet Directory ({data.assets.length})
                    </TabsTrigger>
                    <TabsTrigger value="schedule" className="gap-2">
                        <Calendar className="h-4 w-4" />
                        Schedule & Timeline
                    </TabsTrigger>
                    <TabsTrigger value="returns" className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Returns & Damage Log ({data.returns.length})
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: AGREEMENTS */}
                <TabsContent value="agreements" className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="flex flex-1 items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search agreements, customer, asset..."
                                    value={agreementSearch}
                                    onChange={e => setAgreementSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Select value={agreementStatusFilter} onValueChange={setAgreementStatusFilter}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value={RentalStatus.ACTIVE}>Active</SelectItem>
                                    <SelectItem value={RentalStatus.OVERDUE}>Overdue</SelectItem>
                                    <SelectItem value={RentalStatus.RETURNED}>Returned</SelectItem>
                                    <SelectItem value={RentalStatus.CANCELLED}>Cancelled</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Agreement #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Rental Item(s)</TableHead>
                                        <TableHead>Duration / Dates</TableHead>
                                        <TableHead>Total Rent</TableHead>
                                        <TableHead>Deposit</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAgreements.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                                                No rental agreements found matching your search.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAgreements.map(ag => (
                                            <TableRow key={ag.id} className="hover:bg-muted/40">
                                                <TableCell className="font-semibold">
                                                    <div className="flex flex-col">
                                                        <span>{ag.agreementNumber}</span>
                                                        <span className="text-[11px] text-muted-foreground">
                                                            {format(new Date(ag.createdAt), "dd MMM yyyy")}
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-medium">{ag.contactName}</span>
                                                        <span className="text-xs text-muted-foreground">{ag.contactPhone || ag.contactEmail || "—"}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col gap-1 max-w-[220px]">
                                                        {ag.items.map(item => (
                                                            <div key={item.id} className="text-xs truncate flex items-center gap-1.5">
                                                                <Badge variant="outline" className="text-[10px] py-0 px-1">
                                                                    {item.assetCode}
                                                                </Badge>
                                                                <span className="truncate">{item.assetName}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span>{format(new Date(ag.startDate), "dd MMM")} → {format(new Date(ag.endDate), "dd MMM yyyy")}</span>
                                                        <span className="text-muted-foreground">
                                                            {Math.ceil((new Date(ag.endDate).getTime() - new Date(ag.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days ({ag.billingCycle.toLowerCase()})
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                    ₹{ag.totalRentalAmount.toLocaleString("en-IN")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span>₹{ag.securityDeposit.toLocaleString("en-IN")}</span>
                                                        <Badge variant="outline" className="text-[10px] w-fit">
                                                            {ag.depositStatus.replace("_", " ")}
                                                        </Badge>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getStatusBadge(ag.status)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        {(ag.status === RentalStatus.ACTIVE || ag.status === RentalStatus.OVERDUE) && (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 dark:hover:bg-emerald-950"
                                                                onClick={() => handleOpenReturnModal(ag)}
                                                            >
                                                                <RotateCcw className="h-3 w-3" />
                                                                Return Gear
                                                            </Button>
                                                        )}

                                                        {!ag.invoiceId ? (
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700"
                                                                onClick={() => handleConvertToInvoice(ag)}
                                                                disabled={isPending}
                                                            >
                                                                <Receipt className="h-3 w-3" />
                                                                Invoice
                                                            </Button>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-[11px] gap-1">
                                                                <Receipt className="h-3 w-3 text-blue-500" />
                                                                {ag.invoiceNumber}
                                                            </Badge>
                                                        )}

                                                        {ag.status === RentalStatus.ACTIVE && (
                                                            <Button
                                                                size="sm"
                                                                variant="ghost"
                                                                className="h-7 text-xs text-muted-foreground hover:text-destructive"
                                                                onClick={() => handleCancelAgreement(ag.id)}
                                                            >
                                                                Cancel
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

                {/* TAB 2: ASSET FLEET DIRECTORY */}
                <TabsContent value="assets" className="space-y-4">
                    <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                        <div className="flex flex-1 flex-wrap items-center gap-2 w-full sm:w-auto">
                            <div className="relative flex-1 sm:max-w-xs">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search asset, category, serial..."
                                    value={assetSearch}
                                    onChange={e => setAssetSearch(e.target.value)}
                                    className="pl-8"
                                />
                            </div>
                            <Select value={assetCategoryFilter} onValueChange={setAssetCategoryFilter}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="All Categories" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {categories.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Select value={assetStatusFilter} onValueChange={setAssetStatusFilter}>
                                <SelectTrigger className="w-[150px]">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value={RentalAssetStatus.AVAILABLE}>Available</SelectItem>
                                    <SelectItem value={RentalAssetStatus.RENTED}>Rented Out</SelectItem>
                                    <SelectItem value={RentalAssetStatus.MAINTENANCE}>Maintenance</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <Card>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Code</TableHead>
                                        <TableHead>Asset Name</TableHead>
                                        <TableHead>Category</TableHead>
                                        <TableHead>Depot Location</TableHead>
                                        <TableHead>Daily Rate</TableHead>
                                        <TableHead>Weekly / Monthly</TableHead>
                                        <TableHead>Deposit</TableHead>
                                        <TableHead>Condition</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredAssets.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={10} className="text-center py-12 text-muted-foreground">
                                                No assets found matching your search.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        filteredAssets.map(asset => (
                                            <TableRow key={asset.id} className="hover:bg-muted/40">
                                                <TableCell className="font-mono text-xs font-semibold">
                                                    {asset.assetCode}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-sm">{asset.name}</span>
                                                        {asset.serialNumber && (
                                                            <span className="text-[11px] text-muted-foreground font-mono">
                                                                S/N: {asset.serialNumber}
                                                            </span>
                                                        )}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {asset.category}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {asset.warehouseName || "Main Depot"}
                                                </TableCell>
                                                <TableCell className="font-semibold">
                                                    ₹{asset.dailyRate.toLocaleString("en-IN")}/day
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    <div>W: {asset.weeklyRate ? `₹${asset.weeklyRate.toLocaleString("en-IN")}` : "—"}</div>
                                                    <div>M: {asset.monthlyRate ? `₹${asset.monthlyRate.toLocaleString("en-IN")}` : "—"}</div>
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    ₹{asset.securityDeposit.toLocaleString("en-IN")}
                                                </TableCell>
                                                <TableCell>
                                                    {getConditionBadge(asset.condition)}
                                                </TableCell>
                                                <TableCell>
                                                    {getAssetStatusBadge(asset.status)}
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                            onClick={() => {
                                                                setSelectedAssetForEdit(asset)
                                                                setIsEditAssetOpen(true)
                                                            }}
                                                        >
                                                            <Pencil className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            disabled={asset.status === RentalAssetStatus.RENTED}
                                                            onClick={() => handleDeleteAsset(asset.id)}
                                                        >
                                                            <Trash2 className="h-3.5 w-3.5" />
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

                {/* TAB 3: SCHEDULE & TIMELINE */}
                <TabsContent value="schedule" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-primary" />
                                Active & Upcoming Lease Timelines
                            </CardTitle>
                            <CardDescription>
                                Monitor scheduled rental checkout durations, return milestones, and active contract timelines.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {data.agreements.map(ag => {
                                    const now = new Date().getTime()
                                    const start = new Date(ag.startDate).getTime()
                                    const end = new Date(ag.endDate).getTime()
                                    const totalDuration = Math.max(1, end - start)
                                    const elapsed = Math.max(0, Math.min(totalDuration, now - start))
                                    const percent = Math.round((elapsed / totalDuration) * 100)
                                    const isOverdue = ag.status === RentalStatus.OVERDUE || (ag.status === RentalStatus.ACTIVE && now > end)

                                    return (
                                        <div key={ag.id} className="p-4 rounded-xl border bg-card/60 hover:bg-muted/30 transition-colors space-y-3">
                                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <div className="flex items-center gap-2.5">
                                                    <Badge variant="outline" className="font-mono">
                                                        {ag.agreementNumber}
                                                    </Badge>
                                                    <span className="font-semibold text-sm">{ag.contactName}</span>
                                                    {getStatusBadge(ag.status)}
                                                </div>
                                                <div className="text-xs text-muted-foreground">
                                                    {format(new Date(ag.startDate), "dd MMM yyyy")} → {format(new Date(ag.endDate), "dd MMM yyyy")}
                                                </div>
                                            </div>

                                            <div className="text-xs text-muted-foreground flex flex-wrap gap-2 items-center">
                                                <span>Items:</span>
                                                {ag.items.map(item => (
                                                    <span key={item.id} className="font-medium text-foreground bg-muted px-2 py-0.5 rounded-md">
                                                        {item.assetName} ({item.assetCode})
                                                    </span>
                                                ))}
                                            </div>

                                            {/* Progress bar */}
                                            {ag.status !== RentalStatus.RETURNED && ag.status !== RentalStatus.CANCELLED && (
                                                <div className="space-y-1">
                                                    <div className="flex justify-between text-[11px] text-muted-foreground">
                                                        <span>Lease progress: {percent}%</span>
                                                        <span className={isOverdue ? "text-destructive font-semibold" : ""}>
                                                            {isOverdue ? "Return Overdue!" : `${Math.ceil((end - now) / (1000 * 60 * 60 * 24))} days remaining`}
                                                        </span>
                                                    </div>
                                                    <div className="w-full bg-muted rounded-full h-2">
                                                        <div
                                                            className={`h-2 rounded-full ${isOverdue ? "bg-destructive" : "bg-primary"}`}
                                                            style={{ width: `${Math.min(100, percent)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: RETURNS & DAMAGE LOG */}
                <TabsContent value="returns" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base flex items-center gap-2">
                                <RotateCcw className="h-4 w-4 text-emerald-500" />
                                Return Inspection & Damage Reconciliation Ledger
                            </CardTitle>
                            <CardDescription>
                                Formal inspection reports, recorded return conditions, assessed damage fees, and settled security deposit reconciliations.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Return Date</TableHead>
                                        <TableHead>Agreement #</TableHead>
                                        <TableHead>Customer</TableHead>
                                        <TableHead>Asset</TableHead>
                                        <TableHead>Condition</TableHead>
                                        <TableHead>Inspection & Damage Notes</TableHead>
                                        <TableHead>Fees Assessed</TableHead>
                                        <TableHead>Deposit Refunded</TableHead>
                                        <TableHead className="text-right">Inspected By</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.returns.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                                                No return inspection logs recorded yet.
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.returns.map(r => (
                                            <TableRow key={r.id} className="hover:bg-muted/40">
                                                <TableCell className="text-xs font-medium">
                                                    {format(new Date(r.returnDate), "dd MMM yyyy")}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs font-semibold">
                                                    {r.agreementNumber}
                                                </TableCell>
                                                <TableCell className="text-xs font-medium">
                                                    {r.customerName}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        <span className="font-semibold">{r.assetName}</span>
                                                        <span className="text-muted-foreground font-mono">{r.assetCode}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {getConditionBadge(r.condition)}
                                                </TableCell>
                                                <TableCell className="max-w-[240px] text-xs text-muted-foreground truncate">
                                                    {r.damageNotes || "No damages reported. Standard check-in."}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex flex-col text-xs">
                                                        {r.damageFee > 0 && <span className="text-destructive">Damage: ₹{r.damageFee.toLocaleString("en-IN")}</span>}
                                                        {r.lateFee > 0 && <span className="text-amber-600">Late: ₹{r.lateFee.toLocaleString("en-IN")}</span>}
                                                        {r.damageFee === 0 && r.lateFee === 0 && <span className="text-muted-foreground">None</span>}
                                                    </div>
                                                </TableCell>
                                                <TableCell className="font-semibold text-xs text-emerald-600">
                                                    ₹{r.depositRefunded.toLocaleString("en-IN")}
                                                </TableCell>
                                                <TableCell className="text-right text-xs text-muted-foreground">
                                                    {r.inspectedBy || "System Admin"}
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

            {/* MODAL: NEW RENTAL AGREEMENT */}
            <Dialog open={isNewAgreementOpen} onOpenChange={setIsNewAgreementOpen}>
                <DialogContent className="sm:max-w-[620px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-primary" />
                            Draft New Rental Agreement
                        </DialogTitle>
                        <DialogDescription>
                            Select the hiring customer, choose available rental gear, set checkout dates, and review calculated rental value and security deposit.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* Customer */}
                        <div className="space-y-1.5">
                            <Label>Hiring Customer / Organization *</Label>
                            <Select
                                value={newAgreement.contactId}
                                onValueChange={val => setNewAgreement(prev => ({ ...prev, contactId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select client account..." />
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

                        {/* Rental Asset Picker */}
                        <div className="space-y-1.5">
                            <Label>Select Rental Asset *</Label>
                            <Select
                                value={newAgreement.assetId}
                                onValueChange={val => setNewAgreement(prev => ({ ...prev, assetId: val }))}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Choose available asset from fleet..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {data.assets
                                        .filter(a => a.status === RentalAssetStatus.AVAILABLE)
                                        .map(a => (
                                            <SelectItem key={a.id} value={a.id}>
                                                {a.assetCode} — {a.name} (₹{a.dailyRate.toLocaleString("en-IN")}/day, Dep: ₹{a.securityDeposit.toLocaleString("en-IN")})
                                            </SelectItem>
                                        ))}
                                </SelectContent>
                            </Select>
                            {data.assets.filter(a => a.status === RentalAssetStatus.AVAILABLE).length === 0 && (
                                <p className="text-xs text-amber-600">
                                    No assets currently available. Register or check in returned equipment.
                                </p>
                            )}
                        </div>

                        {/* Dates & Billing Cycle */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label>Start Date</Label>
                                <Input
                                    type="date"
                                    value={newAgreement.startDate}
                                    onChange={e => setNewAgreement(prev => ({ ...prev, startDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Expected Return Date</Label>
                                <Input
                                    type="date"
                                    value={newAgreement.endDate}
                                    onChange={e => setNewAgreement(prev => ({ ...prev, endDate: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Billing Cycle</Label>
                                <Select
                                    value={newAgreement.billingCycle}
                                    onValueChange={val => setNewAgreement(prev => ({ ...prev, billingCycle: val as RentalBillingCycle }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value={RentalBillingCycle.DAILY}>Daily</SelectItem>
                                        <SelectItem value={RentalBillingCycle.WEEKLY}>Weekly</SelectItem>
                                        <SelectItem value={RentalBillingCycle.MONTHLY}>Monthly</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Financial calculation card */}
                        {selectedAssetForNewAgreement && (
                            <div className="rounded-xl border bg-muted/40 p-3 space-y-2">
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                    Contract Financial Estimation
                                </div>
                                <div className="grid grid-cols-3 gap-2 text-sm">
                                    <div>
                                        <span className="text-xs text-muted-foreground block">Duration:</span>
                                        <span className="font-semibold">{agreementDurationDays} Days</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground block">Total Rent:</span>
                                        <span className="font-bold text-primary">₹{estimatedAgreementTotal.toLocaleString("en-IN")}</span>
                                    </div>
                                    <div>
                                        <span className="text-xs text-muted-foreground block">Deposit Required:</span>
                                        <span className="font-semibold text-purple-600">₹{selectedAssetForNewAgreement.securityDeposit.toLocaleString("en-IN")}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Terms & Notes */}
                        <div className="space-y-1.5">
                            <Label>Contract Terms & Operational Liabilities</Label>
                            <Textarea
                                rows={2}
                                value={newAgreement.terms}
                                onChange={e => setNewAgreement(prev => ({ ...prev, terms: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label>Internal Delivery Notes (Optional)</Label>
                            <Input
                                placeholder="e.g., Gate pass #, contact on site, delivery truck details"
                                value={newAgreement.notes}
                                onChange={e => setNewAgreement(prev => ({ ...prev, notes: e.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewAgreementOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateAgreement} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Activate Agreement & Check Out
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: REGISTER NEW ASSET */}
            <Dialog open={isNewAssetOpen} onOpenChange={setIsNewAssetOpen}>
                <DialogContent className="sm:max-w-[580px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Package className="h-5 w-5 text-primary" />
                            Register Rental Asset
                        </DialogTitle>
                        <DialogDescription>
                            Add new machinery, vehicles, studio tech, or equipment into the leasing catalog.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3.5 py-2">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Asset Name *</Label>
                                <Input
                                    placeholder="e.g. Caterpillar 320D Excavator"
                                    value={newAsset.name}
                                    onChange={e => setNewAsset(prev => ({ ...prev, name: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Category *</Label>
                                <Input
                                    placeholder="e.g. Heavy Machinery, Audio/Visual"
                                    value={newAsset.category}
                                    onChange={e => setNewAsset(prev => ({ ...prev, category: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Asset Code (Optional)</Label>
                                <Input
                                    placeholder="e.g. AST-007 (leave blank for auto)"
                                    value={newAsset.assetCode}
                                    onChange={e => setNewAsset(prev => ({ ...prev, assetCode: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Serial Number / VIN</Label>
                                <Input
                                    placeholder="e.g. CAT-320-X889"
                                    value={newAsset.serialNumber}
                                    onChange={e => setNewAsset(prev => ({ ...prev, serialNumber: e.target.value }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1.5">
                                <Label>Daily Rate (₹) *</Label>
                                <Input
                                    type="number"
                                    placeholder="₹ / day"
                                    value={newAsset.dailyRate || ""}
                                    onChange={e => setNewAsset(prev => ({ ...prev, dailyRate: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Weekly Rate (₹)</Label>
                                <Input
                                    type="number"
                                    placeholder="Optional"
                                    value={newAsset.weeklyRate || ""}
                                    onChange={e => setNewAsset(prev => ({ ...prev, weeklyRate: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Monthly Rate (₹)</Label>
                                <Input
                                    type="number"
                                    placeholder="Optional"
                                    value={newAsset.monthlyRate || ""}
                                    onChange={e => setNewAsset(prev => ({ ...prev, monthlyRate: Number(e.target.value) }))}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label>Security Deposit (₹)</Label>
                                <Input
                                    type="number"
                                    placeholder="₹ Deposit"
                                    value={newAsset.securityDeposit || ""}
                                    onChange={e => setNewAsset(prev => ({ ...prev, securityDeposit: Number(e.target.value) }))}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label>Depot Warehouse</Label>
                                <Select
                                    value={newAsset.warehouseId}
                                    onValueChange={val => setNewAsset(prev => ({ ...prev, warehouseId: val }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select facility depot..." />
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
                        </div>

                        <div className="space-y-1.5">
                            <Label>Description / Specifications</Label>
                            <Textarea
                                rows={2}
                                placeholder="Technical specifications, capacity, maintenance schedule..."
                                value={newAsset.description}
                                onChange={e => setNewAsset(prev => ({ ...prev, description: e.target.value }))}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsNewAssetOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreateAsset} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Register Asset
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: PROCESS RETURN & DAMAGE INSPECTION */}
            <Dialog open={isReturnModalOpen} onOpenChange={setIsReturnModalOpen}>
                <DialogContent className="sm:max-w-[560px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <RotateCcw className="h-5 w-5 text-emerald-500" />
                            Return Gear & Damage Inspection
                        </DialogTitle>
                        <DialogDescription>
                            Inspect returning equipment, record condition, compute damage or late fees, and settle security deposit refund.
                        </DialogDescription>
                    </DialogHeader>

                    {selectedAgreementForReturn && (
                        <div className="space-y-4 py-2">
                            <div className="rounded-xl border bg-muted/40 p-3 space-y-1 text-xs">
                                <div className="font-semibold text-foreground">
                                    Agreement #{selectedAgreementForReturn.agreementNumber} — {selectedAgreementForReturn.contactName}
                                </div>
                                <div className="text-muted-foreground">
                                    Total Security Deposit Held: <span className="font-semibold text-purple-600">₹{selectedAgreementForReturn.securityDeposit.toLocaleString("en-IN")}</span>
                                </div>
                            </div>

                            {/* Select asset to return if multiple */}
                            <div className="space-y-1.5">
                                <Label>Asset Being Returned *</Label>
                                <Select
                                    value={selectedAssetIdForReturn}
                                    onValueChange={setSelectedAssetIdForReturn}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {selectedAgreementForReturn.items.map(item => (
                                            <SelectItem key={item.assetId} value={item.assetId}>
                                                {item.assetCode} — {item.assetName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Return Date</Label>
                                    <Input
                                        type="date"
                                        value={returnForm.returnDate}
                                        onChange={e => setReturnForm(prev => ({ ...prev, returnDate: e.target.value }))}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Condition on Return *</Label>
                                    <Select
                                        value={returnForm.condition}
                                        onValueChange={val => setReturnForm(prev => ({ ...prev, condition: val as AssetCondition }))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={AssetCondition.EXCELLENT}>Excellent (Pristine)</SelectItem>
                                            <SelectItem value={AssetCondition.GOOD}>Good (Normal Wear)</SelectItem>
                                            <SelectItem value={AssetCondition.FAIR}>Fair (Minor scuffs)</SelectItem>
                                            <SelectItem value={AssetCondition.DAMAGED}>Damaged (Requires Repair)</SelectItem>
                                            <SelectItem value={AssetCondition.UNDER_MAINTENANCE}>Under Maintenance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Inspection & Damage Notes</Label>
                                <Textarea
                                    rows={2}
                                    placeholder="Describe any scratch, dent, electrical issue, or missing accessories..."
                                    value={returnForm.damageNotes}
                                    onChange={e => setReturnForm(prev => ({ ...prev, damageNotes: e.target.value }))}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Damage Fee (₹)</Label>
                                    <Input
                                        type="number"
                                        value={returnForm.damageFee || ""}
                                        onChange={e => {
                                            const fee = Number(e.target.value)
                                            setReturnForm(prev => ({
                                                ...prev,
                                                damageFee: fee,
                                                depositRefunded: Math.max(0, selectedAgreementForReturn.securityDeposit - (fee + prev.lateFee))
                                            }))
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Late Return Fee (₹)</Label>
                                    <Input
                                        type="number"
                                        value={returnForm.lateFee || ""}
                                        onChange={e => {
                                            const fee = Number(e.target.value)
                                            setReturnForm(prev => ({
                                                ...prev,
                                                lateFee: fee,
                                                depositRefunded: Math.max(0, selectedAgreementForReturn.securityDeposit - (prev.damageFee + fee))
                                            }))
                                        }}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Deposit Refund (₹)</Label>
                                    <Input
                                        type="number"
                                        value={returnForm.depositRefunded || ""}
                                        onChange={e => setReturnForm(prev => ({ ...prev, depositRefunded: Number(e.target.value) }))}
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label>Inspecting Technician / Officer</Label>
                                <Input
                                    placeholder="e.g. Rajesh Sharma"
                                    value={returnForm.inspectedBy}
                                    onChange={e => setReturnForm(prev => ({ ...prev, inspectedBy: e.target.value }))}
                                />
                            </div>
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsReturnModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleProcessReturn} disabled={isPending} className="bg-emerald-600 hover:bg-emerald-700">
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Confirm Return & Restock
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* MODAL: EDIT ASSET */}
            {selectedAssetForEdit && (
                <Dialog open={isEditAssetOpen} onOpenChange={setIsEditAssetOpen}>
                    <DialogContent className="sm:max-w-[540px]">
                        <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                                <Pencil className="h-5 w-5 text-primary" />
                                Edit Asset #{selectedAssetForEdit.assetCode}
                            </DialogTitle>
                            <DialogDescription>
                                Modify asset rates, condition, and availability status.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-3 py-2">
                            <div className="space-y-1.5">
                                <Label>Asset Name</Label>
                                <Input
                                    value={selectedAssetForEdit.name}
                                    onChange={e => setSelectedAssetForEdit(prev => prev ? { ...prev, name: e.target.value } : null)}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Category</Label>
                                    <Input
                                        value={selectedAssetForEdit.category}
                                        onChange={e => setSelectedAssetForEdit(prev => prev ? { ...prev, category: e.target.value } : null)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Serial Number</Label>
                                    <Input
                                        value={selectedAssetForEdit.serialNumber || ""}
                                        onChange={e => setSelectedAssetForEdit(prev => prev ? { ...prev, serialNumber: e.target.value } : null)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Daily Rate (₹)</Label>
                                    <Input
                                        type="number"
                                        value={selectedAssetForEdit.dailyRate}
                                        onChange={e => setSelectedAssetForEdit(prev => prev ? { ...prev, dailyRate: Number(e.target.value) } : null)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Security Deposit (₹)</Label>
                                    <Input
                                        type="number"
                                        value={selectedAssetForEdit.securityDeposit}
                                        onChange={e => setSelectedAssetForEdit(prev => prev ? { ...prev, securityDeposit: Number(e.target.value) } : null)}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label>Condition</Label>
                                    <Select
                                        value={selectedAssetForEdit.condition}
                                        onValueChange={val => setSelectedAssetForEdit(prev => prev ? { ...prev, condition: val as AssetCondition } : null)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={AssetCondition.EXCELLENT}>Excellent</SelectItem>
                                            <SelectItem value={AssetCondition.GOOD}>Good</SelectItem>
                                            <SelectItem value={AssetCondition.FAIR}>Fair</SelectItem>
                                            <SelectItem value={AssetCondition.DAMAGED}>Damaged</SelectItem>
                                            <SelectItem value={AssetCondition.UNDER_MAINTENANCE}>Under Maintenance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1.5">
                                    <Label>Availability Status</Label>
                                    <Select
                                        value={selectedAssetForEdit.status}
                                        onValueChange={val => setSelectedAssetForEdit(prev => prev ? { ...prev, status: val as RentalAssetStatus } : null)}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value={RentalAssetStatus.AVAILABLE}>Available</SelectItem>
                                            <SelectItem value={RentalAssetStatus.RENTED}>Rented Out</SelectItem>
                                            <SelectItem value={RentalAssetStatus.MAINTENANCE}>Maintenance</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsEditAssetOpen(false)}>
                                Cancel
                            </Button>
                            <Button onClick={handleEditAssetSubmit} disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    )
}
