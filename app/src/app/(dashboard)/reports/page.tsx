import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    AlertTriangle,
    Banknote,
    FilePlus2,
    FileSpreadsheet,
    HandCoins,
    LayoutDashboard,
    Receipt,
    Target,
    UserPlus,
    Users,
    Package,
    type LucideIcon,
} from "lucide-react"
import { getDashboardStats, getRecentActivities, getDashboardTrends } from "@/app/actions/reports/stats"
import { getTenantSettings } from "@/app/actions/settings/tenant"
import { hasModuleAccess } from "@/lib/get-tenant-id"
import { PageHeader } from "@/components/ui/page-header"
import { RevenueChart, LeadsChart } from "@/components/dashboard/charts"
import { formatCurrency, getCurrencySymbol } from "@/lib/utils"
import { LocalDateTime } from "@/components/local-date-time"
import { PARKED_MODULES_ENABLED } from "@/lib/features"

interface Stat {
    title: string
    value: string
    detail: string
    icon: LucideIcon
    href: string
    tone?: "warning"
}

export default async function DashboardPage() {
    const [stats, activities, settings, trends, canInventory] = await Promise.all([
        getDashboardStats(),
        getRecentActivities(),
        getTenantSettings(),
        getDashboardTrends(),
        hasModuleAccess("inventory", "VIEW"),
    ])
    const money = (n: number) => (stats.currencyCode ? formatCurrency(n, stats.currencyCode) : n.toLocaleString("en-GB"))
    const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`

    const cards: Stat[] = [
        ...(stats.showMoney
            ? [
                  { title: "Sales this month", value: money(stats.salesThisMonth), detail: plural(stats.invoicesThisMonth, "invoice") + " issued", icon: Receipt, href: "/sales/invoices" },
                  { title: "To collect", value: money(stats.toCollect), detail: plural(stats.openInvoices, "unpaid invoice"), icon: HandCoins, href: "/finance/receivable" },
                  {
                      title: "Overdue",
                      value: money(stats.overdueAmount),
                      detail: stats.overdueInvoices ? `${plural(stats.overdueInvoices, "invoice")} past due` : "Nothing past its due date",
                      icon: AlertTriangle,
                      href: "/finance/receivable",
                      tone: stats.overdueInvoices ? ("warning" as const) : undefined,
                  },
                  { title: "Received this month", value: money(stats.receivedThisMonth), detail: "Payments from customers", icon: Banknote, href: "/finance/payments" },
              ]
            : []),
        ...(stats.showCrm
            ? [
                  { title: "New leads this month", value: String(stats.newLeadsThisMonth), detail: "Added to the CRM", icon: UserPlus, href: "/crm/leads" },
                  { title: "Open deals", value: String(stats.openDeals), detail: `${money(stats.pipelineValue)} in the pipeline`, icon: Target, href: "/crm/deals" },
              ]
            : []),
    ]

    const hasSales = trends.some((m) => m.sales > 0)
    const hasLeads = trends.some((m) => m.leads > 0)

    const quickLinks = [
        ...(stats.showMoney ? [{ label: "New invoice", icon: FilePlus2, href: "/sales/invoices/new" }] : []),
        ...(stats.showCrm ? [{ label: "New contact", icon: Users, href: "/crm/contacts/new" }, { label: "Leads", icon: UserPlus, href: "/crm/leads" }] : []),
        ...(stats.showMoney ? [{ label: "Customers who owe", icon: HandCoins, href: "/finance/receivable" }] : []),
        ...(canInventory ? [{ label: "Stock levels", icon: Package, href: "/inventory" }] : []),
        ...(PARKED_MODULES_ENABLED ? [{ label: "Report builder", icon: FileSpreadsheet, href: "/reports/builder" }] : []),
    ]

    return (
        <div className="space-y-8">
            <PageHeader title="Dashboard" description={settings?.name ? `How ${settings.name} is doing` : "How your business is doing"} icon={LayoutDashboard} />

            {cards.length > 0 ? (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {cards.map((stat) => (
                        <Link key={stat.title} href={stat.href} className="group rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                            <Card className={`h-full shadow-sm transition-colors group-hover:border-primary/50 ${stat.tone === "warning" ? "border-amber-500/50" : ""}`}>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                                    <stat.icon className={`h-4 w-4 ${stat.tone === "warning" ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"}`} aria-hidden="true" />
                                </CardHeader>
                                <CardContent>
                                    <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
                                    <p className="text-xs text-muted-foreground mt-1">{stat.detail}</p>
                                </CardContent>
                            </Card>
                        </Link>
                    ))}
                </div>
            ) : (
                <Card>
                    <CardContent className="py-8 text-sm text-muted-foreground">
                        Your access doesn&apos;t include sales, finance or CRM figures. Use the menu to open the parts of the workspace you work in.
                    </CardContent>
                </Card>
            )}

            {(stats.showMoney || stats.showCrm) && (
                <div className="grid gap-6 lg:grid-cols-2">
                    {stats.showMoney &&
                        (hasSales ? (
                            <RevenueChart data={trends} currencySymbol={stats.currencyCode ? getCurrencySymbol(stats.currencyCode) : ""} />
                        ) : (
                            <EmptyChart title="Sales" text="Issued invoices will show here month by month." href="/sales/invoices/new" action="Create an invoice" />
                        ))}
                    {stats.showCrm &&
                        (hasLeads ? (
                            <LeadsChart data={trends} />
                        ) : (
                            <EmptyChart title="New leads" text="Leads you add will show here month by month." href="/crm/leads" action="Add a lead" />
                        ))}
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-2">
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Recent activity</CardTitle>
                        <CardDescription>Latest invoices, payments and leads</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {activities.length > 0 ? (
                            <ul className="space-y-4">
                                {activities.map((activity, i) => (
                                    <li key={`${activity.href}-${i}`} className="flex items-start gap-3">
                                        <span
                                            aria-hidden="true"
                                            className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${activity.type === "lead" ? "bg-amber-500" : activity.type === "payment" ? "bg-emerald-500" : "bg-primary"}`}
                                        />
                                        <div className="min-w-0">
                                            <Link href={activity.href} className="text-sm font-medium hover:underline break-words">
                                                {activity.message}
                                            </Link>
                                            <p className="text-xs text-muted-foreground mt-0.5">
                                                <LocalDateTime value={activity.at} />
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="py-6 text-sm text-muted-foreground">Nothing yet. New invoices, payments and leads will show here.</p>
                        )}
                    </CardContent>
                </Card>

                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg">Quick links</CardTitle>
                        <CardDescription>Things people open most</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {quickLinks.map((action) => (
                                <Link
                                    key={action.label}
                                    href={action.href}
                                    className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent hover:border-primary/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                >
                                    <action.icon className="h-5 w-5 text-primary shrink-0" aria-hidden="true" />
                                    <span className="text-sm font-medium">{action.label}</span>
                                </Link>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function EmptyChart({ title, text, href, action }: { title: string; text: string; href: string; action: string }) {
    return (
        <Card className="shadow-sm">
            <CardHeader>
                <CardTitle className="text-lg">{title}</CardTitle>
                <CardDescription>Last 6 months</CardDescription>
            </CardHeader>
            <CardContent className="flex min-h-[200px] flex-col items-center justify-center gap-3 text-center">
                <p className="text-sm text-muted-foreground">{text}</p>
                <Link href={href} className="text-sm font-medium text-primary hover:underline">
                    {action}
                </Link>
            </CardContent>
        </Card>
    )
}
