"use client"

import { useRouter } from "next/navigation"
import { InvoiceForm, InvoiceFormData } from "@/components/sales/invoice-form"
import { createInvoice } from "@/app/actions/sales/invoices"

export default function NewInvoicePage() {
    const router = useRouter()

    const handleSave = async (data: InvoiceFormData) => {
        const { error } = await createInvoice({
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

    return <InvoiceForm onSave={handleSave} />
}
