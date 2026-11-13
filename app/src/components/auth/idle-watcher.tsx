"use client"

import { useEffect } from "react"

const PING_EVERY_MS = 60_000
const EVENTS = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const

type ActivityReply = { enabled?: boolean; expired?: boolean; remainingMs?: number; timeoutMinutes?: number }

/**
 * Signs the user out after the inactivity timeout set in Admin → Security.
 * Real input (typing, clicking, scrolling) tells the server at most once a
 * minute; background polling never does. When the time runs out the server
 * ends the session and this sends the user to the sign-in page.
 */
export function IdleWatcher() {
    useEffect(() => {
        let stopped = false
        let lastInput = Date.now()
        let lastPing = 0
        let timer: number | undefined

        const expire = (minutes?: number) => {
            stopped = true
            const msg = minutes
                ? `You were signed out after ${minutes} minutes without activity. Please sign in again.`
                : "Your session ended. Please sign in again."
            window.location.assign(`/login?message=${encodeURIComponent(msg)}`)
        }

        const call = async (active: boolean): Promise<ActivityReply | null> => {
            try {
                const res = await fetch("/api/session/activity", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ active }),
                    cache: "no-store",
                })
                if (res.status === 401) return { expired: true }
                if (!res.ok) return null
                return (await res.json()) as ActivityReply
            } catch {
                return null // offline: try again later
            }
        }

        const schedule = (ms: number) => {
            window.clearTimeout(timer)
            if (!stopped) timer = window.setTimeout(check, Math.max(5_000, ms + 2_000))
        }

        const handle = (reply: ActivityReply | null) => {
            if (stopped) return
            if (!reply) return schedule(PING_EVERY_MS)
            if (reply.expired) return expire(reply.timeoutMinutes)
            if (reply.enabled === false) return stopListening()
            schedule(reply.remainingMs ?? PING_EVERY_MS)
        }

        async function check() {
            // Input since the last ping counts as activity
            handle(await call(lastInput > lastPing))
            if (lastInput > lastPing) lastPing = Date.now()
        }

        const onInput = () => {
            lastInput = Date.now()
            if (lastInput - lastPing >= PING_EVERY_MS) {
                lastPing = lastInput
                call(true).then(handle)
            }
        }

        const stopListening = () => {
            stopped = true
            window.clearTimeout(timer)
            EVENTS.forEach((e) => window.removeEventListener(e, onInput))
        }

        EVENTS.forEach((e) => window.addEventListener(e, onInput, { passive: true }))
        lastPing = Date.now()
        call(true).then(handle)

        return stopListening
    }, [])

    return null
}
