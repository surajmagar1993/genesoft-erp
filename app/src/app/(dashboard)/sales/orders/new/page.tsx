"use client"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { OrderForm, OrderFormData } from "@/components/sales/order-form"
import { createOrder } from "@/app/actions/sales/orders"

export default function NewOrderPage() {
    const router = useRouter()

    const handleSave = async (data: OrderFormData) => {
        const { id, ...rest } = data
        const { error } = await createOrder({
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
            toast.success("Sales order created")
            router.push("/sales/orders")
        }
    }

    return <OrderForm onSave={handleSave} />
}
