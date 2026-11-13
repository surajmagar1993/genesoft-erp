"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AlertCircle, Loader2, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { logout } from "../actions"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Stage =
    | { kind: "loading" }
    | { kind: "verify"; factorId: string }
    | { kind: "setup"; factorId: string; qr: string; secret: string }
    | { kind: "error"; message: string }

/**
 * Two-factor sign-in with an authenticator app (TOTP, Supabase Auth MFA).
 * Accounts that already have one enter its code; accounts without one (sent
 * here because the platform requires it, or from Settings) set one up.
 */
export function TwoFactorClient({ next }: { next: string }) {
    const [stage, setStage] = useState<Stage>({ kind: "loading" })
    const [code, setCode] = useState("")
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        let cancelled = false
        const supabase = createClient()
        ;(async () => {
            const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
            if (aal?.currentLevel === "aal2") {
                window.location.replace(next)
                return
            }
            const { data: factors, error: listError } = await supabase.auth.mfa.listFactors()
            if (listError) throw listError
            const verified = factors.totp.find((f) => f.status === "verified")
            if (verified) {
                if (!cancelled) setStage({ kind: "verify", factorId: verified.id })
                return
            }
            // Drop half-finished setups from earlier visits, then start a new one
            for (const f of factors.all.filter((f) => f.factor_type === "totp" && f.status !== "verified")) {
                await supabase.auth.mfa.unenroll({ factorId: f.id })
            }
            const { data, error: enrollError } = await supabase.auth.mfa.enroll({
                factorType: "totp",
                friendlyName: `Authenticator ${new Date().toISOString().slice(0, 10)}`,
            })
            if (enrollError) throw enrollError
            if (!cancelled) setStage({ kind: "setup", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret })
        })().catch((e: unknown) => {
            if (!cancelled) setStage({ kind: "error", message: e instanceof Error ? e.message : "Two-factor sign-in isn't available right now." })
        })
        return () => {
            cancelled = true
        }
    }, [next])

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (stage.kind !== "verify" && stage.kind !== "setup") return
        const clean = code.replace(/\s+/g, "")
        if (!/^\d{6}$/.test(clean)) {
            setError("Enter the 6-digit code from your authenticator app.")
            return
        }
        setBusy(true)
        setError(null)
        const { error: verifyError } = await createClient().auth.mfa.challengeAndVerify({ factorId: stage.factorId, code: clean })
        if (verifyError) {
            setBusy(false)
            setCode("")
            setError(verifyError.message.toLowerCase().includes("invalid") ? "That code didn't match. Check the time on your phone and try the newest code." : verifyError.message)
            return
        }
        // Full load so the server sees the upgraded session
        window.location.replace(next)
    }

    return (
        <div className="space-y-6">
            <div className="space-y-2 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <ShieldCheck className="h-5 w-5" aria-hidden="true" />
                </div>
                <h1 className="text-2xl font-bold tracking-tight">
                    {stage.kind === "setup" ? "Set up two-factor sign-in" : "Two-factor sign-in"}
                </h1>
                <p className="text-sm text-muted-foreground">
                    {stage.kind === "setup"
                        ? "Your account needs an authenticator app (such as Google Authenticator, Microsoft Authenticator or 1Password)."
                        : "Enter the 6-digit code from your authenticator app."}
                </p>
            </div>

            {stage.kind === "loading" && (
                <div className="flex justify-center py-8 text-muted-foreground" role="status">
                    <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span className="sr-only">Loading</span>
                </div>
            )}

            {stage.kind === "error" && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{stage.message}</AlertDescription>
                </Alert>
            )}

            {stage.kind === "setup" && (
                <ol className="space-y-3 text-sm">
                    <li>1. In your authenticator app, add an account and scan this code.</li>
                    <li className="flex justify-center">
                        <Image src={stage.qr} alt="QR code for your authenticator app" width={176} height={176} unoptimized className="rounded-md border bg-white p-2" />
                    </li>
                    <li>
                        Can&apos;t scan? Enter this key instead:
                        <code className="mt-1 block break-all rounded bg-muted px-2 py-1 font-mono text-xs select-all">{stage.secret}</code>
                    </li>
                    <li>2. Enter the 6-digit code the app shows.</li>
                </ol>
            )}

            {(stage.kind === "verify" || stage.kind === "setup") && (
                <form onSubmit={submit} className="space-y-4">
                    {error && (
                        <Alert variant="destructive">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="space-y-2">
                        <Label htmlFor="totp">Authentication code</Label>
                        <Input
                            id="totp"
                            name="totp"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            pattern="[0-9 ]*"
                            maxLength={7}
                            autoFocus
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="6-digit code"
                            className="h-10 text-center font-mono tracking-[0.3em]"
                        />
                    </div>
                    <Button type="submit" className="h-10 w-full" disabled={busy}>
                        {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                        {stage.kind === "setup" ? "Turn on and continue" : "Verify"}
                    </Button>
                </form>
            )}

            <form action={logout} className="text-center">
                <button type="submit" className="text-sm text-muted-foreground underline-offset-4 hover:text-primary hover:underline">
                    Sign out
                </button>
            </form>
            {stage.kind === "verify" && (
                <p className="text-center text-xs text-muted-foreground">
                    Lost your phone? Contact Genesoft support to reset two-factor sign-in for your account.
                </p>
            )}
        </div>
    )
}
