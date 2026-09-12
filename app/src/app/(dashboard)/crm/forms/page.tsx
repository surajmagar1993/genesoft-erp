import { Metadata } from "next"
import { getWebFormsOverview } from "@/app/actions/crm/forms"
import { FormsClient } from "./forms-client"

export const metadata: Metadata = {
    title: "Web Forms & Lead Capture | CRM Studio",
    description: "Build embeddable intake forms, capture inbound leads, manage submissions, and integrate with CRM workflows.",
}

export default async function FormsPage() {
    const initialData = await getWebFormsOverview()

    return <FormsClient initialData={initialData} />
}
