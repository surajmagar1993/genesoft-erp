import { getSystemEmailTemplates } from "@/app/actions/admin/email-templates"
import { EmailTemplatesClient } from "./email-templates-client"

export const dynamic = "force-dynamic"

export default async function AdminEmailTemplatesPage() {
    const data = await getSystemEmailTemplates()

    return <EmailTemplatesClient initialData={data} />
}
