import { getBill, getVendors, getProducts } from "@/app/actions/finance/bills"
import { BillForm } from "@/components/finance/bill-form"
import { notFound } from "next/navigation"

export const metadata = {
  title: "Edit Bill | Genesoft ERP",
  description: "Edit an existing vendor bill.",
}

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditBillPage({ params }: Props) {
  const { id } = await params
  const [bill, vendors, products] = await Promise.all([
    getBill(id),
    getVendors(),
    getProducts(),
  ])

  if (!bill) return notFound()

  // Remap bill_items → items so BillForm can consume via initialData.items
  const initialData = {
    ...bill,
    items: bill.bill_items ?? [],
  }

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <BillForm initialData={initialData} vendors={vendors} products={products} />
    </div>
  )
}
