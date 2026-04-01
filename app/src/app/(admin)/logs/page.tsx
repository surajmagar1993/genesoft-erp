import { getRecentSystemLogs } from "@/app/actions/saas/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Terminal, Database, ShieldAlert, Activity, Clock, Filter, AlertTriangle, AlertCircle, Building2, CheckCircle2 as CheckCircleIcon } from "lucide-react"
import { formatDistanceToNow, format } from "date-fns"

export default async function SystemLogsPage() {
    const logs = await getRecentSystemLogs()

    const getLevelVariant = (level: string) => {
        switch (level) {
            case "FATAL": return "destructive"
            case "ERROR": return "destructive"
            case "WARN": return "outline" // Amber handled via CSS
            case "INFO": return "secondary"
            default: return "outline"
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">System Telemetry</h1>
                    <p className="text-muted-foreground mt-1">
                        Real-time platform-wide infrastructure and application health logs.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex h-10 items-center justify-center rounded-lg border border-primary/10 bg-muted/20 px-4 text-xs font-bold uppercase tracking-widest gap-2">
                        <Activity className="h-3.5 w-3.5 text-emerald-500 animate-pulse" />
                        Live Feed Active
                    </div>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-4">
                {/* Stats */}
                <Card className="md:col-span-1 border-primary/10 shadow-lg bg-card/40 backdrop-blur">
                    <CardHeader className="bg-muted/30 border-b">
                        <CardTitle className="text-sm font-black uppercase tracking-wider opacity-60">
                            Health Status
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6 space-y-6">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold">Errors (24h)</span>
                                <Badge variant="destructive" className="h-5 text-[10px] font-black">
                                    {logs.filter((l: any) => l.level === 'ERROR' || l.level === 'FATAL').length} Critical
                                </Badge>
                            </div>
                            <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-rose-500 w-1/4" />
                            </div>
                        </div>

                        <Separator className="opacity-10" />

                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                                    <CheckCircleIcon className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold leading-none">Database</p>
                                    <p className="text-[10px] text-muted-foreground">Connected & Healthy</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <div className="h-8 w-8 rounded bg-amber-500/10 flex items-center justify-center text-amber-500">
                                    <AlertTriangle className="h-4 w-4" />
                                </div>
                                <div>
                                    <p className="text-xs font-bold leading-none">Email Gateway</p>
                                    <p className="text-[10px] text-muted-foreground">Latency elevated (2.4s)</p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Logs Table */}
                <Card className="md:col-span-3 border-primary/10 shadow-xl bg-card/50 backdrop-blur overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b flex flex-row items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-primary" />
                            <CardTitle>Platform Audit Trail</CardTitle>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 px-2 gap-2 text-xs font-bold">
                            <Filter className="h-3.5 w-3.5" />
                            Filter
                        </Button>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="w-[120px]">Level</TableHead>
                                    <TableHead className="w-[200px]">Context/Tenant</TableHead>
                                    <TableHead>Event / Message</TableHead>
                                    <TableHead className="w-[150px] text-right pr-6">Timestamp</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody className="font-mono">
                                {logs.length > 0 ? (
                                    logs.map((log: any) => (
                                        <TableRow key={log.id} className="group hover:bg-muted/40 border-primary/5 transition-all">
                                            <TableCell>
                                                <Badge 
                                                    variant={getLevelVariant(log.level)} 
                                                    className={cn(
                                                        "text-[10px] font-black h-5 uppercase tracking-tighter",
                                                        log.level === 'WARN' && "border-amber-500 text-amber-600 bg-amber-50",
                                                        log.level === 'INFO' && "bg-emerald-50 text-emerald-600 border-emerald-200"
                                                    )}
                                                >
                                                    {log.level}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 truncate text-xs font-bold text-foreground opacity-80">
                                                    <Building2 className="h-3 w-3 opacity-50 shrink-0" />
                                                    {log.tenant?.name || "System Core"}
                                                </div>
                                            </TableCell>
                                            <TableCell className="max-w-[400px]">
                                                <p className="text-[11px] leading-relaxed text-foreground/90 group-hover:underline">
                                                    {log.message}
                                                </p>
                                                {log.path && (
                                                    <span className="text-[9px] text-muted-foreground opacity-60">
                                                        at: {log.path}
                                                    </span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 text-xs text-muted-foreground tabular-nums">
                                                {format(new Date(log.timestamp), "HH:mm:ss")}
                                                <span className="block text-[10px] opacity-60">
                                                    {format(new Date(log.timestamp), "MMM dd")}
                                                </span>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={4} className="h-96 text-center text-muted-foreground">
                                            <div className="flex flex-col items-center justify-center gap-4">
                                                <div className="h-12 w-12 rounded-full border-2 border-dashed border-primary/20 flex items-center justify-center">
                                                    <Activity className="h-6 w-6 opacity-20" />
                                                </div>
                                                <p className="font-bold text-lg opacity-40 uppercase tracking-widest">No Active Telemetry</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}

function cn(...classes: any[]) {
    return classes.filter(Boolean).join(' ')
}

function Separator({ className }: { className?: string }) {
    return <div className={cn("h-px w-full bg-border", className)} />
}

function CheckCircle2(props: any) {
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
            <path d="M20 6 9 17l-5-5" />
            <circle cx="12" cy="12" r="10" />
        </svg>
    )
}
