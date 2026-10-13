import { getBill } from "@/app/actions/finance/bills"
import { notFound } from "next/navigation"
import BillDetailsClient from "./BillDetailsClient"

export const metadata = {
  title: "Bill Details | Genesoft ERP",
  description: "View vendor bill details and line items.",
}

export default async function BillDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const bill = await getBill(id)
  
  if (!bill) {
    notFound()
  }

  return <BillDetailsClient bill={bill} />
}
