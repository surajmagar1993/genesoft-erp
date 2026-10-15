"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Download, Mail, MessageCircle, Phone } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { getCvLink, listLeads, updateLead } from "@/app/actions/website"
import { unwrap } from "@/lib/action-result"
import { LEAD_KIND_LABEL, LEAD_STATUSES, LEAD_STATUS_LABEL, type LeadStatus } from "@/lib/site-cms-shared"
import { telHref, whatsappHref } from "@/lib/constants/platform"
import { cn } from "@/lib/utils"

type Data = Awaited<ReturnType<typeof listLeads>>
type Lead = Data["leads"][number]

const STATUS_STYLE: Record<LeadStatus, string> = {
    new: "bg-orange-500/15 text-orange-600 dark:text-orange-300",
    contacted: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
    quote_sent: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
    won: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
    lost: "bg-muted text-muted-foreground",
    spam: "bg-muted text-muted-foreground line-through",
}

function Details({ lead }: { lead: Lead }) {
    const d = lead.data as Record<string, unknown>
    const items = Array.isArray(d.items) ? (d.items as { category: string; quantity: number; specs?: string }[]) : []
    const rows = ([
        ["Topic", lead.topic],
        ["Company", lead.company || ""],
        ...(lead.kind === "quote"
            ? ([
                  ["Items", items.map((i) => `${i.quantity} × ${i.category}${i.specs ? ` (${i.specs})` : ""}`).join("\n")],
                  ["Start date", String(d.startDate || "Not given")],
                  ["Rental period", String(d.period || "")],
                  ["Delivery city", String(d.city || "")],
              ] as [string, string][])
            : []),
        ...(lead.kind === "application" ? ([["Job", String(d.jobTitle || "")], ["Link", String(d.link || "")]] as [string, string][]) : []),
    ] as [string, string][]).filter(([, v]) => v)
    return (
        <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-4 gap-y-1.5 text-sm">
            {rows.map(([k, v]) => (
                <div key={k} className="contents">
                    <dt className="text-muted-foreground">{k}</dt>
                    <dd className="whitespace-pre-line break-words">{v}</dd>
                </div>
            ))}
            <dt className="text-muted-foreground">Message</dt>
            <dd className="whitespace-pre-line break-words">{String(d.message || "")}</dd>
        </dl>
    )
}

