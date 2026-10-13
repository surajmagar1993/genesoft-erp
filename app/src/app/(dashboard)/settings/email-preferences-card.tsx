"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { setMarketingOptIn, type EmailPreferences } from "@/app/actions/settings/email-preferences"

export function EmailPreferencesCard({ initial }: { initial: EmailPreferences }) {
    const [prefs, setPrefs] = useState(initial)
    const [isPending, startTransition] = useTransition()

    const onChange = (checked: boolean) => {
        startTransition(async () => {
            const res = await setMarketingOptIn(checked)
            if (res.success) {
                setPrefs(res.data)
                toast.success(checked ? "You'll get product news and tips by email." : "You've been unsubscribed from marketing emails.")
            } else {
                toast.error(res.error)
            }
        })
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
                <p className="text-xs text-muted-foreground">
                    Service emails, such as password resets, payment receipts and security alerts, are always sent.{" "}
                    <Link href="/privacy#marketing-emails" target="_blank" className="underline hover:text-foreground">How we use your email</Link>
                </p>
            </CardContent>
        </Card>
    )
}
