"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
    DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu"
import {
    Plus, Search, MoreHorizontal, DollarSign, TrendingUp, Eye, Pencil, Trash2,
    ArrowRight, Calendar, LayoutGrid, List, Loader2,
} from "lucide-react"
import { deleteDeal, updateDeal, type Deal, type DealStage } from "@/app/actions/crm/deals"
import { toast } from "sonner"

const stages: { key: DealStage; label: string; color: string; dotColor: string }[] = [
    { key: "PROSPECTING", label: "Prospecting", color: "from-slate-500 to-slate-600", dotColor: "bg-slate-500" },
    { key: "QUALIFICATION", label: "Qualification", color: "from-blue-500 to-blue-600", dotColor: "bg-blue-500" },
    { key: "PROPOSAL", label: "Proposal", color: "from-indigo-500 to-purple-600", dotColor: "bg-purple-500" },
    { key: "NEGOTIATION", label: "Negotiation", color: "from-amber-500 to-orange-600", dotColor: "bg-amber-500" },
    { key: "CLOSED_WON", label: "Closed Won", color: "from-emerald-500 to-green-600", dotColor: "bg-emerald-500" },
    { key: "CLOSED_LOST", label: "Closed Lost", color: "from-red-500 to-red-600", dotColor: "bg-red-500" },
]

const stageProbability: Record<DealStage, number> = {
    PROSPECTING: 20, QUALIFICATION: 40, PROPOSAL: 60, NEGOTIATION: 80, CLOSED_WON: 100, CLOSED_LOST: 0,
}

const formatCurrency = (v: number) => `₹${v.toLocaleString("en-IN")}`

interface Props {
    initialDeals: Deal[]
    total: number
}

