import { getHROverview } from "@/app/actions/hr"
import { getPayrollOverview } from "@/app/actions/payroll"
import { getRecruitmentOverview } from "@/app/actions/recruitment"
import { HRClient } from "./hr-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "HR & Workforce Management | Genesoft ERP",
    description: "Employee directory, organizational departments, job designations, attendance rosters, leave approvals, payroll engine, and recruitment ATS.",
}

export default async function HRPage() {
    const [overviewData, payrollData, recruitmentData] = await Promise.all([
        getHROverview(),
        // Payroll is MANAGER+; other roles get the HR page without it
        getPayrollOverview().catch(() => undefined),
        getRecruitmentOverview()
    ])

    return <HRClient initialData={overviewData} payrollData={payrollData} recruitmentData={recruitmentData} />
}

