import { getTdsOverview } from "@/app/actions/finance/tds"
import { TdsClient } from "./tds-client"

interface PageProps {
  searchParams: Promise<{
    fy?: string
    q?: "Q1" | "Q2" | "Q3" | "Q4"
  }>
}

export const metadata = {
  title: "TDS & Tax Withholding | Finance",
  description: "Indian Tax Deducted at Source (TDS) compliance, Form 26Q returns, and Challan 281 deposits.",
}

export default async function TdsPage({ searchParams }: PageProps) {
  const params = await searchParams
  const overview = await getTdsOverview(params.fy, params.q)

  return <TdsClient initialData={overview} />
}
