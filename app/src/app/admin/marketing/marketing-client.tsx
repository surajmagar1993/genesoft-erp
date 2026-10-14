"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { formatDistanceToNow } from "date-fns"
import { AlertTriangle, Eye, Megaphone, Send, Users } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
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
import { unwrap } from "@/lib/action-result"
import {
    previewMarketingEmail,
    sendMarketingEmail,
    sendMarketingTest,
    type MarketingOverview,
} from "@/app/actions/saas/marketing"

export function MarketingClient({ initial }: { initial: MarketingOverview }) {
    const router = useRouter()
    const [subject, setSubject] = useState("")
    const [body, setBody] = useState("")
    const [previewHtml, setPreviewHtml] = useState<string | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const { subscriberCount, setupProblem, campaigns } = initial
    const hasContent = subject.trim() !== "" && body.trim() !== ""

    const run = (fn: () => Promise<void>) =>
        startTransition(async () => {
            try {
                await fn()
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Something went wrong")
            }
        })

    const onPreview = () =>
        run(async () => {
            const res = unwrap(await previewMarketingEmail({ subject, body }))
            setPreviewHtml(res.html)
        })

    const onTest = () =>
        run(async () => {
            const res = unwrap(await sendMarketingTest({ subject, body }))
            toast.success(`Test sent to ${res.to}`)
        })

    const onSend = () =>
        run(async () => {
            setConfirmOpen(false)
            const res = unwrap(await sendMarketingEmail({ subject, body, expectedCount: subscriberCount }))
            if (res.failed > 0) {
                toast.error(`Sent ${res.sent}, failed ${res.failed}: ${res.errors[0] || "unknown error"}`)
            } else {
                toast.success(`Sent to ${res.sent} subscriber${res.sent === 1 ? "" : "s"}`)
                setSubject("")
                setBody("")
                setPreviewHtml(null)
            }
            router.refresh()
        })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Marketing Emails</h1>
                <p className="text-muted-foreground mt-1">
                    Send product news, tips and offers to users who opted in. Every email carries an unsubscribe link and the company address.
                </p>
            </div>

            {setupProblem && (
                <div className="flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <p>{setupProblem}</p>
                </div>
            )}

            <div className="grid gap-6 lg:grid-cols-3">
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2"><Megaphone className="h-5 w-5 text-primary" /> Compose</CardTitle>
                        <CardDescription>
                            Plain text. Leave a blank line between paragraphs; links are made clickable. Use {"{{first_name}}"} for the person&apos;s first name.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="mk-subject">Subject</Label>
                            <Input id="mk-subject" value={subject} maxLength={150} onChange={(e) => setSubject(e.target.value)} placeholder="Enter the email subject" />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mk-body">Message</Label>
                            <Textarea id="mk-body" value={body} rows={14} onChange={(e) => setBody(e.target.value)} placeholder="Write the message people will receive" />
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Button variant="outline" disabled={!hasContent || isPending} onClick={onPreview}>
                                <Eye className="mr-2 h-4 w-4" /> Preview
                            </Button>
                            <Button variant="outline" disabled={!hasContent || isPending || !!setupProblem} onClick={onTest}>
                                <Send className="mr-2 h-4 w-4" /> Send test to me
                            </Button>
                            <Button
                                disabled={!hasContent || isPending || !!setupProblem || subscriberCount === 0}
                                onClick={() => setConfirmOpen(true)}
                            >
                                <Users className="mr-2 h-4 w-4" /> Send to {subscriberCount} subscriber{subscriberCount === 1 ? "" : "s"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Subscribers</CardTitle>
                        <CardDescription>Confirmed, active users with marketing emails switched on.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                        <p className="text-4xl font-bold">{subscriberCount}</p>
                        <p className="text-sm text-muted-foreground">
                            People opt in at sign-up or in Settings → Account → Email preferences, and leave with the link in any email.
                            Service emails (resets, receipts, security) don&apos;t go through here.
                        </p>
                    </CardContent>
                </Card>
            </div>

            {previewHtml && (
                <Card>
                    <CardHeader>
                        <CardTitle>Preview</CardTitle>
                        <CardDescription>As you would receive it. The unsubscribe link in the preview is for your own account.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <iframe title="Email preview" srcDoc={previewHtml} sandbox="" className="h-[520px] w-full rounded-md border bg-white" />
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Sent emails</CardTitle>
                    <CardDescription>The last 20 sends, also recorded in Admin Audit.</CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Subject</TableHead>
                                <TableHead>Delivered to Resend</TableHead>
                                <TableHead>Sent by</TableHead>
                                <TableHead>When</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">No marketing emails sent yet.</TableCell>
                                </TableRow>
                            ) : (
                                campaigns.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.subject}</TableCell>
                                        <TableCell>
                                            {c.sent}
                                            {c.failed > 0 && <Badge variant="destructive" className="ml-2">{c.failed} failed</Badge>}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">{c.adminEmail}</TableCell>
                                        <TableCell className="text-muted-foreground">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Send to {subscriberCount} subscriber{subscriberCount === 1 ? "" : "s"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{subject}&rdquo; goes out now and can&apos;t be recalled. Send yourself a test first if you haven&apos;t.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={onSend}>Send now</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
