import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Users,
    DollarSign,
    Receipt,
    TrendingUp,
    ArrowUpRight,
    ArrowDownRight,
    Target,
    ShoppingCart,
} from "lucide-react"
import { getDashboardStats, getRecentActivities } from "@/app/actions/reports/stats"
import { getTenantSettings } from "@/app/actions/settings/tenant"

export default async function DashboardPage() {
    const [stats, activities, settings] = await Promise.all([
        getDashboardStats(),
        getRecentActivities(),
        getTenantSettings()
    ])

    const currencySymbol = settings?.currency_code === "INR" ? "₹" : "$"

    const statsConfig = [
        {
            title: "Total Contacts",
            value: stats.totalContacts.toString(),
            change: `+${stats.recentQuotesCount} this month`,
            trend: "up",
            icon: Users,
            description: "Active customers & leads",
        },
        {
            title: "Revenue (Accepted)",
            value: `${currencySymbol}${stats.acceptedQuoteTotal.toLocaleString()}`,
            change: "From accepted quotes",
            trend: "up",
            icon: DollarSign,
            description: "Accepted conversions",
        },
        {
            title: "New Leads",
            value: stats.totalLeads.toString(),
            change: "Active prospects",
            trend: "neutral",
            icon: Receipt,
            description: "Qualified opportunities",
        },
        {
            title: "Active Deals",
            value: stats.activeDeals.toString(),
            change: `${currencySymbol}${stats.pipelineValue.toLocaleString()} pipeline`,
            trend: "up",
            icon: Target,
            description: "Near-term opportunities",
        },
    ]

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Business Overview for {settings?.name || "Your Workspace"}
                    </p>
                </div>
                <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 text-primary rounded-full text-xs font-semibold">
                    <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Live Dashboard
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {statsConfig.map((stat) => (
                    <Card key={stat.title} className="relative overflow-hidden group hover:border-primary/50 transition-colors">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                                {stat.title}
                            </CardTitle>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                                <stat.icon className="h-4 w-4 text-primary" />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stat.value}</div>
                            <div className="flex items-center gap-1 mt-1">
                                {stat.trend === "up" && (
                                    <ArrowUpRight className="h-3 w-3 text-emerald-500" />
                                )}
                                {stat.trend === "down" && (
                                    <ArrowDownRight className="h-3 w-3 text-red-500" />
                                )}
                                <span className="text-xs text-muted-foreground">
                                    {stat.change}
                                </span>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{stat.description}</p>
                        </CardContent>
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 to-primary/5 opacity-50 group-hover:opacity-100 transition-opacity" />
                    </Card>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Activity */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent Activity</CardTitle>
                        <CardDescription>Real-time stream from Sales & CRM</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-6">
                            {activities.length > 0 ? (
                                activities.map((activity, i) => (
                                    <div key={i} className="flex items-start gap-3 group">
                                        <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${
                                            activity.type === "lead" ? "bg-amber-500" : "bg-primary"
                                        }`} />
                                        <div className="flex-1 min-w-0 border-l border-border/50 pl-3 group-last:border-transparent">
                                            <p className="text-sm font-medium leading-none">{activity.message}</p>
                                            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                                <TrendingUp className="h-2.5 w-2.5" />
                                                {activity.time}
                                            </p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="py-8 text-center text-muted-foreground space-y-2">
                                    <div className="h-10 w-10 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
                                        <TrendingUp className="h-5 w-5 opacity-20" />
                                    </div>
                                    <p className="text-sm">No recent activities found.</p>
                                    <p className="text-xs">Incoming sales actions will appear here.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card className="shadow-sm overflow-hidden border-primary/10">
                    <CardHeader className="bg-primary/5 border-b border-primary/10">
                        <CardTitle className="text-lg">Quick Access</CardTitle>
                        <CardDescription>MVP Shortcuts</CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6">
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "New Lead", icon: Users, href: "/crm/leads" },
                                { label: "New Quote", icon: Receipt, href: "/sales/quotes" },
                                { label: "Products", icon: ShoppingCart, href: "/sales/products" },
                                { label: "Active Deals", icon: Target, href: "/crm/deals" },
                            ].map((action) => (
                                <a
                                    key={action.label}
                                    href={action.href}
                                    className="flex items-center gap-3 p-4 rounded-xl border border-border/50 hover:bg-primary/5 hover:border-primary/20 transition-all group shadow-sm bg-card"
                                >
                                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <action.icon className="h-5 w-5 text-primary" />
                                    </div>
                                    <span className="text-sm font-semibold">{action.label}</span>
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
