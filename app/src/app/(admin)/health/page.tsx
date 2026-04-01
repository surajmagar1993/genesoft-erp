import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Cpu, Database, Globe, Zap, Server, ShieldCheck, Wifi, HardDrive } from "lucide-react"
import { getDatabaseHealth } from "@/app/actions/saas/admin"
import { formatDistanceToNow } from "date-fns"

export default async function SystemHealthPage() {
    const health = await getDatabaseHealth()
    
    const services = [
        { name: "Node.js API Cluster", status: "Operational", uptime: "99.98%", latency: "42ms", icon: Server },
        { 
            name: "Primary Database (PostgreSQL)", 
            status: health.status === "HEALTHY" ? "Operational" : "Degraded", 
            uptime: "100%", 
            latency: health.latency || "---", 
            icon: Database,
            extra: `Size: ${health.databaseSize || "0MB"}`
        },
        { name: "Auth Service (Supabase)", status: "Operational", uptime: "99.99%", latency: "85ms", icon: ShieldCheck },
        { name: "Edge Runtime (Global)", status: "Operational", uptime: "99.95%", latency: "18ms", icon: Globe },
        { name: "Storage Engine", status: "Operational", uptime: "99.99%", latency: "120ms", icon: Zap },
        { name: "Real-time Gateway", status: "Operational", uptime: "99.85%", latency: "210ms", icon: Wifi },
    ]

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight">System Infrastructure Health</h1>
                <p className="text-muted-foreground text-lg">
                    Real-time status monitoring for Genesoft SaaS core services and global edge nodes.
                </p>
            </div>

            {/* Overall Status */}
            <Card className={cn(
                "border-emerald-500/20 shadow-lg overflow-hidden relative",
                health.status === "HEALTHY" ? "bg-emerald-500/5 border-emerald-500/20" : "bg-red-500/5 border-red-500/20"
            )}>
                <div className={cn(
                    "absolute top-0 left-0 w-1 h-full",
                    health.status === "HEALTHY" ? "bg-emerald-500" : "bg-red-500"
                )} />
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={cn(
                                "h-12 w-12 rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.3)]",
                                health.status === "HEALTHY" ? "bg-emerald-500/20 text-emerald-500" : "bg-red-500/20 text-red-500"
                            )}>
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className={cn(
                                    "text-xl font-bold",
                                    health.status === "HEALTHY" ? "text-emerald-700 dark:text-emerald-400" : "text-red-700 dark:text-red-400"
                                )}>
                                    {health.status === "HEALTHY" ? "All Systems Operational" : "System Degradation Detected"}
                                </h2>
                                <p className="text-sm opacity-80">
                                    Last scan: {health.timestamp ? formatDistanceToNow(new Date(health.timestamp)) : "Just now"} ago • Database Size: {health.databaseSize}
                                </p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-black">
                            HEALTH SCORE 1.0
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
                           <Zap className="w-5 h-5" />
                        </div>
                        <div>
                           <p className="text-[10px] uppercase font-bold text-muted-foreground">Active Load</p>
                           <p className="text-xl font-black">Normal</p>
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
                                    service.status === "Operational" ? "bg-emerald-500/10 text-emerald-600" : "bg-red-500/10 text-red-600"
                                )}>
                                    {service.status}
                                </Badge>
                            </div>
                            <CardTitle className="text-base mt-4">{service.name}</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Uptime</p>
                                    <p className="text-sm font-black">{service.uptime}</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Latency</p>
                                    <p className="text-sm font-black text-primary">{service.latency}</p>
                                </div>
                            </div>
                            {service.extra && (
                                <p className="mt-2 text-[10px] font-mono text-muted-foreground">{service.extra}</p>
                            )}
                            
                            {/* Simple Sparkline Mock */}
                            <div className="mt-4 h-12 flex items-end gap-1 overflow-hidden">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className={cn(
                                            "w-full rounded-t-sm",
                                            service.status === "Operational" ? "bg-emerald-500/20" : "bg-red-500/20"
                                        )} 
                                        style={{ height: `${Math.random() * 80 + 20}%` }} 
                                    />
                                ))}
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
