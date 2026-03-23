"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, X } from "lucide-react"

export type LeadStatus = "NEW" | "CONTACTED" | "QUALIFIED" | "CONVERTED" | "LOST"

export interface LeadFormData {
    id?: string
    title: string
    contactName: string
    email: string
    phone: string
    source: string
    status: LeadStatus
    score: number
    assignedTo: string
    notes: string
}

export const defaultLeadForm: LeadFormData = {
    title: "",
    contactName: "",
    email: "",
    phone: "",
    source: "",
    status: "NEW",
    score: 50,
    assignedTo: "",
    notes: "",
}

interface LeadFormProps {
    initialData?: LeadFormData
    mode: "create" | "edit"
}

export function LeadForm({ initialData, mode }: LeadFormProps) {
    const router = useRouter()
    const [form, setForm] = useState<LeadFormData>(initialData || defaultLeadForm)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const update = (field: keyof LeadFormData, value: any) => setForm((p) => ({ ...p, [field]: value }))

    const handleSave = async () => {
        if (!form.title.trim()) {
            alert("Lead title is required.")
            return
        }

        setIsSubmitting(true)

        const payload = {
            title: form.title,
            contact_name: form.contactName,
            email: form.email,
            phone: form.phone,
            source: form.source,
            status: form.status,
            score: form.score,
            assigned_to: form.assignedTo,
            notes: form.notes,
        }

        const { createLead, updateLead } = await import("@/app/actions/crm/leads")
        const result = mode === "create"
            ? await createLead(payload)
            : await updateLead(form.id!, payload)

        if (result.error) {
            alert(result.error)
            setIsSubmitting(false)
        } else {
            router.push("/crm/leads")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/crm/leads")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {mode === "create" ? "New Lead" : "Edit Lead"}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {mode === "create"
                                ? "Add a potential customer"
                                : "Update lead information"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push("/crm/leads")} disabled={isSubmitting}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSubmitting ? "Saving..." : "Save Lead"}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Lead Title <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.title}
                                onChange={(e) => update("title", e.target.value)}
                                placeholder="e.g. Need CRM Implementation"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Contact Name</Label>
                                <Input
                                    value={form.contactName}
                                    onChange={(e) => update("contactName", e.target.value)}
                                    placeholder="e.g. John Doe"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Assigned To</Label>
                                <Input
                                    value={form.assignedTo}
                                    onChange={(e) => update("assignedTo", e.target.value)}
                                    placeholder="Sales rep name"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Email</Label>
                                <Input
                                    type="email"
                                    value={form.email}
                                    onChange={(e) => update("email", e.target.value)}
                                    placeholder="john@example.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input
                                    value={form.phone}
                                    onChange={(e) => update("phone", e.target.value)}
                                    placeholder="+1 234 567 8900"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select value={form.status} onValueChange={(v) => update("status", v as LeadStatus)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="NEW">New</SelectItem>
                                        <SelectItem value="CONTACTED">Contacted</SelectItem>
                                        <SelectItem value="QUALIFIED">Qualified</SelectItem>
                                        <SelectItem value="CONVERTED">Converted</SelectItem>
                                        <SelectItem value="LOST">Lost</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Source</Label>
                                <Input
                                    value={form.source}
                                    onChange={(e) => update("source", e.target.value)}
                                    placeholder="e.g. Website, Referral"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Score (0-100)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={form.score}
                                    onChange={(e) => update("score", parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={form.notes}
                                onChange={(e) => update("notes", e.target.value)}
                                placeholder="Add initial notes or requirements here..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
