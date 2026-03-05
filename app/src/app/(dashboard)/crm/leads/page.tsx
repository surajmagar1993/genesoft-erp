"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Plus, Search, MoreHorizontal, Target, ArrowRightCircle, Pencil, Trash2, Eye, Sparkles, PhoneCall, CheckCircle2, XCircle,
} from "lucide-react"

interface Lead {
    id: string
    title: string
    contactName: string
    email: string
    source: string
    status: "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST"
    score: number
    assignedTo: string
    createdAt: string
}

const initialLeads: Lead[] = [
    { id: "1", title: "ERP Implementation Inquiry", contactName: "Rahul Deshmukh", email: "rahul@techfirm.in", source: "Website Form", status: "NEW", score: 75, assignedTo: "Suraj M.", createdAt: "2026-03-05" },
    { id: "2", title: "CRM for Retail Chain", contactName: "Aisha Khan", email: "aisha.k@retailgroup.ae", source: "Referral", status: "CONTACTED", score: 85, assignedTo: "Suraj M.", createdAt: "2026-03-04" },
    { id: "3", title: "Desktop Rental Solution", contactName: "Vijay Patil", email: "vijay@edusys.com", source: "Cold Call", status: "QUALIFIED", score: 92, assignedTo: "Admin", createdAt: "2026-03-01" },
    { id: "4", title: "Inventory Module Demo", contactName: "Sarah Johnson", email: "sarah@warehouse.us", source: "LinkedIn", status: "NEW", score: 60, assignedTo: "Suraj M.", createdAt: "2026-03-05" },
    { id: "5", title: "GST Compliance Software", contactName: "Ankit Sharma", email: "ankit@taxfirm.in", source: "Google Ads", status: "CONVERTED", score: 98, assignedTo: "Admin", createdAt: "2026-02-20" },
    { id: "6", title: "POS System Inquiry", contactName: "Mohammed Al-Rashid", email: "m.rashid@shopksa.sa", source: "Website Form", status: "LOST", score: 30, assignedTo: "Suraj M.", createdAt: "2026-02-15" },
]

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
    NEW: { label: "New", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Sparkles },
    CONTACTED: { label: "Contacted", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: PhoneCall },
    QUALIFIED: { label: "Qualified", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Target },
    CONVERTED: { label: "Converted", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
    LOST: { label: "Lost", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
}

export default function LeadsPage() {
    const [leads, setLeads] = useState(initialLeads)
    const [searchQuery, setSearchQuery] = useState("")
    const [filterStatus, setFilterStatus] = useState<string>("all")

    const filtered = leads.filter((l) => {
        const matchesSearch =
            l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
            l.contactName.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesStatus = filterStatus === "all" || l.status === filterStatus
        return matchesSearch && matchesStatus
    })

    const scoreColor = (score: number) =>
        score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                    <p className="text-muted-foreground mt-1">Track and convert potential customers</p>
                </div>
                <Button size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    New Lead
                </Button>
            </div>

            {/* Pipeline Stats */}
            <div className="grid grid-cols-5 gap-3">
                {Object.entries(statusConfig).map(([key, cfg]) => {
                    const count = leads.filter((l) => l.status === key).length
                    const Icon = cfg.icon
                    return (
                        <Card
                            key={key}
                            className={`cursor-pointer transition-colors hover:bg-accent/50 ${filterStatus === key ? "ring-1 ring-primary" : ""}`}
                            onClick={() => setFilterStatus(filterStatus === key ? "all" : key)}
                        >
                            <CardContent className="pt-4 pb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">{count}</p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input placeholder="Search leads..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">All Leads</CardTitle>
                        <CardDescription>{filtered.length} leads</CardDescription>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Lead</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Source</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-center">Score</TableHead>
                                <TableHead>Assigned</TableHead>
                                <TableHead>Date</TableHead>
                                <TableHead className="w-10"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filtered.map((lead) => {
                                const status = statusConfig[lead.status]
                                const StatusIcon = status.icon
                                return (
                                    <TableRow key={lead.id} className="cursor-pointer hover:bg-muted/50">
                                        <TableCell>
                                            <span className="font-medium">{lead.title}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div>
                                                <p className="text-sm">{lead.contactName}</p>
                                                <p className="text-xs text-muted-foreground">{lead.email}</p>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-xs">{lead.source}</Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs ${status.color}`}>
                                                <StatusIcon className="h-3 w-3 mr-1" />
                                                {status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-bold text-sm ${scoreColor(lead.score)}`}>
                                                {lead.score}
                                            </span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{lead.assignedTo}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{lead.createdAt}</TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem><Eye className="mr-2 h-4 w-4" />View</DropdownMenuItem>
                                                    <DropdownMenuItem><Pencil className="mr-2 h-4 w-4" />Edit</DropdownMenuItem>
                                                    <DropdownMenuItem><ArrowRightCircle className="mr-2 h-4 w-4" />Convert to Deal</DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-500"><Trash2 className="mr-2 h-4 w-4" />Delete</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
