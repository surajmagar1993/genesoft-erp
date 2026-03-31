"use client"

import { QuoteForm } from "@/components/sales/quote-form"
import { useRouter } from "next/navigation"
import { createQuote } from "@/app/actions/sales/quotes"
import { toast } from "sonner"

export default function NewQuotePage() {
    const router = useRouter()

    const handleSave = async (data: any) => {
        const { id, error } = await createQuote({
            quote_number: data.quoteNumber,
            customer_name: data.customerName,
            customer_email: data.customerEmail,
            quote_date: data.quoteDate,
            valid_until: data.validUntil,
            reference: data.reference,
            status: data.status,
            discount: data.discount,
            discount_type: data.discountType,
            notes: data.notes,
            terms_and_conditions: data.termsAndConditions,
            line_items: data.lineItems.map((li: any) => ({
                product_name: li.productName,
                description: li.description,
                qty: li.qty,
                unit_price: li.unitPrice,
                tax_percent: li.taxPercent
            }))
        })

        if (error) {
            toast.error(error)
        } else {
            toast.success("Quote created successfully")
            router.push("/sales/quotes")
        }
    }

    return (
        <div className="p-6">
            <QuoteForm onSave={handleSave} />
        </div>
    )
}
