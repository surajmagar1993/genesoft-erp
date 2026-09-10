"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
    Shield, 
    ShieldAlert, 
    ShieldCheck, 
    Lock, 
    KeyRound, 
    Globe, 
    AlertTriangle, 
    CheckCircle2, 
    Clock, 
    Ban, 
    Plus, 
    Trash2, 
    Loader2, 
    Save, 
    Activity, 
    User, 
    Server
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
    updateSecurityPolicy, 
    addBlockedIp, 
    removeBlockedIp, 
    type SecuritySettings 
} from "@/app/actions/saas/admin"

interface SecurityDashboardClientProps {
    data: {
        settings: SecuritySettings
        securityEvents: any[]
        metrics: {
            blockedIpsCount: number
            suspendedTenantsCount: number
            totalTenantsCount: number
            totalUsersCount: number
            enforce2FA: boolean
            rateLimitPerMin: number
            sessionTimeoutMinutes: number
        }
    }
}

export function SecurityDashboardClient({ data }: SecurityDashboardClientProps) {
    const router = useRouter()
    const [activeTab, setActiveTab] = useState<"access" | "firewall" | "ratelimit" | "logs">("access")
    const [isLoading, setIsLoading] = useState(false)
    const [isAddIpOpen, setIsAddIpOpen] = useState(false)

    // Form states
    const [policyForm, setPolicyForm] = useState({
        enforce2FA: data.settings.enforce2FA,
        rateLimitPerMin: data.settings.rateLimitPerMin,
        authLockoutAttempts: data.settings.authLockoutAttempts,
        sessionTimeoutMinutes: data.settings.sessionTimeoutMinutes,
        allowSignups: data.settings.allowSignups,
        maintenanceMode: data.settings.maintenanceMode
    })

    const [ipForm, setIpForm] = useState({
        ip: "",
        reason: ""
    })

    const handleSavePolicy = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            await updateSecurityPolicy(policyForm)
            toast.success("Security policies updated successfully")
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error?.message || "Failed to update security policy")
        } finally {
            setIsLoading(false)
        }
    }

    const handleAddBlockedIp = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!ipForm.ip.trim()) {
            toast.error("IP address is required")
            return
        }

        try {
            setIsLoading(true)
            await addBlockedIp(ipForm.ip, ipForm.reason)
            toast.success(`IP ${ipForm.ip} added to firewall blocklist`)
            setIpForm({ ip: "", reason: "" })
            setIsAddIpOpen(false)
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error?.message || "Failed to block IP")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRemoveBlockedIp = async (ip: string) => {
        try {
            setIsLoading(true)
            await removeBlockedIp(ip)
            toast.success(`IP ${ip} removed from blocklist`)
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error?.message || "Failed to unblock IP")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto px-4 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Platform Security & Governance</h1>
                        <Badge variant="outline" className="text-[10px] font-bold border-emerald-500/20 bg-emerald-500/10 text-emerald-600 gap-1">
                            <ShieldCheck className="h-3 w-3" />
                            Shield Active
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Global firewall rules, 2FA enforcement, API rate limiting, and threat protection.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    {policyForm.maintenanceMode && (
                        <Badge variant="destructive" className="animate-pulse gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            Maintenance Lockdown
                        </Badge>
                    )}
                </div>
            </div>

            {/* KPI Metrics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">2FA Policy</div>
                            <div className="text-xl font-bold mt-1 text-foreground flex items-center gap-2">
                                {data.settings.enforce2FA ? "Enforced" : "Optional"}
                            </div>
                            <span className="text-[10px] text-muted-foreground">Admin Accounts</span>
                        </div>
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${data.settings.enforce2FA ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}`}>
                            <KeyRound className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Rate Limit</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {data.settings.rateLimitPerMin}
                            </div>
                            <span className="text-[10px] text-muted-foreground">Requests / minute</span>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center">
                            <Server className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Firewall Blocklist</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {data.settings.blockedIps.length}
                            </div>
                            <span className="text-[10px] text-muted-foreground">Blocked IPs</span>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-rose-500/10 text-rose-600 flex items-center justify-center">
                            <Ban className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Session Guard</div>
                            <div className="text-xl font-bold mt-1 text-foreground">
                                {data.settings.sessionTimeoutMinutes}m
                            </div>
                            <span className="text-[10px] text-muted-foreground">Auto-lockout window</span>
                        </div>
                        <div className="h-10 w-10 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center">
                            <Clock className="h-5 w-5" />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Navigation Tabs */}
            <div className="flex items-center gap-2 border-b">
                <button
                    onClick={() => setActiveTab("access")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "access"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Access Control & 2FA
                </button>
                <button
                    onClick={() => setActiveTab("firewall")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "firewall"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    IP Firewall ({data.settings.blockedIps.length})
                </button>
                <button
                    onClick={() => setActiveTab("ratelimit")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "ratelimit"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Rate Limiting & Quotas
                </button>
                <button
                    onClick={() => setActiveTab("logs")}
                    className={`pb-3 px-3 text-sm font-semibold border-b-2 transition-colors ${
                        activeTab === "logs"
                            ? "border-primary text-primary"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                >
                    Security Audit Trail ({data.securityEvents.length})
                </button>
            </div>

            {/* Tab 1: Access Control & Policies */}
            {activeTab === "access" && (
                <form onSubmit={handleSavePolicy} className="space-y-6">
                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                        <CardHeader className="bg-muted/20 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Shield className="h-4 w-4 text-primary" />
                                Authentication & Session Security
                            </CardTitle>
                            <CardDescription>
                                Enforce multi-factor authentication and session lifetime policies across all tenant administrators.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">Enforce Two-Factor Authentication (2FA)</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Mandate TOTP authenticator verification on login for all Super Admin and Tenant Admin accounts.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={policyForm.enforce2FA}
                                    onChange={e => setPolicyForm(prev => ({ ...prev, enforce2FA: e.target.checked }))}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                    <Label htmlFor="sessionTimeout" className="text-sm font-medium">
                                        Session Inactivity Auto-Lockout
                                    </Label>
                                    <select
                                        id="sessionTimeout"
                                        value={policyForm.sessionTimeoutMinutes}
                                        onChange={e => setPolicyForm(prev => ({ ...prev, sessionTimeoutMinutes: parseInt(e.target.value) || 30 }))}
                                        className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm"
                                    >
                                        <option value={15}>15 Minutes</option>
                                        <option value={30}>30 Minutes (Recommended)</option>
                                        <option value={60}>1 Hour</option>
                                        <option value={120}>2 Hours</option>
                                    </select>
                                    <p className="text-[11px] text-muted-foreground">
                                        Forces re-authentication when a session is idle.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="lockoutAttempts" className="text-sm font-medium">
                                        Brute Force Threshold (Failed Attempts)
                                    </Label>
                                    <Input
                                        id="lockoutAttempts"
                                        type="number"
                                        min={3}
                                        max={20}
                                        value={policyForm.authLockoutAttempts}
                                        onChange={e => setPolicyForm(prev => ({ ...prev, authLockoutAttempts: parseInt(e.target.value) || 5 }))}
                                        className="bg-background"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Temporarily lock access after consecutive failed login attempts.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                        <CardHeader className="bg-muted/20 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Emergency & Platform Governance Gates
                            </CardTitle>
                            <CardDescription>
                                Global kill-switches and registration controls.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="flex items-center justify-between p-3.5 rounded-lg border bg-muted/20">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold">Allow New Tenant Registrations</Label>
                                    <p className="text-xs text-muted-foreground">
                                        When disabled, new organization self-serve signups on `/register` are temporarily paused.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={policyForm.allowSignups}
                                    onChange={e => setPolicyForm(prev => ({ ...prev, allowSignups: e.target.checked }))}
                                    className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                                />
                            </div>

                            <div className="flex items-center justify-between p-3.5 rounded-lg border border-destructive/20 bg-destructive/5">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold text-destructive">Platform Maintenance Lockdown</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Displays maintenance alert banners and restricts tenant data modifications during maintenance windows.
                                    </p>
                                </div>
                                <input
                                    type="checkbox"
                                    checked={policyForm.maintenanceMode}
                                    onChange={e => setPolicyForm(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                                    className="h-5 w-5 rounded border-destructive text-destructive focus:ring-destructive cursor-pointer"
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading} className="gap-2 font-semibold">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Save Policy Changes
                        </Button>
                    </div>
                </form>
            )}

            {/* Tab 2: IP Firewall & Blocklist */}
            {activeTab === "firewall" && (
                <div className="space-y-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-base font-bold">Firewall Rules & Blocked IPs</h2>
                            <p className="text-xs text-muted-foreground">
                                Filtered incoming connections blocked by the SaaS gateway.
                            </p>
                        </div>
                        <Button 
                            onClick={() => setIsAddIpOpen(true)}
                            size="sm" 
                            className="gap-1.5 font-semibold"
                        >
                            <Plus className="h-3.5 w-3.5" />
                            Add Blocked IP
                        </Button>
                    </div>

                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur overflow-hidden">
                        <CardContent className="p-0">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>IP Address</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Blocked Date</TableHead>
                                        <TableHead className="text-right pr-6">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.settings.blockedIps.length > 0 ? (
                                        data.settings.blockedIps.map((item) => (
                                            <TableRow key={item.ip} className="hover:bg-muted/30">
                                                <TableCell className="font-mono font-bold text-sm text-foreground">
                                                    {item.ip}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground">
                                                    {item.reason}
                                                </TableCell>
                                                <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {format(new Date(item.blockedAt), "MMM d, yyyy (HH:mm)")}
                                                </TableCell>
                                                <TableCell className="text-right pr-6">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => handleRemoveBlockedIp(item.ip)}
                                                        disabled={isLoading}
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10 text-xs h-8"
                                                    >
                                                        <Trash2 className="h-3.5 w-3.5 mr-1" />
                                                        Unblock
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-8 text-sm text-muted-foreground">
                                                No IP addresses currently blocked on the firewall.
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* Tab 3: Rate Limiting & Gateway Quotas */}
            {activeTab === "ratelimit" && (
                <form onSubmit={handleSavePolicy} className="space-y-6">
                    <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                        <CardHeader className="bg-muted/20 border-b pb-3">
                            <CardTitle className="text-base flex items-center gap-2">
                                <Server className="h-4 w-4 text-primary" />
                                API Gateway Quotas & Ingestion Thresholds
                            </CardTitle>
                            <CardDescription>
                                Protect platform resources from noisy-neighbor tenants and DDOS attempts.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6 space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="rateLimit" className="text-sm font-medium">
                                        Tenant API Rate Limit (Requests / Minute)
                                    </Label>
                                    <Input
                                        id="rateLimit"
                                        type="number"
                                        min={30}
                                        max={1000}
                                        value={policyForm.rateLimitPerMin}
                                        onChange={e => setPolicyForm(prev => ({ ...prev, rateLimitPerMin: parseInt(e.target.value) || 120 }))}
                                        className="bg-background"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Standard default is 120 requests/min. Enterprise tenants receive 500+ via tier assignment.
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-sm font-medium">
                                        Webhook Replay Protection Window
                                    </Label>
                                    <Input
                                        disabled
                                        value="300 Seconds (5 Minutes)"
                                        className="bg-muted/50 text-muted-foreground font-mono text-xs"
                                    />
                                    <p className="text-[11px] text-muted-foreground">
                                        Enforced via Razorpay & Stripe signature timestamp validation.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading} className="gap-2 font-semibold">
                            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                            Update Gateway Limits
                        </Button>
                    </div>
                </form>
            )}

            {/* Tab 4: Security Audit Trail */}
            {activeTab === "logs" && (
                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                            <Activity className="h-4 w-4 text-primary" />
                            Platform Security Event Ledger
                        </CardTitle>
                        <CardDescription>
                            Real-time stream of authorization changes, firewall modifications, and administrative suspensions.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Timestamp</TableHead>
                                    <TableHead>Event Type</TableHead>
                                    <TableHead>Admin</TableHead>
                                    <TableHead>Target Entity</TableHead>
                                    <TableHead className="text-right pr-6">Metadata</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {data.securityEvents && data.securityEvents.length > 0 ? (
                                    data.securityEvents.map((evt: any) => (
                                        <TableRow key={evt.id} className="hover:bg-muted/30">
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                                {format(new Date(evt.createdAt), "MMM d, yyyy (HH:mm)")}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                                    {evt.action}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono">
                                                {evt.adminEmail}
                                            </TableCell>
                                            <TableCell className="text-xs">
                                                {evt.targetType}: <span className="font-mono">{evt.targetId || "SYSTEM"}</span>
                                            </TableCell>
                                            <TableCell className="text-xs font-mono text-right pr-6 text-muted-foreground max-w-xs truncate">
                                                {JSON.stringify(evt.metadata)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center py-8 text-sm text-muted-foreground">
                                            No security events logged in the selected window.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Modal for Adding Blocked IP */}
            {isAddIpOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
                    <div className="bg-card border border-primary/20 rounded-xl shadow-2xl max-w-md w-full p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-3">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Ban className="h-5 w-5 text-destructive" />
                                Add IP to Firewall Blocklist
                            </h2>
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setIsAddIpOpen(false)}
                                className="h-7 w-7 p-0"
                            >
                                ✕
                            </Button>
                        </div>

                        <form onSubmit={handleAddBlockedIp} className="space-y-4">
                            <div className="space-y-1.5">
                                <Label htmlFor="ipAddress" className="text-xs font-medium">
                                    IP Address or CIDR Subnet <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="ipAddress"
                                    required
                                    value={ipForm.ip}
                                    onChange={e => setIpForm(prev => ({ ...prev, ip: e.target.value }))}
                                    placeholder="Enter IPv4 or IPv6 address"
                                    className="bg-background text-sm font-mono"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label htmlFor="blockReason" className="text-xs font-medium">
                                    Reason for Restriction
                                </Label>
                                <Input
                                    id="blockReason"
                                    value={ipForm.reason}
                                    onChange={e => setIpForm(prev => ({ ...prev, reason: e.target.value }))}
                                    placeholder="Enter security incident description"
                                    className="bg-background text-sm"
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-3 border-t">
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => setIsAddIpOpen(false)}
                                    disabled={isLoading}
                                >
                                    Cancel
                                </Button>
                                <Button 
                                    type="submit" 
                                    variant="destructive"
                                    size="sm" 
                                    disabled={isLoading}
                                    className="gap-1.5 font-semibold"
                                >
                                    {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                                    Block Connection
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
