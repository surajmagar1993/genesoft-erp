import { createClient } from "@/lib/supabase/server"
import { CompanyForm, defaultCompanyForm } from "@/components/crm/company-form"
import { notFound } from "next/navigation"

export default async function EditCompanyPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("id", id)
        .single()

    if (error || !data) notFound()

    const initialData = {
        ...defaultCompanyForm,
        id: data.id,
        name: data.name ?? "",
        industry: data.industry ?? "",
        website: data.website ?? "",
        phone: data.phone ?? "",
        city: data.city ?? "",
        gstin: data.gstin ?? "",
        countryCode: data.country_code ?? "IN",
    }

    return <CompanyForm mode="edit" initialData={initialData} />
}
