import { getReportBuilderInitData, runCustomReportQuery } from "@/app/actions/reports/builder"
import { PREBUILT_TEMPLATES } from "@/types/report-builder"
import { ReportBuilderClient } from "./report-builder-client"

export const dynamic = "force-dynamic"

export const metadata = {
    title: "Custom Report Builder | Genesoft ERP",
    description: "Design ad-hoc operational, financial, and workforce reports with dynamic field selectors, aggregations, charts, and CSV/print exports.",
}

export default async function ReportBuilderPage() {
    const initData = await getReportBuilderInitData()
    // Run initial report with the first prebuilt template
    const initialResult = await runCustomReportQuery(PREBUILT_TEMPLATES[0].config)

    return (
        <ReportBuilderClient
            datasets={initData.datasets}
            savedReports={initData.savedReports}
            initialResult={initialResult}
            initialConfig={PREBUILT_TEMPLATES[0].config}
        />
    )
}
