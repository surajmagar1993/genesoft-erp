"use client"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { ArrowLeft, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { OrderForm, OrderFormData } from "@/components/sales/order-form"
import { getOrderById, updateOrder } from "@/app/actions/sales/orders"

export default function EditOrderPage({ params }: { params: { id: string } }) {
    const router = useRouter()
    const [initialData, setInitialData] = useState<OrderFormData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const fetchOrder = async () => {
            const data = await getOrderById(params.id)
            if (!data) {
                toast.error("Sales order not found")
                router.push("/sales/orders")
                return
            }

            setInitialData({
                id: data.id,
                orderNumber: data.order_number,
                customerName: data.customer_name,
                customerEmail: data.customer_email,
                orderDate: data.order_date,
                expectedDate: data.expected_date || "",
                reference: data.reference || "",
                status: data.status,
                lineItems: data.sales_order_items?.map((li: any) => ({
                    id: li.id,
                    productName: li.product_name,
                    description: li.description || "",
                    qty: li.qty,
                    unitPrice: li.unit_price,
                    taxPercent: li.tax_percent
                })) || [],
                notes: data.notes || "",
                termsAndConditions: data.terms_and_conditions || "",
                discount: Number(data.discount),
                discountType: data.discount_type,
                contactId: data.contact_id,
            })
            setLoading(false)
        }

        fetchOrder()
    }, [params.id, router])

    const handleSave = async (data: OrderFormData) => {
        const { id, ...rest } = data
        const { error } = await updateOrder({
            id: params.id,
            order_number: rest.orderNumber,
            customer_name: rest.customerName,
            customer_email: rest.customerEmail,
            order_date: rest.orderDate,
            expected_date: rest.expectedDate,
            reference: rest.reference,
            status: rest.status,
            discount: rest.discount,
            discount_type: rest.discountType,
            notes: rest.notes,
            terms_and_conditions: rest.termsAndConditions,
            contact_id: rest.contactId,
            quote_id: rest.quoteId,
            line_items: rest.lineItems.map(li => ({
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
            toast.success("Sales order updated")
            router.push("/sales/orders")
        }
    }

    if (loading) {
        return (
            <div className="flex h-[50vh] flex-col justify-center items-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                <p className="mt-4 text-sm text-muted-foreground animate-pulse">Loading order details...</p>
            </div>
        )
    }

    return <OrderForm initialData={initialData} onSave={handleSave} />
}
