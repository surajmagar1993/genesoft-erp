import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { TENANT_ACTION_LABEL } from "@/lib/tenant-audit-labels"
import type { ActivityRow } from "@/lib/activity-row"

/** Internal ids and bookkeeping keys that mean nothing to a reader */
const HIDDEN_KEYS = new Set(["movedFromAdminAudit", "invoiceId", "billId", "stripeEvent"])

/** "fromPlan: BASIC · toPlan: PRO"; module access maps as "crm: EDIT, sales: VIEW". */
function details(meta: Record<string, unknown>): string {
    return Object.entries(meta)
        .filter(([k, v]) => v !== null && v !== undefined && v !== "" && !HIDDEN_KEYS.has(k))
        .map(([k, v]) => {
            if (Array.isArray(v)) return `${k}: ${v.join(", ")}`
            if (v && typeof v === "object") return `${k}: ${Object.entries(v as Record<string, unknown>).map(([a, b]) => `${a}: ${String(b)}`).join(", ")}`
            if (v === true) return k === "byPlatformAdmin" ? "by Genesoft (platform admin)" : k
            return `${k}: ${String(v)}`
        })
        .join(" · ")
}

/** "IST", "GST", "GMT+4"… for the column header */
function zoneLabel(timeZone: string): string {
    try {
        return new Intl.DateTimeFormat("en-GB", { timeZone, timeZoneName: "short" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? timeZone
    } catch {
        return timeZone
    }
}

/**
 * A business's activity log (tenant_audit_logs). Used in Settings → Activity
 * log, on a business's page in Super Admin, and in Super Admin → Audit.
 */
export function ActivityLogTable({
    rows,
    showBusiness = false,
    emptyText = "Nothing recorded yet.",
    timeZone = "Asia/Kolkata",
}: {
    rows: ActivityRow[]
    showBusiness?: boolean
    emptyText?: string
    /** Times are shown in this zone (the business's own in Settings; the platform's, India, in Super Admin) */
    timeZone?: string
}) {
    const fmt = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone })
    return (
        <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="whitespace-nowrap">When ({zoneLabel(timeZone)})</TableHead>
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
