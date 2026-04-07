"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Save, X } from "lucide-react"

export interface CompanyFormData {
    id?: string
    name: string
    industry: string
    website: string
    phone: string
    city: string
    gstin: string
    countryCode: string
}

export const defaultCompanyForm: CompanyFormData = {
    name: "",
    industry: "",
    website: "",
    phone: "",
    city: "",
    gstin: "",
    countryCode: "IN",
}

interface CompanyFormProps {
    initialData?: CompanyFormData
    mode: "create" | "edit"
}

export function CompanyForm({ initialData, mode }: CompanyFormProps) {
    const router = useRouter()
    const [form, setForm] = useState<CompanyFormData>(initialData || defaultCompanyForm)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const update = (field: keyof CompanyFormData, value: any) => setForm((p) => ({ ...p, [field]: value }))

    const handleSave = async () => {
        if (!form.name.trim()) {
            alert("Company name is required.")
            return
        }

        setIsSubmitting(true)

        const payload = {
            name: form.name,
            industry: form.industry,
            website: form.website,
            phone: form.phone,
            city: form.city,
            gstin: form.gstin,
            country_code: form.countryCode,
            is_active: true,
        }

        const { createCompany, updateCompany } = await import("@/app/actions/crm/companies")
        const result = mode === "create"
            ? await createCompany(payload)
            : await updateCompany(form.id!, payload)

        if (result.error) {
            alert(result.error)
            setIsSubmitting(false)
        } else {
            router.push("/crm/companies")
        }
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/crm/companies")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {mode === "create" ? "New Company" : "Edit Company"}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {mode === "create"
                                ? "Add a new business account"
                                : "Update company information"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push("/crm/companies")} disabled={isSubmitting}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSubmitting ? "Saving..." : "Save Company"}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="pt-6 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Company Name <span className="text-destructive">*</span></Label>
                            <Input
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                                placeholder="Enter company name"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Industry</Label>
                            <Input
                                value={form.industry}
                                onChange={(e) => update("industry", e.target.value)}
                                placeholder="Enter industry"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Website</Label>
                            <Input
                                value={form.website}
                                onChange={(e) => update("website", e.target.value)}
                                placeholder="Enter website URL"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Phone</Label>
                            <Input
                                value={form.phone}
                                onChange={(e) => update("phone", e.target.value)}
                                placeholder="Enter phone number"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>City</Label>
                            <Input
                                value={form.city}
                                onChange={(e) => update("city", e.target.value)}
                                placeholder="Enter city"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Country Code</Label>
                            <Input
                                value={form.countryCode}
                                onChange={(e) => update("countryCode", e.target.value.toUpperCase())}
                                placeholder="IN, US, AE..."
                                maxLength={2}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label>Tax ID (GSTIN / VAT)</Label>
                        <Input
                            value={form.gstin}
                            onChange={(e) => update("gstin", e.target.value)}
                            placeholder="Enter Tax ID (GSTIN / VAT)"
                            className="uppercase"
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
