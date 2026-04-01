import { notFound } from "next/navigation"
import { getInvoiceById } from "@/app/actions/sales/invoices"
import { getPaymentsByInvoice } from "@/app/actions/finance/payments"
import InvoiceDetailsClient from "./invoice-details-client"

interface Props {
    params: Promise<{ id: string }>
}

export default async function InvoiceDetailsPage({ params }: Props) {
    const { id } = await params
    const invoice = await getInvoiceById(id)
    if (!invoice) notFound()

    const payments = await getPaymentsByInvoice(id)

    return <InvoiceDetailsClient invoice={invoice} payments={payments} />
}
