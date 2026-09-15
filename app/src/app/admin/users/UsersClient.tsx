"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { 
    Users, 
    Search, 
    ShieldCheck, 
    ShieldAlert, 
    Building2, 
    UserCheck, 
    UserX, 
    MoreHorizontal, 
    Copy, 
    Check, 
    Clock, 
    Mail, 
    Phone,
    Filter
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuSeparator, 
    DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { toggleUserStatus, updateUserRole } from "@/app/actions/saas/admin"
import { toast } from "sonner"
import { format } from "date-fns"

interface UsersClientProps {
    initialUsers: any[]
    totalCount: number
    searchQuery: string
    selectedRole: string
    selectedStatus: string
}

export function UsersClient({
    initialUsers,
    totalCount,
    searchQuery: initSearch,
    selectedRole: initRole,
    selectedStatus: initStatus
}: UsersClientProps) {
    const router = useRouter()
    const [search, setSearch] = useState(initSearch || "")
    const [role, setRole] = useState(initRole || "ALL")
    const [status, setStatus] = useState(initStatus || "ALL")
    const [isLoading, setIsLoading] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (search.trim()) params.set("search", search.trim())
        if (role !== "ALL") params.set("role", role)
        if (status !== "ALL") params.set("status", status)
        router.push(`/admin/users?${params.toString()}`)
    }

    const handleRoleFilterChange = (newRole: string) => {
        setRole(newRole)
        const params = new URLSearchParams()
        if (search.trim()) params.set("search", search.trim())
        if (newRole !== "ALL") params.set("role", newRole)
        if (status !== "ALL") params.set("status", status)
        router.push(`/admin/users?${params.toString()}`)
    }

    const handleStatusFilterChange = (newStatus: string) => {
        setStatus(newStatus)
        const params = new URLSearchParams()
        if (search.trim()) params.set("search", search.trim())
        if (role !== "ALL") params.set("role", role)
        if (newStatus !== "ALL") params.set("status", newStatus)
        router.push(`/admin/users?${params.toString()}`)
    }

    const handleToggleStatus = async (user: any) => {
        try {
            setIsLoading(true)
            await toggleUserStatus(user.id, !user.isActive)
            toast.success(`User ${user.isActive ? 'suspended' : 'activated'} successfully`)
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error?.message || "Failed to update user status")
        } finally {
            setIsLoading(false)
        }
    }

    const handleRoleChange = async (userId: string, newRole: string) => {
        try {
            setIsLoading(true)
            await updateUserRole(userId, newRole)
            toast.success(`User role updated to ${newRole}`)
            router.refresh()
        } catch (error: any) {
            console.error(error)
            toast.error(error?.message || "Failed to update user role")
        } finally {
            setIsLoading(false)
        }
    }

    const copyUserId = (id: string) => {
        navigator.clipboard.writeText(id)
        setCopiedId(id)
        toast.success("User ID copied to clipboard")
        setTimeout(() => setCopiedId(null), 2000)
    }

    const getRoleBadgeVariant = (userRole: string) => {
        switch (userRole) {
            case "SUPER_ADMIN":
                return "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30"
            case "ADMIN":
                return "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30"
            case "MANAGER":
                return "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30"
            default:
                return "bg-muted text-muted-foreground border-border"
        }
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Global User Directory</h1>
                        <Badge variant="outline" className="text-[10px] font-bold border-primary/20 bg-primary/5">
                            Cross-Tenant
                        </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manage all platform users, assign authorization roles, and administer account access.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Badge variant="outline" className="px-3 py-1 font-semibold border-primary/20 bg-primary/5">
                        {totalCount} Total Accounts
                    </Badge>
                </div>
            </div>

            {/* Filter & Search Controls */}
            <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                <CardContent className="p-4">
                    <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-3">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email address, or phone..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-9 h-9 text-xs bg-background"
                            />
                        </div>

                        <div className="flex items-center gap-2 w-full md:w-auto">
                            <select
                                value={role}
                                onChange={e => handleRoleFilterChange(e.target.value)}
                                className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 shadow-sm w-full md:w-40"
                            >
                                <option value="ALL">All Roles</option>
                                <option value="SUPER_ADMIN">Super Admin</option>
                                <option value="ADMIN">Tenant Admin</option>
                                <option value="MANAGER">Manager</option>
                                <option value="STAFF">Staff / User</option>
                            </select>

                            <select
                                value={status}
                                onChange={e => handleStatusFilterChange(e.target.value)}
                                className="h-9 text-xs rounded-md border border-input bg-background px-3 py-1 shadow-sm w-full md:w-36"
                            >
                                <option value="ALL">All Status</option>
                                <option value="ACTIVE">Active Only</option>
                                <option value="INACTIVE">Suspended</option>
                            </select>

                            <Button type="submit" size="sm" className="h-9 text-xs font-semibold px-4">
                                Filter
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Users Table */}
            <Card className="border-primary/10 shadow-lg bg-card/50 backdrop-blur overflow-hidden">
                <CardHeader className="bg-muted/30 border-b pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Users className="h-4 w-4 text-primary" />
                        Platform Accounts Ledger
                    </CardTitle>
                    <CardDescription>
                        User identities, tenant linkages, authorization levels, and active login statuses.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent">
                                <TableHead className="w-[240px]">User Profile</TableHead>
                                <TableHead>Parent Tenant</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right pr-6">Action</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {initialUsers.length > 0 ? (
                                initialUsers.map((u: any) => (
                                    <TableRow key={u.id} className="hover:bg-primary/5 transition-colors">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                                    {(u.fullName || u.email || "U").substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-sm truncate text-foreground">
                                                        {u.fullName || "Unnamed User"}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground font-mono truncate">
                                                        {u.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>

                                        <TableCell>
                                            {u.tenant ? (
                                                <Link 
                                                    href={`/admin/tenants/${u.tenant.id}`}
                                                    className="flex items-center gap-1.5 hover:text-primary transition-colors group"
                                                >
                                                    <Building2 className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary shrink-0" />
                                                    <div className="flex flex-col">
                                                        <span className="text-xs font-semibold group-hover:underline">
                                                            {u.tenant.name}
                                                        </span>
                                                        <span className="text-[10px] text-muted-foreground uppercase font-bold">
                                                            {u.tenant.plan} • {u.tenant.countryCode}
                                                        </span>
                                                    </div>
                                                </Link>
                                            ) : (
                                                <span className="text-xs text-muted-foreground font-mono">Platform Admin</span>
                                            )}
                                        </TableCell>

                                        <TableCell>
                                            <Badge variant="outline" className={`text-[10px] font-black uppercase ${getRoleBadgeVariant(u.role)}`}>
                                                {u.role}
                                            </Badge>
                                        </TableCell>

                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <div className={`h-2 w-2 rounded-full ${u.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                                                <span className="text-xs font-medium">
                                                    {u.isActive ? "Active" : "Suspended"}
                                                </span>
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {format(new Date(u.createdAt), "MMM d, yyyy")}
                                        </TableCell>

                                        <TableCell className="text-right pr-6">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-primary/10 hover:text-primary">
                                                        <MoreHorizontal className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-48">
                                                    <DropdownMenuLabel>Account Controls</DropdownMenuLabel>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        onClick={() => copyUserId(u.id)}
                                                        className="gap-2 cursor-pointer text-xs"
                                                    >
                                                        {copiedId === u.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 opacity-70" />}
                                                        Copy User ID
                                                    </DropdownMenuItem>

                                                    {u.tenant && (
                                                        <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
                                                            <Link href={`/admin/tenants/${u.tenant.id}`}>
                                                                <Building2 className="h-3.5 w-3.5 opacity-70" />
                                                                View Tenant Profile
                                                            </Link>
                                                        </DropdownMenuItem>
                                                    )}

                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase">
                                                        Set Role
                                                    </DropdownMenuLabel>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleRoleChange(u.id, "ADMIN")}
                                                        className="gap-2 cursor-pointer text-xs"
                                                    >
                                                        Promote to ADMIN
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem 
                                                        onClick={() => handleRoleChange(u.id, "STAFF")}
                                                        className="gap-2 cursor-pointer text-xs"
                                                    >
                                                        Set to STAFF / USER
                                                    </DropdownMenuItem>

                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        onClick={() => handleToggleStatus(u)}
                                                        className={u.isActive ? "text-rose-600 focus:text-rose-600 gap-2 cursor-pointer text-xs" : "text-emerald-600 focus:text-emerald-600 gap-2 cursor-pointer text-xs"}
                                                    >
                                                        {u.isActive ? (
                                                            <>
                                                                <UserX className="h-3.5 w-3.5" />
                                                                Suspend Account
                                                            </>
                                                        ) : (
                                                            <>
                                                                <UserCheck className="h-3.5 w-3.5" />
                                                                Activate Account
                                                            </>
                                                        )}
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-48 text-center text-muted-foreground text-sm">
                                        No users found matching the filter criteria.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
