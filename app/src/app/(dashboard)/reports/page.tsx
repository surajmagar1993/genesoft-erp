import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
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

const stats = [
    {
        title: "Total Contacts",
        value: "0",
        change: "+0%",
        trend: "up",
        icon: Users,
        description: "Active customers & leads",
    },
    {
        title: "Revenue",
        value: "₹0",
        change: "+0%",
        trend: "up",
        icon: DollarSign,
        description: "This month",
    },
    {
        title: "Open Invoices",
        value: "0",
        change: "0 overdue",
        trend: "neutral",
        icon: Receipt,
        description: "Pending payments",
    },
    {
        title: "Active Deals",
        value: "0",
        change: "₹0 pipeline",
        trend: "up",
        icon: Target,
        description: "In progress",
    },
]

const recentActivities = [
    { type: "info", message: "Welcome to Genesoft ERP! Your workspace is ready.", time: "Just now" },
    { type: "tip", message: "Start by adding your first contacts and products.", time: "Getting started" },
    { type: "tip", message: "Configure your company settings and tax rules.", time: "Recommended" },
]

export default function DashboardPage() {
    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground mt-1">
                    Welcome to Genesoft ERP & CRM
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {stats.map((stat) => (
                    <Card key={stat.title} className="relative overflow-hidden">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium text-muted-foreground">
                                {stat.title}
                            </CardTitle>
                            <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
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
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/20 to-primary/5" />
                    </Card>
                ))}
            </div>

            {/* Content Grid */}
            <div className="grid gap-6 md:grid-cols-2">
                {/* Recent Activity */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Getting Started</CardTitle>
                        <CardDescription>Set up your workspace</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {recentActivities.map((activity, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <div className={`mt-1 h-2 w-2 rounded-full shrink-0 ${activity.type === "info" ? "bg-blue-500" : "bg-amber-500"
                                        }`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm">{activity.message}</p>
                                        <p className="text-xs text-muted-foreground mt-0.5">
                                            {activity.time}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Quick Actions */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Quick Actions</CardTitle>
                        <CardDescription>Common tasks</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { label: "New Contact", icon: Users, href: "/crm/contacts" },
                                { label: "New Invoice", icon: Receipt, href: "/sales/invoices" },
                                { label: "New Product", icon: ShoppingCart, href: "/sales/products" },
                                { label: "View Reports", icon: TrendingUp, href: "/reports" },
                            ].map((action) => (
                                <a
                                    key={action.label}
                                    href={action.href}
                                    className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-accent hover:border-accent transition-colors group"
                                >
                                    <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                                        <action.icon className="h-4 w-4 text-primary" />
                                    </div>
                                    <span className="text-sm font-medium">{action.label}</span>
                                </a>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
