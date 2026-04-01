"use client"

import { useState, useEffect } from "react"
import { Plus, Trash2, CheckCircle2, ShieldCheck } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { getTaxGroups, createTaxGroup, deleteTaxGroup, TaxGroup } from "@/app/actions/sales/tax"
import { toast } from "sonner"

export default function TaxConfigClient() {
    const [taxGroups, setTaxGroups] = useState<TaxGroup[]>([])
    const [loading, setLoading] = useState(true)
    const [isAdding, setIsAdding] = useState(false)
    const [newGroup, setNewGroup] = useState({
        name: "",
        country_code: "IN",
        is_default: false,
        rates: [{ name: "GST", rate: 18 }]
    })

    useEffect(() => {
        loadTaxGroups()
    }, [])

    async function loadTaxGroups() {
        try {
            const data = await getTaxGroups()
            setTaxGroups(data)
        } catch (error) {
            toast.error("Failed to load tax groups")
        } finally {
            setLoading(false)
        }
    }

    async function handleCreate() {
        if (!newGroup.name) return toast.error("Name is required")
        try {
            await createTaxGroup(newGroup)
            toast.success("Tax group created")
            setIsAdding(false)
            setNewGroup({ name: "", country_code: "IN", is_default: false, rates: [{ name: "GST", rate: 18 }] })
            loadTaxGroups()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    async function handleDelete(id: string) {
        if (!confirm("Are you sure? This cannot be undone.")) return
        try {
            await deleteTaxGroup(id)
            toast.success("Tax group deleted")
            loadTaxGroups()
        } catch (error: any) {
            toast.error(error.message)
        }
    }

    const addRate = () => {
        setNewGroup({
            ...newGroup,
            rates: [...newGroup.rates, { name: "", rate: 0 }]
        })
    }

    const updateRate = (index: number, field: string, value: any) => {
        const updatedRates = [...newGroup.rates]
        updatedRates[index] = { ...updatedRates[index], [field]: value }
        setNewGroup({ ...newGroup, rates: updatedRates })
    }

    const removeRate = (index: number) => {
        setNewGroup({
            ...newGroup,
            rates: newGroup.rates.filter((_, i) => i !== index)
        })
    }

    if (loading) return <div className="p-8 text-center animate-pulse">Loading Tax Configuration...</div>

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold">Tax Groups</h2>
                    <p className="text-sm text-muted-foreground">Manage GST/VAT rates for your products and quotes.</p>
                </div>
                <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "outline" : "default"}>
                    {isAdding ? "Cancel" : <><Plus className="h-4 w-4 mr-2" /> Add Tax Group</>}
                </Button>
            </div>

            {isAdding && (
                <Card className="border-primary/20 bg-primary/5 shadow-md animate-in fade-in slide-in-from-top-4 duration-300">
                    <CardHeader>
                        <CardTitle className="text-md">New Tax Group</CardTitle>
                        <CardDescription>Define composite taxes (e.g., GST = CGST + SGST)</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Group Name</label>
                                <Input 
                                    placeholder="e.g., GST 18%" 
                                    value={newGroup.name} 
                                    onChange={e => setNewGroup({ ...newGroup, name: e.target.value })} 
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Country Code</label>
                                <Input 
                                    placeholder="IN" 
                                    value={newGroup.country_code} 
                                    onChange={e => setNewGroup({ ...newGroup, country_code: e.target.value })} 
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground block">Components</label>
                            {newGroup.rates.map((rate, idx) => (
                                <div key={idx} className="flex gap-2 items-center animate-in slide-in-from-left-2 duration-200">
                                    <Input 
                                        placeholder="Rate Name (e.g. CGST)" 
                                        value={rate.name} 
                                        onChange={e => updateRate(idx, "name", e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input 
                                        type="number" 
                                        placeholder="%" 
                                        value={rate.rate} 
                                        onChange={e => updateRate(idx, "rate", Number(e.target.value))}
                                        className="w-24"
                                    />
                                    <Button size="icon" variant="ghost" onClick={() => removeRate(idx)} disabled={newGroup.rates.length === 1}>
                                        <Trash2 className="h-4 w-4 text-destructive" />
                                    </Button>
                                </div>
                            ))}
                            <Button variant="outline" size="sm" onClick={addRate} className="w-full border-dashed">
                                <Plus className="h-3 w-3 mr-2" /> Add Component
                            </Button>
                        </div>

                        <div className="flex items-center gap-2 pt-2">
                            <input 
                                type="checkbox" 
                                checked={newGroup.is_default} 
                                onChange={e => setNewGroup({...newGroup, is_default: e.target.checked})}
                                id="is_default"
                                className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                            />
                            <label htmlFor="is_default" className="text-sm font-medium leading-none cursor-pointer">
                                Set as default for new products
                            </label>
                        </div>

                        <Button onClick={handleCreate} className="w-full mt-4">Save Tax Group</Button>
                    </CardContent>
                </Card>
            )}

            <div className="grid gap-4 md:grid-cols-2">
                {taxGroups.map((group) => (
                    <Card key={group.id} className="relative group hover:shadow-lg transition-all border-border/60">
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div className="space-y-1">
                                    <CardTitle className="text-base flex items-center gap-2">
                                        {group.name}
                                        {group.is_default && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] h-5">Default</Badge>}
                                    </CardTitle>
                                    <CardDescription className="text-xs">{group.country_code} • {group.is_active ? "Active" : "Inactive"}</CardDescription>
                                </div>
                                <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => handleDelete(group.id)}>
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2">
                                {group.tax_rates?.map((rate) => (
                                    <div key={rate.id} className="flex justify-between text-sm py-1.5 border-b border-border/30 last:border-0 items-center">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <ShieldCheck className="h-3.5 w-3.5 text-primary opacity-60" />
                                            {rate.name}
                                        </span>
                                        <span className="font-mono font-bold bg-accent/50 px-1.5 py-0.5 rounded text-xs">{rate.rate}%</span>
                                    </div>
                                ))}
                                <div className="pt-2 flex justify-between items-center text-sm font-bold border-t border-dashed mt-2">
                                    <span>Total Tax</span>
                                    <span className="text-primary">{group.tax_rates?.reduce((sum, r) => sum + Number(r.rate), 0)}%</span>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {taxGroups.length === 0 && !isAdding && (
                <div className="py-20 text-center border-2 border-dashed rounded-xl bg-accent/5 space-y-4">
                    <div className="h-16 w-16 bg-accent rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="h-8 w-8 opacity-20" />
                    </div>
                    <div className="max-w-xs mx-auto">
                        <p className="font-semibold text-muted-foreground">No tax groups configured.</p>
                        <p className="text-xs text-muted-foreground mt-1">Add your country's GST/VAT rates to start generating quotes with accurate totals.</p>
                    </div>
                    <Button onClick={() => setIsAdding(true)} variant="outline">Setup Your First Tax Group</Button>
                </div>
            )}
        </div>
    )
}
