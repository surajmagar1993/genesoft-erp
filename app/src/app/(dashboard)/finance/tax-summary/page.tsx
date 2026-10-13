import { getTaxSummary } from "@/app/actions/finance/tax-summary"
import { TaxSummaryClient } from "./tax-summary-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Tax Summary | Genesoft ERP",
}

function monthRange(date = new Date()) {
    const y = date.getFullYear()
    const m = date.getMonth()
    const pad = (n: number) => String(n).padStart(2, "0")
    const last = new Date(y, m + 1, 0).getDate()
    return { from: `${y}-${pad(m + 1)}-01`, to: `${y}-${pad(m + 1)}-${pad(last)}` }
}

export default async function TaxSummaryPage() {
    const range = monthRange()
    const initial = await getTaxSummary(range)
    return <TaxSummaryClient initial={initial} />
}
