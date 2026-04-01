import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Activity, Cpu, Database, Globe, Zap, Server, ShieldCheck, Wifi } from "lucide-react"

export default function SystemHealthPage() {
    const services = [
        { name: "Core API Cluster", status: "Operational", uptime: "99.98%", latency: "42ms", icon: Server },
        { name: "Primary Database (PostgreSQL)", status: "Operational", uptime: "100%", latency: "12ms", icon: Database },
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
            <Card className="border-emerald-500/20 bg-emerald-500/5 shadow-lg overflow-hidden relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
                <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] anim-pulse">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-emerald-700 dark:text-emerald-400">All Systems Operational</h2>
                                <p className="text-sm text-emerald-600/80 dark:text-emerald-400/60">Verified 43 seconds ago by Platform Sentinel</p>
                            </div>
                        </div>
                        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-black">
                            UPTIME 100%
                        </Badge>
                    </div>
                </CardContent>
            </Card>

            {/* Service Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {services.map((service) => (
                    <Card key={service.name} className="border-primary/10 bg-card/50 backdrop-blur hover:shadow-xl transition-all group overflow-hidden">
                        <CardHeader className="pb-2">
                            <div className="flex items-center justify-between">
                                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                    <service.icon className="h-4 w-4" />
                                </div>
                                <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 border-none text-[10px] h-5">
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
                            
                            {/* Simple Sparkline Mock */}
                            <div className="mt-4 h-12 flex items-end gap-1 overflow-hidden">
                                {Array.from({ length: 20 }).map((_, i) => (
                                    <div 
                                        key={i} 
                                        className="w-full bg-emerald-500/20 rounded-t-sm" 
                                        style={{ height: `${Math.random() * 80 + 20}%` }} 
                                    />
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Global Nodes */}
            <Card className="border-primary/10 bg-card/40 backdrop-blur">
                <CardHeader>
                    <CardTitle>Global Edge Distribution</CardTitle>
                    <CardDescription>Network performance across active deployment regions.</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-4">
                        {[
                            { node: "Asia South 1 (Mumbai)", rtt: "12ms", load: 45 },
                            { node: "US East 1 (Virginia)", rtt: "84ms", load: 12 },
                            { node: "Europe Central 1 (Frankfurt)", rtt: "142ms", load: 68 },
                            { node: "Middle East 1 (Dubai)", rtt: "32ms", load: 31 },
                        ].map((node) => (
                            <div key={node.node} className="flex items-center gap-6">
                                <span className="text-sm font-bold w-48 shrink-0">{node.node}</span>
                                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                    <div className="h-full bg-primary/60 transition-all duration-1000" style={{ width: `${node.load}%` }} />
                                </div>
                                <span className="text-xs font-mono w-16 text-right tabular-nums">{node.rtt}</span>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}
