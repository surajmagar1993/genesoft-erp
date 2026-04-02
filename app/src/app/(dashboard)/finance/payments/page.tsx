import { getPayments } from "@/app/actions/finance/payments"
import PaymentsClient from "./payments-client"

export default async function PaymentsPage() {
    const { data: payments, total } = await getPayments()

    return <PaymentsClient initialPayments={payments} total={total} />
}
