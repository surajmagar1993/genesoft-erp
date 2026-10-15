"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { AlertCircle, CheckCircle2, MessageCircle, Plus, X } from "lucide-react"
import { sendRentalQuote } from "@/app/actions/public/contact"
import { RENTAL_PERIODS } from "@/lib/site-content"
import { PLATFORM, whatsappHref } from "@/lib/constants/platform"
import { fieldClass, labelClass, textareaClass } from "@/components/marketing/ui"
import { cn } from "@/lib/utils"
import { Turnstile, resetTurnstile } from "@/components/turnstile"

type Line = { id: number; category: string; quantity: string; specs: string }

const legendClass = "mb-3 font-display text-lg font-semibold text-s-ink"

export function RentalQuoteForm({ categories, whatsapp = PLATFORM.whatsapp }: { categories: string[]; whatsapp?: string }) {
    const options = [...categories, "Other"]
    const [isPending, startTransition] = useTransition()
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [lines, setLines] = useState<Line[]>([{ id: 1, category: options[0], quantity: "1", specs: "" }])

    const update = (id: number, patch: Partial<Line>) => setLines((ls) => ls.map((l) => (l.id === id ? { ...l, ...patch } : l)))

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        setError(null)
        startTransition(async () => {
            const res = await sendRentalQuote({
                name: String(form.get("name") || ""),
                email: String(form.get("email") || ""),
                company: String(form.get("company") || ""),
                phone: String(form.get("phone") || ""),
                items: lines.map((l) => ({ category: l.category, quantity: Number(l.quantity), specs: l.specs })),
                startDate: String(form.get("startDate") || ""),
                period: String(form.get("period") || ""),
                city: String(form.get("city") || ""),
                notes: String(form.get("notes") || ""),
                website: String(form.get("website") || ""),
                turnstileToken: String(form.get("cf-turnstile-response") || ""),
            })
            if (res.success) setSent(true)
            else {
                setError(res.error)
                resetTurnstile()
            }
        })
    }

    if (sent) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-[20px] border border-s-border bg-s-card p-8 text-center" role="status">
                <CheckCircle2 className="h-10 w-10 text-s-whatsapp" aria-hidden="true" />
                <h2 className="font-display text-2xl font-bold text-s-ink">Quote request sent</h2>
                <p className="max-w-md text-s-text">We&apos;ll check stock and email your quote within one working day. Want to talk it through now?</p>
                <a
                    href={whatsappHref(whatsapp, "Hello, I just requested an IT rental quote on your website.")}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex h-12 items-center gap-2 rounded-[10px] bg-s-whatsapp px-5 font-bold text-white"
                >
                    <MessageCircle className="h-5 w-5" aria-hidden="true" /> WhatsApp us
                </a>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-6 rounded-[20px] border border-s-border bg-s-card p-6 md:p-8">
            {error && (
                <div role="alert" className="flex items-start gap-2 rounded-[10px] border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
                </div>
            )}
            <fieldset className="flex flex-col gap-3">
                <legend className={legendClass}>1. What do you need?</legend>
                {lines.map((l, i) => (
                    <div key={l.id} className="grid grid-cols-[minmax(0,1fr)_88px] gap-2.5 sm:grid-cols-[minmax(0,2fr)_100px_minmax(0,3fr)_44px] sm:items-end">
                        <label className={labelClass}>
                            Equipment
                            <select value={l.category} onChange={(e) => update(l.id, { category: e.target.value })} className={fieldClass}>
                                {options.map((c) => <option key={c}>{c}</option>)}
                            </select>
                        </label>
                        <label className={labelClass}>
                            Quantity
                            <input type="number" min={1} max={10000} required value={l.quantity} onChange={(e) => update(l.id, { quantity: e.target.value })} className={fieldClass} />
                        </label>
                        <label className={cn(labelClass, "col-span-2 sm:col-span-1")}>
                            Specs (optional)
                            <input value={l.specs} maxLength={200} onChange={(e) => update(l.id, { specs: e.target.value })} placeholder="e.g. i5, 16 GB RAM, Windows 11" className={fieldClass} />
                        </label>
                        <button
                            type="button"
                            aria-label={`Remove item ${i + 1}`}
                            disabled={lines.length === 1}
                            onClick={() => setLines((ls) => ls.filter((x) => x.id !== l.id))}
                            className="hidden h-[46px] w-11 items-center justify-center rounded-[10px] border border-s-border-strong text-s-muted hover:text-s-ink disabled:opacity-40 sm:flex"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ))}
                {lines.length < 10 && (
                    <button
                        type="button"
                        onClick={() => setLines((ls) => [...ls, { id: Date.now(), category: options[0], quantity: "1", specs: "" }])}
                        className="inline-flex h-10 items-center gap-1.5 self-start rounded-[10px] border border-dashed border-s-border-strong px-3.5 text-sm font-bold text-s-orange-text hover:bg-s-band"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" /> Add another item
                    </button>
                )}
            </fieldset>

            <fieldset className="grid gap-3 sm:grid-cols-3">
                <legend className={legendClass}>2. When and where?</legend>
                <label className={labelClass}>Start date<input name="startDate" type="date" className={fieldClass} /></label>
                <label className={labelClass}>
                    Rental period
                    <select name="period" defaultValue="1 month" className={fieldClass}>
                        {RENTAL_PERIODS.map((p) => <option key={p}>{p}</option>)}
                    </select>
                </label>
                <label className={labelClass}>Delivery city<input name="city" required placeholder="City" className={fieldClass} /></label>
            </fieldset>

            <fieldset className="grid gap-3 sm:grid-cols-2">
                <legend className={legendClass}>3. Your details</legend>
                <label className={labelClass}>Name<input name="name" required autoComplete="name" placeholder="Full name" className={fieldClass} /></label>
                <label className={labelClass}>Company<input name="company" autoComplete="organization" placeholder="Company name" className={fieldClass} /></label>
                <label className={labelClass}>Email<input name="email" type="email" required autoComplete="email" placeholder="Work email" className={fieldClass} /></label>
                <label className={labelClass}>Phone / WhatsApp<input name="phone" type="tel" autoComplete="tel" placeholder="Mobile number" className={fieldClass} /></label>
                <label className={cn(labelClass, "sm:col-span-2")}>
                    Anything else?
                    <textarea name="notes" rows={3} maxLength={3000} placeholder="Software to install, setup help, GST invoice details…" className={textareaClass} />
                </label>
            </fieldset>

            <div className="hidden" aria-hidden="true">
                <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <Turnstile />
            <label className="flex items-start gap-2.5 text-sm leading-relaxed text-s-text">
                <input type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#EF7F1A]" />
                <span>I agree to the <Link href="/privacy" className="font-semibold text-s-orange-text hover:underline">Privacy Policy</Link> and to being contacted about this quote.</span>
            </label>
            <button type="submit" disabled={isPending} className="h-[52px] rounded-[10px] bg-s-orange font-bold text-s-on-orange transition hover:brightness-95 disabled:opacity-60">
                {isPending ? "Sending…" : "Send quote request"}
            </button>
        </form>
    )
}
