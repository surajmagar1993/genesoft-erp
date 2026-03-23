import { createClient } from "@/lib/supabase/server"
import { LeadForm, defaultLeadForm, type LeadFormData } from "@/components/crm/lead-form"
import { notFound } from "next/navigation"

export default async function EditLeadPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("leads")
        .select("*")
        .eq("id", id)
        .single()

    if (error || !data) notFound()

    const initialData: LeadFormData = {
        ...defaultLeadForm,
        id: data.id,
        title: data.title ?? "",
        contactName: data.contact_name ?? "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        source: data.source ?? "",
        status: data.status ?? "NEW",
        score: data.score ?? 50,
        assignedTo: data.assigned_to ?? "",
        notes: data.notes ?? "",
    }

    return <LeadForm mode="edit" initialData={initialData} />
}
