import { getPnlReport, getMonthlyRevenue, getCashFlowSummary, getTopRevenueContacts } from "@/app/actions/finance/reports"
import ReportsClient from "./ReportsClient"

export const metadata = {
  title: "Financial Reports | Genesoft ERP",
  description: "Profit & Loss, Revenue Trends, and Cash Flow Analysis for your business.",
}

interface Props {
  searchParams: Promise<{ year?: string; quarter?: string }>
}

/* ── Quarter → date range mapping ── */
function getDateRange(year: number, quarter: string): { start: string; end: string } {
  const y = year
  switch (quarter) {
    case "q1": return { start: `${y}-01-01`, end: `${y}-03-31` }
    case "q2": return { start: `${y}-04-01`, end: `${y}-06-30` }
    case "q3": return { start: `${y}-07-01`, end: `${y}-09-30` }
    case "q4": return { start: `${y}-10-01`, end: `${y}-12-31` }
    default:   return { start: `${y}-01-01`, end: `${y}-12-31` }
  }
}

export default async function ReportsPage({ searchParams }: Props) {
  const params = await searchParams
  const currentYear = new Date().getFullYear()
  const selectedYear = parseInt(params.year ?? String(currentYear), 10)
  const selectedQuarter = params.quarter ?? "full"

  const { start, end } = getDateRange(selectedYear, selectedQuarter)

  const [pnl, monthly, cashFlow, topContacts] = await Promise.all([
    getPnlReport(start, end),
    getMonthlyRevenue(selectedYear),
    getCashFlowSummary(start, end),
    getTopRevenueContacts(5),
  ])

  return (
    <div className="flex-1 space-y-6 p-8 pt-6">
      <ReportsClient
        pnl={pnl}
        monthly={monthly}
        cashFlow={cashFlow}
        topContacts={topContacts}
        selectedYear={selectedYear}
        selectedQuarter={selectedQuarter}
      />
    </div>
  )
}
