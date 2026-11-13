import { getHROverview } from "@/app/actions/hr"
import { EmployeeForm } from "@/components/hr/employee-form"

export const dynamic = "force-dynamic"
export const metadata = { title: "New employee | Genesoft ERP" }

export default async function NewEmployeePage() {
    const { departments, designations, employees } = await getHROverview()
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <EmployeeForm departments={departments} designations={designations} employees={employees} />
        </div>
    )
}
