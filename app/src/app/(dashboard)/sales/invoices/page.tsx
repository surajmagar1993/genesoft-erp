import { getInvoices } from "@/app/actions/sales/invoices"
import InvoicesClient from "./invoices-client"


export default async function InvoicesPage() {
    const invoices = await getInvoices()
    return <InvoicesClient invoices={invoices} />
}
