"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Trash2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { unwrap } from "@/lib/action-result"
import { purgeTenant } from "@/app/actions/saas/admin"
import type { WorkspaceClosure } from "@/lib/workspace-closure"

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "")

/** Shown on an inactive workspace: who closed it and when, and the permanent delete. */
export function TenantClosureCard({ tenantId, tenantName, closure }: { tenantId: string; tenantName: string; closure: WorkspaceClosure | null }) {
    const router = useRouter()
    const [confirmName, setConfirmName] = useState("")
    const [ownerAskedNow, setOwnerAskedNow] = useState(false)
    const [isPending, startTransition] = useTransition()

    if (closure?.status === "PURGED") {
        return (
            <Card className="border-destructive/30">
                <CardHeader>
                    <CardTitle>Data deleted</CardTitle>
                    <CardDescription>
                        Business data and logins were permanently deleted on {day(closure.purgedAt)}. Only the Genesoft subscription receipts are kept.
                    </CardDescription>
                </CardHeader>
            </Card>
        )
    }

    const graceOver = closure ? new Date(closure.purgeAfter) <= new Date() : false
    const needsOwnerTick = !graceOver

    const onPurge = () =>
        startTransition(async () => {
            try {
                const res = unwrap(await purgeTenant(tenantId, confirmName, ownerAskedNow))
                toast.success(`Deleted ${res.rows} records from ${res.tables} tables and ${res.users} login(s)`)
                router.refresh()
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Delete failed")
            }
        })

    return (
        <Card className="border-destructive/30">
            <CardHeader>
                <CardTitle>{closure ? "Closed by the owner" : "Suspended"}</CardTitle>
                <CardDescription>
                    {closure ? (
                        <>
                            Closed on {day(closure.closedAt)} by {closure.closedBy.email}.{closure.reason ? ` Reason: “${closure.reason}”.` : ""}{" "}
                            {graceOver
                                ? "The 30-day reopening period is over; the data can be deleted."
                                : `They can ask to reopen it until ${day(closure.purgeAfter)} (use Activate).`}
                        </>
                    ) : (
                        "Nobody in this workspace can sign in. Activate it to restore access."
                    )}
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                    Permanently deleting removes all business data (contacts, invoices, stock, HR…) and every login in this workspace. It can&apos;t be undone.
                    Genesoft&apos;s own subscription receipts for this business are kept for tax records.
                </p>
                <div className="space-y-2 max-w-md">
                    <Label htmlFor="purge-confirm">Type <span className="font-semibold">{tenantName}</span> to confirm</Label>
                    <Input id="purge-confirm" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
                </div>
                {needsOwnerTick && (
                    <label className="flex items-center gap-2 text-sm">
                        <input type="checkbox" checked={ownerAskedNow} onChange={(e) => setOwnerAskedNow(e.target.checked)} />
                        The owner asked for their data to be deleted now
                    </label>
                )}
                <Button
                    variant="destructive"
                    disabled={isPending || confirmName.trim().toLowerCase() !== tenantName.trim().toLowerCase() || (needsOwnerTick && !ownerAskedNow)}
                    onClick={onPurge}
                >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete data permanently
                </Button>
            </CardContent>
        </Card>
    )
}
