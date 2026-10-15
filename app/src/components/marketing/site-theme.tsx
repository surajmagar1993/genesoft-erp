"use client"

import { useCallback, useSyncExternalStore } from "react"
import { Moon, Sun } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * The public website's light/dark theme, separate from the app's: it follows
 * the visitor's device until they pick one, and the choice is remembered in
 * this browser ("site-theme" in localStorage). The class goes on the
 * #site-root wrapper (see globals.css .site / .site.dark).
 */
export type SiteThemeChoice = "light" | "dark" | "system"

const KEY = "site-theme"
const ROOT_ID = "site-root"

/** Runs before the page paints, so there is no flash of the wrong theme. */
export const SITE_THEME_SCRIPT = `(function(){try{var c=localStorage.getItem("${KEY}");var d=c==="dark"||(c!=="light"&&window.matchMedia("(prefers-color-scheme: dark)").matches);var r=document.getElementById("${ROOT_ID}");if(r){r.classList.remove("light","dark");r.classList.add(d?"dark":"light");}}catch(e){}})();`

function readChoice(): SiteThemeChoice {
    try {
        const c = localStorage.getItem(KEY)
        return c === "light" || c === "dark" ? c : "system"
    } catch {
        return "system"
    }
}

function resolve(choice: SiteThemeChoice): "light" | "dark" {
    return choice === "dark" || (choice === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches) ? "dark" : "light"
}

function apply(choice: SiteThemeChoice) {
    const root = document.getElementById(ROOT_ID)
    root?.classList.remove("light", "dark")
    root?.classList.add(resolve(choice))
}

// One small external store: the saved choice plus the device setting
function subscribe(onChange: () => void) {
    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const onDevice = () => {
        if (readChoice() === "system") apply("system")
        onChange()
    }
    mq.addEventListener("change", onDevice)
    window.addEventListener("site-theme", onChange)
    window.addEventListener("storage", onChange)
    return () => {
        mq.removeEventListener("change", onDevice)
        window.removeEventListener("site-theme", onChange)
        window.removeEventListener("storage", onChange)
    }
}

const snapshot = () => `${readChoice()}|${resolve(readChoice())}`
const serverSnapshot = () => "system|light"

export function useSiteTheme() {
    const [choice, resolved] = useSyncExternalStore(subscribe, snapshot, serverSnapshot).split("|") as [SiteThemeChoice, "light" | "dark"]

    const pick = useCallback((next: SiteThemeChoice) => {
        try {
            if (next === "system") localStorage.removeItem(KEY)
            else localStorage.setItem(KEY, next)
        } catch {
            // Private mode: the choice lasts for this page only
        }
        apply(next)
        window.dispatchEvent(new Event("site-theme"))
    }, [])

    return { choice, resolved, pick }
}

/** Header button: switches between light and dark. */
export function SiteThemeToggle({ className }: { className?: string }) {
    const { resolved, pick } = useSiteTheme()
    const next = resolved === "dark" ? "light" : "dark"
    return (
        <button
            type="button"
            onClick={() => pick(next)}
            aria-label={`Switch to ${next} theme`}
            className={cn(
                "inline-flex h-10 w-10 items-center justify-center rounded-[10px] border border-s-border bg-s-card text-s-ink transition-colors hover:border-s-border-strong",
                className
            )}
        >
            {resolved === "dark" ? <Sun className="h-[18px] w-[18px]" /> : <Moon className="h-[18px] w-[18px]" />}
        </button>
    )
}

/** Phone menu: Light / Dark / Device. */
export function SiteThemePicker() {
    const { choice, pick } = useSiteTheme()
    const options: { value: SiteThemeChoice; label: string }[] = [
        { value: "light", label: "Light" },
        { value: "dark", label: "Dark" },
        { value: "system", label: "Device" },
    ]
    return (
        <div role="group" aria-label="Theme" className="flex overflow-hidden rounded-[10px] border border-s-border text-sm">
            {options.map((o) => (
                <button
                    key={o.value}
                    type="button"
                    aria-pressed={choice === o.value}
                    onClick={() => pick(o.value)}
                    className={cn("h-10 px-3 text-s-text", choice === o.value && "bg-s-border font-semibold text-s-ink")}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}
