import { getGstReturnsOverview } from "@/app/actions/finance/gst-returns"
import GstReturnsClient from "./gst-returns-client"

export const metadata = {
  title: "GST Returns (GSTR-1 & GSTR-3B) | Genesoft ERP",
  description: "Indian Statutory GST Returns Studio — GSTR-1 outward supplies, GSTR-3B monthly summary, Rule 88A tax set-off, HSN summary, and GST portal offline tool exports.",
}

interface Props {
  searchParams: Promise<{ year?: string; month?: string }>
}

export default async function GstReturnsPage({ searchParams }: Props) {
  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear()
  const month = params.month ? parseInt(params.month, 10) : (now.getMonth() + 1)

  const overview = await getGstReturnsOverview({ year, month })

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <GstReturnsClient initialData={overview} />
    </div>
  )
}
