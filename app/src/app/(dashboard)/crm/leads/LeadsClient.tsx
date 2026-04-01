"use client"

import { useState, useTransition, useEffect } from "react"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
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
    Plus, Search, MoreHorizontal, Target, ArrowRightCircle, Pencil, Trash2, Eye,
    Sparkles, PhoneCall, CheckCircle2, XCircle, Loader2,
} from "lucide-react"
import { deleteLead, updateLead, type Lead, type LeadStatus } from "@/app/actions/crm/leads"

const statusConfig: Record<LeadStatus, { label: string; color: string; icon: React.ElementType }> = {
    NEW: { label: "New", color: "bg-blue-500/10 text-blue-500 border-blue-500/20", icon: Sparkles },
    CONTACTED: { label: "Contacted", color: "bg-amber-500/10 text-amber-500 border-amber-500/20", icon: PhoneCall },
    QUALIFIED: { label: "Qualified", color: "bg-purple-500/10 text-purple-500 border-purple-500/20", icon: Target },
    CONVERTED: { label: "Converted", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20", icon: CheckCircle2 },
    LOST: { label: "Lost", color: "bg-red-500/10 text-red-500 border-red-500/20", icon: XCircle },
}

interface Props {
    initialLeads: Lead[]
    total: number
}

export default function LeadsClient({ initialLeads, total }: Props) {
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
        // Reset to page 1 if search/status changes, unless specifically setting a page
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

    const scoreColor = (score: number) =>
        score >= 80 ? "text-emerald-400" : score >= 50 ? "text-amber-400" : "text-red-400"

    const handleDelete = (id: string) => {
        setPendingId(id)
        startTransition(async () => {
            const { error } = await deleteLead(id)
            if (!error) router.refresh() 
            setPendingId(null)
        })
    }

    const handleConvert = (id: string) => {
        setPendingId(id)
        startTransition(async () => {
            const { error } = await updateLead(id, { status: "CONVERTED" })
            if (!error) router.refresh()
            setPendingId(null)
        })
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Leads</h1>
                    <p className="text-muted-foreground mt-1">Track and convert potential customers</p>
                </div>
                <Button size="sm" onClick={() => router.push("/crm/leads/new")}>
                    <Plus className="h-4 w-4 mr-2" /> New Lead
                </Button>
            </div>

            {/* Status Grid */}
            <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
                {(Object.entries(statusConfig) as [LeadStatus, typeof statusConfig[LeadStatus]][]).map(([key, cfg]) => {
                    const Icon = cfg.icon
                    const isActive = filterStatus === key
                    return (
                        <Card
                            key={key}
                            className={`cursor-pointer transition-colors hover:bg-accent/50 ${isActive ? "ring-2 ring-primary border-primary" : "border-border/50"}`}
                            onClick={() => {
                                const newStatus = isActive ? "all" : key
                                setFilterStatus(newStatus)
                                updateUrl({ status: newStatus })
                            }}
                        >
                            <CardContent className="pt-4 pb-3">
                                <div className="flex items-center gap-2">
                                    <Icon className="h-4 w-4 text-muted-foreground" />
                                    <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">{cfg.label}</p>
                                </div>
                                <p className="text-2xl font-bold mt-1">
                                    {isActive ? total : initialLeads.filter(l => l.status === key).length}
                                </p>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Search */}
            <Card>
                <CardContent className="pt-6">
                    <div className="relative max-w-sm">
                        {isPending ? (
                            <Loader2 className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground animate-spin" />
                        ) : (
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        )}
                        <Input 
                            placeholder="Search leads..." 
                            className="pl-8" 
                            value={searchQuery} 
                            onChange={(e) => setSearchQuery(e.target.value)} 
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Table */}
            <Card>
                <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">All Leads</CardTitle>
                        <CardDescription>{total} leads found</CardDescription>
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
                            {initialLeads.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">No leads found.</TableCell>
                                </TableRow>
                            ) : initialLeads.map((lead) => {
                                const status = statusConfig[lead.status]
                                const StatusIcon = status.icon
                                return (
                                    <TableRow 
                                        key={lead.id} 
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => router.push(`/crm/leads/${lead.id}`)}
                                    >
                                        <TableCell><span className="font-medium">{lead.title}</span></TableCell>
                                        <TableCell>
                                            <div><p className="text-sm">{lead.contact_name}</p><p className="text-xs text-muted-foreground">{lead.email}</p></div>
                                        </TableCell>
                                        <TableCell><Badge variant="outline" className="text-xs">{lead.source}</Badge></TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={`text-xs ${status.color}`}>
                                                <StatusIcon className="h-3 w-3 mr-1" />{status.label}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <span className={`font-bold text-sm ${scoreColor(lead.score)}`}>{lead.score}</span>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">{lead.assigned_to}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {lead.created_at ? new Date(lead.created_at).toLocaleDateString() : "—"}
                                        </TableCell>
                                        <TableCell>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8" disabled={pendingId === lead.id}>
                                                        {pendingId === lead.id
                                                            ? <Loader2 className="h-4 w-4 animate-spin" />
                                                            : <MoreHorizontal className="h-4 w-4" />}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => router.push(`/crm/leads/${lead.id}`)}>
                                                        <Eye className="mr-2 h-4 w-4" />View
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => router.push(`/crm/leads/${lead.id}/edit`)}>
                                                        <Pencil className="mr-2 h-4 w-4" />Edit
                                                    </DropdownMenuItem>
                                                    {lead.status !== "CONVERTED" && lead.status !== "LOST" && (
                                                        <DropdownMenuItem onClick={() => handleConvert(lead.id)}>
                                                            <ArrowRightCircle className="mr-2 h-4 w-4" />Convert to Deal
                                                        </DropdownMenuItem>
                                                    )}
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem className="text-red-500" onClick={() => handleDelete(lead.id)}>
                                                        <Trash2 className="mr-2 h-4 w-4" />Delete
                                                    </DropdownMenuItem>
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
