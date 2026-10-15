"use client"

import { useState } from "react"
import Link from "next/link"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface PricedPlan {
    tier: "FREE" | "BASIC" | "PRO" | "ENTERPRISE"
    name: string
    tagline: string
    features: string[]
    monthly: number
    annual: number
}

export function PlanCards({ plans, currency, locale }: { plans: PricedPlan[]; currency: string; locale: string }) {
    const [cycle, setCycle] = useState<"MONTHLY" | "ANNUAL">("MONTHLY")
    const money = (n: number) =>
        // Australian prices say AUD$ (en-AU alone prints "$", easy to mistake for US dollars)
        currency === "AUD"
            ? `AUD$${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(n)}`
            : new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n)

    return (
        <div>
            <div className="mb-10 flex justify-center">
                <div className="inline-flex rounded-lg border border-s-border bg-s-band p-1" role="group" aria-label="Billing period">
                    {(["MONTHLY", "ANNUAL"] as const).map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCycle(c)}
                            aria-pressed={cycle === c}
                            className={cn(
                                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                                cycle === c ? "bg-s-card text-s-ink shadow-sm" : "text-s-text hover:text-s-ink"
                            )}
                        >
                            {c === "MONTHLY" ? "Monthly" : "Yearly (save 20%)"}
                        </button>
                    ))}
                </div>
            </div>

            <div className={cn("grid gap-6 md:grid-cols-2", plans.length >= 4 ? "lg:grid-cols-4" : plans.length === 3 ? "lg:grid-cols-3" : "")}>
                {plans.map((plan) => {
                    const featured = plan.tier === "PRO"
                    const price = cycle === "ANNUAL" ? plan.annual / 12 : plan.monthly
                    return (
                        <div
                            key={plan.tier}
                            className={cn(
                                "relative flex flex-col rounded-xl border bg-s-card p-6",
                                featured ? "border-s-orange shadow-lg shadow-black/5" : "border-s-border"
                            )}
                        >
                            {featured && (
                                <span className="absolute -top-3 left-6 rounded-full bg-s-orange px-3 py-0.5 text-xs font-medium text-s-on-orange">Most popular</span>
                            )}
                            <h2 className="text-lg font-semibold text-s-ink">{plan.name}</h2>
                            <p className="mt-1 min-h-10 text-sm text-s-text">{plan.tagline}</p>
                            <div className="mt-5">
                                <span className="text-3xl font-bold tracking-tight text-s-ink">{plan.monthly === 0 ? "Free" : money(price)}</span>
                                {plan.monthly > 0 && <span className="text-sm text-s-muted"> / month</span>}
                                {plan.monthly > 0 && cycle === "ANNUAL" && (
                                    <p className="mt-1 text-xs text-s-muted">{money(plan.annual)} billed yearly</p>
                                )}
                            </div>
                            <Button
                                asChild
                                className={cn("mt-6", featured ? "bg-s-orange text-s-on-orange hover:brightness-95" : "border border-s-border-strong bg-s-card text-s-ink hover:bg-s-band")}
                            >
                                <Link href={plan.tier === "FREE" ? "/register" : `/register?plan=${plan.tier}`}>
                                    {plan.tier === "FREE" ? "Start free" : "Start free trial"}
                                </Link>
                            </Button>
                            <ul className="mt-6 space-y-2.5 text-sm text-s-text">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex gap-2">
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-s-orange-text" />
                                        <span>{f}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
