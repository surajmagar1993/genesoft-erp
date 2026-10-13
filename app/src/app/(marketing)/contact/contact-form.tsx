"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { CheckCircle2, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { sendContactMessage } from "@/app/actions/public/contact"

const TOPICS = ["Sales", "Support", "Billing", "Partnership", "Other"]

export function ContactForm() {
    const [isPending, startTransition] = useTransition()
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        const form = new FormData(e.currentTarget)
        setError(null)
        startTransition(async () => {
            const res = await sendContactMessage({
                name: String(form.get("name") || ""),
                email: String(form.get("email") || ""),
                company: String(form.get("company") || ""),
                topic: String(form.get("topic") || "Other"),
                message: String(form.get("message") || ""),
                website: String(form.get("website") || ""),
            })
            if (res.success) setSent(true)
            else setError(res.error)
        })
    }

    if (sent) {
        return (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
                <h2 className="mt-4 text-xl font-semibold text-slate-900">Message sent</h2>
                <p className="mt-2 text-slate-600">Thanks for getting in touch. We&apos;ll reply to the email address you gave us.</p>
                <Button variant="outline" className="mt-6 border-slate-300 bg-white text-slate-800" onClick={() => setSent(false)}>
                    Send another message
                </Button>
            </div>
        )
    }

    return (
        <form onSubmit={onSubmit} className="space-y-5 rounded-xl border border-slate-200 bg-white p-6 shadow-sm md:p-8" noValidate={false}>
            <h2 className="text-xl font-semibold text-slate-900">Send us a message</h2>
            {error && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
                </div>
            )}
            <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                    <Label htmlFor="name" className="text-slate-700">Your name</Label>
                    <Input id="name" name="name" required minLength={2} maxLength={100} autoComplete="name" className="border-slate-300 bg-white text-slate-900" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="email" className="text-slate-700">Work email</Label>
                    <Input id="email" name="email" type="email" required autoComplete="email" className="border-slate-300 bg-white text-slate-900" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="company" className="text-slate-700">Company <span className="font-normal text-slate-400">(optional)</span></Label>
                    <Input id="company" name="company" maxLength={150} autoComplete="organization" className="border-slate-300 bg-white text-slate-900" />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="topic" className="text-slate-700">Topic</Label>
                    <select id="topic" name="topic" defaultValue="Sales" className="flex h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-900">
                        {TOPICS.map((t) => <option key={t}>{t}</option>)}
                    </select>
                </div>
            </div>
            <div className="space-y-2">
                <Label htmlFor="message" className="text-slate-700">How can we help?</Label>
                <Textarea id="message" name="message" required minLength={10} maxLength={5000} rows={6} className="border-slate-300 bg-white text-slate-900" />
            </div>
            {/* Bot trap: hidden from people, filled in by spam bots */}
            <div className="hidden" aria-hidden="true">
                <label htmlFor="website">Website</label>
                <input id="website" name="website" tabIndex={-1} autoComplete="off" />
            </div>
            <p className="text-xs text-slate-500">
                We use your details only to reply to this message. See our <Link href="/privacy" className="text-blue-700 hover:underline">Privacy Policy</Link>.
            </p>
            <Button type="submit" disabled={isPending} className="w-full bg-blue-600 text-white hover:bg-blue-700 sm:w-auto">
                {isPending ? "Sending…" : "Send message"}
            </Button>
        </form>
    )
}
