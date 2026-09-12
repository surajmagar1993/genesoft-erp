import { getBankReconciliationOverview } from "@/app/actions/finance/bank-reconciliation"
import BankReconciliationClient from "./bank-reconciliation-client"

export const metadata = {
    title: "Bank Reconciliation | Genesoft ERP",
    description: "Match bank statement transactions against general ledger records, audit cleared entries, and resolve discrepancies.",
}

export default async function BankReconciliationPage({
    searchParams,
}: {
    searchParams: Promise<{ accountId?: string }>
}) {
    const { accountId } = await searchParams
    const overview = await getBankReconciliationOverview(accountId)

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <BankReconciliationClient initialData={overview} />
        </div>
    )
}
