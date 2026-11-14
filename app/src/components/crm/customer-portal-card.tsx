"use client"

import { useState, useSyncExternalStore, useTransition } from "react"
import { toast } from "sonner"
import { Copy, Globe, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { confirmAction } from "@/components/confirm-dialog"
import { LocalDateTime } from "@/components/local-date-time"
import { regeneratePortalToken, togglePortalAccess, type PortalStatus } from "@/app/actions/crm/portal-actions"
import type { ActionResult } from "@/lib/action-result"
import { PORTAL_LINK_DAYS } from "@/lib/portal-link"

const noopSubscribe = () => () => {}


/**
 * Customer portal on a contact's page: turn the customer's self-service
 * portal on or off, copy the link to send them, or issue a new one. Links
 * work for 30 days (src/lib/portal-link.ts). Changing access needs Full
 * access to CRM (the actions check it).
 */
export function CustomerPortalCard({ contactId, initial }: { contactId: string; initial: PortalStatus | null }) {
    const [status, setStatus] = useState<PortalStatus | null>(initial)
    const [pending, startTransition] = useTransition()

    // The site's own address, read in the browser only (empty while rendering on the server, so nothing mismatches)
    const origin = useSyncExternalStore(noopSubscribe, () => window.location.origin, () => "")
    const link = status?.portalToken && origin ? `${origin}/portal/${status.portalToken}` : ""
    const on = !!status?.portalEnabled
    const usable = on && !!status?.portalToken && !status.expired

    function run(action: () => Promise<ActionResult<PortalStatus>>, done: string) {
        startTransition(async () => {
            try {
                const res = await action()
                if (!res.success) {
                    toast.error(res.error)
                    return
                }
                setStatus(res.data)
                toast.success(done)
            } catch {
                toast.error("Couldn't reach the server. Check your connection and try again.")
            }
        })
    }

    async function copy() {
        if (!link) return
        try {
            await navigator.clipboard.writeText(link)
            toast.success("Link copied. Send it to your customer.")
        } catch {
            toast.error("Couldn't copy. Select the link and copy it yourself.")
        }
    }

    async function newLink() {
        const ok = await confirmAction({
            title: "Issue a new link?",
            description: `The current link stops working at once. The new one works for ${PORTAL_LINK_DAYS} days.`,
            confirmLabel: "Issue new link",
            destructive: false,
        })
        if (ok) run(() => regeneratePortalToken(contactId), "New link issued")
    }

    return (
        <Card className="shadow-sm">
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                    <Globe className="h-4 w-4" aria-hidden="true" /> Customer portal
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                    The customer sees their invoices, payments and statement, and can download PDFs and raise support tickets. Links work for {PORTAL_LINK_DAYS} days.
                </p>
                <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Status</span>
                    {!on ? (
                        <Badge variant="secondary">Off</Badge>
                    ) : status?.expired ? (
                        <Badge variant="destructive">Link expired</Badge>
                    ) : (
                        <Badge>On</Badge>
                    )}
                </div>
                {on && status?.expiresAt && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">{status.expired ? "Expired" : "Link works until"}</span>
                        <span className="text-sm font-medium"><LocalDateTime value={status.expiresAt} dateOnly /></span>
                    </div>
                )}
                {status?.portalLastAccess && (
                    <div className="flex justify-between items-center">
                        <span className="text-sm text-muted-foreground">Last visit</span>
                        <span className="text-sm"><LocalDateTime value={status.portalLastAccess} dateOnly /></span>
                    </div>
                )}
                {usable && link && (
                    <div className="rounded-md border bg-muted/40 px-2 py-1.5 text-xs font-mono break-all select-all" aria-label="Portal link">
                        {link}
                    </div>
                )}
                <div className="flex flex-wrap gap-2 pt-1">
                    {usable && (
                        <Button type="button" size="sm" variant="outline" onClick={copy} disabled={pending}>
                            <Copy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> Copy link
                        </Button>
                    )}
                    {on && (
                        <Button type="button" size="sm" variant="outline" onClick={newLink} disabled={pending}>
                            <RefreshCw className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" /> New link
                        </Button>
                    )}
                    <Button
                        type="button"
                        size="sm"
                        variant={on ? "ghost" : "default"}
                        disabled={pending}
                        onClick={() => run(() => togglePortalAccess(contactId), on ? "Portal turned off" : "Portal turned on")}
                    >
                        {on ? "Turn off" : "Turn on"}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
