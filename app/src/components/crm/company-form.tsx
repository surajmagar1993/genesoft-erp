"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { ArrowLeft, Save, X, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { AutoSuggestInput } from "@/components/ui/auto-suggest-input"
import { searchCountries, searchStates, searchCities } from "@/lib/constants/geo-locations"
import { createCompany, updateCompany } from "@/app/actions/crm/companies"

export interface CompanyFormData {
    id?: string
    name: string
    industry: string
    website: string
    phone: string
    email: string
    address: string
    city: string
    state: string
    country: string
    countryCode: string
    gstin: string
    employeeCount?: number | string
    annualRevenue?: number | string
}

export const defaultCompanyForm: CompanyFormData = {
    name: "",
    industry: "",
    website: "",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    country: "India",
    countryCode: "IN",
    gstin: "",
    employeeCount: "",
    annualRevenue: "",
}

interface CompanyFormProps {
    initialData?: CompanyFormData
    mode: "create" | "edit"
}

export function CompanyForm({ initialData, mode }: CompanyFormProps) {
    const router = useRouter()
    const [form, setForm] = useState<CompanyFormData>(initialData || defaultCompanyForm)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [saveError, setSaveError] = useState<string | null>(null)

    const update = (field: keyof CompanyFormData, value: any) => setForm((p) => ({ ...p, [field]: value }))

    const handleSave = async () => {
        setSaveError(null)
        if (!form.name.trim()) {
            setSaveError("Company name is required.")
            toast.error("Company name is required.")
            return
        }

        setIsSubmitting(true)

        const payload = {
            name: form.name.trim(),
            industry: form.industry || undefined,
            website: form.website || undefined,
            phone: form.phone || undefined,
            email: form.email || undefined,
            address: form.address || undefined,
            city: form.city || undefined,
            state: form.state || undefined,
            country: form.country || undefined,
            country_code: form.countryCode || "IN",
            gstin: form.gstin || undefined,
            employee_count: form.employeeCount ? Number(form.employeeCount) : undefined,
            annual_revenue: form.annualRevenue ? Number(form.annualRevenue) : undefined,
            is_active: true,
        }

        try {
            const result = mode === "create"
                ? await createCompany(payload)
                : await updateCompany(form.id!, payload)

            if (result.error) {
                setSaveError(result.error)
                toast.error(result.error)
                setIsSubmitting(false)
            } else {
                toast.success(mode === "create" ? "Company created successfully!" : "Company updated successfully!")
                router.push("/crm/companies")
                router.refresh()
            }
        } catch (err: any) {
            const msg = err.message || "Failed to save company"
            setSaveError(msg)
            toast.error(msg)
            setIsSubmitting(false)
        }
    }

    return (
        <div className="space-y-6">
            {saveError && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{saveError}</AlertDescription>
                </Alert>
            )}

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
                                ? "Add a new business account or organization"
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
                    {/* Primary Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="companyName">
                                Company Name <span className="text-destructive">*</span>
                            </Label>
                            <Input
                                id="companyName"
                                value={form.name}
                                onChange={(e) => update("name", e.target.value)}
                                placeholder="e.g. Acme Innovations Corp"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="industry">Industry</Label>
                            <Input
                                id="industry"
                                value={form.industry}
                                onChange={(e) => update("industry", e.target.value)}
                                placeholder="e.g. Information Technology, Logistics, Retail"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <Input
                                id="website"
                                value={form.website}
                                onChange={(e) => update("website", e.target.value)}
                                placeholder="https://example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                                id="phone"
                                value={form.phone}
                                onChange={(e) => update("phone", e.target.value)}
                                placeholder="+1 555-0199 or +91 9876543210"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={form.email}
                                onChange={(e) => update("email", e.target.value)}
                                placeholder="contact@example.com"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="gstin">Tax ID (GSTIN / VAT / EIN)</Label>
                            <Input
                                id="gstin"
                                value={form.gstin}
                                onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                                placeholder="e.g. 27AABCT3518Q1ZV"
                                className="uppercase font-mono"
                            />
                        </div>
                    </div>

                    {/* Address with Auto-Suggest */}
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                            Address & Location
                        </h3>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="address">Street Address</Label>
                                <Input
                                    id="address"
                                    value={form.address}
                                    onChange={(e) => update("address", e.target.value)}
                                    placeholder="e.g. 100 Innovation Way, Suite 500"
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="country">Country</Label>
                                    <AutoSuggestInput
                                        id="country"
                                        value={form.country}
                                        onChange={(e) => update("country", e.target.value)}
                                        options={searchCountries(form.country).map((c) => ({
                                            label: c.name,
                                            value: c.name,
                                            subLabel: c.code,
                                            icon: c.flag,
                                        }))}
                                        onSelectOption={(opt) => {
                                            update("country", opt.value)
                                            if (opt.subLabel) update("countryCode", opt.subLabel)
                                        }}
                                        placeholder="Start typing country..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="state">State / Province</Label>
                                    <AutoSuggestInput
                                        id="state"
                                        value={form.state}
                                        onChange={(e) => update("state", e.target.value)}
                                        options={searchStates(form.state, form.country).map((s) => ({
                                            label: s.name,
                                            value: s.name,
                                            subLabel: s.code,
                                        }))}
                                        onSelectOption={(opt) => update("state", opt.value)}
                                        placeholder="Start typing state..."
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="city">City</Label>
                                    <AutoSuggestInput
                                        id="city"
                                        value={form.city}
                                        onChange={(e) => update("city", e.target.value)}
                                        options={searchCities(form.city, form.state, form.country).map((c) => ({
                                            label: c.name,
                                            value: c.name,
                                            subLabel: `${c.stateName} • ${c.pincode}`,
                                        }))}
                                        onSelectOption={(opt) => {
                                            update("city", opt.value)
                                            if (opt.subLabel) {
                                                const parts = opt.subLabel.split(" • ")
                                                if (parts[0] && !form.state) {
                                                    update("state", parts[0])
                                                }
                                            }
                                        }}
                                        placeholder="Start typing city..."
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Scale & Revenue */}
                    <div className="border-t pt-4">
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                            Organization Scale
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="employeeCount">Employees</Label>
                                <Input
                                    id="employeeCount"
                                    type="number"
                                    value={form.employeeCount}
                                    onChange={(e) => update("employeeCount", e.target.value)}
                                    placeholder="e.g. 50"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="annualRevenue">Annual Revenue</Label>
                                <Input
                                    id="annualRevenue"
                                    type="number"
                                    value={form.annualRevenue}
                                    onChange={(e) => update("annualRevenue", e.target.value)}
                                    placeholder="e.g. 5000000"
                                />
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
