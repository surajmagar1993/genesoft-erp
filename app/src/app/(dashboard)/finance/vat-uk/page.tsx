import { Suspense } from "react"
import { getUkVatOverview } from "@/app/actions/finance/uk-vat"
import { UkVatClient } from "./uk-vat-client"
import { Loader2 } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    year?: string
    quarter?: string
  }>
}

export default async function UkVatPage(props: PageProps) {
  const searchParams = await props.searchParams

  const yearNum = searchParams.year ? parseInt(searchParams.year, 10) : undefined
  const quarterVal = searchParams.quarter as "Q1" | "Q2" | "Q3" | "Q4" | undefined

  const data = await getUkVatOverview({
    year: yearNum,
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
      <UkVatClient initialData={data} />
    </Suspense>
  )
}
