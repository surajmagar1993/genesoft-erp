import { getBalanceSheet, getLedgerPageData, getTrialBalance } from "@/app/actions/finance/ledger"
import { LedgerClient } from "./ledger-client"

export const dynamic = "force-dynamic"
// Rebuilding a large ledger re-posts every document
export const maxDuration = 300

export const metadata = {
    title: "General Ledger | Genesoft ERP",
}

export default async function LedgerPage() {
    const today = new Date().toISOString().slice(0, 10)
    const [data, tb, bs] = await Promise.all([getLedgerPageData(), getTrialBalance(today), getBalanceSheet(today)])
    return <LedgerClient data={data} initialTrialBalance={tb} initialBalanceSheet={bs} today={today} />
}
