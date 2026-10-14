"use client"

import { useEffect } from "react"
import Link from "next/link"
import { AlertTriangle, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { reportClientError } from "@/lib/report-client-error"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
        reportClientError(error)
    }, [error])

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader className="space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center text-destructive">
                        <AlertTriangle className="h-6 w-6" />
                    </div>
                    <CardTitle>Something went wrong</CardTitle>
                    <CardDescription>
                        This page hit an unexpected error. Try again, or go back to the dashboard.
                        {error.digest && <span className="block mt-2 font-mono text-xs">Reference: {error.digest}</span>}
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex gap-2 justify-center">
                    <Button onClick={reset} className="gap-2">
                        <RotateCcw className="h-4 w-4" />
                        Try again
                    </Button>
                    <Button variant="outline" asChild>
                        <Link href="/crm/contacts">Go to dashboard</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
