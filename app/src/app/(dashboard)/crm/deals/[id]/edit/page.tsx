import { createClient } from "@/lib/supabase/server"
import { DealForm, defaultDealForm } from "@/components/crm/deal-form"
import { notFound } from "next/navigation"

export default async function EditDealPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("deals")
        .select("*")
        .eq("id", id)
        .single()

    if (error || !data) notFound()

    const initialData = {
        ...defaultDealForm,
        id: data.id,
        title: data.title ?? "",
        contactName: data.contact_name ?? "",
        company: data.company ?? "",
        value: data.value ?? 0,
        stage: data.stage ?? "PROSPECTING",
        probability: data.probability ?? 20,
        expectedClose: data.expected_close ?? "",
        assignedTo: data.assigned_to ?? "",
        notes: data.notes ?? "",
    }

    return <DealForm mode="edit" initialData={initialData} />
}
