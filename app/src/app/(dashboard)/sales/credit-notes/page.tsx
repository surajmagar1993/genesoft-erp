import { getCreditNotesOverview } from "@/app/actions/sales/credit-notes"
import { CreditNotesClient } from "./credit-notes-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Credit Notes & Customer Refunds | Genesoft ERP",
    description: "Issue credit memos, manage customer returns, restock inventory, and process direct refund disbursements.",
}

export default async function CreditNotesPage() {
    const overviewData = await getCreditNotesOverview()

    return <CreditNotesClient initialData={overviewData} />
}
