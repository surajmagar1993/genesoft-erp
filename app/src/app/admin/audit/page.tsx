import { getAdminAuditLogs } from "@/app/actions/saas/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ShieldCheck, User } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

export const dynamic = "force-dynamic"

export default async function AdminAuditPage() {
    const logs = await getAdminAuditLogs()

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

            <Card className="border-primary/10 shadow-sm overflow-hidden">
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
                                <TableHead className="text-right pr-6">Metadata</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                                {logs.length > 0 ? (
                                logs.map((log: any) => (
                                    <TableRow key={log.id}>
                                        <TableCell className="font-medium text-sm">
                                            <Badge variant="outline">{log.action}</Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            <div className="flex items-center gap-2">
                                                <User className="h-3 w-3" />
                                                {log.adminEmail}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            {log.targetType || "SYSTEM"}: {log.targetId || "N/A"}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {formatDistanceToNow(new Date(log.createdAt))} ago
                                        </TableCell>
                                        <TableCell className="text-right pr-6 text-[10px] font-mono opacity-50">
                                            {JSON.stringify(log.metadata)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                                        No audit entries found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
