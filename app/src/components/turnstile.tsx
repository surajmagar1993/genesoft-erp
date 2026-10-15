"use client"

import { useEffect, useRef } from "react"

type TurnstileApi = {
    render: (el: HTMLElement, opts: Record<string, unknown>) => string
    reset: (id?: string) => void
    remove: (id: string) => void
}
declare global {
    interface Window {
        turnstile?: TurnstileApi
    }
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"

let loading: Promise<void> | null = null
function loadScript(): Promise<void> {
    if (window.turnstile) return Promise.resolve()
    loading ??= new Promise((resolve, reject) => {
        const s = document.createElement("script")
        s.src = SCRIPT
        s.async = true
        s.onload = () => resolve()
        s.onerror = () => {
            loading = null
            reject(new Error("Turnstile didn't load"))
        }
        document.head.appendChild(s)
    })
    return loading
}

/** Asks every spam check on the page for a fresh token (they're single-use): call after a failed submit. */
export function resetTurnstile() {
    try {
        window.turnstile?.reset()
    } catch {
        // no widget on the page
    }
}

/**
 * Cloudflare Turnstile spam check (src/lib/turnstile.ts). Put it inside a
 * <form>: it adds a hidden "cf-turnstile-response" field the server checks.
 * Usually invisible; renders nothing until the site key is set.
 */
export function Turnstile({ className }: { className?: string }) {
    const box = useRef<HTMLDivElement>(null)
    useEffect(() => {
        if (!SITE_KEY || !box.current) return
        let id: string | undefined
        let cancelled = false
        loadScript()
            .then(() => {
                if (cancelled || !box.current || !window.turnstile) return
                id = window.turnstile.render(box.current, { sitekey: SITE_KEY, theme: "auto", size: "flexible", appearance: "interaction-only" })
            })
            .catch((err) => console.warn(err))
        return () => {
            cancelled = true
            if (id) window.turnstile?.remove(id)
        }
    }, [])
    if (!SITE_KEY) return null
    return <div ref={box} className={className} />
}
