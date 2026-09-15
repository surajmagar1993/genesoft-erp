import { getDeliveryChallansOverview } from "@/app/actions/sales/delivery-challan"
import { DeliveryChallansClient } from "./delivery-challans-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Delivery Challans | Logistics & Sales | Genesys ERP",
    description: "Rule 55 statutory Delivery Challans management, dispatch tracking, and invoice conversion.",
}

export default async function DeliveryChallansPage() {
    const data = await getDeliveryChallansOverview()

    return <DeliveryChallansClient initialData={data} />
}
