import { getVendors, getProducts } from "@/app/actions/finance/bills"
import { BillForm } from "@/components/finance/bill-form"

export const metadata = {
  title: "New Vendor Bill | Genesoft ERP",
  description: "Record a new bill from a vendor.",
}

export default async function NewBillPage() {
  const vendors = await getVendors()
  const products = await getProducts()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <BillForm vendors={vendors} products={products} />
    </div>
  )
}
