import { getUaeVatOverview } from "@/app/actions/finance/uae-vat"
import UaeVatClient from "./uae-vat-client"

export const metadata = {
  title: "UAE VAT Returns (Form VAT201) | Genesoft ERP",
  description: "UAE Federal Tax Authority (FTA) Form VAT201 Return Studio — Standard 5% VAT, TRN validation, The 7 Emirates apportionment, Article 48 RCM, and EmaraTax exports.",
}

interface Props {
  searchParams: Promise<{ year?: string; quarter?: "Q1" | "Q2" | "Q3" | "Q4" }>
}

export default async function UaeVatPage({ searchParams }: Props) {
  const params = await searchParams
  const now = new Date()
  const year = params.year ? parseInt(params.year, 10) : now.getFullYear()
  const quarter = params.quarter || "Q3"

  const overview = await getUaeVatOverview({ year, quarter })

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <UaeVatClient initialData={overview} />
    </div>
  )
}
