import { getPlatformStats, getRecentSystemLogs, getDashboardCharts, getDatabaseHealth } from "@/app/actions/saas/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, CreditCard, MessageSquare, AlertCircle, ArrowUpRight, ArrowDownRight, Activity, Zap, Shield, Database, Settings, Receipt, Globe } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { DashboardCharts } from "./DashboardCharts"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function AdminDashboardPage() {
    const stats = await getPlatformStats()
    const logs = await getRecentSystemLogs()
    const charts = await getDashboardCharts()
    const health = await getDatabaseHealth()

    const cards = [
        {
            title: "Total Tenants",
            value: stats.totalTenants,
            description: "Total registered businesses",
            icon: Building2
        },
        {
            title: "Active Users",
            value: stats.totalUsers,
            description: "Total across all tenants",
            icon: Users
        },
        {
            title: "Estimated Revenue",
            value: `₹${stats.revenueEst.toLocaleString()}`,
            description: "Monthly recurring revenue",
            icon: CreditCard
        },
        {
            title: "Open Support Tickets",
            value: stats.openTickets,
            description: "Awaiting response",
            icon: MessageSquare
        }
    ]

    const quickActions = [
        { title: "Manage Tenants", href: "/admin/tenants", icon: Building2, color: "text-blue-500" },
        { title: "Global Users", href: "/admin/users", icon: Users, color: "text-indigo-500" },
        { title: "Subscriptions", href: "/admin/subscriptions", icon: Receipt, color: "text-emerald-500" },
        { title: "Support Inbox", href: "/admin/support", icon: MessageSquare, color: "text-purple-500" },
        { title: "Global Regions", href: "/admin/regions", icon: Globe, color: "text-cyan-500" },
        { title: "System Settings", href: "/admin/settings", icon: Settings, color: "text-amber-500" },
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                         <Zap className="h-6 w-6 text-primary" />
                         <h1 className="text-4xl font-black tracking-tight text-foreground">SaaS Command Center</h1>
                    </div>
                    <p className="text-muted-foreground text-sm font-medium">Real-time intelligence and resource orchestration for Genesoft Platform.</p>
                </div>
                
                {/* Cluster Status Pill */}
                <div className="flex items-center gap-2 bg-card px-4 py-2 rounded-xl border border-primary/10 shadow-sm backdrop-blur">
                    <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                    </span>
                    <span className="text-xs font-bold text-muted-foreground tracking-wide uppercase">System {health.status}</span>
                </div>
            </div>

            {/* KPI Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <Card key={card.title} className="relative overflow-hidden border-primary/5 shadow-lg bg-card/40 backdrop-blur-sm group hover:border-primary/20 transition-all">
                        <div className="p-6">
                            <div className="flex items-center justify-between space-y-0 pb-2">
                                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{card.title}</span>
                                <div className="p-2 rounded-lg bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                                    <card.icon className="h-4 w-4" />
                                </div>
                            </div>
                            <div className="text-3xl font-black tracking-tight mt-2 text-foreground">{card.value}</div>
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 font-medium">
                                <span className="text-emerald-500 flex items-center font-bold">
                                    <ArrowUpRight className="h-3 w-3 mr-0.5" />
                                    +12%
                                </span>
                                {card.description}
                            </p>
                        </div>
                    </Card>
                ))}
            </div>

            {/* Visual Analytics */}
            <DashboardCharts growthData={charts.growthData} distributionData={charts.distributionData} />

            {/* Quick Actions Panel */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                {quickActions.map((action) => (
                    <Link key={action.title} href={action.href}>
                        <Card className="hover:bg-muted/50 transition-all cursor-pointer border-primary/5 shadow group overflow-hidden">
                            <CardContent className="p-4 flex flex-col items-center gap-2">
                                <div className={`p-2 rounded-lg bg-background shadow-inner transition-transform group-hover:scale-110 ${action.color}`}>
                                    <action.icon size={20} />
                                </div>
                                <span className="text-sm font-bold tracking-tight text-center">{action.title}</span>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Recent Tenants */}
                <Card className="lg:col-span-4 shadow-xl border-primary/5 bg-card/30 backdrop-blur-sm">
                    <CardHeader className="border-b bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">Recent Subscriptions</CardTitle>
                                <CardDescription>Latest businesses to join the platform.</CardDescription>
                            </div>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
                                Global Growth
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-primary/5">
                            {stats.recentTenants.length > 0 ? (
                                stats.recentTenants.map((tenant: any) => (
                                    <div key={tenant.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-primary text-sm shadow-sm">
                                            {tenant.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold truncate text-foreground">{tenant.name}</p>
                                            <p className="text-xs text-muted-foreground font-medium">Registered {formatDistanceToNow(tenant.createdAt)} ago</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <Badge variant={tenant.isTrial ? "secondary" : "default"} className="font-bold text-[10px] h-5">
                                                {tenant.plan}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-black">
                                                {tenant.isTrial ? "Trial" : "Paid"}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">No recent signups</div>
                            )}
                        </div>
                        <div className="p-4 border-t bg-muted/10 text-center">
                            <Button variant="ghost" size="sm" className="text-primary font-bold hover:bg-primary/5" asChild>
                                <Link href="/admin/tenants">View All Tenants</Link>
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* System Logs & Health */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Database Health Card */}
                    <Card className="shadow-xl border-primary/5 bg-gradient-to-br from-card/30 to-background backdrop-blur-sm">
                       <CardHeader className="pb-2">
                           <div className="flex items-center gap-2">
                               <Database className="h-4 w-4 text-primary" />
                               <CardTitle className="text-lg">Database Health</CardTitle>
                           </div>
                       </CardHeader>
                       <CardContent className="space-y-4">
                           <div className="flex items-center justify-between text-sm">
                               <span className="text-muted-foreground font-medium">Latency</span>
                               <span className="font-mono text-emerald-500 font-bold">{health.latency}</span>
                           </div>
                           <div className="flex items-center justify-between text-sm">
                               <span className="text-muted-foreground font-medium">Record Count</span>
                               <span className="font-mono font-bold">{((health.metrics?.tenants ?? 0) + (health.metrics?.users ?? 0) + (health.metrics?.logs ?? 0)).toLocaleString()}</span>
                           </div>
                           <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                               <div className="h-full bg-emerald-500 w-[95%] shadow-[0_0_8px_rgba(16,185,129,0.4)]" />
                           </div>
                       </CardContent>
                    </Card>

                    <Card className="shadow-xl border-primary/5 bg-card/30 backdrop-blur-sm">
                        <CardHeader className="border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-xl">Incident Monitor</CardTitle>
                                    <CardDescription>Recent system events.</CardDescription>
                                </div>
                                <Activity className="h-4 w-4 text-primary animate-pulse" />
                            </div>
                        </CardHeader>
                        <CardContent className="p-4">
                            <div className="space-y-4">
                                {logs.length > 0 ? (
                                    logs.map((log: any) => (
                                        <div key={log.id} className="flex gap-3 text-sm group">
                                            <div className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${
                                                log.level === 'ERROR' || log.level === 'FATAL' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 
                                                log.level === 'WARN' ? 'bg-amber-500' : 'bg-emerald-500'
                                            }`} />
                                            <div className="space-y-1">
                                                <p className="font-mono text-[11px] leading-tight text-foreground transition-all group-hover:underline">
                                                    {log.message}
                                                </p>
                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-bold uppercase tracking-wider">
                                                    <span>{log.tenant?.name || "System"}</span>
                                                    <span>•</span>
                                                    <span>{formatDistanceToNow(new Date(log.timestamp))} ago</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-12 flex flex-col items-center justify-center text-muted-foreground gap-3">
                                        <AlertCircle className="h-8 w-8 opacity-20" />
                                        <p className="text-sm font-medium">System status clear</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