export default function DealsClient({ initialDeals, total }: Props) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()
    const [isPending, startTransition] = useTransition()

    // Sync state with URL params
    const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
    const [filterStage, setFilterStage] = useState<string>(searchParams.get("stage") || "all")
    const [viewMode, setViewMode] = useState<"table" | "kanban">((searchParams.get("view") as any) || "table")
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
        if (!newParams.page && (newParams.search !== undefined || newParams.stage !== undefined)) {
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

    const moveStage = (dealId: string, newStage: DealStage) => {
        const newProbability = stageProbability[newStage]
        setPendingId(dealId)
        startTransition(async () => {
            const { error } = await updateDeal(dealId, { stage: newStage, probability: newProbability })
            if (error) toast.error(error)
            else {
                toast.success(`Deal moved to ${newStage.replace('_', ' ')}`)
                router.refresh()
            }
            setPendingId(null)
        })
    }

    const handleDelete = (id: string) => {
        if (!confirm("Are you sure?")) return
        setPendingId(id)
        startTransition(async () => {
            const { error } = await deleteDeal(id)
            if (error) toast.error(error)
            else {
                toast.success("Deal deleted")
                router.refresh()
            }
            setPendingId(null)
        })
    }

    const getStageInfo = (key: DealStage) => stages.find((s) => s.key === key)!

    const activePipelineVal = initialDeals.filter((d) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage)).reduce((s, d) => s + d.value, 0)
    const closedWonVal = initialDeals.filter((d) => d.stage === "CLOSED_WON").reduce((s, d) => s + d.value, 0)

    const DealActions = ({ deal }: { deal: Deal }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pendingId === deal.id}>
                    {pendingId === deal.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <MoreHorizontal className="h-4 w-4" />}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => router.push(`/crm/deals/${deal.id}`)}><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push(`/crm/deals/${deal.id}/edit`)}>
                    <Pencil className="mr-2 h-4 w-4" />Edit
                </DropdownMenuItem>
                <DropdownMenuSub>
                    <DropdownMenuSubTrigger><ArrowRight className="mr-2 h-4 w-4" />Move Stage</DropdownMenuSubTrigger>
                    <DropdownMenuSubContent>
                        {stages.filter((s) => s.key !== deal.stage).map((s) => (
                            <DropdownMenuItem key={s.key} onClick={() => moveStage(deal.id, s.key)}>
                                <div className={`h-2 w-2 rounded-full ${s.dotColor} mr-2`} />{s.label}
                            </DropdownMenuItem>
                        ))}
                    </DropdownMenuSubContent>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(deal.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />Delete
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
                    <p className="text-muted-foreground mt-1">Track your sales pipeline and revenue</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex gap-1 rounded-md border p-0.5 bg-background">
                        <Button variant={viewMode === "table" ? "secondary" : "ghost"} size="sm" className="h-8 px-2" onClick={() => { setViewMode("table"); updateUrl({ view: "table" }) }}>
                            <List className="h-4 w-4 mr-1.5" /> Table
                        </Button>
                        <Button variant={viewMode === "kanban" ? "secondary" : "ghost"} size="sm" className="h-8 px-2" onClick={() => { setViewMode("kanban"); updateUrl({ view: "kanban" }) }}>
                            <LayoutGrid className="h-4 w-4 mr-1.5" /> Kanban
                        </Button>
                    </div>
                    <Button size="sm" onClick={() => router.push("/crm/deals/new")}>
                        <Plus className="h-4 w-4 mr-2" /> New Deal
                    </Button>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium uppercase">Active Pipeline</p></div>
                        <p className="text-2xl font-bold mt-1 text-emerald-500">{formatCurrency(activePipelineVal)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2"><DollarSign className="h-4 w-4 text-emerald-400" /><p className="text-xs text-muted-foreground font-medium uppercase">Closed Won</p></div>
                        <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(closedWonVal)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2"><TrendingUp className="h-4 w-4 text-muted-foreground" /><p className="text-xs text-muted-foreground font-medium uppercase">Total Deals</p></div>
                        <p className="text-2xl font-bold mt-1 uppercase">{total}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search & Stage Filters */}
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div className="relative max-w-sm w-full">
                    {isPending ? <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 animate-spin text-muted-foreground" /> : <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />}
                    <Input placeholder="Search deals..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex flex-wrap gap-2">
                    <Badge
                        variant={filterStage === "all" ? "default" : "outline"}
                        className="cursor-pointer px-3 py-1"
                        onClick={() => { setFilterStage("all"); updateUrl({ stage: "all" }) }}
                    >
                        All
                    </Badge>
                    {stages.map((s) => (
                        <Badge
                            key={s.key}
                            variant={filterStage === s.key ? "default" : "outline"}
                            className="cursor-pointer px-3 py-1"
                            onClick={() => { setFilterStage(s.key); updateUrl({ stage: s.key }) }}
                        >
                            {s.label}
                        </Badge>
                    ))}
                </div>
            </div>

            {/* VIEWS */}
            {viewMode === "table" ? (
                <Card>
                    <CardContent className="pt-6">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Deal</TableHead>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead className="text-right">Value</TableHead>
                                    <TableHead className="text-center">Probability</TableHead>
                                    <TableHead>Close Date</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {initialDeals.length === 0 ? (
                                    <TableRow><TableCell colSpan={7} className="h-24 text-center">No deals found.</TableCell></TableRow>
                                ) : initialDeals.map((deal) => {
                                    const si = getStageInfo(deal.stage)
                                    return (
                                        <TableRow key={deal.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div><span className="font-medium">{deal.title}</span><p className="text-xs text-muted-foreground">{deal.contact_name}</p></div>
                                            </TableCell>
                                            <TableCell className="text-sm">{deal.company}</TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs flex w-fit items-center gap-1.5">
                                                    <div className={`h-2 w-2 rounded-full ${si.dotColor}`} />{si.label}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right font-medium">{formatCurrency(deal.value)}</TableCell>
                                            <TableCell className="text-center">
                                                <Badge variant="secondary" className="text-xs">{deal.probability}%</Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center text-sm text-muted-foreground">
                                                    <Calendar className="mr-2 h-3.5 w-3.5" />
                                                    {deal.expected_close ? new Date(deal.expected_close).toLocaleDateString() : "—"}
                                                </div>
                                            </TableCell>
                                            <TableCell><DealActions deal={deal} /></TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <div className="flex gap-4 overflow-x-auto pb-4 pt-2 min-h-[600px]">
                    {stages.map((stage) => {
                        const colDeals = initialDeals.filter(d => d.stage === stage.key)
                        const colTotal = colDeals.reduce((s, d) => s + d.value, 0)
                        return (
                            <div key={stage.key} className="flex flex-col w-[300px] shrink-0">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${stage.dotColor}`} />
                                        <h3 className="font-semibold text-sm">{stage.label}</h3>
                                        <Badge variant="secondary" className="rounded-full px-1.5 py-0 min-w-5 justify-center">{colDeals.length}</Badge>
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">{formatCurrency(colTotal)}</span>
                                </div>
                                <div className="flex-1 bg-muted/20 border border-dashed rounded-lg p-2 space-y-3">
                                    {colDeals.map((deal) => (
                                        <Card key={deal.id} className="group cursor-pointer hover:border-primary/50 transition-all shadow-sm">
                                            <CardContent className="p-3">
                                                <div className="flex justify-between items-start mb-1">
                                                    <p className="font-medium text-sm leading-tight line-clamp-2">{deal.title}</p>
                                                    <DealActions deal={deal} />
                                                </div>
                                                <p className="text-[11px] text-muted-foreground mb-3">{deal.company}</p>
                                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/30">
                                                    <span className="font-bold text-sm text-primary">{formatCurrency(deal.value)}</span>
                                                    <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {deal.expected_close ? new Date(deal.expected_close).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : "—"}
                                                    </div>
                                                </div>
                                                <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
                                                    <div className={`h-full bg-gradient-to-r ${stage.color}`} style={{ width: `${deal.probability}%` }} />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {colDeals.length === 0 && (
                                        <div className="h-20 border border-dashed rounded-md flex items-center justify-center text-[10px] text-muted-foreground/50 uppercase tracking-widest">Empty Stage</div>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
