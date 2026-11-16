"use client"

import { useEffect, useRef } from "react"

/**
 * Holds the toaster in the browser's top layer (a manual popover), so toasts aren't hidden behind
 * an open modal <dialog>. Dialogs re-show it after they open (raiseToasts in ui/dialog.tsx).
 */
export function ToastLayer({ children }: { children: React.ReactNode }) {
    const ref = useRef<HTMLDivElement>(null)
    useEffect(() => {
        const el = ref.current
        if (el && typeof el.showPopover === "function" && !el.matches(":popover-open")) el.showPopover()
    }, [])
    return (
        <div ref={ref} id="toast-layer" popover="manual">
            {children}
        </div>
    )
}
