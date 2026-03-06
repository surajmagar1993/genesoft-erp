"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowLeft, Save, X } from "lucide-react"
import { COUNTRIES } from "@/lib/constants/countries"

export interface ContactFormData {
    type: "INDIVIDUAL" | "COMPANY"
    firstName: string
    lastName: string
    companyName: string
    displayName: string
    email: string
    phoneDialCode: string
    phone: string
    mobileDialCode: string
    mobile: string
    website: string
    customerGroup: string
    countryCode: string
    // India
    gstin: string
    pan: string
    cin: string
    tan: string
    msmeUdyam: string
    // UAE
    trn: string
    tradeLicense: string
    // KSA
    vatNumberKsa: string
    crNumber: string
    // USA
    ein: string
    // Financial
    currencyCode: string
    creditLimit: string
    // Address
    billingStreet: string
    billingCity: string
    billingState: string
    billingZip: string
    billingCountry: string
    notes: string
}

export const emptyContactForm: ContactFormData = {
    type: "COMPANY",
    firstName: "",
    lastName: "",
    companyName: "",
    displayName: "",
    email: "",
    phoneDialCode: "+91",
    phone: "",
    mobileDialCode: "+91",
    mobile: "",
    website: "",
    customerGroup: "retail",
    countryCode: "IN",
    gstin: "",
    pan: "",
    cin: "",
    tan: "",
    msmeUdyam: "",
    trn: "",
    tradeLicense: "",
    vatNumberKsa: "",
    crNumber: "",
    ein: "",
    currencyCode: "INR",
    creditLimit: "",
    billingStreet: "",
    billingCity: "",
    billingState: "",
    billingZip: "",
    billingCountry: "India",
    notes: "",
}

interface ContactFormProps {
    initialData?: ContactFormData
    mode: "create" | "edit"
}

