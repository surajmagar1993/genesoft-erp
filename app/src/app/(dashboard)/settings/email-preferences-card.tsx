"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { setMarketingOptIn, type EmailPreferences } from "@/app/actions/settings/email-preferences"
import { MARKETING_TOPICS, type MarketingTopic } from "@/lib/marketing-topics"

export function EmailPreferencesCard({ initial }: { initial: EmailPreferences }) {
    const [prefs, setPrefs] = useState(initial)
    const [isPending, startTransition] = useTransition()

    const save = (optIn: boolean, topicsOff: MarketingTopic[], message: string) => {
        startTransition(async () => {
            const res = await setMarketingOptIn(optIn, topicsOff)
            if (res.success) {
                setPrefs(res.data)
                toast.success(message)
            } else {
                toast.error(res.error)
            }
        })
    }
    // Turning it on with every kind switched off would send nothing, so it starts with all kinds
    const onChange = (checked: boolean) =>
        save(checked, checked && prefs.topicsOff.length === MARKETING_TOPICS.length ? [] : prefs.topicsOff,
            checked ? "You'll get the marketing emails you picked." : "You've been unsubscribed from marketing emails.")
    const onTopic = (topic: MarketingTopic, on: boolean) => {
        const off = on ? prefs.topicsOff.filter((t) => t !== topic) : [...prefs.topicsOff, topic]
        // Last kind switched off = unsubscribed from all
        save(off.length < MARKETING_TOPICS.length, off, "Email preferences saved.")
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Email preferences</CardTitle>
                <CardDescription>Choose which emails Genesoft sends to you. This setting is just for your own login.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex items-start justify-between gap-4 rounded-lg border p-4">
                    <div className="space-y-1">
                        <Label htmlFor="marketing-opt-in" className="font-medium">Product news, tips and offers</Label>
                        <p className="text-sm text-muted-foreground">
                            New features, guides and occasional offers. A few emails a month at most.
                        </p>
                        {prefs.consentAt && (
                            <p className="text-xs text-muted-foreground">
                                Last changed {new Date(prefs.consentAt).toLocaleString()}
                            </p>
                        )}
                    </div>
                    <Switch id="marketing-opt-in" checked={prefs.marketingOptIn} disabled={isPending} onCheckedChange={onChange} />
                </div>
                {prefs.marketingOptIn && (
                    <div className="divide-y rounded-lg border">
                        {MARKETING_TOPICS.map((t) => (
                            <div key={t.key} className="flex items-start justify-between gap-4 p-4 pl-6">
                                <div className="space-y-1">
                                    <Label htmlFor={`marketing-${t.key}`}>{t.label}</Label>
                                    <p className="text-sm text-muted-foreground">{t.description}</p>
                                </div>
                                <Switch
                                    id={`marketing-${t.key}`}
                                    checked={!prefs.topicsOff.includes(t.key)}
                                    disabled={isPending}
                                    onCheckedChange={(on) => onTopic(t.key, on)}
                                />
                            </div>
                        ))}
                    </div>
                )}
                <p className="text-xs text-muted-foreground">
                    Service emails, such as password resets, payment receipts and security alerts, are always sent.{" "}
                    <Link href="/privacy#marketing-emails" target="_blank" className="underline hover:text-foreground">How we use your email</Link>
                </p>
            </CardContent>
        </Card>
    )
}
