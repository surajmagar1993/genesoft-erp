"use client"

import { useState, useTransition } from "react"
import { submitPublicForm } from "@/app/actions/crm/forms"
import { FormFieldConfig, WebFormType, WebFormStatus } from "@/app/actions/crm/form-types"
import { Check, Send, AlertCircle, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

interface PublicFormClientProps {
    form: {
        id: string
        code: string
        title: string
        description?: string | null
        type: WebFormType
        status: WebFormStatus
        fields: FormFieldConfig[]
        submitButtonText: string
        successMessage: string
        redirectUrl?: string | null
        primaryColor: string
    }
}

export function PublicFormClient({ form }: PublicFormClientProps) {
    const [isPending, startTransition] = useTransition()
    const [formData, setFormData] = useState<Record<string, any>>({})
    const [honeypot, setHoneypot] = useState("")
    const [isSubmitted, setIsSubmitted] = useState(false)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const isFormActive = form.status === "ACTIVE"

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        setErrorMessage(null)

        if (!isFormActive) {
            setErrorMessage("This form is currently closed to new responses.")
            return
        }

        // Validate required fields
        for (const field of form.fields) {
            const key = field.name || field.id
            if (field.required && (!formData[key] || !formData[key].toString().trim())) {
                const msg = `Please enter a value for ${field.label}`
                setErrorMessage(msg)
                toast.error(msg)
                return
            }
        }

        startTransition(async () => {
            try {
                const res = await submitPublicForm({
                    formIdOrCode: form.id,
                    data: formData,
                    honeypot: honeypot || undefined,
                })

                if (res.success) {
                    setIsSubmitted(true)
                    if (res.redirectUrl) {
                        setTimeout(() => {
                            window.location.href = res.redirectUrl!
                        }, 1800)
                    }
                } else {
                    setErrorMessage(res.error || res.message || "Failed to submit form")
                    toast.error(res.error || res.message || "Failed to submit form")
                }
            } catch (err: any) {
                setErrorMessage(err.message || "An unexpected network error occurred.")
                toast.error("Submission failed")
            }
        })
    }

    if (isSubmitted) {
        return (
            <div className="bg-white dark:bg-slate-900 rounded-2xl p-8 sm:p-10 border border-slate-200 dark:border-slate-800 shadow-xl text-center space-y-4 animate-in fade-in zoom-in-95 duration-200">
                <div
                    className="w-16 h-16 rounded-full flex items-center justify-center mx-auto text-white shadow-lg"
                    style={{ backgroundColor: form.primaryColor }}
                >
                    <Check className="h-8 w-8 stroke-[3]" />
                </div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-slate-50">
                    Submission Received!
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                    {form.successMessage || "Thank you! Your information has been successfully received."}
                </p>
                {form.redirectUrl && (
                    <p className="text-xs text-slate-400 animate-pulse pt-2">
                        Redirecting you shortly...
                    </p>
                )}
            </div>
        )
    }

    return (
        <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl space-y-6">
            {/* Header branding */}
            <div className="border-b pb-5 dark:border-slate-800 space-y-1">
                <div className="flex items-center gap-2 mb-1">
                    <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: form.primaryColor }}
                    />
                    <span className="text-xs font-mono uppercase tracking-wider text-slate-400">
                        {form.code}
                    </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                    {form.title}
                </h1>
                {form.description && (
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                        {form.description}
                    </p>
                )}
            </div>

            {!isFormActive && (
                <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>This form is currently paused and not accepting new responses.</span>
                </div>
            )}

            {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2.5">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <span>{errorMessage}</span>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                {/* Honeypot anti-spam hidden field */}
                <div style={{ display: "none", position: "absolute", left: "-9999px" }} aria-hidden="true">
                    <input
                        type="text"
                        name="_hp_company"
                        tabIndex={-1}
                        value={honeypot}
                        onChange={(e) => setHoneypot(e.target.value)}
                        autoComplete="off"
                    />
                </div>

                {form.fields.map((field) => {
                    const fieldKey = field.name || field.id
                    return (
                        <div key={field.id} className="space-y-1.5 text-left">
                            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                {field.label}
                                {field.required && (
                                    <span className="text-rose-500 font-bold">*</span>
                                )}
                            </label>

                            {field.type === "textarea" ? (
                                <Textarea
                                    rows={4}
                                    placeholder={field.placeholder}
                                    value={formData[fieldKey] || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            [fieldKey]: e.target.value,
                                        })
                                    }
                                    className="text-xs resize-y"
                                    disabled={!isFormActive || isPending}
                                />
                            ) : field.type === "select" ? (
                                <select
                                    value={formData[fieldKey] || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            [fieldKey]: e.target.value,
                                        })
                                    }
                                    disabled={!isFormActive || isPending}
                                    className="w-full h-10 px-3 text-xs border rounded-md bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                >
                                    <option value="">Select an option...</option>
                                    {(field.options || []).map((opt, oIdx) => (
                                        <option key={oIdx} value={opt}>
                                            {opt}
                                        </option>
                                    ))}
                                </select>
                            ) : (
                                <Input
                                    type={field.type === "tel" ? "tel" : field.type}
                                    placeholder={field.placeholder}
                                    value={formData[fieldKey] || ""}
                                    onChange={(e) =>
                                        setFormData({
                                            ...formData,
                                            [fieldKey]: e.target.value,
                                        })
                                    }
                                    disabled={!isFormActive || isPending}
                                    className="h-10 text-xs"
                                />
                            )}
                        </div>
                    )
                })}

                <div className="pt-2">
                    <Button
                        type="submit"
                        disabled={!isFormActive || isPending}
                        className="w-full h-11 text-white font-semibold text-xs shadow-md transition-opacity hover:opacity-90"
                        style={{ backgroundColor: form.primaryColor }}
                    >
                        {isPending ? (
                            <span className="flex items-center gap-2">
                                <span className="h-3.5 w-3.5 rounded-full border-2 border-white border-t-transparent animate-spin" />
                                Submitting...
                            </span>
                        ) : (
                            <span className="flex items-center justify-center gap-2">
                                <Send className="h-3.5 w-3.5" />
                                {form.submitButtonText || "Submit"}
                            </span>
                        )}
                    </Button>
                </div>

                <div className="pt-2 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Secure end-to-end CRM verification</span>
                </div>
            </form>
        </div>
    )
}
