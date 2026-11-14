"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createVendor } from "@/app/actions/purchase"
import { unwrap } from "@/lib/action-result"
import { errorMessage } from "@/lib/utils"
import { searchCountries, searchStates, searchCities } from "@/lib/constants/geo-locations"
import { AutoSuggestInput } from "@/components/ui/auto-suggest-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { findCities, findStates } from "@/app/actions/geo"

/** New supplier (full page; suppliers are listed on /purchase). */
export function VendorForm() {
    const router = useRouter()
    const [saving, setSaving] = useState(false)
    const [f, setF] = useState({ companyName: "", displayName: "", email: "", phone: "", taxId: "", country: "", countryCode: "", state: "", city: "" })
    const set = (change: Partial<typeof f>) => setF((prev) => ({ ...prev, ...change }))

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        // The company name alone is enough; the contact person is optional
        const displayName = f.displayName.trim() || f.companyName.trim()
        if (!displayName) return toast.error("Enter the supplier's company name or a contact person")
        setSaving(true)
        try {
            unwrap(await createVendor({
                displayName,
                companyName: f.companyName.trim() || undefined,
                email: f.email.trim() || undefined,
                phone: f.phone.trim() || undefined,
                gstin: f.taxId.trim() || undefined,
                city: f.city.trim() || undefined,
                state: f.state.trim() || undefined,
                // Without a picked country the business's own is used
                countryCode: f.countryCode || undefined,
            }))
            toast.success("Supplier added")
            router.push("/purchase?tab=vendors")
            router.refresh()
        } catch (err) {
            toast.error(errorMessage(err) || "The supplier couldn't be added")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild aria-label="Back to purchases">
                    <Link href="/purchase"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">New supplier</h1>
                    <p className="text-sm text-muted-foreground">Suppliers can be used on purchase orders, RFQs and bills.</p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Supplier</CardTitle>
                        <CardDescription>The company name alone is enough to start.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="v-company">Company name *</Label>
                            <Input id="v-company" placeholder="Enter company or trade name" value={f.companyName} onChange={(e) => set({ companyName: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="v-person">Contact person</Label>
                            <Input id="v-person" placeholder="Enter contact person's name" value={f.displayName} onChange={(e) => set({ displayName: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="v-email">Email</Label>
                            <Input id="v-email" type="email" placeholder="Enter supplier email" value={f.email} onChange={(e) => set({ email: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="v-phone">Phone</Label>
                            <Input id="v-phone" type="tel" placeholder="Enter phone with country code" value={f.phone} onChange={(e) => set({ phone: e.target.value })} />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="v-tax">Tax ID</Label>
                            <Input id="v-tax" placeholder="Enter GSTIN, VAT or other tax number (optional)" value={f.taxId} onChange={(e) => set({ taxId: e.target.value })} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Address</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5">
                            <Label htmlFor="v-country">Country</Label>
                            <AutoSuggestInput
                                id="v-country"
                                placeholder="Start typing a country"
                                value={f.country}
                                onChange={(e) => set({ country: e.target.value, countryCode: "" })}
                                options={searchCountries(f.country).map((c) => ({ label: c.name, value: c.name, subLabel: c.code, icon: c.flag }))}
                                onSelectOption={(opt) => set({ country: opt.value, countryCode: opt.subLabel || "" })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="v-state">State / region</Label>
                            <AutoSuggestInput
                                id="v-state"
                                placeholder="Start typing a state"
                                value={f.state}
                                onChange={(e) => set({ state: e.target.value })}
                                loadOptions={(q) => findStates(q, f.country || "")}
                                options={searchStates(f.state, f.country).map((s) => ({ label: s.name, value: s.name, subLabel: s.code }))}
                                onSelectOption={(opt) => set({ state: opt.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="v-city">City</Label>
                            <AutoSuggestInput
                                id="v-city"
                                placeholder="Start typing a city"
                                value={f.city}
                                onChange={(e) => set({ city: e.target.value })}
                                loadOptions={(q) => findCities(q, f.state || "", f.country || "")}
                                options={searchCities(f.city, f.state, f.country).map((c) => ({ label: c.name, value: c.name, subLabel: `${c.stateName} • ${c.pincode}` }))}
                                onSelectOption={(opt) => {
                                    const stateName = opt.subLabel?.split(" • ")[0]?.trim()
                                    set({ city: opt.value, ...(stateName && !f.state ? { state: stateName } : {}) })
                                }}
                            />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild><Link href="/purchase">Cancel</Link></Button>
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add supplier
                    </Button>
                </div>
            </form>
        </div>
    )
}
