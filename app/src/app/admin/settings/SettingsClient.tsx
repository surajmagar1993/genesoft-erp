"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { 
    Settings, 
    Megaphone, 
    AlertTriangle, 
    UserPlus, 
    ShieldCheck, 
    Save, 
    Loader2, 
    CheckCircle2, 
    Globe, 
    Mail, 
    Database, 
    Radio
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { updateGlobalSettings } from "@/app/actions/saas/admin"
import { format } from "date-fns"

interface SettingsClientProps {
    initialSettings: {
        id: string
        maintenanceMode: boolean
        allowSignups: boolean
        bannerMessage: string | null
        updatedAt: Date | string
    }
}

export function SettingsClient({ initialSettings }: SettingsClientProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [maintenanceMode, setMaintenanceMode] = useState(initialSettings.maintenanceMode)
    const [allowSignups, setAllowSignups] = useState(initialSettings.allowSignups)
    const [bannerMessage, setBannerMessage] = useState(initialSettings.bannerMessage || "")

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault()
        try {
            setIsLoading(true)
            await updateGlobalSettings({
                maintenanceMode,
                allowSignups,
                bannerMessage: bannerMessage.trim() ? bannerMessage.trim() : null
            })
            toast.success("System settings and broadcast message updated successfully")
            router.refresh()
        } catch (error: any) {
            console.error("Failed to save global settings:", error)
            toast.error(error?.message || "Failed to update system settings")
        } finally {
            setIsLoading(false)
        }
    }

    const clearBanner = () => {
        setBannerMessage("")
    }

    return (
        <div className="space-y-6 max-w-5xl mx-auto px-4 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Platform System Settings</h1>
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5">
                            Global Config
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Broadcast announcement banners, configure global registration gates, and emergency platform controls.
                    </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Last updated:</span>
                    <span className="font-semibold text-foreground">
                        {format(new Date(initialSettings.updatedAt), "MMM d, yyyy (HH:mm)")}
                    </span>
                </div>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
                {/* 1. Global Announcement & Broadcast Engine */}
                <Card className="border-primary/10 shadow-md bg-card/60 backdrop-blur overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b pb-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Megaphone className="h-4 w-4 text-primary" />
                                <CardTitle className="text-base">System-wide Announcement Broadcast</CardTitle>
                            </div>
                            {bannerMessage.trim() ? (
                                <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] uppercase font-bold flex items-center gap-1">
                                    <Radio className="h-3 w-3 animate-pulse" />
                                    Broadcast Live
                                </Badge>
                            ) : (
                                <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                    No Broadcast Active
                                </Badge>
                            )}
                        </div>
                        <CardDescription>
                            Displays an urgent notification banner across all active tenant dashboards immediately.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="bannerMessage" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                Broadcast Message
                            </Label>
                            <Textarea
                                id="bannerMessage"
                                rows={3}
                                value={bannerMessage}
                                onChange={e => setBannerMessage(e.target.value)}
                                placeholder="E.g., 📢 Scheduled Maintenance: The platform will undergo a brief database optimization tonight at 02:00 UTC."
                                className="font-medium text-sm bg-background"
                            />
                        </div>

                        {/* Live Preview of Banner */}
                        {bannerMessage.trim() && (
                            <div className="space-y-1.5 pt-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Live Preview (as seen by tenants)
                                </span>
                                <div className="p-3.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-300 flex items-center justify-between text-xs font-semibold shadow-sm">
                                    <div className="flex items-center gap-2">
                                        <Megaphone className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0" />
                                        <span>{bannerMessage}</span>
                                    </div>
                                    <span className="text-[10px] uppercase opacity-70">Global Notice</span>
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-2">
                            {bannerMessage.trim() && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={clearBanner}
                                    className="text-xs text-muted-foreground"
                                >
                                    Clear Banner
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Platform Access Gates & Emergency Controls */}
                <Card className="border-primary/10 shadow-md bg-card/60 backdrop-blur overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Platform Governance & Registration Gates</CardTitle>
                        </div>
                        <CardDescription>
                            Control tenant onboarding and platform-wide emergency maintenance mode.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-5">
                        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/20">
                            <div className="space-y-0.5 pr-4">
                                <div className="flex items-center gap-2">
                                    <UserPlus className="h-4 w-4 text-primary" />
                                    <Label className="text-sm font-bold">Allow Public Self-Serve Signups</Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    When enabled, new organizations can register on <code>/register</code>. If disabled, new tenant registration is locked to Super Admin invitation only.
                                </p>
                            </div>
                            <Switch
                                checked={allowSignups}
                                onCheckedChange={setAllowSignups}
                            />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-destructive/20 bg-destructive/5">
                            <div className="space-y-0.5 pr-4">
                                <div className="flex items-center gap-2">
                                    <AlertTriangle className="h-4 w-4 text-destructive" />
                                    <Label className="text-sm font-bold text-destructive">Platform Maintenance Lockdown</Label>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Activate during critical database migrations. Restricts write operations and alerts tenants that system maintenance is currently in progress.
                                </p>
                            </div>
                            <Switch
                                checked={maintenanceMode}
                                onCheckedChange={setMaintenanceMode}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* 3. Core SaaS Environment Topology */}
                <Card className="border-primary/10 shadow-md bg-card/60 backdrop-blur overflow-hidden">
                    <CardHeader className="bg-muted/20 border-b pb-4">
                        <div className="flex items-center gap-2">
                            <Globe className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">System Infrastructure Telemetry</CardTitle>
                        </div>
                        <CardDescription>
                            Master backend services, database pooling, and integrated third-party transports.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-muted-foreground">Database Pooler</span>
                                    <Database className="h-3.5 w-3.5 text-emerald-500" />
                                </div>
                                <div className="font-bold text-foreground">PostgreSQL (Supabase)</div>
                                <div className="text-[10px] text-emerald-600 font-semibold">Active & Pooling Connected</div>
                            </div>

                            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-muted-foreground">Outbound Mail Engine</span>
                                    <Mail className="h-3.5 w-3.5 text-blue-500" />
                                </div>
                                <div className="font-bold text-foreground">Resend API Gateway</div>
                                <div className="text-[10px] text-blue-600 font-semibold">Transactional v2.0</div>
                            </div>

                            <div className="p-3.5 rounded-lg border bg-muted/20 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="font-semibold text-muted-foreground">Payment Gateways</span>
                                    <ShieldCheck className="h-3.5 w-3.5 text-purple-500" />
                                </div>
                                <div className="font-bold text-foreground">Stripe & Razorpay</div>
                                <div className="text-[10px] text-purple-600 font-semibold">Dual-Gateway Active</div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Submit button */}
                <div className="flex items-center justify-end pt-2">
                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="gap-2 font-bold shadow-md min-w-[180px]"
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Platform Settings
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
