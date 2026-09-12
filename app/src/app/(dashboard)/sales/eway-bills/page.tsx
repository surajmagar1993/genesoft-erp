import { Metadata } from "next"
import { getEwayBillsOverview } from "@/app/actions/sales/eway-bills"
import { EwayClient } from "./eway-client"

export const metadata: Metadata = {
  title: "E-Way Bills | Indian GST Compliance | Genesoft ERP",
  description: "Generate, track, and manage statutory Indian E-Way Bills (Rule 138 CGST) with Part-A, Part-B, NIC JSON export, and printable slips.",
}

export default async function EwayBillsPage() {
  const overviewData = await getEwayBillsOverview()

  return (
    <div className="flex-1 space-y-6 p-8 pt-6 max-w-7xl mx-auto">
      <EwayClient initialData={overviewData} />
    </div>
  )
}
