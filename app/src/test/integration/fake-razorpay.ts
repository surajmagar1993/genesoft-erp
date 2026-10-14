/** In-memory Razorpay orders API: create, fetch, and markPaid() to simulate the customer paying. */
type Order = {
    id: string
    amount: number
    amount_paid: number
    currency: string
    status: "created" | "paid"
    receipt?: string
    notes: Record<string, string>
}

const orders = new Map<string, Order>()
let n = 0

export const fakeRazorpay = {
    orders: {
        create: async (params: { amount: number; currency: string; receipt?: string; notes?: Record<string, string> }) => {
            const order: Order = {
                id: `order_test_${++n}`,
                amount: params.amount,
                amount_paid: 0,
                currency: params.currency,
                status: "created",
                receipt: params.receipt,
                notes: params.notes ?? {},
            }
            orders.set(order.id, order)
            return { ...order }
        },
        fetch: async (id: string) => {
            const order = orders.get(id)
            if (!order) throw new Error("order not found")
            return { ...order }
        },
    },
}

export function markOrderPaid(id: string) {
    const order = orders.get(id)
    if (!order) throw new Error("order not found")
    order.status = "paid"
    order.amount_paid = order.amount
}