export function ContactForm({ initialData, mode }: ContactFormProps) {
    const router = useRouter()
    const [form, setForm] = useState<ContactFormData>(initialData || emptyContactForm)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const update = (key: keyof ContactFormData, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const handleSave = async () => {
        setIsSubmitting(true)
        // Simulate API call
        await new Promise((resolve) => setTimeout(resolve, 500))

        const displayName =
            form.type === "COMPANY"
                ? form.companyName
                : `${form.firstName} ${form.lastName}`.trim()

        console.log("Saving contact:", { ...form, displayName })

        setIsSubmitting(false)
        router.push("/crm/contacts")
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push("/crm/contacts")}>
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">
                            {mode === "create" ? "New Contact" : "Edit Contact"}
                        </h1>
                        <p className="text-muted-foreground mt-1">
                            {mode === "create"
                                ? "Add a new customer, vendor, or lead"
                                : "Update contact information"}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" onClick={() => router.push("/crm/contacts")} disabled={isSubmitting}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {isSubmitting ? "Saving..." : "Save Contact"}
                    </Button>
                </div>
            </div>

            <Card>
                <CardContent className="p-6">
                    <Tabs defaultValue="basic" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 mb-6">
                            <TabsTrigger value="basic">Basic Info</TabsTrigger>
                            <TabsTrigger value="tax">Tax & Compliance</TabsTrigger>
                            <TabsTrigger value="address">Address</TabsTrigger>
                            <TabsTrigger value="financial">Financial Details</TabsTrigger>
                        </TabsList>

                        {/* ── Basic Info ── */}
                        <TabsContent value="basic" className="space-y-6">
                            {/* Contact Type */}
                            <div className="space-y-2">
                                <Label>Contact Type</Label>
                                <div className="flex gap-2">
                                    {(["INDIVIDUAL", "COMPANY"] as const).map((t) => (
                                        <Badge
                                            key={t}
                                            variant={form.type === t ? "default" : "outline"}
                                            className="cursor-pointer px-4 py-1.5 text-sm"
                                            onClick={() => update("type", t)}
                                        >
                                            {t === "INDIVIDUAL" ? "👤 Individual" : "🏢 Company"}
                                        </Badge>
                                    ))}
                                </div>
                            </div>

                            {form.type === "COMPANY" ? (
                                <div className="space-y-2">
                                    <Label htmlFor="companyName">Company Name <span className="text-red-500">*</span></Label>
                                    <Input
                                        id="companyName"
                                        value={form.companyName}
                                        onChange={(e) => update("companyName", e.target.value)}
                                        placeholder="e.g. Acme Corporation"
                                    />
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="firstName">First Name <span className="text-red-500">*</span></Label>
                                        <Input
                                            id="firstName"
                                            value={form.firstName}
                                            onChange={(e) => update("firstName", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="lastName">Last Name</Label>
                                        <Input
                                            id="lastName"
                                            value={form.lastName}
                                            onChange={(e) => update("lastName", e.target.value)}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
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
                                    <Label htmlFor="customerGroup">Customer Group</Label>
                                    <Select value={form.customerGroup} onValueChange={(v) => update("customerGroup", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select group" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="retail">Retail</SelectItem>
                                            <SelectItem value="wholesale">Wholesale</SelectItem>
                                            <SelectItem value="dealer">Dealer</SelectItem>
                                            <SelectItem value="enterprise">Enterprise</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="phone">Phone</Label>
                                    <div className="flex gap-2">
                                        <Select value={form.phoneDialCode} onValueChange={(v) => update("phoneDialCode", v)}>
                                            <SelectTrigger className="w-[100px] shrink-0">
                                                <SelectValue placeholder="Code" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COUNTRIES.map((c) => (
                                                    <SelectItem key={`phone-${c.code}`} value={c.dialCode}>
                                                        {c.flag} {c.dialCode}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            id="phone"
                                            value={form.phone}
                                            onChange={(e) => update("phone", e.target.value)}
                                            placeholder="1234567890"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="mobile">Mobile (Optional)</Label>
                                    <div className="flex gap-2">
                                        <Select value={form.mobileDialCode} onValueChange={(v) => update("mobileDialCode", v)}>
                                            <SelectTrigger className="w-[100px] shrink-0">
                                                <SelectValue placeholder="Code" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {COUNTRIES.map((c) => (
                                                    <SelectItem key={`mobile-${c.code}`} value={c.dialCode}>
                                                        {c.flag} {c.dialCode}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Input
                                            id="mobile"
                                            value={form.mobile}
                                            onChange={(e) => update("mobile", e.target.value)}
                                            placeholder="9876543210"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    value={form.website}
                                    onChange={(e) => update("website", e.target.value)}
                                    placeholder="https://www.example.com"
                                />
                            </div>
                        </TabsContent>

                        {/* ── Tax IDs ── */}
                        <TabsContent value="tax" className="space-y-6">
                            <div className="space-y-2 mb-6">
                                <Label>Tax Country</Label>
                                <Select value={form.countryCode} onValueChange={(v) => update("countryCode", v)}>
                                    <SelectTrigger className="w-[280px]">
                                        <SelectValue placeholder="Select Country" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {COUNTRIES.map((c) => (
                                            <SelectItem key={c.code} value={c.code}>
                                                <span className="flex items-center gap-2">
                                                    <span>{c.flag}</span>
                                                    {c.name}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground mt-1">Select country to show specific tax fields</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                                {form.countryCode === "IN" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="gstin">GSTIN</Label>
                                            <Input id="gstin" value={form.gstin} onChange={(e) => update("gstin", e.target.value)} placeholder="22AAAAA0000A1Z5" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="pan">PAN</Label>
                                            <Input id="pan" value={form.pan} onChange={(e) => update("pan", e.target.value)} placeholder="ABCDE1234F" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="cin">CIN (Corporate Identity)</Label>
                                            <Input id="cin" value={form.cin} onChange={(e) => update("cin", e.target.value)} />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="msmeUdyam">MSME / Udyam No</Label>
                                            <Input id="msmeUdyam" value={form.msmeUdyam} onChange={(e) => update("msmeUdyam", e.target.value)} />
                                        </div>
                                    </>
                                )}

                                {form.countryCode === "AE" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="trn">TRN (Tax Registration Number)</Label>
                                            <Input id="trn" value={form.trn} onChange={(e) => update("trn", e.target.value)} placeholder="100000000000003" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="tradeLicense">Trade License Number</Label>
                                            <Input id="tradeLicense" value={form.tradeLicense} onChange={(e) => update("tradeLicense", e.target.value)} />
                                        </div>
                                    </>
                                )}

                                {form.countryCode === "US" && (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="ein">EIN (Employer Identification Number)</Label>
                                            <Input id="ein" value={form.ein} onChange={(e) => update("ein", e.target.value)} placeholder="XX-XXXXXXX" />
                                        </div>
                                    </>
                                )}

                                {form.countryCode !== "IN" && form.countryCode !== "AE" && form.countryCode !== "US" && (
                                    <div className="col-span-2 text-sm text-muted-foreground p-4 bg-muted/50 rounded-lg text-center">
                                        Generic tax validation applies for this region. Please add notes for specific IDs.
                                    </div>
                                )}
                            </div>
                        </TabsContent>

                        {/* ── Address ── */}
                        <TabsContent value="address" className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="billingStreet">Street Address</Label>
                                <Input id="billingStreet" value={form.billingStreet} onChange={(e) => update("billingStreet", e.target.value)} />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="billingCity">City</Label>
                                    <Input id="billingCity" value={form.billingCity} onChange={(e) => update("billingCity", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="billingState">State / Province</Label>
                                    <Input id="billingState" value={form.billingState} onChange={(e) => update("billingState", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="billingZip">ZIP / Postal Code</Label>
                                    <Input id="billingZip" value={form.billingZip} onChange={(e) => update("billingZip", e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="billingCountry">Country</Label>
                                    <Input id="billingCountry" value={form.billingCountry} onChange={(e) => update("billingCountry", e.target.value)} />
                                </div>
                            </div>
                        </TabsContent>

                        {/* ── Financial ── */}
                        <TabsContent value="financial" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="currencyCode">Base Currency</Label>
                                    <Select value={form.currencyCode} onValueChange={(v) => update("currencyCode", v)}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Currency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="INR">₹ (INR) Indian Rupee</SelectItem>
                                            <SelectItem value="USD">$ (USD) US Dollar</SelectItem>
                                            <SelectItem value="EUR">€ (EUR) Euro</SelectItem>
                                            <SelectItem value="AED">د.إ (AED) UAE Dirham</SelectItem>
                                            <SelectItem value="GBP">£ (GBP) British Pound</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="creditLimit">Credit Limit</Label>
                                    <Input
                                        id="creditLimit"
                                        type="number"
                                        value={form.creditLimit}
                                        onChange={(e) => update("creditLimit", e.target.value)}
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="notes">Internal Notes</Label>
                                <textarea
                                    id="notes"
                                    className="flex min-h-[120px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                                    placeholder="Add any internal payment terms or financial notes here..."
                                    value={form.notes}
                                    onChange={(e) => update("notes", e.target.value)}
                                />
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    )
}
