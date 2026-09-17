import { getRfqOverview } from "@/app/actions/rfq"
import { RfqClient } from "./rfq-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Request for Quotation (RFQ) | Genesoft ERP",
    description: "Multi-vendor quotation solicitation, side-by-side bid comparison matrix, tender specifications, and 1-click Purchase Order awarding.",
}

export default async function RfqPage() {
    const data = await getRfqOverview()

    return <RfqClient initialData={data} />
}
