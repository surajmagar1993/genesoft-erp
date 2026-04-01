import { getPayments } from "@/app/actions/finance/payments"
import PaymentsClient from "./payments-client"

export default async function PaymentsPage() {
    const payments = await getPayments()
    return <PaymentsClient payments={payments} />
}
