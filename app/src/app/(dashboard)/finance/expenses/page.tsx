import { getExpensesOverview } from "@/app/actions/finance/expenses"
import ExpensesClient from "./expenses-client"
import { redirect } from "next/navigation"

export const metadata = {
    title: "Expense Management & General Ledger | Genesoft ERP",
    description: "Track operational business expenses, vendor reimbursements, and double-entry General Ledger bookkeeping.",
}

export default async function ExpensesPage() {
    const res = await getExpensesOverview()

    if (res.error && !res.data) {
        return (
            <div className="flex-1 p-8">
                <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-6 text-destructive">
                    <h3 className="font-semibold text-lg">Error Loading Expenses & General Ledger</h3>
                    <p className="text-sm mt-1">{res.error}</p>
                </div>
            </div>
        )
    }

    const { stats, expenses, journalEntries, accounts, vendors, employees } = res.data!

    return (
        <div className="flex-1 space-y-6 p-8 pt-6">
            <ExpensesClient
                initialStats={stats}
                initialExpenses={expenses}
                initialJournalEntries={journalEntries}
                accounts={accounts}
                vendors={vendors}
                employees={employees}
            />
        </div>
    )
}
