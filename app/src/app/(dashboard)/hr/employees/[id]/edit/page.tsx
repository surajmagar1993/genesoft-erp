import { notFound } from "next/navigation"
import { getHROverview } from "@/app/actions/hr"
import { EmployeeForm } from "@/components/hr/employee-form"
import { isUuid } from "@/lib/utils"

export const dynamic = "force-dynamic"
export const metadata = { title: "Edit employee | Genesoft ERP" }

export default async function EditEmployeePage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params
    if (!isUuid(id)) notFound()
    const { departments, designations, employees } = await getHROverview()
    const employee = employees.find((e) => e.id === id)
    if (!employee) notFound()
    return (
        <div className="flex-1 p-4 pt-6 md:p-8">
            <EmployeeForm departments={departments} designations={designations} employees={employees} employee={employee} />
        </div>
    )
}
