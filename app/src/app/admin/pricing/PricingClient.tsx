"use client"
import { unwrap } from "@/lib/action-result"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Globe } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { savePricingRegion, type PricingPlanCell, type PricingRegionRow } from "@/app/actions/saas/admin"
import { REGIONAL_PRICING_CATALOG, PLAN_TIERS } from "@/lib/saas-subscription-engine"
import { annualFromMonthly } from "@/lib/plan-pricing-math"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const TIERS = ["BASIC", "PRO", "ENTERPRISE"] as const

function symbolFor(currency: string): string {
    return (REGIONAL_PRICING_CATALOG[currency]?.symbol ?? currency).trim()
}

type Draft = { amount: string; isActive: boolean }

function RegionRow({ region }: { region: PricingRegionRow }) {
    const router = useRouter()
    const initial = (p: PricingPlanCell): Draft => ({ amount: String(p.amount), isActive: p.isActive })
    const [draft, setDraft] = useState<Record<string, Draft>>(() => Object.fromEntries(region.plans.map((p) => [p.tier, initial(p)])))
    const [saving, setSaving] = useState(false)

    const unsaved = region.plans.some((p) => !p.saved)
    const dirty = region.plans.some((p) => {
        const d = draft[p.tier]
        return d.amount !== String(p.amount) || d.isActive !== p.isActive
    })
    const symbol = symbolFor(region.currency)

    const set = (tier: string, patch: Partial<Draft>) => setDraft((d) => ({ ...d, [tier]: { ...d[tier], ...patch } }))

    const save = async () => {
        setSaving(true)
        try {
            const result = unwrap(
                await savePricingRegion(
                    region.code,
                    TIERS.map((tier) => ({ tier, amount: Number(draft[tier].amount), isActive: draft[tier].isActive }))
                )
            )
            if (result.stripeSync.error) toast.warning(`${region.label} prices saved, but Stripe wasn't updated: ${result.stripeSync.error}`)
            else toast.success(`${region.label} prices saved${result.stripeSync.synced ? " and updated in Stripe" : ""}`)
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't save the prices")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="grid gap-3 px-4 py-3 md:grid-cols-[170px_repeat(3,minmax(0,1fr))_80px] md:items-center md:gap-4">
            <div className="min-w-0">
                <div className="flex items-center gap-2 font-semibold">
                    <Globe className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="truncate">{region.label}</span>
                </div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                    {region.currency} · {region.gateway === "RAZORPAY" ? "Razorpay" : "Stripe"}
                </div>
                {unsaved && (
                    <Badge variant="outline" className="mt-1 h-5 border-amber-500/40 text-[10px] text-amber-600 dark:text-amber-400">
                        Default prices, not saved
                    </Badge>
                )}
            </div>

            {TIERS.map((tier) => {
                const d = draft[tier]
                const monthly = Number(d.amount)
                return (
                    <div key={tier} className="min-w-0">
                        <div className="mb-1 text-xs font-semibold md:hidden">{PLAN_TIERS[tier].name}</div>
                        <div className="flex items-center gap-2">
                            <div className={cn("relative min-w-0 flex-1 transition-opacity", !d.isActive && "opacity-50")}>
                                <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">{symbol}</span>
                                <Input
                                    type="number"
                                    inputMode="decimal"
                                    min={0}
                                    value={d.amount}
                                    onChange={(e) => set(tier, { amount: e.target.value })}
                                    aria-label={`${PLAN_TIERS[tier].name} monthly price in ${region.currency}`}
                                    className="h-8 font-semibold"
                                    style={{ paddingLeft: `${Math.max(1.75, symbol.length * 0.55 + 1)}rem` }}
                                />
                            </div>
                            <Switch
                                checked={d.isActive}
                                onCheckedChange={(v) => set(tier, { isActive: v })}
                                aria-label={`Show ${PLAN_TIERS[tier].name} in ${region.label}`}
                                title={d.isActive ? "Shown on the pricing page" : "Hidden from the pricing page"}
                            />
                        </div>
                        <div className="mt-1 text-[11px] text-muted-foreground">
                            {monthly > 0 ? `${symbol} ${annualFromMonthly(monthly).toLocaleString()} / year` : "Enter a price"}
                            {!d.isActive && <span className="font-medium text-amber-600 dark:text-amber-400"> · Hidden</span>}
                        </div>
                    </div>
                )
            })}

            <div className="flex md:justify-end">
                <Button size="sm" onClick={save} disabled={saving || (!dirty && !unsaved)} className="w-full md:w-auto">
                    {saving ? "Saving…" : "Save"}
                </Button>
            </div>
        </div>
    )
}

export function PricingClient({ regions }: { regions: PricingRegionRow[] }) {
    return (
        <div className="mx-auto max-w-7xl space-y-6 px-4 pb-12">
            <div className="border-b pb-5">
                <h1 className="text-2xl font-bold tracking-tight">Pricing &amp; Plans</h1>
                <p className="mt-0.5 text-sm text-muted-foreground">
                    Monthly price per region (yearly is 12 months less 20%). The switch shows or hides a plan: a hidden plan isn&apos;t offered on the pricing page or at checkout, but businesses already on it keep it. The Free plan is always offered.
                </p>
            </div>

            <Card className="gap-0 divide-y overflow-hidden py-0">
                <div className="hidden bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground md:grid md:grid-cols-[170px_repeat(3,minmax(0,1fr))_80px] md:gap-4">
                    <div>Region</div>
                    {TIERS.map((t) => (
                        <div key={t}>{PLAN_TIERS[t].name}</div>
                    ))}
                    <div />
                </div>
                {regions.map((region) => (
                    <RegionRow key={region.code} region={region} />
                ))}
            </Card>
        </div>
    )
}
