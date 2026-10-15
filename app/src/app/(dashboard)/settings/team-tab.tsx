"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Copy, Loader2, Mail, RefreshCw, ShieldCheck, UserPlus, X } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import {
    inviteTeamMember,
    resendInvite,
    revokeInvite,
    setTeamMemberActive,
    updateTeamMember,
    type PendingInvite,
    type TeamMember,
    type TeamRole,
} from "@/app/actions/settings/team"
import { ACCESS_LEVELS, MODULES, summarizeAccess, uniformAccess, type AccessLevel, type ModuleAccess } from "@/lib/access"

const ROLE_HELP: Record<TeamRole, string> = {
    ADMIN: "Everything, including team, workspace settings and credentials",
    MEMBER: "Only the modules you allow below",
}

const LEVEL_HELP = "View: read only · Edit: create and change records · Full: also delete, void and approve"

/** One row per module with a level picker. */
function AccessMatrix({ value, onChange, disabled, planModules }: { value: ModuleAccess; onChange: (v: ModuleAccess) => void; disabled?: boolean; planModules: Record<string, boolean> }) {
    const setAll = (level: AccessLevel) => onChange(uniformAccess(level))
    return (
        <div className="space-y-3 min-w-0">
            <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="text-muted-foreground">Set all:</span>
                {ACCESS_LEVELS.map((l) => (
                    <Button key={l.value} type="button" size="sm" variant="outline" className="h-7 text-xs" disabled={disabled} onClick={() => setAll(l.value)}>
                        {l.label}
                    </Button>
                ))}
            </div>
            <div className="rounded-lg border divide-y">
                {MODULES.map((m) => {
                    // Not on the workspace's plan: nobody can use it, whatever is set here
                    const notInPlan = planModules[m.key] === false
                    return (
                    <div key={m.key} className={`flex items-center justify-between gap-3 px-3 py-2 ${notInPlan ? "opacity-50" : ""}`}>
                        <div className="min-w-0">
                            <p className="text-sm font-medium">{m.label}</p>
                            <p className="text-xs text-muted-foreground truncate">{notInPlan ? "Not on your plan. Upgrade in Billing to use it." : m.description}</p>
                        </div>
                        <Select value={value[m.key]} disabled={disabled || notInPlan} onValueChange={(v) => onChange({ ...value, [m.key]: v as AccessLevel })}>
                            <SelectTrigger className="h-8 w-[130px] shrink-0" aria-label={`${m.label} access`}>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {ACCESS_LEVELS.map((l) => (
                                    <SelectItem key={l.value} value={l.value}>
                                        {l.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    )
                })}
            </div>
            <p className="text-xs text-muted-foreground">{LEVEL_HELP}. Settings and the team are for admins only; everyone can use the dashboard, the employee portal and support.</p>
        </div>
    )
}

function RolePicker({ value, onChange, disabled }: { value: TeamRole; onChange: (r: TeamRole) => void; disabled?: boolean }) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(["MEMBER", "ADMIN"] as TeamRole[]).map((r) => (
                <button
                    key={r}
                    type="button"
                    disabled={disabled}
                    onClick={() => onChange(r)}
                    className={`min-w-0 rounded-lg border p-3 text-left transition-colors ${value === r ? "border-primary bg-primary/5" : "hover:bg-muted/40"}`}
                >
                    <p className="text-sm font-semibold">{r === "ADMIN" ? "Admin" : "Member"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{ROLE_HELP[r]}</p>
                </button>
            ))}
        </div>
    )
}

async function copy(text: string) {
    try {
        await navigator.clipboard.writeText(text)
        toast.success("Invitation link copied")
    } catch {
        toast.error("Couldn't copy. Select the link and copy it manually.")
    }
}

export default function TeamTab({ initialMembers, invites, planModules = {} }: { initialMembers: TeamMember[]; invites: PendingInvite[]; planModules?: Record<string, boolean> }) {
    const router = useRouter()
    const [members, setMembers] = useState(initialMembers)
    const [pendingId, setPendingId] = useState<string | null>(null)

    // Edit access dialog
    const [editing, setEditing] = useState<TeamMember | null>(null)
    const [editRole, setEditRole] = useState<TeamRole>("MEMBER")
    const [editAccess, setEditAccess] = useState<ModuleAccess>(uniformAccess("VIEW"))
    const [saving, setSaving] = useState(false)

    // Invite dialog
    const [inviteOpen, setInviteOpen] = useState(false)
    const [inviteName, setInviteName] = useState("")
    const [inviteEmail, setInviteEmail] = useState("")
    const [inviteRole, setInviteRole] = useState<TeamRole>("MEMBER")
    const [inviteAccess, setInviteAccess] = useState<ModuleAccess>(uniformAccess("VIEW"))
    const [sending, setSending] = useState(false)
    const [sharedLink, setSharedLink] = useState<{ url: string; reason?: string } | null>(null)

    const patch = (id: string, changes: Partial<TeamMember>) =>
        setMembers((prev) => prev.map((m) => (m.id === id ? { ...m, ...changes } : m)))

    const openEdit = (m: TeamMember) => {
        setEditing(m)
        setEditRole(m.isAdmin ? "ADMIN" : "MEMBER")
        setEditAccess(m.isAdmin ? uniformAccess("EDIT") : m.access)
    }

    const saveEdit = async () => {
        if (!editing) return
        setSaving(true)
        const result = await updateTeamMember(editing.id, { role: editRole, access: editRole === "MEMBER" ? editAccess : undefined })
        setSaving(false)
        if (!result.success) {
            toast.error(result.error || "Failed to save")
            return
        }
        patch(editing.id, editRole === "ADMIN" ? { isAdmin: true, role: "ADMIN", access: uniformAccess("FULL") } : { isAdmin: false, role: "USER", access: editAccess })
        toast.success(`Access saved for ${editing.fullName || editing.email}`)
        setEditing(null)
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

    const sendInvite = async () => {
        setSending(true)
        const result = await inviteTeamMember({ email: inviteEmail, fullName: inviteName, role: inviteRole, access: inviteRole === "MEMBER" ? inviteAccess : undefined })
        setSending(false)
        if (!result.success) {
            toast.error(result.error || "Failed to send the invite")
            return
        }
        setInviteOpen(false)
        setInviteName("")
        setInviteEmail("")
        setInviteRole("MEMBER")
        setInviteAccess(uniformAccess("VIEW"))
        if (result.emailSent) toast.success(`Invitation emailed to ${inviteEmail.trim()}`)
        else setSharedLink({ url: result.inviteUrl!, reason: result.emailError })
        router.refresh()
    }

    const handleResend = async (invite: PendingInvite) => {
        setPendingId(invite.id)
        const result = await resendInvite(invite.id)
        setPendingId(null)
        if (!result.success) {
            toast.error(result.error || "Failed to resend")
            return
        }
        if (result.emailSent) toast.success(`Invitation sent again to ${invite.email}`)
        else setSharedLink({ url: result.inviteUrl!, reason: result.emailError })
        router.refresh()
    }

    const handleRevoke = async (invite: PendingInvite) => {
        setPendingId(invite.id)
        const result = await revokeInvite(invite.id)
        setPendingId(null)
        if (!result.success) {
            toast.error(result.error || "Failed to cancel")
            return
        }
        toast.success(`Invitation to ${invite.email} cancelled`)
        router.refresh()
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-1.5">
                        <CardTitle>Team & Access</CardTitle>
                        <CardDescription>
                            Invite people and choose which modules each person can use. Deactivated members are signed out and can&apos;t log in.
                        </CardDescription>
                    </div>
                    <Button onClick={() => setInviteOpen(true)} className="shrink-0">
                        <UserPlus className="mr-2 h-4 w-4" />
                        Invite member
                    </Button>
                </CardHeader>
                <CardContent>
                    <div className="rounded-lg border overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Member</TableHead>
                                    <TableHead className="w-[100px]">Role</TableHead>
                                    <TableHead>Access</TableHead>
                                    <TableHead className="w-[90px]">Active</TableHead>
                                    <TableHead className="w-[120px] text-right">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {members.length === 0 && (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">
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
                                                <Badge variant={m.isAdmin ? "default" : "outline"}>{m.role === "SUPER_ADMIN" ? "Platform" : m.isAdmin ? "Admin" : "Member"}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[360px]">{summarizeAccess(m.role, m.access)}</TableCell>
                                            <TableCell>
                                                <Switch
                                                    checked={m.isActive}
                                                    disabled={locked || busy}
                                                    onCheckedChange={(checked) => handleStatusChange(m, checked)}
                                                    aria-label={`${m.isActive ? "Deactivate" : "Reactivate"} ${m.fullName || m.email}`}
                                                />
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button size="sm" variant="outline" className="h-8" disabled={locked} onClick={() => openEdit(m)}>
                                                    <ShieldCheck className="mr-1.5 h-3.5 w-3.5" />
                                                    Access
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    )
                                })}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Pending invitations</CardTitle>
                    <CardDescription>Invitations are valid for 7 days. Cancel one to stop its link working.</CardDescription>
                </CardHeader>
                <CardContent>
                    {invites.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No pending invitations.</p>
                    ) : (
                        <div className="rounded-lg border overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Invited</TableHead>
                                        <TableHead className="w-[100px]">Role</TableHead>
                                        <TableHead>Access</TableHead>
                                        <TableHead className="w-[130px]">Expires</TableHead>
                                        <TableHead className="w-[150px] text-right">Action</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {invites.map((i) => (
                                        <TableRow key={i.id}>
                                            <TableCell>
                                                <p className="font-medium">{i.fullName}</p>
                                                <p className="text-xs text-muted-foreground">{i.email} · by {i.invitedByName}</p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline">{i.role === "ADMIN" ? "Admin" : "Member"}</Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground max-w-[300px]">{summarizeAccess(i.role === "ADMIN" ? "ADMIN" : "USER", i.access)}</TableCell>
                                            <TableCell className="text-xs">
                                                {i.expired ? <Badge variant="destructive">Expired</Badge> : new Date(i.expiresAt).toLocaleDateString()}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Copy link" disabled={i.expired} onClick={() => copy(i.inviteUrl)}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8" title="Send again" disabled={pendingId === i.id} onClick={() => handleResend(i)}>
                                                        <RefreshCw className="h-4 w-4" />
                                                    </Button>
                                                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" title="Cancel invitation" disabled={pendingId === i.id} onClick={() => handleRevoke(i)}>
                                                        <X className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit access */}
            <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Access for {editing?.fullName || editing?.email}</DialogTitle>
                        <DialogDescription>Changes apply the next time they open a page.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 min-w-0">
                        <RolePicker value={editRole} onChange={setEditRole} disabled={saving} />
                        {editRole === "MEMBER" && <AccessMatrix value={editAccess} onChange={setEditAccess} disabled={saving} planModules={planModules} />}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>Cancel</Button>
                        <Button onClick={saveEdit} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Save access
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Invite */}
            <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Invite a team member</DialogTitle>
                        <DialogDescription>They get an email with a link to set a password and join this workspace.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 min-w-0">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label htmlFor="invite-name">Name</Label>
                                <Input id="invite-name" value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="Enter full name" disabled={sending} />
                            </div>
                            <div className="space-y-1.5">
                                <Label htmlFor="invite-email">Email</Label>
                                <Input id="invite-email" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="Enter work email" disabled={sending} />
                            </div>
                        </div>
                        <RolePicker value={inviteRole} onChange={setInviteRole} disabled={sending} />
                        {inviteRole === "MEMBER" && <AccessMatrix value={inviteAccess} onChange={setInviteAccess} disabled={sending} planModules={planModules} />}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={sending}>Cancel</Button>
                        <Button onClick={sendInvite} disabled={sending || !inviteEmail.trim() || !inviteName.trim()}>
                            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                            Send invitation
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Link to share when the email couldn't be sent */}
            <Dialog open={!!sharedLink} onOpenChange={(o) => !o && setSharedLink(null)}>
                <DialogContent className="sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>Share the invitation link</DialogTitle>
                        <DialogDescription>
                            The invitation is saved, but the email couldn&apos;t be sent{sharedLink?.reason ? ` (${sharedLink.reason})` : ""}. Send this link to them yourself.
                        </DialogDescription>
                    </DialogHeader>
                    <Input readOnly value={sharedLink?.url || ""} onFocus={(e) => e.target.select()} className="min-w-0" />
                    <DialogFooter>
                        <Button onClick={() => sharedLink && copy(sharedLink.url)}>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy link
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
