"use client"

import { useParams } from "next/navigation"
import { InvoiceForm, InvoiceFormData } from "@/components/sales/invoice-form"

// TODO: Replace with real API fetch
const mockInvoices: Record<string, InvoiceFormData> = {
    "1": {
        id: "1",
        invoiceNumber: "QTN-001",
        customerName: "Acme Corporation",
        customerEmail: "procurement@acme.com",
        invoiceDate: "2026-03-01",
        validUntil: "2026-03-31",
        reference: "PO-2026-100",
        status: "SENT",
        lineItems: [
            { id: "l1", productName: "Dell OptiPlex 3000 Desktop", description: "Intel Core i5, 8GB RAM, 256GB SSD", qty: 5, unitPrice: 42000, taxPercent: 18 },
            { id: "l2", productName: "Cloud Hosting & Maintenance", description: "Annual AWS hosting", qty: 1, unitPrice: 25000, taxPercent: 18 },
        ],
        notes: "Priority order — customer needs delivery by month-end.",
        termsAndConditions: "Payment due within 30 days.",
        discount: 5,
        discountType: "PERCENT",
    },
    "2": {
        id: "2",
        invoiceNumber: "QTN-002",
        customerName: "Nexora Tech Pvt Ltd",
        customerEmail: "it@nexora.in",
        invoiceDate: "2026-03-03",
        validUntil: "2026-04-03",
        reference: "",
        status: "DRAFT",
        lineItems: [
            { id: "l3", productName: "Ubiquiti UniFi AP AC Pro", description: "Enterprise Wi-Fi AP", qty: 10, unitPrice: 12500, taxPercent: 18 },
        ],
        notes: "",
        termsAndConditions: "Standard terms apply.",
        discount: 0,
        discountType: "PERCENT",
    },
}

export default function EditInvoicePage() {
    const params = useParams()
    const id = params.id as string
    const invoice = mockInvoices[id] || null

    const handleSave = (data: any) => {
        // TODO: API call to update invoice
        console.log("Invoice updated:", data)
    }

    return <InvoiceForm initialData={invoice} onSave={handleSave} />
}
