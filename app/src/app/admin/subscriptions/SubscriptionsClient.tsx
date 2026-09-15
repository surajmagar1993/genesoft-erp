"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { 
    Receipt, 
    CreditCard, 
    TrendingUp, 
    Clock, 
    Building2, 
    Calendar, 
    Printer, 
    FileText, 
    ArrowUpRight, 
    ShieldCheck, 
    Sparkles, 
    MoreHorizontal
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { extendTenantTrial, updateTenantPlan } from "@/app/actions/saas/admin"
import { formatSaaSInvoiceReceiptHtml } from "@/lib/saas-subscription-engine"
import { toast } from "sonner"
import { format } from "date-fns"

interface SubscriptionsClientProps {
    data: {
        totalTenants: number
        totalMrr: number
        planCounts: Record<string, number>
        tenants: any[]
        invoices: any[]
    }
}

export function SubscriptionsClient({ data }: SubscriptionsClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<"tenants" | "invoices">("tenants")
    const [isLoading, setIsLoading] = useState(false)

    const handleExtendTrial = async (tenantId: string) => {
        try {
            setIsLoading(true)
            await extendTenantTrial(tenantId, 7)
            toast.success("Trial extended by 7 days")
            router.refresh()
        } catch (error: any) {
            toast.error(error?.message || "Failed to extend trial")
        } finally {
            setIsLoading(false)
        }
    }

    const printReceipt = (inv: any) => {
        const win = window.open("", "_blank")
        if (win) {
            win.document.write(formatSaaSInvoiceReceiptHtml(inv))
            win.document.close()
            win.focus()
            setTimeout(() => win.print(), 250)
        }
    }

    const formatCurrency = (amt: number) => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0
        }).format(amt)
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Platform Subscriptions & Billing</h1>
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5">
                            Revenue Engine
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Track SaaS subscription tiers, MRR/ARR monetization telemetry, and issued B2B billing receipts.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Link href="/admin/pricing">
                        <Button variant="outline" size="sm" className="text-xs font-semibold gap-1.5">
                            <CreditCard className="h-3.5 w-3.5" />
                            Manage Pricing Plans
                        </Button>
                    </Link>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Estimated MRR</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {formatCurrency(data.totalMrr)}
                            </div>
                            <span className="text-[10px] text-emerald-600 font-semibold">Monthly Recurring</span>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <TrendingUp className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Annualized ARR</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {formatCurrency(data.totalMrr * 12)}
                            </div>
                            <span className="text-[10px] text-blue-600 font-semibold">Annual Projected</span>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Receipt className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Tenants</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {data.totalTenants}
                            </div>
                            <span className="text-[10px] text-muted-foreground">Across all regions</span>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                            <Building2 className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Trials</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {data.tenants.filter(t => t.isTrial).length}
                            </div>
                            <span className="text-[10px] text-amber-600 font-semibold">Grace Window Active</span>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Tier Breakdown Pills */}
            <div className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl border bg-card/40 backdrop-blur text-xs">
                <span className="font-semibold text-muted-foreground mr-1">Plan Distribution:</span>
                <span className="px-2.5 py-1 rounded-full bg-slate-500/10 text-slate-700 dark:text-slate-300 font-bold border">
                    FREE: {data.planCounts["FREE"] || 0}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-700 dark:text-blue-300 font-bold border border-blue-500/20">
                    BASIC: {data.planCounts["BASIC"] || 0}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20">
                    PRO: {data.planCounts["PRO"] || 0}
                </span>
                <span className="px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold border border-purple-500/20">
                    ENTERPRISE: {data.planCounts["ENTERPRISE"] || 0}
                </span>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b">
                <button
                    onClick={() => setActiveTab("tenants")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "tenants"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Tenant Subscription Ledger ({data.tenants.length})
                </button>
                <button
                    onClick={() => setActiveTab("invoices")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "invoices"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Issued Subscription Invoices ({data.invoices.length})
                </button>
            </div>

            {/* Tab 1: Tenant Subscriptions */}
            {activeTab === "tenants" && (
                <Card className="border-primary/10 shadow-lg bg-card/50 backdrop-blur overflow-hidden">
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[280px]">Organization</TableHead>
                                    <TableHead>Subscription Tier</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Trial Expiration</TableHead>
                                    <TableHead>Registered</TableHead>
                                    <TableHead className="text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.tenants.map(t => (
                                    <TableRow key={t.id} className="hover:bg-primary/5 transition-colors">
                                        <TableCell>
                                            <Link href={`/admin/tenants/${t.id}`} className="flex items-center gap-3 group">
                                                <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary group-hover:scale-105 transition-transform">
                                                    {t.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-sm group-hover:underline truncate text-foreground">
                                                        {t.name}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground font-mono">
                                                        {t.domain || t.countryCode} • {t.currencyCode}
                                                    </span>
                                                </div>
                                            </Link>
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant={t.plan === "FREE" ? "outline" : "default"} className="font-bold text-[10px]">
                                                {t.plan}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`h-2 w-2 rounded-full ${t.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                                                <span className="text-xs font-medium">
                                                    {t.isActive ? "Active" : "Suspended"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-xs text-muted-foreground">
                                            {t.isTrial && t.trialEndsAt ? (
                                                <span className="text-amber-600 font-semibold flex items-center gap-1">
                                                    <Clock className="h-3 w-3" />
                                                    {format(new Date(t.trialEndsAt), "MMM d, yyyy")}
                                                </span>
                                            ) : (
                                                <span className="text-muted-foreground/60">Standard Paid / Non-trial</span>
                                            )}
                                        </TableCell>

                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(t.createdAt), "MMM d, yyyy")}
                                        </TableCell>

                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuLabel>Billing Operations</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
                                                        <Link href={`/admin/tenants/${t.id}`}>
                                                            <Building2 className="h-3.5 w-3.5 opacity-70" />
                                                            View 360° Profile
                                                        </Link>
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleExtendTrial(t.id)}
                                                        disabled={isLoading}
                                                        className="gap-2 cursor-pointer text-xs"
                                                    >
                                                        <Calendar className="h-3.5 w-3.5 opacity-70" />
                                                        Extend Trial (+7d)
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Tab 2: Issued Subscription Invoices */}
            {activeTab === "invoices" && (
                <Card className="border-primary/10 shadow-lg bg-card/50 backdrop-blur overflow-hidden">
                    <CardContent className="p-0">
                        {data.invoices.length > 0 ? (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invoice #</TableHead>
                                        <TableHead>Client / Tenant</TableHead>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Tier & Cycle</TableHead>
                                        <TableHead>Total Paid</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right pr-6">Receipt</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.invoices.map((inv: any) => (
                                        <TableRow key={inv.id} className="hover:bg-primary/5 transition-colors">
                                            <TableCell className="font-mono text-xs font-semibold">
                                                {inv.invoiceNumber}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-foreground">
                                                {inv.tenantName}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {format(new Date(inv.date), "MMM d, yyyy")}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <Badge variant="outline" className="text-[10px] font-bold">
                                                        {inv.plan}
                                                    </Badge>
                                                    <span className="text-xs text-muted-foreground">
                                                        ({inv.billingCycle})
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-sm font-bold">
                                                {inv.currency} {Number(inv.total).toFixed(2)}
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 text-[10px] uppercase font-bold">
                                                    {inv.status || "PAID"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => printReceipt(inv)}
                                                    className="h-7 text-xs gap-1"
                                                >
                                                    <Printer className="h-3 w-3" />
                                                    Print Slip
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        ) : (
                            <div className="text-center py-12 text-muted-foreground text-sm">
                                <Receipt className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="font-semibold">No platform B2B invoices recorded yet.</p>
                                <p className="text-xs opacity-70 mt-0.5">Invoices generated for tenants on their profile page will appear here.</p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
