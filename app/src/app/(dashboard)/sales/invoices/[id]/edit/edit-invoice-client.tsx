"use client"

import { useRouter } from "next/navigation"
import { InvoiceForm, InvoiceFormData } from "@/components/sales/invoice-form"
import { updateInvoice, InvoiceDB } from "@/app/actions/sales/invoices"

interface Props {
    invoice: InvoiceDB
}

export default function EditInvoiceClient({ invoice }: Props) {
    const router = useRouter()

    // Adapt snake_case DB record → camelCase form data
    const initialData: InvoiceFormData = {
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        customerName: invoice.customer_name,
        customerEmail: invoice.customer_email,
        invoiceDate: invoice.invoice_date,
        validUntil: invoice.valid_until ?? "",
        reference: invoice.reference,
        status: invoice.status,
        discount: invoice.discount,
        discountType: invoice.discount_type,
        notes: invoice.notes,
        termsAndConditions: invoice.terms_and_conditions,
        lineItems: (invoice.invoice_line_items ?? []).map((li) => ({
            id: li.id,
            productName: li.product_name,
            description: li.description,
            qty: li.qty,
            unitPrice: li.unit_price,
            taxPercent: li.tax_percent,
        })),
    }

    const handleSave = async (data: InvoiceFormData) => {
        const { error } = await updateInvoice({
            id: invoice.id,
            invoice_number: data.invoiceNumber,
            customer_name: data.customerName,
            customer_email: data.customerEmail,
            invoice_date: data.invoiceDate,
            valid_until: data.validUntil,
            reference: data.reference,
            status: data.status,
            discount: data.discount,
            discount_type: data.discountType,
            notes: data.notes,
            terms_and_conditions: data.termsAndConditions,
            line_items: data.lineItems.map((li) => ({
                product_name: li.productName,
                description: li.description,
                qty: li.qty,
                unit_price: li.unitPrice,
                tax_percent: li.taxPercent,
            })),
        })

        if (!error) {
            router.push("/sales/invoices")
        }
    }

    return <InvoiceForm initialData={initialData} onSave={handleSave} />
}
