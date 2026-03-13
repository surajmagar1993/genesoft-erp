"use client"

import { InvoiceForm } from "@/components/sales/invoice-form"

export default function NewInvoicePage() {
    const handleSave = (data: any) => {
        // TODO: API call to save invoice
        console.log("Invoice saved:", data)
    }

    return <InvoiceForm onSave={handleSave} />
}
