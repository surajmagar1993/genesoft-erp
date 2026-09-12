import { Suspense } from "react"
import { getKsaVatOverview } from "@/app/actions/finance/ksa-zatca"
import { KsaVatClient } from "./ksa-vat-client"
import { Loader2 } from "lucide-react"

export const dynamic = "force-dynamic"

interface PageProps {
  searchParams: Promise<{
    year?: string
    quarter?: string
  }>
}

export default async function KsaVatPage(props: PageProps) {
  const searchParams = await props.searchParams

  const yearNum = searchParams.year ? parseInt(searchParams.year, 10) : undefined
  const quarterVal = searchParams.quarter as "Q1" | "Q2" | "Q3" | "Q4" | undefined

  const data = await getKsaVatOverview({
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
      <KsaVatClient initialData={data} />
    </Suspense>
  )
}
