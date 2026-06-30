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

    // Split phone into dial code and raw number
    const parsePhone = (phoneStr: string | null) => {
        if (!phoneStr) return { dialCode: "+91", number: "" }
        const parts = phoneStr.split(" ")
        if (parts.length > 1) {
            return { dialCode: parts[0], number: parts.slice(1).join(" ") }
        }
        return { dialCode: "+91", number: phoneStr }
    }

    const phoneData = parsePhone(data.phone)
    const mobileData = parsePhone(data.mobile)

    const billingAdd = (data.billing_address as any) || {}

    const initialData = {
        ...emptyContactForm,
        id: data.id,
        type: (data.type ?? "COMPANY") as "INDIVIDUAL" | "COMPANY",
        displayName: data.display_name ?? "",
        companyName: data.company_name ?? "",
        firstName: data.first_name ?? "",
        lastName: data.last_name ?? "",
        email: data.email ?? "",
        phoneDialCode: phoneData.dialCode,
        phone: phoneData.number,
        mobileDialCode: mobileData.dialCode,
        mobile: mobileData.number,
        website: data.website ?? "",
        customerGroup: data.customer_group ?? "retail",
        countryCode: data.country_code ?? "IN",
        currencyCode: data.currency_code ?? "INR",
        gstin: data.gstin ?? "",
        pan: data.pan ?? "",
        cin: data.cin ?? "",
        tan: data.tan ?? "",
        msmeUdyam: data.msme_udyam ?? "",
        trn: data.trn ?? "",
        tradeLicense: data.trade_license ?? "",
        vatNumberKsa: data.vat_number_ksa ?? "",
        crNumber: data.cr_number ?? "",
        ein: data.ein ?? "",
        creditLimit: String(data.credit_limit ?? ""),
        billingStreet: billingAdd.street ?? "",
        billingCity: billingAdd.city ?? "",
        billingState: billingAdd.state ?? "",
        billingZip: billingAdd.zip ?? "",
        billingCountry: billingAdd.country ?? "India",
        notes: data.notes ?? "",
    }

    return <ContactForm mode="edit" initialData={initialData} />
}
