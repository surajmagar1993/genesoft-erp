import { getPayableSummary, getTopCreditors } from "@/app/actions/finance/payable"
import PayableClient from "./PayableClient"

export const metadata = {
  title: "Accounts Payable | Genesoft ERP",
  description: "Manage vendor aging and outstanding payables.",
}

export default async function PayablePage() {
  const summary = await getPayableSummary()
  const creditors = await getTopCreditors()

  return <PayableClient summary={summary} creditors={creditors} />
}
