import { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { PublicFormClient } from "./public-form-client"
import { FormFieldConfig, WebFormType, WebFormStatus } from "@/app/actions/crm/form-types"

// Form links use the short code; the UUID id is also accepted, but only when the value is a valid UUID (Postgres rejects anything else)
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function formLookup(code: string) {
    return UUID_PATTERN.test(code) ? { OR: [{ code }, { id: code }] } : { code }
}

interface PublicFormPageProps {
    params: Promise<{ code: string }>
}

export async function generateMetadata({ params }: PublicFormPageProps): Promise<Metadata> {
    const { code } = await params
    const form = await prisma.webForm.findFirst({
        where: formLookup(code),
        select: { title: true, description: true },
    })

    if (!form) {
        return {
            title: "Form Not Found | CRM Studio",
        }
    }

    return {
        title: `${form.title} | Inbound Form`,
        description: form.description || "Submit your response.",
    }
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
    const { code } = await params

    const rawForm = await prisma.webForm.findFirst({
        where: formLookup(code),
    })

    if (!rawForm) {
        notFound()
    }

    const form = {
        id: rawForm.id,
        code: rawForm.code,
        title: rawForm.title,
        description: rawForm.description,
        type: rawForm.type as WebFormType,
        status: rawForm.status as WebFormStatus,
        fields: (rawForm.fields as FormFieldConfig[]) || [],
        submitButtonText: rawForm.submitButtonText,
        successMessage: rawForm.successMessage,
        redirectUrl: rawForm.redirectUrl,
        primaryColor: rawForm.primaryColor,
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans antialiased">
            <div className="w-full max-w-xl">
                <PublicFormClient form={form} />
            </div>
        </div>
    )
}
