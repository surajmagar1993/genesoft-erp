"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { getTwoFactorRequirement } from "@/app/actions/settings/security"
import { confirmAction } from "@/components/confirm-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** The signed-in user's own two-factor sign-in: status, set up, turn off. */
export function TwoFactorCard({ returnTo }: { returnTo: string }) {
    const [state, setState] = useState<{ loading: boolean; factorId: string | null; required: boolean }>({ loading: true, factorId: null, required: false })
    const [busy, setBusy] = useState(false)

    const load = useCallback(async () => {
        const [{ data }, requirement] = await Promise.all([
            createClient().auth.mfa.listFactors(),
            getTwoFactorRequirement().catch(() => ({ required: false })),
        ])
        const verified = data?.totp.find((f) => f.status === "verified")
        setState({ loading: false, factorId: verified?.id ?? null, required: requirement.required })
    }, [])

    useEffect(() => {
        let cancelled = false
        Promise.resolve()
            .then(load)
            .catch(() => {
                if (!cancelled) setState((s) => ({ ...s, loading: false }))
            })
        return () => {
            cancelled = true
        }
    }, [load])

    const turnOff = async () => {
        if (!state.factorId) return
        const ok = await confirmAction({
            title: "Turn off two-factor sign-in?",
            description: "You'll sign in with your password only. You can set it up again at any time.",
            confirmLabel: "Turn off",
            destructive: true,
        })
        if (!ok) return
        setBusy(true)
        const supabase = createClient()
        const { error } = await supabase.auth.mfa.unenroll({ factorId: state.factorId })
        if (error) toast.error(error.message)
        else {
            await supabase.auth.refreshSession()
            toast.success("Two-factor sign-in turned off")
        }
        setBusy(false)
        load().catch(() => {})
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                    <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                    Two-factor sign-in
                    {!state.loading && (
                        <Badge variant={state.factorId ? "default" : "secondary"}>{state.factorId ? "On" : "Off"}</Badge>
                    )}
                </CardTitle>
                <CardDescription>
                    After your password, enter a code from an authenticator app on your phone.
                    {state.required && " Required for admin accounts on this platform."}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {state.loading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Loading" />
                ) : state.factorId ? (
                    state.required ? (
                        <p className="text-sm text-muted-foreground">It can&apos;t be turned off while the platform requires it.</p>
                    ) : (
                        <Button variant="outline" size="sm" onClick={turnOff} disabled={busy}>
                            {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" /> : <ShieldOff className="mr-2 h-4 w-4" aria-hidden="true" />}
                            Turn off
                        </Button>
                    )
                ) : (
                    <Button size="sm" asChild>
                        <Link href={`/two-factor?next=${encodeURIComponent(returnTo)}`}>Set up authenticator app</Link>
                    </Button>
                )}
            </CardContent>
        </Card>
    )
}
