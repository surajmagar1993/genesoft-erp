import { getRfqOverview } from "@/app/actions/rfq"
import { RfqForm } from "@/components/purchase/rfq-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "New RFQ | Genesoft ERP" }

export default async function NewRfqPage() {
    const data = await getRfqOverview()
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <RfqForm data={data} />
        </div>
    )
}
