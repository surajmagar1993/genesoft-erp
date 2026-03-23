import { createClient } from "@/lib/supabase/server"
import { ContactForm, emptyContactForm } from "@/components/crm/contact-form"
import { notFound } from "next/navigation"

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    const supabase = await createClient()
    const { data, error } = await supabase
        .from("contacts")
        .select("*")
        .eq("id", id)
        .single()

    if (error || !data) notFound()

    const initialData = {
        ...emptyContactForm,
        id: data.id,
        type: (data.type ?? "COMPANY") as "INDIVIDUAL" | "COMPANY",
        displayName: data.display_name ?? "",
        companyName: data.type === "COMPANY" ? (data.display_name ?? "") : "",
        firstName: data.type === "INDIVIDUAL" ? (data.display_name?.split(" ")[0] ?? "") : "",
        lastName: data.type === "INDIVIDUAL" ? (data.display_name?.split(" ").slice(1).join(" ") ?? "") : "",
        email: data.email ?? "",
        phone: data.phone ?? "",
        gstin: data.gstin ?? "",
        pan: data.pan ?? "",
        customerGroup: data.customer_group ?? "general",
        countryCode: data.country_code ?? "IN",
        currencyCode: data.currency_code ?? "INR",
        creditLimit: String(data.credit_limit ?? ""),
    }

    return <ContactForm mode="edit" initialData={initialData} />
}
