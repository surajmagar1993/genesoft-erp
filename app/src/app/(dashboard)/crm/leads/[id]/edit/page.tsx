import { LeadForm, defaultLeadForm } from "@/components/crm/lead-form"

export default function EditLeadPage({ params }: { params: { id: string } }) {
    // Mock data for edit view
    const mockData = {
        ...defaultLeadForm,
        id: params.id,
        title: "ERP Implementation Inquiry",
        contactName: "Rahul Deshmukh",
        email: "rahul@techfirm.in",
        phone: "+91 98765 43210",
        source: "Website Form",
        status: "NEW" as const,
        score: 75,
        assignedTo: "Suraj M.",
        notes: "",
    }

    return <LeadForm mode="edit" initialData={mockData} />
}
