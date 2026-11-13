import type { Page } from "@playwright/test"

/** Browser errors worth failing on (third-party noise filtered out). */
export function collectErrors(page: Page): string[] {
    const errors: string[] = []
    const noise = /challenges\.cloudflare\.com|Turnstile|favicon|Download the React DevTools|net::ERR_ABORTED/i
    page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`))
    page.on("console", (msg) => {
        if (msg.type() === "error" && !noise.test(msg.text())) errors.push(`console: ${msg.text()}`)
    })
    page.on("response", (res) => {
        if (res.status() >= 500 && !noise.test(res.url())) errors.push(`${res.status()} ${res.url()}`)
    })
    return errors
}

/** The app's error screens (error.tsx / global-error.tsx) and Next.js's own. */
export const ERROR_SCREEN = /Something went wrong|Application error|This page couldn.t load/i
