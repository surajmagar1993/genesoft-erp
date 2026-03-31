"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { InvoiceForm, InvoiceFormData } from "@/components/sales/invoice-form"
import { createInvoice, getNextInvoiceNumber } from "@/app/actions/sales/invoices"
import { computeLineItemGst, getSupplyType } from "@/lib/gst-engine"

export default function NewInvoicePage() {
    return <NewInvoiceFormWrapper />
}

function NewInvoiceFormWrapper() {
    const router = useRouter()
    const [nextInvoiceNum, setNextInvoiceNum] = useState<string>("")

    useEffect(() => {
        getNextInvoiceNumber().then(setNextInvoiceNum)
    }, [])

    const handleSave = async (data: InvoiceFormData) => {
        const supplyType = getSupplyType(data.supplierState, data.placeOfSupply)

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
            // GST header
            supplier_gstin: data.supplierGstin,
            customer_gstin: data.customerGstin,
            supplier_state: data.supplierState,
            place_of_supply: data.placeOfSupply,
            supply_type: supplyType,
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

    return <InvoiceForm onSave={handleSave} nextInvoiceNumber={nextInvoiceNum} />
}
