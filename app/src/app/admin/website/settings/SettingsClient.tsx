"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { saveSiteSettings } from "@/app/actions/website"
import { unwrap } from "@/lib/action-result"
import { SOCIAL_NETWORKS, WEEK_DAYS, type OfficeHours, type SiteSettingsData } from "@/lib/site-cms-shared"

const DEFAULT_HOURS: OfficeHours[] = WEEK_DAYS.map((day) => ({ day, closed: day === "Sunday", open: "10:00", close: day === "Saturday" ? "14:00" : "19:00" }))

function Field({ id, label, value, onChange, type = "text", help }: { id: string; label: string; value: string; onChange: (v: string) => void; type?: string; help?: string }) {
    return (
        <div className="space-y-1.5">
            <Label htmlFor={id}>{label}</Label>
            <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} />
            {help && <p className="text-xs text-muted-foreground">{help}</p>}
        </div>
    )
}

export function SettingsClient({ initial }: { initial: SiteSettingsData }) {
    const router = useRouter()
    const [s, setS] = useState<SiteSettingsData>(initial)
    const [showHours, setShowHours] = useState(initial.hours.length > 0)
    const [hours, setHours] = useState<OfficeHours[]>(initial.hours.length ? WEEK_DAYS.map((d) => initial.hours.find((h) => h.day === d) ?? DEFAULT_HOURS.find((h) => h.day === d)!) : DEFAULT_HOURS)
    const [socials, setSocials] = useState<Record<string, string>>(() => Object.fromEntries(SOCIAL_NETWORKS.map((n) => [n, initial.socials.find((x) => x.network === n)?.url ?? ""])))
    const [busy, startTransition] = useTransition()
    const set = (k: keyof SiteSettingsData) => (v: string) => setS((x) => ({ ...x, [k]: v }))

    const save = () =>
        startTransition(async () => {
            try {
                const saved = unwrap(
                    await saveSiteSettings({
                        ...s,
                        hours: showHours ? hours : [],
                        socials: SOCIAL_NETWORKS.filter((n) => socials[n]?.trim()).map((network) => ({ network, url: socials[network].trim() })),
                    })
                )
                setS(saved)
                toast.success("Saved. The website shows the new details now.")
                router.refresh()
            } catch (err) {
                toast.error(err instanceof Error ? err.message : "Couldn't save")
            }
        })

    return (
        <div className="mx-auto max-w-5xl space-y-6 px-4 pb-12">
            <div className="flex flex-col gap-3 border-b pb-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Site settings</h1>
                    <p className="text-sm text-muted-foreground">Contact details, office hours and links used across the website, footer and forms.</p>
                </div>
                <Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button>
            </div>

            <Card>
                <CardHeader><CardTitle className="text-base">Contact</CardTitle></CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    <Field id="phone" label="Phone" value={s.phone} onChange={set("phone")} />
                    <Field id="wa" label="WhatsApp Business number" value={s.whatsapp} onChange={set("whatsapp")} help="Used by every WhatsApp button" />
                    <Field id="email" label="General email (forms go here)" value={s.email} onChange={set("email")} type="email" />
                    <Field id="careers" label="Careers email (applications go here)" value={s.careersEmail} onChange={set("careersEmail")} type="email" />
                    <Field id="a1" label="Address line 1" value={s.addressLine1} onChange={set("addressLine1")} />
                    <Field id="a2" label="Address line 2" value={s.addressLine2} onChange={set("addressLine2")} />
                    <div className="sm:col-span-2">
                        <Field id="maps" label="Google Maps link" value={s.mapsUrl} onChange={set("mapsUrl")} type="url" help="In Google Maps: Share → Copy link. Empty = a search for the address." />
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                        <CardTitle className="text-base">Office hours</CardTitle>
                        <CardDescription>Shown on Contact. Hidden while switched off.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                        <Label htmlFor="show-hours">Show hours</Label>
                        <Switch id="show-hours" checked={showHours} onCheckedChange={setShowHours} />
                    </div>
                </CardHeader>
                {showHours && (
                    <CardContent className="space-y-2">
                        {hours.map((h, i) => (
                            <div key={h.day} className="grid grid-cols-[110px_auto_1fr_1fr] items-center gap-3 text-sm">
                                <span className="font-medium">{h.day}</span>
                                <label className="flex items-center gap-1.5 text-muted-foreground">
                                    <input type="checkbox" checked={h.closed} onChange={(e) => setHours((x) => x.map((y, j) => (j === i ? { ...y, closed: e.target.checked } : y)))} /> Closed
                                </label>
                                <Input type="time" aria-label={`${h.day} opens`} disabled={h.closed} value={h.open} onChange={(e) => setHours((x) => x.map((y, j) => (j === i ? { ...y, open: e.target.value } : y)))} />
                                <Input type="time" aria-label={`${h.day} closes`} disabled={h.closed} value={h.close} onChange={(e) => setHours((x) => x.map((y, j) => (j === i ? { ...y, close: e.target.value } : y)))} />
                            </div>
                        ))}
                        <div className="pt-2">
                            <Field id="hours-note" label="Note under the hours (optional)" value={s.hoursNote} onChange={set("hoursNote")} help="e.g. Closed on public holidays" />
                        </div>
                    </CardContent>
                )}
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Social links</CardTitle>
                    <CardDescription>Leave empty to hide. Shown in the footer.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                    {SOCIAL_NETWORKS.map((n) => (
                        <Field key={n} id={`so-${n}`} label={n} value={socials[n] ?? ""} onChange={(v) => setSocials((x) => ({ ...x, [n]: v }))} type="url" />
                    ))}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Search engines</CardTitle>
                    <CardDescription>The title and description Google shows for the home page.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <Field id="seo-title" label="Title" value={s.seoTitle} onChange={set("seoTitle")} />
                    <div className="space-y-1.5">
                        <Label htmlFor="seo-desc">Description</Label>
                        <Textarea id="seo-desc" value={s.seoDescription} onChange={(e) => set("seoDescription")(e.target.value)} rows={3} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-end"><Button onClick={save} disabled={busy}>{busy ? "Saving…" : "Save settings"}</Button></div>
        </div>
    )
}
