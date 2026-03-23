import { notFound } from "next/navigation"
import { getInvoiceById } from "@/app/actions/sales/invoices"
import EditInvoiceClient from "./edit-invoice-client"

interface Props {
    params: Promise<{ id: string }>
}

export default async function EditInvoicePage({ params }: Props) {
    const { id } = await params
    const invoice = await getInvoiceById(id)

    if (!invoice) notFound()

    return <EditInvoiceClient invoice={invoice} />
}
