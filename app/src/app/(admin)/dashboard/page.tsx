import { getPlatformStats, getRecentSystemLogs } from "@/app/actions/saas/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Building2, Users, CreditCard, MessageSquare, AlertCircle, ArrowUpRight, ArrowDownRight, Activity } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { Badge } from "@/components/ui/badge"

export default async function AdminDashboardPage() {
    const stats = await getPlatformStats()
    const logs = await getRecentSystemLogs()

    const cards = [
        {
            title: "Total Tenants",
            value: stats.totalTenants,
            description: "Total registered businesses",
            icon: Building2,
            trend: "+12.5%",
            trendUp: true
        },
        {
            title: "Active Users",
            value: stats.totalUsers,
            description: "Total across all tenants",
            icon: Users,
            trend: "+5.2%",
            trendUp: true
        },
        {
            title: "Estimated Revenue",
            value: `₹${stats.revenueEst.toLocaleString()}`,
            description: "Platform-wide monthly recurring revenue",
            icon: CreditCard,
            trend: "+24.8%",
            trendUp: true
        },
        {
            title: "Open Support Tickets",
            value: stats.openTickets,
            description: "Awaiting administrator response",
            icon: MessageSquare,
            trend: "-2.1%",
            trendUp: false
        }
    ]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-4xl font-bold tracking-tight text-foreground">Platform Overview</h1>
                <p className="text-muted-foreground text-lg">
                    Real-time metrics and system health monitoring for Genesoft SaaS.
                </p>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {cards.map((card) => (
                    <Card key={card.title} className="relative overflow-hidden border-primary/10 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] bg-card/50 backdrop-blur">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-semibold tracking-wide uppercase opacity-70">
                                {card.title}
                            </CardTitle>
                            <card.icon className="h-5 w-5 text-primary opacity-80" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-3xl font-black tracking-tight">{card.value}</div>
                            <div className="flex items-center gap-1 mt-1">
                                {card.trendUp ? (
                                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                ) : (
                                    <ArrowDownRight className="h-3 w-3 text-rose-500" />
                                )}
                                <span className={card.trendUp ? "text-emerald-500" : "text-rose-500"}>
                                    {card.trend}
                                </span>
                                <span className="text-[10px] text-muted-foreground ml-1">
                                    from last month
                                </span>
                            </div>
                        </CardContent>
                        {/* Decorative background element */}
                        <div className="absolute -right-4 -bottom-4 opacity-[0.03] rotate-12">
                            <card.icon size={120} />
                        </div>
                    </Card>
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
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                                Global Reach
                            </Badge>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y">
                            {stats.recentTenants.length > 0 ? (
                                stats.recentTenants.map((tenant: any) => (
                                    <div key={tenant.id} className="flex items-center gap-4 p-4 hover:bg-muted/30 transition-colors">
                                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center font-bold text-primary text-sm">
                                            {tenant.name.substring(0, 2).toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-semibold truncate text-foreground">{tenant.name}</p>
                                            <p className="text-xs text-muted-foreground">Registered {formatDistanceToNow(tenant.createdAt)} ago</p>
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-1">
                                            <Badge variant={tenant.isTrial ? "secondary" : "default"} className="font-bold text-[10px] h-5">
                                                {tenant.plan}
                                            </Badge>
                                            <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                                                {tenant.isTrial ? "Trial" : "Paid"}
                                            </span>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-8 text-center text-muted-foreground">No recent signups</div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* System Logs */}
                <Card className="lg:col-span-3 shadow-xl border-primary/5 bg-card/30 backdrop-blur-sm">
                    <CardHeader className="border-b bg-muted/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-xl">Health Monitor</CardTitle>
                                <CardDescription>Recent system events and errors.</CardDescription>
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
                                                <span>{formatDistanceToNow(log.timestamp)} ago</span>
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
    )
}
