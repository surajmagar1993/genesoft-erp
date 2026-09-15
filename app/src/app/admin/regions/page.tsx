import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, MapPin, Server, Activity, Users, Building2, CheckCircle2, ShieldCheck, Wifi } from "lucide-react"
import { getPlatformRegions } from "@/app/actions/saas/admin"

export const dynamic = "force-dynamic"

export default async function RegionsPage() {
    const data = await getPlatformRegions()

    return (
        <div className="space-y-8 max-w-7xl mx-auto pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Global SaaS Regions & Edge Telemetry</h1>
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5">
                            Multi-Region Mesh
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Jurisdiction routing, distributed edge nodes, and regional tenant cluster telemetry.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs py-1 px-2.5 font-bold flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                        Global Mesh Synchronized
                    </Badge>
                </div>
            </div>

            {/* Top Telemetry KPIs */}
            <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-500">
                            <Globe className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Regions Online</p>
                            <p className="text-2xl font-black">{data.totalRegions}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                            <Server className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Active Clusters</p>
                            <p className="text-2xl font-black">{data.activeClusters} Active</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-500">
                            <Building2 className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Hosted Tenants</p>
                            <p className="text-2xl font-black">{data.totalTenants} Organizations</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                    <CardContent className="p-4 flex items-center gap-4">
                        <div className="h-10 w-10 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-500">
                            <Activity className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Global Latency</p>
                            <p className="text-2xl font-black text-emerald-500">~24ms</p>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Regional Clusters Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {data.regions.map((region) => (
                    <Card key={region.id} className="relative overflow-hidden border-primary/10 shadow-md bg-card/60 backdrop-blur hover:border-primary/30 transition-all">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 to-primary" />
                        
                        <CardHeader className="bg-muted/20 border-b pb-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2.5">
                                    <span className="text-2xl">{region.flag}</span>
                                    <div>
                                        <CardTitle className="text-base font-bold">{region.name}</CardTitle>
                                        <CardDescription className="text-xs font-mono">Code: {region.code} • Currency: {region.currency}</CardDescription>
                                    </div>
                                </div>
                                <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                                    {region.status}
                                </Badge>
                            </div>
                        </CardHeader>

                        <CardContent className="pt-5 space-y-4 text-xs">
                            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-muted/40 border border-muted-foreground/10">
                                <div>
                                    <span className="text-muted-foreground font-medium block">Tenants Hosted</span>
                                    <span className="text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                                        <Building2 className="h-3.5 w-3.5 text-primary" />
                                        {region.tenantCount}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground font-medium block">Active Users</span>
                                    <span className="text-base font-bold text-foreground flex items-center gap-1.5 mt-0.5">
                                        <Users className="h-3.5 w-3.5 text-purple-500" />
                                        {region.userCount}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Server className="h-3.5 w-3.5 text-primary" />
                                        Primary Cluster
                                    </span>
                                    <span className="font-mono text-foreground font-semibold">{region.cluster}</span>
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                                        Statutory Tax Engine
                                    </span>
                                    <span className="text-foreground font-medium">{region.taxScheme}</span>
                                </div>

                                <div className="flex items-center justify-between text-muted-foreground">
                                    <span className="flex items-center gap-1.5">
                                        <Wifi className="h-3.5 w-3.5 text-blue-500" />
                                        Avg Edge Latency
                                    </span>
                                    <Badge variant="outline" className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-bold">
                                        {region.latency}
                                    </Badge>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}

