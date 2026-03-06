import { ContactForm, emptyContactForm } from "@/components/crm/contact-form"

export default function EditContactPage({ params }: { params: { id: string } }) {
    // In a real app, you would fetch the contact data using the params.id
    // Here we're using a mock structure based on what was in the list page
    const mockData = {
        ...emptyContactForm,
        id: params.id,
        displayName: "VM Edulife Private Limited",
        type: "COMPANY" as const,
        companyName: "VM Edulife Private Limited",
        email: "info@vmedulife.com",
        phoneDialCode: "+91",
        phone: "20 1234 5678",
        gstin: "27AAECV5149A1ZH",
        pan: "AAECV5149A",
        customerGroup: "dealer",
        countryCode: "IN",
        currencyCode: "INR",
    }

    return <ContactForm mode="edit" initialData={mockData} />
}
