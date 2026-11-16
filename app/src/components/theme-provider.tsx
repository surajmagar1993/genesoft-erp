"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

export function ThemeProvider({
    children,
    ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
    // The old light/dark toggle saved the choice under "theme"; the app now follows the device, so forget it
    React.useEffect(() => {
        try {
            localStorage.removeItem("theme")
        } catch {
            // storage blocked: nothing to clear
        }
    }, [])
    return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
