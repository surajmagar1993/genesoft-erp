import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TENANT_ACTION_LABEL } from "@/lib/tenant-audit-labels"
import type { ActivityRow } from "@/app/actions/activity"

const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

/** "fromPlan: BASIC · toPlan: PRO" (internal ids left out). */
function details(meta: Record<string, unknown>): string {
    return Object.entries(meta)
        .filter(([k, v]) => v !== null && v !== undefined && v !== "" && k !== "movedFromAdminAudit")
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : String(v)}`)
        .join(" · ")
}

/**
 * A business's activity log (tenant_audit_logs). Used in Settings → Activity
 * log, on a business's page in Super Admin, and in Super Admin → Audit.
 */
export function ActivityLogTable({ rows, showBusiness = false, emptyText = "Nothing recorded yet." }: { rows: ActivityRow[]; showBusiness?: boolean; emptyText?: string }) {
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="whitespace-nowrap">When</TableHead>
                        {showBusiness && <TableHead>Business</TableHead>}
                        <TableHead>What</TableHead>
                        <TableHead>Who</TableHead>
                        <TableHead>Details</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rows.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={showBusiness ? 5 : 4} className="py-8 text-center text-sm text-muted-foreground">
                                {emptyText}
                            </TableCell>
                        </TableRow>
                    ) : (
                        rows.map((r) => (
                            <TableRow key={r.id}>
                                <TableCell className="whitespace-nowrap text-xs text-muted-foreground">{fmt.format(new Date(r.createdAt))}</TableCell>
                                {showBusiness && (
                                    <TableCell className="text-sm">
                                        <Link href={`/admin/tenants/${r.tenantId}`} className="hover:underline">
                                            {r.tenantName || r.tenantId.slice(0, 8)}
                                        </Link>
                                    </TableCell>
                                )}
                                <TableCell>
                                    <Badge variant="outline" className="whitespace-nowrap font-medium" title={r.action}>
                                        {TENANT_ACTION_LABEL[r.action] ?? r.action}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-sm">{r.actorEmail === "billing@system" ? "Billing system" : r.actorEmail || "Unknown"}</TableCell>
                                <TableCell className="max-w-md text-xs text-muted-foreground">{details(r.metadata) || "—"}</TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </div>
    )
}
