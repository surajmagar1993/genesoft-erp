"use client"
import { unwrap } from "@/lib/action-result"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { savePlanSettings } from "@/app/actions/saas/admin"
import {
    LIMIT_KINDS,
    PLAN_MODULES,
    PLAN_ORDER,
    defaultPlanConfig,
    planName,
    type LimitKind,
    type PlanConfig,
} from "@/lib/plan-config-shared"
import { toast } from "sonner"

/** Form state: limits as text ("" = unlimited), features as one line each. */
type Draft = Record<string, { limits: Record<LimitKind, string>; modules: Record<string, boolean>; features: string }>

function toDraft(config: PlanConfig): Draft {
    return Object.fromEntries(
        PLAN_ORDER.map((t) => [
            t,
            {
                limits: Object.fromEntries(LIMIT_KINDS.map((l) => [l.key, config[t].limits[l.key] === null ? "" : String(config[t].limits[l.key])])) as Record<LimitKind, string>,
                modules: { ...config[t].modules },
                features: config[t].features.join("\n"),
            },
        ])
    )
}

function fromDraft(draft: Draft): PlanConfig {
    return Object.fromEntries(
        PLAN_ORDER.map((t) => [
            t,
            {
                limits: Object.fromEntries(LIMIT_KINDS.map((l) => [l.key, draft[t].limits[l.key].trim() === "" ? null : Number(draft[t].limits[l.key])])),
                modules: draft[t].modules,
                features: draft[t].features.split("\n").map((f) => f.trim()).filter(Boolean),
            },
        ])
    ) as PlanConfig
}

const GRID = "grid grid-cols-[minmax(150px,1.2fr)_repeat(4,minmax(110px,1fr))] gap-3 items-center"

export function PlanSettingsEditor({ config }: { config: PlanConfig }) {
    const router = useRouter()
    const [draft, setDraft] = useState<Draft>(() => toDraft(config))
    const [saving, setSaving] = useState(false)
    const dirty = JSON.stringify(draft) !== JSON.stringify(toDraft(config))

    const patch = (tier: string, fn: (d: Draft[string]) => Draft[string]) => setDraft((d) => ({ ...d, [tier]: fn(d[tier]) }))

    const invalid = PLAN_ORDER.flatMap((t) =>
        LIMIT_KINDS.filter((l) => {
            const v = draft[t].limits[l.key].trim()
            return v !== "" && !(Number.isInteger(Number(v)) && Number(v) >= l.min)
        }).map((l) => `${planName(t)}: ${l.label}`)
    )

    const save = async () => {
        if (invalid.length) {
            toast.error(`Check these limits (whole numbers, empty for unlimited): ${invalid.join(", ")}`)
            return
        }
        setSaving(true)
        try {
            unwrap(await savePlanSettings(fromDraft(draft)))
            toast.success("Plan settings saved. They apply to every business from now on.")
            router.refresh()
        } catch (err) {
            toast.error(err instanceof Error ? err.message : "Couldn't save the plan settings")
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-3xl text-sm text-muted-foreground">
                    What each plan includes. An empty limit means unlimited. A module switched off is hidden for that plan&apos;s businesses (their data stays). Trials get the Pro column. Changes apply to every business straight away.
                </p>
                <div className="flex shrink-0 gap-2">
                    <Button variant="outline" size="sm" onClick={() => setDraft(toDraft(defaultPlanConfig()))} disabled={saving}>
                        <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Defaults
                    </Button>
                    <Button size="sm" onClick={save} disabled={saving || !dirty}>
                        {saving ? "Saving…" : "Save changes"}
                    </Button>
                </div>
            </div>

            <Card className="gap-0 overflow-hidden py-0">
                <div className="overflow-x-auto">
                    <div className="min-w-[640px] divide-y">
                        <div className={`${GRID} bg-muted/40 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground`}>
                            <div>Plan</div>
                            {PLAN_ORDER.map((t) => (
                                <div key={t}>{planName(t)}</div>
                            ))}
                        </div>

                        <div className="bg-muted/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Limits</div>
                        {LIMIT_KINDS.map((l) => (
                            <div key={l.key} className={`${GRID} px-4 py-2`}>
                                <div className="text-sm">{l.label}</div>
                                {PLAN_ORDER.map((t) => (
                                    <Input
                                        key={t}
                                        type="number"
                                        inputMode="numeric"
                                        min={l.min}
                                        step={1}
                                        placeholder="Unlimited"
                                        value={draft[t].limits[l.key]}
                                        onChange={(e) => patch(t, (d) => ({ ...d, limits: { ...d.limits, [l.key]: e.target.value } }))}
                                        aria-label={`${planName(t)} ${l.label}`}
                                        className="h-8"
                                    />
                                ))}
                            </div>
                        ))}

                        <div className="bg-muted/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Modules</div>
                        {PLAN_MODULES.map((m) => (
                            <div key={m.key} className={`${GRID} px-4 py-1.5`}>
                                <div className="text-sm">{m.label}</div>
                                {PLAN_ORDER.map((t) => (
                                    <div key={t}>
                                        <Switch
                                            checked={draft[t].modules[m.key] !== false}
                                            onCheckedChange={(v) => patch(t, (d) => ({ ...d, modules: { ...d.modules, [m.key]: v } }))}
                                            aria-label={`${m.label} on the ${planName(t)} plan`}
                                        />
                                    </div>
                                ))}
                            </div>
                        ))}

                        <div className="bg-muted/20 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                            Features on the pricing page <span className="font-normal normal-case">(one per line)</span>
                        </div>
                        <div className={`${GRID} items-start px-4 py-3`}>
                            <div className="text-xs text-muted-foreground">Shown on the public pricing page and in Billing. Keep them in line with the limits and modules above.</div>
                            {PLAN_ORDER.map((t) => (
                                <Textarea
                                    key={t}
                                    rows={8}
                                    value={draft[t].features}
                                    onChange={(e) => patch(t, (d) => ({ ...d, features: e.target.value }))}
                                    aria-label={`${planName(t)} features`}
                                    className="min-h-[160px] resize-y text-xs leading-relaxed"
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    )
}
