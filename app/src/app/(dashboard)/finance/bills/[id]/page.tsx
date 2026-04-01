import { getBill } from "@/app/actions/finance/bills"
import { notFound } from "next/navigation"
import BillDetailsClient from "./BillDetailsClient"

export const metadata = {
  title: "Bill Details | Genesoft ERP",
  description: "View vendor bill details and line items.",
}

export default async function BillDetailsPage({ params }: { params: { id: string } }) {
  const bill = await getBill(params.id)
  
  if (!bill) {
    notFound()
  }

  return <BillDetailsClient bill={bill} />
}
