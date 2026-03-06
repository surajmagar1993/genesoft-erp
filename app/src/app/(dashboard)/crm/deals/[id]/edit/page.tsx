import { DealForm, defaultDealForm } from "@/components/crm/deal-form"

export default function EditDealPage({ params }: { params: { id: string } }) {
    // Mock data for edit view
    const mockData = {
        ...defaultDealForm,
        id: params.id,
        title: "ERP Annual License",
        contactName: "Rahul Deshmukh",
        company: "TechFirm India",
        value: 350000,
        stage: "PROPOSAL" as const,
        probability: 60,
        expectedClose: "2026-04-15",
        assignedTo: "Suraj M.",
        notes: "",
    }

    return <DealForm mode="edit" initialData={mockData} />
}
