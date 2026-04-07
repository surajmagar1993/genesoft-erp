import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, MapPin } from "lucide-react"

export const dynamic = "force-dynamic"

// Mock data until database wiring is requested
const regions = [
    { id: "reg_in", name: "India", code: "IN", status: "ACTIVE", servers: 3 },
    { id: "reg_us", name: "United States", code: "US", status: "ACTIVE", servers: 5 },
    { id: "reg_eu", name: "European Union", code: "EU", status: "ACTIVE", servers: 2 },
    { id: "reg_ae", name: "UAE / Middle East", code: "AE", status: "PENDING", servers: 0 },
]

export default async function RegionsPage() {
    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Global Regions</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage active regions and server deployments.
                    </p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {regions.map((region) => (
                    <Card key={region.id} className="relative overflow-hidden border-primary/10 shadow-sm">
                        <CardHeader className="bg-muted/30 pb-4">
                            <div className="flex items-center justify-between">
                                <Badge variant={region.status === "ACTIVE" ? "default" : "secondary"} className="text-[10px]">
                                    {region.status}
                                </Badge>
                                <Globe className="h-4 w-4 text-muted-foreground" />
                            </div>
                            <CardTitle className="mt-2">{region.name}</CardTitle>
                            <CardDescription>Region Code: {region.code}</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-4 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-4 w-4" />
                                <span>{region.servers} active servers</span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
