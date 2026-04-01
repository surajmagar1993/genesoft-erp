import { getBills } from "@/app/actions/finance/bills"
import BillsClient from "./BillsClient"

export const metadata = {
  title: "Vendor Bills | Genesoft ERP",
  description: "Track and manage your vendor bills.",
}

export default async function BillsPage() {
  const bills = await getBills()

  return <BillsClient bills={bills} />
}
