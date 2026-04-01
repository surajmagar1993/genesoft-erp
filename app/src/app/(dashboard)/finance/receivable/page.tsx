import { getReceivableSummary, getTopDebtors } from "@/app/actions/finance/receivable"
import ReceivableClient from "./ReceivableClient"

export const metadata = {
  title: "Accounts Receivable | Genesoft ERP",
  description: "Manage customer aging and outstanding balances.",
}

export default async function ReceivablePage() {
  const summary = await getReceivableSummary()
  const debtors = await getTopDebtors()

  return <ReceivableClient summary={summary} debtors={debtors} />
}
