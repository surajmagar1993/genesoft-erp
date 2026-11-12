"use client"

import { useEffect, useState } from "react"

/**
 * A date and time in the viewer's own time zone and locale. The server can't
 * know those, so the server render shows a neutral date and the browser fills
 * in the local one after load (no hydration mismatch).
 */
export function LocalDateTime({ value }: { value: string | Date }) {
    const iso = typeof value === "string" ? value : value.toISOString()
    const [text, setText] = useState(() => iso.slice(0, 10))
    useEffect(() => {
        const d = new Date(iso)
        // eslint-disable-next-line react-hooks/set-state-in-effect -- the viewer's locale is only known in the browser
        if (!Number.isNaN(d.getTime())) setText(d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }))
    }, [iso])
    return <time dateTime={iso}>{text}</time>
}
