"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
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
    ArrowRight, Calendar, LayoutGrid, List,
} from "lucide-react"

type DealStage = "PROSPECTING" | "QUALIFICATION" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST"

interface Deal {
    id: string
    title: string
    contactName: string
    company: string
    value: number
    stage: DealStage
    probability: number
    expectedClose: string
    assignedTo: string
    notes: string
}

const defaultDeal: Deal = {
    id: "", title: "", contactName: "", company: "", value: 0,
    stage: "PROSPECTING", probability: 20, expectedClose: "", assignedTo: "", notes: "",
}

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

const initialDeals: Deal[] = [
    { id: "1", title: "ERP Annual License", contactName: "Rahul Deshmukh", company: "TechFirm India", value: 350000, stage: "PROPOSAL", probability: 60, expectedClose: "2026-04-15", assignedTo: "Suraj M.", notes: "" },
    { id: "2", title: "CRM + POS Setup", contactName: "Aisha Khan", company: "RetailGroup UAE", value: 525000, stage: "NEGOTIATION", probability: 80, expectedClose: "2026-03-31", assignedTo: "Suraj M.", notes: "" },
    { id: "3", title: "Desktop Rental — 50 Units", contactName: "Vijay Patil", company: "VM Edulife Pvt Ltd", value: 180000, stage: "QUALIFICATION", probability: 40, expectedClose: "2026-05-01", assignedTo: "Admin", notes: "" },
    { id: "4", title: "GST Module License", contactName: "Ankit Sharma", company: "TaxFirm India", value: 95000, stage: "CLOSED_WON", probability: 100, expectedClose: "2026-02-28", assignedTo: "Admin", notes: "" },
    { id: "5", title: "Inventory Integration", contactName: "Sarah Johnson", company: "Warehouse US", value: 280000, stage: "PROSPECTING", probability: 20, expectedClose: "2026-06-01", assignedTo: "Suraj M.", notes: "" },
    { id: "6", title: "HR Module Demo", contactName: "Mohammed Al-Rashid", company: "ShopKSA", value: 120000, stage: "CLOSED_LOST", probability: 0, expectedClose: "2026-02-15", assignedTo: "Suraj M.", notes: "Lost to competitor" },
    { id: "7", title: "Multi-branch Setup", contactName: "Priya Sharma", company: "Genesoft Infotech", value: 450000, stage: "PROPOSAL", probability: 70, expectedClose: "2026-04-20", assignedTo: "Admin", notes: "" },
]

const formatCurrency = (v: number) => `₹${v.toLocaleString("en-IN")}`

