import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"

type Db = Prisma.TransactionClient | typeof prisma

/**
 * Document numbers: the next number after the highest one already used with
 * this prefix (e.g. "EMP-2026-" → EMP-2026-0008). Unlike count + 1 it never
 * repeats a number after a deletion. Table/column come from code, never input.
 */
const SEQUENCES = {
    employee: ["employees", "employee_number"],
    expense: ["expenses", "expense_number"],
    journalEntry: ["journal_entries", "entry_number"],
    project: ["projects", "project_code"],
    projectTask: ["project_tasks", "task_code"],
    rentalAsset: ["rental_assets", "asset_code"],
    rentalAgreement: ["rental_agreements", "agreement_number"],
    bom: ["bill_of_materials", "bom_number"],
    workOrder: ["work_orders", "order_number"],
    qualityInspection: ["quality_inspections", "inspection_number"],
    appraisalCycle: ["appraisal_cycles", "cycle_code"],
    performanceReview: ["performance_reviews", "review_code"],
    employeeGoal: ["employee_goals", "goal_code"],
    trainingProgram: ["training_programs", "program_code"],
    recurringProfile: ["recurring_profiles", "profile_number"],
    creditNote: ["credit_notes", "credit_note_number"],
    salesOrder: ["sales_orders", "order_number"],
    quote: ["quotes", "quote_number"],
    jobOpening: ["job_openings", "job_code"],
    jobApplicant: ["job_applicants", "applicant_number"],
    rfq: ["request_for_quotations", "rfq_number"],
    purchaseOrder: ["purchase_orders", "order_number"],
    deliveryChallan: ["delivery_challans", "challan_number"],
    workflowRule: ["workflow_rules", "code"],
} as const

export type SequenceName = keyof typeof SEQUENCES

export async function nextSequence(db: Db, name: SequenceName, tenantId: string, prefix: string, pad = 4): Promise<string> {
    const [table, column] = SEQUENCES[name]
    const rows: { max: number | null }[] = await db.$queryRawUnsafe(
        `select max(substring("${column}" from '([0-9]+)$')::int) as max from "${table}" where tenant_id = $1::uuid and "${column}" like $2`,
        tenantId,
        `${prefix}%`
    )
    return `${prefix}${String((rows[0]?.max ?? 0) + 1).padStart(pad, "0")}`
}
