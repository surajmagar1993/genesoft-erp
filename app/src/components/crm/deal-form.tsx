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

export type DealStage = "PROSPECTING" | "QUALIFICATION" | "PROPOSAL" | "NEGOTIATION" | "CLOSED_WON" | "CLOSED_LOST"

export interface DealFormData {
    id?: string
    title: string
    contactName: string
    company: string
    value: number
    stage: DealStage
    probability: number
    expectedClose: string
    assignedTo: string
    notes: string
}

export const defaultDealForm: DealFormData = {
    title: "",
    contactName: "",
    company: "",
    value: 0,
    stage: "PROSPECTING",
    probability: 20,
    expectedClose: "",
    assignedTo: "",
    notes: "",
}

const stageProbability: Record<DealStage, number> = {
    PROSPECTING: 20, QUALIFICATION: 40, PROPOSAL: 60, NEGOTIATION: 80, CLOSED_WON: 100, CLOSED_LOST: 0,
}

interface DealFormProps {
    initialData?: DealFormData
    mode: "create" | "edit"
}

export function DealForm({ initialData, mode }: DealFormProps) {
    const router = useRouter()
    const [form, setForm] = useState<DealFormData>(initialData || defaultDealForm)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const update = (field: keyof DealFormData, value: any) => {
        setForm((prev) => {
            const updated = { ...prev, [field]: value };

            // Auto update probability if stage changes
            if (field === 'stage') {
                updated.probability = stageProbability[value as DealStage];
            }

            return updated;
        });
    }

    const handleSave = async () => {
        if (!form.title.trim()) {
            alert("Deal title is required.")
            return
        }

        setIsSubmitting(true)

        const payload = {
            title: form.title,
            contact_name: form.contactName,
            company: form.company,
            value: form.value,
            stage: form.stage,
            probability: form.probability,
            expected_close: form.expectedClose || "",
            assigned_to: form.assignedTo,
            notes: form.notes,
        }

        const { createDeal, updateDeal } = await import("@/app/actions/crm/deals")
        const result = mode === "create"
            ? await createDeal(payload)
            : await updateDeal(form.id!, payload)

        if (result.error) {
            alert(result.error)
            setIsSubmitting(false)
        } else {
            router.push("/crm/deals")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/crm/deals")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {mode === "create" ? "New Deal" : "Edit Deal"}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {mode === "create"
                                ? "Add a new sales opportunity"
                                : "Update deal details"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push("/crm/deals")} disabled={isSubmitting}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSubmitting ? "Saving..." : "Save Deal"}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>Deal Title <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.title}
                                onChange={(e) => update("title", e.target.value)}
                                placeholder="e.g. Acme Corp CRM Implementation"
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
                                <Label>Company</Label>
                                <Input
                                    value={form.company}
                                    onChange={(e) => update("company", e.target.value)}
                                    placeholder="e.g. Acme Corp"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                                <Label>Deal Value (₹)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    value={form.value}
                                    onChange={(e) => update("value", parseInt(e.target.value) || 0)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Expected Close Date</Label>
                                <Input
                                    type="date"
                                    value={form.expectedClose}
                                    onChange={(e) => update("expectedClose", e.target.value)}
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

                        <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-4">
                            <div className="space-y-2">
                                <Label>Pipeline Stage</Label>
                                <Select value={form.stage} onValueChange={(v) => update("stage", v as DealStage)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PROSPECTING">Prospecting</SelectItem>
                                        <SelectItem value="QUALIFICATION">Qualification</SelectItem>
                                        <SelectItem value="PROPOSAL">Proposal</SelectItem>
                                        <SelectItem value="NEGOTIATION">Negotiation</SelectItem>
                                        <SelectItem value="CLOSED_WON">Closed Won</SelectItem>
                                        <SelectItem value="CLOSED_LOST">Closed Lost</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Probability (%)</Label>
                                <Input
                                    type="number"
                                    min="0"
                                    max="100"
                                    value={form.probability}
                                    onChange={(e) => update("probability", parseInt(e.target.value) || 0)}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label>Notes</Label>
                            <Textarea
                                value={form.notes}
                                onChange={(e) => update("notes", e.target.value)}
                                placeholder="Add deal requirements or details here..."
                                className="min-h-[100px]"
                            />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
