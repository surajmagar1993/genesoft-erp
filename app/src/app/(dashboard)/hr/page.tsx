import { getHROverview } from "@/app/actions/hr"
import { getPayrollOverview } from "@/app/actions/payroll"
import { getRecruitmentOverview } from "@/app/actions/recruitment"
import { HRClient } from "./hr-client"
import { ModuleGate } from "@/components/auth/module-gate"
import { PARKED_MODULES_ENABLED } from "@/lib/features"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "HR & Workforce Management | Genesoft ERP",
    description: "Employee directory, organizational departments, job designations, attendance rosters, leave approvals, payroll engine, and recruitment ATS.",
}

export default function HRPage() {
    // /hr/portal (self-service) is open to everyone, so HR is gated here rather than in a layout
    return (
        <ModuleGate module="hr">
            <HRContent />
        </ModuleGate>
    )
}

async function HRContent() {
    const [overviewData, payrollData, recruitmentData] = await Promise.all([
        getHROverview(),
        // Payroll needs payroll access; others get the HR page without it
        getPayrollOverview().catch(() => undefined),
        // Recruitment is switched off (src/lib/features.ts): don't load it
        PARKED_MODULES_ENABLED ? getRecruitmentOverview() : Promise.resolve(undefined),
    ])

    return <HRClient initialData={overviewData} payrollData={payrollData} recruitmentData={recruitmentData} />
}

