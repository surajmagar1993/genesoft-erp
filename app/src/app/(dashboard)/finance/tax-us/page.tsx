import { Suspense } from "react"
import { getUsTaxOverview } from "@/app/actions/finance/us-tax"
import { UsTaxClient } from "./us-tax-client"
import { Loader2 } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    taxYear?: string
    quarter?: string
  }>
}

export default async function UsTaxPage(props: PageProps) {
  const searchParams = await props.searchParams

  const taxYearNum = searchParams.taxYear ? parseInt(searchParams.taxYear, 10) : undefined
  const quarterVal = searchParams.quarter as "Q1" | "Q2" | "Q3" | "Q4" | "ALL" | undefined

  const data = await getUsTaxOverview({
    taxYear: taxYearNum,
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
      <UsTaxClient initialData={data} />
    </Suspense>
  )
}
