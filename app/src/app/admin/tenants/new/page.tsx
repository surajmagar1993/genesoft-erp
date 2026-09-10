"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { ArrowLeft, Building2, ShieldCheck, Sparkles, Loader2 } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { createTenant } from "@/app/actions/saas/admin"

const COUNTRIES = [
    { code: "IN", label: "India (+91)", currency: "INR" },
    { code: "US", label: "United States (+1)", currency: "USD" },
    { code: "AE", label: "United Arab Emirates (+971)", currency: "AED" },
    { code: "SA", label: "Saudi Arabia (+966)", currency: "SAR" },
    { code: "GB", label: "United Kingdom (+44)", currency: "GBP" },
    { code: "DE", label: "Germany (+49)", currency: "EUR" },
    { code: "SG", label: "Singapore (+65)", currency: "SGD" },
    { code: "AU", label: "Australia (+61)", currency: "AUD" }
]

const CURRENCIES = [
    { code: "INR", label: "INR (₹) - Indian Rupee" },
    { code: "USD", label: "USD ($) - US Dollar" },
    { code: "AED", label: "AED (د.إ) - UAE Dirham" },
    { code: "SAR", label: "SAR (﷼) - Saudi Riyal" },
    { code: "EUR", label: "EUR (€) - Euro" },
    { code: "GBP", label: "GBP (£) - British Pound" },
    { code: "SGD", label: "SGD (S$) - Singapore Dollar" },
    { code: "AUD", label: "AUD (A$) - Australian Dollar" }
]

const PLANS = [
    { id: "FREE", name: "Free Tier", desc: "Basic single-user access with limited storage" },
    { id: "BASIC", name: "Basic", desc: "Core CRM & Invoicing for early micro-businesses" },
    { id: "PRO", name: "Professional", desc: "Full ERP operations, Indian GST, & Multi-currency" },
    { id: "ENTERPRISE", name: "Enterprise", desc: "Dedicated scale, custom SLAs, & unlimited modules" }
]

