"use client"

import { useState, useTransition, useMemo } from "react"
import {
    PriceListRecord,
    ProductLookup,
    CustomerLookup,
    PriceListsOverviewStats,
    ProductPricingMatrixRow,
    CalculatePriceResult,
    createPriceList,
    updatePriceList,
    deletePriceList,
    upsertPriceListItem,
    deletePriceListItem,
    assignContactPriceList,
    calculateEffectivePrice,
} from "@/app/actions/sales/price-lists"
import { PriceListType, PricingScheme } from "@prisma/client"
import {
    Tag,
    Layers,
    TrendingDown,
    Users,
    Plus,
    Search,
    Filter,
    Calculator,
    CheckCircle2,
    Calendar,
    ArrowRight,
    Sparkles,
    Trash2,
    Edit,
    AlertCircle,
    Building2,
    Package,
    Shield,
    Sliders,
    Eye,
    Percent,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

interface PriceListsClientProps {
    initialStats: PriceListsOverviewStats
    initialPriceLists: PriceListRecord[]
    products: ProductLookup[]
    customers: CustomerLookup[]
    initialMatrixData: ProductPricingMatrixRow[]
}

const CUSTOMER_GROUP_OPTIONS = ["ALL", "RETAIL", "WHOLESALE", "ENTERPRISE", "DISTRIBUTOR", "VIP"]

export default function PriceListsClient({
    initialStats,
    initialPriceLists,
    products,
    customers,
    initialMatrixData,
}: PriceListsClientProps) {
    const [isPending, startTransition] = useTransition()

    // Data State
    const [priceLists, setPriceLists] = useState<PriceListRecord[]>(initialPriceLists)
    const [stats, setStats] = useState<PriceListsOverviewStats>(initialStats)
    const [matrixData, setMatrixData] = useState<ProductPricingMatrixRow[]>(initialMatrixData)

    // Filter & Search State
    const [activeTab, setActiveTab] = useState("directory")
    const [searchQuery, setSearchQuery] = useState("")
    const [targetGroupFilter, setTargetGroupFilter] = useState("ALL")

    // Modals
    const [isCreatePriceListOpen, setIsCreatePriceListOpen] = useState(false)
    const [isCreateItemOverrideOpen, setIsCreateItemOverrideOpen] = useState(false)
    const [isAssignCustomerOpen, setIsAssignCustomerOpen] = useState(false)
    const [selectedPriceList, setSelectedPriceList] = useState<PriceListRecord | null>(null)
    const [formError, setFormError] = useState<string | null>(null)

    // Form State: Create/Edit Price List
    const [plForm, setPlForm] = useState<{
        code: string
        name: string
        description: string
        type: PriceListType
        currencyCode: string
        pricingScheme: PricingScheme
        defaultDiscount: string
        targetGroup: string
        isDefault: boolean
        startDate: string
        endDate: string
    }>({
        code: "",
        name: "",
        description: "",
        type: PriceListType.SALES,
        currencyCode: "INR",
        pricingScheme: PricingScheme.FIXED_OVERRIDE,
        defaultDiscount: "15",
        targetGroup: "WHOLESALE",
        isDefault: false,
        startDate: "",
        endDate: "",
    })

    // Form State: Create/Edit Product Override (Volume Break)
    const [overrideForm, setOverrideForm] = useState<{
        priceListId: string
        productId: string
        minQuantity: string
        customPrice: string
        discountPercent: string
    }>({
        priceListId: priceLists[0]?.id || "",
        productId: products[0]?.id || "",
        minQuantity: "1",
        customPrice: "",
        discountPercent: "15",
    })

    // Form State: Assign Customer
    const [assignForm, setAssignForm] = useState<{
        contactId: string
        priceListId: string
    }>({
        contactId: customers[0]?.id || "",
        priceListId: priceLists[0]?.id || "",
    })

    // Simulator State
    const [simCustomerId, setSimCustomerId] = useState<string>("")
    const [simProductId, setSimProductId] = useState<string>(products[0]?.id || "")
    const [simQuantity, setSimQuantity] = useState<string>("10")
    const [simPriceListId, setSimPriceListId] = useState<string>("")
    const [simResult, setSimResult] = useState<CalculatePriceResult | null>(null)
    const [isCalculating, setIsCalculating] = useState(false)

    // Format Currency Helper
    const formatINR = (val: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        }).format(val)
    }

    // Filtered Price Lists
    const filteredPriceLists = useMemo(() => {
        return priceLists.filter((pl) => {
            const matchesGroup =
                targetGroupFilter === "ALL" ||
                pl.targetGroup === targetGroupFilter ||
                pl.targetGroup === "ALL" ||
                !pl.targetGroup
            const q = searchQuery.toLowerCase().trim()
            const matchesSearch =
                !q ||
                pl.code.toLowerCase().includes(q) ||
                pl.name.toLowerCase().includes(q) ||
                (pl.description && pl.description.toLowerCase().includes(q))
            return matchesGroup && matchesSearch
        })
    }, [priceLists, targetGroupFilter, searchQuery])

    // Filtered Matrix Products
    const filteredMatrix = useMemo(() => {
        const q = searchQuery.toLowerCase().trim()
        if (!q) return matrixData
        return matrixData.filter(
            (p) =>
                p.productName.toLowerCase().includes(q) ||
                (p.sku && p.sku.toLowerCase().includes(q)) ||
                (p.category && p.category.toLowerCase().includes(q))
        )
    }, [matrixData, searchQuery])

    // Handlers: Create/Edit Price List Submit
    const handleCreatePriceList = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        startTransition(async () => {
            const res = await createPriceList({
                code: plForm.code,
                name: plForm.name,
                description: plForm.description || undefined,
                type: plForm.type,
                currencyCode: plForm.currencyCode,
                pricingScheme: plForm.pricingScheme,
                defaultDiscount: parseFloat(plForm.defaultDiscount) || 0,
                targetGroup: plForm.targetGroup || undefined,
                isDefault: plForm.isDefault,
                startDate: plForm.startDate || undefined,
                endDate: plForm.endDate || undefined,
            })

            if (res.error) {
                setFormError(res.error)
            } else {
                setIsCreatePriceListOpen(false)
                window.location.reload()
            }
        })
    }

    // Handlers: Create Product Override Submit
    const handleCreateOverride = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        const minQ = parseFloat(overrideForm.minQuantity) || 1
        const customP = overrideForm.customPrice ? parseFloat(overrideForm.customPrice) : undefined
        const discP = overrideForm.discountPercent ? parseFloat(overrideForm.discountPercent) : undefined

        startTransition(async () => {
            const res = await upsertPriceListItem({
                priceListId: overrideForm.priceListId,
                productId: overrideForm.productId,
                minQuantity: minQ,
                customPrice: customP,
                discountPercent: discP,
            })

            if (res.error) {
                setFormError(res.error)
            } else {
                setIsCreateItemOverrideOpen(false)
                window.location.reload()
            }
        })
    }

    // Handlers: Assign Customer Submit
    const handleAssignCustomer = async (e: React.FormEvent) => {
        e.preventDefault()
        setFormError(null)

        startTransition(async () => {
            const res = await assignContactPriceList(
                assignForm.contactId,
                assignForm.priceListId || null
            )

            if (res.error) {
                setFormError(res.error)
            } else {
                setIsAssignCustomerOpen(false)
                window.location.reload()
            }
        })
    }

    // Handlers: Delete Price List
    const handleDeletePriceList = (id: string, name: string) => {
        if (!confirm(`Are you sure you want to delete rate card "${name}"?`)) return

        startTransition(async () => {
            const res = await deletePriceList(id)
            if (res.error) {
                alert(res.error)
            } else {
                window.location.reload()
            }
        })
    }

    // Handlers: Delete Price List Item Override
    const handleDeleteOverride = (itemId: string) => {
        if (!confirm("Are you sure you want to delete this volume price override?")) return

        startTransition(async () => {
            const res = await deletePriceListItem(itemId)
            if (res.error) {
                alert(res.error)
            } else {
                window.location.reload()
            }
        })
    }

    // Simulator Calculation
    const handleRunSimulation = async () => {
        if (!simProductId) return
        setIsCalculating(true)

        const qty = parseFloat(simQuantity) || 1
        const customer = customers.find((c) => c.id === simCustomerId)

        const res = await calculateEffectivePrice({
            productId: simProductId,
            quantity: qty,
            customerId: simCustomerId || undefined,
            customerGroup: customer?.customerGroup || undefined,
            priceListId: simPriceListId || undefined,
        })

        setIsCalculating(false)
        if (res.data) {
            setSimResult(res.data)
        }
    }

    return (
        <div className="space-y-6">
            {/* 1. Header Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-2 border-b">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-2.5">
                        <Tag className="h-8 w-8 text-indigo-500" />
                        Price Lists & Customer Tier Pricing
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage wholesale rate cards, VIP enterprise pricing, and volume break discounts across customer tiers.
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <Button
                        variant="outline"
                        onClick={() => setIsAssignCustomerOpen(true)}
                        className="gap-2 border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50"
                    >
                        <Users className="h-4 w-4" />
                        Assign Customer
                    </Button>
                    <Button
                        variant="outline"
                        onClick={() => setIsCreateItemOverrideOpen(true)}
                        className="gap-2 border-indigo-200 dark:border-indigo-900/40 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50"
                    >
                        <Layers className="h-4 w-4" />
                        Add Product Rule
                    </Button>
                    <Button
                        onClick={() => setIsCreatePriceListOpen(true)}
                        className="gap-2 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
                    >
                        <Plus className="h-4 w-4" />
                        New Rate Card
                    </Button>
                </div>
            </div>

            {/* 2. 4-Column KPI Telemetry Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* KPI 1: Active Rate Cards */}
                <Card className="border-border/60 shadow-sm hover:border-indigo-300 dark:hover:border-indigo-800 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Active Rate Cards
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
                            <Tag className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {stats.activeRateCards}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Wholesale, Enterprise & Distributor tiers
                        </p>
                    </CardContent>
                </Card>

                {/* KPI 2: Product Overrides */}
                <Card className="border-border/60 shadow-sm hover:border-purple-300 dark:hover:border-purple-800 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Product Price Rules
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400">
                            <Layers className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {stats.totalItemOverrides}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Item overrides with volume break tiers
                        </p>
                    </CardContent>
                </Card>

                {/* KPI 3: Average Discount */}
                <Card className="border-border/60 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-800 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Avg Tier Discount
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
                            <TrendingDown className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {stats.avgDiscountPercent}%
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Average reduction off base catalog prices
                        </p>
                    </CardContent>
                </Card>

                {/* KPI 4: Mapped Customers */}
                <Card className="border-border/60 shadow-sm hover:border-amber-300 dark:hover:border-amber-800 transition-colors">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                            Assigned Accounts
                        </CardTitle>
                        <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
                            <Users className="h-4 w-4" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-foreground">
                            {stats.assignedCustomersCount}
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Customers mapped to custom pricing tiers
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* 3. Tabbed Views */}
            <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
                <TabsList className="bg-muted/50 p-1 border">
                    <TabsTrigger value="directory" className="gap-2">
                        <Tag className="h-4 w-4" />
                        Rate Cards Directory ({priceLists.length})
                    </TabsTrigger>
                    <TabsTrigger value="matrix" className="gap-2">
                        <Layers className="h-4 w-4" />
                        Item Pricing Matrix ({products.length} Products)
                    </TabsTrigger>
                    <TabsTrigger value="tiers" className="gap-2">
                        <Percent className="h-4 w-4" />
                        Volume Break Tiers
                    </TabsTrigger>
                    <TabsTrigger value="simulator" className="gap-2">
                        <Calculator className="h-4 w-4" />
                        Interactive Price Simulator
                    </TabsTrigger>
                </TabsList>

                {/* ── TAB 1: Rate Cards Directory ── */}
                <TabsContent value="directory" className="space-y-4">
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        <div className="relative flex-1 max-w-md">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search rate cards by code or name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-9 bg-background"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <select
                                value={targetGroupFilter}
                                onChange={(e) => setTargetGroupFilter(e.target.value)}
                                className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                            >
                                <option value="ALL">All Target Groups</option>
                                {CUSTOMER_GROUP_OPTIONS.map((grp) => (
                                    <option key={grp} value={grp}>
                                        {grp}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-muted/40 text-muted-foreground font-medium border-b text-xs uppercase tracking-wider">
                                <tr>
                                    <th className="py-3.5 px-4">Rate Card</th>
                                    <th className="py-3.5 px-4">Pricing Scheme</th>
                                    <th className="py-3.5 px-4">Target Tier</th>
                                    <th className="py-3.5 px-4 text-center">Baseline Discount</th>
                                    <th className="py-3.5 px-4 text-center">Overrides</th>
                                    <th className="py-3.5 px-4 text-center">Customers</th>
                                    <th className="py-3.5 px-4 text-center">Status</th>
                                    <th className="py-3.5 px-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/60">
                                {filteredPriceLists.length === 0 ? (
                                    <tr>
                                        <td colSpan={8} className="py-12 text-center text-muted-foreground">
                                            No price lists found matching the filters.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredPriceLists.map((pl) => (
                                        <tr key={pl.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="py-3.5 px-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400">
                                                        {pl.code}
                                                    </span>
                                                    {pl.isDefault && (
                                                        <Badge variant="secondary" className="text-[10px] bg-indigo-50 text-indigo-700 border-indigo-200">
                                                            Default
                                                        </Badge>
                                                    )}
                                                </div>
                                                <div className="font-semibold text-foreground mt-0.5">{pl.name}</div>
                                                {pl.description && (
                                                    <div className="text-xs text-muted-foreground truncate max-w-sm mt-0.5">
                                                        {pl.description}
                                                    </div>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-xs">
                                                <Badge variant="outline">
                                                    {pl.pricingScheme.replace("_", " ")}
                                                </Badge>
                                            </td>
                                            <td className="py-3.5 px-4 text-xs">
                                                <Badge
                                                    variant="secondary"
                                                    className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-400 border-purple-200"
                                                >
                                                    {pl.targetGroup || "ALL"}
                                                </Badge>
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-mono font-bold text-emerald-600 dark:text-emerald-400">
                                                {pl.defaultDiscount > 0 ? `${pl.defaultDiscount}%` : "—"}
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-medium">
                                                {pl.itemCount} rule{pl.itemCount !== 1 ? "s" : ""}
                                            </td>
                                            <td className="py-3.5 px-4 text-center font-medium">
                                                {pl.assignedCustomerCount} account{pl.assignedCustomerCount !== 1 ? "s" : ""}
                                            </td>
                                            <td className="py-3.5 px-4 text-center">
                                                {pl.isActive ? (
                                                    <Badge className="bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300">
                                                        Active
                                                    </Badge>
                                                ) : (
                                                    <Badge variant="outline" className="text-muted-foreground">
                                                        Inactive
                                                    </Badge>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 text-right space-x-1 whitespace-nowrap">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setOverrideForm({
                                                            ...overrideForm,
                                                            priceListId: pl.id,
                                                        })
                                                        setIsCreateItemOverrideOpen(true)
                                                    }}
                                                    className="h-8 px-2 text-xs text-indigo-600 hover:bg-indigo-50"
                                                >
                                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                                    Add Item
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDeletePriceList(pl.id, pl.name)}
                                                    className="h-8 px-2 text-xs text-muted-foreground hover:text-destructive"
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </TabsContent>

                {/* ── TAB 2: Item Pricing Matrix ── */}
                <TabsContent value="matrix" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-foreground">Catalog Pricing Comparison Matrix</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Real-time unit price comparison between the base catalog and active customer rate cards.
                            </p>
                        </div>
                    </div>

                    <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-muted/40 text-muted-foreground font-medium border-b text-xs uppercase tracking-wider">
                                    <tr>
                                        <th className="py-3.5 px-4">Product / SKU</th>
                                        <th className="py-3.5 px-4 text-right">Base Catalog</th>
                                        {priceLists.map((pl) => (
                                            <th key={pl.id} className="py-3.5 px-4 text-right whitespace-nowrap">
                                                {pl.name}
                                                <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                                                    {pl.code}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60">
                                    {filteredMatrix.length === 0 ? (
                                        <tr>
                                            <td colSpan={priceLists.length + 2} className="py-12 text-center text-muted-foreground">
                                                No catalog products available.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredMatrix.map((prod) => (
                                            <tr key={prod.productId} className="hover:bg-muted/30 transition-colors">
                                                <td className="py-3.5 px-4">
                                                    <div className="font-semibold text-foreground">{prod.productName}</div>
                                                    <div className="text-xs text-muted-foreground font-mono mt-0.5">
                                                        {prod.sku || "NO-SKU"} • {prod.category || "General"}
                                                    </div>
                                                </td>
                                                <td className="py-3.5 px-4 text-right font-mono font-bold text-foreground whitespace-nowrap">
                                                    {formatINR(prod.basePrice)}
                                                    <span className="text-[11px] text-muted-foreground block font-sans">
                                                        per {prod.unit}
                                                    </span>
                                                </td>
                                                {priceLists.map((pl) => {
                                                    const priceInfo = prod.pricesByList[pl.id]
                                                    if (!priceInfo) {
                                                        return (
                                                            <td key={pl.id} className="py-3.5 px-4 text-right text-muted-foreground text-xs">
                                                                —
                                                            </td>
                                                        )
                                                    }
                                                    return (
                                                        <td key={pl.id} className="py-3.5 px-4 text-right whitespace-nowrap">
                                                            <div className="font-mono font-bold text-foreground">
                                                                {formatINR(priceInfo.effectivePrice)}
                                                            </div>
                                                            <div className="flex items-center justify-end gap-1 mt-0.5">
                                                                {priceInfo.discountPercent > 0 && (
                                                                    <Badge
                                                                        variant="outline"
                                                                        className="text-[10px] text-emerald-600 border-emerald-300 font-mono"
                                                                    >
                                                                        -{priceInfo.discountPercent}%
                                                                    </Badge>
                                                                )}
                                                                {priceInfo.hasVolumeTiers && (
                                                                    <Badge
                                                                        variant="secondary"
                                                                        className="text-[9px] bg-indigo-50 text-indigo-700"
                                                                    >
                                                                        Volume Tiers
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                        </td>
                                                    )
                                                })}
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* ── TAB 3: Volume Break Tiers ── */}
                <TabsContent value="tiers" className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-semibold text-foreground">Volume Discount Breaks</h3>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Progressive volume discount thresholds (Quantity ≥ Minimum Order Quantity) configured across products and rate cards.
                            </p>
                        </div>
                        <Button
                            size="sm"
                            onClick={() => setIsCreateItemOverrideOpen(true)}
                            className="gap-1.5"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Volume Tier Rule
                        </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {priceLists.map((pl) => (
                            <Card key={pl.id} className="border-border/60 shadow-sm flex flex-col justify-between">
                                <CardHeader className="pb-2">
                                    <div className="flex items-center justify-between">
                                        <Badge variant="outline" className="font-mono text-[11px] text-indigo-600">
                                            {pl.code}
                                        </Badge>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {pl.targetGroup || "ALL"}
                                        </Badge>
                                    </div>
                                    <CardTitle className="text-base font-bold mt-1">{pl.name}</CardTitle>
                                    <CardDescription className="text-xs">
                                        {pl.itemCount} specific product override rule{pl.itemCount !== 1 ? "s" : ""}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-2 pt-2">
                                    {pl.items.length === 0 ? (
                                        <p className="text-xs text-muted-foreground py-4 text-center">
                                            No product-specific volume breaks. Uses {pl.defaultDiscount}% baseline discount.
                                        </p>
                                    ) : (
                                        pl.items.map((it) => (
                                            <div
                                                key={it.id}
                                                className="p-2.5 rounded-lg border bg-muted/20 flex items-center justify-between text-xs"
                                            >
                                                <div>
                                                    <div className="font-medium text-foreground">{it.productName}</div>
                                                    <div className="text-[11px] text-muted-foreground mt-0.5">
                                                        Min Order: <span className="font-bold">{it.minQuantity} units</span>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-mono font-bold text-foreground">
                                                        {formatINR(it.effectiveUnitPrice)}
                                                    </div>
                                                    {it.discountPercent !== null && (
                                                        <span className="text-[10px] text-emerald-600 font-mono block">
                                                            {it.discountPercent}% off
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ── TAB 4: Interactive Price Simulator ── */}
                <TabsContent value="simulator" className="space-y-4">
                    <Card className="border-border/60">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-lg">
                                <Calculator className="h-5 w-5 text-indigo-500" />
                                Real-Time Price Resolution Simulator
                            </CardTitle>
                            <CardDescription>
                                Test how the pricing engine evaluates customer agreements, assigned rate cards, and progressive volume discount breaks.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 rounded-xl bg-muted/30 border">
                                {/* Customer Selector */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        1. Target Customer
                                    </label>
                                    <select
                                        value={simCustomerId}
                                        onChange={(e) => {
                                            setSimCustomerId(e.target.value)
                                            const cust = customers.find((c) => c.id === e.target.value)
                                            if (cust?.priceListId) setSimPriceListId(cust.priceListId)
                                        }}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        <option value="">Generic Prospect (No assigned card)</option>
                                        {customers.map((c) => (
                                            <option key={c.id} value={c.id}>
                                                {c.displayName} ({c.customerGroup || "Retail"}
                                                {c.priceListName ? ` - ${c.priceListName}` : ""})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Product Selector */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        2. Product / Service
                                    </label>
                                    <select
                                        value={simProductId}
                                        onChange={(e) => setSimProductId(e.target.value)}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                    >
                                        {products.map((p) => (
                                            <option key={p.id} value={p.id}>
                                                {p.name} (Base: {formatINR(p.unitPrice)})
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Quantity Input */}
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        3. Order Quantity
                                    </label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={simQuantity}
                                        onChange={(e) => setSimQuantity(e.target.value)}
                                        className="h-9 text-xs"
                                        placeholder="Enter quantity"
                                    />
                                </div>

                                {/* Action Button */}
                                <div className="space-y-1.5 flex flex-col justify-end">
                                    <Button
                                        onClick={handleRunSimulation}
                                        disabled={isCalculating}
                                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white gap-1.5 h-9"
                                    >
                                        <Sparkles className="h-4 w-4" />
                                        {isCalculating ? "Evaluating..." : "Resolve Price"}
                                    </Button>
                                </div>
                            </div>

                            {/* Simulation Results Breakdown */}
                            {simResult && (
                                <div className="rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-gradient-to-br from-indigo-50/40 via-background to-purple-50/20 p-6 space-y-6">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-indigo-100 dark:border-indigo-900/30">
                                        <div>
                                            <div className="text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                                                Pricing Resolution Summary
                                            </div>
                                            <div className="text-lg font-bold text-foreground mt-0.5">
                                                {simResult.productName}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="font-mono text-xs">
                                                Qty: {simResult.quantity}
                                            </Badge>
                                            <Badge className="bg-indigo-600 text-white text-xs">
                                                {simResult.appliedPriceListName}
                                            </Badge>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-center sm:text-left">
                                        <div className="p-3 rounded-lg bg-background/60 border">
                                            <span className="text-xs text-muted-foreground block">Catalog Base Unit Price</span>
                                            <span className="text-base font-mono font-semibold line-through text-muted-foreground">
                                                {formatINR(simResult.basePrice)}
                                            </span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-background/60 border">
                                            <span className="text-xs text-muted-foreground block">Effective Contract Unit Price</span>
                                            <span className="text-xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                                                {formatINR(simResult.unitPrice)}
                                            </span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-background/60 border">
                                            <span className="text-xs text-muted-foreground block">Net Line Total</span>
                                            <span className="text-xl font-mono font-bold text-foreground">
                                                {formatINR(simResult.totalAmount)}
                                            </span>
                                        </div>
                                        <div className="p-3 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800">
                                            <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium block">
                                                Total Customer Savings
                                            </span>
                                            <span className="text-xl font-mono font-bold text-emerald-600 dark:text-emerald-300">
                                                {formatINR(simResult.totalSavings)} ({simResult.discountPercent}%)
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs text-muted-foreground flex items-center gap-2 pt-1">
                                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                                        <span>
                                            Volume tier break matching Quantity ≥ {simResult.appliedTierMinQuantity} units was successfully resolved by the pricing engine.
                                        </span>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* 4. MODAL: Create New Rate Card */}
            <Dialog open={isCreatePriceListOpen} onOpenChange={setIsCreatePriceListOpen}>
                <DialogContent className="max-w-lg">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Tag className="h-5 w-5 text-indigo-500" />
                            Create New Price List / Rate Card
                        </DialogTitle>
                        <DialogDescription>
                            Define a customer pricing policy with custom discounts or pricing schemes.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreatePriceList} className="space-y-4 pt-2">
                        {formError && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Rate Card Code *
                                </label>
                                <Input
                                    required
                                    placeholder="e.g. PL-GOVERNMENT"
                                    value={plForm.code}
                                    onChange={(e) => setPlForm({ ...plForm, code: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Rate Card Name *
                                </label>
                                <Input
                                    required
                                    placeholder="e.g. Institutional Non-Profit Rate Card"
                                    value={plForm.name}
                                    onChange={(e) => setPlForm({ ...plForm, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5 col-span-2">
                                <label className="text-xs font-semibold text-foreground">
                                    Commercial Description
                                </label>
                                <Input
                                    placeholder="Commercial terms or partner eligibility notes"
                                    value={plForm.description}
                                    onChange={(e) => setPlForm({ ...plForm, description: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Pricing Scheme</label>
                                <select
                                    value={plForm.pricingScheme}
                                    onChange={(e) =>
                                        setPlForm({ ...plForm, pricingScheme: e.target.value as PricingScheme })
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value={PricingScheme.FIXED_OVERRIDE}>Fixed Item Overrides</option>
                                    <option value={PricingScheme.PERCENTAGE_DISCOUNT}>Percentage Discount</option>
                                    <option value={PricingScheme.PERCENTAGE_MARKUP}>Percentage Markup</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Baseline Discount (%)
                                </label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={plForm.defaultDiscount}
                                    onChange={(e) => setPlForm({ ...plForm, defaultDiscount: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Target Customer Group</label>
                                <select
                                    value={plForm.targetGroup}
                                    onChange={(e) => setPlForm({ ...plForm, targetGroup: e.target.value })}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {CUSTOMER_GROUP_OPTIONS.map((g) => (
                                        <option key={g} value={g}>
                                            {g}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Currency</label>
                                <Input
                                    value={plForm.currencyCode}
                                    onChange={(e) => setPlForm({ ...plForm, currencyCode: e.target.value })}
                                    className="uppercase font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Valid From</label>
                                <Input
                                    type="date"
                                    value={plForm.startDate}
                                    onChange={(e) => setPlForm({ ...plForm, startDate: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Valid Until</label>
                                <Input
                                    type="date"
                                    value={plForm.endDate}
                                    onChange={(e) => setPlForm({ ...plForm, endDate: e.target.value })}
                                />
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreatePriceListOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isPending ? "Creating..." : "Create Rate Card"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 5. MODAL: Add Product Override Rule */}
            <Dialog open={isCreateItemOverrideOpen} onOpenChange={setIsCreateItemOverrideOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Layers className="h-5 w-5 text-indigo-500" />
                            Add Product Price Override Rule
                        </DialogTitle>
                        <DialogDescription>
                            Configure custom unit price or percentage discount with volume break tier.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleCreateOverride} className="space-y-4 pt-2">
                        {formError && (
                            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                                <AlertCircle className="h-4 w-4 shrink-0" />
                                <span>{formError}</span>
                            </div>
                        )}

                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Target Rate Card *</label>
                                <select
                                    required
                                    value={overrideForm.priceListId}
                                    onChange={(e) =>
                                        setOverrideForm({ ...overrideForm, priceListId: e.target.value })
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {priceLists.map((pl) => (
                                        <option key={pl.id} value={pl.id}>
                                            {pl.code} — {pl.name}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Target Product *</label>
                                <select
                                    required
                                    value={overrideForm.productId}
                                    onChange={(e) =>
                                        setOverrideForm({ ...overrideForm, productId: e.target.value })
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {products.map((p) => (
                                        <option key={p.id} value={p.id}>
                                            {p.name} (Base: {formatINR(p.unitPrice)})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Minimum Order Quantity (Volume Break Tier) *
                                </label>
                                <Input
                                    type="number"
                                    min="1"
                                    required
                                    placeholder="1 for base rate, 10, 50, etc."
                                    value={overrideForm.minQuantity}
                                    onChange={(e) =>
                                        setOverrideForm({ ...overrideForm, minQuantity: e.target.value })
                                    }
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        Fixed Custom Price (₹)
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        placeholder="Optional fixed rate"
                                        value={overrideForm.customPrice}
                                        onChange={(e) =>
                                            setOverrideForm({ ...overrideForm, customPrice: e.target.value })
                                        }
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-semibold text-foreground">
                                        OR Discount (%)
                                    </label>
                                    <Input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="100"
                                        placeholder="e.g. 20%"
                                        value={overrideForm.discountPercent}
                                        onChange={(e) =>
                                            setOverrideForm({ ...overrideForm, discountPercent: e.target.value })
                                        }
                                    />
                                </div>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsCreateItemOverrideOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isPending ? "Saving..." : "Save Override"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* 6. MODAL: Assign Customer to Price List */}
            <Dialog open={isAssignCustomerOpen} onOpenChange={setIsAssignCustomerOpen}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5 text-indigo-500" />
                            Map Customer to Pricing Rate Card
                        </DialogTitle>
                        <DialogDescription>
                            Assign a customer to receive preferential contract pricing across all transactions.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleAssignCustomer} className="space-y-4 pt-2">
                        <div className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">Customer Contact *</label>
                                <select
                                    required
                                    value={assignForm.contactId}
                                    onChange={(e) =>
                                        setAssignForm({ ...assignForm, contactId: e.target.value })
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    {customers.map((c) => (
                                        <option key={c.id} value={c.id}>
                                            {c.displayName} ({c.companyName || "Individual"}
                                            {c.priceListName ? ` - Currently on ${c.priceListName}` : ""})
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-semibold text-foreground">
                                    Assigned Rate Card *
                                </label>
                                <select
                                    value={assignForm.priceListId}
                                    onChange={(e) =>
                                        setAssignForm({ ...assignForm, priceListId: e.target.value })
                                    }
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                                >
                                    <option value="">None (Revert to default / group price)</option>
                                    {priceLists.map((pl) => (
                                        <option key={pl.id} value={pl.id}>
                                            {pl.code} — {pl.name} ({pl.targetGroup || "All"})
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <DialogFooter className="pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsAssignCustomerOpen(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={isPending}
                                className="bg-indigo-600 hover:bg-indigo-700 text-white"
                            >
                                {isPending ? "Mapping..." : "Confirm Assignment"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    )
}
