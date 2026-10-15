"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { AlertCircle, CheckCircle2, MessageCircle } from "lucide-react"
import { sendContactMessage } from "@/app/actions/public/contact"
import { CONTACT_TOPICS } from "@/lib/site-content"
import { PLATFORM, whatsappHref } from "@/lib/constants/platform"
import { fieldClass, labelClass, textareaClass } from "@/components/marketing/ui"
import { cn } from "@/lib/utils"

/**
 * Website enquiry form (Contact page and every service page). Goes to info@
 * via sendContactMessage. `topic` preselects the service.
 */
export function EnquiryForm({ topic = "General", title = "Send us a message", showTopics = true, whatsapp = PLATFORM.whatsapp }: { topic?: string; title?: string; showTopics?: boolean; whatsapp?: string }) {
    const [isPending, startTransition] = useTransition()
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [picked, setPicked] = useState(topic)

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        setError(null)
        startTransition(async () => {
            const res = await sendContactMessage({
                name: String(form.get("name") || ""),
                email: String(form.get("email") || ""),
                company: String(form.get("company") || ""),
                phone: String(form.get("phone") || ""),
                topic: picked,
                message: String(form.get("message") || ""),
                website: String(form.get("website") || ""),
            })
            if (res.success) setSent(true)
            else setError(res.error)
        })
    }

    if (sent) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-[20px] border border-s-border bg-s-card p-8 text-center" role="status">
                <CheckCircle2 className="h-10 w-10 text-s-whatsapp" aria-hidden="true" />
                <h2 className="font-display text-2xl font-bold text-s-ink">Thanks, we&apos;ve got it</h2>
                <p className="max-w-md text-s-text">We&apos;ll reply to the email address you gave us within one working day. Need us sooner?</p>
                <a
                    href={whatsappHref(whatsapp, "Hello, I just sent an enquiry on your website.")}
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
        <form onSubmit={onSubmit} className="grid gap-4 rounded-[20px] border border-s-border bg-s-card p-6 sm:grid-cols-2 md:p-8">
            <h2 className="font-display text-2xl font-bold text-s-ink sm:col-span-2">{title}</h2>
            {error && (
                <div role="alert" className="flex items-start gap-2 rounded-[10px] border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200 sm:col-span-2">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
                </div>
            )}
            <label className={labelClass}>Your name<input name="name" required autoComplete="name" placeholder="Full name" className={fieldClass} /></label>
            <label className={labelClass}>Company<input name="company" autoComplete="organization" placeholder="Company (optional)" className={fieldClass} /></label>
            <label className={labelClass}>Email<input name="email" type="email" required autoComplete="email" placeholder="Work email" className={fieldClass} /></label>
            <label className={labelClass}>Phone<input name="phone" type="tel" autoComplete="tel" placeholder="Mobile number (optional)" className={fieldClass} /></label>
            {showTopics && (
                <fieldset className="flex flex-col gap-2 sm:col-span-2">
                    <legend className="mb-2 text-sm font-semibold text-s-ink">What&apos;s it about?</legend>
                    <div className="flex flex-wrap gap-2">
                        {CONTACT_TOPICS.map((t) => (
                            <button
                                key={t}
                                type="button"
                                aria-pressed={picked === t}
                                onClick={() => setPicked(t)}
                                className={cn(
                                    "h-10 rounded-full px-4 text-sm font-semibold text-s-ink transition-colors",
                                    picked === t ? "border-2 border-s-orange bg-s-orange-tint" : "border border-s-border-strong bg-s-card hover:bg-s-band"
                                )}
                            >
                                {t}
                            </button>
                        ))}
                    </div>
                </fieldset>
            )}
            <label className={cn(labelClass, "sm:col-span-2")}>
                What do you need?
                <textarea name="message" required rows={5} minLength={10} placeholder="A few lines about what you need, and any deadline" className={textareaClass} />
            </label>
            {/* Hidden from people; bots fill it in */}
            <div className="hidden" aria-hidden="true">
                <label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label>
            </div>
            <label className="flex items-start gap-2.5 text-sm leading-relaxed text-s-text sm:col-span-2">
                <input type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#EF7F1A]" />
                <span>
                    I agree to the <Link href="/privacy" className="font-semibold text-s-orange-text hover:underline">Privacy Policy</Link> and to {PLATFORM.brandName} contacting me about this enquiry.
                </span>
            </label>
            <button
                type="submit"
                disabled={isPending}
                className="h-[52px] rounded-[10px] bg-s-orange font-bold text-s-on-orange transition hover:brightness-95 disabled:opacity-60 sm:col-span-2"
            >
                {isPending ? "Sending…" : "Send enquiry"}
            </button>
        </form>
    )
}
