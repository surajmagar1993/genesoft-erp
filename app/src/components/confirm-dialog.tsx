"use client"

import { useEffect, useState } from "react"
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
import { buttonVariants } from "@/components/ui/button"

export interface ConfirmOptions {
    title?: string
    description?: string
    confirmLabel?: string
    cancelLabel?: string
    /** Red confirm button (delete, void, discard…). Guessed from the wording when left out. */
    destructive?: boolean
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void }

let show: ((p: Pending) => void) | null = null

const DESTRUCTIVE = /\b(delete|remove|void|discard|cancel|reset|lock|finali[sz]e|prune|revoke)\b/i

/**
 * Asks the person to confirm, in the app's own dialog (not the browser's
 * pop-up): `if (!(await confirmAction("Delete this bill?"))) return`.
 * Cancel is focused first; Escape and clicking outside cancel. Needs a
 * <ConfirmHost /> on the page (the app and Super Admin shells have one);
 * without it, the browser's own confirm is used.
 */
export function confirmAction(input: string | ConfirmOptions): Promise<boolean> {
    const opts: ConfirmOptions = typeof input === "string" ? { description: input } : input
    if (!show) return Promise.resolve(typeof window !== "undefined" && window.confirm(opts.description || opts.title || "Are you sure?"))
    return new Promise((resolve) => show!({ ...opts, resolve }))
}

export function ConfirmHost() {
    const [pending, setPending] = useState<Pending | null>(null)
    useEffect(() => {
        show = (p) => setPending(p)
        return () => {
            show = null
        }
    }, [])

    const close = (ok: boolean) => {
        pending?.resolve(ok)
        setPending(null)
    }
    const text = `${pending?.title ?? ""} ${pending?.description ?? ""} ${pending?.confirmLabel ?? ""}`
    const destructive = pending?.destructive ?? DESTRUCTIVE.test(text)
    const verb = text.match(DESTRUCTIVE)?.[1]

    return (
        <AlertDialog open={!!pending} onOpenChange={(open) => !open && close(false)}>
            <AlertDialogContent onOpenAutoFocus={(e) => {
                // Cancel first, so Enter never confirms by accident
                e.preventDefault()
                ;(e.currentTarget as HTMLElement | null)?.querySelector<HTMLElement>("[data-confirm-cancel]")?.focus()
            }}>
                <AlertDialogHeader>
                    <AlertDialogTitle>{pending?.title || (destructive ? "Are you sure?" : "Please confirm")}</AlertDialogTitle>
                    {pending?.description && <AlertDialogDescription className="whitespace-pre-line">{pending.description}</AlertDialogDescription>}
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel data-confirm-cancel onClick={() => close(false)}>
                        {pending?.cancelLabel || "Cancel"}
                    </AlertDialogCancel>
                    <AlertDialogAction
                        className={destructive ? buttonVariants({ variant: "destructive" }) : undefined}
                        onClick={() => close(true)}
                    >
                        {pending?.confirmLabel || (verb ? verb.charAt(0).toUpperCase() + verb.slice(1).toLowerCase() : "Continue")}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    )
}
