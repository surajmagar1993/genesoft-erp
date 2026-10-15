"use client"
import { useTaxRegime } from "@/hooks/use-tax-regime"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Building2, Mail, Globe, Phone, MapPin, Upload, Trash2, Save, AlertCircle, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { AutoSuggestInput } from "@/components/ui/auto-suggest-input"
import { searchCountries, searchStates, searchCities } from "@/lib/constants/geo-locations"
import { updateTenantSettings, uploadTenantLogo, removeTenantLogo, TenantSettings, TenantAddress } from "@/app/actions/settings/tenant"
import { unwrap } from "@/lib/action-result"

interface CompanyProfileTabProps {
    initialSettings: TenantSettings | null
}

export default function CompanyProfileTab({ initialSettings }: CompanyProfileTabProps) {
    const router = useRouter()

    const parseAddress = (addr: any): TenantAddress => {
        if (!addr) return { street: "", city: "", state: "", country: "India", postalCode: "" }
        if (typeof addr === "string") {
            try {
                const parsed = JSON.parse(addr)
                return {
                    street: parsed.street || "",
                    city: parsed.city || "",
                    state: parsed.state || "",
                    country: parsed.country || "India",
                    postalCode: parsed.postalCode || parsed.postal_code || "",
                }
            } catch {
                return { street: addr, city: "", state: "", country: "India", postalCode: "" }
            }
        }
        return {
            street: addr.street || "",
            city: addr.city || "",
            state: addr.state || "",
            country: addr.country || "India",
            postalCode: addr.postalCode || addr.postal_code || "",
        }
    }

    const [name, setName] = useState(initialSettings?.name || "")
    const [gstin, setGstin] = useState(initialSettings?.gstin || (initialSettings?.settings as any)?.gstin || "")
    const [email, setEmail] = useState(initialSettings?.email || "")
    const [phone, setPhone] = useState(initialSettings?.phone || "")
    const [website, setWebsite] = useState(initialSettings?.website || "")
    const [logoUrl, setLogoUrl] = useState(initialSettings?.logo_url || "")
    const [address, setAddress] = useState<TenantAddress>(parseAddress(initialSettings?.address))
    const [countryCode, setCountryCode] = useState(initialSettings?.country_code || "IN")

    const { regime } = useTaxRegime()
    const savedTax = ((initialSettings?.settings as { tax?: { label?: string; rates?: number[]; defaultRate?: number } } | null)?.tax) || {}
    const [taxName, setTaxName] = useState(savedTax.label || "")
    const [taxRates, setTaxRates] = useState((savedTax.rates || []).filter((r) => r > 0).join(", "))
    const [taxDefault, setTaxDefault] = useState(savedTax.defaultRate != null ? String(savedTax.defaultRate) : "")
    const [isSaving, setIsSaving] = useState(false)
    const [statusMsg, setStatusMsg] = useState<{ type: "success" | "error"; text: string } | null>(null)

    const [isUploading, setIsUploading] = useState(false)

    // Uploads straight away to the business's folder in storage (PNG or JPG, up to 1 MB)
    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        e.target.value = ""
        if (!file) return
        if (!["image/png", "image/jpeg"].includes(file.type)) {
            toast.error("Upload a PNG or JPG image (these print on PDF invoices).")
            return
        }
        if (file.size > 1024 * 1024) {
            toast.error("The logo must be 1 MB or smaller.")
            return
        }
        setIsUploading(true)
        try {
            const form = new FormData()
            form.set("logo", file)
            const { logoUrl: url } = unwrap(await uploadTenantLogo(form))
            setLogoUrl(url)
            toast.success("Logo uploaded. It now appears on your invoices and customer portal.")
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't upload the logo")
        } finally {
            setIsUploading(false)
        }
    }

    const handleRemoveLogo = async () => {
        setIsUploading(true)
        try {
            unwrap(await removeTenantLogo())
            setLogoUrl("")
            toast.success("Logo removed.")
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't remove the logo")
        } finally {
            setIsUploading(false)
        }
    }

    const handleSave = async () => {
        if (!name.trim()) {
            setStatusMsg({ type: "error", text: "Company entity name is required." })
            toast.error("Company entity name is required.")
            return
        }

        setIsSaving(true)
        setStatusMsg(null)

        try {
            const payload: Partial<TenantSettings> = {
                name: name.trim(),
                email: email.trim() || null,
                phone: phone.trim() || null,
                website: website.trim() || null,
                country_code: countryCode,
                gstin: gstin.trim() || null,
                ...(regime?.mode === "SINGLE" && (taxName.trim() || taxRates.trim())
                    ? {
                          tax_settings: {
                              label: taxName.trim() || undefined,
                              rates: taxRates.split(",").map((r) => Number(r.trim())).filter((r) => Number.isFinite(r) && r >= 0),
                              defaultRate: taxDefault.trim() ? Number(taxDefault) : undefined,
                          },
                      }
                    : {}),
                address: {
                    street: address.street || "",
                    city: address.city || "",
                    state: address.state || "",
                    country: address.country || "",
                    postalCode: address.postalCode || "",
                },
            }

            const res = await updateTenantSettings(payload)
            if (res.success) {
                setStatusMsg({ type: "success", text: "Company profile and branding saved successfully!" })
                toast.success("Company profile and branding saved successfully!")
                router.refresh()
            } else {
                setStatusMsg({ type: "error", text: res.error || "Failed to update profile." })
                toast.error(res.error || "Failed to update profile.")
            }
        } catch (err: any) {
            const msg = err.message || "Failed to update profile."
            setStatusMsg({ type: "error", text: msg })
            toast.error(msg)
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            {statusMsg && (
                <Alert variant={statusMsg.type === "error" ? "destructive" : "default"} className={statusMsg.type === "success" ? "border-emerald-500 bg-emerald-50 text-emerald-900" : ""}>
                    {statusMsg.type === "error" ? <AlertCircle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                    <AlertDescription className="font-medium">{statusMsg.text}</AlertDescription>
                </Alert>
            )}

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
                {/* Company Profile Card */}
                <Card className="lg:col-span-4 border shadow-sm">
                    <CardHeader className="border-b bg-muted/20 pb-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Building2 className="h-5 w-5 text-primary" /> Company Profile
                                </CardTitle>
                                <CardDescription className="mt-1">
                                    Update your business credentials, contact info, and tax identity.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="entityName">
                                    Entity Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="entityName"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="e.g. Acme Tech Solutions Pvt Ltd"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="gstin">{regime?.taxIdLabel || "Tax ID"}</Label>
                                <Input
                                    id="gstin"
                                    value={gstin}
                                    onChange={(e) => setGstin(e.target.value.toUpperCase())}
                                    placeholder={`Your ${regime?.taxIdLabel || "tax registration number"}`}
                                    className="uppercase font-mono"
                                />
                                <p className="text-[11px] text-muted-foreground">Printed on invoices and required for tax exports.</p>
                            </div>
                        </div>

                        {regime && regime.mode === "SINGLE" && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 rounded-lg border border-dashed p-4">
                                <div className="md:col-span-3 text-xs text-muted-foreground">
                                    Tax on your documents. Leave blank to use the standard {regime.taxLabel} rates for your country
                                    ({regime.standardRates.join("%, ")}%).
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taxName">Tax name</Label>
                                    <Input id="taxName" value={taxName} onChange={(e) => setTaxName(e.target.value)} placeholder="VAT, GST or Sales Tax" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taxRates">Rates (%)</Label>
                                    <Input id="taxRates" value={taxRates} onChange={(e) => setTaxRates(e.target.value)} placeholder="Comma-separated, e.g. 5, 9" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="taxDefault">Default rate (%)</Label>
                                    <Input id="taxDefault" value={taxDefault} onChange={(e) => setTaxDefault(e.target.value)} placeholder="One of your rates" />
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="supportEmail">Support Email</Label>
                                <div className="relative">
                                    <Mail className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                    <Input
                                        id="supportEmail"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="contact@company.com"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="phone">Phone Number</Label>
                                <div className="relative">
                                    <Phone className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                    <Input
                                        id="phone"
                                        value={phone}
                                        onChange={(e) => setPhone(e.target.value)}
                                        placeholder="+91 9876543210"
                                        className="pl-9"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="website">Website</Label>
                            <div className="relative">
                                <Globe className="h-4 w-4 absolute left-3 top-3 text-muted-foreground" />
                                <Input
                                    id="website"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    placeholder="https://company.com"
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        {/* Registered Address */}
                        <div className="border-t pt-4">
                            <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
                                <MapPin className="h-3.5 w-3.5" /> Registered Office Address
                            </h4>
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label htmlFor="street" className="text-xs">Street Address</Label>
                                    <Input
                                        id="street"
                                        value={address.street}
                                        onChange={(e) => setAddress((prev) => ({ ...prev, street: e.target.value }))}
                                        placeholder="Suite 400, Tech Park, Main Street"
                                    />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="companyCountry" className="text-xs">Country</Label>
                                        <AutoSuggestInput
                                            id="companyCountry"
                                            value={address.country || ""}
                                            onChange={(e) => setAddress((prev) => ({ ...prev, country: e.target.value }))}
                                            options={searchCountries(address.country || "").map((c) => ({
                                                label: c.name,
                                                value: c.name,
                                                subLabel: c.code,
                                                icon: c.flag,
                                            }))}
                                            onSelectOption={(opt) => {
                                                setAddress((prev) => ({ ...prev, country: opt.value }))
                                                if (opt.subLabel) setCountryCode(opt.subLabel)
                                            }}
                                            placeholder="Type country..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="companyState" className="text-xs">State / Province</Label>
                                        <AutoSuggestInput
                                            id="companyState"
                                            value={address.state || ""}
                                            onChange={(e) => setAddress((prev) => ({ ...prev, state: e.target.value }))}
                                            options={searchStates(address.state || "", address.country).map((s) => ({
                                                label: s.name,
                                                value: s.name,
                                                subLabel: s.code,
                                            }))}
                                            onSelectOption={(opt) => setAddress((prev) => ({ ...prev, state: opt.value }))}
                                            placeholder="Type state..."
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="companyCity" className="text-xs">City</Label>
                                        <AutoSuggestInput
                                            id="companyCity"
                                            value={address.city || ""}
                                            onChange={(e) => setAddress((prev) => ({ ...prev, city: e.target.value }))}
                                            options={searchCities(address.city || "", address.state, address.country).map((c) => ({
                                                label: c.name,
                                                value: c.name,
                                                subLabel: `${c.stateName} • ${c.pincode}`,
                                            }))}
                                            onSelectOption={(opt) => {
                                                const parts = opt.subLabel ? opt.subLabel.split(" • ") : []
                                                setAddress((prev) => ({
                                                    ...prev,
                                                    city: opt.value,
                                                    state: parts[0] || prev.state,
                                                    postalCode: parts[1] || prev.postalCode,
                                                }))
                                            }}
                                            placeholder="Type city..."
                                        />
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <Label htmlFor="postalCode" className="text-xs">Postal / PIN Code</Label>
                                    <Input
                                        id="postalCode"
                                        value={address.postalCode}
                                        onChange={(e) => setAddress((prev) => ({ ...prev, postalCode: e.target.value }))}
                                        placeholder="e.g. 400001 or 94107"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="pt-2 flex justify-end">
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                                <Save className="h-4 w-4" />
                                {isSaving ? "Saving Changes..." : "Save Profile"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Brand Asset / Logo Card */}
                <Card className="lg:col-span-3 border shadow-sm flex flex-col justify-between">
                    <div>
                        <CardHeader className="bg-primary/5 border-b pb-4">
                            <CardTitle className="text-md flex items-center gap-2">
                                <Building2 className="h-4 w-4 text-primary" /> Brand Identity & Logo
                            </CardTitle>
                            <CardDescription>
                                This logo appears on your PDF invoices, quotations, and client portal.
                            </CardDescription>
                        </CardHeader>

                        <CardContent className="pt-6 space-y-5">
                            {/* Logo Display */}
                            <div className="h-44 w-full rounded-xl border-2 border-dashed border-muted-foreground/25 bg-muted/10 flex flex-col items-center justify-center p-4 relative overflow-hidden group">
                                {logoUrl ? (
                                    <div className="relative w-full h-full flex items-center justify-center">
                                        <img
                                            src={logoUrl}
                                            alt="Tenant Brand Logo"
                                            className="max-h-36 max-w-full object-contain drop-shadow-sm rounded"
                                        />
                                    </div>
                                ) : (
                                    <div className="flex flex-col items-center justify-center text-center p-4">
                                        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center text-primary mb-2">
                                            <Building2 className="h-8 w-8 opacity-60" />
                                        </div>
                                        <p className="text-sm font-semibold">No logo configured</p>
                                        <p className="text-xs text-muted-foreground mt-1">Upload a PNG or JPG image</p>
                                    </div>
                                )}
                            </div>

                            {/* Upload controls */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="file"
                                        id="logoFileInput"
                                        accept="image/png,image/jpeg"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full gap-2 cursor-pointer"
                                        disabled={isUploading}
                                        onClick={() => document.getElementById("logoFileInput")?.click()}
                                    >
                                        <Upload className="h-4 w-4" /> {isUploading ? "Uploading…" : logoUrl ? "Replace logo" : "Upload logo"}
                                    </Button>
                                    {logoUrl && (
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            disabled={isUploading}
                                            className="text-destructive hover:bg-destructive/10"
                                            onClick={handleRemoveLogo}
                                            aria-label="Remove logo"
                                            title="Remove logo"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    )}
                                </div>
                                <p className="text-[11px] text-muted-foreground leading-relaxed">
                                    PNG or JPG, up to 1 MB. A transparent PNG at least 300px wide prints best. Changes apply straight away.
                                </p>
                            </div>
                        </CardContent>
                    </div>

                    <div className="p-4 border-t bg-muted/10 flex justify-end">
                        <Button onClick={handleSave} disabled={isSaving} size="sm" className="gap-2">
                            <Save className="h-4 w-4" />
                            {isSaving ? "Saving..." : "Apply & Save Branding"}
                        </Button>
                    </div>
                </Card>
            </div>
        </div>
    )
}
