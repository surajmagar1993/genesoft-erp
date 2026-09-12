import { Suspense } from "react"
import { getAustralianBasOverview } from "@/app/actions/finance/australia-tax"
import { AustraliaTaxClient } from "./australia-tax-client"
import { Loader2 } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    startYear?: string
    quarter?: string
  }>
}

export default async function AustraliaTaxPage(props: PageProps) {
  const searchParams = await props.searchParams

  const startYearNum = searchParams.startYear ? parseInt(searchParams.startYear, 10) : undefined
  const quarterVal = searchParams.quarter as "Q1" | "Q2" | "Q3" | "Q4" | undefined

  const data = await getAustralianBasOverview({
    startYear: startYearNum,
    quarter: quarterVal,
  })

  return (
    <Suspense
      fallback={
        <div className="flex h-96 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }
    >
      <AustraliaTaxClient initialData={data} />
    </Suspense>
  )
}
