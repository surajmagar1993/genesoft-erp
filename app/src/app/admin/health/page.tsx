import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Database, ShieldCheck, HardDrive, Mail, CreditCard, KeyRound, Users } from "lucide-react"
import { getDatabaseHealth, getServiceHealth } from "@/app/actions/saas/admin"
import { formatDistanceToNow } from "date-fns"

export default async function SystemHealthPage() {
    const [health, externalServices] = await Promise.all([getDatabaseHealth(), getServiceHealth()])

    const icons: Record<string, any> = {
        "Auth (Supabase)": ShieldCheck,
        "Email (Resend)": Mail,
        "Payments (Razorpay)": CreditCard,
        "Payments (Stripe)": CreditCard,
        "Webhooks & Cron secrets": KeyRound,
    }
    const services = [
        {
            name: "Database (PostgreSQL)",
            status: health.status === "HEALTHY" ? "Operational" : "Down",
            latency: health.latency || "—",
            detail: health.status === "HEALTHY" ? `Size: ${health.databaseSize}` : (health as any).error || "Unreachable",
            icon: Database,
        },
        ...externalServices.map((svc) => ({
            name: svc.name,
            status: svc.status,
            latency: svc.latencyMs !== null ? `${svc.latencyMs}ms` : "—",
            detail: svc.detail,
            icon: icons[svc.name] || Activity,
        })),
    ]
    const down = services.filter((svc) => svc.status === "Down")
    const allOk = down.length === 0

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">System Infrastructure Health</h1>
                <p className="text-muted-foreground text-lg">
                    Live checks of the database and the services Genesoft depends on, run when this page loads.
                </p>
            </div>

            {/* Overall Status */}
            <Card className={cn(
                "border-emerald-500/20 shadow-lg overflow-hidden relative",
                allOk ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
            )}>
                <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    allOk ? "bg-emerald-500" : "bg-red-500"
                )} />
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-12 w-12 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]",
                                allOk ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                            )}>
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className={cn(
                                    "text-xl font-bold",
                                    allOk ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                                )}>
                                    {allOk ? "All Checked Services Operational" : `${down.length} Service${down.length === 1 ? "" : "s"} Down: ${down.map((svc) => svc.name).join(", ")}`}
                                </h2>
                                <p className="text-sm opacity-80">
                                    Checked {health.timestamp ? formatDistanceToNow(new Date(health.timestamp)) : "just now"} ago • Database size: {health.databaseSize ?? "unknown"}
                                </p>
                            </div>
                        </div>
                        <Badge variant="outline" className="font-black">
                            {services.filter((svc) => svc.status === "Operational").length} / {services.filter((svc) => svc.status !== "Not configured").length} OK
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card className="bg-card/40 backdrop-blur border-primary/5">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-500">
                           <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Tenants</p>
                           <p className="text-xl font-black">{health.metrics?.tenants || 0}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur border-primary/5">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500">
                           <Activity className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-muted-foreground">DB Latency</p>
                           <p className="text-xl font-black">{health.latency}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur border-primary/5">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                           <HardDrive className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-muted-foreground">DB Storage</p>
                           <p className="text-xl font-black">{health.databaseSize}</p>
                        </div>
                    </CardContent>
                </Card>
                <Card className="bg-card/40 backdrop-blur border-primary/5">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                           <Users className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-muted-foreground">Total Users</p>
                           <p className="text-xl font-black">{health.metrics?.users || 0}</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Service Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                    <Card key={service.name} className="border-primary/10 bg-card/50 backdrop-blur hover:shadow-xl transition-all group overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <service.icon className="h-4 w-4" />
                                </div>
                                <Badge variant="secondary" className={cn(
                                    "border-none text-[10px] h-5",
                                    service.status === "Operational" ? "bg-emerald-500/10 text-emerald-600"
                                        : service.status === "Down" ? "bg-red-500/10 text-red-600"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    {service.status}
                                </Badge>
                            </div>
                            <CardTitle className="text-base mt-4">{service.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end justify-between gap-4">
                                <p className="text-xs text-muted-foreground">{service.detail}</p>
                                <div className="space-y-1 text-right shrink-0">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Response</p>
                                    <p className="text-sm font-black text-primary">{service.latency}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

function Building2(props: any) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
            <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
            <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
            <path d="M10 6h4" />
            <path d="M10 10h4" />
            <path d="M10 14h4" />
            <path d="M10 18h4" />
        </svg>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
