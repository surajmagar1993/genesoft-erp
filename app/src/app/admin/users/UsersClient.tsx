"use client"
import { unwrap } from "@/lib/action-result"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Building2, Check, Clock, Copy, Mail, MoreHorizontal, Search, UserCheck, Users, UserX } from "lucide-react"
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
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toggleUserStatus, type PlatformTeam, type PlatformTeamMember } from "@/app/actions/saas/admin"
import { toast } from "sonner"
import { format } from "date-fns"

interface UsersClientProps {
    teams: PlatformTeam[]
    totalUsers: number
    totalTenants: number
    tenantOptions: { id: string; name: string }[]
    searchQuery: string
    selectedRole: string
    selectedStatus: string
    selectedTenant: string
}

function roleBadge(m: PlatformTeamMember) {
    if (m.role === "SUPER_ADMIN") return { label: "Platform admin", className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30" }
    if (m.isAdmin) return { label: "Admin", className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30" }
    return { label: "Member", className: "bg-muted text-muted-foreground border-border" }
}

export function UsersClient({
    teams,
    totalUsers,
    totalTenants,
    tenantOptions,
    searchQuery: initSearch,
    selectedRole: initRole,
    selectedStatus: initStatus,
    selectedTenant: initTenant,
}: UsersClientProps) {
    const router = useRouter()
    const [search, setSearch] = useState(initSearch || "")
    const [isLoading, setIsLoading] = useState(false)
    const [copiedId, setCopiedId] = useState<string | null>(null)

    const go = (changes: Partial<Record<"search" | "role" | "status" | "tenant", string>>) => {
        const next = { search: search.trim(), role: initRole, status: initStatus, tenant: initTenant, ...changes }
        const params = new URLSearchParams()
        if (next.search) params.set("search", next.search)
        if (next.role && next.role !== "ALL") params.set("role", next.role)
        if (next.status && next.status !== "ALL") params.set("status", next.status)
        if (next.tenant) params.set("tenant", next.tenant)
        router.push(`/admin/users?${params.toString()}`)
    }

    const handleToggleStatus = async (user: PlatformTeamMember) => {
        try {
            setIsLoading(true)
            unwrap(await toggleUserStatus(user.id, !user.isActive))
            toast.success(`${user.fullName || user.email} ${user.isActive ? "suspended" : "activated"}`)
            router.refresh()
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Failed to update user status")
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

    const selectClass = "h-9 text-xs rounded-md border border-input bg-background px-3 py-1 shadow-sm w-full md:w-auto"

    return (
        <div className="space-y-6 max-w-7xl mx-auto px-4 pb-12">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-5">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Users by Business</h1>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Every business&apos;s team with the role and module access its admin has given. Only the business admin changes access (Settings → Team &amp; Access); you can suspend or reactivate accounts.
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="px-3 py-1 font-semibold border-primary/20 bg-primary/5">{totalUsers} users</Badge>
                    <Badge variant="outline" className="px-3 py-1 font-semibold border-primary/20 bg-primary/5">{totalTenants} businesses</Badge>
                </div>
            </div>

            {/* Filters */}
            <Card className="border-primary/10 shadow-sm bg-card/60 backdrop-blur">
                <CardContent className="p-4">
                    <form
                        onSubmit={(e) => {
                            e.preventDefault()
                            go({})
                        }}
                        className="flex flex-col md:flex-row items-center gap-3"
                    >
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, phone or business"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="pl-9 h-9 text-xs bg-background"
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row items-center gap-2 w-full md:w-auto">
                            <select value={initTenant} onChange={(e) => go({ tenant: e.target.value })} className={selectClass} aria-label="Business">
                                <option value="">All businesses</option>
                                {tenantOptions.map((t) => (
                                    <option key={t.id} value={t.id}>{t.name}</option>
                                ))}
                            </select>
                            <select value={initRole} onChange={(e) => go({ role: e.target.value })} className={selectClass} aria-label="Role">
                                <option value="ALL">All roles</option>
                                <option value="ADMIN">Business admins</option>
                                <option value="MEMBER">Members</option>
                                <option value="PLATFORM">Platform admins</option>
                            </select>
                            <select value={initStatus} onChange={(e) => go({ status: e.target.value })} className={selectClass} aria-label="Status">
                                <option value="ALL">All status</option>
                                <option value="ACTIVE">Active</option>
                                <option value="INACTIVE">Suspended</option>
                            </select>
                            <Button type="submit" size="sm" className="h-9 text-xs font-semibold px-4 w-full sm:w-auto">Filter</Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {teams.length === 0 && (
                <Card>
                    <CardContent className="h-40 flex items-center justify-center text-sm text-muted-foreground">No users match these filters.</CardContent>
                </Card>
            )}

            {teams.map(({ tenant, members, invites }) => (
                <Card key={tenant.id} className="border-primary/10 shadow-sm bg-card/50 overflow-hidden">
                    <CardHeader className="bg-muted/30 border-b pb-3">
                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div className="min-w-0">
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary shrink-0" />
                                    <Link href={`/admin/tenants/${tenant.id}`} className="truncate hover:underline">{tenant.name}</Link>
                                    {!tenant.isActive && <Badge variant="destructive" className="text-[10px]">Suspended</Badge>}
                                </CardTitle>
                                <CardDescription className="text-xs uppercase font-semibold mt-1">
                                    {tenant.plan} · {tenant.countryCode} · {members.length} {members.length === 1 ? "user" : "users"}
                                    {invites.length > 0 && ` · ${invites.length} pending ${invites.length === 1 ? "invite" : "invites"}`}
                                </CardDescription>
                            </div>
                            <Button variant="outline" size="sm" className="h-8 text-xs shrink-0" asChild>
                                <Link href={`/admin/tenants/${tenant.id}`}>View business</Link>
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow className="hover:bg-transparent">
                                    <TableHead className="min-w-[220px]">User</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead className="min-w-[240px]">Module access</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Joined</TableHead>
                                    <TableHead className="text-right pr-6">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">No users yet.</TableCell>
                                    </TableRow>
                                )}
                                {members.map((u) => {
                                    const badge = roleBadge(u)
                                    return (
                                        <TableRow key={u.id} className="hover:bg-primary/5 transition-colors">
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center font-bold text-xs text-primary shrink-0">
                                                        {(u.fullName || u.email || "U").substring(0, 2).toUpperCase()}
                                                    </div>
                                                    <div className="flex flex-col min-w-0">
                                                        <span className="font-semibold text-sm truncate">{u.fullName || "Unnamed user"}</span>
                                                        <span className="text-xs text-muted-foreground font-mono truncate">{u.email}</span>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={`text-[10px] font-bold uppercase whitespace-nowrap ${badge.className}`}>{badge.label}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground">{u.accessSummary}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-1.5">
                                                    <div className={`h-2 w-2 rounded-full ${u.isActive ? "bg-emerald-500" : "bg-rose-500"}`} />
                                                    <span className="text-xs font-medium">{u.isActive ? "Active" : "Suspended"}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{format(new Date(u.createdAt), "MMM d, yyyy")}</TableCell>
                                            <TableCell className="text-right pr-6">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLoading} aria-label="Account controls">
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-48">
                                                        <DropdownMenuLabel>Account Controls</DropdownMenuLabel>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem onClick={() => copyUserId(u.id)} className="gap-2 cursor-pointer text-xs">
                                                            {copiedId === u.id ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5 opacity-70" />}
                                                            Copy User ID
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem asChild className="gap-2 cursor-pointer text-xs">
                                                            <a href={`mailto:${u.email}`}>
                                                                <Mail className="h-3.5 w-3.5 opacity-70" />
                                                                Email user
                                                            </a>
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem
                                                            onClick={() => handleToggleStatus(u)}
                                                            className={`gap-2 cursor-pointer text-xs ${u.isActive ? "text-rose-600 focus:text-rose-600" : "text-emerald-600 focus:text-emerald-600"}`}
                                                        >
                                                            {u.isActive ? <UserX className="h-3.5 w-3.5" /> : <UserCheck className="h-3.5 w-3.5" />}
                                                            {u.isActive ? "Suspend account" : "Activate account"}
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                                {invites.map((i) => (
                                    <TableRow key={i.id} className="bg-muted/10">
                                        <TableCell>
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full border border-dashed flex items-center justify-center shrink-0">
                                                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-semibold text-sm truncate">{i.fullName}</span>
                                                    <span className="text-xs text-muted-foreground font-mono truncate">{i.email}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="text-[10px] font-bold uppercase whitespace-nowrap">{i.role === "ADMIN" ? "Admin" : "Member"}</Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{i.accessSummary}</TableCell>
                                        <TableCell>
                                            <Badge variant={i.expired ? "destructive" : "secondary"} className="text-[10px]">{i.expired ? "Invite expired" : "Invited"}</Badge>
                                        </TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">by {i.invitedByName}</TableCell>
                                        <TableCell />
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ))}

            <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Role and access changes are made by each business&apos;s admin in Settings → Team &amp; Access.
            </p>
        </div>
    )
}
