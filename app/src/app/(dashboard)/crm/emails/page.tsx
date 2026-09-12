import { Metadata } from "next"
import { getEmailsOverview } from "@/app/actions/crm/emails"
import { EmailsClient } from "./emails-client"

export const metadata: Metadata = {
    title: "CRM Email Integration & Inbox | ERP Cloud",
    description: "Multi-account corporate mailbox integration, thread synchronization, CRM entity linking, and template composition.",
}

export default async function EmailsPage() {
    const initialData = await getEmailsOverview()

    return <EmailsClient initialData={initialData} />
}
