import { getRentalOverview } from "@/app/actions/rental"
import { RentalClient } from "./rental-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Rental & Asset Leasing | Genesoft ERP",
    description: "Manage asset availability, draft rental agreements, track active leases, process returns with damage inspection, and automate tax invoicing.",
}

export default async function RentalPage() {
    const overviewData = await getRentalOverview()

    return <RentalClient initialData={overviewData} />
}
