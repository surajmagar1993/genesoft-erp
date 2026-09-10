import { getTenants } from "@/app/actions/saas/admin"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Clock, Plus } from "lucide-react"
import { format } from "date-fns"
import { TenantActionsDropdown } from "@/components/admin/tenant-actions-dropdown"
import { TenantFilters } from "@/components/admin/tenant-filters"
import { Button } from "@/components/ui/button"
import Link from "next/link"

export const dynamic = "force-dynamic"

export default async function TenantsPage(props: { 
  searchParams: Promise<{ [key: string]: string | string[] | undefined }> 
}) {
    const searchParams = await props.searchParams
    const tenants = await getTenants({
        search: searchParams.search as string,
        plan: searchParams.plan as string,
        status: searchParams.status as string
    })

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Tenant Directory</h1>
                    <p className="text-muted-foreground mt-1">
                        Overview of all businesses registered across the platform.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <Badge variant="outline" className="px-3 py-1 font-semibold border-primary/20 bg-primary/5 hidden sm:inline-flex">
                        {tenants.length} Total Businesses
                    </Badge>
                    <Link href="/admin/tenants/new">
                        <Button className="gap-2 shadow-sm font-semibold">
                            <Plus className="h-4 w-4" />
                            New Tenant
                        </Button>
                    </Link>
                </div>
            </div>

            <TenantFilters />

            <Card className="border-primary/10 shadow-lg overflow-hidden bg-card/50 backdrop-blur">
                <CardHeader className="bg-muted/30 border-b">
                    <CardTitle>Subscriber List</CardTitle>
                    <CardDescription>
                        Manage subscription tiers, trial periods, and account access.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[300px]">Company</TableHead>
                                <TableHead>Plan</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Trial Ends</TableHead>
                                <TableHead className="text-right pr-6">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {tenants.map((tenant: any) => (
                                <TableRow key={tenant.id} className="group hover:bg-primary/5 transition-colors">
                                    <TableCell>
                                        <Link href={`/admin/tenants/${tenant.id}`} className="flex items-center gap-3 group-hover:text-primary transition-colors">
                                            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center font-bold text-primary group-hover:scale-110 transition-transform">
                                                {tenant.name.substring(0, 2).toUpperCase()}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-sm hover:underline">{tenant.name}</span>
                                                <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-tight">
                                                    ID: {tenant.id.split('-')[0]}...
                                                </span>
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col gap-1">
                                            <Badge variant={tenant.plan === "FREE" ? "outline" : "default"} className="w-fit text-[10px]">
                                                {tenant.plan}
                                            </Badge>
                                            {tenant.isTrial && (
                                                <span className="text-[10px] text-amber-500 font-bold uppercase tracking-widest">
                                                    Trial Active
                                                </span>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={`h-2.5 w-2.5 rounded-full ${tenant.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                                            <span className="text-sm font-medium">
                                                {tenant.isActive ? "Active" : "Suspended"}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <Clock className="h-3 w-3" />
                                            {tenant.trialEndsAt ? format(new Date(tenant.trialEndsAt), "MMM d, yyyy") : "N/A"}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <TenantActionsDropdown tenant={tenant} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
