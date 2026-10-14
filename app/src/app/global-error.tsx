"use client"

import { useEffect } from "react"
import { reportClientError } from "@/lib/report-client-error"

// Last-resort boundary for errors in the root layout itself, so it can't rely on app styles.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
    useEffect(() => {
        reportClientError(error)
    }, [error])

    return (
        <html lang="en">
            <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0 }}>
                <div style={{ textAlign: "center", padding: 16 }}>
                    <h1 style={{ fontSize: 20 }}>Something went wrong</h1>
                    <p style={{ color: "#666" }}>Genesoft ERP couldn&apos;t load. Please try again.</p>
                    <button onClick={reset} style={{ padding: "8px 16px", cursor: "pointer" }}>
                        Try again
                    </button>
                </div>
            </body>
        </html>
    )
}
