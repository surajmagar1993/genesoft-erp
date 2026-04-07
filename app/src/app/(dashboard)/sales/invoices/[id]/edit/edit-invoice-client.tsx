"use client"

import { useRouter } from "next/navigation"
import { InvoiceForm, InvoiceFormData } from "@/components/sales/invoice-form"
import { updateInvoice, InvoiceDB } from "@/app/actions/sales/invoices"
import { computeLineItemGst, getSupplyType, GstRate } from "@/lib/gst-engine"

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
        // GST header
        supplierGstin: invoice.supplier_gstin ?? "",
        customerGstin: invoice.customer_gstin ?? "",
        supplierState: invoice.supplier_state ?? "",
        placeOfSupply: invoice.place_of_supply ?? "",
        lineItems: (invoice.invoice_line_items ?? []).map((li) => ({
            id: li.id,
            productName: li.product_name,
            description: li.description,
            qty: li.qty,
            unitPrice: li.unit_price,
            gstRate: (li.tax_percent ?? 18) as GstRate,
            hsnSac: li.hsn_sac ?? "",
        })),
    }

    const handleSave = async (data: InvoiceFormData) => {
        const supplyType = getSupplyType(data.supplierState, data.placeOfSupply)

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
            // GST header
            supplier_gstin: data.supplierGstin,
            customer_gstin: data.customerGstin,
            supplier_state: data.supplierState,
            place_of_supply: data.placeOfSupply,
            supply_type: supplyType,
            contact_id: invoice.contact_id,
            line_items: data.lineItems.map((li) => {
                const gst = computeLineItemGst(li.qty, li.unitPrice, li.gstRate, supplyType)
                return {
                    product_name: li.productName,
                    description: li.description,
                    qty: li.qty,
                    unit_price: li.unitPrice,
                    tax_percent: li.gstRate,
                    hsn_sac: li.hsnSac,
                    cgst_percent: gst.cgstPercent,
                    sgst_percent: gst.sgstPercent,
                    igst_percent: gst.igstPercent,
                    cgst_amount: gst.cgstAmount,
                    sgst_amount: gst.sgstAmount,
                    igst_amount: gst.igstAmount,
                }
            }),
        })

        if (!error) {
            router.push("/sales/invoices")
        }
    }

    return <InvoiceForm initialData={initialData} onSave={handleSave} />
}