export function LeadsClient({ data, status, kind }: { data: Data; status: string; kind: string }) {
    const router = useRouter()
    const [open, setOpen] = useState<Lead | null>(null)
    const [notes, setNotes] = useState("")
    const [busy, startTransition] = useTransition()

    const run = (fn: () => Promise<void>) =>
        startTransition(async () => {
            try {
                await fn()
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Something went wrong")
            }
        })

    const href = (s: string, k: string) => {
        const q = new URLSearchParams()
        if (s) q.set("status", s)
        if (k) q.set("kind", k)
        return `/admin/website/leads${q.toString() ? `?${q}` : ""}`
    }

    const setStatus = (lead: Lead, s: LeadStatus) =>
        run(async () => {
            unwrap(await updateLead(lead.id, { status: s }))
            setOpen((o) => (o && o.id === lead.id ? { ...o, status: s } : o))
            router.refresh()
        })

    return (
        <div className="mx-auto max-w-6xl space-y-5 px-4 pb-12">
            <div className="border-b pb-5">
                <h1 className="text-2xl font-bold tracking-tight">Leads inbox</h1>
                <p className="text-sm text-muted-foreground">Everything sent from the website forms. Each one was also emailed to info@ (applications to careers@).</p>
            </div>
            <div className="flex flex-wrap gap-1.5">
                <Link href={href("", kind)} className={cn("rounded-full px-3 py-1 text-sm", !status ? "bg-primary text-primary-foreground" : "border hover:bg-muted")}>All open</Link>
                {LEAD_STATUSES.map((s) => (
                    <Link key={s} href={href(s, kind)} className={cn("rounded-full px-3 py-1 text-sm", status === s ? "bg-primary text-primary-foreground" : "border hover:bg-muted")}>
                        {LEAD_STATUS_LABEL[s]} <span className="opacity-70">{data.counts[s]}</span>
                    </Link>
                ))}
                <span className="mx-1 w-px bg-border" aria-hidden="true" />
                {[["", "All types"], ["contact", "Messages"], ["quote", "Rental quotes"], ["application", "Applications"]].map(([k, label]) => (
                    <Link key={label} href={href(status, k)} className={cn("rounded-full px-3 py-1 text-sm", kind === k ? "bg-muted font-semibold" : "text-muted-foreground hover:bg-muted")}>{label}</Link>
                ))}
            </div>
            <Card className="gap-0 overflow-x-auto py-0">
                <table className="w-full min-w-[720px] text-sm">
                    <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <tr><th className="px-4 py-2.5">Received</th><th className="px-4 py-2.5">From</th><th className="px-4 py-2.5">Type</th><th className="px-4 py-2.5">Topic</th><th className="px-4 py-2.5">Status</th><th className="px-4 py-2.5"></th></tr>
                    </thead>
                    <tbody className="divide-y">
                        {data.leads.length === 0 && (
                            <tr><td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">Nothing here.</td></tr>
                        )}
                        {data.leads.map((l) => (
                            <tr key={l.id} className="hover:bg-muted/30">
                                <td className="px-4 py-2.5 text-muted-foreground">{new Date(l.createdAt).toLocaleString()}</td>
                                <td className="px-4 py-2.5"><div className="font-medium">{l.name}</div><div className="text-xs text-muted-foreground">{l.company || l.email}</div></td>
                                <td className="px-4 py-2.5">{LEAD_KIND_LABEL[l.kind] ?? l.kind}</td>
                                <td className="px-4 py-2.5">{l.topic}</td>
                                <td className="px-4 py-2.5"><span className={cn("rounded-full px-2.5 py-0.5 text-xs font-semibold", STATUS_STYLE[l.status])}>{LEAD_STATUS_LABEL[l.status]}</span></td>
                                <td className="px-4 py-2.5 text-right"><Button size="sm" variant="outline" onClick={() => { setOpen(l); setNotes(l.notes || "") }}>Open</Button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </Card>

            <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
                <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
                    {open && (
                        <>
                            <DialogHeader>
                                <DialogTitle>{open.name}</DialogTitle>
                                <DialogDescription>{LEAD_KIND_LABEL[open.kind]} · {new Date(open.createdAt).toLocaleString()}</DialogDescription>
                            </DialogHeader>
                            <div className="min-w-0 space-y-5">
                                <div className="flex flex-wrap gap-2">
                                    <Button size="sm" variant="outline" asChild><a href={`mailto:${open.email}?subject=${encodeURIComponent(`Re: your ${open.kind === "quote" ? "rental quote request" : open.kind === "application" ? "application" : "enquiry"}`)}`} className="gap-1.5"><Mail className="h-4 w-4" /> {open.email}</a></Button>
                                    {open.phone && <Button size="sm" variant="outline" asChild><a href={telHref(open.phone)} className="gap-1.5"><Phone className="h-4 w-4" /> {open.phone}</a></Button>}
                                    {open.phone && <Button size="sm" variant="outline" asChild><a href={whatsappHref(open.phone)} target="_blank" rel="noopener noreferrer" className="gap-1.5"><MessageCircle className="h-4 w-4" /> WhatsApp</a></Button>}
                                    {open.kind === "application" && (
                                        <Button size="sm" variant="outline" className="gap-1.5" disabled={busy} onClick={() => run(async () => { const { url } = unwrap(await getCvLink(open.id)); window.open(url, "_blank", "noopener") })}>
                                            <Download className="h-4 w-4" /> Download CV
                                        </Button>
                                    )}
                                </div>
                                <Details lead={open} />
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Status</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {LEAD_STATUSES.map((s) => (
                                            <Button key={s} size="sm" variant={open.status === s ? "default" : "outline"} disabled={busy} onClick={() => setStatus(open, s)}>{LEAD_STATUS_LABEL[s]}</Button>
                                        ))}
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <p className="text-sm font-medium">Notes (only visible here)</p>
                                    <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={4} />
                                    <Button size="sm" disabled={busy} onClick={() => run(async () => { unwrap(await updateLead(open.id, { notes })); toast.success("Notes saved"); router.refresh() })}>Save notes</Button>
                                </div>
                                {open.status === "new" && <Badge variant="secondary">Tip: mark it Contacted once you&apos;ve replied.</Badge>}
                            </div>
                        </>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    )
}