export default function DealsPage() {
    const router = useRouter()
    const [deals, setDeals] = useState(initialDeals)
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState<"table" | "kanban">("table")

    const filtered = deals.filter((d) =>
        d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.company.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const stageDeals = (stageKey: DealStage) => filtered.filter((d) => d.stage === stageKey)
    const totalPipeline = deals.filter((d) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage)).reduce((s, d) => s + d.value, 0)
    const totalWon = deals.filter((d) => d.stage === "CLOSED_WON").reduce((s, d) => s + d.value, 0)
    const weightedPipeline = deals.filter((d) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage)).reduce((s, d) => s + d.value * (d.probability / 100), 0)

    const moveStage = (dealId: string, newStage: DealStage) => {
        setDeals((prev) => prev.map((d) => d.id === dealId ? { ...d, stage: newStage, probability: stageProbability[newStage] } : d))
    }

    const handleDelete = (id: string) => {
        setDeals((prev) => prev.filter((d) => d.id !== id))
    }

    const getStageInfo = (key: DealStage) => stages.find((s) => s.key === key)!

    /* ── Dropdown for a deal ── */
    const DealActions = ({ deal }: { deal: Deal }) => (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
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
                    {/* View Toggle */}
                    <div className="flex gap-1 rounded-md border p-0.5">
                        <Button variant={viewMode === "table" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("table")}>
                            <List className="h-4 w-4" />
                        </Button>
                        <Button variant={viewMode === "kanban" ? "default" : "ghost"} size="icon" className="h-8 w-8" onClick={() => setViewMode("kanban")}>
                            <LayoutGrid className="h-4 w-4" />
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
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Pipeline</p>
                        </div>
                        <p className="text-2xl font-bold mt-1 text-emerald-500">{formatCurrency(totalPipeline)}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Weighted Value</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">{formatCurrency(Math.round(weightedPipeline))}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-400" />
                            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Closed Won</p>
                        </div>
                        <p className="text-2xl font-bold text-primary mt-1">{formatCurrency(totalWon)}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Search */}
            <div className="relative max-w-sm">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search deals..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
            </div>

            {/* ── TABLE VIEW ── */}
            {viewMode === "table" && (
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
                                    <TableHead>Owner</TableHead>
                                    <TableHead className="w-10"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filtered.length === 0 ? (
                                    <TableRow><TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No deals found.</TableCell></TableRow>
                                ) : filtered.map((deal) => {
                                    const si = getStageInfo(deal.stage)
                                    return (
                                        <TableRow key={deal.id} className="hover:bg-muted/50">
                                            <TableCell>
                                                <div><span className="font-medium">{deal.title}</span><p className="text-xs text-muted-foreground">{deal.contactName}</p></div>
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
                                                    <Calendar className="mr-2 h-3.5 w-3.5" />{deal.expectedClose}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm">{deal.assignedTo}</TableCell>
                                            <TableCell><DealActions deal={deal} /></TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* ── KANBAN VIEW ── */}
            {viewMode === "kanban" && (
                <div className="flex gap-4 overflow-x-auto pb-4 pt-2">
                    {stages.map((stage) => {
                        const colDeals = stageDeals(stage.key)
                        const colTotal = colDeals.reduce((s, d) => s + d.value, 0)
                        return (
                            <div key={stage.key} className="flex flex-col w-[320px] shrink-0">
                                <div className="flex items-center justify-between mb-3 px-1">
                                    <div className="flex items-center gap-2">
                                        <div className={`h-2.5 w-2.5 rounded-full ${stage.dotColor}`} />
                                        <h3 className="font-semibold text-sm">{stage.label}</h3>
                                        <Badge variant="secondary" className="rounded-full px-1.5 py-0 min-w-5 justify-center">{colDeals.length}</Badge>
                                    </div>
                                    <span className="text-xs font-medium text-muted-foreground">{formatCurrency(colTotal)}</span>
                                </div>

                                <div className="flex-1 bg-muted/30 rounded-lg p-2 space-y-3 min-h-[500px]">
                                    {colDeals.map((deal) => (
                                        <Card key={deal.id} className="cursor-pointer hover:border-primary/50 transition-colors shadow-sm">
                                            <CardContent className="p-3">
                                                <div className="flex justify-between items-start mb-2">
                                                    <p className="font-medium text-sm leading-tight line-clamp-2">{deal.title}</p>
                                                    <DealActions deal={deal} />
                                                </div>
                                                <p className="text-xs text-muted-foreground mb-3">{deal.company}</p>
                                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/50">
                                                    <span className="font-bold text-sm text-primary">{formatCurrency(deal.value)}</span>
                                                    <div className="flex items-center gap-1.5 bg-background border px-1.5 py-0.5 rounded text-[10px] font-medium text-muted-foreground">
                                                        <Calendar className="h-3 w-3" />
                                                        {new Date(deal.expectedClose).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                                    </div>
                                                </div>
                                                <div className="w-full bg-secondary h-1.5 rounded-full mt-3 overflow-hidden">
                                                    <div className={`h-full bg-gradient-to-r ${stage.color}`} style={{ width: `${deal.probability}%` }} />
                                                </div>
                                            </CardContent>
                                        </Card>
                                    ))}
                                    {colDeals.length === 0 && (
                                        <div className="h-24 border-2 border-dashed border-border/50 rounded-lg flex items-center justify-center text-xs text-muted-foreground">
                                            No deals
                                        </div>
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
