"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import type { ProjectBillingType, ProjectPriority, ProjectStatus } from "@prisma/client"
import { createProject } from "@/app/actions/projects"
import { useTaxRegime } from "@/hooks/use-tax-regime"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

/** New project (full page; the list is /projects). */
export function ProjectForm({
    clients,
    employees,
}: {
    clients: { id: string; name: string }[]
    employees: { id: string; name: string; designationTitle?: string | null }[]
}) {
    const router = useRouter()
    const [isPending, startTransition] = useTransition()
    const { regime } = useTaxRegime()
    const [form, setForm] = useState({
        name: "",
        description: "",
        priority: "MEDIUM" as ProjectPriority,
        status: "PLANNING" as ProjectStatus,
        billingType: "FIXED_FEE" as ProjectBillingType,
        startDate: "",
        targetEndDate: "",
        budget: "",
        clientId: "",
        managerId: "",
    })
    const set = (change: Partial<typeof form>) => setForm((f) => ({ ...f, ...change }))

    const submit = (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) {
            toast.error("Enter a project name")
            return
        }
        if (form.startDate && form.targetEndDate && form.targetEndDate < form.startDate) {
            toast.error("The target date can't be before the start date")
            return
        }
        startTransition(async () => {
            // No currency is sent: the project uses the business's own
            const res = await createProject({
                name: form.name,
                description: form.description || undefined,
                priority: form.priority,
                status: form.status,
                billingType: form.billingType,
                startDate: form.startDate || undefined,
                targetEndDate: form.targetEndDate || undefined,
                budget: form.budget ? parseFloat(form.budget) : undefined,
                clientId: form.clientId || undefined,
                managerId: form.managerId || undefined,
            })
            if (!res.success) {
                toast.error(res.error || "The project couldn't be created")
                return
            }
            toast.success("Project created")
            router.push("/projects")
            router.refresh()
        })
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild aria-label="Back to projects">
                    <Link href="/projects">
                        <ArrowLeft className="h-4 w-4" />
                    </Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New project</h1>
                    <p className="text-sm text-muted-foreground">A client engagement or internal project. Tasks, milestones and time are added on the project board.</p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Project</CardTitle>
                        <CardDescription>What it is and who it is for.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-name">Name *</Label>
                            <Input id="proj-name" required placeholder="Enter the project name" value={form.name} onChange={(e) => set({ name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-desc">Description and goals</Label>
                            <Textarea id="proj-desc" rows={3} placeholder="Describe the scope and what done looks like (optional)" value={form.description} onChange={(e) => set({ description: e.target.value })} />
                        </div>
                        <div className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <Label>Client</Label>
                                <Select value={form.clientId || "internal"} onValueChange={(v) => set({ clientId: v === "internal" ? "" : v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="internal">Internal (no client)</SelectItem>
                                        {clients.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <Label>Project manager</Label>
                                <Select value={form.managerId || "unassigned"} onValueChange={(v) => set({ managerId: v === "unassigned" ? "" : v })}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="unassigned">Not assigned yet</SelectItem>
                                        {employees.map((e) => <SelectItem key={e.id} value={e.id}>{e.name}{e.designationTitle ? ` (${e.designationTitle})` : ""}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Plan and billing</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label>Priority</Label>
                            <Select value={form.priority} onValueChange={(v) => set({ priority: v as ProjectPriority })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="LOW">Low</SelectItem>
                                    <SelectItem value="MEDIUM">Medium</SelectItem>
                                    <SelectItem value="HIGH">High</SelectItem>
                                    <SelectItem value="URGENT">Urgent</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>Billing</Label>
                            <Select value={form.billingType} onValueChange={(v) => set({ billingType: v as ProjectBillingType })}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="FIXED_FEE">Fixed fee</SelectItem>
                                    <SelectItem value="TIME_AND_MATERIALS">Time and materials</SelectItem>
                                    <SelectItem value="NON_BILLABLE">Not billed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-budget">Budget{regime?.currency ? ` (${regime.currency})` : ""}</Label>
                            <Input id="proj-budget" type="number" min="0" step="0.01" placeholder="Optional" value={form.budget} onChange={(e) => set({ budget: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-start">Start date</Label>
                            <Input id="proj-start" type="date" value={form.startDate} onChange={(e) => set({ startDate: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="proj-end">Target completion</Label>
                            <Input id="proj-end" type="date" value={form.targetEndDate} onChange={(e) => set({ targetEndDate: e.target.value })} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild>
                        <Link href="/projects">Cancel</Link>
                    </Button>
                    <Button type="submit" disabled={isPending}>
                        {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Create project
                    </Button>
                </div>
            </form>
        </div>
    )
}
