"use client"

import { useMemo, useState, useTransition } from "react"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { unwrap } from "@/lib/action-result"
import { COUNTRIES } from "@/lib/constants/countries"
import { MARKETING_TOPICS, matchesAudience, topicLabel, type BusinessStatus, type MarketingTopic } from "@/lib/marketing-topics"
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
    const [buttonLabel, setButtonLabel] = useState("")
    const [buttonUrl, setButtonUrl] = useState("")
    const [previewHtml, setPreviewHtml] = useState<string | null>(null)
    const [confirmOpen, setConfirmOpen] = useState(false)
    const [isPending, startTransition] = useTransition()

    const { subscriberCount: totalSubscribers, subscribers, setupProblem, campaigns } = initial
    const [topic, setTopic] = useState<MarketingTopic>("news")
    const [status, setStatus] = useState<BusinessStatus>("any")
    const [plans, setPlans] = useState<string[]>([])
    const [countries, setCountries] = useState<string[]>([])
    const [tenantIds, setTenantIds] = useState<string[]>([])
    const audience = { topic, status, plans, countries, tenantIds }
    const subscriberCount = useMemo(
        () => subscribers.filter((s) => matchesAudience(s, { topic, status, plans, countries, tenantIds })).length,
        [subscribers, topic, status, plans, countries, tenantIds]
    )
    // Choices come from the subscribers themselves, so every option can match someone
    const countryOptions = [...new Set(subscribers.map((s) => s.countryCode).filter((c): c is string => !!c))]
        .map((code) => ({ code, name: COUNTRIES.find((c) => c.code === code)?.name || code }))
        .sort((a, b) => a.name.localeCompare(b.name))
    const tenantOptions = [...new Map(subscribers.filter((s) => s.tenantId).map((s) => [s.tenantId!, s.tenantName || "Unnamed business"])).entries()]
        .sort((a, b) => a[1].localeCompare(b[1]))
    const toggle = (list: string[], set: (v: string[]) => void, v: string) => set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v])
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
            const res = unwrap(await previewMarketingEmail({ subject, body, topic, buttonLabel, buttonUrl }))
            setPreviewHtml(res.html)
        })

    const onTest = () =>
        run(async () => {
            const res = unwrap(await sendMarketingTest({ subject, body, topic, buttonLabel, buttonUrl }))
            toast.success(`Test sent to ${res.to}`)
        })

    const onSend = () =>
        run(async () => {
            setConfirmOpen(false)
            const res = unwrap(await sendMarketingEmail({ subject, body, buttonLabel, buttonUrl, audience, expectedCount: subscriberCount }))
            if (res.failed > 0) {
                toast.error(`Sent ${res.sent}, failed ${res.failed}: ${res.errors[0] || "unknown error"}`)
            } else {
                toast.success(`Sent to ${res.sent} subscriber${res.sent === 1 ? "" : "s"}`)
                setSubject("")
                setBody("")
                setButtonLabel("")
                setButtonUrl("")
                setPreviewHtml(null)
            }
            router.refresh()
        })

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Marketing Emails</h1>
                <p className="text-muted-foreground mt-1">
                    Send product news, tips and offers to users who opted in, by kind of email and by business. Every email carries an unsubscribe link and the company address.
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
                            Leave a blank line between paragraphs. Start a line with &ldquo;## &rdquo; for a heading or &ldquo;- &rdquo; for a bullet, wrap words in **two stars** for bold; links are made clickable. {"{{first_name}}"} is the person&apos;s first name. The subject is also the headline.
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
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="mk-btn-label">Button text (optional)</Label>
                                <Input id="mk-btn-label" value={buttonLabel} maxLength={40} onChange={(e) => setButtonLabel(e.target.value)} placeholder="Enter the button text" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="mk-btn-url">Button link</Label>
                                <Input id="mk-btn-url" type="url" value={buttonUrl} maxLength={500} onChange={(e) => setButtonUrl(e.target.value)} placeholder="Enter a full https:// link" />
                            </div>
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
                                <Users className="mr-2 h-4 w-4" /> Send to {subscriberCount} {subscriberCount === 1 ? "person" : "people"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle>Who gets it</CardTitle>
                        <CardDescription>
                            {totalSubscribers} opted-in user{totalSubscribers === 1 ? "" : "s"} in active businesses. Leave a group empty to include everyone.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="mk-topic">Kind of email</Label>
                            <Select value={topic} onValueChange={(v) => setTopic(v as MarketingTopic)}>
                                <SelectTrigger id="mk-topic"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    {MARKETING_TOPICS.map((t) => <SelectItem key={t.key} value={t.key}>{t.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">Only people who left this kind on get it. Its unsubscribe link offers to stop this kind only.</p>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="mk-status">Business status</Label>
                            <Select value={status} onValueChange={(v) => setStatus(v as BusinessStatus)}>
                                <SelectTrigger id="mk-status"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="any">Any</SelectItem>
                                    <SelectItem value="trial">On an active trial</SelectItem>
                                    <SelectItem value="paid">On a paid plan</SelectItem>
                                    <SelectItem value="free">On Free (or trial ended)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <ChipGroup label="Plan" options={["FREE", "BASIC", "PRO", "ENTERPRISE"].map((p) => [p, p.charAt(0) + p.slice(1).toLowerCase()])} selected={plans} onToggle={(v) => toggle(plans, setPlans, v)} />
                        {countryOptions.length > 0 && (
                            <ChipGroup label="Country" options={countryOptions.map((c) => [c.code, c.name])} selected={countries} onToggle={(v) => toggle(countries, setCountries, v)} />
                        )}
                        {tenantOptions.length > 0 && (
                            <ChipGroup label="Businesses" options={tenantOptions} selected={tenantIds} onToggle={(v) => toggle(tenantIds, setTenantIds, v)} />
                        )}
                        <div className="rounded-lg border bg-muted/40 p-3">
                            <p className="text-3xl font-bold">{subscriberCount}</p>
                            <p className="text-sm text-muted-foreground">will get this email</p>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            People opt in at sign-up or in Settings → Account → Email preferences, pick the kinds they want there, and leave with the link in any email.
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
                                <TableHead>Kind</TableHead>
                                <TableHead>Delivered to Resend</TableHead>
                                <TableHead>Sent by</TableHead>
                                <TableHead>When</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">No marketing emails sent yet.</TableCell>
                                </TableRow>
                            ) : (
                                campaigns.map((c) => (
                                    <TableRow key={c.id}>
                                        <TableCell className="font-medium">{c.subject}</TableCell>
                                        <TableCell className="text-muted-foreground">{c.topic ? topicLabel(c.topic) : "All"}</TableCell>
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
                        <AlertDialogTitle>Send to {subscriberCount} {subscriberCount === 1 ? "person" : "people"}?</AlertDialogTitle>
                        <AlertDialogDescription>
                            &ldquo;{subject}&rdquo; ({topicLabel(topic).toLowerCase()}) goes out now and can&apos;t be recalled. Send yourself a test first if you haven&apos;t.
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

function ChipGroup({ label, options, selected, onToggle }: {
    label: string
    options: [string, string][]
    selected: string[]
    onToggle: (value: string) => void
}) {
    return (
        <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{label}</legend>
            <div className="flex flex-wrap gap-2">
                {options.map(([value, text]) => (
                    <Button
                        key={value}
                        type="button"
                        size="sm"
                        variant={selected.includes(value) ? "default" : "outline"}
                        aria-pressed={selected.includes(value)}
                        onClick={() => onToggle(value)}
                    >
                        {text}
                    </Button>
                ))}
            </div>
        </fieldset>
    )
}
