"use client"

import { useLayoutEffect } from "react"
import { SITE_ROOT_ID } from "@/lib/site-theme-script"

/**
 * Keeps the public website in the visitor's device theme: applies it when the website is opened
 * by in-app navigation (the layout's pre-paint script only runs on a full page load) and follows
 * the device when it switches between light and dark (e.g. at sunset). Renders nothing.
 */
export function SiteThemeSync() {
    useLayoutEffect(() => {
        const mq = window.matchMedia("(prefers-color-scheme: dark)")
        const apply = () => {
            const root = document.getElementById(SITE_ROOT_ID)
            root?.classList.remove("light", "dark")
            root?.classList.add(mq.matches ? "dark" : "light")
        }
        apply()
        mq.addEventListener("change", apply)
        return () => mq.removeEventListener("change", apply)
    }, [])
    return null
}
