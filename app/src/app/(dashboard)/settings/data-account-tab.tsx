"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Download, DoorClosed } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { closeWorkspace } from "@/app/actions/settings/workspace"
import { CLOSURE_GRACE_DAYS } from "@/lib/workspace-closure"

export default function DataAccountTab({ workspaceName }: { workspaceName: string }) {
    const [confirmName, setConfirmName] = useState("")
    const [reason, setReason] = useState("")
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [isPending, startTransition] = useTransition()
    const nameMatches = confirmName.trim().toLowerCase() === workspaceName.trim().toLowerCase() && workspaceName !== ""

    const onClose = () =>
        startTransition(async () => {
            setConfirmOpen(false)
            // On success the action signs you out and redirects to the login page
            const res = await closeWorkspace({ confirmName, reason })
            if (res && !res.success) toast.error(res.error)
        })

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Download className="h-5 w-5 text-primary" /> Export all data</CardTitle>
                    <CardDescription>
                        Download everything in this workspace as a ZIP file: every table as JSON and CSV (contacts, invoices, payments, stock, HR,
                        settings and more). Passwords, API keys and other credentials are left out.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button asChild>
                        <a href="/api/settings/export" download>
                            <Download className="mr-2 h-4 w-4" /> Download export
                        </a>
                    </Button>
                    <p className="mt-2 text-xs text-muted-foreground">Large workspaces can take a minute to prepare.</p>
                </CardContent>
            </Card>

            <Card className="border-destructive/40">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive"><DoorClosed className="h-5 w-5" /> Close this workspace</CardTitle>
                    <CardDescription>
                        Everyone in the workspace loses access immediately and any card subscription is cancelled. We keep the data for{" "}
                        {CLOSURE_GRACE_DAYS} days in case you change your mind (email support to reopen), then delete it as described in our{" "}
                        <Link href="/privacy#retention" target="_blank" className="underline">Privacy Policy</Link>. Renewal payments aren&apos;t refunded
                        (see the <Link href="/refund-policy" target="_blank" className="underline">Refund Policy</Link>). Export your data first.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 max-w-lg">
                    <div className="space-y-2">
                        <Label htmlFor="close-reason">Why are you leaving? (optional)</Label>
                        <Textarea id="close-reason" value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} placeholder="Tell us what we could do better" />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="close-confirm">Type <span className="font-semibold">{workspaceName}</span> to confirm</Label>
                        <Input id="close-confirm" value={confirmName} onChange={(e) => setConfirmName(e.target.value)} autoComplete="off" />
                    </div>
                    <Button variant="destructive" disabled={!nameMatches || isPending} onClick={() => setConfirmOpen(true)}>
                        Close workspace
                    </Button>
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Close {workspaceName}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You and your team will be signed out and won&apos;t be able to sign in again. The data is deleted after {CLOSURE_GRACE_DAYS} days.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onClose} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Close workspace
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
