"use client"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createWarehouse, updateWarehouse, type WarehouseItem } from "@/app/actions/inventory"
import { unwrap } from "@/lib/action-result"
import { errorMessage } from "@/lib/utils"
import { searchCountries } from "@/lib/country-search"
import { AutoSuggestInput } from "@/components/ui/auto-suggest-input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { findCities, findStates } from "@/app/actions/geo"

/** Add or edit a warehouse (full page; warehouses are listed on /inventory?tab=warehouses). */
export function WarehouseForm({ warehouses, warehouse }: { warehouses: WarehouseItem[]; warehouse?: WarehouseItem }) {
    const router = useRouter()
    const editing = !!warehouse
    const [saving, setSaving] = useState(false)
    // A free code for a new warehouse (WH-1, WH-2 … the first one not taken)
    const suggestedCode = () => {
        const taken = new Set(warehouses.map((w) => w.code.toUpperCase()))
        for (let n = warehouses.length + 1; ; n++) if (!taken.has(`WH-${n}`)) return `WH-${n}`
    }
    const [f, setF] = useState(() => ({
        name: warehouse?.name ?? "",
        code: warehouse?.code ?? suggestedCode(),
        address: warehouse?.address ?? "",
        country: warehouse?.country ?? "",
        state: warehouse?.state ?? "",
        city: warehouse?.city ?? "",
        contactName: warehouse?.contactName ?? "",
        contactPhone: warehouse?.contactPhone ?? "",
        isDefault: warehouse?.isDefault ?? warehouses.length === 0,
    }))
    const set = (change: Partial<typeof f>) => setF((prev) => ({ ...prev, ...change }))

    const submit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!f.name.trim() || !f.code.trim()) return toast.error("Enter the warehouse name and code")
        const clash = warehouses.find((w) => w.code.toUpperCase() === f.code.trim().toUpperCase() && w.id !== warehouse?.id)
        if (clash) return toast.error(`Code ${f.code.trim()} is already used by ${clash.name}`)
        setSaving(true)
        try {
            const data = { ...f, name: f.name.trim(), code: f.code.trim() }
            if (editing) unwrap(await updateWarehouse(warehouse.id, data))
            else unwrap(await createWarehouse(data))
            toast.success(editing ? "Warehouse saved" : "Warehouse added")
            router.push("/inventory?tab=warehouses")
            router.refresh()
        } catch (err) {
            toast.error(errorMessage(err) || "The warehouse couldn't be saved")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mx-auto max-w-3xl space-y-6">
            <div className="flex items-center gap-3">
                <Button variant="ghost" size="icon" asChild aria-label="Back to inventory">
                    <Link href="/inventory?tab=warehouses"><ArrowLeft className="h-4 w-4" /></Link>
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">{editing ? `Edit ${warehouse.name}` : "New warehouse"}</h1>
                    <p className="text-sm text-muted-foreground">A place where you keep stock.</p>
                </div>
            </div>

            <form onSubmit={submit} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Warehouse</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-1.5">
                            <Label htmlFor="wh-name">Name *</Label>
                            <Input id="wh-name" required placeholder="Enter warehouse name" value={f.name} onChange={(e) => set({ name: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="wh-code">Code *</Label>
                            <Input id="wh-code" required placeholder="Enter a short code" value={f.code} onChange={(e) => set({ code: e.target.value.toUpperCase() })} />
                        </div>
                        <label className="flex items-center gap-2 text-sm sm:col-span-2">
                            <input type="checkbox" className="h-4 w-4" checked={f.isDefault} onChange={(e) => set({ isDefault: e.target.checked })} />
                            Default warehouse (sales take stock from here)
                        </label>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Address and contact</CardTitle>
                        <CardDescription>Optional; shown on transfers and purchase orders.</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 sm:grid-cols-3">
                        <div className="space-y-1.5 sm:col-span-3">
                            <Label htmlFor="wh-address">Street address</Label>
                            <Input id="wh-address" placeholder="Enter the street address" value={f.address} onChange={(e) => set({ address: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="wh-country">Country</Label>
                            <AutoSuggestInput
                                id="wh-country"
                                placeholder="Start typing a country"
                                value={f.country}
                                onChange={(e) => set({ country: e.target.value })}
                                options={searchCountries(f.country).map((c) => ({ label: c.name, value: c.name, subLabel: c.code, icon: c.flag }))}
                                onSelectOption={(opt) => set({ country: opt.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="wh-state">State / region</Label>
                            <AutoSuggestInput
                                id="wh-state"
                                placeholder="Start typing a state"
                                value={f.state}
                                onChange={(e) => set({ state: e.target.value })}
                                loadOptions={(q) => findStates(q, f.country || "")}
                                options={[]}
                                onSelectOption={(opt) => set({ state: opt.value })}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="wh-city">City</Label>
                            <AutoSuggestInput
                                id="wh-city"
                                placeholder="Start typing a city"
                                value={f.city}
                                onChange={(e) => set({ city: e.target.value })}
                                loadOptions={(q) => findCities(q, f.state || "", f.country || "")}
                                options={[]}
                                onSelectOption={(opt) => {
                                    const stateName = opt.subLabel?.split(" • ")[0]?.trim()
                                    set({ city: opt.value, ...(stateName && !f.state ? { state: stateName } : {}) })
                                }}
                            />
                        </div>
                        <div className="space-y-1.5 sm:col-span-2">
                            <Label htmlFor="wh-contact">Person in charge</Label>
                            <Input id="wh-contact" placeholder="Enter contact person's name" value={f.contactName} onChange={(e) => set({ contactName: e.target.value })} />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="wh-phone">Phone</Label>
                            <Input id="wh-phone" type="tel" placeholder="Enter phone with country code" value={f.contactPhone} onChange={(e) => set({ contactPhone: e.target.value })} />
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" asChild><Link href="/inventory?tab=warehouses">Cancel</Link></Button>
                    <Button type="submit" disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editing ? "Save changes" : "Add warehouse"}
                    </Button>
                </div>
            </form>
        </div>
    )
}
