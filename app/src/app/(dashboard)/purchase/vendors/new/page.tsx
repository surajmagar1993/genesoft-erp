import { VendorForm } from "@/components/purchase/vendor-form"

export const metadata = { title: "New supplier | Genesoft ERP" }

export default function NewVendorPage() {
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <VendorForm />
        </div>
    )
}
