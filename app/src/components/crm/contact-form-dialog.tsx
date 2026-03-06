"use client"

import { useState } from "react"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, ChevronsUpDown } from "lucide-react"
import { cn } from "@/lib/utils"
import { COUNTRIES } from "@/lib/constants/countries"

interface ContactFormData {
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

const emptyForm: ContactFormData = {
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

interface ContactFormDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (data: ContactFormData) => void
    initialData?: ContactFormData
    mode: "create" | "edit"
}

export function ContactFormDialog({
    open,
    onOpenChange,
    onSave,
    initialData,
    mode,
}: ContactFormDialogProps) {
    const [form, setForm] = useState<ContactFormData>(initialData || emptyForm)

    const update = (key: keyof ContactFormData, value: string) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    const handleSave = () => {
        const displayName =
            form.type === "COMPANY"
                ? form.companyName
                : `${form.firstName} ${form.lastName}`.trim()
        onSave({ ...form, displayName })
        onOpenChange(false)
        setForm(emptyForm)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {mode === "create" ? "New Contact" : "Edit Contact"}
                    </DialogTitle>
                    <DialogDescription>
                        {mode === "create"
                            ? "Add a new customer, vendor, or lead"
                            : "Update contact information"}
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="basic" className="mt-2">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="basic">Basic</TabsTrigger>
                        <TabsTrigger value="tax">Tax IDs</TabsTrigger>
                        <TabsTrigger value="address">Address</TabsTrigger>
                        <TabsTrigger value="financial">Financial</TabsTrigger>
                    </TabsList>

                    {/* ── Basic Info ── */}
                    <TabsContent value="basic" className="space-y-4 mt-4">
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
                                <Label htmlFor="companyName">Company Name *</Label>
                                <Input
                                    id="companyName"
                                    value={form.companyName}
                                    onChange={(e) => update("companyName", e.target.value)}
                                />
                            </div>
                        ) : (
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="firstName">First Name *</Label>
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
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="mobile">Mobile</Label>
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
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="website">Website</Label>
                                <Input
                                    id="website"
                                    value={form.website}
                                    onChange={(e) => update("website", e.target.value)}
                                    placeholder="https://example.com"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Customer Group</Label>
                                <div className="flex gap-2">
                                    {["retail", "dealer"].map((g) => (
                                        <Badge
                                            key={g}
                                            variant={form.customerGroup === g ? "default" : "outline"}
                                            className="cursor-pointer capitalize px-3 py-1"
                                            onClick={() => update("customerGroup", g)}
                                        >
                                            {g}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-2 flex flex-col">
                                <Label>Country</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className={cn(
                                                "w-full justify-between",
                                                !form.countryCode && "text-muted-foreground"
                                            )}
                                        >
                                            {form.countryCode
                                                ? `${COUNTRIES.find((c) => c.code === form.countryCode)?.flag} ${COUNTRIES.find((c) => c.code === form.countryCode)?.name
                                                }`
                                                : "Select country"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search country..." />
                                            <CommandList>
                                                <CommandEmpty>No country found.</CommandEmpty>
                                                <CommandGroup>
                                                    {COUNTRIES.map((c) => (
                                                        <CommandItem
                                                            key={c.code}
                                                            value={c.name}
                                                            onSelect={() => {
                                                                update("countryCode", c.code)
                                                                if (c.currency) {
                                                                    update("currencyCode", c.currency)
                                                                }
                                                            }}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    c.code === form.countryCode
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            <span className="mr-2">{c.flag}</span>
                                                            {c.name}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                        </div>
                    </TabsContent>

                    {/* ── Tax Identifiers ── */}
                    <TabsContent value="tax" className="space-y-4 mt-4">
                        {form.countryCode === "IN" && (
                            <>
                                <p className="text-sm text-muted-foreground">🇮🇳 India Tax Identifiers</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="gstin">GSTIN</Label>
                                        <Input
                                            id="gstin"
                                            value={form.gstin}
                                            onChange={(e) => update("gstin", e.target.value.toUpperCase())}
                                            maxLength={15}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="pan">PAN</Label>
                                        <Input
                                            id="pan"
                                            value={form.pan}
                                            onChange={(e) => update("pan", e.target.value.toUpperCase())}
                                            maxLength={10}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cin">CIN</Label>
                                        <Input
                                            id="cin"
                                            value={form.cin}
                                            onChange={(e) => update("cin", e.target.value.toUpperCase())}
                                            maxLength={21}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tan">TAN</Label>
                                        <Input
                                            id="tan"
                                            value={form.tan}
                                            onChange={(e) => update("tan", e.target.value.toUpperCase())}
                                            maxLength={10}
                                        />
                                    </div>
                                    <div className="space-y-2 col-span-2">
                                        <Label htmlFor="msmeUdyam">MSME/Udyam Number</Label>
                                        <Input
                                            id="msmeUdyam"
                                            value={form.msmeUdyam}
                                            onChange={(e) => update("msmeUdyam", e.target.value.toUpperCase())}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {form.countryCode === "AE" && (
                            <>
                                <p className="text-sm text-muted-foreground">🇦🇪 UAE Tax Identifiers</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="trn">TRN (Tax Registration Number)</Label>
                                        <Input
                                            id="trn"
                                            value={form.trn}
                                            onChange={(e) => update("trn", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="tradeLicense">Trade License</Label>
                                        <Input
                                            id="tradeLicense"
                                            value={form.tradeLicense}
                                            onChange={(e) => update("tradeLicense", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {form.countryCode === "SA" && (
                            <>
                                <p className="text-sm text-muted-foreground">🇸🇦 Saudi Arabia Tax Identifiers</p>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="vatNumberKsa">VAT Number</Label>
                                        <Input
                                            id="vatNumberKsa"
                                            value={form.vatNumberKsa}
                                            onChange={(e) => update("vatNumberKsa", e.target.value)}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="crNumber">Commercial Registration (CR)</Label>
                                        <Input
                                            id="crNumber"
                                            value={form.crNumber}
                                            onChange={(e) => update("crNumber", e.target.value)}
                                        />
                                    </div>
                                </div>
                            </>
                        )}

                        {form.countryCode === "US" && (
                            <>
                                <p className="text-sm text-muted-foreground">🇺🇸 USA Tax Identifiers</p>
                                <div className="space-y-2">
                                    <Label htmlFor="ein">EIN (Employer ID Number)</Label>
                                    <Input
                                        id="ein"
                                        value={form.ein}
                                        onChange={(e) => update("ein", e.target.value)}
                                    />
                                </div>
                            </>
                        )}
                    </TabsContent>

                    {/* ── Address ── */}
                    <TabsContent value="address" className="space-y-4 mt-4">
                        <p className="text-sm text-muted-foreground">Billing Address</p>
                        <div className="space-y-2">
                            <Label htmlFor="billingStreet">Street</Label>
                            <Input
                                id="billingStreet"
                                value={form.billingStreet}
                                onChange={(e) => update("billingStreet", e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="billingCity">City</Label>
                                <Input
                                    id="billingCity"
                                    value={form.billingCity}
                                    onChange={(e) => update("billingCity", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="billingState">State</Label>
                                <Input
                                    id="billingState"
                                    value={form.billingState}
                                    onChange={(e) => update("billingState", e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="billingZip">PIN / ZIP Code</Label>
                                <Input
                                    id="billingZip"
                                    value={form.billingZip}
                                    onChange={(e) => update("billingZip", e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="billingCountry">Country</Label>
                                <Input
                                    id="billingCountry"
                                    value={form.billingCountry}
                                    onChange={(e) => update("billingCountry", e.target.value)}
                                    placeholder="India"
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                                id="notes"
                                value={form.notes}
                                onChange={(e) => update("notes", e.target.value)}
                                placeholder="Any additional notes..."
                            />
                        </div>
                    </TabsContent>

                    {/* ── Financial ── */}
                    <TabsContent value="financial" className="space-y-4 mt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2 flex flex-col">
                                <Label>Currency</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            variant="outline"
                                            role="combobox"
                                            className="w-full justify-between"
                                        >
                                            {form.currencyCode || "Select currency"}
                                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-[300px] p-0">
                                        <Command>
                                            <CommandInput placeholder="Search currency..." />
                                            <CommandList>
                                                <CommandEmpty>No currency found.</CommandEmpty>
                                                <CommandGroup>
                                                    {Array.from(new Set(COUNTRIES.map(c => c.currency))).filter(Boolean).sort().map((curr) => (
                                                        <CommandItem
                                                            key={curr}
                                                            value={curr}
                                                            onSelect={() => update("currencyCode", curr)}
                                                        >
                                                            <Check
                                                                className={cn(
                                                                    "mr-2 h-4 w-4",
                                                                    curr === form.currencyCode
                                                                        ? "opacity-100"
                                                                        : "opacity-0"
                                                                )}
                                                            />
                                                            {curr}
                                                        </CommandItem>
                                                    ))}
                                                </CommandGroup>
                                            </CommandList>
                                        </Command>
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="creditLimit">Credit Limit</Label>
                                <div className="relative">
                                    <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">
                                        {form.currencyCode}
                                    </span>
                                    <Input
                                        id="creditLimit"
                                        type="number"
                                        className="pl-8"
                                        value={form.creditLimit}
                                        onChange={(e) => update("creditLimit", e.target.value)}
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Maximum outstanding balance allowed
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter className="mt-4">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave}>
                        {mode === "create" ? "Create Contact" : "Save Changes"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
