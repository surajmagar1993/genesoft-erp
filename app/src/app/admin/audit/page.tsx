import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShieldCheck, User, Activity } from "lucide-react"

export const dynamic = "force-dynamic"

// Mock data until database wiring is requested
const auditLogs = [
    { id: "log_1", action: "TENANT_SUSPENDED", user: "suraj.magar1993@gmail.com", target: "Alpha Corp (tnt_892)", date: "2026-04-07 14:22:00", severity: "HIGH" },
    { id: "log_2", action: "PRICING_UPDATED", user: "suraj.magar1993@gmail.com", target: "PRO Tier (IN)", date: "2026-04-07 10:15:00", severity: "MEDIUM" },
    { id: "log_3", action: "ADMIN_LOGIN", user: "suraj.magar1993@gmail.com", target: "System Console", date: "2026-04-07 08:00:23", severity: "LOW" },
]

export default async function AdminAuditPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admin Audit Trail</h1>
                    <p className="text-muted-foreground mt-1">
                        Security logs and managerial actions across the platform.
                    </p>
                </div>
            </div>

            <Card className="border-primary/10 shadow-sm">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Recent Activities
                    </CardTitle>
                    <CardDescription>
                        Immutable record of all super-admin level actions.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Action</TableHead>
                                <TableHead>Executed By</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead>Timestamp</TableHead>
                                <TableHead className="text-right pr-6">Severity</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {auditLogs.map((log) => (
                                <TableRow key={log.id}>
                                    <TableCell className="font-medium text-sm">
                                        {log.action}
                                    </TableCell>
                                    <TableCell className="text-muted-foreground text-sm flex items-center gap-2">
                                        <User className="h-3 w-3" />
                                        {log.user}
                                    </TableCell>
                                    <TableCell className="text-sm">
                                        {log.target}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {log.date}
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <Badge variant={
                                            log.severity === "HIGH" ? "destructive" : 
                                            log.severity === "MEDIUM" ? "default" : "secondary"
                                        }>
                                            {log.severity}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
