import { prisma } from "@/lib/prisma"
import { getTenantId } from "@/lib/get-tenant-id"
import { toRow, type PgRow } from "@/lib/pg-row"
import { isUuid } from "@/lib/utils"
import { ContactForm, emptyContactForm } from "@/components/crm/contact-form"
import { notFound } from "next/navigation"

export default async function EditContactPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    const tenantId = await getTenantId()
    const record = await prisma.contact.findFirst({ where: { id, tenantId } })
    if (!record) notFound()
    const data = toRow<PgRow>("Contact", record)

    // Split phone into dial code and raw number
    const parsePhone = (phoneStr: string | null) => {
        if (!phoneStr) return { dialCode: "", number: "" }
        const parts = phoneStr.split(" ")
        // Only a real country code ("+971") is split off; "98765 43210" stays whole
        if (parts.length > 1 && /^\+\d{1,4}$/.test(parts[0])) {
            return { dialCode: parts[0], number: parts.slice(1).join(" ") }
        }
        // Saved without a country code: show the number as it is
        return { dialCode: "", number: phoneStr }
    }

    const phoneData = parsePhone(data.phone)
    const mobileData = parsePhone(data.mobile)

    const billingAdd = (data.billing_address || {}) as Record<string, string | undefined>

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
        countryCode: data.country_code ?? "",
        currencyCode: data.currency_code ?? "",
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
        billingCountry: billingAdd.country ?? "",
        isTaxExempt: Boolean(data.is_tax_exempt),
        taxExemptionReason: data.tax_exemption_reason ?? "SEZ_DEVELOPER",
        taxExemptionCertificate: data.tax_exemption_certificate ?? "",
        notes: data.notes ?? "",
    }

    return <ContactForm mode="edit" initialData={initialData} />
}
