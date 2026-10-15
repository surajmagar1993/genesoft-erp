"use client"

import Link from "next/link"
import { useState, useTransition } from "react"
import { AlertCircle, CheckCircle2 } from "lucide-react"
import { sendJobApplication } from "@/app/actions/public/contact"
import { fieldClass, labelClass, textareaClass } from "@/components/marketing/ui"

export function ApplyForm({ job, title }: { job: string; title: string }) {
    const [isPending, startTransition] = useTransition()
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        form.set("job", job)
        setError(null)
        startTransition(async () => {
            const res = await sendJobApplication(form)
            if (res.success) setSent(true)
            else setError(res.error)
        })
    }

    if (sent) {
        return (
            <div className="flex flex-col items-center gap-3 rounded-[20px] border border-s-border bg-s-card p-8 text-center" role="status">
                <CheckCircle2 className="h-10 w-10 text-s-whatsapp" aria-hidden="true" />
                <h2 className="font-display text-2xl font-bold text-s-ink">Application sent</h2>
                <p className="text-s-text">Thanks for applying for {title}. We&apos;ll be in touch if your profile is a match.</p>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmit} className="flex flex-col gap-4 rounded-[20px] border border-s-border bg-s-card p-6 md:p-8">
            <h2 className="font-display text-2xl font-bold text-s-ink">Apply</h2>
            {error && (
                <div role="alert" className="flex items-start gap-2 rounded-[10px] border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-200">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" /> {error}
                </div>
            )}
            <label className={labelClass}>Name<input name="name" required autoComplete="name" placeholder="Full name" className={fieldClass} /></label>
            <label className={labelClass}>Email<input name="email" type="email" required autoComplete="email" placeholder="Email address" className={fieldClass} /></label>
            <label className={labelClass}>Phone<input name="phone" type="tel" autoComplete="tel" placeholder="Mobile number" className={fieldClass} /></label>
            <label className={labelClass}>
                CV (PDF or Word, up to 5 MB)
                <input name="cv" type="file" required accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="rounded-[10px] border border-dashed border-s-border-strong bg-s-card p-3 text-sm text-s-text file:mr-3 file:rounded-md file:border-0 file:bg-s-band file:px-3 file:py-1.5 file:font-semibold file:text-s-ink" />
            </label>
            <label className={labelClass}>LinkedIn or portfolio (optional)<input name="link" type="url" placeholder="https://" className={fieldClass} /></label>
            <label className={labelClass}>A few lines about you (optional)<textarea name="message" rows={4} maxLength={3000} className={textareaClass} /></label>
            <div className="hidden" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
            <label className="flex items-start gap-2.5 text-sm leading-relaxed text-s-text">
                <input type="checkbox" required className="mt-0.5 h-5 w-5 shrink-0 accent-[#EF7F1A]" />
                <span>I agree to the <Link href="/privacy" className="font-semibold text-s-orange-text hover:underline">Privacy Policy</Link>. My CV is kept only as long as needed to consider me.</span>
            </label>
            <button type="submit" disabled={isPending} className="h-[52px] rounded-[10px] bg-s-orange font-bold text-s-on-orange transition hover:brightness-95 disabled:opacity-60">
                {isPending ? "Sending…" : "Send application"}
            </button>
        </form>
    )
}
