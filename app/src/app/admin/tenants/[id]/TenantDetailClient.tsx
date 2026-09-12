"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
    Building2, 
    ArrowLeft, 
    Calendar, 
    CreditCard, 
    UserCheck, 
    UserX, 
    Users, 
    FileText, 
    Receipt, 
    Clock, 
    Globe, 
    Phone, 
    Mail, 
    Edit3, 
    Shield, 
    Sparkles, 
    Layers, 
    Activity,
    CheckCircle2,
    AlertCircle,
    Loader2
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { format } from "date-fns"
import { toast } from "sonner"
import { 
    extendTenantTrial, 
    toggleTenantStatus, 
    updateTenantPlan, 
    updateTenantDetails 
} from "@/app/actions/saas/admin"
import { generateSaaSInvoice } from "@/app/actions/saas/subscription"
import { formatSaaSInvoiceReceiptHtml, PlanTier, BillingCycle } from "@/lib/saas-subscription-engine"
import { Printer, PlusCircle } from "lucide-react"

export function TenantDetailClient({ tenant }: { tenant: any }) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<"overview" | "users" | "records" | "audit">("overview")
    const [isLoading, setIsLoading] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)

    // Edit form state
    const [editForm, setEditForm] = useState({
        name: tenant.name || "",
        domain: tenant.domain || "",
        email: tenant.email || "",
        phone: tenant.phone || "",
        website: tenant.website || "",
        plan: tenant.plan || "PRO",
        countryCode: tenant.countryCode || "IN",
        currencyCode: tenant.currencyCode || "INR",
        isActive: tenant.isActive ?? true,
        isTrial: tenant.isTrial ?? false
    })

    // Platform Invoicing State
    const [isInvoicingOpen, setIsInvoicingOpen] = useState(false)
    const [invoiceTier, setInvoiceTier] = useState<PlanTier>(tenant.plan || "PRO")
    const [invoiceCycle, setInvoiceCycle] = useState<BillingCycle>("MONTHLY")
    const [isIssuingInvoice, setIsIssuingInvoice] = useState(false)

    // Receipt Modal State
    const [selectedInvoice, setSelectedInvoice] = useState<any>(null)
    const [isReceiptOpen, setIsReceiptOpen] = useState(false)

    const subMeta = (tenant.settings as any)?.subscription || {}
    const saasInvoices: any[] = Array.isArray(subMeta.invoices) ? subMeta.invoices : []

    const handleIssueInvoice = async () => {
        try {
            setIsIssuingInvoice(true)
            const res = await generateSaaSInvoice({
                tenantId: tenant.id,
                plan: invoiceTier,
                billingCycle: invoiceCycle,
            })
            if (res.success) {
                toast.success(`Platform subscription invoice ${res.invoice?.invoiceNumber} generated!`)
                setIsInvoicingOpen(false)
                router.refresh()
            } else {
                toast.error(res.error || "Failed to generate invoice")
            }
        } catch (err: any) {
            toast.error(err.message || "Invoice generation failed")
        } finally {
            setIsIssuingInvoice(false)
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

    const handleExtendTrial = async () => {
        try {
            setIsLoading(true)
            await extendTenantTrial(tenant.id, 7)
            toast.success("Trial extended by 7 days")
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Failed to extend trial")
        } finally {
            setIsLoading(false)
        }
    }

    const handleToggleStatus = async () => {
        try {
            setIsLoading(true)
            await toggleTenantStatus(tenant.id, !tenant.isActive)
            toast.success(`Tenant ${tenant.isActive ? 'suspended' : 'activated'} successfully`)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Failed to update status")
        } finally {
            setIsLoading(false)
        }
    }

    const handlePlanChange = async (newPlan: string) => {
        try {
            setIsLoading(true)
            await updateTenantPlan(tenant.id, newPlan)
            toast.success(`Tenant plan updated to ${newPlan}`)
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error("Failed to change plan")
        } finally {
            setIsLoading(false)
        }
    }

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            await updateTenantDetails(tenant.id, editForm)
            toast.success("Tenant profile updated successfully")
            setIsEditOpen(false)
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error?.message || "Failed to update tenant")
        } finally {
            setIsLoading(false)
        }
    }

    const formatCurrency = (amount: number, currency: string = "INR") => {
        return new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: currency || "INR",
            maximumFractionDigits: 0
        }).format(amount)
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto px-4 pb-12">
            {/* Header / Breadcrumb */}
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-5">
                <div className="flex items-center gap-4">
                    <Link href="/admin/tenants">
                        <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-lg text-primary shadow-sm">
                            {tenant.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-2xl font-bold tracking-tight">{tenant.name}</h1>
                                <Badge variant={tenant.isActive ? "default" : "destructive"} className="text-[10px] font-bold">
                                    {tenant.isActive ? "Active" : "Suspended"}
                                </Badge>
                                <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5">
                                    {tenant.plan}
                                </Badge>
                                {tenant.isTrial && (
                                    <span className="text-[10px] bg-amber-500/10 text-amber-600 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-amber-500/20">
                                        Trial Active
                                    </span>
                                )}
                            </div>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                Tenant ID: <span className="font-mono text-foreground font-medium">{tenant.id}</span> • Created {format(new Date(tenant.createdAt), "MMM d, yyyy")}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="flex items-center gap-2 flex-wrap">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setIsEditOpen(true)}
                        className="gap-1.5 text-xs font-semibold"
                    >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit Profile
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={handleExtendTrial}
                        disabled={isLoading}
                        className="gap-1.5 text-xs font-semibold"
                    >
                        <Calendar className="h-3.5 w-3.5" />
                        Extend Trial (+7d)
                    </Button>
                    <Button 
                        variant={tenant.isActive ? "destructive" : "default"}
                        size="sm" 
                        onClick={handleToggleStatus}
                        disabled={isLoading}
                        className="gap-1.5 text-xs font-semibold"
                    >
                        {tenant.isActive ? (
                            <>
                                <UserX className="h-3.5 w-3.5" />
                                Suspend
                            </>
                        ) : (
                            <>
                                <UserCheck className="h-3.5 w-3.5" />
                                Activate
                            </>
                        )}
                    </Button>
                </div>
            </div>

            {/* KPI Metric Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Revenue Billed</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {formatCurrency(tenant.totalRevenue, tenant.currencyCode)}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                            <CreditCard className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Invoices</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {tenant._count?.invoices || 0}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Receipt className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contacts / Leads</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {tenant._count?.contacts || 0}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                            <Users className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Users</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {tenant._count?.users || 0}
                            </div>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center">
                            <Shield className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b">
                <button
                    onClick={() => setActiveTab("overview")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "overview"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Overview & Settings
                </button>
                <button
                    onClick={() => setActiveTab("users")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "users"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Team Members ({tenant.users?.length || 0})
                </button>
                <button
                    onClick={() => setActiveTab("records")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "records"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Business Footprint
                </button>
                <button
                    onClick={() => setActiveTab("audit")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "audit"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Governance Audit Trail ({tenant.auditLogs?.length || 0})
                </button>
            </div>

            {/* Tab 1: Overview & Settings */}
            {activeTab === "overview" && (
                <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                            <CardHeader className="bg-muted/20 border-b pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary" />
                                    Organization Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3 text-sm">
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Entity Name</span>
                                    <span className="font-semibold">{tenant.name}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Domain Identifier</span>
                                    <span className="font-mono text-xs">{tenant.domain || "Standard Tenant Subdomain"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Official Email</span>
                                    <span>{tenant.email || "Not specified"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Phone</span>
                                    <span>{tenant.phone || "Not specified"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Website</span>
                                    <span>{tenant.website ? <a href={tenant.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">{tenant.website}</a> : "Not specified"}</span>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                            <CardHeader className="bg-muted/20 border-b pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" />
                                    Subscription & Regional Compliance
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4 space-y-3 text-sm">
                                <div className="flex justify-between py-1.5 border-b border-border/50 items-center">
                                    <span className="text-muted-foreground">Current Plan</span>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="font-bold">{tenant.plan}</Badge>
                                        <select
                                            value={tenant.plan}
                                            onChange={e => handlePlanChange(e.target.value)}
                                            disabled={isLoading}
                                            className="h-7 text-xs rounded border bg-background px-2"
                                        >
                                            <option value="FREE">FREE</option>
                                            <option value="BASIC">BASIC</option>
                                            <option value="PRO">PRO</option>
                                            <option value="ENTERPRISE">ENTERPRISE</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Billing Cycle</span>
                                    <span className="font-semibold">{subMeta.billingCycle || "MONTHLY"}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Period Renewal</span>
                                    <span className="font-medium">
                                        {subMeta.currentPeriodEnd ? format(new Date(subMeta.currentPeriodEnd), "MMM d, yyyy") : "Active Continuous"}
                                    </span>
                                </div>
                                {subMeta.scheduledDowngrade && (
                                    <div className="flex justify-between py-1.5 border-b border-border/50 bg-amber-500/10 px-2 rounded">
                                        <span className="text-amber-700 dark:text-amber-400 font-medium">Scheduled Downgrade</span>
                                        <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                                            To {subMeta.scheduledDowngrade.plan} on {format(new Date(subMeta.scheduledDowngrade.effectiveDate), "MMM d, yyyy")}
                                        </span>
                                    </div>
                                )}
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Country Jurisdiction</span>
                                    <span className="font-semibold">{tenant.countryCode}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Base Currency</span>
                                    <span className="font-semibold">{tenant.currencyCode}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Fiscal Year Start Month</span>
                                    <span>Month {tenant.fiscalYearStart || 4}</span>
                                </div>
                                <div className="flex justify-between py-1.5 border-b border-border/50">
                                    <span className="text-muted-foreground">Trial Expiration</span>
                                    <span className="font-medium text-amber-600">
                                        {tenant.trialEndsAt ? format(new Date(tenant.trialEndsAt), "MMM d, yyyy (h:mm a)") : "No active trial expiration"}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Platform Subscription Invoices & Billing History */}
                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur overflow-hidden">
                        <CardHeader className="bg-muted/20 border-b pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Receipt className="h-4 w-4 text-primary" />
                                    Platform Subscription Invoices & Receipts
                                </CardTitle>
                                <CardDescription>
                                    Super Admin platform billing records, automated B2B receipts, and proration audit slips
                                </CardDescription>
                            </div>
                            <Button
                                size="sm"
                                onClick={() => setIsInvoicingOpen(true)}
                                className="gap-1.5 font-semibold text-xs h-8"
                            >
                                <PlusCircle className="h-3.5 w-3.5" />
                                Issue Platform Invoice
                            </Button>
                        </CardHeader>
                        <CardContent className="p-0">
                            {saasInvoices.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Invoice #</TableHead>
                                            <TableHead>Date</TableHead>
                                            <TableHead>Plan & Cycle</TableHead>
                                            <TableHead>Subtotal / Tax</TableHead>
                                            <TableHead>Total Paid</TableHead>
                                            <TableHead>Status</TableHead>
                                            <TableHead className="text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {saasInvoices.map((inv: any) => (
                                            <TableRow key={inv.id}>
                                                <TableCell className="font-mono text-xs font-semibold">
                                                    {inv.invoiceNumber}
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    {format(new Date(inv.date), "MMM d, yyyy")}
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-1.5">
                                                        <Badge variant="outline" className="text-[11px] font-bold">
                                                            {inv.plan}
                                                        </Badge>
                                                        <span className="text-xs text-muted-foreground">
                                                            ({inv.billingCycle})
                                                        </span>
                                                    </div>
                                                </TableCell>
                                                <TableCell className="text-xs">
                                                    <div>{inv.currency} {Number(inv.subtotal).toFixed(2)}</div>
                                                    <div className="text-[10px] text-muted-foreground">
                                                        Tax ({inv.taxRate}%): {inv.currency} {Number(inv.taxAmount).toFixed(2)}
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
                                                <TableCell className="text-right">
                                                    <div className="flex items-center justify-end gap-1.5">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1"
                                                            onClick={() => {
                                                                setSelectedInvoice(inv)
                                                                setIsReceiptOpen(true)
                                                            }}
                                                        >
                                                            <FileText className="h-3 w-3" />
                                                            View Slip
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 text-xs gap-1"
                                                            onClick={() => printReceipt(inv)}
                                                        >
                                                            <Printer className="h-3 w-3" />
                                                            Print
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-sm font-medium">No platform invoices issued yet</p>
                                    <p className="text-xs mt-0.5">Click &quot;Issue Platform Invoice&quot; to generate an official B2B subscription invoice for this organization.</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab 2: Team Members & Users */}
            {activeTab === "users" && (
                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Users className="h-4 w-4 text-primary" />
                            Registered User Accounts
                        </CardTitle>
                        <CardDescription>
                            Users granted access credentials to this tenant workspace.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenant.users && tenant.users.length > 0 ? (
                                    tenant.users.map((u: any) => (
                                        <TableRow key={u.id}>
                                            <TableCell className="font-semibold text-sm">
                                                {u.fullName || "Unnamed User"}
                                            </TableCell>
                                            <TableCell className="text-sm font-mono text-muted-foreground">
                                                {u.email}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-[10px] font-bold">
                                                    {u.role}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold ${u.isActive ? "text-emerald-600" : "text-rose-600"}`}>
                                                    <span className={`h-2 w-2 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                                                    {u.isActive ? "Active" : "Inactive"}
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">
                                                {format(new Date(u.createdAt), "MMM d, yyyy")}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                                            No users registered for this tenant yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Tab 3: Business Records & Footprint */}
            {activeTab === "records" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                <span>Sales Quotations</span>
                                <FileText className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tenant._count?.quotes || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Total estimates generated</p>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                <span>Sales Orders</span>
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tenant._count?.salesOrders || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Confirmed customer orders</p>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                <span>Products & Catalog</span>
                                <Layers className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tenant._count?.products || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Active inventory/service SKUs</p>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                <span>Vendor Bills (AP)</span>
                                <Receipt className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tenant._count?.bills || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Accounts payable entries</p>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                        <CardHeader className="pb-2">
                            <CardTitle className="text-sm font-semibold flex items-center justify-between">
                                <span>Support Tickets</span>
                                <Activity className="h-4 w-4 text-muted-foreground" />
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{tenant._count?.supportTickets || 0}</div>
                            <p className="text-xs text-muted-foreground mt-1">Helpdesk inquiries raised</p>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab 4: Governance Audit Trail */}
            {activeTab === "audit" && (
                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Shield className="h-4 w-4 text-primary" />
                            Platform Super Admin Audit Logs
                        </CardTitle>
                        <CardDescription>
                            Historical ledger of platform actions, plan adjustments, and trial modifications.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>Admin Email</TableHead>
                                    <TableHead>Metadata Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tenant.auditLogs && tenant.auditLogs.length > 0 ? (
                                    tenant.auditLogs.map((log: any) => (
                                        <TableRow key={log.id}>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {format(new Date(log.createdAt), "MMM d, yyyy (HH:mm)")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                                    {log.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">
                                                {log.adminEmail}
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono max-w-xs truncate">
                                                {JSON.stringify(log.metadata)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground text-sm">
                                            No administrative audit logs recorded for this tenant yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Modal / Dialog for Editing Tenant Profile */}
            {isEditOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-card border border-primary/20 rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-primary" />
                                Edit Business Profile
                            </h2>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsEditOpen(false)}
                                className="h-7 w-7 p-0"
                            >
                                ✕
                            </Button>
                        </div>

                        <form onSubmit={handleSaveEdit} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="editName" className="text-xs font-medium">Business Name</Label>
                                <Input
                                    id="editName"
                                    required
                                    value={editForm.name}
                                    onChange={e => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter business name"
                                    className="bg-background text-sm"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="editDomain" className="text-xs font-medium">Domain / Subdomain</Label>
                                    <Input
                                        id="editDomain"
                                        value={editForm.domain}
                                        onChange={e => setEditForm(prev => ({ ...prev, domain: e.target.value }))}
                                        placeholder="Enter custom domain"
                                        className="bg-background text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="editEmail" className="text-xs font-medium">Contact Email</Label>
                                    <Input
                                        id="editEmail"
                                        type="email"
                                        value={editForm.email}
                                        onChange={e => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                                        placeholder="Enter contact email"
                                        className="bg-background text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="editPhone" className="text-xs font-medium">Phone</Label>
                                    <Input
                                        id="editPhone"
                                        value={editForm.phone}
                                        onChange={e => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                                        placeholder="Enter contact phone"
                                        className="bg-background text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="editWebsite" className="text-xs font-medium">Website</Label>
                                    <Input
                                        id="editWebsite"
                                        value={editForm.website}
                                        onChange={e => setEditForm(prev => ({ ...prev, website: e.target.value }))}
                                        placeholder="Enter website URL"
                                        className="bg-background text-sm"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="editCountry" className="text-xs font-medium">Country Code</Label>
                                    <Input
                                        id="editCountry"
                                        value={editForm.countryCode}
                                        onChange={e => setEditForm(prev => ({ ...prev, countryCode: e.target.value }))}
                                        placeholder="e.g. IN, US, AE"
                                        className="bg-background text-sm"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label htmlFor="editCurrency" className="text-xs font-medium">Currency Code</Label>
                                    <Input
                                        id="editCurrency"
                                        value={editForm.currencyCode}
                                        onChange={e => setEditForm(prev => ({ ...prev, currencyCode: e.target.value }))}
                                        placeholder="e.g. INR, USD, AED"
                                        className="bg-background text-sm"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="editPlan" className="text-xs font-medium">Subscription Tier</Label>
                                <select
                                    id="editPlan"
                                    value={editForm.plan}
                                    onChange={e => setEditForm(prev => ({ ...prev, plan: e.target.value }))}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                >
                                    <option value="FREE">FREE</option>
                                    <option value="BASIC">BASIC</option>
                                    <option value="PRO">PRO</option>
                                    <option value="ENTERPRISE">ENTERPRISE</option>
                                </select>
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setIsEditOpen(false)}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    size="sm" 
                                    disabled={isLoading}
                                    className="gap-1.5 font-semibold"
                                >
                                    {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Issue Platform Invoice Modal */}
            {isInvoicingOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border/80 rounded-xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-primary" />
                                Issue Platform Subscription Invoice
                            </h2>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsInvoicingOpen(false)}
                                className="h-7 w-7 p-0"
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="space-y-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Subscription Tier</Label>
                                <select
                                    value={invoiceTier}
                                    onChange={e => setInvoiceTier(e.target.value as PlanTier)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                >
                                    <option value="FREE">FREE ($0)</option>
                                    <option value="BASIC">BASIC (Starter)</option>
                                    <option value="PRO">PRO (Growth)</option>
                                    <option value="ENTERPRISE">ENTERPRISE (Scale)</option>
                                </select>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-medium">Billing Frequency</Label>
                                <select
                                    value={invoiceCycle}
                                    onChange={e => setInvoiceCycle(e.target.value as BillingCycle)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                >
                                    <option value="MONTHLY">Monthly</option>
                                    <option value="ANNUAL">Annual (20% Discount)</option>
                                </select>
                            </div>

                            <div className="p-3 bg-muted/40 rounded-lg border border-border/50 text-xs space-y-1 text-muted-foreground">
                                <p className="font-semibold text-foreground">Invoice Specifications:</p>
                                <p>• Country Jurisdiction: <span className="font-medium text-foreground">{tenant.countryCode}</span></p>
                                <p>• Currency: <span className="font-medium text-foreground">{tenant.currencyCode}</span></p>
                                <p>• Sequential format: <span className="font-mono text-primary font-semibold">SAAS-INV-{new Date().getFullYear()}-XXXX</span></p>
                                <p>• Status will be recorded as <span className="text-emerald-600 font-semibold">PAID</span> with regional tax breakdown.</p>
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-3 border-t">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsInvoicingOpen(false)}
                                disabled={isIssuingInvoice}
                            >
                                Cancel
                            </Button>
                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={handleIssueInvoice}
                                disabled={isIssuingInvoice}
                                className="gap-1.5 font-semibold"
                            >
                                {isIssuingInvoice && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                Generate & Record Invoice
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Receipt Slip Modal */}
            {isReceiptOpen && selectedInvoice && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-card border border-border/80 rounded-xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in-95 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <div>
                                <h2 className="text-lg font-bold flex items-center gap-2">
                                    <Receipt className="h-5 w-5 text-primary" />
                                    {selectedInvoice.invoiceNumber}
                                </h2>
                                <p className="text-xs text-muted-foreground">Official Platform B2B Subscription Slip</p>
                            </div>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsReceiptOpen(false)}
                                className="h-7 w-7 p-0"
                            >
                                ✕
                            </Button>
                        </div>

                        <div className="space-y-3 text-xs bg-muted/20 p-4 rounded-lg border border-border/60">
                            <div className="flex justify-between py-1 border-b border-border/40">
                                <span className="text-muted-foreground">Date:</span>
                                <span className="font-semibold">{format(new Date(selectedInvoice.date), "PPP")}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/40">
                                <span className="text-muted-foreground">Billed To:</span>
                                <span className="font-semibold">{selectedInvoice.tenantName}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/40">
                                <span className="text-muted-foreground">Plan Tier & Cycle:</span>
                                <span className="font-semibold">{selectedInvoice.plan} ({selectedInvoice.billingCycle})</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/40">
                                <span className="text-muted-foreground">Subtotal:</span>
                                <span>{selectedInvoice.currency} {Number(selectedInvoice.subtotal).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1 border-b border-border/40">
                                <span className="text-muted-foreground">Tax ({selectedInvoice.taxRate}%):</span>
                                <span>{selectedInvoice.currency} {Number(selectedInvoice.taxAmount).toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between py-1.5 font-bold text-sm text-foreground">
                                <span>Total Paid:</span>
                                <span className="text-primary">{selectedInvoice.currency} {Number(selectedInvoice.total).toFixed(2)}</span>
                            </div>
                        </div>

                        <div className="flex items-center justify-between pt-3 border-t">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setIsReceiptOpen(false)}
                            >
                                Close
                            </Button>
                            <Button 
                                type="button" 
                                size="sm" 
                                onClick={() => printReceipt(selectedInvoice)}
                                className="gap-1.5 font-semibold"
                            >
                                <Printer className="h-3.5 w-3.5" />
                                Print / Save PDF
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
