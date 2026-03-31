"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { QuoteForm } from "@/components/sales/quote-form"
import { getQuoteById, updateQuote } from "@/app/actions/sales/quotes"
import { toast } from "sonner"

export default function EditQuotePage() {
    const params = useParams()
    const router = useRouter()
    const id = params.id as string
    
    const [initialData, setInitialData] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (id) {
            fetchQuote()
        }
    }, [id])

    const fetchQuote = async () => {
        setLoading(true)
        try {
            const data = await getQuoteById(id)
            if (!data) {
                toast.error("Quote not found")
                router.push("/sales/quotes")
                return
            }
            
            // Map DB to Form
            setInitialData({
                id: data.id,
                quoteNumber: data.quote_number,
                customerName: data.customer_name,
                customerEmail: data.customer_email,
                quoteDate: data.quote_date,
                validUntil: data.valid_until || "",
                reference: data.reference || "",
                status: data.status,
                lineItems: data.quote_items?.map(li => ({
                    id: li.id,
                    productName: li.product_name,
                    description: li.description || "",
                    qty: Number(li.qty),
                    unitPrice: Number(li.unit_price),
                    taxPercent: Number(li.tax_percent)
                })) || [],
                notes: data.notes || "",
                termsAndConditions: data.terms_and_conditions || "",
                discount: Number(data.discount),
                discountType: data.discount_type
            })
        } catch (error) {
            toast.error("Failed to fetch quote")
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async (data: any) => {
        const { error } = await updateQuote({
            id: id,
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
            toast.success("Quote updated successfully")
            router.push("/sales/quotes")
        }
    }

    if (loading) {
        return <div className="p-8 text-center text-muted-foreground">Loading quotation...</div>
    }

    return (
        <div className="p-6">
            <QuoteForm initialData={initialData} onSave={handleSave} />
        </div>
    )
}
