import { getContacts } from "@/app/actions/crm/contacts"
import ContactsClient from "./ContactsClient"

export const dynamic = "force-dynamic"

export default async function ContactsPage() {
    const contacts = await getContacts()
    return <ContactsClient initialContacts={contacts} />
}