export default function NewTenantPage() {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)

    const [form, setForm] = useState({
        name: "",
        email: "",
        domain: "",
        phone: "",
        countryCode: "IN",
        currencyCode: "INR",
        plan: "PRO",
        trialDays: 15,
        seedAccounts: true
    })

    const handleCountryChange = (countryCode: string) => {
        const found = COUNTRIES.find(c => c.code === countryCode)
        setForm(prev => ({
            ...prev,
            countryCode,
            currencyCode: found ? found.currency : prev.currencyCode
        }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!form.name.trim()) {
            toast.error("Business name is required")
            return
        }

        try {
            setIsLoading(true)
            const newTenant = await createTenant({
                name: form.name,
                email: form.email || undefined,
                domain: form.domain || undefined,
                phone: form.phone || undefined,
                countryCode: form.countryCode,
                currencyCode: form.currencyCode,
                plan: form.plan,
                trialDays: Number(form.trialDays) || 0,
                seedAccounts: form.seedAccounts
            })

            toast.success("Business tenant provisioned successfully!")
            router.push(`/admin/tenants/${newTenant.id}`)
            router.refresh()
        } catch (error: any) {
            console.error("Failed to create tenant:", error)
            toast.error(error?.message || "Failed to create tenant")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto px-4 pb-12">
            {/* Header & Back Navigation */}
            <div className="flex items-center gap-4">
                <Link href="/admin/tenants">
                    <Button variant="ghost" size="icon" className="h-9 w-9 hover:bg-muted">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                </Link>
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold tracking-tight">Provision New Business Tenant</h1>
                        <span className="bg-primary/10 text-primary text-[11px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Super Admin
                        </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-0.5">
                        Manually configure an organization, subscription tier, and initialize enterprise accounts.
                    </p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Organization Details */}
                <Card className="border-primary/10 shadow-md bg-card/60 backdrop-blur">
                    <CardHeader className="pb-4 border-b bg-muted/20">
                        <div className="flex items-center gap-2">
                            <Building2 className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Organization Profile</CardTitle>
                        </div>
                        <CardDescription>
                            Primary entity information and workspace identifiers.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="name" className="text-sm font-medium">
                                    Business Name <span className="text-destructive">*</span>
                                </Label>
                                <Input
                                    id="name"
                                    required
                                    value={form.name}
                                    onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                                    placeholder="Enter registered business name"
                                    className="bg-background"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email" className="text-sm font-medium">
                                    Primary Administrative Email
                                </Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.email}
                                    onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))}
                                    placeholder="Enter administrative contact email"
                                    className="bg-background"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="domain" className="text-sm font-medium">
                                    Subdomain / Custom Domain
                                </Label>
                                <Input
                                    id="domain"
                                    value={form.domain}
                                    onChange={e => setForm(prev => ({ ...prev, domain: e.target.value }))}
                                    placeholder="Enter unique subdomain or domain name"
                                    className="bg-background"
                                />
                                <p className="text-[11px] text-muted-foreground">
                                    Leave blank to allow auto-generation or multi-tenant wildcard routing.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone" className="text-sm font-medium">
                                    Official Contact Phone
                                </Label>
                                <Input
                                    id="phone"
                                    value={form.phone}
                                    onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))}
                                    placeholder="Enter contact telephone number"
                                    className="bg-background"
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Regional & Financial Settings */}
                <Card className="border-primary/10 shadow-md bg-card/60 backdrop-blur">
                    <CardHeader className="pb-4 border-b bg-muted/20">
                        <div className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Localization & Accounting Standards</CardTitle>
                        </div>
                        <CardDescription>
                            Configure country compliance rules and default operational currency.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="countryCode" className="text-sm font-medium">
                                    Operating Country / Tax Jurisdiction
                                </Label>
                                <select
                                    id="countryCode"
                                    value={form.countryCode}
                                    onChange={e => handleCountryChange(e.target.value)}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    {COUNTRIES.map(c => (
                                        <option key={c.code} value={c.code}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="currencyCode" className="text-sm font-medium">
                                    Base System Currency
                                </Label>
                                <select
                                    id="currencyCode"
                                    value={form.currencyCode}
                                    onChange={e => setForm(prev => ({ ...prev, currencyCode: e.target.value }))}
                                    className="w-full h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                                >
                                    {CURRENCIES.map(c => (
                                        <option key={c.code} value={c.code}>
                                            {c.label}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="pt-2">
                            <label className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 cursor-pointer transition-colors">
                                <input
                                    type="checkbox"
                                    checked={form.seedAccounts}
                                    onChange={e => setForm(prev => ({ ...prev, seedAccounts: e.target.checked }))}
                                    className="mt-1 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <div className="text-sm">
                                    <span className="font-semibold block">Auto-seed Standard Chart of Accounts (39 Accounts)</span>
                                    <span className="text-muted-foreground text-xs">
                                        Populates standard Indian CoA hierarchical tree (Assets, Liabilities, Equity, Revenue, and Expenses).
                                    </span>
                                </div>
                            </label>
                        </div>
                    </CardContent>
                </Card>

                {/* Subscription & Trial Configuration */}
                <Card className="border-primary/10 shadow-md bg-card/60 backdrop-blur">
                    <CardHeader className="pb-4 border-b bg-muted/20">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="h-4 w-4 text-primary" />
                            <CardTitle className="text-base">Subscription Plan & Trial Entitlement</CardTitle>
                        </div>
                        <CardDescription>
                            Select tenant service tier and grace trial period.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="pt-6 space-y-6">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {PLANS.map(p => {
                                const isSelected = form.plan === p.id
                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => setForm(prev => ({ ...prev, plan: p.id }))}
                                        className={`p-3.5 rounded-lg border-2 cursor-pointer transition-all ${
                                            isSelected
                                                ? "border-primary bg-primary/5 shadow-sm"
                                                : "border-border hover:border-primary/30 hover:bg-muted/20"
                                        }`}
                                    >
                                        <div className="font-bold text-sm">{p.name}</div>
                                        <div className="text-xs text-muted-foreground mt-1 leading-snug">
                                            {p.desc}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        <div className="space-y-2 max-w-xs">
                            <Label htmlFor="trialDays" className="text-sm font-medium">
                                Initial Trial Duration (Days)
                            </Label>
                            <Input
                                id="trialDays"
                                type="number"
                                min="0"
                                max="365"
                                value={form.trialDays}
                                onChange={e => setForm(prev => ({ ...prev, trialDays: parseInt(e.target.value) || 0 }))}
                                placeholder="Enter trial duration in days"
                                className="bg-background"
                            />
                            <p className="text-[11px] text-muted-foreground">
                                Set to 0 to provision without an active trial window.
                            </p>
                        </div>
                    </CardContent>
                </Card>

                {/* Actions Footer */}
                <div className="flex items-center justify-end gap-3 pt-4">
                    <Link href="/admin/tenants">
                        <Button variant="outline" type="button" disabled={isLoading}>
                            Cancel
                        </Button>
                    </Link>
                    <Button type="submit" disabled={isLoading} className="gap-2 font-semibold min-w-[160px]">
                        {isLoading ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Provisioning...
                            </>
                        ) : (
                            <>
                                <Building2 className="h-4 w-4" />
                                Provision Tenant
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </div>
    )
}
