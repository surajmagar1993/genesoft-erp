import Link from "next/link"
import { Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export const metadata = {
    title: "Scheduled Maintenance | Genesoft ERP",
}

export default function MaintenancePage() {
    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
            <Card className="w-full max-w-md text-center">
                <CardHeader className="space-y-3">
                    <div className="mx-auto h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                        <Wrench className="h-6 w-6" />
                    </div>
                    <CardTitle>We&apos;re doing some maintenance</CardTitle>
                    <CardDescription>
                        Genesoft ERP is temporarily unavailable while we make improvements. Your data is safe. Please check back shortly.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Button variant="outline" asChild>
                        <Link href="/login">Back to sign in</Link>
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
