import { getBudgetsOverview } from "@/app/actions/finance/budgets"
import { BudgetsClient } from "./budgets-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Budgets & Variance Analysis | Genesoft ERP",
    description: "Corporate & departmental financial planning, fiscal year targets, actual spend tracking, and burn rate alerts.",
}

export default async function BudgetsPage() {
    const data = await getBudgetsOverview()

    return <BudgetsClient initialData={data} />
}
