"use client"

import { useState } from "react"
import { toast } from "sonner"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { setTeamMemberActive, updateTeamMemberRole, type TeamMember, type TeamRole } from "@/app/actions/settings/team"

const ROLE_OPTIONS: { value: TeamRole; label: string; description: string }[] = [
    { value: "ADMIN", label: "Admin", description: "Everything, including workspace settings and credentials" },
    { value: "MANAGER", label: "Manager", description: "Delete, void, approve, finance controls, HR and payroll" },
    { value: "USER", label: "User", description: "Create and edit day-to-day records" },
    { value: "VIEWER", label: "Viewer", description: "Read only" },
]

export default function TeamTab({ initialMembers }: { initialMembers: TeamMember[] }) {
    const [members, setMembers] = useState(initialMembers)
    const [pendingId, setPendingId] = useState<string | null>(null)

    const patch = (id: string, changes: Partial<TeamMember>) =>
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)))

    const handleRoleChange = async (member: TeamMember, role: TeamRole) => {
        setPendingId(member.id)
        const result = await updateTeamMemberRole(member.id, role)
        setPendingId(null)
        if (!result.success) {
            toast.error(result.error || "Failed to update role")
            return
        }
        patch(member.id, { role })
        toast.success(`${member.fullName || member.email} is now ${role.toLowerCase()}`)
    }

    const handleStatusChange = async (member: TeamMember, isActive: boolean) => {
        setPendingId(member.id)
        const result = await setTeamMemberActive(member.id, isActive)
        setPendingId(null)
        if (!result.success) {
            toast.error(result.error || "Failed to update status")
            return
        }
        patch(member.id, { isActive })
        toast.success(`${member.fullName || member.email} ${isActive ? "reactivated" : "deactivated"}`)
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Team & Roles</CardTitle>
                <CardDescription>
                    Choose what each person in this workspace can do. Deactivated members are signed out and can&apos;t log in.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    {ROLE_OPTIONS.map((r) => (
                        <div key={r.value} className="rounded-lg border bg-muted/20 p-3">
                            <p className="text-sm font-semibold">{r.label}</p>
                            <p className="text-xs text-muted-foreground mt-1">{r.description}</p>
                        </div>
                    ))}
                </div>

                <div className="rounded-lg border overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Member</TableHead>
                                <TableHead className="w-[180px]">Role</TableHead>
                                <TableHead className="w-[120px]">Active</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {members.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={3} className="text-center text-sm text-muted-foreground py-8">
                                        No team members found.
                                    </TableCell>
                                </TableRow>
                            )}
                            {members.map((m) => {
                                const locked = m.isSelf || m.role === "SUPER_ADMIN"
                                const busy = pendingId === m.id
                                return (
                                    <TableRow key={m.id} className={m.isActive ? "" : "opacity-60"}>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{m.fullName || m.email}</span>
                                                {m.isSelf && <Badge variant="secondary">You</Badge>}
                                            </div>
                                            {m.fullName && <p className="text-xs text-muted-foreground">{m.email}</p>}
                                        </TableCell>
                                        <TableCell>
                                            {locked ? (
                                                <Badge variant="outline">{m.role.replace("_", " ")}</Badge>
                                            ) : (
                                                <Select
                                                    value={m.role}
                                                    disabled={busy}
                                                    onValueChange={(v) => handleRoleChange(m, v as TeamRole)}
                                                >
                                                    <SelectTrigger className="h-8">
                                                        <SelectValue />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        {ROLE_OPTIONS.map((r) => (
                                                            <SelectItem key={r.value} value={r.value}>
                                                                {r.label}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={m.isActive}
                                                disabled={locked || busy}
                                                onCheckedChange={(checked) => handleStatusChange(m, checked)}
                                                aria-label={`${m.isActive ? "Deactivate" : "Reactivate"} ${m.fullName || m.email}`}
                                            />
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    )
}
