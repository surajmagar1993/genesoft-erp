"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Plus, MoreHorizontal, DollarSign, TrendingUp, Eye, Pencil, Trash2,
    ArrowRight, Calendar,
} from "lucide-react"

interface Deal {
    id: string
    title: string
    contactName: string
    company: string
    value: number
    stage: string
    probability: number
    expectedClose: string
    assignedTo: string
}

const stages = [
    { key: "PROSPECTING", label: "Prospecting", color: "from-slate-500 to-slate-600" },
    { key: "QUALIFICATION", label: "Qualification", color: "from-blue-500 to-blue-600" },
    { key: "PROPOSAL", label: "Proposal", color: "from-indigo-500 to-purple-600" },
    { key: "NEGOTIATION", label: "Negotiation", color: "from-amber-500 to-orange-600" },
    { key: "CLOSED_WON", label: "Closed Won", color: "from-emerald-500 to-green-600" },
    { key: "CLOSED_LOST", label: "Closed Lost", color: "from-red-500 to-red-600" },
]

const initialDeals: Deal[] = [
    { id: "1", title: "ERP Annual License", contactName: "Rahul Deshmukh", company: "TechFirm India", value: 350000, stage: "PROPOSAL", probability: 60, expectedClose: "2026-04-15", assignedTo: "Suraj M." },
    { id: "2", title: "CRM + POS Setup", contactName: "Aisha Khan", company: "RetailGroup UAE", value: 525000, stage: "NEGOTIATION", probability: 80, expectedClose: "2026-03-31", assignedTo: "Suraj M." },
    { id: "3", title: "Desktop Rental — 50 Units", contactName: "Vijay Patil", company: "VM Edulife Pvt Ltd", value: 180000, stage: "QUALIFICATION", probability: 40, expectedClose: "2026-05-01", assignedTo: "Admin" },
    { id: "4", title: "GST Module License", contactName: "Ankit Sharma", company: "TaxFirm India", value: 95000, stage: "CLOSED_WON", probability: 100, expectedClose: "2026-02-28", assignedTo: "Admin" },
    { id: "5", title: "Inventory Integration", contactName: "Sarah Johnson", company: "Warehouse US", value: 280000, stage: "PROSPECTING", probability: 20, expectedClose: "2026-06-01", assignedTo: "Suraj M." },
    { id: "6", title: "HR Module Demo", contactName: "Mohammed Al-Rashid", company: "ShopKSA", value: 120000, stage: "CLOSED_LOST", probability: 0, expectedClose: "2026-02-15", assignedTo: "Suraj M." },
    { id: "7", title: "Multi-branch Setup", contactName: "Priya Sharma", company: "Genesoft Infotech", value: 450000, stage: "PROPOSAL", probability: 70, expectedClose: "2026-04-20", assignedTo: "Admin" },
]

export default function DealsPage() {
    const [deals] = useState(initialDeals)

    const stageDeals = (stageKey: string) => deals.filter((d) => d.stage === stageKey)
    const totalPipeline = deals
        .filter((d) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage))
        .reduce((s, d) => s + d.value, 0)
    const totalWon = deals.filter((d) => d.stage === "CLOSED_WON").reduce((s, d) => s + d.value, 0)
    const weightedPipeline = deals
        .filter((d) => !["CLOSED_WON", "CLOSED_LOST"].includes(d.stage))
        .reduce((s, d) => s + d.value * (d.probability / 100), 0)

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Deals</h1>
                    <p className="text-muted-foreground mt-1">Track your sales pipeline and revenue</p>
                </div>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Deal
                </Button>
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Active Pipeline</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">₹{totalPipeline.toLocaleString("en-IN")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">Weighted Pipeline</p>
                        </div>
                        <p className="text-2xl font-bold mt-1">₹{Math.round(weightedPipeline).toLocaleString("en-IN")}</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-4 pb-3">
                        <div className="flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-emerald-400" />
                            <p className="text-xs text-muted-foreground">Closed Won</p>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400 mt-1">₹{totalWon.toLocaleString("en-IN")}</p>
                    </CardContent>
                </Card>
            </div>

            {/* Kanban Pipeline */}
            <div className="overflow-x-auto">
                <div className="flex gap-4 min-w-max pb-4">
                    {stages.map((stage) => {
                        const stageItems = stageDeals(stage.key)
                        const stageTotal = stageItems.reduce((s, d) => s + d.value, 0)
                        return (
                            <div key={stage.key} className="w-72 shrink-0">
                                {/* Stage Header */}
                                <div className="mb-3">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2.5 w-2.5 rounded-full bg-gradient-to-br ${stage.color}`} />
                                            <h3 className="text-sm font-semibold">{stage.label}</h3>
                                        </div>
                                        <Badge variant="secondary" className="text-xs">{stageItems.length}</Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        ₹{stageTotal.toLocaleString("en-IN")}
                                    </p>
                                </div>

                                {/* Deal Cards */}
                                <div className="space-y-2">
                                    {stageItems.length === 0 ? (
                                        <div className="rounded-lg border border-dashed border-border/50 p-6 text-center">
                                            <p className="text-xs text-muted-foreground">No deals</p>
                                        </div>
                                    ) : (
                                        stageItems.map((deal) => (
                                            <Card key={deal.id} className="group hover:shadow-md transition-shadow cursor-pointer">
                                                <CardContent className="p-4">
                                                    <div className="flex items-start justify-between">
                                                        <h4 className="text-sm font-medium leading-tight">{deal.title}</h4>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity -mt-1 -mr-1">
                                                                    <MoreHorizontal className="h-3 w-3" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end">
                                                                <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                                                                <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                                <DropdownMenuItem><ArrowRight className="mr-2 h-4 w-4" />Move Stage</DropdownMenuItem>
                                                                <DropdownMenuSeparator />
                                                                <DropdownMenuItem className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>

                                                    <p className="text-xs text-muted-foreground mt-1">{deal.company}</p>

                                                    <div className="mt-3 flex items-center justify-between">
                                                        <span className="text-sm font-bold">₹{deal.value.toLocaleString("en-IN")}</span>
                                                        <Badge variant="outline" className="text-xs">
                                                            {deal.probability}%
                                                        </Badge>
                                                    </div>

                                                    <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                                                        <span>{deal.assignedTo}</span>
                                                        <div className="flex items-center gap-1">
                                                            <Calendar className="h-3 w-3" />
                                                            {deal.expectedClose}
                                                        </div>
                                                    </div>

                                                    {/* Probability Bar */}
                                                    <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full bg-gradient-to-r ${stage.color}`}
                                                            style={{ width: `${deal.probability}%` }}
                                                        />
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
