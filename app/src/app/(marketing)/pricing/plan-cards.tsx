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
    const money = (n: number) => new Intl.NumberFormat(locale, { style: "currency", currency, maximumFractionDigits: 0 }).format(n)

    return (
        <div>
            <div className="mb-10 flex justify-center">
                <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1" role="group" aria-label="Billing period">
                    {(["MONTHLY", "ANNUAL"] as const).map((c) => (
                        <button
                            key={c}
                            type="button"
                            onClick={() => setCycle(c)}
                            aria-pressed={cycle === c}
                            className={cn(
                                "rounded-md px-4 py-1.5 text-sm font-medium transition-colors",
                                cycle === c ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                            )}
                        >
                            {c === "MONTHLY" ? "Monthly" : "Yearly (save 20%)"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                {plans.map((plan) => {
                    const featured = plan.tier === "PRO"
                    const price = cycle === "ANNUAL" ? plan.annual / 12 : plan.monthly
                    return (
                        <div
                            key={plan.tier}
                            className={cn(
                                "relative flex flex-col rounded-xl border bg-white p-6",
                                featured ? "border-blue-600 shadow-lg shadow-blue-100" : "border-slate-200"
                            )}
                        >
                            {featured && (
                                <span className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-0.5 text-xs font-medium text-white">Most popular</span>
                            )}
                            <h2 className="text-lg font-semibold text-slate-900">{plan.name}</h2>
                            <p className="mt-1 min-h-10 text-sm text-slate-600">{plan.tagline}</p>
                            <div className="mt-5">
                                <span className="text-3xl font-bold tracking-tight text-slate-900">{plan.monthly === 0 ? "Free" : money(price)}</span>
                                {plan.monthly > 0 && <span className="text-sm text-slate-500"> / month</span>}
                                {plan.monthly > 0 && cycle === "ANNUAL" && (
                                    <p className="mt-1 text-xs text-slate-500">{money(plan.annual)} billed yearly</p>
                                )}
                            </div>
                            <Button
                                asChild
                                className={cn("mt-6", featured ? "bg-blue-600 text-white hover:bg-blue-700" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50")}
                            >
                                <Link href={plan.tier === "FREE" ? "/register" : `/register?plan=${plan.tier}`}>
                                    {plan.tier === "FREE" ? "Start free" : "Start free trial"}
                                </Link>
                            </Button>
                            <ul className="mt-6 space-y-2.5 text-sm text-slate-700">
                                {plan.features.map((f) => (
                                    <li key={f} className="flex gap-2">
                                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
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
