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

/**
 * Takes the next number in a series. A counter row per business, series and
 * prefix (document_counters) is locked and moved on, so two saves at the same
 * moment never get the same number; it never falls below the highest number
 * already used (numbers typed by hand, documents from before the counter).
 * Inside the document's transaction (pass `tx`), a rolled-back save gives the
 * number back.
 */
export async function nextSequence(db: Db, name: SequenceName, tenantId: string, prefix: string, pad = 4): Promise<string> {
    const [table, column] = SEQUENCES[name]
    const rows: { last_value: number }[] = await db.$queryRawUnsafe(
        `insert into document_counters (tenant_id, name, prefix, last_value)
         select $1::uuid, $2, $3, coalesce(max(substring("${column}" from '([0-9]+)$')::int), 0) + 1
         from "${table}" where tenant_id = $1::uuid and "${column}" like $4
         on conflict (tenant_id, name, prefix) do update
             set last_value = greatest(document_counters.last_value + 1, excluded.last_value), updated_at = now()
         returning last_value`,
        tenantId,
        name,
        prefix,
        `${likePrefix(prefix)}%`
    )
    return `${prefix}${String(rows[0].last_value).padStart(pad, "0")}`
}

/** The number the next document would get, without taking it (for a form's suggested number). */
export async function peekSequence(db: Db, name: SequenceName, tenantId: string, prefix: string, pad = 4): Promise<string> {
    const [table, column] = SEQUENCES[name]
    const rows: { next: number }[] = await db.$queryRawUnsafe(
        `select greatest(
             coalesce((select last_value from document_counters where tenant_id = $1::uuid and name = $2 and prefix = $3), 0),
             coalesce((select max(substring("${column}" from '([0-9]+)$')::int) from "${table}" where tenant_id = $1::uuid and "${column}" like $4), 0)
         ) + 1 as next`,
        tenantId,
        name,
        prefix,
        `${likePrefix(prefix)}%`
    )
    return `${prefix}${String(rows[0].next).padStart(pad, "0")}`
}

/** A prefix used in LIKE: % and _ in it are matched literally. */
function likePrefix(prefix: string): string {
    return prefix.replace(/[\\%_]/g, (c) => `\\${c}`)
}
