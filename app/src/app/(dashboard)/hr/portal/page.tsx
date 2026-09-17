import React from "react"
import { getEmployeePortalData } from "@/app/actions/hr/portal"
import { PortalClient } from "./portal-client"
import { Card, CardContent } from "@/components/ui/card"
import { AlertCircle, UserX } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export const dynamic = "force-dynamic"

export default async function EmployeePortalPage() {
    const data = await getEmployeePortalData()

    if (!data) {
        return (
            <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
                <Card className="p-8 border-dashed">
                    <CardContent className="space-y-4 pt-4">
                        <div className="h-12 w-12 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-600 flex items-center justify-center mx-auto">
                            <UserX className="h-6 w-6" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">No Employee Profile Linked</h2>
                        <p className="text-sm text-muted-foreground">
                            Your logged-in user account is not currently linked to an active staff member in the Employee Directory.
                        </p>
                        <div className="pt-2">
                            <Link href="/hr">
                                <Button>Go to Employee Directory</Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return <PortalClient initialData={data} />
}
